// Historial estadístico por jugador, por rival y por temporada (RF 10, RF 13).
//
// Todo se calcula únicamente con eventos PUBLICADOS: lo que está en borrador,
// rechazado o eliminado no cuenta. Los partidos anteriores a la puesta en
// marcha del sistema (que solo tienen el resultado oficial de la URBA) no
// tienen eventos, así que no forman parte de estas estadísticas.

import { consultarMarcador, type EventoMarcador } from "./partido";
import { MINUTOS_POR_TIEMPO, puntosDe, type TipoEvento } from "./tipos";

export const DURACION_PARTIDO = 2 * MINUTOS_POR_TIEMPO;

/** Evento publicado con los datos que necesitan las estadísticas. */
export type EventoEstadistica = EventoMarcador & {
  id_partido: number;
  id_jugador: number | null;
  id_jugador_entra: number | null;
};

export type PartidoEstadistica = {
  id_partido: number;
  temporada: number;
  id_rival: number;
  rival: string;
  fecha: Date;
  titulares: number[];
  eventos: EventoEstadistica[];
};

export type LineaJugador = {
  id_jugador: number;
  puntos: number;
  tries: number;
  conversiones: number;
  penales: number;
  drops: number;
  amarillas: number;
  rojas: number;
  partidos: number;
  minutos: number;
};

const publicados = (p: PartidoEstadistica) => p.eventos.filter((e) => e.estado === "PUBLICADO");

/**
 * Minutos jugados por cada jugador en un partido: los titulares desde el
 * minuto 0 y los que entran desde el minuto del cambio, hasta que salen, son
 * expulsados (tarjeta roja) o termina el partido (80'). La tarjeta amarilla
 * (10 minutos afuera) no se descuenta.
 */
export function minutosEnPartido(p: PartidoEstadistica): Map<number, number> {
  const desde = new Map<number, number>();
  const minutos = new Map<number, number>();
  for (const id of p.titulares) desde.set(id, 0);
  const cortes = publicados(p)
    .filter((e) => e.tipo === "CAMBIO" || e.tipo === "TARJETA_ROJA")
    .sort((a, b) => a.minuto - b.minuto);
  const cerrar = (id: number, hasta: number) => {
    const inicio = desde.get(id);
    if (inicio === undefined) return;
    minutos.set(id, (minutos.get(id) ?? 0) + Math.max(0, Math.min(hasta, DURACION_PARTIDO) - inicio));
    desde.delete(id);
  };
  for (const e of cortes) {
    if (e.id_jugador) cerrar(e.id_jugador, e.minuto);
    if (e.tipo === "CAMBIO" && e.id_jugador_entra) desde.set(e.id_jugador_entra, Math.min(e.minuto, DURACION_PARTIDO));
  }
  for (const id of [...desde.keys()]) cerrar(id, DURACION_PARTIDO);
  // Quien participó sin sumar minutos (entró en el 80') igual jugó el partido.
  for (const e of publicados(p)) {
    if (e.tipo === "CAMBIO" && e.id_jugador_entra && !minutos.has(e.id_jugador_entra)) minutos.set(e.id_jugador_entra, 0);
  }
  return minutos;
}

const CONTADOR: Partial<Record<TipoEvento, keyof LineaJugador>> = {
  TRY: "tries",
  CONVERSION: "conversiones",
  PENAL: "penales",
  DROP: "drops",
  TARJETA_AMARILLA: "amarillas",
  TARJETA_ROJA: "rojas",
};

const lineaVacia = (id_jugador: number): LineaJugador => ({
  id_jugador,
  puntos: 0,
  tries: 0,
  conversiones: 0,
  penales: 0,
  drops: 0,
  amarillas: 0,
  rojas: 0,
  partidos: 0,
  minutos: 0,
});

/** Estadísticas acumuladas de cada jugador del club en los partidos dados. */
export function estadisticasPorJugador(partidos: readonly PartidoEstadistica[]): Map<number, LineaJugador> {
  const lineas = new Map<number, LineaJugador>();
  const de = (id: number) => {
    if (!lineas.has(id)) lineas.set(id, lineaVacia(id));
    return lineas.get(id)!;
  };
  for (const p of partidos) {
    for (const [id, min] of minutosEnPartido(p)) {
      const l = de(id);
      l.partidos++;
      l.minutos += min;
    }
    for (const e of publicados(p)) {
      if (e.equipo !== "CLUB" || !e.id_jugador || e.tipo === "CAMBIO") continue;
      const l = de(e.id_jugador);
      l.puntos += puntosDe(e.tipo);
      const campo = CONTADOR[e.tipo];
      if (campo) (l[campo] as number)++;
    }
  }
  return lineas;
}

