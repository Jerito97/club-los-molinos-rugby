import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCION } from "@/dominio/auditoria";
import { guardarAuditoria } from "@/servicios/auditoria";
import { actualizarDesdeURBA } from "@/servicios/urba/actualizar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/urba — job programado (Vercel Cron, ver vercel.json) que
 * incorpora el fixture, los resultados, las posiciones y los rivales de la
 * URBA. Vercel envía el header "Authorization: Bearer <CRON_SECRET>"; sin ese
 * secreto la ruta responde 401.
 */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const resumen = await prisma.$transaction((tx) => actualizarDesdeURBA(tx), { timeout: 50_000 });
    return NextResponse.json({ ok: true, ...resumen });
  } catch (e) {
    // Plan de contingencia del riesgo R3: si la fuente deja de devolver datos,
    // queda registrado y visible en la auditoría para revisarlo.
    const mensaje = e instanceof Error ? e.message : String(e);
    console.error("Falló la actualización desde la URBA:", mensaje);
    await guardarAuditoria(prisma, { accion: ACCION.ACTUALIZACION_URBA_FALLIDA, id_usuario: null, valor_nuevo: { error: mensaje } });
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
