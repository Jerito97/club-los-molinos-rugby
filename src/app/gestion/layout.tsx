import { puede } from "@/dominio/permisos";
import { usuarioDePagina } from "@/servicios/usuarios";
import { NavGestion } from "./NavGestion";

// Todas las pantallas de gestión exigen una sesión vigente. Cada página
// vuelve a verificar su propio permiso, y cada API route también.
export const dynamic = "force-dynamic";

export default async function LayoutGestion({ children }: { children: React.ReactNode }) {
  const actor = await usuarioDePagina();
  return (
    <>
      <main className="flex flex-1 flex-col">{children}</main>
      <NavGestion
        auditoria={puede(actor, "consultar_auditoria")}
        metricas={puede(actor, "consultar_metricas")}
        usuarios={puede(actor, "gestionar_usuarios")}
      />
    </>
  );
}
