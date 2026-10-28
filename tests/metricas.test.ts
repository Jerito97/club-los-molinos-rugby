import { describe, expect, it } from "vitest";
import { alcanceNotificaciones, tiempoMedianoPublicacion, tiempoPromedioPublicacion, usoPlataforma, type EventoMetrica } from "@/dominio/metricas";
import { BLOQUEOS_PARA_AVISO, validarAlta, validarGestion } from "@/dominio/usuarios";
import { colaborador, dirigente1, dirigente2 } from "./ayudas";

const t = (s: number) => new Date(Date.UTC(2026, 9, 31, 18, 30, s));
const ev = (id: number, carga: number, publica: number | null, extra: Partial<EventoMetrica> = {}): EventoMetrica => ({
  id_evento: id,
  tipo: "TRY",
  estado: publica === null ? "BORRADOR" : "PUBLICADO",
  creado_en: t(carga),
  validado_en: publica === null ? null : t(publica),
  ...extra,
});

describe("métricas del proyecto (objetivo específico 5)", () => {
  it("tiempo promedio y mediano entre carga y publicación, solo de eventos deportivos publicados", () => {
    const eventos = [ev(1, 0, 30), ev(2, 0, 90), ev(3, 0, 60), ev(4, 0, null), ev(5, 0, 0, { tipo: "INICIO_PARTIDO" })];
    expect(tiempoPromedioPublicacion(eventos)).toBe(60);
    expect(tiempoMedianoPublicacion(eventos)).toBe(60);
    expect(tiempoPromedioPublicacion([ev(1, 0, null)])).toBeNull();
  });

  it("alcance de notificaciones por evento", () => {
    expect(alcanceNotificaciones(new Map([[1, 30], [2, 10]]), 4)).toEqual({ total: 40, promedioPorEvento: 10 });
  });

  it("uso de la plataforma: dispositivos distintos y sesiones", () => {
    expect(usoPlataforma([{ id_dispositivo: "a" }, { id_dispositivo: "a" }, { id_dispositivo: "b" }])).toEqual({ dispositivos: 2, sesiones: 3 });
  });
});

describe("gestión de usuarios (responsable de seguridad)", () => {
  it("solo el responsable de seguridad da de alta", () => {
    expect(validarAlta(dirigente1, "Juana Pérez", "Cargador").ok).toBe(true);
    expect(validarAlta(dirigente2, "Juana Pérez", "Cargador")).toMatchObject({ ok: false, motivo: "permiso" });
    expect(validarAlta(colaborador, "Juana Pérez", "Cargador")).toMatchObject({ ok: false, motivo: "permiso" });
    expect(validarAlta(dirigente1, "Juana Pérez", "Espectador")).toMatchObject({ ok: false, motivo: "datos" });
  });

  it("baja lógica: no se puede dar de baja a sí mismo ni dos veces", () => {
    const otro = { id_usuario: 9, rol: "Cargador", activo: true };
    expect(validarGestion(dirigente1, otro, "baja").ok).toBe(true);
    expect(validarGestion(dirigente1, { ...otro, id_usuario: dirigente1.id_usuario }, "baja").ok).toBe(false);
    expect(validarGestion(dirigente1, { ...otro, activo: false }, "baja").ok).toBe(false);
    expect(validarGestion(dirigente1, { ...otro, activo: false }, "reactivar").ok).toBe(true);
  });

  it("avisa con bloqueos repetidos en el día", () => {
    expect(BLOQUEOS_PARA_AVISO).toBe(2);
  });
});
