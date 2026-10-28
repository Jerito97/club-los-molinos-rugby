// Ciclo de vida de un evento: clase Evento del diagrama de clases.
//
//   registrar() → BORRADOR ──validar()──→ VALIDADO ──publicar()──→ PUBLICADO
//                    │  ▲
//          rechazar()│  │corregir()
//                    ▼  │
//                  RECHAZADO
//
// Las funciones de este archivo no acceden a la base: reciben el estado
// actual, verifican las reglas de negocio y devuelven los cambios a guardar
// junto con los registros de auditoría correspondientes. Así las reglas se
// pueden probar sin base de datos, y el servicio (src/servicios/eventos.ts)
// solo se ocupa de persistir todo en una transacción.

import { ACCION, registrar as registroAuditoria, type RegistroNuevo } from "./auditoria";
import { puede, type Actor } from "./permisos";
import { exito, rechazo, type Resultado } from "./resultado";
import {
  ETIQUETA_EVENTO,
  TIPOS_DEPORTIVOS,
  esEventoDeControl,
  type Equipo,
  type EstadoEvento,
  type EstadoPartido,
  type TipoEvento,
} from "./tipos";

export const MINUTO_MAXIMO = 120;

/** Datos que carga el colaborador. */
export type DatosEvento = {
  tipo: TipoEvento;
  minuto: number;
  equipo: Equipo;
  id_jugador: number | null;
  id_jugador_entra: number | null;
};

/** Estado actual de un evento guardado. */
export type EventoGuardado = DatosEvento & {
  id_evento: number;
  id_partido: number;
  estado: EstadoEvento;
  id_usuario_carga: number;
};

/** Estado del partido que importa para la carga. */
export type PartidoCarga = {
  id_partido: number;
  estado: EstadoPartido;
  id_usuario_cargador: number | null;
};

/** Evento nuevo a insertar. La auditoría se completa con su id al guardarlo. */
export type EventoNuevo = DatosEvento & { estado: EstadoEvento; auditoria: RegistroNuevo[] };

/** Datos del evento que se guardan como valor anterior/nuevo en la auditoría. */
export function instantanea(e: DatosEvento & { id_partido: number; estado?: EstadoEvento }) {
  return {
    id_partido: e.id_partido,
    tipo: e.tipo,
    minuto: e.minuto,
    equipo: e.equipo,
    id_jugador: e.id_jugador,
    id_jugador_entra: e.id_jugador_entra,
    ...(e.estado ? { estado: e.estado } : {}),
  };
}

/**
 * Verifica que los datos de un evento deportivo estén completos (curso
 * alternativo de "Cargar evento deportivo": si falta un dato obligatorio se
 * muestra un aviso y no se continúa).
 */
export function validarDatos(d: DatosEvento): string | null {
  if (!TIPOS_DEPORTIVOS.includes(d.tipo)) return "El tipo de evento no es válido.";
  if (d.equipo !== "CLUB" && d.equipo !== "RIVAL") return "Indicá el equipo.";
  if (!Number.isInteger(d.minuto) || d.minuto < 1 || d.minuto > MINUTO_MAXIMO) {
    return `El minuto tiene que estar entre 1 y ${MINUTO_MAXIMO}.`;
  }
  if (d.tipo === "CAMBIO") {
    if (d.equipo !== "CLUB") return "Los cambios se cargan solo para el club.";
    if (!d.id_jugador || !d.id_jugador_entra) return "Elegí el jugador que sale y el que entra.";
    if (d.id_jugador === d.id_jugador_entra) return "El jugador que sale y el que entra no pueden ser el mismo.";
    return null;
  }
  if (d.id_jugador_entra) return "Solo los cambios llevan jugador que entra.";
  if (d.equipo === "CLUB" && !d.id_jugador) return "Elegí el jugador.";
  if (d.equipo === "RIVAL" && d.id_jugador) return "Los eventos del rival no llevan jugador del plantel.";
  return null;
}

/** Regla del único cargador: solo el cargador asignado carga mientras el partido está en curso. */
function verificarCargador(actor: Actor, partido: PartidoCarga): Resultado<true> {
  if (!puede(actor, "cargar_eventos")) return rechazo("permiso", "No tenés permiso para cargar eventos.");
  if (partido.estado !== "EN_CURSO") return rechazo("conflicto", "El partido no está en curso.");
  if (partido.id_usuario_cargador !== actor.id_usuario) {
    return rechazo("permiso", "Este partido tiene otro cargador asignado. Solo esa persona puede cargar eventos.");
  }
  return exito(true);
}

