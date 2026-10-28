"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Tarjeta } from "@/componentes/Tarjeta";
import { RelojPartido } from "@/componentes/RelojPartido";
import { minutoSugerido } from "@/dominio/partido";
import { ETIQUETA_EVENTO, NOMBRE_CLUB, type Equipo, type TipoEvento } from "@/dominio/tipos";
import type { DatosCarga } from "@/servicios/consultas";
import { llamar } from "@/lib/cliente";
import { ModalEvento, type EstadoModal, type Jugador } from "./ModalEvento";

type Props = {
  datos: DatosCarga;
  jugadores: Jugador[];
  actor: { id_usuario: number; puedeValidar: boolean; puedeReasignar: boolean };
  habilitados: { id_usuario: number; nombre: string }[];
};

const BOTONES: { tipo: TipoEvento; etiqueta: string; conConversion?: boolean; estilo?: string }[] = [
  { tipo: "TRY", etiqueta: "Try" },
  { tipo: "TRY", etiqueta: "Try y Conversión", conConversion: true },
  { tipo: "CONVERSION", etiqueta: "Conversión" },
  { tipo: "PENAL", etiqueta: "Penal" },
  { tipo: "DROP", etiqueta: "Drop" },
  {
    tipo: "TARJETA_AMARILLA",
    etiqueta: "Tarjeta amarilla",
    estilo: "border border-amarilla-borde bg-amarilla-fondo text-amarilla-texto",
  },
  { tipo: "TARJETA_ROJA", etiqueta: "Tarjeta roja", estilo: "border border-roja-borde bg-roja-fondo text-roja-texto" },
];

const CONTROLES: { tipo: TipoEvento; etiqueta: string }[] = [
  { tipo: "INICIO_PARTIDO", etiqueta: "Inicio del partido" },
  { tipo: "ENTRETIEMPO", etiqueta: "Entretiempo" },
  { tipo: "INICIO_SEGUNDO_TIEMPO", etiqueta: "Inicio 2do tiempo" },
  { tipo: "FINAL_PARTIDO", etiqueta: "Final del partido" },
];

