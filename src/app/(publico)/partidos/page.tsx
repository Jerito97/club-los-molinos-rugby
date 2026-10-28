import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta, Vacio } from "@/componentes/Tarjeta";
import { FilaPartido } from "@/componentes/TarjetaPartido";
import { TORNEO } from "@/dominio/tipos";
import { partidosPublicos } from "@/servicios/consultas";

export const metadata: Metadata = { title: "Partidos" };
export const dynamic = "force-dynamic";

/** Fixture del club: próximos partidos y resultados, agrupados por fecha del torneo. */
export default async function Partidos({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const vista = (await searchParams).vista === "proximos" ? "proximos" : "resultados";
  const todos = await partidosPublicos();
  const temporada = todos[0] ? new Date(todos[0].fecha).getFullYear() : "";
  const lista =
    vista === "proximos"
      ? todos.filter((p) => p.estado !== "FINALIZADO")
      : todos.filter((p) => p.estado === "FINALIZADO").reverse();

  return (
    <>
      <Encabezado titulo="Partidos" subtitulo={`${TORNEO} · ${temporada}`} />
      <div className="space-y-5 px-4 py-6">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["proximos", "Próximos partidos"],
              ["resultados", "Resultados"],
            ] as const
          ).map(([clave, etiqueta]) => (
            <Link
              key={clave}
              href={`/partidos?vista=${clave}`}
              className={`rounded-full py-3 text-center text-[16px] font-medium ${
                vista === clave ? "bg-bordo text-crema" : "bg-[#e5d9d0] text-bordo"
              }`}
            >
              {etiqueta}
            </Link>
          ))}
        </div>
        <p className="text-negro/55">Tocá un partido para ver el detalle y el minuto a minuto.</p>
        {lista.length === 0 ? (
          <Vacio>{vista === "proximos" ? "No hay partidos programados." : "Todavía no hay resultados."}</Vacio>
        ) : (
          <Tarjeta className="divide-y divide-black/5 overflow-hidden">
            {lista.map((p) => (
              <div key={p.id_partido}>
                <p className="px-5 pt-4 text-sm font-semibold uppercase tracking-wide text-bordo/80">Fecha {p.fecha_numero}</p>
                <FilaPartido p={p} />
              </div>
            ))}
          </Tarjeta>
        )}
      </div>
    </>
  );
}
