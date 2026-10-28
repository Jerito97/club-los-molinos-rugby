import "server-only";
import { prisma } from "@/lib/prisma";
import { ACCION } from "@/dominio/auditoria";
import { calcularBloqueo, MAX_INTENTOS_FALLIDOS, type EstadoBloqueo } from "@/dominio/bloqueo";
import { PIN_HISTORIAL, hashearPin, validarPinNuevo, verificarPin } from "@/dominio/pin";
import { ROL } from "@/dominio/tipos";
import { guardarAuditoria } from "./auditoria";

// Caso de uso "Autenticarse con PIN" (RF 1) y cambio de PIN.

export type Origen = { id_dispositivo: string | null; ip: string };

/**
 * Estado de bloqueo del dispositivo. Se identifica por su cookie; si el
 * pedido llega sin ella (cookies borradas o un cliente que no las guarda),
 * se usa la IP como respaldo.
 */
export async function bloqueoDe(origen: Origen, ahora = new Date()): Promise<EstadoBloqueo> {
  const desde = new Date(ahora.getTime() - 24 * 60 * 60_000);
  const intentos = await prisma.intentoLogin.findMany({
    where: {
      fecha_hora: { gte: desde },
      ...(origen.id_dispositivo ? { id_dispositivo: origen.id_dispositivo } : { ip: origen.ip, id_dispositivo: null }),
    },
  });
  return calcularBloqueo(intentos, ahora);
}

export type ResultadoIngreso =
  | { ok: true; id_usuario: number; pin_provisorio: boolean }
  | { ok: false; mensaje: string; bloqueadoHasta: Date | null; restantes: number };

/**
 * Usuario.autenticar(pin): identifica a la persona a partir del PIN,
 * comparándolo con los hashes de los usuarios activos. Registra cada intento
 * (exitoso o fallido) con fecha, hora e IP, y bloquea el dispositivo al
 * quinto intento fallido consecutivo.
 */
export async function ingresar(pin: string, origen: Origen): Promise<ResultadoIngreso> {
  const previo = await bloqueoDe(origen);
  if (previo.bloqueado) {
    return {
      ok: false,
      mensaje: "Este dispositivo está bloqueado por demasiados intentos fallidos.",
      bloqueadoHasta: previo.hasta,
      restantes: 0,
    };
  }

  let usuario: { id_usuario: number; pin_provisorio: boolean } | null = null;
  if (/^\d{6}$/.test(pin)) {
    const candidatos = await prisma.usuario.findMany({
      where: { activo: true, pin_hash: { not: null }, rol: { nombre: { in: [ROL.CARGADOR, ROL.VALIDADOR] } } },
      select: { id_usuario: true, pin_hash: true, pin_provisorio: true },
    });
    for (const c of candidatos) {
      if (await verificarPin(pin, c.pin_hash!)) {
        usuario = c;
        break;
      }
    }
  }

  const extra = { ip: origen.ip, id_dispositivo: origen.id_dispositivo };
  await prisma.intentoLogin.create({ data: { ...extra, exitoso: usuario !== null } });

  if (usuario) {
    await guardarAuditoria(prisma, {
      accion: ACCION.INGRESO,
      id_usuario: usuario.id_usuario,
      valor_nuevo: { pin_provisorio: usuario.pin_provisorio },
      ...extra,
    });
    return { ok: true, id_usuario: usuario.id_usuario, pin_provisorio: usuario.pin_provisorio };
  }

  await guardarAuditoria(prisma, { accion: ACCION.INGRESO_FALLIDO, id_usuario: null, ...extra });
  const despues = await bloqueoDe(origen);
  if (despues.bloqueado) {
    await guardarAuditoria(prisma, {
      accion: ACCION.BLOQUEO_DISPOSITIVO,
      id_usuario: null,
      valor_nuevo: { intentos: MAX_INTENTOS_FALLIDOS, hasta: despues.hasta?.toISOString() },
      ...extra,
    });
    return {
      ok: false,
      mensaje: `Después de ${MAX_INTENTOS_FALLIDOS} intentos fallidos este dispositivo quedó bloqueado.`,
      bloqueadoHasta: despues.hasta,
      restantes: 0,
    };
  }
  return {
    ok: false,
    mensaje: "PIN incorrecto.",
    bloqueadoHasta: null,
    restantes: despues.restantes,
  };
}

/**
 * Cambio de PIN por parte del propio usuario (obligatorio si el PIN es
 * provisorio). Aplica todas las reglas: formato, unicidad entre activos e
 * historial de los últimos tres.
 */
export async function cambiarPin(
  id_usuario: number,
  datos: { actual?: string; nuevo: string },
  origen: Origen
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id_usuario },
    include: { pin_historial: { orderBy: { fecha: "desc" }, take: PIN_HISTORIAL } },
  });
  // Fuera del primer ingreso, se pide el PIN actual para confirmar la identidad.
  if (!usuario.pin_provisorio) {
    if (!datos.actual || !(await verificarPin(datos.actual, usuario.pin_hash!))) {
      return { ok: false, mensaje: "El PIN actual no es correcto." };
    }
  }
  const otros = await prisma.usuario.findMany({
    where: { activo: true, pin_hash: { not: null }, id_usuario: { not: id_usuario } },
    select: { pin_hash: true },
  });
  // El PIN provisorio vigente también cuenta como "último PIN".
  const ultimos = [usuario.pin_hash!, ...usuario.pin_historial.map((h) => h.pin_hash)];
  const error = await validarPinNuevo(
    datos.nuevo,
    otros.map((o) => o.pin_hash!),
    ultimos
  );
  if (error) return { ok: false, mensaje: error };

  const pin_hash = await hashearPin(datos.nuevo);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id_usuario }, data: { pin_hash, pin_provisorio: false } });
    await tx.pinHistorial.create({ data: { id_usuario, pin_hash } });
    // Nunca se registra el PIN: solo que hubo un cambio.
    await guardarAuditoria(tx, {
      accion: ACCION.CAMBIO_PIN,
      id_usuario,
      valor_anterior: { pin_provisorio: usuario.pin_provisorio },
      valor_nuevo: { pin_provisorio: false },
      ...origen,
    });
  });
  return { ok: true };
}
