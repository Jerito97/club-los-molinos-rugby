import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Encabezado } from "@/componentes/Encabezado";
import { AutoRefresco } from "@/componentes/AutoRefresco";
import { fechaCorta } from "@/lib/formato";
import { puede } from "@/dominio/permisos";
import { datosCarga, habilitadosParaCargar, plantel } from "@/servicios/consultas";
import { usuarioDePagina } from "@/servicios/usuarios";
import { PanelCarga } from "./PanelCarga";

export const metadata: Metadata = { title: "Carga en vivo" };

/** Carga de eventos en vivo (caso de uso "Cargar evento deportivo"). */
export default async function Carga({ params }: { params: Promise<{ id: string }> }) {
  const actor = await usuarioDePagina("cargar_eventos");
  const id = Number((await params).id);
  const datos = await datosCarga(id);
  if (!datos) notFound();
  if (datos.estado === "PROGRAMADO") redirect(`/gestion/partidos/${id}/iniciar`);
  const [jugadores, habilitados] = await Promise.all([
    plantel(),
    puede(actor, "reasignar_cargador") ? habilitadosParaCargar() : Promise.resolve([]),
  ]);

  return (
    <>
      <Encabezado
        titulo={`${datos.local} vs ${datos.visitante}`}
        subtitulo={`${fechaCorta(datos.fecha)} · Carga en vivo`}
        volver="/gestion/partidos"
      />
      <AutoRefresco segundos={5} />
      <PanelCarga
        datos={datos}
        jugadores={jugadores.map((j) => ({ id: j.id_jugador, nombre: j.nombre, numero: j.nro_camiseta }))}
        actor={{ id_usuario: actor.id_usuario, puedeValidar: puede(actor, "validar_eventos"), puedeReasignar: puede(actor, "reasignar_cargador") }}
        habilitados={habilitados}
      />
    </>
  );
}
