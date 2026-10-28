import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { idDeRuta, type ConId } from "@/lib/parametros";
import { hashDispositivo, idDispositivo } from "@/lib/dispositivo";

/**
 * POST /api/partidos/:id/visita — registra una visita al marcador para las
 * métricas de uso. Solo guarda un hash del dispositivo, sin datos personales.
 */
export const POST = api<ConId>(async (_req, ctx) => {
  const id_partido = await idDeRuta(ctx);
  const dispositivo = await idDispositivo();
  if (dispositivo && (await prisma.partido.count({ where: { id_partido } }))) {
    await prisma.visitaMarcador.create({ data: { id_partido, id_dispositivo: hashDispositivo(dispositivo) } });
  }
  return NextResponse.json({ ok: true });
});
