import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/componentes/Encabezado";
import { Vacio } from "@/componentes/Tarjeta";
import { fechaCorta, fechaYHora } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { ETIQUETA_ACCION } from "@/dominio/auditoria";
import { ROL } from "@/dominio/tipos";
import { consultarAuditoria } from "@/servicios/auditoria-consulta";
import { equipos } from "@/servicios/consultas";
import { usuarioDePagina } from "@/servicios/usuarios";

export const metadata: Metadata = { title: "Auditoría" };

type Busqueda = { partido?: string; usuario?: string; accion?: string; pagina?: string };

/**
 * Registro de auditoría (RF 8): quién cargó, corrigió, validó o rechazó cada
 * dato y cuándo, con el valor anterior y el nuevo. Es de solo lectura.
 */
export default async function Auditoria({ searchParams }: { searchParams: Promise<Busqueda> }) {
  await usuarioDePagina("consultar_auditoria");
  const b = await searchParams;
  const filtros = {
    partido: Number(b.partido) || undefined,
    usuario: Number(b.usuario) || undefined,
    accion: b.accion && b.accion in ETIQUETA_ACCION ? b.accion : undefined,
    pagina: Number(b.pagina) || 1,
  };
  const [datos, partidos, usuarios] = await Promise.all([
    consultarAuditoria(filtros),
    prisma.partido.findMany({
      where: { OR: [{ eventos: { some: {} } }, { estado: "EN_CURSO" }] },
      include: { rival: true },
      orderBy: { fecha: "desc" },
    }),
    prisma.usuario.findMany({
      where: { rol: { nombre: { not: ROL.ESPECTADOR } } },
      select: { id_usuario: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  const url = (pagina: number) =>
    `/gestion/auditoria?${new URLSearchParams({
      ...(filtros.partido ? { partido: String(filtros.partido) } : {}),
      ...(filtros.usuario ? { usuario: String(filtros.usuario) } : {}),
      ...(filtros.accion ? { accion: filtros.accion } : {}),
      pagina: String(pagina),
    })}`;
  const select = "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm";

  return (
    <>
      <Encabezado titulo="Auditoría" subtitulo={`${datos.total} registros`} />
      <div className="space-y-4 px-4 py-5">
        <form className="grid grid-cols-2 gap-2" action="/gestion/auditoria">
          <select name="partido" defaultValue={filtros.partido ?? ""} className={`${select} col-span-2`} aria-label="Partido">
            <option value="">Todos los partidos</option>
            {partidos.map((p) => {
              const { local, visitante } = equipos(p.rival.nombre, p.condicion);
              return (
                <option key={p.id_partido} value={p.id_partido}>
                  {fechaCorta(p.fecha)} · {local} vs {visitante}
                </option>
              );
            })}
          </select>
          <select name="usuario" defaultValue={filtros.usuario ?? ""} className={select} aria-label="Usuario">
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nombre}
              </option>
            ))}
          </select>
          <select name="accion" defaultValue={filtros.accion ?? ""} className={select} aria-label="Acción">
            <option value="">Todas las acciones</option>
            {Object.entries(ETIQUETA_ACCION).map(([clave, etiqueta]) => (
              <option key={clave} value={clave}>
                {etiqueta}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-bordo py-2.5 text-sm font-semibold text-crema">Filtrar</button>
          <Link href="/gestion/auditoria" className="rounded-xl border border-bordo/30 py-2.5 text-center text-sm font-semibold text-bordo">
            Limpiar
          </Link>
        </form>

        {datos.registros.length === 0 ? (
          <Vacio>No hay registros con esos filtros.</Vacio>
        ) : (
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-[#fbf9f5] shadow-sm">
            {datos.registros.map((r) => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{r.accion}</p>
                  <p className="shrink-0 text-xs tabular-nums text-negro/50">{fechaYHora(r.fecha_hora)}</p>
                </div>
                <p className="text-negro/65">
                  {r.usuario}
                  {r.evento ? ` · ${r.evento}` : ""}
                  {r.ip ? ` · IP ${r.ip}` : ""}
                </p>
                {r.cambios.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 rounded-lg bg-black/[0.03] px-3 py-2 text-xs">
                    {r.cambios.map((c) => (
                      <li key={c.campo}>
                        <span className="text-negro/50">{c.campo}: </span>
                        {c.antes !== null ? <span className="text-negro/60 line-through decoration-negro/30">{c.antes}</span> : null}
                        {c.antes !== null && c.despues !== null ? <span className="text-negro/40"> → </span> : null}
                        {c.despues !== null ? <span className="font-medium">{c.despues}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {datos.paginas > 1 ? (
          <nav className="flex items-center justify-between text-sm">
            {datos.pagina > 1 ? (
              <Link href={url(datos.pagina - 1)} className="rounded-xl border border-bordo/30 px-4 py-2 text-bordo">
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-negro/55">
              Página {datos.pagina} de {datos.paginas}
            </span>
            {datos.pagina < datos.paginas ? (
              <Link href={url(datos.pagina + 1)} className="rounded-xl border border-bordo/30 px-4 py-2 text-bordo">
                Siguiente
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </>
  );
}
