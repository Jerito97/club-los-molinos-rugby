// Preferencias de notificación (RF 7, RF 9): clase PreferenciaNotificacion.
//
// En la base hay una preferencia por usuario y por tipo de evento. La
// pantalla de configuración agrupa algunos tipos en un mismo interruptor
// (por ejemplo, "Tries (con o sin conversión)" activa TRY y CONVERSION).

import { ETIQUETA_EVENTO, NOMBRE_CLUB, type Equipo, type TipoEvento } from "./tipos";

export type GrupoNotificacion = {
  clave: string;
  etiqueta: string;
  tipos: TipoEvento[];
};

export const GRUPOS_NOTIFICACION: GrupoNotificacion[] = [
  { clave: "inicio", etiqueta: "Arranque del partido", tipos: ["INICIO_PARTIDO"] },
  { clave: "entretiempo", etiqueta: "Entretiempo", tipos: ["ENTRETIEMPO"] },
  { clave: "segundo", etiqueta: "Arranque del segundo tiempo", tipos: ["INICIO_SEGUNDO_TIEMPO"] },
  { clave: "final", etiqueta: "Final del partido", tipos: ["FINAL_PARTIDO"] },
  { clave: "tries", etiqueta: "Tries (con o sin conversión)", tipos: ["TRY", "CONVERSION"] },
  { clave: "penales", etiqueta: "Penales", tipos: ["PENAL"] },
  { clave: "drops", etiqueta: "Drops", tipos: ["DROP"] },
  { clave: "tarjetas", etiqueta: "Tarjetas", tipos: ["TARJETA_AMARILLA", "TARJETA_ROJA"] },
  { clave: "cambios", etiqueta: "Cambios", tipos: ["CAMBIO"] },
];

/** Todos los tipos de evento que pueden notificarse. */
export const TIPOS_NOTIFICABLES: TipoEvento[] = GRUPOS_NOTIFICACION.flatMap((g) => g.tipos);

export type Preferencia = { id_usuario: number; tipo_evento: TipoEvento; activa: boolean };

/**
 * PreferenciaNotificacion.obtenerSuscriptos(tipoEvento): usuarios con la
 * preferencia activa para ese tipo. Recibe las preferencias ya cargadas para
 * poder probarse sin base de datos; el servicio hace la misma consulta en SQL.
 */
export function obtenerSuscriptos(preferencias: readonly Preferencia[], tipo: TipoEvento): number[] {
  return [...new Set(preferencias.filter((p) => p.tipo_evento === tipo && p.activa).map((p) => p.id_usuario))];
}

/** Arma el texto de la notificación push de un evento publicado. */
export function textoNotificacion(datos: {
  tipo: TipoEvento;
  minuto: number;
  equipo: Equipo;
  rival: string;
  jugador?: string | null;
  jugadorEntra?: string | null;
  marcador: { club: number; rival: number };
}): { titulo: string; cuerpo: string } {
  const { tipo, minuto, equipo, rival, jugador, jugadorEntra, marcador } = datos;
  const resultado = `${NOMBRE_CLUB} ${marcador.club} - ${marcador.rival} ${rival}`;
  const equipoNombre = equipo === "CLUB" ? NOMBRE_CLUB : rival;
  switch (tipo) {
    case "INICIO_PARTIDO":
      return { titulo: "¡Arrancó el partido!", cuerpo: `${NOMBRE_CLUB} vs ${rival}` };
    case "ENTRETIEMPO":
      return { titulo: "Entretiempo", cuerpo: resultado };
    case "INICIO_SEGUNDO_TIEMPO":
      return { titulo: "Arrancó el segundo tiempo", cuerpo: resultado };
    case "FINAL_PARTIDO":
      return { titulo: "Final del partido", cuerpo: resultado };
    case "CAMBIO":
      return {
        titulo: `${minuto}' Cambio · ${equipoNombre}`,
        cuerpo: `Sale ${jugador ?? "-"}, entra ${jugadorEntra ?? "-"}`,
      };
    default: {
      const quien = jugador ? ` de ${jugador}` : "";
      return { titulo: `${minuto}' ${ETIQUETA_EVENTO[tipo]}${quien} · ${equipoNombre}`, cuerpo: resultado };
    }
  }
}
