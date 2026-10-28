import { describe, expect, it } from "vitest";
import { corregir, eliminar, publicar, rechazar, registrar, validar, validarDatos } from "@/dominio/evento";
import { ACCION } from "@/dominio/auditoria";
import { colaborador, dirigente1, dirigente2, evento, otroColaborador, partidoEnCurso } from "./ayudas";

const tryClub = { tipo: "TRY" as const, minuto: 12, equipo: "CLUB" as const, id_jugador: 7, id_jugador_entra: null };

describe("carga de eventos (RF 2, RF 3)", () => {
  it("crea el evento en BORRADOR asociado al partido, equipo, jugador y minuto", () => {
    const r = registrar(colaborador, partidoEnCurso, tryClub);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toHaveLength(1);
    expect(r.valor[0]).toMatchObject({ ...tryClub, estado: "BORRADOR" });
  });

  it("'Try y Conversión' crea dos eventos en borrador", () => {
    const r = registrar(colaborador, partidoEnCurso, tryClub, { conConversion: true, id_jugador_conversion: 10 });
    expect(r.ok && r.valor.map((e) => [e.tipo, e.estado, e.id_jugador])).toEqual([
      ["TRY", "BORRADOR", 7],
      ["CONVERSION", "BORRADOR", 10],
    ]);
  });

  it("los eventos del rival no llevan jugador", () => {
    expect(registrar(colaborador, partidoEnCurso, { ...tryClub, equipo: "RIVAL", id_jugador: null }).ok).toBe(true);
    expect(registrar(colaborador, partidoEnCurso, { ...tryClub, equipo: "RIVAL" }).ok).toBe(false);
  });

  it("si falta un dato obligatorio no permite continuar", () => {
    expect(validarDatos({ ...tryClub, id_jugador: null })).toMatch(/jugador/);
    expect(validarDatos({ ...tryClub, minuto: 0 })).toMatch(/minuto/);
    expect(validarDatos({ ...tryClub, tipo: "CAMBIO", id_jugador_entra: null })).toMatch(/sale y el que entra/);
    expect(validarDatos({ ...tryClub, tipo: "CAMBIO", id_jugador_entra: 7 })).toMatch(/no pueden ser el mismo/);
  });

  it("un espectador o un usuario dado de baja no pueden cargar", () => {
    expect(registrar({ ...colaborador, rol: "Espectador" }, partidoEnCurso, tryClub)).toMatchObject({ ok: false, motivo: "permiso" });
    expect(registrar({ ...colaborador, activo: false }, partidoEnCurso, tryClub)).toMatchObject({ ok: false, motivo: "permiso" });
  });
});

describe("único cargador por partido", () => {
  it("rechaza los eventos de otro usuario mientras el partido está en curso", () => {
    const r = registrar(otroColaborador, partidoEnCurso, tryClub);
    expect(r).toMatchObject({ ok: false, motivo: "permiso" });
    expect(registrar(dirigente1, partidoEnCurso, tryClub)).toMatchObject({ ok: false, motivo: "permiso" });
  });

  it("no se carga en un partido que no está en curso", () => {
    expect(registrar(colaborador, { ...partidoEnCurso, estado: "PROGRAMADO" }, tryClub)).toMatchObject({ ok: false, motivo: "conflicto" });
    expect(registrar(colaborador, { ...partidoEnCurso, estado: "FINALIZADO" }, tryClub)).toMatchObject({ ok: false, motivo: "conflicto" });
  });
});

describe("corrección de eventos (RF 2, RF 8)", () => {
  it("el cargador corrige un evento propio en borrador", () => {
    const r = corregir(colaborador, partidoEnCurso, evento(), { minuto: 13 });
    expect(r.ok && r.valor.datos).toMatchObject({ minuto: 13, estado: "BORRADOR" });
  });

  it("un evento rechazado vuelve a BORRADOR al corregirlo", () => {
    const r = corregir(colaborador, partidoEnCurso, evento({ estado: "RECHAZADO" }), { id_jugador: 8 });
    expect(r.ok && r.valor.datos.estado).toBe("BORRADOR");
  });

  it("no se puede corregir ni eliminar un evento validado o publicado", () => {
    for (const estado of ["VALIDADO", "PUBLICADO"] as const) {
      const r = corregir(colaborador, partidoEnCurso, evento({ estado }), { minuto: 13 });
      expect(r).toMatchObject({ ok: false, motivo: "conflicto", mensaje: "El evento ya fue validado y no se puede modificar." });
      expect(eliminar(colaborador, partidoEnCurso, evento({ estado }))).toMatchObject({ ok: false, motivo: "conflicto" });
    }
  });

  it("solo se corrigen los eventos propios", () => {
    const r = corregir(colaborador, partidoEnCurso, evento({ id_usuario_carga: 99 }), { minuto: 13 });
    expect(r).toMatchObject({ ok: false, motivo: "permiso" });
  });
});

