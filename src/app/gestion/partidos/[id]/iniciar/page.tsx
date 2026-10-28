import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Encabezado } from "@/componentes/Encabezado";
import { fechaCorta } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { equipos, plantel } from "@/servicios/consultas";
import { usuarioDePagina } from "@/servicios/usuarios";
import { SelectorTitulares } from "./SelectorTitulares";

export const metadata: Metadata = { title: "Iniciar vivo" };

/** Antes de iniciar la carga en vivo se eligen los quince titulares. */
export default async function IniciarPartido({ params }: { params: Promise<{ id: string }> }) {
  await usuarioDePagina("cargar_eventos");
  const id = Number((await params).id);
  const partido = await prisma.partido.findUnique({ where: { id_partido: id }, include: { rival: true } });
  if (!partido) notFound();
  if (partido.estado !== "PROGRAMADO") redirect(`/gestion/partidos/${id}/carga`);
  const { local, visitante } = equipos(partido.rival.nombre, partido.condicion);
  const jugadores = await plantel();
  return (
    <>
      <Encabezado titulo="Titulares" subtitulo={`${local} vs ${visitante} · ${fechaCorta(partido.fecha)}`} volver="/gestion/partidos" />
      <SelectorTitulares
        id_partido={id}
        jugadores={jugadores.map((j) => ({ id: j.id_jugador, nombre: j.nombre, numero: j.nro_camiseta }))}
      />
    </>
  );
}
