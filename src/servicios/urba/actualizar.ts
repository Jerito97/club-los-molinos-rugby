import type { DB } from "@/lib/prisma";
import { ACCION } from "@/dominio/auditoria";
import { formatearResultado } from "@/dominio/partido";
import { guardarAuditoria } from "@/servicios/auditoria";
import { normalizarEquipo, type FuenteURBA } from "./fuente";
import { FuenteURBAMock } from "./mock";
import { FuenteURBAScraper } from "./scraper";

/** Devuelve la fuente configurada con la variable URBA_FUENTE ("mock" por defecto). */
export function fuenteConfigurada(): FuenteURBA {
  if (process.env.URBA_FUENTE === "scraper") {
    const id = Number(process.env.URBA_ID_TORNEO);
    if (!id) throw new Error("Para usar URBA_FUENTE=scraper hay que definir URBA_ID_TORNEO.");
    return new FuenteURBAScraper(id);
  }
  return new FuenteURBAMock();
}

export type ResumenActualizacion = {
  fuente: string;
  rivales: number;
  partidosNuevos: number;
  partidosActualizados: number;
  posiciones: number;
};

/**
 * Rival.actualizarDesdeURBA(): incorpora el fixture, los resultados
 * oficiales, la tabla de posiciones y los rivales publicados por la URBA.
 *
 * Reglas:
 * - Los rivales y los partidos se crean si no existen (upsert).
 * - Un partido en curso no se toca.
 * - El resultado oficial solo se copia en los partidos que no tienen eventos
 *   publicados en la aplicación: si el partido se cargó en vivo, manda el
 *   marcador validado por el club.
 * - Si la fuente no devuelve datos se lanza un error (plan de contingencia
 *   del riesgo R3: detectar que el scraping dejó de funcionar).
 */
export async function actualizarDesdeURBA(
  db: DB,
  fuente: FuenteURBA = fuenteConfigurada()
): Promise<ResumenActualizacion> {
  const [{ temporada, torneo }, fixture, posiciones, rivales] = await Promise.all([
    fuente.obtenerTorneo(),
    fuente.obtenerFixture(),
    fuente.obtenerPosiciones(),
    fuente.obtenerRivales(),
  ]);
  if (fixture.length === 0 || posiciones.length === 0) {
    throw new Error(`La fuente "${fuente.nombre}" no devolvió fixture o posiciones.`);
  }

  // Rivales, con su posición actual en la tabla.
  const puestoPorEquipo = new Map(posiciones.map((p) => [normalizarEquipo(p.equipo), p.puesto]));
  const nombres = new Set([...rivales.map((r) => r.nombre), ...fixture.map((p) => p.rival)]);
  const idRival = new Map<string, number>();
  for (const nombre of nombres) {
    const posicion_tabla = puestoPorEquipo.get(normalizarEquipo(nombre)) ?? null;
    const rival = await db.rival.upsert({
      where: { nombre },
      create: { nombre, posicion_tabla },
      update: { posicion_tabla },
    });
    idRival.set(nombre, rival.id_rival);
  }

  // Fixture y resultados.
  let partidosNuevos = 0;
  let partidosActualizados = 0;
  for (const p of fixture) {
    const clave = { torneo, temporada, fecha_numero: p.fecha_numero };
    const existente = await db.partido.findUnique({
      where: { torneo_temporada_fecha_numero: clave },
      include: { _count: { select: { eventos: { where: { estado: "PUBLICADO" } } } } },
    });
    const resultado = p.resultado ? formatearResultado(p.resultado) : null;
    if (!existente) {
      await db.partido.create({
        data: {
          ...clave,
          fecha: new Date(p.fecha),
          id_rival: idRival.get(p.rival)!,
          condicion: p.condicion,
          resultado,
          estado: resultado ? "FINALIZADO" : "PROGRAMADO",
        },
      });
      partidosNuevos++;
      continue;
    }
    if (existente.estado === "EN_CURSO") continue;

    const cambios: { fecha?: Date; id_rival?: number; condicion?: typeof p.condicion; resultado?: string; estado?: "FINALIZADO" } = {};
    if (existente.estado === "PROGRAMADO") {
      if (existente.fecha.getTime() !== new Date(p.fecha).getTime()) cambios.fecha = new Date(p.fecha);
      if (existente.id_rival !== idRival.get(p.rival)) cambios.id_rival = idRival.get(p.rival);
      if (existente.condicion !== p.condicion) cambios.condicion = p.condicion;
    }
    const cargadoEnVivo = existente._count.eventos > 0;
    if (resultado && !cargadoEnVivo && existente.resultado !== resultado) {
      cambios.resultado = resultado;
      cambios.estado = "FINALIZADO";
    }
    if (Object.keys(cambios).length > 0) {
      await db.partido.update({ where: { id_partido: existente.id_partido }, data: cambios });
      partidosActualizados++;
    }
  }

  // Tabla de posiciones: se reemplaza completa en cada actualización.
  await db.posicion.deleteMany({ where: { temporada, torneo } });
  await db.posicion.createMany({ data: posiciones.map((p) => ({ ...p, temporada, torneo })) });

  const resumen = {
    fuente: fuente.nombre,
    rivales: nombres.size,
    partidosNuevos,
    partidosActualizados,
    posiciones: posiciones.length,
  };
  await guardarAuditoria(db, { accion: ACCION.ACTUALIZACION_URBA, id_usuario: null, valor_nuevo: resumen });
  return resumen;
}
