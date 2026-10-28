import Link from "next/link";
import { fechaCorta, horaCorta } from "@/lib/formato";
import type { ResumenPartido } from "@/servicios/consultas";

/** Fila de partido: fecha, local, marcador (o "vs") y visitante, como en la pantalla de resultados. */
export function FilaPartido({ p, conFecha = true }: { p: ResumenPartido; conFecha?: boolean }) {
  const jugado = p.resultado !== null;
  const local = p.resultado ? (p.condicion === "LOCAL" ? p.resultado.club : p.resultado.rival) : null;
  const visitante = p.resultado ? (p.condicion === "LOCAL" ? p.resultado.rival : p.resultado.club) : null;
  const gano = p.resultado && p.resultado.club > p.resultado.rival;
  return (
    <Link href={`/partidos/${p.id_partido}`} className="block px-5 py-4">
      {conFecha ? (
        <p className="mb-1 text-sm text-negro/50">
          {fechaCorta(p.fecha)}
          {!jugado ? ` · ${horaCorta(p.fecha)} h` : ""}
        </p>
      ) : null}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className="truncate text-[17px] font-medium">{p.local}</p>
        <p className={`font-display text-3xl ${jugado ? (gano ? "text-bordo" : "text-negro/60") : "text-negro/35"}`}>
          {jugado ? `${local} - ${visitante}` : "vs"}
        </p>
        <p className="truncate text-right text-[17px] font-medium">{p.visitante}</p>
      </div>
      <div className="mt-1 flex items-center justify-between text-sm text-negro/50">
        <span>{p.condicion === "LOCAL" ? "Local" : "Visitante"}</span>
        {p.estado === "EN_CURSO" ? (
          <span className="flex items-center gap-1.5 rounded-full bg-roja-fondo px-3 py-0.5 font-semibold text-roja-texto">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-roja-texto" /> En vivo
          </span>
        ) : p.estado === "PROGRAMADO" ? (
          <span className="rounded-full bg-[#ecdfe0] px-3 py-0.5 text-bordo">Programado</span>
        ) : null}
      </div>
    </Link>
  );
}
