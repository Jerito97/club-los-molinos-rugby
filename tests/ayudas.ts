import type { Actor } from "@/dominio/permisos";
import type { EventoGuardado, PartidoCarga } from "@/dominio/evento";
import { ROL } from "@/dominio/tipos";

export const colaborador: Actor = { id_usuario: 1, nombre: "Colaborador", rol: ROL.CARGADOR, activo: true, es_responsable_seguridad: false };
export const dirigente1: Actor = { id_usuario: 2, nombre: "Dirigente 1", rol: ROL.VALIDADOR, activo: true, es_responsable_seguridad: true };
export const dirigente2: Actor = { id_usuario: 3, nombre: "Dirigente 2", rol: ROL.VALIDADOR, activo: true, es_responsable_seguridad: false };
export const otroColaborador: Actor = { ...colaborador, id_usuario: 4, nombre: "Otro colaborador" };

export const partidoEnCurso: PartidoCarga = { id_partido: 10, estado: "EN_CURSO", id_usuario_cargador: colaborador.id_usuario };

export function evento(extra: Partial<EventoGuardado> = {}): EventoGuardado {
  return {
    id_evento: 100,
    id_partido: 10,
    tipo: "TRY",
    minuto: 12,
    equipo: "CLUB",
    id_jugador: 7,
    id_jugador_entra: null,
    estado: "BORRADOR",
    id_usuario_carga: colaborador.id_usuario,
    ...extra,
  };
}
