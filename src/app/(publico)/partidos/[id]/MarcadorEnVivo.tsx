"use client";

import { useState } from "react";
import { RelojPartido } from "@/componentes/RelojPartido";
import { horaCorta } from "@/lib/formato";
import { ETIQUETA_EVENTO, NOMBRE_CLUB, TIPOS_CONTROL, puntosDe } from "@/dominio/tipos";
import type { VistaMarcador } from "@/servicios/consultas";

/** Marcador grande, reloj y minuto a minuto con filtro "Todo / Puntos". */
export function MarcadorEnVivo({ vista }: { vista: VistaMarcador }) {
  const [solapa, setSolapa] = useState<"minuto" | "formacion">("minuto");
  const [filtro, setFiltro] = useState<"todo" | "puntos">("todo");
  const local = vista.condicion === "LOCAL" ? vista.marcador.club : vista.marcador.rival;
  const visitante = vista.condicion === "LOCAL" ? vista.marcador.rival : vista.marcador.club;
  const parcial = (p: { club: number; rival: number }) =>
    vista.condicion === "LOCAL" ? `${p.club} - ${p.rival}` : `${p.rival} - ${p.club}`;
  const lineas = vista.lineas.filter((l) => (filtro === "puntos" ? puntosDe(l.tipo) > 0 : true));
  const enVivo = vista.estado === "EN_CURSO";
  const programado = vista.estado === "PROGRAMADO";

  return (
    <div className="space-y-5 px-4 py-5">
      <section
        className={`rounded-2xl bg-[#fbf9f5] px-4 py-5 shadow-sm ${enVivo ? "border border-roja-borde/60" : ""}`}
        aria-live="polite"
      >
        {enVivo ? (
          <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-roja-texto">
            <span className="h-2 w-2 animate-pulse rounded-full bg-roja-texto" /> En vivo
          </p>
        ) : null}
        <div className="grid grid-cols-2 text-center text-[17px] font-medium">
          <p className="truncate">{vista.local}</p>
          <p className="truncate">{vista.visitante}</p>
        </div>
        <p className="font-display mt-1 text-center text-7xl leading-none text-bordo">
          {programado ? "vs" : `${local} - ${visitante}`}
        </p>
        <div className="mt-3">
          {programado ? (
            <p className="text-center text-sm text-negro/55">Programado · {horaCorta(vista.fecha)} h</p>
          ) : vista.cargadoEnVivo || enVivo ? (
            <RelojPartido reloj={vista.reloj} />
          ) : (
            <p className="text-center text-xs uppercase tracking-wider text-negro/55">Resultado oficial URBA</p>
          )}
        </div>
      </section>

      {vista.cargadoEnVivo || enVivo ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(["minuto", "formacion"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSolapa(s)}
                className={`rounded-full py-3 text-[15px] font-medium ${
                  solapa === s ? "bg-bordo text-crema" : "bg-[#e5d9d0] text-bordo"
                }`}
              >
                {s === "minuto" ? "Minuto a minuto" : "Formación"}
              </button>
            ))}
          </div>

          {solapa === "minuto" ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-2xl text-bordo">Minuto a minuto</h2>
                <div className="flex rounded-full bg-[#e5d9d0] p-1 text-sm">
                  {(["todo", "puntos"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFiltro(f)}
                      className={`rounded-full px-4 py-1.5 ${filtro === f ? "bg-bordo text-crema" : "text-negro"}`}
                    >
                      {f === "todo" ? "Todo" : "Puntos"}
                    </button>
                  ))}
                </div>
              </div>
              {lineas.length === 0 ? (
                <p className="rounded-2xl bg-white/60 px-4 py-6 text-center text-sm text-negro/55">
                  Todavía no hay eventos publicados.
                </p>
              ) : (
                <ul className="divide-y divide-black/5 rounded-2xl bg-[#fbf9f5] px-4 shadow-sm">
                  {lineas.map((l) => {
                    const control = TIPOS_CONTROL.includes(l.tipo);
                    return (
                      <li key={l.id_evento} className="flex gap-3 py-3.5">
                        <span className="font-display w-9 shrink-0 text-lg text-bordo">{control ? "" : `${l.minuto}'`}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px]">
                            <strong>{ETIQUETA_EVENTO[l.tipo]}</strong>
                            {control ? null : <> · {l.equipo === "CLUB" ? NOMBRE_CLUB : vista.rival}</>}
                          </p>
                          {l.tipo === "CAMBIO" ? (
                            <>
                              <p className="text-sm text-negro/60">
                                <span className="font-semibold text-bordo/80">Sale</span> {l.jugador}
                              </p>
                              <p className="text-sm text-negro/60">
                                <span className="font-semibold text-bordo/80">Entra</span> {l.jugador_entra}
                              </p>
                            </>
                          ) : l.jugador ? (
                            <p className="text-sm text-negro/60">{l.jugador}</p>
                          ) : null}
                        </div>
                        {l.parcial ? (
                          <span className="font-display shrink-0 text-lg text-bordo">{parcial(l.parcial)}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            <section>
              <h2 className="font-display mb-3 text-2xl text-bordo">Formación · {NOMBRE_CLUB}</h2>
              {vista.titulares.length === 0 ? (
                <p className="rounded-2xl bg-white/60 px-4 py-6 text-center text-sm text-negro/55">Sin formación cargada.</p>
              ) : (
                <ul className="divide-y divide-black/5 rounded-2xl bg-[#fbf9f5] px-4 shadow-sm">
                  {vista.titulares.map((t) => (
                    <li key={t.nro_camiseta} className="flex gap-3 py-2.5">
                      <span className="font-display w-8 text-lg text-bordo">{t.nro_camiseta}</span>
                      <span>{t.nombre}</span>
                    </li>
                  ))}
                  {vista.entraron.map((t) => (
                    <li key={`e${t.nro_camiseta}`} className="flex gap-3 py-2.5 text-negro/70">
                      <span className="font-display w-8 text-lg text-bordo/60">{t.nro_camiseta}</span>
                      <span className="flex-1">{t.nombre}</span>
                      <span className="text-sm">Entró {t.minuto}&apos;</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
