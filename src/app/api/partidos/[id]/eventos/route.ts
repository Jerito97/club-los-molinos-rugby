import { NextResponse } from "next/server";
import { z } from "zod";
import { api, cuerpo } from "@/lib/http";
import { idDeRuta, validarCuerpo, type ConId } from "@/lib/parametros";
import { TIPOS_EVENTO, esEventoDeControl } from "@/dominio/tipos";
import { registrarEvento } from "@/servicios/eventos";
import { cargarControl } from "@/servicios/partidos";
import { exigirPermiso } from "@/servicios/usuarios";

const Esquema = z.object({
  tipo: z.enum(TIPOS_EVENTO, { message: "Elegí el tipo de evento." }),
  minuto: z.number({ message: "Indicá el minuto." }).int().optional(),
  equipo: z.enum(["CLUB", "RIVAL"]).optional(),
  id_jugador: z.number().int().positive().nullable().optional(),
  id_jugador_entra: z.number().int().positive().nullable().optional(),
  conConversion: z.boolean().optional(),
  id_jugador_conversion: z.number().int().positive().nullable().optional(),
});

/**
 * POST /api/partidos/:id/eventos — Evento.registrar(): carga un evento en
 * borrador. Los eventos de control (arranque, entretiempo, etc.) se publican
 * en el momento.
 */
export const POST = api<ConId>(async (req, ctx) => {
  const actor = await exigirPermiso("cargar_eventos");
  const id_partido = await idDeRuta(ctx);
  const d = validarCuerpo(Esquema, await cuerpo(req));
  if (esEventoDeControl(d.tipo)) {
    await cargarControl(actor, id_partido, d.tipo);
    return NextResponse.json({ ok: true, mensaje: "Publicado." }, { status: 201 });
  }
  const creados = await registrarEvento(
    actor,
    id_partido,
    {
      tipo: d.tipo,
      minuto: d.minuto ?? NaN,
      equipo: d.equipo ?? "CLUB",
      id_jugador: d.id_jugador ?? null,
      id_jugador_entra: d.id_jugador_entra ?? null,
    },
    { conConversion: d.conConversion, id_jugador_conversion: d.id_jugador_conversion }
  );
  return NextResponse.json(
    { ok: true, ids: creados.map((e) => e.id_evento), mensaje: "Evento cargado — pendiente de validación." },
    { status: 201 }
  );
});
