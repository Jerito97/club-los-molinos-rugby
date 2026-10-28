// Lógica del partido: marcador, minuto a minuto y reloj de juego.
//
// Corresponde a las operaciones consultarMarcador() y actualizarMarcador()
// de la clase Partido. Todo se calcula a partir de los eventos PUBLICADOS:
// un evento en borrador, validado sin publicar o rechazado nunca modifica el
// marcador que ve el espectador (RF 6, RF 12).

import { ACCION, registrar as registroAuditoria, type RegistroNuevo } from "./auditoria";
import type { EventoNuevo, PartidoCarga } from "./evento";
import { puede, type Actor } from "./permisos";
import { exito, rechazo, type Resultado } from "./resultado";
import {
  MINUTOS_POR_TIEMPO,
  TIPOS_CONTROL,
  puntosDe,
  type Equipo,
  type EstadoEvento,
  type EstadoPartido,
  type TipoEvento,
} from "./tipos";

/** Datos mínimos de un evento que necesita el cálculo del marcador. */
export type EventoMarcador = {
  id_evento: number;
  tipo: TipoEvento;
  minuto: number;
  equipo: Equipo;
  estado: EstadoEvento;
  creado_en: Date;
};

export type Marcador = { club: number; rival: number };

/** Orden cronológico de juego: por minuto y, a igual minuto, por orden de carga. */
export function ordenCronologico<T extends EventoMarcador>(a: T, b: T): number {
  if (a.minuto !== b.minuto) return a.minuto - b.minuto;
  const t = a.creado_en.getTime() - b.creado_en.getTime();
  return t !== 0 ? t : a.id_evento - b.id_evento;
}

/** Partido.consultarMarcador(): suma los puntos de los eventos publicados. */
export function consultarMarcador(eventos: readonly EventoMarcador[]): Marcador {
  const marcador: Marcador = { club: 0, rival: 0 };
  for (const e of eventos) {
    if (e.estado !== "PUBLICADO") continue;
    if (e.equipo === "CLUB") marcador.club += puntosDe(e.tipo);
    else marcador.rival += puntosDe(e.tipo);
  }
  return marcador;
}

/** Resultado en el formato que se guarda en `partido.resultado` ("club-rival"). */
export function formatearResultado(m: Marcador): string {
  return `${m.club}-${m.rival}`;
}

export function leerResultado(resultado: string | null | undefined): Marcador | null {
  if (!resultado) return null;
  const m = /^(\d+)-(\d+)$/.exec(resultado.trim());
  return m ? { club: Number(m[1]), rival: Number(m[2]) } : null;
}

export type LineaMinutoAMinuto<T extends EventoMarcador> = T & {
  /** Marcador parcial después de este evento; solo en los eventos que suman puntos. */
  parcial: Marcador | null;
};

/**
 * Minuto a minuto: los eventos publicados en orden cronológico, con el
 * marcador parcial a la derecha de cada evento que suma puntos. Se devuelve
 * del más reciente al más antiguo, como se muestra en pantalla.
 */
export function minutoAMinuto<T extends EventoMarcador>(eventos: readonly T[]): LineaMinutoAMinuto<T>[] {
  const publicados = eventos.filter((e) => e.estado === "PUBLICADO").sort(ordenCronologico);
  const parcial: Marcador = { club: 0, rival: 0 };
  const lineas = publicados.map((e) => {
    const puntos = puntosDe(e.tipo);
    if (puntos === 0) return { ...e, parcial: null };
    if (e.equipo === "CLUB") parcial.club += puntos;
    else parcial.rival += puntos;
    return { ...e, parcial: { ...parcial } };
  });
  return lineas.reverse();
}

// ---------------------------------------------------------------------------
// Reloj de juego
// ---------------------------------------------------------------------------

export type TiempoDeJuego = "PREVIA" | "PRIMER_TIEMPO" | "ENTRETIEMPO" | "SEGUNDO_TIEMPO" | "FINAL";

