import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerSesion } from "@/lib/sesion";
import { ErrorHttp } from "@/lib/http";
import { puede, type Actor, type Permiso } from "@/dominio/permisos";
import type { NombreRol } from "@/dominio/tipos";

export type UsuarioSesion = Actor & { pin_provisorio: boolean };

/** Usuario de la sesión vigente, leído de la base (rol y estado actuales). */
export async function usuarioActual(): Promise<UsuarioSesion | null> {
  const id = await leerSesion();
  if (!id) return null;
  const u = await prisma.usuario.findUnique({ where: { id_usuario: id }, include: { rol: true } });
  if (!u || !u.activo || !u.pin_hash) return null;
  return {
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    rol: u.rol.nombre as NombreRol,
    activo: u.activo,
    es_responsable_seguridad: u.es_responsable_seguridad,
    pin_provisorio: u.pin_provisorio,
  };
}

/**
 * Para API routes: exige una sesión vigente con el permiso indicado.
 * Sin sesión responde 401; sin permiso, 403.
 */
export async function exigirPermiso(permiso: Permiso): Promise<UsuarioSesion> {
  const actor = await usuarioActual();
  if (!actor) throw new ErrorHttp(401, "Tu sesión venció. Ingresá de nuevo con tu PIN.");
  if (actor.pin_provisorio) throw new ErrorHttp(403, "Tenés que cambiar tu PIN provisorio antes de continuar.");
  if (!puede(actor, permiso)) throw new ErrorHttp(403, "No tenés permiso para hacer esta operación.");
  return actor;
}

/**
 * Para páginas de gestión: sin sesión lleva al acceso con PIN, con PIN
 * provisorio lleva al cambio de PIN y sin permiso lleva al inicio de gestión.
 */
export async function usuarioDePagina(permiso?: Permiso): Promise<UsuarioSesion> {
  const actor = await usuarioActual();
  if (!actor) redirect("/acceso");
  if (actor.pin_provisorio) redirect("/acceso/cambiar-pin");
  if (permiso && !puede(actor, permiso)) redirect("/gestion");
  return actor;
}
