import "server-only";
import { prisma } from "@/lib/prisma";
import {
  calcularReloj,
  consultarMarcador,
  leerResultado,
  minutoAMinuto,
  proximoControl,
  type EstadoReloj,
  type Marcador,
} from "@/dominio/partido";
import { NOMBRE_CLUB, ROL, type Condicion, type Equipo, type EstadoEvento, type EstadoPartido, type TipoEvento } from "@/dominio/tipos";

// Consultas de lectura para las pantallas. Devuelven datos planos y
// serializables (fechas como texto ISO) para pasarlos a componentes cliente.

export type RelojJson = { tiempo: EstadoReloj["tiempo"]; base_segundos: number; corriendo_desde: string | null };

const relojJson = (r: EstadoReloj): RelojJson => ({ ...r, corriendo_desde: r.corriendo_desde?.toISOString() ?? null });

/** Nombres de local y visitante según la condición del club. */
export function equipos(rival: string, condicion: Condicion) {
  return condicion === "LOCAL" ? { local: NOMBRE_CLUB, visitante: rival } : { local: rival, visitante: NOMBRE_CLUB };
}

/** Marcador ordenado como local - visitante. */
export function marcadorLocalVisitante(m: Marcador, condicion: Condicion) {
  return condicion === "LOCAL" ? { local: m.club, visitante: m.rival } : { local: m.rival, visitante: m.club };
}

const conJugadores = {
  jugador: { select: { nombre: true, nro_camiseta: true } },
  jugador_entra: { select: { nombre: true, nro_camiseta: true } },
} as const;

export type LineaEvento = {
  id_evento: number;
  tipo: TipoEvento;
  minuto: number;
  equipo: Equipo;
  estado: EstadoEvento;
  jugador: string | null;
  jugador_entra: string | null;
  parcial: Marcador | null;
};

/**
 * Partido.consultarMarcador() para el espectador: marcador, reloj y minuto a
 * minuto, calculados solo con los eventos PUBLICADOS.
 */
export async function vistaMarcador(id_partido: number) {
  const p = await prisma.partido.findUnique({
    where: { id_partido },
    include: {
      rival: true,
      eventos: { where: { estado: "PUBLICADO", eliminado_en: null }, include: conJugadores },
      titulares: { include: { jugador: true }, orderBy: { jugador: { nro_camiseta: "asc" } } },
    },
  });
  if (!p) return null;
  const publicados = p.eventos;
  const cargadoEnVivo = publicados.length > 0;
  // Los partidos anteriores a la puesta en marcha solo tienen el resultado oficial de la URBA.
  const marcador = cargadoEnVivo ? consultarMarcador(publicados) : (leerResultado(p.resultado) ?? { club: 0, rival: 0 });
  const lineas: LineaEvento[] = minutoAMinuto(publicados).map((e) => ({
    id_evento: e.id_evento,
    tipo: e.tipo,
    minuto: e.minuto,
    equipo: e.equipo,
    estado: e.estado,
    jugador: e.jugador?.nombre ?? null,
    jugador_entra: e.jugador_entra?.nombre ?? null,
    parcial: e.parcial,
  }));
  const entraron = publicados
    .filter((e) => e.tipo === "CAMBIO" && e.jugador_entra)
    .map((e) => ({ nombre: e.jugador_entra!.nombre, nro_camiseta: e.jugador_entra!.nro_camiseta, minuto: e.minuto }));
  return {
    id_partido: p.id_partido,
    fecha: p.fecha.toISOString(),
    torneo: p.torneo,
    fecha_numero: p.fecha_numero,
    estado: p.estado as EstadoPartido,
    condicion: p.condicion as Condicion,
    rival: p.rival.nombre,
    ...equipos(p.rival.nombre, p.condicion),
    marcador,
    cargadoEnVivo,
    reloj: relojJson(calcularReloj(p.iniciado_en, publicados)),
    lineas,
    titulares: p.titulares.map((t) => ({ nombre: t.jugador.nombre, nro_camiseta: t.jugador.nro_camiseta })),
    entraron,
  };
}
export type VistaMarcador = NonNullable<Awaited<ReturnType<typeof vistaMarcador>>>;

/** Partido.listarDisponibles(): partidos de la temporada para la gestión. */
export async function partidosParaGestion() {
  const partidos = await prisma.partido.findMany({
    orderBy: { fecha: "asc" },
    include: {
      rival: true,
      cargador: { select: { nombre: true } },
      _count: { select: { eventos: { where: { estado: "BORRADOR", eliminado_en: null } } } },
    },
  });
  return partidos.map((p) => ({
    id_partido: p.id_partido,
    fecha: p.fecha.toISOString(),
    fecha_numero: p.fecha_numero,
    torneo: p.torneo,
    estado: p.estado as EstadoPartido,
    condicion: p.condicion as Condicion,
    rival: p.rival.nombre,
    ...equipos(p.rival.nombre, p.condicion),
    resultado: leerResultado(p.resultado),
    id_usuario_cargador: p.id_usuario_cargador,
    cargador: p.cargador?.nombre ?? null,
    pendientes: p._count.eventos,
  }));
}

/** Plantel ordenado por número de camiseta. */
export function plantel() {
  return prisma.jugador.findMany({ orderBy: { nro_camiseta: "asc" } });
}