/**
 * Evento.registrar(tipo, jugador, minuto): crea el evento en BORRADOR.
 * Con `conConversion` (botón "Try y Conversión") crea dos eventos en
 * borrador: el try y la conversión, en el mismo minuto.
 */
export function registrar(
  actor: Actor,
  partido: PartidoCarga,
  datos: DatosEvento,
  opciones: { conConversion?: boolean; id_jugador_conversion?: number | null } = {}
): Resultado<EventoNuevo[]> {
  const permitido = verificarCargador(actor, partido);
  if (!permitido.ok) return permitido;
  if (esEventoDeControl(datos.tipo)) return rechazo("datos", "Los eventos de control se cargan con sus propios botones.");
  const error = validarDatos(datos);
  if (error) return rechazo("datos", error);

  const lista: DatosEvento[] = [datos];
  if (opciones.conConversion) {
    if (datos.tipo !== "TRY") return rechazo("datos", "La conversión solo acompaña a un try.");
    const conversion: DatosEvento = {
      tipo: "CONVERSION",
      minuto: datos.minuto,
      equipo: datos.equipo,
      id_jugador: datos.equipo === "CLUB" ? (opciones.id_jugador_conversion ?? null) : null,
      id_jugador_entra: null,
    };
    const errorConversion = validarDatos(conversion);
    if (errorConversion) return rechazo("datos", "Elegí el jugador que pateó la conversión.");
    lista.push(conversion);
  }

  return exito(
    lista.map((d) => ({
      ...d,
      estado: "BORRADOR" as const,
      auditoria: [
        registroAuditoria(actor.id_usuario, ACCION.ALTA, null, instantanea({ ...d, id_partido: partido.id_partido, estado: "BORRADOR" })),
      ],
    }))
  );
}

/** Verificaciones comunes a corregir y eliminar: evento propio y todavía no validado. */
function verificarEdicion(actor: Actor, partido: PartidoCarga, evento: EventoGuardado): Resultado<true> {
  if (!puede(actor, "corregir_eventos_propios")) return rechazo("permiso", "No tenés permiso para corregir eventos.");
  if (esEventoDeControl(evento.tipo)) return rechazo("conflicto", "Los eventos de control no se modifican.");
  if (evento.estado === "VALIDADO" || evento.estado === "PUBLICADO") {
    return rechazo("conflicto", "El evento ya fue validado y no se puede modificar.");
  }
  if (evento.id_usuario_carga !== actor.id_usuario) return rechazo("permiso", "Solo podés corregir los eventos que cargaste vos.");
  return verificarCargador(actor, partido);
}

export type Correccion = Partial<Omit<DatosEvento, "equipo">> & { equipo?: Equipo };

/**
 * Evento.corregir(datos): modifica un evento propio en BORRADOR o
 * RECHAZADO. Al corregir un evento rechazado, vuelve a BORRADOR para que lo
 * revise de nuevo un dirigente.
 */
export function corregir(
  actor: Actor,
  partido: PartidoCarga,
  evento: EventoGuardado,
  cambios: Correccion
): Resultado<{ datos: DatosEvento & { estado: "BORRADOR" }; auditoria: RegistroNuevo[] }> {
  const permitido = verificarEdicion(actor, partido, evento);
  if (!permitido.ok) return permitido;

  const nuevo: DatosEvento = {
    tipo: cambios.tipo ?? evento.tipo,
    minuto: cambios.minuto ?? evento.minuto,
    equipo: cambios.equipo ?? evento.equipo,
    id_jugador: cambios.id_jugador !== undefined ? cambios.id_jugador : evento.id_jugador,
    id_jugador_entra: cambios.id_jugador_entra !== undefined ? cambios.id_jugador_entra : evento.id_jugador_entra,
  };
  if (nuevo.equipo === "RIVAL") nuevo.id_jugador = null;
  if (nuevo.tipo !== "CAMBIO") nuevo.id_jugador_entra = null;
  const error = validarDatos(nuevo);
  if (error) return rechazo("datos", error);

  const anterior = instantanea(evento);
  const posterior = instantanea({ ...nuevo, id_partido: evento.id_partido, estado: "BORRADOR" });
  if (JSON.stringify(anterior) === JSON.stringify(posterior)) return rechazo("datos", "No hay cambios para guardar.");

  return exito({
    datos: { ...nuevo, estado: "BORRADOR" },
    auditoria: [registroAuditoria(actor.id_usuario, ACCION.CORRECCION, anterior, posterior, { id_evento: evento.id_evento })],
  });
}

