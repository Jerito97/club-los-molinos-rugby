import "server-only";
import { prisma } from "@/lib/prisma";
import { enviarPush, pushDisponible } from "@/lib/push";
import { consultarMarcador } from "@/dominio/partido";
import { textoNotificacion } from "@/dominio/notificaciones";
import type { TipoEvento } from "@/dominio/tipos";

// Caso de uso "Publicar evento y notificar" (RF 7): después de publicar un
// evento se identifica a los usuarios que configuraron ese tipo de aviso y
// se les envía la notificación push. Si un usuario no habilitó las
// notificaciones, el evento se publica igual y se ve en el marcador.

/**
 * PreferenciaNotificacion.obtenerSuscriptos(tipoEvento): usuarios activos
 * con la preferencia activa para ese tipo y al menos un dispositivo suscripto.
 */
export async function obtenerSuscriptos(tipo: TipoEvento) {
  return prisma.usuario.findMany({
    where: {
      activo: true,
      preferencias: { some: { tipo_evento: tipo, activa: true } },
      suscripciones_push: { some: {} },
    },
    select: { id_usuario: true, suscripciones_push: true },
  });
}

/** Envía las notificaciones push de un evento publicado. */
export async function notificarPublicacion(id_evento: number): Promise<void> {
  if (!pushDisponible()) return;
  const evento = await prisma.evento.findUnique({
    where: { id_evento },
    include: {
      partido: { include: { rival: true } },
      jugador: { select: { nombre: true } },
      jugador_entra: { select: { nombre: true } },
    },
  });
  if (!evento || evento.estado !== "PUBLICADO") return;

  // Marcador al momento de la publicación (Partido.actualizarMarcador ya corrió).
  const publicados = await prisma.evento.findMany({
    where: { id_partido: evento.id_partido, estado: "PUBLICADO", eliminado_en: null },
    select: { id_evento: true, tipo: true, minuto: true, equipo: true, estado: true, creado_en: true },
  });
  const { titulo, cuerpo } = textoNotificacion({
    tipo: evento.tipo,
    minuto: evento.minuto,
    equipo: evento.equipo,
    rival: evento.partido.rival.nombre,
    jugador: evento.jugador?.nombre,
    jugadorEntra: evento.jugador_entra?.nombre,
    marcador: consultarMarcador(publicados),
  });
  const aviso = { titulo, cuerpo, url: `/partidos/${evento.id_partido}`, etiqueta: `partido-${evento.id_partido}-${id_evento}` };

  const suscriptos = await obtenerSuscriptos(evento.tipo);
  const alcanzados: number[] = [];
  const vencidas: number[] = [];
  await Promise.all(
    suscriptos.map(async (u) => {
      let alguno = false;
      for (const s of u.suscripciones_push) {
        const r = await enviarPush(s, aviso);
        if (r === "enviado") alguno = true;
        if (r === "vencida") vencidas.push(s.id);
      }
      if (alguno) alcanzados.push(u.id_usuario);
    })
  );

  // Las suscripciones que el servicio push da por vencidas (404/410) se borran.
  if (vencidas.length) await prisma.pushSuscripcion.deleteMany({ where: { id: { in: vencidas } } });
  // Métrica de alcance: una notificación por usuario alcanzado.
  if (alcanzados.length) {
    await prisma.notificacionEnviada.createMany({ data: alcanzados.map((id_usuario) => ({ id_evento, id_usuario })) });
  }
}
