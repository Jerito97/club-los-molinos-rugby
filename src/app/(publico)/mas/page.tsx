import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta } from "@/componentes/Tarjeta";
import { usuarioActual } from "@/servicios/usuarios";
import { ConfiguracionNotificaciones } from "./ConfiguracionNotificaciones";

export const metadata: Metadata = { title: "Más" };
export const dynamic = "force-dynamic";

/** Sobre la app, configuración de notificaciones e ingreso de colaboradores y dirigentes. */
export default async function Mas() {
  const actor = await usuarioActual();
  return (
    <>
      <Encabezado titulo="Más" subtitulo="Configuración y más" />
      <div className="space-y-4 px-4 py-6">
        <Tarjeta className="p-5">
          <h2 className="font-display text-2xl text-bordo">Sobre la app</h2>
          <p className="mt-2 text-lg">Club Los Molinos · URBA, Primera C</p>
          <p className="mt-2 text-negro/60">
            Marcador en vivo, resultados, posiciones y estadísticas del club. Cada evento que se publica fue cargado en la
            cancha y validado por un dirigente.
          </p>
          <p className="mt-2 text-negro/60">
            Instalá esta app en tu celular desde el menú del navegador (&quot;Agregar a la pantalla de inicio&quot;) para
            acceder más rápido.
          </p>
        </Tarjeta>

        <ConfiguracionNotificaciones />

        <Link href={actor ? "/gestion" : "/acceso"}>
          <Tarjeta className="flex items-center justify-between p-5">
            <div>
              <h2 className="font-display text-2xl text-bordo">{actor ? "Gestión" : "Ingresar"}</h2>
              <p className="text-negro/60">
                {actor ? `Sesión de ${actor.nombre}` : "Acceso para colaboradores y dirigentes"}
              </p>
            </div>
            <ChevronRight className="text-negro/40" />
          </Tarjeta>
        </Link>
      </div>
    </>
  );
}
