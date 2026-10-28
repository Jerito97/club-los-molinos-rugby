import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta, TituloSeccion, Vacio } from "@/componentes/Tarjeta";
import { fechaCorta } from "@/lib/formato";
import { detalleJugador } from "@/servicios/estadisticas";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await detalleJugador(Number((await params).id));
  return { title: d?.jugador.nombre ?? "Jugador" };
}

/** Jugador.historialEstadistico(): totales y detalle partido por partido. */
export default async function DetalleJugador({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const d = await detalleJugador(id);
  if (!d) notFound();
  const t = d.total;
  return (
    <>
      <Encabezado titulo={d.jugador.nombre} subtitulo={`Camiseta ${d.jugador.nro_camiseta}`} volver="/estadisticas" />
      <div className="space-y-6 px-4 py-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Puntos", t.puntos],
            ["Tries", t.tries],
            ["Partidos", t.partidos],
            ["Minutos", t.minutos],
            ["Conversiones", t.conversiones],
            ["Penales", t.penales],
            ["Drops", t.drops],
            ["Amarillas", t.amarillas],
            ["Rojas", t.rojas],
          ].map(([etiqueta, valor]) => (
            <Tarjeta key={etiqueta} className="px-3 py-3 text-center">
              <p className="font-display text-3xl text-bordo">{valor}</p>
              <p className="text-xs text-negro/55">{etiqueta}</p>
            </Tarjeta>
          ))}
        </div>
        <section>
          <TituloSeccion>Partido por partido</TituloSeccion>
          {d.detalle.length === 0 ? (
            <Vacio>Todavía no tiene partidos registrados.</Vacio>
          ) : (
            <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-[#fbf9f5] shadow-sm">
              {d.detalle.map((p) => (
                <li key={p.id_partido}>
                  <Link href={`/partidos/${p.id_partido}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">vs {p.rival}</p>
                      <p className="text-sm text-negro/50">
                        {fechaCorta(p.fecha)} · {p.minutos}&apos; jugados
                        {p.tries ? ` · ${p.tries} ${p.tries === 1 ? "try" : "tries"}` : ""}
                        {p.tarjetas ? ` · ${p.tarjetas} tarjeta${p.tarjetas > 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                    <span className="font-display text-2xl text-bordo">
                      {p.puntos} <span className="text-sm text-negro/45">pts</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
