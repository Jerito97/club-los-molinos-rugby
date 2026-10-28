import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { idDeRuta, type ConId } from "@/lib/parametros";
import { blanquearPin } from "@/servicios/gestion-usuarios";
import { exigirPermiso } from "@/servicios/usuarios";

/** POST /api/usuarios/:id/blanqueo — genera un nuevo PIN provisorio (responsable de seguridad). */
export const POST = api<ConId>(async (_req, ctx) => {
  const actor = await exigirPermiso("gestionar_usuarios");
  const r = await blanquearPin(actor, await idDeRuta(ctx), false);
  return NextResponse.json({ ...r, mensaje: `Nuevo PIN provisorio de ${r.nombre}: ${r.pin}` });
});
