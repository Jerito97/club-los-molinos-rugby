import { NextResponse } from "next/server";
import { z } from "zod";
import { api, cuerpo } from "@/lib/http";
import { idDeRuta, validarCuerpo, type ConId } from "@/lib/parametros";
import { reasignar } from "@/servicios/partidos";
import { exigirPermiso } from "@/servicios/usuarios";

const Esquema = z.object({ id_usuario: z.number().int().positive() });

/** PUT /api/partidos/:id/cargador — un dirigente reasigna la carga del partido. */
export const PUT = api<ConId>(async (req, ctx) => {
  const actor = await exigirPermiso("reasignar_cargador");
  const { id_usuario } = validarCuerpo(Esquema, await cuerpo(req));
  await reasignar(actor, await idDeRuta(ctx), id_usuario);
  return NextResponse.json({ ok: true });
});
