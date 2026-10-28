import { NextResponse } from "next/server";
import { z } from "zod";
import { api, cuerpo, ErrorHttp } from "@/lib/http";
import { validarCuerpo } from "@/lib/parametros";
import { desuscribir, suscribir, usuarioDeNotificaciones } from "@/servicios/preferencias";

const Suscripcion = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** POST /api/notificaciones/suscripcion — activa las notificaciones en este dispositivo. */
export const POST = api(async (req) => {
  const s = validarCuerpo(Suscripcion, await cuerpo(req));
  const id = await usuarioDeNotificaciones(true);
  if (!id) throw new ErrorHttp(400, "No se pudo identificar el dispositivo. Recargá la página.");
  await suscribir(id, { endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
  return NextResponse.json({ ok: true, mensaje: "Notificaciones activadas." });
});

/** DELETE /api/notificaciones/suscripcion — desactiva las notificaciones en este dispositivo. */
export const DELETE = api(async (req) => {
  const { endpoint } = validarCuerpo(z.object({ endpoint: z.string() }), await cuerpo(req));
  const id = await usuarioDeNotificaciones();
  if (id) await desuscribir(id, endpoint);
  return NextResponse.json({ ok: true, mensaje: "Notificaciones desactivadas." });
});
