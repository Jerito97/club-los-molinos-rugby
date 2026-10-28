import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";

// Identificación del dispositivo, sin datos personales.
//
// El proxy (src/proxy.ts) asigna a cada navegador una cookie `id_dispositivo`
// con un identificador aleatorio. Se usa para el bloqueo por intentos
// fallidos, para asociar las notificaciones de los espectadores y para contar
// visitas al marcador. La IP queda como respaldo del bloqueo.

export const COOKIE_DISPOSITIVO = "id_dispositivo";

export async function idDispositivo(): Promise<string | null> {
  const valor = (await cookies()).get(COOKIE_DISPOSITIVO)?.value;
  return valor && /^[a-zA-Z0-9-]{16,64}$/.test(valor) ? valor : null;
}

/**
 * Identificador del dispositivo solo si el navegador ya lo tenía (no si el
 * proxy lo acaba de asignar en este pedido). Se usa en el ingreso con PIN:
 * un pedido sin cookie se identifica por la IP, así no se puede esquivar el
 * bloqueo descartando la cookie en cada intento.
 */
export async function idDispositivoConfirmado(): Promise<string | null> {
  if ((await headers()).get("x-dispositivo-nuevo")) return null;
  return idDispositivo();
}

export async function ipCliente(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "desconocida";
}

/** Hash del dispositivo para las métricas de uso (no permite identificarlo). */
export function hashDispositivo(id: string): string {
  return createHash("sha256").update(`visita:${id}`).digest("hex").slice(0, 24);
}
