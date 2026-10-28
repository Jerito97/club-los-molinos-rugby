import { describe, expect, it } from "vitest";
import { calcularBloqueo, type Intento } from "@/dominio/bloqueo";

const t0 = new Date("2026-10-31T18:00:00Z").getTime();
const en = (min: number) => new Date(t0 + min * 60_000);
const fallido = (min: number): Intento => ({ fecha_hora: en(min), exitoso: false });
const exitoso = (min: number): Intento => ({ fecha_hora: en(min), exitoso: true });

describe("bloqueo por dispositivo", () => {
  it("bloquea durante 15 minutos al quinto intento fallido consecutivo", () => {
    const intentos = [0, 1, 2, 3, 4].map(fallido);
    const estado = calcularBloqueo(intentos, en(5));
    expect(estado.bloqueado).toBe(true);
    expect(estado.hasta).toEqual(en(19));
    expect(estado.restantes).toBe(0);
  });

  it("no bloquea con cuatro fallidos e informa los intentos restantes", () => {
    const estado = calcularBloqueo([0, 1, 2, 3].map(fallido), en(4));
    expect(estado.bloqueado).toBe(false);
    expect(estado.restantes).toBe(1);
  });

  it("un ingreso correcto reinicia la cuenta de fallidos", () => {
    const intentos = [fallido(0), fallido(1), fallido(2), fallido(3), exitoso(4), fallido(5)];
    const estado = calcularBloqueo(intentos, en(6));
    expect(estado.bloqueado).toBe(false);
    expect(estado.fallidos).toBe(1);
  });

  it("el bloqueo vence a los 15 minutos y la cuenta vuelve a cero", () => {
    const intentos = [0, 1, 2, 3, 4].map(fallido);
    expect(calcularBloqueo(intentos, en(18)).bloqueado).toBe(true);
    const vencido = calcularBloqueo(intentos, en(20));
    expect(vencido.bloqueado).toBe(false);
    expect(vencido.restantes).toBe(5);
  });

  it("vuelve a bloquear si después del bloqueo hay otros cinco fallidos", () => {
    const intentos = [...[0, 1, 2, 3, 4].map(fallido), ...[20, 21, 22, 23, 24].map(fallido)];
    const estado = calcularBloqueo(intentos, en(25));
    expect(estado.bloqueado).toBe(true);
    expect(estado.hasta).toEqual(en(39));
  });
});
