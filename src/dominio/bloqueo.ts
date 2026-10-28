// Bloqueo por dispositivo ante intentos fallidos de ingreso.
//
// Como el ingreso no pide usuario, el límite no se aplica sobre una cuenta
// sino sobre el dispositivo: después de cinco intentos fallidos consecutivos,
// ese dispositivo queda bloqueado durante quince minutos.

export const MAX_INTENTOS_FALLIDOS = 5;
export const MINUTOS_BLOQUEO = 15;

export type Intento = { fecha_hora: Date; exitoso: boolean };

export type EstadoBloqueo = {
  bloqueado: boolean;
  /** Hasta cuándo dura el bloqueo vigente. */
  hasta: Date | null;
  /** Intentos fallidos consecutivos desde el último ingreso correcto o el último bloqueo. */
  fallidos: number;
  /** Intentos que quedan antes de bloquear el dispositivo. */
  restantes: number;
};

/**
 * Calcula si un dispositivo está bloqueado a partir de su historial de
 * intentos. Los intentos se recorren en orden cronológico: un ingreso
 * correcto reinicia la cuenta y, al llegar a cinco fallidos seguidos, se
 * bloquea el dispositivo durante quince minutos. Al vencer el bloqueo, la
 * cuenta vuelve a cero.
 */
export function calcularBloqueo(intentos: readonly Intento[], ahora: Date): EstadoBloqueo {
  const ordenados = [...intentos].sort((a, b) => a.fecha_hora.getTime() - b.fecha_hora.getTime());
  let fallidos = 0;
  let hasta: Date | null = null;

  for (const intento of ordenados) {
    // Los intentos durante un bloqueo vigente no se cuentan (el servidor los rechaza antes de verificar).
    if (hasta && intento.fecha_hora < hasta) continue;
    if (intento.exitoso) {
      fallidos = 0;
      continue;
    }
    fallidos++;
    if (fallidos >= MAX_INTENTOS_FALLIDOS) {
      hasta = new Date(intento.fecha_hora.getTime() + MINUTOS_BLOQUEO * 60_000);
      fallidos = 0;
    }
  }

  const bloqueado = hasta !== null && ahora < hasta;
  return {
    bloqueado,
    hasta: bloqueado ? hasta : null,
    fallidos: bloqueado ? MAX_INTENTOS_FALLIDOS : fallidos,
    restantes: bloqueado ? 0 : MAX_INTENTOS_FALLIDOS - fallidos,
  };
}
