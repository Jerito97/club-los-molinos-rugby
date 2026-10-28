// Lógica del partido: marcador, minuto a minuto y reloj de juego.
//
// Corresponde a las operaciones consultarMarcador() y actualizarMarcador()
// de la clase Partido. Todo se calcula a partir de los eventos PUBLICADOS:
// un evento en borrador, validado sin publicar o rechazado nunca modifica el
// marcador que ve el espectador (RF 6, RF 12).

import {
  MINUTOS_POR_TIEMPO,
  puntosDe,
  type Equipo,
  type EstadoEvento,
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
