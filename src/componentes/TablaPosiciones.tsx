import { NOMBRE_CLUB } from "@/dominio/tipos";

type Fila = { puesto: number; equipo: string; pj: number; pg: number; pe: number; pp: number; dif: number; pts: number };

/** Tabla de posiciones del torneo, con el club resaltado. */
export function TablaPosiciones({ filas }: { filas: Fila[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#fbf9f5] shadow-sm shadow-black/5">
      <table className="w-full text-[15px]">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wider text-negro/45">
            <th className="py-3 pl-4 font-medium">#</th>
            <th className="py-3 font-medium">Equipo</th>
            <th className="py-3 text-center font-medium">PJ</th>
            <th className="py-3 text-center font-medium">PG</th>
            <th className="py-3 text-center font-medium">PE</th>
            <th className="py-3 text-center font-medium">PP</th>
            <th className="py-3 text-center font-medium">Dif</th>
            <th className="py-3 pr-4 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const club = f.equipo === NOMBRE_CLUB;
            return (
              <tr key={f.equipo} className={`border-b border-black/5 last:border-0 ${club ? "bg-[#ecdfe0] font-semibold text-bordo" : ""}`}>
                <td className="py-2.5 pl-4 text-negro/50">{f.puesto}</td>
                <td className="max-w-[9rem] truncate py-2.5">{f.equipo}</td>
                <td className="py-2.5 text-center">{f.pj}</td>
                <td className="py-2.5 text-center">{f.pg}</td>
                <td className="py-2.5 text-center">{f.pe}</td>
                <td className="py-2.5 text-center">{f.pp}</td>
                <td className="py-2.5 text-center">{f.dif}</td>
                <td className="py-2.5 pr-4 text-center font-bold">{f.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
