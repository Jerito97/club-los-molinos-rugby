import { describe, expect, it } from "vitest";
import { GRUPOS_NOTIFICACION, TIPOS_NOTIFICABLES, obtenerSuscriptos, textoNotificacion } from "@/dominio/notificaciones";

describe("preferencias de notificación (RF 7, RF 9)", () => {
  const preferencias = [
    { id_usuario: 1, tipo_evento: "TRY" as const, activa: true },
    { id_usuario: 1, tipo_evento: "PENAL" as const, activa: false },
    { id_usuario: 2, tipo_evento: "TRY" as const, activa: false },
    { id_usuario: 2, tipo_evento: "PENAL" as const, activa: true },
    { id_usuario: 3, tipo_evento: "TRY" as const, activa: true },
  ];

  it("obtenerSuscriptos devuelve solo los usuarios con ese tipo activo", () => {
    expect(obtenerSuscriptos(preferencias, "TRY")).toEqual([1, 3]);
    expect(obtenerSuscriptos(preferencias, "PENAL")).toEqual([2]);
    expect(obtenerSuscriptos(preferencias, "DROP")).toEqual([]);
  });

  it("la pantalla agrupa los tipos como en la configuración del documento", () => {
    expect(GRUPOS_NOTIFICACION.map((g) => g.etiqueta)).toEqual([
      "Arranque del partido",
      "Entretiempo",
      "Arranque del segundo tiempo",
      "Final del partido",
      "Tries (con o sin conversión)",
      "Penales",
      "Drops",
      "Tarjetas",
      "Cambios",
    ]);
    expect(new Set(TIPOS_NOTIFICABLES).size).toBe(11);
  });

  it("arma el texto con el minuto, el jugador y el marcador", () => {
    const t = textoNotificacion({
      tipo: "TRY",
      minuto: 23,
      equipo: "CLUB",
      rival: "San Miguel",
      jugador: "Agustín Pereyra",
      marcador: { club: 12, rival: 3 },
    });
    expect(t).toEqual({ titulo: "23' Try de Agustín Pereyra · Los Molinos", cuerpo: "Los Molinos 12 - 3 San Miguel" });
  });
});
