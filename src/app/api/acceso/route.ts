import { NextResponse } from "next/server";
import { api, cuerpo } from "@/lib/http";
import { crearSesion } from "@/lib/sesion";
import { idDispositivoConfirmado, ipCliente } from "@/lib/dispositivo";
import { ingresar } from "@/servicios/acceso";

/** POST /api/acceso — ingreso con PIN. */
export const POST = api(async (req) => {
  const { pin } = await cuerpo<{ pin?: unknown }>(req);
  const origen = { id_dispositivo: await idDispositivoConfirmado(), ip: await ipCliente() };
  const r = await ingresar(typeof pin === "string" ? pin.trim() : "", origen);
  if (!r.ok) {
    return NextResponse.json(
      { error: r.mensaje, bloqueadoHasta: r.bloqueadoHasta, restantes: r.restantes },
      { status: r.bloqueadoHasta ? 429 : 401 }
    );
  }
  await crearSesion(r.id_usuario);
  return NextResponse.json({ destino: r.pin_provisorio ? "/acceso/cambiar-pin" : "/gestion" });
});
