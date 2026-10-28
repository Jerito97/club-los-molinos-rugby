// Reglas del PIN de acceso (sección "Seguridad > Acceso a la aplicación").
//
// - Seis dígitos.
// - Único entre los usuarios activos.
// - Sin secuencias (123456, 654321) ni dígitos repetidos (111111).
// - No puede coincidir con ninguno de los tres últimos PIN del mismo usuario.
// - Se guarda solo como hash bcrypt (con sal y factor de costo ≥ 10).

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

export const LARGO_PIN = 6;
/**
 * Factor de costo de bcrypt (2^10 rondas). Como el ingreso compara el PIN
 * contra los hashes de todos los usuarios activos, se usa el mínimo que fija
 * la política de seguridad para que el ingreso siga siendo rápido.
 */
export const COSTO_BCRYPT = 10;
/** Cantidad de PIN anteriores que no se pueden repetir. */
export const PIN_HISTORIAL = 3;

/** true si los dígitos forman una secuencia ascendente o descendente (123456, 654321). */
export function esSecuencia(pin: string): boolean {
  const d = [...pin].map(Number);
  const asc = d.every((n, i) => i === 0 || n === d[i - 1] + 1);
  const desc = d.every((n, i) => i === 0 || n === d[i - 1] - 1);
  return asc || desc;
}

/** true si todos los dígitos son iguales (111111). */
export function esRepetido(pin: string): boolean {
  return /^(\d)\1*$/.test(pin);
}

/**
 * Valida el formato del PIN. Devuelve el mensaje de error para mostrar al
 * usuario, o null si el formato es válido. La unicidad y el historial se
 * verifican aparte porque necesitan los hashes guardados.
 */
export function validarFormatoPin(pin: string): string | null {
  if (!/^\d+$/.test(pin)) return "El PIN tiene que tener solo números.";
  if (pin.length !== LARGO_PIN) return `El PIN tiene que tener ${LARGO_PIN} dígitos.`;
  if (esRepetido(pin)) return "El PIN no puede tener todos los dígitos iguales.";
  if (esSecuencia(pin)) return "El PIN no puede ser una secuencia como 123456 o 654321.";
  return null;
}

export function hashearPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, COSTO_BCRYPT);
}

export function verificarPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/** true si el PIN coincide con alguno de los hashes dados. */
export async function coincideConAlguno(pin: string, hashes: readonly string[]): Promise<boolean> {
  for (const hash of hashes) {
    if (await verificarPin(pin, hash)) return true;
  }
  return false;
}

/**
 * Valida un PIN nuevo con todas las reglas.
 * @param hashesActivos hashes de los PIN de los demás usuarios activos (unicidad).
 * @param ultimosPropios hashes de los últimos PIN del mismo usuario, del más reciente al más antiguo.
 */
export async function validarPinNuevo(
  pin: string,
  hashesActivos: readonly string[],
  ultimosPropios: readonly string[]
): Promise<string | null> {
  const formato = validarFormatoPin(pin);
  if (formato) return formato;
  if (await coincideConAlguno(pin, ultimosPropios.slice(0, PIN_HISTORIAL))) {
    return `El PIN no puede ser igual a ninguno de tus ${PIN_HISTORIAL} últimos.`;
  }
  // Como el ingreso es solo con PIN, dos usuarios activos no pueden compartirlo.
  // El mensaje no revela que el PIN pertenece a otra persona.
  if (await coincideConAlguno(pin, hashesActivos)) {
    return "Ese PIN no está disponible. Elegí otro.";
  }
  return null;
}

/** Genera un PIN provisorio aleatorio que cumple las reglas de formato. */
export function generarPinProvisorio(): string {
  for (;;) {
    const pin = randomInt(0, 10 ** LARGO_PIN).toString().padStart(LARGO_PIN, "0");
    if (!validarFormatoPin(pin)) return pin;
  }
}
