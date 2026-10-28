// Formato de fechas y horas en la zona horaria de Argentina.

const ZONA = "America/Argentina/Buenos_Aires";

const fmt = (opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, ...opciones });

const diaCorto = fmt({ weekday: "short", day: "numeric", month: "short" });
const diaLargo = fmt({ weekday: "long", day: "numeric", month: "long" });
const hora = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const fechaHora = fmt({ day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const fechaIso = fmt({ year: "numeric", month: "2-digit", day: "2-digit" });

/** "sáb, 12 sept" */
export function fechaCorta(d: Date | string): string {
  return diaCorto.format(new Date(d)).replace(".", "").replace(/ de /g, " ");
}

/** "sábado 12 de septiembre" */
export function fechaLarga(d: Date | string): string {
  return diaLargo.format(new Date(d)).replace(",", "");
}

/** "15:30" */
export function horaCorta(d: Date | string): string {
  return hora.format(new Date(d));
}

/** "12/09/2026 15:30:12" */
export function fechaYHora(d: Date | string): string {
  return fechaHora.format(new Date(d)).replace(",", "");
}

/** Día calendario en Argentina, como "2026-09-12" (para agrupar por día). */
export function diaArgentina(d: Date | string): string {
  const [{ value: dd }, , { value: mm }, , { value: aaaa }] = fechaIso.formatToParts(new Date(d));
  return `${aaaa}-${mm}-${dd}`;
}

/** Duración legible: "1 min 25 s". */
export function duracion(segundos: number): string {
  const s = Math.round(segundos);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const resto = s % 60;
  return resto ? `${m} min ${resto} s` : `${m} min`;
}

/** Duración compacta "1:25" (minutos:segundos). */
export function duracionCorta(segundos: number): string {
  const s = Math.round(segundos);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "24/10" */
export function diaMes(d: Date | string): string {
  const [, mm, dd] = diaArgentina(d).split("-");
  return `${dd}/${mm}`;
}
