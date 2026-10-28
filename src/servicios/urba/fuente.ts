// Interfaz de la fuente de datos de la URBA (RF 11).
//
// El job programado (Vercel Cron) no sabe de dónde vienen los datos: le pide
// a una FuenteURBA el fixture del club, la tabla de posiciones y los rivales,
// y actualizarDesdeURBA() los guarda en la base. Hay dos implementaciones:
//  - FuenteURBAMock: lee los archivos de data/urba (datos de ejemplo).
//  - FuenteURBAScraper: consulta el sitio oficial de la URBA.
// Se elige con la variable de entorno URBA_FUENTE ("mock" por defecto).

import type { Condicion } from "@/dominio/tipos";

export type PartidoURBA = {
  fecha_numero: number;
  /** Fecha y hora de comienzo, en formato ISO. */
  fecha: string;
  rival: string;
  condicion: Condicion;
  /** Resultado oficial desde el punto de vista del club, o null si no se jugó. */
  resultado: { club: number; rival: number } | null;
};

export type PosicionURBA = {
  puesto: number;
  equipo: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  dif: number;
  pts: number;
};

export type RivalURBA = { nombre: string };

export type DatosTorneo = { temporada: number; torneo: string };

export interface FuenteURBA {
  readonly nombre: string;
  obtenerTorneo(): Promise<DatosTorneo>;
  obtenerFixture(): Promise<PartidoURBA[]>;
  obtenerPosiciones(): Promise<PosicionURBA[]>;
  obtenerRivales(): Promise<RivalURBA[]>;
}

/** Normaliza un nombre de equipo para compararlo (sin tildes, espacios ni signos). */
export function normalizarEquipo(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}
