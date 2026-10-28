import { describe, expect, it } from "vitest";
import {
  calcularReloj,
  consultarMarcador,
  formatearReloj,
  iniciar,
  minutoAMinuto,
  minutoSugerido,
  reabrir,
  reasignarCargador,
  registrarControl,
  type EventoMarcador,
} from "@/dominio/partido";
import { ACCION } from "@/dominio/auditoria";
import { PUNTOS, puntosDe } from "@/dominio/tipos";
import { colaborador, dirigente1, dirigente2, otroColaborador, partidoEnCurso } from "./ayudas";

let id = 0;
const ev = (e: Partial<EventoMarcador>): EventoMarcador => ({
  id_evento: ++id,
  tipo: "TRY",
  minuto: 10,
  equipo: "CLUB",
  estado: "PUBLICADO",
  creado_en: new Date(2026, 9, 31, 15, 0, id),
  ...e,
});

describe("puntaje por tipo de evento", () => {
  it("try 5, conversión 2, penal 3, drop 3 y el resto 0", () => {
    expect(PUNTOS).toEqual({ TRY: 5, CONVERSION: 2, PENAL: 3, DROP: 3 });
    for (const t of ["TARJETA_AMARILLA", "TARJETA_ROJA", "CAMBIO", "INICIO_PARTIDO", "FINAL_PARTIDO"] as const) {
      expect(puntosDe(t)).toBe(0);
    }
  });
});

describe("marcador en vivo (RF 6, RF 12)", () => {
  const eventos = [
    ev({ tipo: "TRY", minuto: 5 }),
    ev({ tipo: "CONVERSION", minuto: 5 }),
    ev({ tipo: "PENAL", minuto: 9, equipo: "RIVAL" }),
    ev({ tipo: "DROP", minuto: 20, estado: "BORRADOR" }),
    ev({ tipo: "TRY", minuto: 25, equipo: "RIVAL", estado: "VALIDADO" }),
    ev({ tipo: "PENAL", minuto: 30, estado: "RECHAZADO" }),
    ev({ tipo: "TARJETA_AMARILLA", minuto: 31, equipo: "RIVAL" }),
  ];

  it("se calcula solo con los eventos PUBLICADOS", () => {
    expect(consultarMarcador(eventos)).toEqual({ club: 7, rival: 3 });
  });

  it("el minuto a minuto muestra el parcial después de cada evento que suma puntos", () => {
    const lineas = minutoAMinuto(eventos);
    expect(lineas.map((l) => [l.tipo, l.minuto, l.parcial])).toEqual([
      ["TARJETA_AMARILLA", 31, null],
      ["PENAL", 9, { club: 7, rival: 3 }],
      ["CONVERSION", 5, { club: 7, rival: 0 }],
      ["TRY", 5, { club: 5, rival: 0 }],
    ]);
  });
});

describe("reloj del partido", () => {
  const inicio = new Date("2026-10-31T18:30:00Z");
  const en = (min: number, seg = 0) => new Date(inicio.getTime() + (min * 60 + seg) * 1000);
  const control = (tipo: EventoMarcador["tipo"], fecha: Date) => ({ tipo, estado: "PUBLICADO" as const, creado_en: fecha });

  it("corre en el primer tiempo y sugiere el minuto en curso", () => {
    const reloj = calcularReloj(inicio, []);
    expect(reloj.tiempo).toBe("PRIMER_TIEMPO");
    expect(minutoSugerido(reloj, en(70, 15))).toBe(71);
    expect(formatearReloj(23 * 60 + 5)).toBe("23:05");
  });

  it("se detiene en el entretiempo y retoma desde 40:00 en el segundo tiempo", () => {
    const eventos = [control("ENTRETIEMPO", en(41)), control("INICIO_SEGUNDO_TIEMPO", en(55))];
    expect(calcularReloj(inicio, [eventos[0]]).tiempo).toBe("ENTRETIEMPO");
    const reloj = calcularReloj(inicio, eventos);
    expect(reloj).toMatchObject({ tiempo: "SEGUNDO_TIEMPO", base_segundos: 2400 });
    expect(minutoSugerido(reloj, en(60))).toBe(46);
  });
});

