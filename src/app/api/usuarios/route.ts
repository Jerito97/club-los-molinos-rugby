import { NextResponse } from "next/server";
import { z } from "zod";
import { api, cuerpo } from "@/lib/http";
import { validarCuerpo } from "@/lib/parametros";
import { crearUsuario } from "@/servicios/gestion-usuarios";
import { exigirPermiso } from "@/servicios/usuarios";

const Esquema = z.object({ nombre: z.string(), rol: z.string() });

/** POST /api/usuarios — alta de usuario con PIN provisorio (responsable de seguridad). */
export const POST = api(async (req) => {
  const actor = await exigirPermiso("gestionar_usuarios");
  const { nombre, rol } = validarCuerpo(Esquema, await cuerpo(req));
  const r = await crearUsuario(actor, nombre, rol);
  return NextResponse.json({ ...r, mensaje: `Usuario creado. PIN provisorio de ${r.nombre}: ${r.pin}` }, { status: 201 });
});
