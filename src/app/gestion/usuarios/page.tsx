import type { Metadata } from "next";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta, TituloSeccion } from "@/componentes/Tarjeta";
import { horaCorta } from "@/lib/formato";
import { avisosDeSeguridad, listarUsuarios } from "@/servicios/gestion-usuarios";
import { usuarioDePagina } from "@/servicios/usuarios";
import { PanelUsuarios } from "./PanelUsuarios";

export const metadata: Metadata = { title: "Usuarios" };

/** Panel del responsable de seguridad: alta, baja lógica y blanqueo de PIN, y avisos de bloqueos. */
export default async function Usuarios() {
  const actor = await usuarioDePagina("gestionar_usuarios");
  const [usuarios, avisos] = await Promise.all([listarUsuarios(), avisosDeSeguridad()]);
  return (
    <>
      <Encabezado titulo="Usuarios" subtitulo="Responsable de seguridad" />
      <div className="space-y-6 px-4 py-6">
        <section>
          <TituloSeccion>Seguridad</TituloSeccion>
          {avisos.repetidos ? (
            <div role="alert" className="mb-3 rounded-2xl border border-roja-borde bg-roja-fondo p-4 text-sm text-roja-texto">
              <p className="font-semibold">Hoy hubo {avisos.hoy.length} bloqueos de dispositivos por PIN incorrecto.</p>
              <p className="mt-1">Revisá en la auditoría desde qué direcciones se intentó ingresar.</p>
            </div>
          ) : null}
          <Tarjeta className="p-4 text-sm">
            {avisos.hoy.length === 0 ? (
              <p className="text-negro/60">No hubo dispositivos bloqueados hoy.</p>
            ) : (
              <ul className="space-y-1">
                {avisos.hoy.map((b) => (
                  <li key={b.id_registro}>
                    {horaCorta(b.fecha_hora)} h · bloqueo de 15 min · IP {b.ip ?? "desconocida"}
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </section>
        <PanelUsuarios
          id_actual={actor.id_usuario}
          usuarios={usuarios.map((u) => ({
            id_usuario: u.id_usuario,
            nombre: u.nombre,
            rol: u.rol.nombre,
            activo: u.activo,
            pin_provisorio: u.pin_provisorio,
            responsable: u.es_responsable_seguridad,
          }))}
        />
      </div>
    </>
  );
}
