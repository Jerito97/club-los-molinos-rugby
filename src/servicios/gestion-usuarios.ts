import "server-only";
import { prisma, type DB } from "@/lib/prisma";
import { exigir, ErrorHttp } from "@/lib/http";
import { diaArgentina } from "@/lib/formato";
import { ACCION } from "@/dominio/auditoria";
import { coincideConAlguno, generarPinProvisorio, hashearPin } from "@/dominio/pin";
import type { Actor } from "@/dominio/permisos";
import { BLOQUEOS_PARA_AVISO, validarAlta, validarGestion } from "@/dominio/usuarios";
import { ROL } from "@/dominio/tipos";
import { guardarAuditoria } from "./auditoria";

// Panel del responsable de seguridad. El PIN provisorio se muestra una sola
// vez, en la respuesta, para que el responsable lo entregue en forma
// personal; en la base solo queda su hash.

export function listarUsuarios() {
  return prisma.usuario.findMany({
    where: { rol: { nombre: { in: [ROL.CARGADOR, ROL.VALIDADOR] } } },
    include: { rol: true },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
}

/** Genera un PIN provisorio que no coincida con el de ningún usuario activo. */
async function pinProvisorioUnico(db: DB): Promise<{ pin: string; hash: string }> {
  const activos = await db.usuario.findMany({ where: { activo: true, pin_hash: { not: null } }, select: { pin_hash: true } });
  for (;;) {
    const pin = generarPinProvisorio();
    if (!(await coincideConAlguno(pin, activos.map((a) => a.pin_hash!)))) return { pin, hash: await hashearPin(pin) };
  }
}

export async function crearUsuario(actor: Actor, nombre: string, rol: string) {
  const datos = exigir(validarAlta(actor, nombre, rol));
  return prisma.$transaction(async (tx) => {
    const { pin, hash } = await pinProvisorioUnico(tx);
    const r = await tx.rol.findUniqueOrThrow({ where: { nombre: datos.rol } });
    const u = await tx.usuario.create({
      data: { nombre: datos.nombre, id_rol: r.id_rol, pin_hash: hash, pin_provisorio: true, pin_historial: { create: { pin_hash: hash } } },
    });
    await guardarAuditoria(tx, {
      accion: ACCION.ALTA_USUARIO,
      id_usuario: actor.id_usuario,
      valor_nuevo: { nombre: u.nombre, rol: datos.rol, pin_provisorio: true },
    });
    return { nombre: u.nombre, pin };
  });
}

async function objetivo(db: DB, id_usuario: number) {
  const u = await db.usuario.findUnique({ where: { id_usuario }, include: { rol: true } });
  if (!u) throw new ErrorHttp(404, "No existe el usuario.");
  return { ...u, rol: u.rol.nombre };
}

/** Baja lógica: no puede volver a ingresar, pero se conservan sus registros. */
export async function darDeBaja(actor: Actor, id_usuario: number) {
  await prisma.$transaction(async (tx) => {
    const u = await objetivo(tx, id_usuario);
    exigir(validarGestion(actor, u, "baja"));
    await tx.usuario.update({ where: { id_usuario }, data: { activo: false } });
    // Sus suscripciones push dejan de recibir avisos.
    await tx.pushSuscripcion.deleteMany({ where: { id_usuario } });
    await guardarAuditoria(tx, {
      accion: ACCION.BAJA_USUARIO,
      id_usuario: actor.id_usuario,
      valor_anterior: { nombre: u.nombre, activo: true },
      valor_nuevo: { nombre: u.nombre, activo: false },
    });
  });
}

/** Blanqueo de PIN: genera un nuevo PIN provisorio (también al reactivar a alguien). */
export async function blanquearPin(actor: Actor, id_usuario: number, reactivar = false) {
  return prisma.$transaction(async (tx) => {
    const u = await objetivo(tx, id_usuario);
    exigir(validarGestion(actor, u, reactivar ? "reactivar" : "blanqueo"));
    const { pin, hash } = await pinProvisorioUnico(tx);
    await tx.usuario.update({ where: { id_usuario }, data: { pin_hash: hash, pin_provisorio: true, activo: true } });
    await tx.pinHistorial.create({ data: { id_usuario, pin_hash: hash } });
    await guardarAuditoria(tx, {
      accion: reactivar ? ACCION.ALTA_USUARIO : ACCION.BLANQUEO_PIN,
      id_usuario: actor.id_usuario,
      valor_anterior: { nombre: u.nombre, activo: u.activo, pin_provisorio: u.pin_provisorio },
      valor_nuevo: { nombre: u.nombre, activo: true, pin_provisorio: true },
    });
    return { nombre: u.nombre, pin };
  });
}

/**
 * Bloqueos de dispositivos del día. Si se repiten en el mismo día, el panel
 * muestra un aviso al responsable de seguridad.
 */
export async function avisosDeSeguridad(ahora = new Date()) {
  const bloqueos = await prisma.registroAuditoria.findMany({
    where: { accion: ACCION.BLOQUEO_DISPOSITIVO, fecha_hora: { gte: new Date(ahora.getTime() - 36 * 60 * 60_000) } },
    orderBy: { fecha_hora: "desc" },
    select: { id_registro: true, fecha_hora: true, ip: true, id_dispositivo: true },
  });
  const hoy = bloqueos.filter((b) => diaArgentina(b.fecha_hora) === diaArgentina(ahora));
  return { hoy, repetidos: hoy.length >= BLOQUEOS_PARA_AVISO };
}
