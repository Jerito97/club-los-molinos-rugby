import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta, TituloSeccion, Vacio } from "@/componentes/Tarjeta";
import { porRival, porTemporada, rankingJugadores } from "@/servicios/estadisticas";
import { RankingJugadores } from "./RankingJugadores";

export const metadata: Metadata = { title: "Estadísticas" };
export const dynamic = "force-dynamic";

const VISTAS = [
  ["jugadores", "Jugadores"],
  ["rivales", "Rivales"],
  ["temporada", "Temporada"],
] as const;

/**
 * Consultar estadísticas (RF 10): el usuario elige el criterio (jugador,
 * rival o temporada) y el sistema procesa los eventos publicados.
 */
export default async function Estadisticas({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const pedida = (await searchParams).vista;
  const vista = VISTAS.find(([v]) => v === pedida)?.[0] ?? "jugadores";

  return (
    <>
      <Encabezado titulo={vista === "jugadores" ? "Historia de jugadores" : "Estadísticas"} subtitulo="Calculadas con los eventos publicados" />
      <div className="space-y-5 px-4 py-6">
        <div className="grid grid-cols-3 gap-2">
          {VISTAS.map(([clave, etiqueta]) => (
            <Link
              key={clave}
              href={`/estadisticas?vista=${clave}`}
              className={`rounded-full py-2.5 text-center text-[15px] font-medium ${
                vista === clave ? "bg-bordo text-crema" : "bg-[#e5d9d0] text-bordo"
              }`}
            >
              {etiqueta}
            </Link>
          ))}
        </div>
        {vista === "jugadores" ? <Jugadores /> : vista === "rivales" ? <Rivales /> : <Temporada />}
      </div>
    </>
  );
}

async function Jugadores() {
  const filas = await rankingJugadores();
  return <RankingJugadores filas={filas} />;
}

async function Rivales() {
  const filas = await porRival();
  if (filas.length === 0) return <Vacio>No hay datos para este criterio todavía.</Vacio>;
  return (
    <div className="overflow-hidden rounded-2xl bg-[#fbf9f5] shadow-sm shadow-black/5">
      <table className="w-full text-[15px]">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wider text-negro/45">
            <th className="py-3 pl-4 font-medium">Rival</th>
            <th className="py-3 text-center font-medium">PJ</th>
            <th className="py-3 text-center font-medium">PG</th>
            <th className="py-3 text-center font-medium">PE</th>
            <th className="py-3 text-center font-medium">PP</th>
            <th className="py-3 text-center font-medium">PF</th>
            <th className="py-3 pr-4 text-center font-medium">PC</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((r) => (
            <tr key={r.id_rival} className="border-b border-black/5 last:border-0">
              <td className="max-w-[9rem] truncate py-2.5 pl-4 font-medium">{r.rival}</td>
              <td className="py-2.5 text-center">{r.pj}</td>
              <td className="py-2.5 text-center">{r.pg}</td>
              <td className="py-2.5 text-center">{r.pe}</td>
              <td className="py-2.5 text-center">{r.pp}</td>
              <td className="py-2.5 text-center">{r.puntos_favor}</td>
              <td className="py-2.5 pr-4 text-center">{r.puntos_contra}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-black/5 px-4 py-3 text-xs text-negro/50">
        PF: puntos a favor · PC: puntos en contra. Incluye los partidos cargados en vivo con la app.
      </p>
    </div>
  );
}

async function Temporada() {
  const temporadas = await porTemporada();
  if (temporadas.length === 0) return <Vacio>No hay datos para este criterio todavía.</Vacio>;
  return (
    <>
      {temporadas.map((t) => (
        <section key={t.temporada} className="space-y-4">
          <TituloSeccion>Temporada {t.temporada}</TituloSeccion>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Partidos", t.pj],
              ["Ganados", t.pg],
              ["Empatados", t.pe],
              ["Perdidos", t.pp],
              ["Puntos a favor", t.puntos_favor],
              ["Puntos en contra", t.puntos_contra],
              ["Tries", t.tries],
              ["Tarjetas", t.tarjetas],
              ["Diferencia", t.puntos_favor - t.puntos_contra],
            ].map(([etiqueta, valor]) => (
              <Tarjeta key={etiqueta} className="px-3 py-3 text-center">
                <p className="font-display text-3xl text-bordo">{valor}</p>
                <p className="text-xs text-negro/55">{etiqueta}</p>
              </Tarjeta>
            ))}
          </div>
          <Podio titulo="Goleadores" filas={t.goleadores.map((g) => ({ ...g, valor: g.puntos, unidad: "pts" }))} />
          <Podio titulo="Tries" filas={t.tryman.map((g) => ({ ...g, valor: g.tries, unidad: "tries" }))} />
        </section>
      ))}
    </>
  );
}

function Podio({ titulo, filas }: { titulo: string; filas: { id_jugador: number; nombre: string; valor: number; unidad: string }[] }) {
  return (
    <Tarjeta className="p-4">
      <h3 className="font-display mb-2 text-xl text-bordo">{titulo}</h3>
      <ol className="space-y-2">
        {filas.map((f, i) => (
          <li key={f.id_jugador}>
            <Link href={`/estadisticas/jugadores/${f.id_jugador}`} className="flex items-center gap-3">
              <span className="w-5 text-negro/45">{i + 1}</span>
              <span className="flex-1">{f.nombre}</span>
              <span className="font-display text-xl text-bordo">
                {f.valor} <span className="text-sm text-negro/45">{f.unidad}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}
