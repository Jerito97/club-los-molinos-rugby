import { NextResponse } from "next/server";
import { api, cuerpo, ErrorHttp } from "@/lib/http";
import { idDispositivo, ipCliente } from "@/lib/dispositivo";
import { cambiarPin } from "@/servicios/acceso";
import { usuarioActual } from "@/servicios/usuarios";

/** POST /api/acceso/pin — cambio del PIN propio. */
export const POST = api(async (req) => {
  const actor = await usuarioActual();
  if (!actor) throw new ErrorHttp(401, "Tu sesión venció. Ingresá de nuevo con tu PIN.");
  const { actual, nuevo } = await cuerpo<{ actual?: string; nuevo?: string }>(req);
  const r = await cambiarPin(
    actor.id_usuario,
    { actual: actual?.trim(), nuevo: (nuevo ?? "").trim() },
    { id_dispositivo: await idDispositivo(), ip: await ipCliente() }
  );
  if (!r.ok) throw new ErrorHttp(422, r.mensaje);
  return NextResponse.json({ destino: "/gestion" });
});
