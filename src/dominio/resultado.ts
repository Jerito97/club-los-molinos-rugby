// Resultado de una operación del dominio: o se puede hacer (y trae lo que hay
// que guardar), o no (y trae el motivo para mostrarle al usuario).

/** permiso → 403, conflicto → 409 (estado que no lo permite), datos → 422 (dato faltante o inválido). */
export type MotivoRechazo = "permiso" | "conflicto" | "datos";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; motivo: MotivoRechazo; mensaje: string };

export const exito = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
export const rechazo = <T = never>(motivo: MotivoRechazo, mensaje: string): Resultado<T> => ({
  ok: false,
  motivo,
  mensaje,
});