export const ETIQUETA_TIEMPO: Record<TiempoDeJuego, string> = {
  PREVIA: "Por comenzar",
  PRIMER_TIEMPO: "1er tiempo",
  ENTRETIEMPO: "Entretiempo",
  SEGUNDO_TIEMPO: "2do tiempo",
  FINAL: "Final",
};

/**
 * Estado del reloj. El cliente lo hace avanzar solo: segundos =
 * base_segundos + (ahora - corriendo_desde). Si corriendo_desde es nulo, el
 * reloj está detenido (previa, entretiempo o final).
 */
export type EstadoReloj = {
  tiempo: TiempoDeJuego;
  base_segundos: number;
  corriendo_desde: Date | null;
};

type EventoControl = { tipo: TipoEvento; estado: EstadoEvento; creado_en: Date };

/**
 * Calcula el reloj a partir de los eventos de control publicados (arranque,
 * entretiempo, segundo tiempo y final) y de `iniciado_en`.
 */
export function calcularReloj(iniciado_en: Date | null, eventos: readonly EventoControl[]): EstadoReloj {
  const momento = (tipo: TipoEvento) =>
    eventos.find((e) => e.tipo === tipo && e.estado === "PUBLICADO")?.creado_en ?? null;

  const inicio = iniciado_en ?? momento("INICIO_PARTIDO");
  const entretiempo = momento("ENTRETIEMPO");
  const inicio2 = momento("INICIO_SEGUNDO_TIEMPO");
  const final = momento("FINAL_PARTIDO");
  const segundosEntre = (a: Date, b: Date) => Math.max(0, Math.floor((b.getTime() - a.getTime()) / 1000));
  const primerTiempo = MINUTOS_POR_TIEMPO * 60;

  if (!inicio) return { tiempo: "PREVIA", base_segundos: 0, corriendo_desde: null };
  if (final) {
    const base = inicio2 ? primerTiempo + segundosEntre(inicio2, final) : segundosEntre(inicio, final);
    return { tiempo: "FINAL", base_segundos: base, corriendo_desde: null };
  }
  if (inicio2) return { tiempo: "SEGUNDO_TIEMPO", base_segundos: primerTiempo, corriendo_desde: inicio2 };
  if (entretiempo) return { tiempo: "ENTRETIEMPO", base_segundos: primerTiempo, corriendo_desde: null };
  return { tiempo: "PRIMER_TIEMPO", base_segundos: 0, corriendo_desde: inicio };
}

export function segundosDeJuego(reloj: EstadoReloj, ahora: Date): number {
  if (!reloj.corriendo_desde) return reloj.base_segundos;
  return reloj.base_segundos + Math.max(0, Math.floor((ahora.getTime() - reloj.corriendo_desde.getTime()) / 1000));
}

