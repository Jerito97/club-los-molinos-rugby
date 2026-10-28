import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta, TituloSeccion, Vacio } from "@/componentes/Tarjeta";
import { AutoRefresco } from "@/componentes/AutoRefresco";
import { fechaCorta } from "@/lib/formato";
import { puede } from "@/dominio/permisos";
import { TORNEO } from "@/dominio/tipos";
import { partidosParaGestion } from "@/servicios/consultas";
import { usuarioDePagina } from "@/servicios/usuarios";
import { BotonReabrir } from "./BotonReabrir";

export const metadata: Metadata = { title: "Partidos" };

const boton = "shrink-0 rounded-xl bg-bordo px-4 py-2.5 text-center text-sm font-semibold text-crema";
const botonSecundario = "shrink-0 rounded-xl border border-bordo/40 px-4 py-2.5 text-center text-sm font-semibold text-bordo";

/**
 * Lista de partidos (caso de uso "Seleccionar partido en curso"): iniciar la
 * carga en vivo de un partido programado, seguir uno en curso o ver/reabrir
 * uno ya jugado. Indica quién es el cargador asignado.
 */
export default async function PartidosGestion() {
  const actor = await usuarioDePagina("cargar_eventos");
  const partidos = await partidosParaGestion();
  const validador = puede(actor, "validar_eventos");

  const enCurso = partidos.filter((p) => p.estado === "EN_CURSO");
  const programados = partidos.filter((p) => p.estado === "PROGRAMADO");
  const jugados = partidos.filter((p) => p.estado === "FINALIZADO").reverse();

  const Fila = ({ p, children }: { p: (typeof partidos)[number]; children: React.ReactNode }) => (
    <Tarjeta className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold">
          {p.local} vs {p.visitante}
        </p>
        <p className="text-sm text-negro/55">
          {fechaCorta(p.fecha)} · Fecha {p.fecha_numero}
          {p.resultado ? ` · ${p.condicion === "LOCAL" ? `${p.resultado.club}-${p.resultado.rival}` : `${p.resultado.rival}-${p.resultado.club}`}` : ""}
        </p>
        {p.cargador ? <p className="mt-0.5 text-xs text-bordo">Cargador: {p.cargador}</p> : null}
        {validador && p.pendientes > 0 ? (
          <p className="mt-0.5 text-xs font-semibold text-amarilla-texto">{p.pendientes} pendientes de validación</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </Tarjeta>
  );

  return (
    <>
      <Encabezado titulo="Partidos" subtitulo={`${TORNEO} · ${actor.nombre}`} />
      <AutoRefresco segundos={10} />
      <div className="space-y-7 px-4 py-6">
        {enCurso.length > 0 ? (
          <section className="space-y-3">
            <TituloSeccion>En vivo</TituloSeccion>
            {enCurso.map((p) => (
              <Fila key={p.id_partido} p={p}>
                <Link href={`/gestion/partidos/${p.id_partido}/carga`} className={boton}>
                  {p.id_usuario_cargador === actor.id_usuario ? "Cargar" : "Ver carga"}
                </Link>
                {validador ? (
                  <Link href={`/gestion/partidos/${p.id_partido}/validacion`} className={botonSecundario}>
                    Validar{p.pendientes ? ` (${p.pendientes})` : ""}
                  </Link>
                ) : null}
              </Fila>
            ))}
          </section>
        ) : null}

        <section className="space-y-3">
          <TituloSeccion>Próximos</TituloSeccion>
          {programados.length === 0 ? <Vacio>No hay partidos programados.</Vacio> : null}
          {programados.map((p) => (
            <Fila key={p.id_partido} p={p}>
              <Link href={`/gestion/partidos/${p.id_partido}/iniciar`} className={boton}>
                Iniciar vivo
              </Link>
            </Fila>
          ))}
        </section>

        <section className="space-y-3">
          <TituloSeccion>Jugados</TituloSeccion>
          {jugados.map((p) => (
            <Fila key={p.id_partido} p={p}>
              <BotonReabrir id_partido={p.id_partido} />
              {validador && p.pendientes > 0 ? (
                <Link href={`/gestion/partidos/${p.id_partido}/validacion`} className={botonSecundario}>
                  Validar ({p.pendientes})
                </Link>
              ) : null}
            </Fila>
          ))}
        </section>
      </div>
    </>
  );
}
