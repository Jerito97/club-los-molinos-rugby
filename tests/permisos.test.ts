import { describe, expect, it } from "vitest";
import { puede, type Actor } from "@/dominio/permisos";
import { ROL } from "@/dominio/tipos";

const actor = (rol: Actor["rol"], extra: Partial<Actor> = {}): Actor => ({
  id_usuario: 1,
  nombre: "Prueba",
  rol,
  activo: true,
  es_responsable_seguridad: false,
  ...extra,
});

describe("permisos por perfil (Tabla 13)", () => {
  it("el colaborador carga y corrige, pero no valida ni ve la auditoría", () => {
    const c = actor(ROL.CARGADOR);
    expect(puede(c, "cargar_eventos")).toBe(true);
    expect(puede(c, "corregir_eventos_propios")).toBe(true);
    expect(puede(c, "validar_eventos")).toBe(false);
    expect(puede(c, "consultar_auditoria")).toBe(false);
    expect(puede(c, "gestionar_usuarios")).toBe(false);
  });

  it("el dirigente carga, valida y consulta la auditoría", () => {
    const d = actor(ROL.VALIDADOR);
    expect(puede(d, "cargar_eventos")).toBe(true);
    expect(puede(d, "validar_eventos")).toBe(true);
    expect(puede(d, "consultar_auditoria")).toBe(true);
    expect(puede(d, "reasignar_cargador")).toBe(true);
  });

  it("solo el dirigente responsable de seguridad gestiona usuarios", () => {
    expect(puede(actor(ROL.VALIDADOR), "gestionar_usuarios")).toBe(false);
    expect(puede(actor(ROL.VALIDADOR, { es_responsable_seguridad: true }), "gestionar_usuarios")).toBe(true);
    expect(puede(actor(ROL.CARGADOR, { es_responsable_seguridad: true }), "gestionar_usuarios")).toBe(false);
  });

  it("el espectador solo consulta y configura notificaciones", () => {
    const e = actor(ROL.ESPECTADOR);
    expect(puede(e, "ver_marcador")).toBe(true);
    expect(puede(e, "configurar_notificaciones")).toBe(true);
    expect(puede(e, "cargar_eventos")).toBe(false);
  });

  it("un usuario dado de baja no puede nada", () => {
    expect(puede(actor(ROL.VALIDADOR, { activo: false }), "validar_eventos")).toBe(false);
    expect(puede(null, "cargar_eventos")).toBe(false);
  });
});
