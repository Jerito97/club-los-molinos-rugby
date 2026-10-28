import "server-only";
import { z } from "zod";
import { ErrorHttp } from "./http";

/** Contexto de las API routes con un parámetro [id]. */
export type ConId = { params: Promise<{ id: string }> };

/** Lee y valida el id numérico de la ruta. */
export async function idDeRuta(ctx: ConId): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorHttp(404, "No encontrado.");
  return id;
}

/** Valida un cuerpo con zod; si no cumple, responde 422 con el primer error. */
export function validarCuerpo<T>(esquema: z.ZodType<T>, datos: unknown): T {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new ErrorHttp(422, r.error.issues[0]?.message ?? "Datos inválidos.");
  return r.data;
}
