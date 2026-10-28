"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import type { FilaRanking } from "@/servicios/estadisticas";

const ORDENES = [
  ["puntos", "Puntos"],
  ["tries", "Tries"],
  ["partidos", "Partidos"],
  ["minutos", "Minutos"],
  ["az", "A-Z"],
] as const;
type Orden = (typeof ORDENES)[number][0];

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/** Historia de jugadores: buscador y orden por puntos, tries, partidos, minutos o A-Z. */
export function RankingJugadores({ filas }: { filas: FilaRanking[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("puntos");

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtradas = filas.filter((f) => !texto || f.nombre.toLowerCase().includes(texto) || String(f.nro_camiseta) === texto);
    return filtradas.sort((a, b) =>
      orden === "az" ? a.nombre.localeCompare(b.nombre, "es") : b[orden] - a[orden] || a.nombre.localeCompare(b.nombre, "es")
    );
  }, [filas, busqueda, orden]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl bg-[#fbf9f5] p-4 shadow-sm shadow-black/5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bordo text-crema">
          <Users size={26} />
        </span>
        <div>
          <p className="font-display text-2xl leading-none text-bordo">{filas.length} jugadores registrados</p>
          <p className="mt-1 text-sm text-negro/60">Estadísticas de tries, puntos y participación en el club.</p>
        </div>
      </div>
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-negro/40" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar jugador…"
          className="w-full rounded-full border border-black/10 bg-[#fbf9f5] py-3 pl-11 pr-4"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ORDENES.map(([clave, etiqueta]) => (
          <button
            key={clave}
            onClick={() => setOrden(clave)}
            className={`shrink-0 rounded-full px-4 py-2 text-[15px] ${orden === clave ? "bg-bordo text-crema" : "bg-[#e5d9d0] text-bordo"}`}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p className="rounded-2xl bg-white/60 px-4 py-6 text-center text-sm text-negro/55">No hay jugadores con ese nombre.</p>
      ) : (
        <ol className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-[#fbf9f5] shadow-sm shadow-black/5">
          {lista.map((f, i) => (
            <li key={f.id_jugador}>
              <Link href={`/estadisticas/jugadores/${f.id_jugador}`} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
                    i === 0 && orden !== "az" ? "bg-[#f2c94c] font-bold text-negro" : "bg-black/5 text-negro/55"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ecdfe0] font-semibold text-bordo">
                  {iniciales(f.nombre)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px]">{f.nombre}</span>
                  <span className="text-xs text-negro/45">Camiseta {f.nro_camiseta}</span>
                </span>
                {orden !== "az" ? (
                  <span className="font-display text-2xl text-bordo">{f[orden]}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
