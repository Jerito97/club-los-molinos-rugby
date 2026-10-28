import "server-only";
import { prisma } from "@/lib/prisma";
import { ACCION } from "@/dominio/auditoria";
import { alcanceNotificaciones, tiempoMedianoPublicacion, tiempoPromedioPublicacion, usoPlataforma } from "@/dominio/metricas";
import { ROL, TIPOS_DEPORTIVOS } from "@/dominio/tipos";
import { equipos } from "./consultas";

/** Id de partido guardado en un valor de auditoría, si lo tiene. */
function partidoDe(valor: unknown): number | null {
  const id = (valor as { id_partido?: unknown } | null)?.id_partido;
  return typeof id === "number" ? id : null;
}

/** Métricas por partido de los partidos cargados con la aplicación. */
export async function metricasPorPartido() {
  const partidos = await prisma.partido.findMany({
    where: { eventos: { some: { eliminado_en: null } } },
    include: {
      rival: true,
      eventos: {
        where: { eliminado_en: null },
        select: {
          id_evento: true,
          tipo: true,
          estado: true,
          creado_en: true,
          validado_en: true,
          _count: { select: { notificaciones: true } },
        },
      },
      visitas: { select: { id_dispositivo: true } },
    },
    orderBy: { fecha: "desc" },
  });

  // Correcciones, eliminaciones y rechazos, desde la auditoría.
  const registros = await prisma.registroAuditoria.findMany({
    where: { accion: { in: [ACCION.CORRECCION, ACCION.ELIMINACION, ACCION.RECHAZO] } },
    select: { accion: true, valor_anterior: true, evento: { select: { id_partido: true } } },
  });
  const cuenta = (id_partido: number, acciones: string[]) =>
    registros.filter(
      (r) => acciones.includes(r.accion) && (r.evento?.id_partido ?? partidoDe(r.valor_anterior)) === id_partido
    ).length;

  return partidos.map((p) => {
    const publicados = p.eventos.filter((e) => e.estado === "PUBLICADO");
    const deportivos = publicados.filter((e) => TIPOS_DEPORTIVOS.includes(e.tipo));
    const enviadas = new Map(publicados.map((e) => [e.id_evento, e._count.notificaciones]));
    const alcance = alcanceNotificaciones(enviadas, publicados.length);
    return {
      id_partido: p.id_partido,
      fecha: p.fecha.toISOString(),
      ...equipos(p.rival.nombre, p.condicion),
      eventosPublicados: deportivos.length,
      pendientes: p.eventos.filter((e) => e.estado === "BORRADOR").length,
      tiempoPromedio: tiempoPromedioPublicacion(p.eventos),
      tiempoMediano: tiempoMedianoPublicacion(p.eventos),
      correcciones: cuenta(p.id_partido, [ACCION.CORRECCION, ACCION.ELIMINACION]),
      rechazos: cuenta(p.id_partido, [ACCION.RECHAZO]),
      notificaciones: alcance.total,
      notificacionesPorEvento: alcance.promedioPorEvento,
      ...usoPlataforma(p.visitas),
    };
  });
}
export type MetricaPartido = Awaited<ReturnType<typeof metricasPorPartido>>[number];

/** Totales generales del sistema. */
export async function metricasGenerales() {
  const [espectadores, suscripciones] = await Promise.all([
    prisma.usuario.count({ where: { rol: { nombre: ROL.ESPECTADOR }, preferencias: { some: { activa: true } } } }),
    prisma.pushSuscripcion.count(),
  ]);
  return { espectadores, suscripciones };
}