export function PanelCarga({ datos, jugadores, actor, habilitados }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<EstadoModal | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sale, setSale] = useState("");
  const [entra, setEntra] = useState("");
  const [minutoCambio, setMinutoCambio] = useState("");
  const [nuevoCargador, setNuevoCargador] = useState("");

  const enCurso = datos.estado === "EN_CURSO";
  const esCargador = enCurso && datos.cargador?.id_usuario === actor.id_usuario;
  const reloj = { ...datos.reloj, corriendo_desde: datos.reloj.corriendo_desde ? new Date(datos.reloj.corriendo_desde) : null };
  const sugerido = () => minutoSugerido(reloj, new Date());
  const marcadorLocal = datos.condicion === "LOCAL" ? datos.marcador.club : datos.marcador.rival;
  const marcadorVisitante = datos.condicion === "LOCAL" ? datos.marcador.rival : datos.marcador.club;
  const nombre = (id: number | null) => jugadores.find((j) => j.id === id)?.nombre ?? "";
  const misEventos = esCargador ? datos.eventos.filter((e) => e.id_usuario_carga === actor.id_usuario) : datos.eventos;

  function mostrar(texto: string | undefined, error: boolean) {
    setAviso({ texto: texto ?? (error ? "No se pudo completar la operación." : "Listo."), error });
    setTimeout(() => setAviso(null), 4000);
  }

  async function accion(url: string, method: string, body?: unknown) {
    setOcupado(true);
    const r = await llamar(url, method, body);
    setOcupado(false);
    mostrar(r.mensaje, !r.ok);
    router.refresh();
    return r.ok;
  }

  async function cargarCambio() {
    const ok = await accion(`/api/partidos/${datos.id_partido}/eventos`, "POST", {
      tipo: "CAMBIO",
      equipo: "CLUB",
      minuto: Number(minutoCambio || sugerido()),
      id_jugador: Number(sale) || null,
      id_jugador_entra: Number(entra) || null,
    });
    if (ok) {
      setSale("");
      setEntra("");
      setMinutoCambio("");
    }
  }

  const columna = (equipo: Equipo, titulo: string) => (
    <div className="space-y-3">
      <p className="truncate text-center text-sm font-semibold uppercase tracking-wide text-negro/50">{titulo}</p>
      {BOTONES.map((b) => (
        <button
          key={b.etiqueta}
          disabled={ocupado}
          onClick={() => setModal({ modo: "nuevo", tipo: b.tipo, equipo, conConversion: !!b.conConversion, minuto: sugerido() })}
          className={`w-full rounded-xl px-2 py-4 text-[15px] font-semibold disabled:opacity-60 ${b.estilo ?? "bg-bordo text-crema"}`}
        >
          {b.etiqueta}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 px-4 py-5">
      {/* Marcador publicado y reloj */}
      <Tarjeta className="p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <p className="truncate text-sm font-semibold">{datos.local}</p>
          <p className="font-display text-4xl text-bordo">
            {marcadorLocal} - {marcadorVisitante}
          </p>
          <p className="truncate text-sm font-semibold">{datos.visitante}</p>
        </div>
        <div className="mt-2">
          <RelojPartido reloj={datos.reloj} compacto />
        </div>
        <p className="mt-3 border-t border-black/5 pt-2 text-center text-xs text-negro/55">
          Cargador asignado: <strong>{datos.cargador?.nombre ?? "sin asignar"}</strong>
          {datos.cargador?.id_usuario === actor.id_usuario ? " (vos)" : ""} · El marcador muestra solo eventos publicados
        </p>
      </Tarjeta>

      {actor.puedeValidar ? (
        <Link
          href={`/gestion/partidos/${datos.id_partido}/validacion`}
          className="block rounded-xl border border-bordo/40 bg-white/60 py-3 text-center font-semibold text-bordo"
        >
          Eventos pendientes de validación
        </Link>
      ) : null}

      {datos.estado === "FINALIZADO" ? (
        <Tarjeta className="space-y-3 p-4 text-sm">
          <p>Partido finalizado. Para corregir o completar eventos, reabrí la carga.</p>
          <button
            disabled={ocupado}
            onClick={() => accion(`/api/partidos/${datos.id_partido}/reabrir`, "POST")}
            className="w-full rounded-xl bg-bordo py-3 font-semibold text-crema"
          >
            Reabrir la carga
          </button>
        </Tarjeta>
      ) : null}

      {enCurso && !esCargador ? (
        <Tarjeta className="space-y-3 p-4 text-sm">
          <p>
            La carga de este partido la tiene <strong>{datos.cargador?.nombre}</strong>. Solo esa persona puede cargar
            eventos mientras el partido está en curso.
          </p>
          {actor.puedeReasignar ? (
            <div className="space-y-2">
              <label htmlFor="cargador" className="block text-xs font-semibold uppercase text-negro/50">
                Reasignar la carga
              </label>
              <select
                id="cargador"
                value={nuevoCargador}
                onChange={(e) => setNuevoCargador(e.target.value)}
                className="w-full rounded-xl border border-black/15 bg-white px-3 py-3"
              >
                <option value="">Elegí a quién…</option>
                {habilitados
                  .filter((h) => h.id_usuario !== datos.cargador?.id_usuario)
                  .map((h) => (
                    <option key={h.id_usuario} value={h.id_usuario}>
                      {h.nombre}
                      {h.id_usuario === actor.id_usuario ? " (yo)" : ""}
                    </option>
                  ))}
              </select>
              <button
                disabled={!nuevoCargador || ocupado}
                onClick={() =>
                  accion(`/api/partidos/${datos.id_partido}/cargador`, "PUT", { id_usuario: Number(nuevoCargador) }).then(
                    () => setNuevoCargador("")
                  )
                }
                className="w-full rounded-xl bg-bordo py-3 font-semibold text-crema disabled:opacity-50"
              >
                Reasignar
              </button>
            </div>
          ) : null}
        </Tarjeta>
      ) : null}

      {esCargador ? (
        <>
          {/* Control del partido */}
          <div className="grid grid-cols-2 gap-2">
            {datos.proximoControl ? (
              CONTROLES.map((c) => {
                const habilitado = c.tipo === datos.proximoControl;
                return (
                  <button
                    key={c.tipo}
                    disabled={!habilitado || ocupado}
                    onClick={() => accion(`/api/partidos/${datos.id_partido}/eventos`, "POST", { tipo: c.tipo })}
                    className={`rounded-xl py-3 text-sm font-semibold ${
                      habilitado ? "bg-negro text-crema" : "border border-black/10 text-negro/35"
                    }`}
                  >
                    {c.etiqueta}
                  </button>
                );
              })
            ) : (
              <button
                disabled={ocupado}
                onClick={() => accion(`/api/partidos/${datos.id_partido}/cerrar`, "POST")}
                className="col-span-2 rounded-xl bg-negro py-3 text-sm font-semibold text-crema"
              >
                Cerrar la carga
              </button>
            )}
          </div>

          {/* Botones por equipo */}
          <div className="grid grid-cols-2 gap-3">
            {columna(datos.condicion === "LOCAL" ? "CLUB" : "RIVAL", datos.local)}
            {columna(datos.condicion === "LOCAL" ? "RIVAL" : "CLUB", datos.visitante)}
          </div>

          {/* Cambio */}
          <Tarjeta className="space-y-3 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-negro/50">Cambio · {NOMBRE_CLUB}</p>
            <label className="block text-sm text-negro/60">
              Sale
              <select
                value={sale}
                onChange={(e) => setSale(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-negro"
              >
                <option value="">Elegí el jugador que sale…</option>
                {jugadores
                  .filter((j) => datos.enCancha.includes(j.id))
                  .map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.numero} · {j.nombre}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm text-negro/60">
              Entra
              <select
                value={entra}
                onChange={(e) => setEntra(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-negro"
              >
                <option value="">Elegí el jugador que entra…</option>
                {jugadores
                  .filter((j) => !datos.enCancha.includes(j.id))
                  .map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.numero} · {j.nombre}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm text-negro/60">
              Minuto
              <input
                type="number"
                inputMode="numeric"
                placeholder={`${sugerido()}`}
                value={minutoCambio}
                onChange={(e) => setMinutoCambio(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-negro"
              />
            </label>
            <button
              disabled={!sale || !entra || ocupado}
              onClick={cargarCambio}
              className="w-full rounded-xl bg-bordo py-3 font-semibold text-crema disabled:opacity-50"
            >
              Cargar cambio
            </button>
          </Tarjeta>
        </>
      ) : null}

      {/* Eventos cargados */}
      <section>
        <h2 className="font-display mb-2 text-2xl text-bordo">{esCargador ? "Mis eventos" : "Eventos cargados"}</h2>
        {misEventos.length === 0 ? (
          <p className="rounded-2xl bg-white/60 px-4 py-6 text-center text-sm text-negro/55">Todavía no hay eventos cargados.</p>
        ) : (
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-[#fbf9f5]">
            {misEventos.map((e) => {
              const editable = esCargador && e.id_usuario_carga === actor.id_usuario;
              return (
                <li key={e.id_evento} className="flex gap-3 px-4 py-3">
                  <span className="font-display w-9 shrink-0 text-xl text-bordo">{e.minuto}&apos;</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px]">
                      <strong>{ETIQUETA_EVENTO[e.tipo]}</strong> · {e.equipo === "CLUB" ? NOMBRE_CLUB : datos.rival}
                    </p>
                    {e.tipo === "CAMBIO" ? (
                      <p className="text-sm text-negro/60">
                        <span className="font-semibold text-bordo/80">Sale</span> {e.jugador} ·{" "}
                        <span className="font-semibold text-bordo/80">Entra</span> {e.jugador_entra}
                      </p>
                    ) : e.jugador ? (
                      <p className="text-sm text-negro/60">{e.jugador}</p>
                    ) : null}
                    {!esCargador ? <p className="text-xs text-negro/45">Cargó: {e.cargo}</p> : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <EstadoChip estado={e.estado} />
                      {editable && e.estado === "RECHAZADO" ? (
                        <button
                          onClick={() => setModal({ modo: "editar", evento: e })}
                          className="rounded-lg bg-roja-texto px-3 py-1 text-xs font-semibold text-white"
                        >
                          Corregir
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {editable && (e.estado === "BORRADOR" || e.estado === "RECHAZADO") ? (
                    <div className="flex shrink-0 items-start gap-1">
                      <button
                        aria-label="Editar"
                        onClick={() => setModal({ modo: "editar", evento: e })}
                        className="rounded-lg p-2 text-negro/60 hover:bg-black/5"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        aria-label="Eliminar"
                        disabled={ocupado}
                        onClick={() => {
                          if (confirm("¿Eliminar este evento?")) accion(`/api/eventos/${e.id_evento}`, "DELETE");
                        }}
                        className="rounded-lg p-2 text-roja-texto hover:bg-black/5"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {modal ? (
        <ModalEvento
          estado={modal}
          datos={datos}
          jugadores={jugadores}
          nombre={nombre}
          onCerrar={() => setModal(null)}
          onListo={(texto, error) => {
            mostrar(texto, error);
            if (!error) setModal(null);
            router.refresh();
          }}
        />
      ) : null}

      {aviso ? (
        <div
          role="status"
          className={`fixed inset-x-0 bottom-20 z-50 mx-auto w-[calc(100%-2rem)] max-w-[448px] rounded-xl px-4 py-3 text-center text-sm font-semibold shadow-lg ${
            aviso.error ? "bg-roja-texto text-white" : "bg-[#1f5f3a] text-white"
          }`}
        >
          {aviso.texto}
        </div>
      ) : null}
    </div>
  );
}

/** Estado del evento: borrador en gris, publicado en verde, rechazado en rojo. */
export function EstadoChip({ estado }: { estado: DatosCarga["eventos"][number]["estado"] }) {
  const estilos = {
    BORRADOR: ["bg-black/10 text-negro/70", "Pendiente de validación"],
    VALIDADO: ["bg-[#d8eedf] text-[#1f5f3a]", "Validado"],
    PUBLICADO: ["bg-[#d8eedf] text-[#1f5f3a]", "Publicado"],
    RECHAZADO: ["bg-roja-fondo text-roja-texto", "Rechazado"],
  } as const;
  const [clase, texto] = estilos[estado];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${clase}`}>{texto}</span>;
}
