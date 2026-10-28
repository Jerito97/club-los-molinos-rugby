import { Encabezado } from "@/componentes/Encabezado";
import { usuarioDePagina } from "@/servicios/usuarios";

export default async function PartidosGestion() {
  const actor = await usuarioDePagina("cargar_eventos");
  return <Encabezado titulo="Partidos" subtitulo={actor.nombre} />;
}
