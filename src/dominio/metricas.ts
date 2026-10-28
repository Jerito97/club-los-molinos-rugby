// Métricas de desempeño del sistema (objetivo específico 5, RF 13): tiempo
// de publicación de los eventos, cantidad de correcciones y rechazos,
// alcance de las notificaciones y uso de la plataforma.

import { TIPOS_DEPORTIVOS, type EstadoEvento, type TipoEvento } from "./tipos";

export type EventoMetrica = {
  id_evento: number;
  tipo: TipoEvento;
  estado: EstadoEvento;
  creado_en: Date;
  validado_en: Date | null;
};

/**
 * Tiempo promedio, en segundos, entre la carga de un evento deportivo y su
 * publicación. Los eventos de control no se cuentan porque se publican al
 * momento, sin validación.
 */
export function tiempoPromedioPublicacion(eventos: readonly EventoMetrica[]): number | null {
  const tiempos = eventos
    .filter((e) => e.estado === "PUBLICADO" && e.validado_en && TIPOS_DEPORTIVOS.includes(e.tipo))
    .map((e) => (e.validado_en!.getTime() - e.creado_en.getTime()) / 1000);
  if (tiempos.length === 0) return null;
  return tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
}

/** Mediana, menos sensible a un evento validado mucho más tarde. */
export function tiempoMedianoPublicacion(eventos: readonly EventoMetrica[]): number | null {
  const t = eventos
    .filter((e) => e.estado === "PUBLICADO" && e.validado_en && TIPOS_DEPORTIVOS.includes(e.tipo))
    .map((e) => (e.validado_en!.getTime() - e.creado_en.getTime()) / 1000)
    .sort((a, b) => a - b);
  if (t.length === 0) return null;
  const medio = Math.floor(t.length / 2);
  return t.length % 2 ? t[medio] : (t[medio - 1] + t[medio]) / 2;
}

/** Alcance: notificaciones enviadas en total y en promedio por evento publicado. */
export function alcanceNotificaciones(enviadasPorEvento: ReadonlyMap<number, number>, eventosPublicados: number) {
  const total = [...enviadasPorEvento.values()].reduce((a, b) => a + b, 0);
  return { total, promedioPorEvento: eventosPublicados ? total / eventosPublicados : 0 };
}

/** Uso de la plataforma: dispositivos distintos y sesiones (visitas) al marcador. */
export function usoPlataforma(visitas: readonly { id_dispositivo: string }[]) {
  return { dispositivos: new Set(visitas.map((v) => v.id_dispositivo)).size, sesiones: visitas.length };
}
