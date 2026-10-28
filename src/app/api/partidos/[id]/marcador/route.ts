import { NextResponse } from "next/server";
import { api, ErrorHttp } from "@/lib/http";
import { idDeRuta, type ConId } from "@/lib/parametros";
import { vistaMarcador } from "@/servicios/consultas";

/** GET /api/partidos/:id/marcador — marcador y minuto a minuto (solo eventos publicados). */
export const GET = api<ConId>(async (_req, ctx) => {
  const vista = await vistaMarcador(await idDeRuta(ctx));
  if (!vista) throw new ErrorHttp(404, "No existe el partido.");
  return NextResponse.json(vista, { headers: { "Cache-Control": "no-store" } });
});
