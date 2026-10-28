import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { borrarSesion, leerSesion } from "@/lib/sesion";
import { idDispositivo, ipCliente } from "@/lib/dispositivo";
import { ACCION } from "@/dominio/auditoria";
import { guardarAuditoria } from "@/servicios/auditoria";

/** POST /api/acceso/salir — cierre de sesión. */
export const POST = api(async () => {
  const id = await leerSesion();
  if (id) {
    await guardarAuditoria(prisma, {
      accion: ACCION.CIERRE_SESION,
      id_usuario: id,
      ip: await ipCliente(),
      id_dispositivo: await idDispositivo(),
    });
  }
  await borrarSesion();
  return NextResponse.json({ destino: "/" });
});
