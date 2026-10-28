import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ETIQUETA_ACCION, type Accion } from "@/dominio/auditoria";
import { ETIQUETA_EVENTO, ETIQUETA_ESTADO, type EstadoEvento, type TipoEvento } from "@/dominio/tipos";

// Consulta del registro de auditoría (solo lectura) con filtros por partido,
// usuario y acción, y traducción de los valores a texto legible.

export const POR_PAGINA = 60;

export type FiltrosAuditoria = { partido?: number; usuario?: number; accion?: string; pagina?: number };

export async function consultarAuditoria(f: FiltrosAuditoria) {
  const where: Prisma.RegistroAuditoriaWhereInput = {};
  if (f.usuario) where.id_usuario = f.usuario;
  if (f.accion) where.accion = f.accion;
  if (f.partido) {
    where.OR = [
      { evento: { id_partido: f.partido } },
      { valor_nuevo: { path: ["id_partido"], equals: f.partido } },
      { valor_anterior: { path: ["id_partido"], equals: f.partido } },
    ];
  }
  const pagina = Math.max(1, f.pagina ?? 1);
  const [registros, total, jugadores, usuarios] = await Promise.all([
    prisma.registroAuditoria.findMany({
      where,
      include: { usuario: { select: { nombre: true } }, evento: { select: { tipo: true, minuto: true, id_partido: true } } },
      orderBy: [{ fecha_hora: "desc" }, { id_registro: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.registroAuditoria.count({ where }),
    prisma.jugador.findMany({ select: { id_jugador: true, nombre: true } }),
    prisma.usuario.findMany({ select: { id_usuario: true, nombre: true } }),
  ]);
  const nombreJugador = new Map(jugadores.map((j) => [j.id_jugador, j.nombre]));
  const nombreUsuario = new Map(usuarios.map((u) => [u.id_usuario, u.nombre]));

  return {
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    registros: registros.map((r) => ({
      id: r.id_registro,
      fecha_hora: r.fecha_hora.toISOString(),
      usuario: r.usuario?.nombre ?? "—",
      accion: ETIQUETA_ACCION[r.accion as Accion] ?? r.accion,
      evento: r.evento ? `${ETIQUETA_EVENTO[r.evento.tipo as TipoEvento]} · ${r.evento.minuto}'` : null,
      cambios: describirCambios(r.valor_anterior, r.valor_nuevo, nombreJugador, nombreUsuario),
      ip: r.ip,
    })),
  };
}

const CAMPOS: Record<string, string> = {
  tipo: "Tipo",
  minuto: "Minuto",
  equipo: "Equipo",
  estado: "Estado",
  id_jugador: "Jugador",
  id_jugador_entra: "Entra",
  id_usuario_cargador: "Cargador",
  resultado: "Resultado",
  titulares: "Titulares",
  pin_provisorio: "PIN provisorio",
  activo: "Activo",
  rol: "Rol",
  nombre: "Nombre",
  hasta: "Bloqueado hasta",
  intentos: "Intentos",
  error: "Error",
  eliminado: "Eliminado",
};

/** Convierte los valores anterior y nuevo en líneas "Campo: antes → después". */
function describirCambios(
  antes: Prisma.JsonValue,
  despues: Prisma.JsonValue,
  jugadores: Map<number, string>,
  usuarios: Map<number, string>
): { campo: string; antes: string | null; despues: string | null }[] {
  const a = (antes ?? {}) as Record<string, unknown>;
  const d = (despues ?? {}) as Record<string, unknown>;
  const texto = (k: string, v: unknown): string | null => {
    if (v === null || v === undefined) return k === "id_usuario_cargador" ? "sin asignar" : null;
    if (k === "id_jugador" || k === "id_jugador_entra") return jugadores.get(v as number) ?? `#${v}`;
    if (k === "id_usuario_cargador") return usuarios.get(v as number) ?? `#${v}`;
    if (k === "tipo") return ETIQUETA_EVENTO[v as TipoEvento] ?? String(v);
    if (k === "estado") return ETIQUETA_ESTADO[v as EstadoEvento] ?? String(v).toLowerCase().replace("_", " ");
    if (k === "equipo") return v === "CLUB" ? "Los Molinos" : "Rival";
    if (k === "titulares") return `${(v as unknown[]).length} jugadores`;
    if (typeof v === "boolean") return v ? "sí" : "no";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };
  const claves = [...new Set([...Object.keys(a), ...Object.keys(d)])].filter((k) => k !== "id_partido" && k in CAMPOS);
  // En una modificación se muestran solo los campos que cambiaron; en un alta, todos.
  const ambos = Object.keys(a).length > 0 && Object.keys(d).length > 0;
  return claves
    .filter((k) => !ambos || JSON.stringify(a[k]) !== JSON.stringify(d[k]))
    .map((k) => ({ campo: CAMPOS[k], antes: k in a ? texto(k, a[k]) : null, despues: k in d ? texto(k, d[k]) : null }))
    .filter((c) => c.antes !== null || c.despues !== null);
}
