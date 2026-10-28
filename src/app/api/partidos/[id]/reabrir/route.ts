import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { idDeRuta, type ConId } from "@/lib/parametros";
import { reabrirPartido } from "@/servicios/partidos";
import { exigirPermiso } from "@/servicios/usuarios";

/** POST /api/partidos/:id/reabrir — reabre un partido jugado para revisar su carga. */
export const POST = api<ConId>(async (_req, ctx) => {
  const actor = await exigirPermiso("cargar_eventos");
  await reabrirPartido(actor, await idDeRuta(ctx));
  return NextResponse.json({ ok: true });
});
