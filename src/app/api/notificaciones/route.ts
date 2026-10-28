import { NextResponse } from "next/server";
import { z } from "zod";
import { api, cuerpo, ErrorHttp } from "@/lib/http";
import { validarCuerpo } from "@/lib/parametros";
import { TIPOS_NOTIFICABLES } from "@/dominio/notificaciones";
import { guardarPreferencias, leerPreferencias, usuarioDeNotificaciones } from "@/servicios/preferencias";

/** GET /api/notificaciones — preferencias del usuario o dispositivo actual. */
export const GET = api(async () => {
  const id = await usuarioDeNotificaciones();
  return NextResponse.json({ preferencias: await leerPreferencias(id) });
});

const Esquema = z.object({
  preferencias: z.partialRecord(z.enum(TIPOS_NOTIFICABLES as [string, ...string[]]), z.boolean()),
});

/** PUT /api/notificaciones — PreferenciaNotificacion.guardar(tipos). */
export const PUT = api(async (req) => {
  const { preferencias } = validarCuerpo(Esquema, await cuerpo(req));
  const id = await usuarioDeNotificaciones();
  if (!id) throw new ErrorHttp(409, "Primero activá las notificaciones en este dispositivo.");
  await guardarPreferencias(id, preferencias);
  return NextResponse.json({ ok: true, mensaje: "Preferencias guardadas." });
});
