// Perfiles de usuario y permisos (Tabla 13 del documento).
//
// Los permisos se verifican en el servidor en cada operación, además de
// ocultar en pantalla los botones que el usuario no puede usar.

import { ROL, type NombreRol } from "./tipos";

/** Usuario que realiza una operación. */
export type Actor = {
  id_usuario: number;
  nombre: string;
  rol: NombreRol;
  activo: boolean;
  es_responsable_seguridad: boolean;
};

export type Permiso =
  | "ver_marcador"
  | "consultar_estadisticas"
  | "configurar_notificaciones"
  | "cargar_eventos"
  | "corregir_eventos_propios"
  | "validar_eventos"
  | "consultar_auditoria"
  | "consultar_metricas"
  | "reasignar_cargador"
  | "gestionar_usuarios"
  | "reiniciar_datos";

const PERMISOS_POR_ROL: Record<NombreRol, readonly Permiso[]> = {
  [ROL.ESPECTADOR]: ["ver_marcador", "consultar_estadisticas", "configurar_notificaciones"],
  [ROL.CARGADOR]: [
    "ver_marcador",
    "consultar_estadisticas",
    "configurar_notificaciones",
    "cargar_eventos",
    "corregir_eventos_propios",
  ],
  [ROL.VALIDADOR]: [
    "ver_marcador",
    "consultar_estadisticas",
    "configurar_notificaciones",
    "cargar_eventos",
    "corregir_eventos_propios",
    "validar_eventos",
    "consultar_auditoria",
    "consultar_metricas",
    "reasignar_cargador",
    "reiniciar_datos",
  ],
};

/** true si el actor tiene el permiso. Un usuario dado de baja no tiene ninguno. */
export function puede(actor: Actor | null, permiso: Permiso): boolean {
  if (!actor || !actor.activo) return false;
  // Alta, baja y blanqueo de PIN: solo el dirigente designado como responsable de seguridad.
  if (permiso === "gestionar_usuarios") return actor.rol === ROL.VALIDADOR && actor.es_responsable_seguridad;
  return PERMISOS_POR_ROL[actor.rol].includes(permiso);
}
