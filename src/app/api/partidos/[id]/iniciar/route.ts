import { NextResponse } from "next/server";
import { z } from "zod";
import { api, cuerpo } from "@/lib/http";
import { idDeRuta, validarCuerpo, type ConId } from "@/lib/parametros";
import { iniciarPartido } from "@/servicios/partidos";
import { exigirPermiso } from "@/servicios/usuarios";

const Esquema = z.object({ titulares: z.array(z.number().int().positive()) });

/** POST /api/partidos/:id/iniciar — Partido.iniciar() con los titulares. */
export const POST = api<ConId>(async (req, ctx) => {
  const actor = await exigirPermiso("cargar_eventos");
  const { titulares } = validarCuerpo(Esquema, await cuerpo(req));
  await iniciarPartido(actor, await idDeRuta(ctx), titulares);
  return NextResponse.json({ ok: true });
});