describe("operaciones del partido", () => {
  const titulares = Array.from({ length: 15 }, (_, i) => i + 1);
  const plantel = new Set(Array.from({ length: 35 }, (_, i) => i + 1));
  const programado = { id_partido: 10, estado: "PROGRAMADO" as const, id_usuario_cargador: null };

  it("al iniciar, quien inicia queda asignado como único cargador (con auditoría)", () => {
    const r = iniciar(colaborador, programado, titulares, plantel);
    expect(r.ok && r.valor.cambios).toEqual({ estado: "EN_CURSO", id_usuario_cargador: colaborador.id_usuario });
    expect(r.ok && r.valor.auditoria.map((a) => a.accion)).toEqual([ACCION.INICIO_CARGA, ACCION.ASIGNACION_CARGADOR, ACCION.TITULARES]);
  });

  it("exige 15 titulares del plantel", () => {
    expect(iniciar(colaborador, programado, titulares.slice(1), plantel).ok).toBe(false);
    expect(iniciar(colaborador, programado, [...titulares.slice(1), 99], plantel).ok).toBe(false);
  });

  it("no se puede iniciar un partido que ya está en curso", () => {
    expect(iniciar(otroColaborador, partidoEnCurso, titulares, plantel)).toMatchObject({ ok: false, motivo: "conflicto" });
  });

  it("un dirigente reasigna el cargador y queda en la auditoría; un colaborador no puede", () => {
    const r = reasignarCargador(dirigente2, partidoEnCurso, otroColaborador);
    expect(r.ok && r.valor.cambios.id_usuario_cargador).toBe(otroColaborador.id_usuario);
    expect(r.ok && r.valor.auditoria[0]).toMatchObject({
      accion: ACCION.REASIGNACION_CARGADOR,
      valor_anterior: { id_usuario_cargador: colaborador.id_usuario },
      valor_nuevo: { id_usuario_cargador: otroColaborador.id_usuario },
    });
    expect(reasignarCargador(colaborador, partidoEnCurso, otroColaborador)).toMatchObject({ ok: false, motivo: "permiso" });
  });

  it("los eventos de control siguen el orden del partido y se publican sin validación", () => {
    const ahora = new Date();
    const marcador = { club: 0, rival: 0 };
    const r = registrarControl(colaborador, partidoEnCurso, "INICIO_PARTIDO", new Set(), ahora, 1, marcador);
    expect(r.ok && r.valor.evento.estado).toBe("PUBLICADO");
    expect(r.ok && r.valor.cambios.iniciado_en).toBe(ahora);
    expect(registrarControl(colaborador, partidoEnCurso, "ENTRETIEMPO", new Set(), ahora, 1, marcador).ok).toBe(false);
    const final = registrarControl(
      colaborador,
      partidoEnCurso,
      "FINAL_PARTIDO",
      new Set(["INICIO_PARTIDO", "ENTRETIEMPO", "INICIO_SEGUNDO_TIEMPO"] as const),
      ahora,
      82,
      { club: 22, rival: 17 }
    );
    expect(final.ok && final.valor.cambios.estado).toBe("FINALIZADO");
    expect(final.ok && final.valor.auditoria[0].valor_nuevo).toMatchObject({ resultado: "22-17" });
  });

  it("un dirigente puede reabrir un partido jugado y queda como cargador", () => {
    const jugado = { id_partido: 10, estado: "FINALIZADO" as const, id_usuario_cargador: colaborador.id_usuario };
    const r = reabrir(dirigente1, jugado);
    expect(r.ok && r.valor.cambios).toEqual({ estado: "EN_CURSO", id_usuario_cargador: dirigente1.id_usuario });
    expect(reabrir(otroColaborador, jugado)).toMatchObject({ ok: false, motivo: "permiso" });
  });
});
