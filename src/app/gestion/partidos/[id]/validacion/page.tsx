import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/componentes/Encabezado";
import { AutoRefresco } from "@/componentes/AutoRefresco";
import { fechaCorta } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { equipos, pendientesDeValidacion } from "@/servicios/consultas";
import { usuarioDePagina } from "@/servicios/usuarios";
import { ListaPendientes } from "./ListaPendientes";

export const metadata: Metadata = { title: "Validación" };

/** Panel de eventos pendientes (caso de uso "Validar evento cargado"). Solo dirigentes. */
export default async function Validacion({ params }: { params: Promise<{ id: string }> }) {
  const actor = await usuarioDePagina("validar_eventos");
  const id = Number((await params).id);
  const partido = await prisma.partido.findUnique({ where: { id_partido: id }, include: { rival: true } });
  if (!partido) notFound();
  const { local, visitante } = equipos(partido.rival.nombre, partido.condicion);
  const pendientes = await pendientesDeValidacion(id);
  return (
    <>
      <Encabezado
        titulo="Eventos pendientes de validación"
        subtitulo={`${local} vs ${visitante} · ${fechaCorta(partido.fecha)}`}
        volver={`/gestion/partidos/${id}/carga`}
      />
      <AutoRefresco segundos={5} />
      <ListaPendientes pendientes={pendientes} rival={partido.rival.nombre} id_usuario={actor.id_usuario} />
    </>
  );
}
