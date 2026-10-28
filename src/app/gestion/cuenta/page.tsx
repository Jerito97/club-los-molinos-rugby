import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/componentes/Encabezado";
import { Tarjeta } from "@/componentes/Tarjeta";
import { HORAS_SESION } from "@/lib/sesion";
import { ROL } from "@/dominio/tipos";
import { usuarioDePagina } from "@/servicios/usuarios";
import { puede } from "@/dominio/permisos";
import { BotonReiniciar } from "./BotonReiniciar";
import { BotonSalir } from "./BotonSalir";

export const metadata: Metadata = { title: "Cuenta" };

const ROL_VISIBLE = { [ROL.CARGADOR]: "Colaborador (carga)", [ROL.VALIDADOR]: "Dirigente (validación)", [ROL.ESPECTADOR]: "Espectador" };

export default async function Cuenta() {
  const actor = await usuarioDePagina();
  return (
    <>
      <Encabezado titulo="Mi cuenta" subtitulo={actor.nombre} />
      <div className="space-y-4 px-4 py-6">
        <Tarjeta className="space-y-1 p-5">
          <p className="text-lg font-semibold">{actor.nombre}</p>
          <p className="text-sm text-negro/60">{ROL_VISIBLE[actor.rol]}</p>
          {actor.es_responsable_seguridad ? <p className="text-sm text-bordo">Responsable de seguridad</p> : null}
          <p className="pt-2 text-xs text-negro/50">La sesión vence a las {HORAS_SESION} horas de haber ingresado.</p>
        </Tarjeta>
        <Link href="/acceso/cambiar-pin" className="block rounded-xl border border-bordo/30 bg-white/70 py-3 text-center font-semibold text-bordo">
          Cambiar mi PIN
        </Link>
        <Link href="/" className="block rounded-xl border border-bordo/30 bg-white/70 py-3 text-center font-semibold text-bordo">
          Ir a la app
        </Link>
        <BotonSalir />
        {puede(actor, "reiniciar_datos") ? (
          <Tarjeta className="space-y-2 p-4">
            <p className="text-sm text-negro/60">
              Vuelve todos los datos al estado inicial: partidos, eventos, auditoría, usuarios y notificaciones.
            </p>
            <BotonReiniciar />
          </Tarjeta>
        ) : null}
      </div>
    </>
  );
}