/** Datos de la pantalla de carga en vivo. */
export async function datosCarga(id_partido: number) {
  const p = await prisma.partido.findUnique({
    where: { id_partido },
    include: {
      rival: true,
      cargador: { select: { id_usuario: true, nombre: true } },
      titulares: true,
      eventos: {
        where: { eliminado_en: null },
        include: { ...conJugadores, usuario_carga: { select: { nombre: true } } },
        orderBy: [{ creado_en: "desc" }],
      },
    },
  });
  if (!p) return null;
  const publicados = p.eventos.filter((e) => e.estado === "PUBLICADO");
  const controles = new Set(publicados.map((e) => e.tipo));
  // Jugadores en cancha: titulares más los cambios cargados que no fueron rechazados.
  const enCancha = new Set(p.titulares.map((t) => t.id_jugador));
  const cambios = p.eventos
    .filter((e) => e.tipo === "CAMBIO" && e.estado !== "RECHAZADO")
    .sort((a, b) => a.minuto - b.minuto || a.creado_en.getTime() - b.creado_en.getTime());
  for (const c of cambios) {
    if (c.id_jugador) enCancha.delete(c.id_jugador);
    if (c.id_jugador_entra) enCancha.add(c.id_jugador_entra);
  }
  return {
    id_partido: p.id_partido,
    fecha: p.fecha.toISOString(),
    estado: p.estado as EstadoPartido,
    condicion: p.condicion as Condicion,
    rival: p.rival.nombre,
    ...equipos(p.rival.nombre, p.condicion),
    cargador: p.cargador,
    marcador: consultarMarcador(publicados),
    reloj: relojJson(calcularReloj(p.iniciado_en, publicados)),
    proximoControl: proximoControl(controles),
    titulares: p.titulares.map((t) => t.id_jugador),
    enCancha: [...enCancha],
    eventos: p.eventos
      .filter((e) => !["INICIO_PARTIDO", "ENTRETIEMPO", "INICIO_SEGUNDO_TIEMPO", "FINAL_PARTIDO"].includes(e.tipo))
      .map((e) => ({
        id_evento: e.id_evento,
        tipo: e.tipo as TipoEvento,
        minuto: e.minuto,
        equipo: e.equipo as Equipo,
        estado: e.estado as EstadoEvento,
        id_jugador: e.id_jugador,
        id_jugador_entra: e.id_jugador_entra,
        jugador: e.jugador?.nombre ?? null,
        jugador_entra: e.jugador_entra?.nombre ?? null,
        id_usuario_carga: e.id_usuario_carga,
        cargo: e.usuario_carga.nombre,
      })),
  };
}
export type DatosCarga = NonNullable<Awaited<ReturnType<typeof datosCarga>>>;

/** Eventos en borrador de un partido, para el panel de validación. */
export async function pendientesDeValidacion(id_partido: number) {
  const eventos = await prisma.evento.findMany({
    where: { id_partido, estado: "BORRADOR", eliminado_en: null },
    include: { ...conJugadores, usuario_carga: { select: { id_usuario: true, nombre: true } } },
    orderBy: [{ creado_en: "asc" }],
  });
  return eventos.map((e) => ({
    id_evento: e.id_evento,
    tipo: e.tipo as TipoEvento,
    minuto: e.minuto,
    equipo: e.equipo as Equipo,
    jugador: e.jugador?.nombre ?? null,
    jugador_entra: e.jugador_entra?.nombre ?? null,
    id_usuario_carga: e.usuario_carga.id_usuario,
    cargo: e.usuario_carga.nombre,
    creado_en: e.creado_en.toISOString(),
  }));
}
export type Pendiente = Awaited<ReturnType<typeof pendientesDeValidacion>>[number];

/** Personas habilitadas para cargar (para reasignar el cargador). */
export function habilitadosParaCargar() {
  return prisma.usuario.findMany({
    where: { activo: true, pin_hash: { not: null }, rol: { nombre: { in: [ROL.CARGADOR, ROL.VALIDADOR] } } },
    select: { id_usuario: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}

/** Partido resumido para las listas públicas. */
function resumen(p: {
  id_partido: number;
  fecha: Date;
  fecha_numero: number;
  estado: EstadoPartido;
  condicion: Condicion;
  resultado: string | null;
  rival: { nombre: string };
}) {
  return {
    id_partido: p.id_partido,
    fecha: p.fecha.toISOString(),
    fecha_numero: p.fecha_numero,
    estado: p.estado,
    condicion: p.condicion,
    rival: p.rival.nombre,
    ...equipos(p.rival.nombre, p.condicion),
    resultado: leerResultado(p.resultado),
  };
}
export type ResumenPartido = ReturnType<typeof resumen>;

/** Todos los partidos de la temporada, para las pantallas del espectador. */
export async function partidosPublicos() {
  const partidos = await prisma.partido.findMany({ include: { rival: true }, orderBy: { fecha: "asc" } });
  return partidos.map(resumen);
}

/** Tabla de posiciones de la temporada más reciente. */
export async function posiciones() {
  const ultima = await prisma.posicion.findFirst({ orderBy: { temporada: "desc" }, select: { temporada: true } });
  if (!ultima) return [];
  return prisma.posicion.findMany({ where: { temporada: ultima.temporada }, orderBy: { puesto: "asc" } });
}

/** Datos de la pantalla de inicio: partido en vivo, último resultado, próximo partido y posiciones. */
export async function inicio() {
  const [partidos, tabla] = await Promise.all([partidosPublicos(), posiciones()]);
  return {
    enVivo: partidos.filter((p) => p.estado === "EN_CURSO"),
    ultimo: partidos.filter((p) => p.estado === "FINALIZADO").at(-1) ?? null,
    proximo: partidos.find((p) => p.estado === "PROGRAMADO") ?? null,
    posiciones: tabla,
  };
}
