import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/servicios/usuarios";
import { FormularioCambioPin } from "./FormularioCambioPin";

export const metadata: Metadata = { title: "Cambiar PIN" };

export default async function CambiarPin() {
  const actor = await usuarioActual();
  if (!actor) redirect("/acceso");
  return <FormularioCambioPin nombre={actor.nombre} provisorio={actor.pin_provisorio} />;
}
