import type { DB } from "@/lib/prisma";
import type { Actor } from "@/dominio/permisos";
import type { NombreRol } from "@/dominio/tipos";

/** Carga un usuario como Actor del dominio (rol y estado actuales). */
export async function cargarActor(db: DB, id_usuario: number): Promise<Actor | null> {
  const u = await db.usuario.findUnique({ where: { id_usuario }, include: { rol: true } });
  if (!u) return null;
  return {
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    rol: u.rol.nombre as NombreRol,
    activo: u.activo,
    es_responsable_seguridad: u.es_responsable_seguridad,
  };
}
