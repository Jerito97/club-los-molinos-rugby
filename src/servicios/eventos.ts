import "server-only";
import { after } from "next/server";
import { prisma, type DB } from "@/lib/prisma";
import { ErrorHttp, exigir } from "@/lib/http";
import type { Actor } from "@/dominio/permisos";
import type { RegistroNuevo } from "@/dominio/auditoria";
import {
  corregir,
  eliminar,
  publicar,
  rechazar,
  registrar,
  validar,
  type Correccion,
  type DatosEvento,
  type EventoGuardado,
  type PartidoCarga,
} from "@/dominio/evento";
import { consultarMarcador, formatearResultado } from "@/dominio/partido";
import { guardarAuditoria } from "./auditoria";
import { notificarPublicacion } from "./notificaciones";

// Casos de uso "Cargar evento deportivo", "Corregir evento en borrador",
// "Validar evento cargado" y "Publicar evento y notificar". Las reglas están
// en src/dominio/evento.ts; acá se cargan los datos, se guardan los cambios y
// la auditoría en una misma transacción y, después del commit, se disparan
// las notificaciones.

const conId = (registros: RegistroNuevo[], id_evento: number) => registros.map((r) => ({ ...r, id_evento }));

async function partidoCarga(db: DB, id_partido: number): Promise<PartidoCarga> {
  const p = await db.partido.findUnique({
    where: { id_partido },
    select: { id_partido: true, estado: true, id_usuario_cargador: true },
  });
  if (!p) throw new ErrorHttp(404, "No existe el partido.");
  return p;
}

async function eventoGuardado(db: DB, id_evento: number): Promise<EventoGuardado> {
  const e = await db.evento.findFirst({ where: { id_evento, eliminado_en: null } });
  if (!e) throw new ErrorHttp(404, "No existe el evento.");
  return e;
}

/** Partido.actualizarMarcador(): recalcula el resultado con los eventos publicados. */
export async function actualizarMarcador(db: DB, id_partido: number): Promise<void> {
  const publicados = await db.evento.findMany({
    where: { id_partido, estado: "PUBLICADO", eliminado_en: null },
    select: { id_evento: true, tipo: true, minuto: true, equipo: true, estado: true, creado_en: true },
  });
  await db.partido.update({
    where: { id_partido },
    data: { resultado: formatearResultado(consultarMarcador(publicados)) },
  });
}

/** Evento.registrar(): crea uno o dos eventos en borrador (Try y Conversión). */
export async function registrarEvento(
  actor: Actor,
  id_partido: number,
  datos: DatosEvento,
  opciones: { conConversion?: boolean; id_jugador_conversion?: number | null }
) {
  return prisma.$transaction(async (tx) => {
    const partido = await partidoCarga(tx, id_partido);
    await verificarJugadores(tx, [datos.id_jugador, datos.id_jugador_entra, opciones.id_jugador_conversion]);
    const nuevos = exigir(registrar(actor, partido, datos, opciones));
    const creados = [];
    for (const { auditoria, ...e } of nuevos) {
      const creado = await tx.evento.create({ data: { ...e, id_partido, id_usuario_carga: actor.id_usuario } });
      await guardarAuditoria(tx, conId(auditoria, creado.id_evento));
      creados.push(creado);
    }
    return creados;
  });
}

async function verificarJugadores(db: DB, ids: (number | null | undefined)[]) {
  const lista = ids.filter((id): id is number => typeof id === "number");
  if (lista.length === 0) return;
  const cantidad = await db.jugador.count({ where: { id_jugador: { in: lista } } });
  if (cantidad !== new Set(lista).size) throw new ErrorHttp(422, "El jugador elegido no pertenece al plantel.");
}

/** Evento.corregir(datos). Un evento rechazado vuelve a borrador. */
export async function corregirEvento(actor: Actor, id_evento: number, cambios: Correccion) {
  return prisma.$transaction(async (tx) => {
    const evento = await eventoGuardado(tx, id_evento);
    const partido = await partidoCarga(tx, evento.id_partido);
    await verificarJugadores(tx, [cambios.id_jugador, cambios.id_jugador_entra]);
    const r = exigir(corregir(actor, partido, evento, cambios));
    // La condición sobre el estado evita pisar una validación simultánea.
    const { count } = await tx.evento.updateMany({
      where: { id_evento, estado: { in: ["BORRADOR", "RECHAZADO"] }, eliminado_en: null },
      data: r.datos,
    });
    if (count !== 1) throw new ErrorHttp(409, "El evento ya fue validado y no se puede modificar.");
    await guardarAuditoria(tx, r.auditoria);
  });
}

/** Eliminación (lógica) de un evento propio que todavía no fue validado. */
export async function eliminarEvento(actor: Actor, id_evento: number) {
  return prisma.$transaction(async (tx) => {
    const evento = await eventoGuardado(tx, id_evento);
    const partido = await partidoCarga(tx, evento.id_partido);
    const r = exigir(eliminar(actor, partido, evento));
    const { count } = await tx.evento.updateMany({
      where: { id_evento, estado: { in: ["BORRADOR", "RECHAZADO"] }, eliminado_en: null },
      data: { eliminado_en: new Date() },
    });
    if (count !== 1) throw new ErrorHttp(409, "El evento ya fue validado y no se puede eliminar.");
    await guardarAuditoria(tx, r.auditoria);
  });
}

/**
 * Evento.validar() seguido de Evento.publicar() y Partido.actualizarMarcador(),
 * en una única transacción. La notificación se envía después del commit,
 * para no avisar de un evento que finalmente no se guardó.
 */
export async function validarEvento(actor: Actor, id_evento: number) {
  await prisma.$transaction(async (tx) => {
    const evento = await eventoGuardado(tx, id_evento);
    const partido = await partidoCarga(tx, evento.id_partido);
    const v = exigir(validar(actor, evento, partido));
    const { count } = await tx.evento.updateMany({
      where: { id_evento, estado: "BORRADOR", eliminado_en: null },
      data: { estado: v.estado, id_usuario_valida: actor.id_usuario, validado_en: new Date() },
    });
    if (count !== 1) throw new ErrorHttp(409, "El evento cambió mientras lo revisabas. Actualizá la lista.");
    const p = exigir(publicar(actor.id_usuario, { id_evento, estado: v.estado }));
    await tx.evento.update({ where: { id_evento }, data: { estado: p.estado } });
    await guardarAuditoria(tx, [...v.auditoria, ...p.auditoria]);
    await actualizarMarcador(tx, evento.id_partido);
  });
  after(() => notificarPublicacion(id_evento));
}

/** Evento.rechazar(): el evento vuelve al colaborador para su corrección. */
export async function rechazarEvento(actor: Actor, id_evento: number) {
  await prisma.$transaction(async (tx) => {
    const evento = await eventoGuardado(tx, id_evento);
    const partido = await partidoCarga(tx, evento.id_partido);
    const r = exigir(rechazar(actor, evento, partido));
    const { count } = await tx.evento.updateMany({
      where: { id_evento, estado: "BORRADOR", eliminado_en: null },
      data: { estado: r.estado },
    });
    if (count !== 1) throw new ErrorHttp(409, "El evento cambió mientras lo revisabas. Actualizá la lista.");
    await guardarAuditoria(tx, r.auditoria);
  });
}