describe("validación (RF 4, RF 5)", () => {
  it("un dirigente valida un evento cargado por otro y luego se publica", () => {
    const v = validar(dirigente2, evento(), partidoEnCurso);
    expect(v.ok && v.valor.estado).toBe("VALIDADO");
    const p = publicar(dirigente2.id_usuario, { id_evento: 100, estado: "VALIDADO" });
    expect(p.ok && p.valor.estado).toBe("PUBLICADO");
  });

  it("un dirigente no puede validar ni rechazar un evento que cargó él mismo", () => {
    const propio = evento({ id_usuario_carga: dirigente1.id_usuario });
    expect(validar(dirigente1, propio, partidoEnCurso)).toMatchObject({
      ok: false,
      motivo: "permiso",
      mensaje: "No podés validar un evento que cargaste vos.",
    });
    expect(rechazar(dirigente1, propio, partidoEnCurso)).toMatchObject({ ok: false, motivo: "permiso" });
    expect(validar(dirigente2, propio, partidoEnCurso).ok).toBe(true);
  });

  it("un colaborador no puede validar", () => {
    expect(validar(colaborador, evento({ id_usuario_carga: 99 }), partidoEnCurso)).toMatchObject({ ok: false, motivo: "permiso" });
  });

  it("solo se validan eventos en borrador", () => {
    for (const estado of ["VALIDADO", "PUBLICADO", "RECHAZADO"] as const) {
      expect(validar(dirigente2, evento({ estado }), partidoEnCurso)).toMatchObject({ ok: false, motivo: "conflicto" });
    }
    expect(publicar(2, { id_evento: 1, estado: "BORRADOR" }).ok).toBe(false);
  });

  it("al rechazar, el evento queda RECHAZADO", () => {
    const r = rechazar(dirigente2, evento(), partidoEnCurso);
    expect(r.ok && r.valor.estado).toBe("RECHAZADO");
  });
});

describe("auditoría en cada acción (RF 8)", () => {
  it("la carga registra un alta por evento, con usuario y valor nuevo", () => {
    const r = registrar(colaborador, partidoEnCurso, tryClub, { conConversion: true, id_jugador_conversion: 10 });
    if (!r.ok) throw new Error();
    for (const e of r.valor) {
      expect(e.auditoria).toEqual([
        expect.objectContaining({ accion: ACCION.ALTA, id_usuario: colaborador.id_usuario, valor_anterior: null }),
      ]);
      expect(e.auditoria[0].valor_nuevo).toMatchObject({ tipo: e.tipo, estado: "BORRADOR", id_partido: 10 });
    }
  });

  it("la corrección registra el valor anterior y el nuevo", () => {
    const r = corregir(colaborador, partidoEnCurso, evento({ estado: "RECHAZADO" }), { minuto: 15 });
    if (!r.ok) throw new Error();
    expect(r.valor.auditoria).toEqual([
      expect.objectContaining({
        accion: ACCION.CORRECCION,
        id_evento: 100,
        valor_anterior: expect.objectContaining({ minuto: 12, estado: "RECHAZADO" }),
        valor_nuevo: expect.objectContaining({ minuto: 15, estado: "BORRADOR" }),
      }),
    ]);
  });

  it("eliminar, validar, publicar y rechazar dejan su registro", () => {
    const casos = [
      [eliminar(colaborador, partidoEnCurso, evento()), ACCION.ELIMINACION],
      [validar(dirigente2, evento(), partidoEnCurso), ACCION.VALIDACION],
      [publicar(dirigente2.id_usuario, { id_evento: 100, estado: "VALIDADO" }), ACCION.PUBLICACION],
      [rechazar(dirigente2, evento(), partidoEnCurso), ACCION.RECHAZO],
    ] as const;
    for (const [r, accion] of casos) {
      if (!r.ok) throw new Error(accion);
      expect(r.valor.auditoria).toHaveLength(1);
      expect(r.valor.auditoria[0]).toMatchObject({ accion, id_evento: 100 });
    }
  });
});
