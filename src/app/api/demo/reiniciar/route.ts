import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ACCION } from "@/dominio/auditoria";
import { guardarAuditoria } from "@/servicios/auditoria";
import { reiniciarYSembrar } from "@/servicios/demo/sembrar";
import { exigirPermiso } from "@/servicios/usuarios";

export const maxDuration = 60;

/**
 * POST /api/demo/reiniciar — vuelve la base al estado inicial (datos de
 * carga inicial). Solo dirigentes. Los usuarios iniciales conservan su id,
 * así que la sesión de quien reinicia sigue vigente.
 */
export const POST = api(async () => {
  const actor = await exigirPermiso("reiniciar_datos");
  await reiniciarYSembrar(prisma);
  await guardarAuditoria(prisma, { accion: ACCION.REINICIO_DEMO, id_usuario: actor.id_usuario });
  return NextResponse.json({ ok: true, mensaje: "Datos reiniciados." });
});
