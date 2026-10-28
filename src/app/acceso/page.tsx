import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/servicios/usuarios";
import { FormularioAcceso } from "./FormularioAcceso";

export const metadata: Metadata = { title: "Acceso" };

export default async function Acceso() {
  const actor = await usuarioActual();
  if (actor) redirect(actor.pin_provisorio ? "/acceso/cambiar-pin" : "/gestion");
  return <FormularioAcceso />;
}