/** Elimina un evento propio que todavía no fue validado. */
export function eliminar(
  actor: Actor,
  partido: PartidoCarga,
  evento: EventoGuardado
): Resultado<{ auditoria: RegistroNuevo[] }> {
  const permitido = verificarEdicion(actor, partido, evento);
  if (!permitido.ok) return permitido;
  return exito({
    auditoria: [
      registroAuditoria(actor.id_usuario, ACCION.ELIMINACION, instantanea(evento), { eliminado: true }, {
        id_evento: evento.id_evento,
      }),
    ],
  });
}

/** Verificaciones comunes a validar y rechazar. */
function verificarRevision(actor: Actor, evento: EventoGuardado, partido: PartidoCarga): Resultado<true> {
  if (!puede(actor, "validar_eventos")) return rechazo("permiso", "Solo un dirigente puede validar o rechazar eventos.");
  if (partido.estado === "PROGRAMADO") return rechazo("conflicto", "El partido todavía no empezó.");
  if (evento.estado !== "BORRADOR") {
    const motivo =
      evento.estado === "RECHAZADO"
        ? "El evento está rechazado: espera la corrección del colaborador."
        : "El evento ya fue validado.";
    return rechazo("conflicto", motivo);
  }
  // Regla clave del flujo: quien carga no puede aprobar su propia carga.
  if (evento.id_usuario_carga === actor.id_usuario) {
    return rechazo("permiso", "No podés validar un evento que cargaste vos.");
  }
  return exito(true);
}

/** Evento.validar(): BORRADOR → VALIDADO. */
export function validar(
  actor: Actor,
  evento: EventoGuardado,
  partido: PartidoCarga
): Resultado<{ estado: "VALIDADO"; auditoria: RegistroNuevo[] }> {
  const permitido = verificarRevision(actor, evento, partido);
  if (!permitido.ok) return permitido;
  return exito({
    estado: "VALIDADO",
    auditoria: [
      registroAuditoria(actor.id_usuario, ACCION.VALIDACION, { estado: "BORRADOR" }, { estado: "VALIDADO" }, { id_evento: evento.id_evento }),
    ],
  });
}

/**
 * Evento.publicar(): VALIDADO → PUBLICADO. Se ejecuta automáticamente a
 * continuación de validar(), en la misma transacción. Recién publicado, el
 * evento cuenta para el marcador y genera las notificaciones.
 */
export function publicar(
  id_usuario: number,
  evento: { id_evento: number; estado: EstadoEvento }
): Resultado<{ estado: "PUBLICADO"; auditoria: RegistroNuevo[] }> {
  if (evento.estado !== "VALIDADO") return rechazo("conflicto", "Solo se publican eventos validados.");
  return exito({
    estado: "PUBLICADO",
    auditoria: [
      registroAuditoria(id_usuario, ACCION.PUBLICACION, { estado: "VALIDADO" }, { estado: "PUBLICADO" }, { id_evento: evento.id_evento }),
    ],
  });
}

/** Evento.rechazar(): BORRADOR → RECHAZADO; el evento vuelve al colaborador para su corrección. */
export function rechazar(
  actor: Actor,
  evento: EventoGuardado,
  partido: PartidoCarga
): Resultado<{ estado: "RECHAZADO"; auditoria: RegistroNuevo[] }> {
  const permitido = verificarRevision(actor, evento, partido);
  if (!permitido.ok) {
    // Mismo mensaje que la validación, pero en términos de rechazo.
    if (!permitido.ok && permitido.mensaje.startsWith("No podés validar")) {
      return rechazo("permiso", "No podés rechazar un evento que cargaste vos.");
    }
    return permitido;
  }
  return exito({
    estado: "RECHAZADO",
    auditoria: [
      registroAuditoria(actor.id_usuario, ACCION.RECHAZO, { estado: "BORRADOR" }, { estado: "RECHAZADO" }, { id_evento: evento.id_evento }),
    ],
  });
}

/** Descripción corta de un evento para avisos ("Try · 23'"). */
export function describir(e: { tipo: TipoEvento; minuto: number }): string {
  return `${ETIQUETA_EVENTO[e.tipo]} · ${e.minuto}'`;
}
