import "server-only";
import webpush from "web-push";

// Envío de notificaciones Web Push con claves VAPID (variables de entorno).

let configurado = false;

/** true si están las claves VAPID; sin ellas la app funciona igual, sin notificaciones. */
export function pushDisponible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configurado = true;
}

export type Suscripcion = { endpoint: string; p256dh: string; auth: string };
export type Aviso = { titulo: string; cuerpo: string; url: string; etiqueta?: string };

/**
 * Envía un aviso a una suscripción. Devuelve "enviado", "vencida" (el
 * servicio respondió 404/410: la suscripción ya no existe y hay que borrarla)
 * o "error".
 */
export async function enviarPush(s: Suscripcion, aviso: Aviso): Promise<"enviado" | "vencida" | "error"> {
  configurar();
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify(aviso),
      { TTL: 60 * 30, urgency: "high" }
    );
    return "enviado";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "vencida";
    console.error("Error al enviar la notificación push", status ?? e);
    return "error";
  }
}
