// Datos iniciales del sistema.
//
// Deja la base en un estado conocido: roles, usuarios con sus PIN, el
// plantel, el fixture y las posiciones de la URBA y el historial de los
// partidos ya cargados en la aplicación (con sus eventos publicados,
// auditoría, notificaciones enviadas y visitas al marcador), más un partido
// listo para iniciar en vivo.
//
// Lo usan el comando `npm run db:seed` y la opción "Reiniciar datos" de la
// sección de administración. Los datos se generan con un generador
// pseudoaleatorio con semilla fija, así que el resultado es siempre el mismo.

import type { PrismaClient } from "@/generated/prisma/client";
import { ACCION, type RegistroNuevo } from "@/dominio/auditoria";
import { TIPOS_NOTIFICABLES } from "@/dominio/notificaciones";
import { formatearResultado, leerResultado } from "@/dominio/partido";
import { hashearPin } from "@/dominio/pin";
import { MINUTOS_POR_TIEMPO, ROL, type Equipo, type TipoEvento } from "@/dominio/tipos";
import { guardarAuditoria } from "@/servicios/auditoria";
import { actualizarDesdeURBA } from "@/servicios/urba/actualizar";
import { FuenteURBAMock } from "@/servicios/urba/mock";
import { PLANTEL, USUARIOS_INICIALES } from "./datos";

/** Cantidad de partidos ya jugados que se cargaron en vivo con la aplicación. */
const PARTIDOS_CON_EVENTOS = 8;
const CANTIDAD_ESPECTADORES = 64;

/** Generador pseudoaleatorio con semilla (mulberry32). */
function crearAzar(semilla: number) {
  let a = semilla;
  const azar = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (min: number, max: number) => min + Math.floor(azar() * (max - min + 1));
  const elegir = <T>(lista: readonly T[]) => lista[Math.floor(azar() * lista.length)];
  const mezclar = <T>(lista: readonly T[]) => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };
  return { azar, entero, elegir, mezclar };
}

/** Descompone un puntaje en tries, conversiones, penales y drops verosímiles. */
export function descomponerPuntaje(puntos: number, conDrop = false) {
  const drops = conDrop && puntos >= 3 ? 1 : 0;
  const resto = puntos - drops * 3;
  for (let tries = Math.ceil(resto / 6.5); tries >= 0; tries--) {
    for (let conversiones = tries; conversiones >= Math.floor(tries / 2); conversiones--) {
      const r = resto - tries * 5 - conversiones * 2;
      if (r >= 0 && r % 3 === 0) return { tries, conversiones, penales: r / 3, drops };
    }
  }
  for (let tries = Math.floor(resto / 5); tries >= 0; tries--) {
    for (let conversiones = tries; conversiones >= 0; conversiones--) {
      const r = resto - tries * 5 - conversiones * 2;
      if (r >= 0 && r % 3 === 0) return { tries, conversiones, penales: r / 3, drops };
    }
  }
  throw new Error(`No se puede descomponer el puntaje ${puntos}`);
}

const TABLAS = [
  "notificacion_enviada",
  "push_suscripcion",
  "preferencia_notificacion",
  "registro_auditoria",
  "visita_marcador",
  "titular_partido",
  "evento",
  "partido",
  "posicion",
  "rival",
  "jugador",
  "pin_historial",
  "intento_login",
  "usuario",
  "rol",
];

/** Borra todos los datos y vuelve a cargar el estado inicial. */
export async function reiniciarYSembrar(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLAS.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await sembrar(prisma);
}

