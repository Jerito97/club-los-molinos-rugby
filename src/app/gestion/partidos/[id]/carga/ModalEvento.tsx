"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import { ETIQUETA_EVENTO, NOMBRE_CLUB, type Equipo, type TipoEvento } from "@/dominio/tipos";
import type { DatosCarga } from "@/servicios/consultas";
import { llamar } from "@/lib/cliente";

export type Jugador = { id: number; nombre: string; numero: number };
type EventoCarga = DatosCarga["eventos"][number];

export type EstadoModal =
  | { modo: "nuevo"; tipo: TipoEvento; equipo: Equipo; conConversion: boolean; minuto: number }
  | { modo: "editar"; evento: EventoCarga };

/**
 * Hoja inferior para completar un evento: jugador (con buscador y número de
 * camiseta, primero los que están en cancha) y minuto sugerido editable.
 * Sirve para cargar un evento nuevo y para corregir uno en borrador o rechazado.
 */
export function ModalEvento({
  estado,
  datos,
  jugadores,
  nombre,
  onCerrar,
  onListo,
}: {
  estado: EstadoModal;
  datos: DatosCarga;
  jugadores: Jugador[];
  nombre: (id: number | null) => string;
  onCerrar: () => void;
  onListo: (texto: string | undefined, error: boolean) => void;
}) {
  const inicial =
    estado.modo === "nuevo"
      ? { tipo: estado.tipo, equipo: estado.equipo, minuto: estado.minuto, jugador: null, entra: null }
      : {
          tipo: estado.evento.tipo,
          equipo: estado.evento.equipo,
          minuto: estado.evento.minuto,
          jugador: estado.evento.id_jugador,
          entra: estado.evento.id_jugador_entra,
        };
  const conConversion = estado.modo === "nuevo" && estado.conConversion;
  const [tipo, setTipo] = useState<TipoEvento>(inicial.tipo);
  const [minuto, setMinuto] = useState<number>(inicial.minuto);
  const [jugador, setJugador] = useState<number | null>(inicial.jugador);
  const [entra, setEntra] = useState<number | null>(inicial.entra);
  const [pateador, setPateador] = useState<number | null>(() => {
    // Por defecto, el apertura (10) o el fullback (15) si están en cancha.
    const candidato = jugadores.find((j) => [10, 15].includes(j.numero) && datos.enCancha.includes(j.id));
    return candidato?.id ?? null;
  });
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const equipo = inicial.equipo;
  const delClub = equipo === "CLUB";
  const esCambio = tipo === "CAMBIO";
  const titulo = `${conConversion ? "Try y Conversión" : ETIQUETA_EVENTO[tipo]} · ${delClub ? NOMBRE_CLUB : datos.rival}`;

  const ordenados = useMemo(() => {
    const filtro = busqueda.trim().toLowerCase();
    const lista = jugadores.filter(
      (j) => !filtro || j.nombre.toLowerCase().includes(filtro) || String(j.numero) === filtro
    );
    return {
      enCancha: lista.filter((j) => datos.enCancha.includes(j.id)),
      resto: lista.filter((j) => !datos.enCancha.includes(j.id)),
    };
  }, [busqueda, jugadores, datos.enCancha]);

  async function confirmar() {
    setError(null);
    if (delClub && !esCambio && !jugador) {
      setError("Elegí el jugador.");
      return;
    }
    if (conConversion && delClub && !pateador) {
      setError("Elegí quién pateó la conversión.");
      return;
    }
    setEnviando(true);
    const r =
      estado.modo === "nuevo"
        ? await llamar(`/api/partidos/${datos.id_partido}/eventos`, "POST", {
            tipo,
            equipo,
            minuto,
            id_jugador: delClub ? jugador : null,
            conConversion,
            id_jugador_conversion: conConversion && delClub ? pateador : null,
          })
        : await llamar(`/api/eventos/${estado.evento.id_evento}`, "PATCH", {
            tipo,
            minuto,
            id_jugador: delClub ? jugador : null,
            id_jugador_entra: esCambio ? entra : null,
          });
    setEnviando(false);
    if (!r.ok) {
      setError(r.mensaje ?? "No se pudo guardar.");
      return;
    }
    onListo(r.mensaje, false);
  }

  const filaJugador = (j: Jugador, seleccionado: boolean, alElegir: () => void) => (
    <li key={j.id}>
      <button
        onClick={alElegir}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${seleccionado ? "bg-bordo text-crema" : ""}`}
      >
        <span className={`font-display w-7 text-lg ${seleccionado ? "text-crema" : "text-bordo"}`}>{j.numero}</span>
        <span>{j.nombre}</span>
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onCerrar}>
      <div
        className="flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-crema"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={titulo}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-negro/50">
              {estado.modo === "nuevo" ? "Cargar evento" : "Corregir evento"}
            </p>
            <h2 className="font-display text-2xl text-bordo">{titulo}</h2>
          </div>
          <button aria-label="Cerrar" onClick={onCerrar} className="rounded-full p-2 hover:bg-black/5">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          {estado.modo === "editar" && !esCambio ? (
            <label className="block text-sm text-negro/60">
              Tipo
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoEvento)}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-negro"
              >
                {(["TRY", "CONVERSION", "PENAL", "DROP", "TARJETA_AMARILLA", "TARJETA_ROJA"] as const).map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_EVENTO[t]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {/* Minuto sugerido, editable */}
          <div>
            <p className="mb-1 text-sm text-negro/60">Minuto</p>
            <div className="flex items-center gap-3">
              <button
                aria-label="Restar un minuto"
                onClick={() => setMinuto((m) => Math.max(1, m - 1))}
                className="rounded-xl bg-white p-3 shadow-sm"
              >
                <Minus size={18} />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={minuto}
                onChange={(e) => setMinuto(Number(e.target.value))}
                className="font-display w-full rounded-xl border border-black/15 bg-white py-2 text-center text-3xl text-bordo"
                aria-label="Minuto"
              />
              <button aria-label="Sumar un minuto" onClick={() => setMinuto((m) => m + 1)} className="rounded-xl bg-white p-3 shadow-sm">
                <Plus size={18} />
              </button>
            </div>
          </div>

          {esCambio ? (
            <>
              <label className="block text-sm text-negro/60">
                Sale
                <select
                  value={jugador ?? ""}
                  onChange={(e) => setJugador(Number(e.target.value) || null)}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-negro"
                >
                  {jugadores.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.numero} · {j.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-negro/60">
                Entra
                <select
                  value={entra ?? ""}
                  onChange={(e) => setEntra(Number(e.target.value) || null)}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-negro"
                >
                  {jugadores.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.numero} · {j.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : delClub ? (
            <>
              <div>
                <p className="mb-1 text-sm text-negro/60">
                  {conConversion ? "Autor del try" : "Jugador"}
                  {jugador ? <strong className="text-negro">: {nombre(jugador)}</strong> : null}
                </p>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-negro/40" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o número…"
                    className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-9 pr-4 text-sm"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-2xl bg-white">
                  {ordenados.enCancha.length > 0 ? (
                    <>
                      <p className="px-4 pt-2 text-[11px] font-semibold uppercase text-negro/45">En cancha</p>
                      <ul>{ordenados.enCancha.map((j) => filaJugador(j, jugador === j.id, () => setJugador(j.id)))}</ul>
                    </>
                  ) : null}
                  {ordenados.resto.length > 0 ? (
                    <>
                      <p className="px-4 pt-2 text-[11px] font-semibold uppercase text-negro/45">Resto del plantel</p>
                      <ul>{ordenados.resto.map((j) => filaJugador(j, jugador === j.id, () => setJugador(j.id)))}</ul>
                    </>
                  ) : null}
                </div>
              </div>
              {conConversion ? (
                <label className="block text-sm text-negro/60">
                  Pateó la conversión
                  <select
                    value={pateador ?? ""}
                    onChange={(e) => setPateador(Number(e.target.value) || null)}
                    className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-negro"
                  >
                    <option value="">Elegí al pateador…</option>
                    {jugadores
                      .filter((j) => datos.enCancha.includes(j.id))
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.numero} · {j.nombre}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : (
            <p className="rounded-xl bg-white/70 px-4 py-3 text-sm text-negro/60">
              Los eventos del rival se cargan sin jugador.
            </p>
          )}
          {error ? (
            <p role="alert" className="rounded-xl bg-roja-fondo px-4 py-3 text-sm font-semibold text-roja-texto">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-black/5 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
          <button
            onClick={confirmar}
            disabled={enviando}
            className="w-full rounded-xl bg-bordo py-4 text-lg font-semibold text-crema disabled:opacity-60"
          >
            {enviando ? "Guardando…" : estado.modo === "nuevo" ? "Cargar" : "Guardar corrección"}
          </button>
        </div>
      </div>
    </div>
  );
}