export type DetallePartidoJugador = {
  id_partido: number;
  rival: string;
  fecha: Date;
  minutos: number;
  puntos: number;
  tries: number;
  tarjetas: number;
};

/**
 * Jugador.historialEstadistico(): totales del jugador y su detalle partido
 * por partido.
 */
export function historialEstadistico(id_jugador: number, partidos: readonly PartidoEstadistica[]) {
  const total = estadisticasPorJugador(partidos).get(id_jugador) ?? lineaVacia(id_jugador);
  const detalle: DetallePartidoJugador[] = [];
  for (const p of partidos) {
    const minutos = minutosEnPartido(p).get(id_jugador);
    const propios = publicados(p).filter((e) => e.equipo === "CLUB" && e.id_jugador === id_jugador && e.tipo !== "CAMBIO");
    if (minutos === undefined && propios.length === 0) continue;
    detalle.push({
      id_partido: p.id_partido,
      rival: p.rival,
      fecha: p.fecha,
      minutos: minutos ?? 0,
      puntos: propios.reduce((s, e) => s + puntosDe(e.tipo), 0),
      tries: propios.filter((e) => e.tipo === "TRY").length,
      tarjetas: propios.filter((e) => e.tipo === "TARJETA_AMARILLA" || e.tipo === "TARJETA_ROJA").length,
    });
  }
  detalle.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  return { total, detalle };
}

export type LineaRival = {
  id_rival: number;
  rival: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  puntos_favor: number;
  puntos_contra: number;
};

/** Historial contra cada rival: partidos jugados, ganados, empatados, perdidos y puntos. */
export function estadisticasPorRival(partidos: readonly PartidoEstadistica[]): LineaRival[] {
  const lineas = new Map<number, LineaRival>();
  for (const p of partidos) {
    if (publicados(p).length === 0) continue;
    const m = consultarMarcador(p.eventos);
    const l = lineas.get(p.id_rival) ?? {
      id_rival: p.id_rival,
      rival: p.rival,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      puntos_favor: 0,
      puntos_contra: 0,
    };
    l.pj++;
    if (m.club > m.rival) l.pg++;
    else if (m.club === m.rival) l.pe++;
    else l.pp++;
    l.puntos_favor += m.club;
    l.puntos_contra += m.rival;
    lineas.set(p.id_rival, l);
  }
  return [...lineas.values()].sort((a, b) => b.pj - a.pj || a.rival.localeCompare(b.rival, "es"));
}

/** Totales de una temporada y sus goleadores. */
export function estadisticasPorTemporada(temporada: number, partidos: readonly PartidoEstadistica[]) {
  const deLaTemporada = partidos.filter((p) => p.temporada === temporada && publicados(p).length > 0);
  const rivales = estadisticasPorRival(deLaTemporada);
  const suma = (k: keyof LineaRival) => rivales.reduce((s, r) => s + (r[k] as number), 0);
  const jugadores = [...estadisticasPorJugador(deLaTemporada).values()];
  const eventosClub = deLaTemporada.flatMap(publicados).filter((e) => e.equipo === "CLUB");
  return {
    temporada,
    pj: suma("pj"),
    pg: suma("pg"),
    pe: suma("pe"),
    pp: suma("pp"),
    puntos_favor: suma("puntos_favor"),
    puntos_contra: suma("puntos_contra"),
    tries: eventosClub.filter((e) => e.tipo === "TRY").length,
    tarjetas: eventosClub.filter((e) => e.tipo === "TARJETA_AMARILLA" || e.tipo === "TARJETA_ROJA").length,
    goleadores: jugadores.filter((j) => j.puntos > 0).sort((a, b) => b.puntos - a.puntos || b.tries - a.tries).slice(0, 5),
    tryman: jugadores.filter((j) => j.tries > 0).sort((a, b) => b.tries - a.tries || b.puntos - a.puntos).slice(0, 5),
  };
}