export async function sembrar(prisma: PrismaClient): Promise<void> {
  const { azar, entero, elegir, mezclar } = crearAzar(20261031);

  // --- Roles y usuarios -----------------------------------------------------
  const roles = new Map<string, number>();
  for (const nombre of [ROL.CARGADOR, ROL.VALIDADOR, ROL.ESPECTADOR]) {
    const rol = await prisma.rol.create({ data: { nombre } });
    roles.set(nombre, rol.id_rol);
  }

  const usuarios: Record<string, number> = {};
  for (const u of USUARIOS_INICIALES) {
    const pin_hash = await hashearPin(u.pin);
    const creado = await prisma.usuario.create({
      data: {
        nombre: u.nombre,
        pin_hash,
        id_rol: roles.get(u.rol)!,
        es_responsable_seguridad: u.responsableSeguridad,
        pin_provisorio: false,
        creado_en: new Date("2026-08-20T15:00:00Z"),
        pin_historial: { create: { pin_hash, fecha: new Date("2026-08-20T15:00:00Z") } },
      },
    });
    usuarios[u.clave] = creado.id_usuario;
  }
  const colaborador = usuarios.colaborador;
  const dirigente1 = usuarios.dirigente1;
  const dirigente2 = usuarios.dirigente2;

  // --- Plantel ---------------------------------------------------------------
  await prisma.jugador.createMany({ data: PLANTEL.map(([nombre, nro_camiseta]) => ({ nombre, nro_camiseta })) });
  const jugadores = await prisma.jugador.findMany({ orderBy: { nro_camiseta: "asc" } });
  const porNumero = new Map(jugadores.map((j) => [j.nro_camiseta, j.id_jugador]));
  const titularesHabituales = jugadores.filter((j) => j.nro_camiseta <= 15);
  const suplentes = jugadores.filter((j) => j.nro_camiseta > 15);

  // --- Fixture, rivales y posiciones (fuente URBA de ejemplo) ----------------
  await actualizarDesdeURBA(prisma, new FuenteURBAMock());

  // --- Espectadores con notificaciones activadas -----------------------------
  // Se suman de a poco a lo largo de septiembre y octubre.
  const inicioEspectadores = new Date("2026-09-01T12:00:00Z").getTime();
  const finEspectadores = new Date("2026-10-24T18:00:00Z").getTime();
  const espectadores: { id: number; desde: Date; tipos: Set<TipoEvento> }[] = [];
  const altas = Array.from({ length: CANTIDAD_ESPECTADORES }, (_, i) => ({
    nombre: "Espectador",
    id_rol: roles.get(ROL.ESPECTADOR)!,
    id_dispositivo: `semilla-${i.toString().padStart(3, "0")}`,
    creado_en: new Date(inicioEspectadores + azar() ** 0.7 * (finEspectadores - inicioEspectadores)),
  }));
  const creadosEspectadores = await prisma.usuario.createManyAndReturn({ data: altas });
  const preferencias = [];
  for (const u of creadosEspectadores) {
    // La mayoría deja todo activado; algunos apagan cambios, tarjetas o el entretiempo.
    const tipos = new Set(TIPOS_NOTIFICABLES);
    if (azar() < 0.45) tipos.delete("CAMBIO");
    if (azar() < 0.25) {
      tipos.delete("TARJETA_AMARILLA");
      tipos.delete("TARJETA_ROJA");
    }
    if (azar() < 0.2) tipos.delete("ENTRETIEMPO");
    if (azar() < 0.1) tipos.delete("INICIO_SEGUNDO_TIEMPO");
    for (const tipo_evento of TIPOS_NOTIFICABLES) {
      preferencias.push({ id_usuario: u.id_usuario, tipo_evento, activa: tipos.has(tipo_evento), fecha_hora: u.creado_en });
    }
    espectadores.push({ id: u.id_usuario, desde: u.creado_en, tipos });
  }
  await prisma.preferenciaNotificacion.createMany({ data: preferencias });

  // --- Partidos cargados en vivo con la aplicación ---------------------------
  const jugados = await prisma.partido.findMany({
    where: { estado: "FINALIZADO" },
    orderBy: { fecha: "desc" },
    take: PARTIDOS_CON_EVENTOS,
  });

  for (const [indice, partido] of jugados.reverse().entries()) {
    const resultado = leerResultado(partido.resultado)!;
    const auditoria: RegistroNuevo[] = [];
    const inicio = partido.fecha.getTime();
    const inicio2 = inicio + (MINUTOS_POR_TIEMPO + 2 + 12) * 60_000;
    const momentoDeJuego = (minuto: number) =>
      minuto <= MINUTOS_POR_TIEMPO
        ? inicio + (minuto - 1) * 60_000 + entero(5, 55) * 1000
        : inicio2 + (minuto - MINUTOS_POR_TIEMPO - 1) * 60_000 + entero(5, 55) * 1000;

    // Uno de los partidos lo cargó un dirigente (y lo validó el otro).
    const cargador = indice === 3 ? dirigente1 : colaborador;
    const validadores = [dirigente1, dirigente2].filter((v) => v !== cargador);
    const ip = `181.47.${entero(10, 250)}.${entero(2, 250)}`;

    auditoria.push(
      { accion: ACCION.INGRESO, id_usuario: cargador, ip, valor_nuevo: { rol: "carga" } },
      { accion: ACCION.INICIO_CARGA, id_usuario: cargador, valor_nuevo: { id_partido: partido.id_partido } },
      {
        accion: ACCION.ASIGNACION_CARGADOR,
        id_usuario: cargador,
        valor_anterior: { id_partido: partido.id_partido, id_usuario_cargador: null },
        valor_nuevo: { id_partido: partido.id_partido, id_usuario_cargador: cargador },
      }
    );

    // Titulares: los habituales del 1 al 15, con alguna rotación.
    const titulares = titularesHabituales.map((j) =>
      azar() < 0.82 ? j.id_jugador : elegir(suplentes).id_jugador
    );
    const unicos = [...new Set(titulares)];
    while (unicos.length < 15) {
      const s = elegir(suplentes).id_jugador;
      if (!unicos.includes(s)) unicos.push(s);
    }
    await prisma.titularPartido.createMany({
      data: unicos.map((id_jugador) => ({ id_partido: partido.id_partido, id_jugador })),
    });
    auditoria.push({
      accion: ACCION.TITULARES,
      id_usuario: cargador,
      valor_nuevo: { id_partido: partido.id_partido, titulares: unicos },
    });

    // Cambios del segundo tiempo.
    const banco = mezclar(jugadores.filter((j) => !unicos.includes(j.id_jugador)).map((j) => j.id_jugador)).slice(0, 8);
    const enCancha = new Set(unicos);
    const cambios: { minuto: number; sale: number; entra: number }[] = [];
    const minutosCambio = Array.from({ length: entero(4, 7) }, () => entero(45, 76)).sort((a, b) => a - b);
    for (const [i, minuto] of minutosCambio.entries()) {
      const sale = elegir([...enCancha]);
      const entra = banco[i];
      enCancha.delete(sale);
      enCancha.add(entra);
      cambios.push({ minuto, sale, entra });
    }
    const enCanchaEn = (minuto: number) => {
      const set = new Set(unicos);
      for (const c of cambios) {
        if (c.minuto <= minuto) {
          set.delete(c.sale);
          set.add(c.entra);
        }
      }
      return [...set];
    };
    const pateador = (minuto: number) => {
      const presentes = enCanchaEn(minuto);
      return [10, 15, 12].map((n) => porNumero.get(n)!).find((id) => presentes.includes(id)) ?? presentes[0];
    };

    // Eventos deportivos que explican el resultado oficial.
    type EventoSemilla = {
      tipo: TipoEvento;
      minuto: number;
      equipo: Equipo;
      id_jugador: number | null;
      id_jugador_entra: number | null;
    };
    const eventos: EventoSemilla[] = [];
    for (const equipo of ["CLUB", "RIVAL"] as const) {
      const puntos = equipo === "CLUB" ? resultado.club : resultado.rival;
      const { tries, conversiones, penales, drops } = descomponerPuntaje(puntos, azar() < 0.15);
      const tryMinutos = Array.from({ length: tries }, () => entero(2, 79));
      tryMinutos.forEach((minuto, i) => {
        const autor = equipo === "CLUB" ? elegir(enCanchaEn(minuto)) : null;
        eventos.push({ tipo: "TRY", minuto, equipo, id_jugador: autor, id_jugador_entra: null });
        if (i < conversiones) {
          eventos.push({
            tipo: "CONVERSION",
            minuto,
            equipo,
            id_jugador: equipo === "CLUB" ? pateador(minuto) : null,
            id_jugador_entra: null,
          });
        }
      });
      for (let i = 0; i < penales + drops; i++) {
        const minuto = entero(3, 79);
        eventos.push({
          tipo: i < penales ? "PENAL" : "DROP",
          minuto,
          equipo,
          id_jugador: equipo === "CLUB" ? pateador(minuto) : null,
          id_jugador_entra: null,
        });
      }
      const tarjetas = azar() < 0.6 ? entero(1, 2) : 0;
      for (let i = 0; i < tarjetas; i++) {
        const minuto = entero(8, 75);
        eventos.push({
          tipo: azar() < 0.88 ? "TARJETA_AMARILLA" : "TARJETA_ROJA",
          minuto,
          equipo,
          id_jugador: equipo === "CLUB" ? elegir(enCanchaEn(minuto)) : null,
          id_jugador_entra: null,
        });
      }
    }
    for (const c of cambios) {
      eventos.push({ tipo: "CAMBIO", minuto: c.minuto, equipo: "CLUB", id_jugador: c.sale, id_jugador_entra: c.entra });
    }
    eventos.sort((a, b) => a.minuto - b.minuto);

    // Eventos de control, publicados al momento.
    const finalEn = inicio2 + (MINUTOS_POR_TIEMPO + 1) * 60_000 + entero(0, 90) * 1000;
    const control: { tipo: TipoEvento; minuto: number; en: number }[] = [
      { tipo: "INICIO_PARTIDO", minuto: 0, en: inicio },
      { tipo: "ENTRETIEMPO", minuto: MINUTOS_POR_TIEMPO, en: inicio + (MINUTOS_POR_TIEMPO + 1) * 60_000 + entero(0, 80) * 1000 },
      { tipo: "INICIO_SEGUNDO_TIEMPO", minuto: MINUTOS_POR_TIEMPO, en: inicio2 },
      { tipo: "FINAL_PARTIDO", minuto: 2 * MINUTOS_POR_TIEMPO, en: finalEn },
    ];

    // Tiempos de carga y validación: el colaborador carga entre 10 s y 1:30
    // después de la jugada y el dirigente valida entre 15 s y 2:30 después.
    type Fila = EventoSemilla & {
      estado: "PUBLICADO";
      creado_en: Date;
      validado_en: Date;
      id_usuario_valida: number | null;
      corregido?: "rechazo" | "correccion";
    };
    const filas: Fila[] = [
      ...control.map((c) => ({
        tipo: c.tipo,
        minuto: c.minuto,
        equipo: "CLUB" as const,
        id_jugador: null,
        id_jugador_entra: null,
        estado: "PUBLICADO" as const,
        creado_en: new Date(c.en),
        validado_en: new Date(c.en),
        id_usuario_valida: null,
      })),
      ...eventos.map((e) => {
        const creado_en = new Date(momentoDeJuego(e.minuto) + entero(10, 90) * 1000);
        return {
          ...e,
          estado: "PUBLICADO" as const,
          creado_en,
          validado_en: new Date(creado_en.getTime() + entero(15, 150) * 1000),
          id_usuario_valida: elegir(validadores),
        };
      }),
    ];
    // Algunas cargas se rechazaron y se corrigieron, o se corrigieron antes de validar.
    const deportivos = filas.filter((f) => f.id_usuario_valida !== null && f.equipo === "CLUB" && f.id_jugador);
    const rechazados = mezclar(deportivos).slice(0, entero(0, 2));
    for (const f of rechazados) {
      f.corregido = "rechazo";
      f.validado_en = new Date(f.validado_en.getTime() + entero(60, 150) * 1000);
    }
    for (const f of mezclar(deportivos.filter((d) => !d.corregido)).slice(0, entero(0, 2))) f.corregido = "correccion";

    const creados = await prisma.evento.createManyAndReturn({
      data: filas.map((f) => ({
        tipo: f.tipo,
        minuto: f.minuto,
        estado: f.estado,
        id_partido: partido.id_partido,
        equipo: f.equipo,
        id_jugador: f.id_jugador,
        id_jugador_entra: f.id_jugador_entra,
        id_usuario_carga: cargador,
        id_usuario_valida: f.id_usuario_valida,
        creado_en: f.creado_en,
        validado_en: f.validado_en,
      })),
    });

    for (const [i, e] of creados.entries()) {
      const f = filas[i];
      const datos = {
        id_partido: e.id_partido,
        tipo: e.tipo,
        minuto: e.minuto,
        equipo: e.equipo,
        id_jugador: e.id_jugador,
        id_jugador_entra: e.id_jugador_entra,
      };
      const base = { id_evento: e.id_evento };
      if (f.id_usuario_valida === null) {
        auditoria.push({ ...base, accion: ACCION.PUBLICACION, id_usuario: cargador, valor_nuevo: { ...datos, estado: "PUBLICADO" } });
        continue;
      }
      if (f.corregido) {
        // La carga original tenía el minuto o el jugador equivocado.
        const original = { ...datos, minuto: Math.max(1, e.minuto - entero(1, 3)) };
        auditoria.push({ ...base, accion: ACCION.ALTA, id_usuario: cargador, valor_nuevo: { ...original, estado: "BORRADOR" } });
        if (f.corregido === "rechazo") {
          auditoria.push({
            ...base,
            accion: ACCION.RECHAZO,
            id_usuario: f.id_usuario_valida,
            valor_anterior: { estado: "BORRADOR" },
            valor_nuevo: { estado: "RECHAZADO" },
          });
        }
        auditoria.push({
          ...base,
          accion: ACCION.CORRECCION,
          id_usuario: cargador,
          valor_anterior: { ...original, estado: f.corregido === "rechazo" ? "RECHAZADO" : "BORRADOR" },
          valor_nuevo: { ...datos, estado: "BORRADOR" },
        });
      } else {
        auditoria.push({ ...base, accion: ACCION.ALTA, id_usuario: cargador, valor_nuevo: { ...datos, estado: "BORRADOR" } });
      }
      auditoria.push(
        {
          ...base,
          accion: ACCION.VALIDACION,
          id_usuario: f.id_usuario_valida,
          valor_anterior: { estado: "BORRADOR" },
          valor_nuevo: { estado: "VALIDADO" },
        },
        {
          ...base,
          accion: ACCION.PUBLICACION,
          id_usuario: f.id_usuario_valida,
          valor_anterior: { estado: "VALIDADO" },
          valor_nuevo: { estado: "PUBLICADO" },
        }
      );
    }
    auditoria.push({
      accion: ACCION.FINALIZACION,
      id_usuario: cargador,
      valor_anterior: { id_partido: partido.id_partido, estado: "EN_CURSO" },
      valor_nuevo: { id_partido: partido.id_partido, estado: "FINALIZADO", resultado: formatearResultado(resultado) },
    });

    // Cada registro de auditoría lleva la hora real de la acción.
    const momentoDe = (r: RegistroNuevo): Date => {
      const e = r.id_evento ? creados.find((c) => c.id_evento === r.id_evento) : null;
      if (!e) return r.accion === ACCION.FINALIZACION ? new Date(finalEn + 30_000) : new Date(inicio - 15 * 60_000);
      if (r.accion === ACCION.ALTA) return e.id_usuario_valida ? new Date(e.creado_en.getTime() - 70_000) : e.creado_en;
      if (r.accion === ACCION.RECHAZO) return new Date(e.creado_en.getTime() - 40_000);
      if (r.accion === ACCION.CORRECCION) return e.creado_en;
      return e.validado_en ?? e.creado_en;
    };
    await guardarAuditoria(prisma, auditoria.map((r) => ({ ...r, fecha_hora: momentoDe(r) })));

    // Resultado cacheado en el partido y cargador asignado.
    await prisma.partido.update({
      where: { id_partido: partido.id_partido },
      data: { id_usuario_cargador: cargador, iniciado_en: new Date(inicio) },
    });

    // Notificaciones enviadas a los espectadores suscriptos en ese momento.
    const notificaciones = creados.flatMap((e) =>
      espectadores
        .filter((s) => s.desde < e.validado_en! && s.tipos.has(e.tipo))
        .map((s) => ({ id_evento: e.id_evento, id_usuario: s.id, fecha_hora: new Date(e.validado_en!.getTime() + 2000) }))
    );
    await prisma.notificacionEnviada.createMany({ data: notificaciones });

    // Visitas al marcador en vivo (dispositivos anónimos).
    const dispositivos = entero(35, 60) + indice * entero(3, 8);
    const visitas = Array.from({ length: dispositivos }).flatMap((_, d) =>
      Array.from({ length: entero(1, 4) }, () => ({
        id_partido: partido.id_partido,
        id_dispositivo: `v${partido.id_partido}-${d}`,
        fecha_hora: new Date(inicio + entero(-10, 100) * 60_000),
      }))
    );
    await prisma.visitaMarcador.createMany({ data: visitas });
  }
}
