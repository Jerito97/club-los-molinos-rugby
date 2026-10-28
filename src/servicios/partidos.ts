import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { ErrorHttp, exigir } from "@/lib/http";
import type { Actor } from "@/dominio/permisos";
import type { TipoEvento } from "@/dominio/tipos";
import {
  calcularReloj,
  consultarMarcador,
  finalizar,
  formatearResultado,
  iniciar,
  minutoSugerido,
  reabrir,
  reasignarCargador,
  registrarControl,
} from "@/dominio/partido";
import { rechazo } from "@/dominio/resultado";
import { cargarActor } from "./actores";
import { guardarAuditoria } from "./auditoria";
import { notificarPublicacion } from "./notificaciones";

// Casos de uso "Seleccionar partido en curso" (Partido.listarDisponibles(),
// Partido.iniciar(), Partido.asignarCargador()) y control del partido.

async function partido(id_partido: number) {
  const p = await prisma.partido.findUnique({ where: { id_partido } });
  if (!p) throw new ErrorHttp(404, "No existe el partido.");
  return p;
}

/** Inicia la carga en vivo con los titulares; quien inicia queda como cargador. */
export async function iniciarPartido(actor: Actor, id_partido: number, titulares: number[]) {
  const plantel = new Set((await prisma.jugador.findMany({ select: { id_jugador: true } })).map((j) => j.id_jugador));
  await prisma.$transaction(async (tx) => {
    const p = await partido(id_partido);
    const r = exigir(iniciar(actor, p, titulares, plantel));
    // La condición sobre el estado impide que dos personas inicien el mismo partido a la vez.
    const { count } = await tx.partido.updateMany({ where: { id_partido, estado: "PROGRAMADO" }, data: r.cambios });
    if (count !== 1) throw new ErrorHttp(409, "Otra persona ya inició este partido.");
    await tx.titularPartido.deleteMany({ where: { id_partido } });
    await tx.titularPartido.createMany({ data: r.titulares.map((id_jugador) => ({ id_partido, id_jugador })) });
    await guardarAuditoria(tx, r.auditoria);
  });
}

/** Reabre un partido jugado para revisar o completar su carga. */
export async function reabrirPartido(actor: Actor, id_partido: number) {
  await prisma.$transaction(async (tx) => {
    const p = await partido(id_partido);
    const r = exigir(reabrir(actor, p));
    const { count } = await tx.partido.updateMany({ where: { id_partido, estado: "FINALIZADO" }, data: r.cambios });
    if (count !== 1) throw new ErrorHttp(409, "El partido ya fue reabierto.");
    await guardarAuditoria(tx, r.auditoria);
  });
}

/** Cierra la carga de un partido reabierto (el final ya estaba publicado). */
export async function cerrarCarga(actor: Actor, id_partido: number) {
  await prisma.$transaction(async (tx) => {
    const p = await partido(id_partido);
    if (p.estado !== "EN_CURSO") exigir(rechazo("conflicto", "El partido no está en curso."));
    if (p.id_usuario_cargador !== actor.id_usuario) exigir(rechazo("permiso", "Solo el cargador asignado puede cerrar la carga."));
    const publicados = await tx.evento.findMany({ where: { id_partido, estado: "PUBLICADO", eliminado_en: null } });
    if (!publicados.some((e) => e.tipo === "FINAL_PARTIDO")) {
      exigir(rechazo("conflicto", "Primero cargá el final del partido."));
    }
    const f = finalizar(actor, p, consultarMarcador(publicados));
    await tx.partido.update({ where: { id_partido }, data: { ...f.cambios, resultado: f.resultado } });
    await guardarAuditoria(tx, f.auditoria);
  });
}

/** Un dirigente reasigna la carga del partido a otro colaborador o dirigente. */
export async function reasignar(actor: Actor, id_partido: number, id_usuario_nuevo: number) {
  await prisma.$transaction(async (tx) => {
    const p = await partido(id_partido);
    const nuevo = await cargarActor(tx, id_usuario_nuevo);
    if (!nuevo) throw new ErrorHttp(422, "No existe la persona elegida.");
    const r = exigir(reasignarCargador(actor, p, nuevo));
    await tx.partido.update({ where: { id_partido }, data: r.cambios });
    await guardarAuditoria(tx, r.auditoria);
  });
}

/** Carga un evento de control (arranque, entretiempo, segundo tiempo o final). */
export async function cargarControl(actor: Actor, id_partido: number, tipo: TipoEvento) {
  const ahora = new Date();
  const creado = await prisma.$transaction(async (tx) => {
    const p = await partido(id_partido);
    const publicados = await tx.evento.findMany({ where: { id_partido, estado: "PUBLICADO", eliminado_en: null } });
    const reloj = calcularReloj(p.iniciado_en, publicados);
    const marcador = consultarMarcador(publicados);
    const r = exigir(
      registrarControl(
        actor,
        p,
        tipo,
        new Set(publicados.map((e) => e.tipo)),
        ahora,
        minutoSugerido(reloj, ahora),
        marcador
      )
    );
    const { auditoria, ...datos } = r.evento;
    const evento = await tx.evento.create({
      data: {
        ...datos,
        id_partido,
        id_usuario_carga: actor.id_usuario,
        creado_en: ahora,
        validado_en: ahora,
      },
    });
    await tx.partido.update({
      where: { id_partido },
      data: { ...r.cambios, ...(r.cambios.estado === "FINALIZADO" ? { resultado: formatearResultado(marcador) } : {}) },
    });
    await guardarAuditoria(tx, [...auditoria.map((a) => ({ ...a, id_evento: evento.id_evento })), ...r.auditoria]);
    return evento;
  });
  after(() => notificarPublicacion(creado.id_evento));
}
