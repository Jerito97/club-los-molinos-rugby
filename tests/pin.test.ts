import { describe, expect, it } from "vitest";
import {
  COSTO_BCRYPT,
  esRepetido,
  esSecuencia,
  generarPinProvisorio,
  hashearPin,
  validarFormatoPin,
  validarPinNuevo,
  verificarPin,
} from "@/dominio/pin";

describe("reglas del PIN", () => {
  it("exige exactamente 6 dígitos numéricos", () => {
    expect(validarFormatoPin("12345")).toMatch(/6 dígitos/);
    expect(validarFormatoPin("1234567")).toMatch(/6 dígitos/);
    expect(validarFormatoPin("12a456")).toMatch(/solo números/);
    expect(validarFormatoPin("258036")).toBeNull();
  });

  it("rechaza secuencias ascendentes y descendentes", () => {
    for (const pin of ["123456", "654321", "012345", "456789", "987654"]) {
      expect(esSecuencia(pin)).toBe(true);
      expect(validarFormatoPin(pin)).toMatch(/secuencia/);
    }
    expect(esSecuencia("124356")).toBe(false);
  });

  it("rechaza dígitos repetidos", () => {
    for (const pin of ["111111", "000000", "999999"]) {
      expect(esRepetido(pin)).toBe(true);
      expect(validarFormatoPin(pin)).toMatch(/iguales/);
    }
    expect(esRepetido("111112")).toBe(false);
  });

  it("guarda el PIN con bcrypt, con sal y costo ≥ 10", async () => {
    expect(COSTO_BCRYPT).toBeGreaterThanOrEqual(10);
    const a = await hashearPin("258036");
    const b = await hashearPin("258036");
    expect(a).not.toContain("258036");
    expect(a).not.toBe(b); // sal distinta en cada hash
    expect(a).toMatch(/^\$2[aby]\$1\d\$/);
    expect(await verificarPin("258036", a)).toBe(true);
    expect(await verificarPin("258037", a)).toBe(false);
  });

  it("no permite repetir ninguno de los 3 últimos PIN del usuario", async () => {
    const historial = [await hashearPin("482915"), await hashearPin("593026"), await hashearPin("604137")];
    for (const pin of ["482915", "593026", "604137"]) {
      expect(await validarPinNuevo(pin, [], historial)).toMatch(/3 últimos/);
    }
    // El cuarto anterior ya se puede volver a usar.
    const conCuarto = [...historial, await hashearPin("715248")];
    expect(await validarPinNuevo("715248", [], conCuarto)).toBeNull();
  });

  it("no permite el PIN de otro usuario activo", async () => {
    const activos = [await hashearPin("731904")];
    expect(await validarPinNuevo("731904", activos, [])).toMatch(/no está disponible/);
    expect(await validarPinNuevo("731905", activos, [])).toBeNull();
  });

  it("genera PIN provisorios que cumplen las reglas", () => {
    for (let i = 0; i < 200; i++) expect(validarFormatoPin(generarPinProvisorio())).toBeNull();
  });
});