/** Formato mm:ss del reloj de juego. */
export function formatearReloj(segundos: number): string {
  const mm = Math.floor(segundos / 60).toString().padStart(2, "0");
  const ss = (segundos % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Minuto sugerido para un evento nuevo: el minuto en curso del reloj (a los
 * 70:15 de juego se sugiere el 71'). El colaborador puede editarlo.
 */
export function minutoSugerido(reloj: EstadoReloj, ahora: Date): number {
  if (reloj.tiempo === "PREVIA") return 1;
  if (reloj.tiempo === "ENTRETIEMPO") return MINUTOS_POR_TIEMPO;
  const segundos = segundosDeJuego(reloj, ahora);
  return Math.min(120, Math.max(1, Math.floor(segundos / 60) + 1));
}

// ---------------------------------------------------------------------------
// Operaciones de la clase Partido: iniciar, asignarCargador, finalizar
// ---------------------------------------------------------------------------

export const CANTIDAD_TITULARES = 15;

type CambiosPartido = {
  estado?: EstadoPartido;
  id_usuario_cargador?: number;
  iniciado_en?: Date;
};

/**
 * Partido.iniciar(): el colaborador inicia la carga en vivo de un partido
 * programado, con los quince titulares, y queda asignado como su único
 * cargador (Partido.asignarCargador(usuario)).
 */
export function iniciar(
  actor: Actor,
  partido: PartidoCarga,
  titulares: readonly number[],
  plantel: ReadonlySet<number>
): Resultado<{ cambios: CambiosPartido; titulares: number[]; auditoria: RegistroNuevo[] }> {
  if (!puede(actor, "cargar_eventos")) return rechazo("permiso", "No tenés permiso para cargar partidos.");
  if (partido.estado === "EN_CURSO") return rechazo("conflicto", "El partido ya está en curso y tiene un cargador asignado.");
  if (partido.estado !== "PROGRAMADO") return rechazo("conflicto", "El partido ya se jugó. Usá la opción para reabrirlo.");
  const unicos = [...new Set(titulares)];
  if (unicos.length !== CANTIDAD_TITULARES || titulares.length !== CANTIDAD_TITULARES) {
    return rechazo("datos", `Elegí los ${CANTIDAD_TITULARES} titulares.`);
  }
  if (unicos.some((id) => !plantel.has(id))) return rechazo("datos", "Hay titulares que no pertenecen al plantel.");

  const id = partido.id_partido;
  return exito({
    cambios: { estado: "EN_CURSO", id_usuario_cargador: actor.id_usuario },
    titulares: unicos,
    auditoria: [
      registroAuditoria(actor.id_usuario, ACCION.INICIO_CARGA, { id_partido: id, estado: partido.estado }, { id_partido: id, estado: "EN_CURSO" }),
      registroAuditoria(
        actor.id_usuario,
        ACCION.ASIGNACION_CARGADOR,
        { id_partido: id, id_usuario_cargador: partido.id_usuario_cargador },
        { id_partido: id, id_usuario_cargador: actor.id_usuario }
      ),
      registroAuditoria(actor.id_usuario, ACCION.TITULARES, null, { id_partido: id, titulares: unicos }),
    ],
  });
}

/**
 * Reasignación del cargador por parte de un dirigente (por ejemplo, porque
 * al colaborador se le terminó la batería). Queda en la auditoría.
 */
export function reasignarCargador(
  actor: Actor,
  partido: PartidoCarga,
  nuevo: Actor
): Resultado<{ cambios: CambiosPartido; auditoria: RegistroNuevo[] }> {
  if (!puede(actor, "reasignar_cargador")) return rechazo("permiso", "Solo un dirigente puede reasignar la carga.");
  if (partido.estado !== "EN_CURSO") return rechazo("conflicto", "Solo se reasigna la carga de un partido en curso.");
  if (!puede(nuevo, "cargar_eventos")) return rechazo("datos", "La persona elegida no puede cargar eventos.");
  if (partido.id_usuario_cargador === nuevo.id_usuario) return rechazo("datos", "Esa persona ya es la cargadora del partido.");
  const id = partido.id_partido;
  return exito({
    cambios: { id_usuario_cargador: nuevo.id_usuario },
    auditoria: [
      registroAuditoria(
        actor.id_usuario,
        ACCION.REASIGNACION_CARGADOR,
        { id_partido: id, id_usuario_cargador: partido.id_usuario_cargador },
        { id_partido: id, id_usuario_cargador: nuevo.id_usuario }
      ),
    ],
  });
}

/** Evento de control que corresponde cargar a continuación, o null si ya se cargaron todos. */
export function proximoControl(publicados: ReadonlySet<TipoEvento>): TipoEvento | null {
  return TIPOS_CONTROL.find((t) => !publicados.has(t)) ?? null;
}

/**
 * Registra un evento de control (arranque, entretiempo, segundo tiempo o
 * final). No suma puntos: se publica en el momento, sin validación, para que
 * el reloj y el tiempo de juego queden al día. El arranque fija `iniciado_en`
 * y el final ejecuta Partido.finalizar().
 */
export function registrarControl(
  actor: Actor,
  partido: PartidoCarga,
  tipo: TipoEvento,
  publicados: ReadonlySet<TipoEvento>,
  ahora: Date,
  minuto: number,
  marcador: Marcador
): Resultado<{ evento: EventoNuevo; cambios: CambiosPartido; auditoria: RegistroNuevo[] }> {
  if (!puede(actor, "cargar_eventos")) return rechazo("permiso", "No tenés permiso para cargar eventos.");
  if (partido.estado !== "EN_CURSO") return rechazo("conflicto", "El partido no está en curso.");
  if (partido.id_usuario_cargador !== actor.id_usuario) {
    return rechazo("permiso", "Este partido tiene otro cargador asignado. Solo esa persona puede cargar eventos.");
  }
  if (!TIPOS_CONTROL.includes(tipo)) return rechazo("datos", "No es un evento de control.");
  if (proximoControl(publicados) !== tipo) return rechazo("conflicto", "Ese momento del partido no corresponde ahora.");

  const minutoControl =
    tipo === "INICIO_PARTIDO" ? 0 : tipo === "FINAL_PARTIDO" ? Math.max(minuto, 2 * MINUTOS_POR_TIEMPO) : MINUTOS_POR_TIEMPO;
  const id = partido.id_partido;
  const datos = { tipo, minuto: minutoControl, equipo: "CLUB" as const, id_jugador: null, id_jugador_entra: null };
  const cambios: CambiosPartido = {};
  const auditoria: RegistroNuevo[] = [];
  if (tipo === "INICIO_PARTIDO") cambios.iniciado_en = ahora;
  if (tipo === "FINAL_PARTIDO") {
    const fin = finalizar(actor, partido, marcador);
    Object.assign(cambios, fin.cambios);
    auditoria.push(...fin.auditoria);
  }
  return exito({
    evento: {
      ...datos,
      estado: "PUBLICADO",
      auditoria: [registroAuditoria(actor.id_usuario, ACCION.PUBLICACION, null, { id_partido: id, ...datos, estado: "PUBLICADO" })],
    },
    cambios,
    auditoria,
  });
}

/** Partido.finalizar(): cierra la carga y deja el partido como jugado. */
export function finalizar(
  actor: Actor,
  partido: PartidoCarga,
  marcador: Marcador
): { cambios: CambiosPartido & { estado: "FINALIZADO" }; resultado: string; auditoria: RegistroNuevo[] } {
  const resultado = formatearResultado(marcador);
  return {
    cambios: { estado: "FINALIZADO" },
    resultado,
    auditoria: [
      registroAuditoria(
        actor.id_usuario,
        ACCION.FINALIZACION,
        { id_partido: partido.id_partido, estado: partido.estado },
        { id_partido: partido.id_partido, estado: "FINALIZADO", resultado }
      ),
    ],
  };
}

/**
 * Reabre un partido jugado para revisar o completar sus eventos (por
 * ejemplo, cargar lo anotado en papel si no hubo señal en la cancha). Puede
 * hacerlo un dirigente o quien fue su cargador; queda asignado como cargador.
 */
export function reabrir(actor: Actor, partido: PartidoCarga): Resultado<{ cambios: CambiosPartido; auditoria: RegistroNuevo[] }> {
  if (!puede(actor, "cargar_eventos")) return rechazo("permiso", "No tenés permiso para cargar partidos.");
  if (partido.estado !== "FINALIZADO") return rechazo("conflicto", "Solo se reabren partidos ya jugados.");
  const esCargador = partido.id_usuario_cargador === actor.id_usuario || partido.id_usuario_cargador === null;
  if (!esCargador && !puede(actor, "reasignar_cargador")) {
    return rechazo("permiso", "Solo un dirigente o quien cargó el partido puede reabrirlo.");
  }
  const id = partido.id_partido;
  const auditoria = [
    registroAuditoria(actor.id_usuario, ACCION.REAPERTURA, { id_partido: id, estado: "FINALIZADO" }, { id_partido: id, estado: "EN_CURSO" }),
  ];
  if (partido.id_usuario_cargador !== actor.id_usuario) {
    auditoria.push(
      registroAuditoria(
        actor.id_usuario,
        ACCION.ASIGNACION_CARGADOR,
        { id_partido: id, id_usuario_cargador: partido.id_usuario_cargador },
        { id_partido: id, id_usuario_cargador: actor.id_usuario }
      )
    );
  }
  return exito({ cambios: { estado: "EN_CURSO", id_usuario_cargador: actor.id_usuario }, auditoria });
}
