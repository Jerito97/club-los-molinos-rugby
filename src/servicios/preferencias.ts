import "server-only";
import { prisma } from "@/lib/prisma";
import { idDispositivo } from "@/lib/dispositivo";
import { TIPOS_NOTIFICABLES } from "@/dominio/notificaciones";
import { ROL, type TipoEvento } from "@/dominio/tipos";
import { usuarioActual } from "./usuarios";

// Caso de uso "Configurar notificaciones" (RF 9): clase PreferenciaNotificacion.
//
// Colaboradores y dirigentes con sesión configuran sus avisos con su propio
// usuario. El espectador no se identifica: al activar las notificaciones se
// crea un usuario con rol Espectador, sin PIN, asociado al identificador del
// dispositivo (cookie). Así la preferencia sigue referenciando a un usuario,
// como en el DER.

/** Usuario dueño de las preferencias de este dispositivo; con `crear`, lo da de alta si no existe. */
export async function usuarioDeNotificaciones(crear = false): Promise<number | null> {
  const actor = await usuarioActual();
  if (actor) return actor.id_usuario;
  const dispositivo = await idDispositivo();
  if (!dispositivo) return null;
  const existente = await prisma.usuario.findUnique({ where: { id_dispositivo: dispositivo } });
  if (existente) return existente.id_usuario;
  if (!crear) return null;
  const rol = await prisma.rol.findUniqueOrThrow({ where: { nombre: ROL.ESPECTADOR } });
  const nuevo = await prisma.usuario.create({
    data: { nombre: "Espectador", id_rol: rol.id_rol, id_dispositivo: dispositivo },
  });
  return nuevo.id_usuario;
}

/** Preferencias del usuario, con todos los tipos (los que no tienen fila valen true). */
export async function leerPreferencias(id_usuario: number | null): Promise<Record<TipoEvento, boolean>> {
  const filas = id_usuario ? await prisma.preferenciaNotificacion.findMany({ where: { id_usuario } }) : [];
  return Object.fromEntries(
    TIPOS_NOTIFICABLES.map((t) => [t, filas.find((f) => f.tipo_evento === t)?.activa ?? true])
  ) as Record<TipoEvento, boolean>;
}

/** PreferenciaNotificacion.guardar(tipos): guarda qué tipos de evento quiere recibir. */
export async function guardarPreferencias(id_usuario: number, tipos: Partial<Record<TipoEvento, boolean>>) {
  await prisma.$transaction(
    Object.entries(tipos)
      .filter(([tipo]) => TIPOS_NOTIFICABLES.includes(tipo as TipoEvento))
      .map(([tipo, activa]) =>
        prisma.preferenciaNotificacion.upsert({
          where: { id_usuario_tipo_evento: { id_usuario, tipo_evento: tipo as TipoEvento } },
          create: { id_usuario, tipo_evento: tipo as TipoEvento, activa: Boolean(activa) },
          update: { activa: Boolean(activa) },
        })
      )
  );
}

/** Guarda la suscripción push del dispositivo. La primera vez activa todos los tipos. */
export async function suscribir(id_usuario: number, s: { endpoint: string; p256dh: string; auth: string }) {
  await prisma.pushSuscripcion.upsert({
    where: { endpoint: s.endpoint },
    create: { ...s, id_usuario },
    update: { ...s, id_usuario },
  });
  const tiene = await prisma.preferenciaNotificacion.count({ where: { id_usuario } });
  if (!tiene) {
    await prisma.preferenciaNotificacion.createMany({
      data: TIPOS_NOTIFICABLES.map((tipo_evento) => ({ id_usuario, tipo_evento, activa: true })),
    });
  }
}

/** Interruptor general apagado: se borra la suscripción del dispositivo. */
export async function desuscribir(id_usuario: number, endpoint: string) {
  await prisma.pushSuscripcion.deleteMany({ where: { endpoint, id_usuario } });
}
