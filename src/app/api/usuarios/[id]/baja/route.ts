import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { idDeRuta, type ConId } from "@/lib/parametros";
import { darDeBaja } from "@/servicios/gestion-usuarios";
import { exigirPermiso } from "@/servicios/usuarios";

/** POST /api/usuarios/:id/baja — baja lógica (responsable de seguridad). */
export const POST = api<ConId>(async (_req, ctx) => {
  const actor = await exigirPermiso("gestionar_usuarios");
  await darDeBaja(actor, await idDeRuta(ctx));
  return NextResponse.json({ ok: true, mensaje: "Usuario dado de baja." });
});
