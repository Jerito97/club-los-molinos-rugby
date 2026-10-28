import { NextResponse } from "next/server";
import { z } from "zod";
import { api, cuerpo } from "@/lib/http";
import { idDeRuta, validarCuerpo, type ConId } from "@/lib/parametros";
import { TIPOS_DEPORTIVOS, type TipoEvento } from "@/dominio/tipos";
import { corregirEvento, eliminarEvento } from "@/servicios/eventos";
import { exigirPermiso } from "@/servicios/usuarios";

const Esquema = z.object({
  tipo: z.enum(TIPOS_DEPORTIVOS as [TipoEvento, ...TipoEvento[]]).optional(),
  minuto: z.number().int().optional(),
  equipo: z.enum(["CLUB", "RIVAL"]).optional(),
  id_jugador: z.number().int().positive().nullable().optional(),
  id_jugador_entra: z.number().int().positive().nullable().optional(),
});

/** PATCH /api/eventos/:id — Evento.corregir(datos). */
export const PATCH = api<ConId>(async (req, ctx) => {
  const actor = await exigirPermiso("corregir_eventos_propios");
  const cambios = validarCuerpo(Esquema, await cuerpo(req));
  await corregirEvento(actor, await idDeRuta(ctx), cambios);
  return NextResponse.json({ ok: true, mensaje: "Evento corregido — pendiente de validación." });
});

/** DELETE /api/eventos/:id — elimina un evento propio no validado. */
export const DELETE = api<ConId>(async (_req, ctx) => {
  const actor = await exigirPermiso("corregir_eventos_propios");
  await eliminarEvento(actor, await idDeRuta(ctx));
  return NextResponse.json({ ok: true, mensaje: "Evento eliminado." });
});
