import type { Metadata } from "next";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta, TituloSeccion, Vacio } from "@/componentes/Tarjeta";
import { diaMes, duracion, duracionCorta, fechaCorta } from "@/lib/formato";
import { metricasGenerales, metricasPorPartido, type MetricaPartido } from "@/servicios/metricas";
import { usuarioDePagina } from "@/servicios/usuarios";

export const metadata: Metadata = { title: "Métricas" };

const promedio = (valores: (number | null)[]) => {
  const v = valores.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Número grande con su etiqueta. */
function Dato({ valor, etiqueta, detalle }: { valor: string | number; etiqueta: string; detalle?: string }) {
  return (
    <Tarjeta className="p-4">
      <p className="font-display text-4xl leading-none text-bordo">{valor}</p>
      <p className="mt-1 text-sm font-medium">{etiqueta}</p>
      {detalle ? <p className="text-xs text-negro/50">{detalle}</p> : null}
    </Tarjeta>
  );
}

/** Barras horizontales de una sola medida por partido, con el valor escrito al lado. */
function Barras({
  titulo,
  filas,
  valor,
  formato,
}: {
  titulo: string;
  filas: MetricaPartido[];
  valor: (m: MetricaPartido) => number | null;
  formato: (n: number) => string;
}) {
  const maximo = Math.max(1, ...filas.map((f) => valor(f) ?? 0));
  return (
    <Tarjeta className="p-4">
      <h3 className="mb-3 font-semibold">{titulo}</h3>
      <ul className="space-y-2.5">
        {filas.map((f) => {
          const v = valor(f);
          return (
            <li key={f.id_partido} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2 text-sm" title={`${f.local} vs ${f.visitante}: ${v === null ? "sin datos" : formato(v)}`}>
              <span className="truncate text-negro/60">
                {diaMes(f.fecha)} {f.local === "Los Molinos" ? f.visitante : f.local}
              </span>
              <span className="h-3 rounded-full bg-black/5">
                <span className="block h-3 rounded-full bg-bordo" style={{ width: `${((v ?? 0) / maximo) * 100}%` }} />
              </span>
              <span className="text-right font-medium tabular-nums">{v === null ? "—" : formato(v)}</span>
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
}

/**
 * Métricas de desempeño del proyecto (objetivo específico 5): tiempo de
 * publicación, correcciones y rechazos, alcance de las notificaciones y uso
 * de la plataforma, por partido. Solo dirigentes.
 */
export default async function Metricas() {
  await usuarioDePagina("consultar_metricas");
  const [partidos, generales] = await Promise.all([metricasPorPartido(), metricasGenerales()]);
  if (partidos.length === 0) {
    return (
      <>
        <Encabezado titulo="Métricas" subtitulo="Desempeño del sistema" />
        <div className="px-4 py-6">
          <Vacio>Todavía no hay partidos cargados con la aplicación.</Vacio>
        </div>
      </>
    );
  }
  const tiempo = promedio(partidos.map((p) => p.tiempoPromedio));
  const sum = (k: keyof MetricaPartido) => partidos.reduce((s, p) => s + (p[k] as number), 0);
  const eventos = sum("eventosPublicados");

  return (
    <>
      <Encabezado titulo="Métricas" subtitulo={`${partidos.length} partidos cargados con la app`} />
      <div className="space-y-6 px-4 py-6">
        <section className="grid grid-cols-2 gap-3">
          <Dato valor={tiempo === null ? "—" : duracion(tiempo)} etiqueta="Carga → publicación" detalle="Promedio por evento" />
          <Dato valor={eventos ? `${((sum("correcciones") / eventos) * 100).toFixed(0)}%` : "—"} etiqueta="Correcciones" detalle={`${sum("correcciones")} sobre ${eventos} eventos`} />
          <Dato valor={sum("notificaciones")} etiqueta="Notificaciones enviadas" detalle={`${generales.espectadores} usuarios con avisos activos`} />
          <Dato valor={Math.round(sum("dispositivos") / partidos.length)} etiqueta="Dispositivos por partido" detalle={`${sum("sesiones")} sesiones en total`} />
        </section>

        <section className="space-y-3">
          <TituloSeccion>Tiempo de publicación</TituloSeccion>
          <p className="text-sm text-negro/60">
            Tiempo promedio entre que el colaborador carga un evento y un dirigente lo valida y publica (RNF 5: menos de
            30 s desde la confirmación).
          </p>
          <Barras titulo="Promedio por partido (min:seg)" filas={partidos} valor={(p) => p.tiempoPromedio} formato={duracionCorta} />
        </section>

        <section className="space-y-3">
          <TituloSeccion>Calidad de la carga</TituloSeccion>
          <Barras titulo="Correcciones y eliminaciones" filas={partidos} valor={(p) => p.correcciones} formato={String} />
          <Barras titulo="Rechazos" filas={partidos} valor={(p) => p.rechazos} formato={String} />
        </section>

        <section className="space-y-3">
          <TituloSeccion>Alcance de las notificaciones</TituloSeccion>
          <Barras titulo="Notificaciones enviadas por partido" filas={partidos} valor={(p) => p.notificaciones} formato={String} />
          <Barras titulo="Promedio por evento publicado" filas={partidos} valor={(p) => p.notificacionesPorEvento} formato={(n) => n.toFixed(1)} />
        </section>

        <section className="space-y-3">
          <TituloSeccion>Uso de la plataforma</TituloSeccion>
          <Barras titulo="Dispositivos que abrieron el marcador" filas={partidos} valor={(p) => p.dispositivos} formato={String} />
          <Barras titulo="Sesiones en el marcador" filas={partidos} valor={(p) => p.sesiones} formato={String} />
        </section>

        <section className="space-y-3">
          <TituloSeccion>Detalle por partido</TituloSeccion>
          <div className="overflow-x-auto rounded-2xl bg-[#fbf9f5] shadow-sm">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-negro/45">
                  <th className="px-3 py-2 font-medium">Partido</th>
                  <th className="px-2 py-2 text-right font-medium">Eventos</th>
                  <th className="px-2 py-2 text-right font-medium">Tiempo</th>
                  <th className="px-2 py-2 text-right font-medium">Correc.</th>
                  <th className="px-2 py-2 text-right font-medium">Rech.</th>
                  <th className="px-2 py-2 text-right font-medium">Notif.</th>
                  <th className="px-3 py-2 text-right font-medium">Disp.</th>
                </tr>
              </thead>
              <tbody>
                {partidos.map((p) => (
                  <tr key={p.id_partido} className="border-b border-black/5 last:border-0">
                    <td className="px-3 py-2">
                      {fechaCorta(p.fecha)} · {p.local === "Los Molinos" ? p.visitante : p.local}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{p.eventosPublicados}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{p.tiempoPromedio === null ? "—" : duracion(p.tiempoPromedio)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{p.correcciones}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{p.rechazos}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{p.notificaciones}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.dispositivos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
