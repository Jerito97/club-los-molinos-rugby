"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { llamar } from "@/lib/cliente";
import { horaCorta } from "@/lib/formato";
import { ETIQUETA_EVENTO, NOMBRE_CLUB } from "@/dominio/tipos";
import type { Pendiente } from "@/servicios/consultas";

/**
 * Tarjetas de eventos en borrador con Aprobar / Rechazar. Si el dirigente
 * cargó el evento, no puede aprobarlo: el botón aparece deshabilitado.
 */
export function ListaPendientes({ pendientes, rival, id_usuario }: { pendientes: Pendiente[]; rival: string; id_usuario: number }) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);

  async function resolver(id: number, accion: "validar" | "rechazar") {
    setEnCurso(id);
    const r = await llamar(`/api/eventos/${id}/${accion}`, "POST");
    setEnCurso(null);
    setAviso({ texto: r.mensaje ?? "", error: !r.ok });
    setTimeout(() => setAviso(null), 4000);
    router.refresh();
  }

  if (pendientes.length === 0) {
    return (
      <p className="mx-4 my-6 rounded-2xl bg-white/60 px-4 py-8 text-center text-sm text-negro/55">
        No hay eventos pendientes de validación. La lista se actualiza sola.
      </p>
    );
  }

  return (
    <div className="space-y-4 px-4 py-6">
      {pendientes.map((e) => {
        const propio = e.id_usuario_carga === id_usuario;
        return (
          <article key={e.id_evento} className="rounded-2xl bg-[#fbf9f5] p-5 shadow-sm shadow-black/5">
            <div className="flex gap-4">
              <span className="font-display w-10 shrink-0 text-3xl leading-none text-bordo">{e.minuto}&apos;</span>
              <div className="min-w-0 flex-1">
                <p className="text-lg">
                  <strong>{ETIQUETA_EVENTO[e.tipo]}</strong> · {e.equipo === "CLUB" ? NOMBRE_CLUB : rival}
                </p>
                {e.tipo === "CAMBIO" ? (
                  <>
                    <p className="text-negro/60">
                      <span className="font-semibold text-bordo/80">Sale</span> {e.jugador}
                    </p>
                    <p className="text-negro/60">
                      <span className="font-semibold text-bordo/80">Entra</span> {e.jugador_entra}
                    </p>
                  </>
                ) : e.jugador ? (
                  <p className="text-negro/60">{e.jugador}</p>
                ) : null}
                <p className="mt-1 text-xs text-negro/45">
                  Cargó: {e.cargo} · {horaCorta(e.creado_en)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4">
              <button
                disabled={propio || enCurso === e.id_evento}
                onClick={() => resolver(e.id_evento, "validar")}
                className="rounded-xl bg-bordo py-3 font-semibold text-crema disabled:bg-black/15 disabled:text-negro/45"
              >
                Aprobar
              </button>
              <button
                disabled={propio || enCurso === e.id_evento}
                onClick={() => resolver(e.id_evento, "rechazar")}
                className="rounded-xl border border-roja-borde py-3 font-semibold text-roja-texto disabled:border-black/10 disabled:text-negro/35"
              >
                Rechazar
              </button>
            </div>
            {propio ? (
              <p className="mt-2 text-center text-sm font-semibold text-roja-texto">No podés validar un evento que cargaste vos</p>
            ) : null}
          </article>
        );
      })}
      {aviso ? (
        <div
          role="status"
          className={`fixed inset-x-0 bottom-20 z-50 mx-auto w-[calc(100%-2rem)] max-w-[448px] rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg ${
            aviso.error ? "bg-roja-texto" : "bg-[#1f5f3a]"
          }`}
        >
          {aviso.texto}
        </div>
      ) : null}
    </div>
  );
}
