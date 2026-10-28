import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/componentes/Encabezado";
import { AutoRefresco } from "@/componentes/AutoRefresco";
import { RegistrarVisita } from "@/componentes/RegistrarVisita";
import { fechaCorta } from "@/lib/formato";
import { vistaMarcador } from "@/servicios/consultas";
import { MarcadorEnVivo } from "./MarcadorEnVivo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vista = await vistaMarcador(Number((await params).id));
  return { title: vista ? `${vista.local} vs ${vista.visitante}` : "Partido" };
}

/** Marcador en vivo y detalle de un partido (caso de uso "Ver marcador en vivo"). */
export default async function Partido({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const vista = await vistaMarcador(id);
  if (!vista) notFound();
  return (
    <>
      <Encabezado titulo={`${vista.local} vs ${vista.visitante}`} subtitulo={fechaCorta(vista.fecha)} volver="/partidos" />
      {vista.estado === "EN_CURSO" ? <AutoRefresco segundos={5} /> : null}
      <RegistrarVisita id_partido={id} />
      <MarcadorEnVivo vista={vista} />
    </>
  );
}
