import Link from "next/link";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta, TituloSeccion, Vacio } from "@/componentes/Tarjeta";
import { FilaPartido } from "@/componentes/TarjetaPartido";
import { TablaPosiciones } from "@/componentes/TablaPosiciones";
import { AutoRefresco } from "@/componentes/AutoRefresco";
import { TORNEO } from "@/dominio/tipos";
import { inicio } from "@/servicios/consultas";

export const dynamic = "force-dynamic";

/**
 * Pantalla principal del espectador: partido en vivo (si lo hay), último
 * resultado, próximo partido y tabla de posiciones. Si no hay un partido en
 * curso, se muestra el último resultado disponible.
 */
export default async function Inicio() {
  const datos = await inicio();
  const temporada = datos.posiciones[0]?.temporada ?? new Date().getFullYear();
  return (
    <>
      <Encabezado titulo="Club Los Molinos" subtitulo={`${TORNEO} · ${temporada}`} />
      {datos.enVivo.length > 0 ? <AutoRefresco segundos={10} /> : null}
      <div className="space-y-7 px-4 py-6">
        {datos.enVivo.map((p) => (
          <section key={p.id_partido}>
            <TituloSeccion>En vivo</TituloSeccion>
            <Tarjeta className="border border-roja-borde/60">
              <FilaPartido p={p} />
              <Link href={`/partidos/${p.id_partido}`} className="block border-t border-black/5 py-3 text-center font-semibold text-bordo">
                Ver marcador en vivo
              </Link>
            </Tarjeta>
          </section>
        ))}

        <section>
          <TituloSeccion>Último resultado</TituloSeccion>
          {datos.ultimo ? (
            <Tarjeta>
              <FilaPartido p={datos.ultimo} />
            </Tarjeta>
          ) : (
            <Vacio>Todavía no se jugaron partidos.</Vacio>
          )}
        </section>

        <section>
          <TituloSeccion>Próximo partido</TituloSeccion>
          {datos.proximo ? (
            <Tarjeta>
              <FilaPartido p={datos.proximo} />
            </Tarjeta>
          ) : (
            <Vacio>No hay partidos programados.</Vacio>
          )}
        </section>

        <section>
          <TituloSeccion>Posiciones</TituloSeccion>
          {datos.posiciones.length ? <TablaPosiciones filas={datos.posiciones} /> : <Vacio>Sin tabla de posiciones.</Vacio>}
        </section>
      </div>
    </>
  );
}
