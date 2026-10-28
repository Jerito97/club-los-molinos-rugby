import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { idDeRuta, type ConId } from "@/lib/parametros";
import { cerrarCarga } from "@/servicios/partidos";
import { exigirPermiso } from "@/servicios/usuarios";

/** POST /api/partidos/:id/cerrar — Partido.finalizar() de un partido reabierto. */
export const POST = api<ConId>(async (_req, ctx) => {
  const actor = await exigirPermiso("cargar_eventos");
  await cerrarCarga(actor, await idDeRuta(ctx));
  return NextResponse.json({ ok: true });
});
