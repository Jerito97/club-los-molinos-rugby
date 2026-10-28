import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta, TituloSeccion } from "@/componentes/Tarjeta";
import { TORNEO } from "@/dominio/tipos";

export default function Inicio() {
  return (
    <>
      <Encabezado titulo="Club Los Molinos" subtitulo={`${TORNEO} · 2026`} />
      <div className="space-y-6 px-4 py-6">
        <section>
          <TituloSeccion>Último resultado</TituloSeccion>
          <Tarjeta className="p-4 text-sm text-negro/60">Cargando…</Tarjeta>
        </section>
      </div>
    </>
  );
}
