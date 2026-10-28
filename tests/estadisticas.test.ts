import { describe, expect, it } from "vitest";
import {
  estadisticasPorJugador,
  estadisticasPorRival,
  estadisticasPorTemporada,
  historialEstadistico,
  minutosEnPartido,
  type EventoEstadistica,
  type PartidoEstadistica,
} from "@/dominio/estadisticas";

let id = 0;
const ev = (e: Partial<EventoEstadistica>): EventoEstadistica => ({
  id_evento: ++id,
  id_partido: 1,
  tipo: "TRY",
  minuto: 10,
  equipo: "CLUB",
  estado: "PUBLICADO",
  creado_en: new Date(2026, 8, 5, 15, 0, id),
  id_jugador: null,
  id_jugador_entra: null,
  ...e,
});

const titulares = Array.from({ length: 15 }, (_, i) => i + 1);

const partido1: PartidoEstadistica = {
  id_partido: 1,
  temporada: 2026,
  id_rival: 100,
  rival: "San Carlos",
  fecha: new Date("2026-09-05T18:30:00Z"),
  titulares,
  eventos: [
    ev({ tipo: "TRY", minuto: 10, id_jugador: 7 }),
    ev({ tipo: "CONVERSION", minuto: 10, id_jugador: 10 }),
    ev({ tipo: "PENAL", minuto: 30, id_jugador: 10 }),
    ev({ tipo: "TRY", minuto: 35, equipo: "RIVAL" }),
    ev({ tipo: "CAMBIO", minuto: 60, id_jugador: 7, id_jugador_entra: 20 }),
    ev({ tipo: "TARJETA_ROJA", minuto: 70, id_jugador: 3 }),
    ev({ tipo: "TRY", minuto: 75, id_jugador: 20 }),
    // No cuentan: no están publicados.
    ev({ tipo: "TRY", minuto: 78, id_jugador: 9, estado: "BORRADOR" }),
    ev({ tipo: "DROP", minuto: 79, id_jugador: 10, estado: "RECHAZADO" }),
  ],
};

const partido2: PartidoEstadistica = {
  id_partido: 2,
  temporada: 2026,
  id_rival: 100,
  rival: "San Carlos",
  fecha: new Date("2026-10-10T18:30:00Z"),
  titulares,
  eventos: [ev({ id_partido: 2, tipo: "PENAL", minuto: 5, equipo: "RIVAL" }), ev({ id_partido: 2, tipo: "DROP", minuto: 50, id_jugador: 10 })],
};

describe("estadísticas por jugador (solo eventos publicados)", () => {
  const lineas = estadisticasPorJugador([partido1, partido2]);

  it("suma puntos, tries, conversiones, penales, drops y tarjetas", () => {
    expect(lineas.get(10)).toMatchObject({ puntos: 2 + 3 + 3, conversiones: 1, penales: 1, drops: 1, partidos: 2 });
    expect(lineas.get(7)).toMatchObject({ puntos: 5, tries: 1 });
    expect(lineas.get(3)).toMatchObject({ rojas: 1 });
    // El try en borrador del 9 no cuenta.
    expect(lineas.get(9)).toMatchObject({ puntos: 0, tries: 0 });
  });

  it("calcula minutos jugados con titulares, cambios y expulsiones", () => {
    const minutos = minutosEnPartido(partido1);
    expect(minutos.get(1)).toBe(80);
    expect(minutos.get(7)).toBe(60); // sale en el 60'
    expect(minutos.get(20)).toBe(20); // entra en el 60'
    expect(minutos.get(3)).toBe(70); // expulsado en el 70'
    expect(minutos.has(21)).toBe(false); // no jugó
    expect(lineas.get(20)).toMatchObject({ partidos: 1, minutos: 20, tries: 1 });
    expect(lineas.get(1)).toMatchObject({ partidos: 2, minutos: 160 });
  });

  it("historialEstadistico devuelve el detalle por partido", () => {
    const h = historialEstadistico(10, [partido1, partido2]);
    expect(h.total.puntos).toBe(8);
    expect(h.detalle.map((d) => [d.id_partido, d.puntos])).toEqual([
      [2, 3],
      [1, 5],
    ]);
  });
});

describe("estadísticas por rival y por temporada", () => {
  it("cuenta partidos jugados, ganados, empatados, perdidos y puntos", () => {
    expect(estadisticasPorRival([partido1, partido2])).toEqual([
      { id_rival: 100, rival: "San Carlos", pj: 2, pg: 1, pe: 1, pp: 0, puntos_favor: 15 + 3, puntos_contra: 5 + 3 },
    ]);
  });

  it("resume la temporada con sus goleadores", () => {
    const t = estadisticasPorTemporada(2026, [partido1, partido2]);
    expect(t).toMatchObject({ pj: 2, pg: 1, pe: 1, puntos_favor: 18, puntos_contra: 8, tries: 2 });
    expect(t.goleadores[0]).toMatchObject({ id_jugador: 10, puntos: 8 });
    expect(estadisticasPorTemporada(2025, [partido1]).pj).toBe(0);
  });
});
