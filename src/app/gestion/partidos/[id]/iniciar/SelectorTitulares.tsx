"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { CANTIDAD_TITULARES } from "@/dominio/partido";

type Jugador = { id: number; nombre: string; numero: number };

/** Selección de los titulares y confirmación de "Iniciar vivo". */
export function SelectorTitulares({ id_partido, jugadores }: { id_partido: number; jugadores: Jugador[] }) {
  const router = useRouter();
  // Se proponen los habituales del 1 al 15; el colaborador ajusta los cambios.
  const [elegidos, setElegidos] = useState<Set<number>>(
    () => new Set(jugadores.filter((j) => j.numero <= CANTIDAD_TITULARES).map((j) => j.id))
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alternar = (id: number) =>
    setElegidos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  async function iniciar() {
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/partidos/${id_partido}/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulares: [...elegidos] }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviando(false);
      return;
    }
    router.replace(`/gestion/partidos/${id_partido}/carga`);
  }

  const completo = elegidos.size === CANTIDAD_TITULARES;

  return (
    <div className="flex flex-1 flex-col">
      <p className="px-4 pt-5 text-sm text-negro/65">
        Marcá los {CANTIDAD_TITULARES} jugadores que arrancan el partido. Al iniciar el vivo quedás como cargador
        asignado: solo vos vas a poder cargar eventos de este partido.
      </p>
      <ul className="mx-4 my-4 divide-y divide-black/5 overflow-hidden rounded-2xl bg-[#fbf9f5]">
        {jugadores.map((j) => {
          const activo = elegidos.has(j.id);
          return (
            <li key={j.id}>
              <button onClick={() => alternar(j.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="font-display w-8 text-xl text-bordo">{j.numero}</span>
                <span className="flex-1">{j.nombre}</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                    activo ? "border-bordo bg-bordo text-crema" : "border-black/20"
                  }`}
                >
                  {activo ? <Check size={16} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 mt-auto space-y-2 bg-crema/95 px-4 pb-6 pt-3 backdrop-blur">
        {error ? <p className="text-center text-sm font-semibold text-roja-texto">{error}</p> : null}
        <button
          onClick={iniciar}
          disabled={!completo || enviando}
          className="w-full rounded-xl bg-bordo py-4 text-lg font-semibold text-crema disabled:opacity-50"
        >
          {enviando ? "Iniciando…" : completo ? "Iniciar vivo" : `Titulares: ${elegidos.size} de ${CANTIDAD_TITULARES}`}
        </button>
      </div>
    </div>
  );
}
