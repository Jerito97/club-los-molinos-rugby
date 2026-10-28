import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { idDeRuta, type ConId } from "@/lib/parametros";
import { validarEvento } from "@/servicios/eventos";
import { exigirPermiso } from "@/servicios/usuarios";

/** POST /api/eventos/:id/validar — Evento.validar() → publicar(). Solo dirigentes (403 para el resto). */
export const POST = api<ConId>(async (_req, ctx) => {
  const actor = await exigirPermiso("validar_eventos");
  await validarEvento(actor, await idDeRuta(ctx));
  return NextResponse.json({ ok: true, mensaje: "Evento validado y publicado." });
});
