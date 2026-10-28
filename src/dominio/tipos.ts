// Tipos y constantes del dominio, compartidos por el servidor, la interfaz
// y los tests. Este archivo no depende de la base de datos ni de Next.js.

export const TIPOS_EVENTO = [
  "TRY",
  "CONVERSION",
  "PENAL",
  "DROP",
  "TARJETA_AMARILLA",
  "TARJETA_ROJA",
  "CAMBIO",
  "INICIO_PARTIDO",
  "ENTRETIEMPO",
  "INICIO_SEGUNDO_TIEMPO",
  "FINAL_PARTIDO",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export type EstadoEvento = "BORRADOR" | "VALIDADO" | "PUBLICADO" | "RECHAZADO";
export type EstadoPartido = "PROGRAMADO" | "EN_CURSO" | "FINALIZADO";
export type Equipo = "CLUB" | "RIVAL";
export type Condicion = "LOCAL" | "VISITANTE";

/** Nombres de los roles, tal como figuran en la tabla `rol`. */
export const ROL = {
  CARGADOR: "Cargador",
  VALIDADOR: "Validador",
  ESPECTADOR: "Espectador",
} as const;
export type NombreRol = (typeof ROL)[keyof typeof ROL];

/** Eventos deportivos (RF 2): se cargan en borrador y pasan por validación. */
export const TIPOS_DEPORTIVOS: readonly TipoEvento[] = [
  "TRY",
  "CONVERSION",
  "PENAL",
  "DROP",
  "TARJETA_AMARILLA",
  "TARJETA_ROJA",
  "CAMBIO",
];

/**
 * Eventos de control del partido. No suman puntos ni involucran jugadores:
 * se publican directamente (con su registro de auditoría y su notificación)
 * para que el reloj y el tiempo de juego no dependan de una validación.
 */
export const TIPOS_CONTROL: readonly TipoEvento[] = [
  "INICIO_PARTIDO",
  "ENTRETIEMPO",
  "INICIO_SEGUNDO_TIEMPO",
  "FINAL_PARTIDO",
];

export function esEventoDeControl(tipo: TipoEvento): boolean {
  return TIPOS_CONTROL.includes(tipo);
}

/** Puntaje de cada tipo de evento (reglamento de rugby union). */
export const PUNTOS: Partial<Record<TipoEvento, number>> = {
  TRY: 5,
  CONVERSION: 2,
  PENAL: 3,
  DROP: 3,
};

export function puntosDe(tipo: TipoEvento): number {
  return PUNTOS[tipo] ?? 0;
}

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  TRY: "Try",
  CONVERSION: "Conversión",
  PENAL: "Penal",
  DROP: "Drop",
  TARJETA_AMARILLA: "Tarjeta amarilla",
  TARJETA_ROJA: "Tarjeta roja",
  CAMBIO: "Cambio",
  INICIO_PARTIDO: "Arranque del partido",
  ENTRETIEMPO: "Entretiempo",
  INICIO_SEGUNDO_TIEMPO: "Arranque del segundo tiempo",
  FINAL_PARTIDO: "Final del partido",
};

export const ETIQUETA_ESTADO: Record<EstadoEvento, string> = {
  BORRADOR: "Borrador",
  VALIDADO: "Validado",
  PUBLICADO: "Publicado",
  RECHAZADO: "Rechazado",
};

/** Duración reglamentaria de cada tiempo en Primera (minutos). */
export const MINUTOS_POR_TIEMPO = 40;

export const NOMBRE_CLUB = "Los Molinos";
export const TORNEO = "Primera C - Superior";
