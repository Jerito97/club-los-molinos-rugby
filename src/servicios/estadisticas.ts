import "server-only";
import { prisma } from "@/lib/prisma";
import {
  estadisticasPorJugador,
  estadisticasPorRival,
  estadisticasPorTemporada,
  historialEstadistico,
  type PartidoEstadistica,
} from "@/dominio/estadisticas";

// Caso de uso "Consultar estadísticas": carga los partidos con sus eventos
// publicados y aplica los cálculos de src/dominio/estadisticas.ts.

/** Partidos que tienen eventos publicados, con sus titulares. */
async function partidosConEventos(): Promise<PartidoEstadistica[]> {
  const partidos = await prisma.partido.findMany({
    where: { eventos: { some: { estado: "PUBLICADO", eliminado_en: null } } },
    include: {
      rival: true,
      titulares: { select: { id_jugador: true } },
      eventos: {
        where: { estado: "PUBLICADO", eliminado_en: null },
        select: {
          id_evento: true,
          id_partido: true,
          tipo: true,
          minuto: true,
          equipo: true,
          estado: true,
          creado_en: true,
          id_jugador: true,
          id_jugador_entra: true,
        },
      },
    },
    orderBy: { fecha: "asc" },
  });
  return partidos.map((p) => ({
    id_partido: p.id_partido,
    temporada: p.temporada,
    id_rival: p.id_rival,
    rival: p.rival.nombre,
    fecha: p.fecha,
    titulares: p.titulares.map((t) => t.id_jugador),
    eventos: p.eventos,
  }));
}

/** Historia de jugadores: todo el plantel con sus estadísticas acumuladas. */
export async function rankingJugadores() {
  const [jugadores, partidos] = await Promise.all([
    prisma.jugador.findMany({ orderBy: { nombre: "asc" } }),
    partidosConEventos(),
  ]);
  const lineas = estadisticasPorJugador(partidos);
  return jugadores.map((j) => ({
    id_jugador: j.id_jugador,
    nombre: j.nombre,
    nro_camiseta: j.nro_camiseta,
    ...(lineas.get(j.id_jugador) ?? {
      puntos: 0,
      tries: 0,
      conversiones: 0,
      penales: 0,
      drops: 0,
      amarillas: 0,
      rojas: 0,
      partidos: 0,
      minutos: 0,
    }),
  }));
}
export type FilaRanking = Awaited<ReturnType<typeof rankingJugadores>>[number];

/** Jugador.historialEstadistico() con los datos del jugador. */
export async function detalleJugador(id_jugador: number) {
  const jugador = await prisma.jugador.findUnique({ where: { id_jugador } });
  if (!jugador) return null;
  return { jugador, ...historialEstadistico(id_jugador, await partidosConEventos()) };
}

export async function porRival() {
  return estadisticasPorRival(await partidosConEventos());
}

export async function porTemporada() {
  const partidos = await partidosConEventos();
  const temporadas = [...new Set(partidos.map((p) => p.temporada))].sort((a, b) => b - a);
  const nombres = new Map((await prisma.jugador.findMany()).map((j) => [j.id_jugador, j.nombre]));
  return temporadas.map((t) => {
    const e = estadisticasPorTemporada(t, partidos);
    const conNombre = <T extends { id_jugador: number }>(l: T[]) => l.map((x) => ({ ...x, nombre: nombres.get(x.id_jugador) ?? "" }));
    return { ...e, goleadores: conNombre(e.goleadores), tryman: conNombre(e.tryman) };
  });
}
