// Registro de auditoría (RF 8): clase RegistroAuditoria del diagrama de clases.
//
// Las operaciones del dominio no escriben en la base: devuelven, junto con
// los cambios a aplicar, los registros de auditoría que corresponden. El
// servicio los guarda en la misma transacción que el cambio, de modo que no
// puede existir una modificación sin su registro.

/** Acciones registradas en la auditoría. */
export const ACCION = {
  // Eventos
  ALTA: "alta",
  CORRECCION: "correccion",
  ELIMINACION: "eliminacion",
  VALIDACION: "validacion",
  RECHAZO: "rechazo",
  PUBLICACION: "publicacion",
  // Partidos
  INICIO_CARGA: "inicio_carga",
  ASIGNACION_CARGADOR: "asignacion_cargador",
  REASIGNACION_CARGADOR: "reasignacion_cargador",
  TITULARES: "titulares",
  FINALIZACION: "finalizacion",
  REAPERTURA: "reapertura",
  // Acceso
  INGRESO: "ingreso",
  INGRESO_FALLIDO: "ingreso_fallido",
  BLOQUEO_DISPOSITIVO: "bloqueo_dispositivo",
  DESBLOQUEO_DISPOSITIVO: "desbloqueo_dispositivo",
  CIERRE_SESION: "cierre_sesion",
  CAMBIO_PIN: "cambio_pin",
  BLANQUEO_PIN: "blanqueo_pin",
  ALTA_USUARIO: "alta_usuario",
  BAJA_USUARIO: "baja_usuario",
  // Sistema
  ACTUALIZACION_URBA: "actualizacion_urba",
  ACTUALIZACION_URBA_FALLIDA: "actualizacion_urba_fallida",
  REINICIO_DEMO: "reinicio_demo",
} as const;
export type Accion = (typeof ACCION)[keyof typeof ACCION];

export const ETIQUETA_ACCION: Record<Accion, string> = {
  alta: "Alta de evento",
  correccion: "Corrección",
  eliminacion: "Eliminación",
  validacion: "Validación",
  rechazo: "Rechazo",
  publicacion: "Publicación",
  inicio_carga: "Inicio de la carga en vivo",
  asignacion_cargador: "Asignación de cargador",
  reasignacion_cargador: "Reasignación de cargador",
  titulares: "Titulares",
  finalizacion: "Partido finalizado",
  reapertura: "Reapertura",
  ingreso: "Ingreso",
  ingreso_fallido: "Ingreso fallido",
  bloqueo_dispositivo: "Bloqueo de dispositivo",
  desbloqueo_dispositivo: "Desbloqueo de dispositivo",
  cierre_sesion: "Cierre de sesión",
  cambio_pin: "Cambio de PIN",
  blanqueo_pin: "Blanqueo de PIN",
  alta_usuario: "Alta de usuario",
  baja_usuario: "Baja de usuario",
  actualizacion_urba: "Actualización desde URBA",
  actualizacion_urba_fallida: "Actualización desde URBA fallida",
  reinicio_demo: "Reinicio de datos",
};

/** Valor JSON serializable que se guarda como valor anterior o nuevo. */
export type ValorAuditoria = Record<string, unknown> | null;

/** Registro de auditoría a insertar. */
export type RegistroNuevo = {
  accion: Accion;
  id_usuario: number | null;
  id_evento?: number | null;
  valor_anterior?: ValorAuditoria;
  valor_nuevo?: ValorAuditoria;
  ip?: string | null;
  id_dispositivo?: string | null;
  /** Momento de la acción. Por defecto, el momento en que se inserta. */
  fecha_hora?: Date;
};

/** RegistroAuditoria.registrar(usuario, accion, valorAnterior, valorNuevo). */
export function registrar(
  id_usuario: number | null,
  accion: Accion,
  valor_anterior: ValorAuditoria = null,
  valor_nuevo: ValorAuditoria = null,
  extra: Pick<RegistroNuevo, "id_evento" | "ip" | "id_dispositivo"> = {}
): RegistroNuevo {
  return { id_usuario, accion, valor_anterior, valor_nuevo, ...extra };
}
