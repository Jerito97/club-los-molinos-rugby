// Gestión de usuarios por parte del responsable de seguridad: alta (con PIN
// provisorio), baja lógica, reactivación y blanqueo de PIN.

import { puede, type Actor } from "./permisos";
import { exito, rechazo, type Resultado } from "./resultado";
import { ROL, type NombreRol } from "./tipos";

export const ROLES_CON_PIN: NombreRol[] = [ROL.CARGADOR, ROL.VALIDADOR];

export function validarAlta(actor: Actor, nombre: string, rol: string): Resultado<{ nombre: string; rol: NombreRol }> {
  if (!puede(actor, "gestionar_usuarios")) return rechazo("permiso", "Solo el responsable de seguridad gestiona usuarios.");
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (limpio.length < 3 || limpio.length > 60) return rechazo("datos", "Ingresá el nombre de la persona (3 a 60 caracteres).");
  if (!ROLES_CON_PIN.includes(rol as NombreRol)) return rechazo("datos", "Elegí el rol: colaborador (carga) o dirigente (validación).");
  return exito({ nombre: limpio, rol: rol as NombreRol });
}

/** Verificaciones para dar de baja, reactivar o blanquear el PIN de otro usuario. */
export function validarGestion(
  actor: Actor,
  objetivo: { id_usuario: number; rol: string; activo: boolean },
  accion: "baja" | "reactivar" | "blanqueo"
): Resultado<true> {
  if (!puede(actor, "gestionar_usuarios")) return rechazo("permiso", "Solo el responsable de seguridad gestiona usuarios.");
  if (!ROLES_CON_PIN.includes(objetivo.rol as NombreRol)) return rechazo("datos", "Ese usuario no tiene PIN.");
  if (accion === "baja") {
    if (objetivo.id_usuario === actor.id_usuario) return rechazo("conflicto", "No podés darte de baja a vos mismo.");
    if (!objetivo.activo) return rechazo("conflicto", "El usuario ya está dado de baja.");
  }
  if (accion === "reactivar" && objetivo.activo) return rechazo("conflicto", "El usuario ya está activo.");
  if (accion === "blanqueo" && !objetivo.activo) return rechazo("conflicto", "Reactivá al usuario para generarle un PIN.");
  return exito(true);
}

/** Bloqueos repetidos en un mismo día: se avisa al responsable de seguridad. */
export const BLOQUEOS_PARA_AVISO = 2;
