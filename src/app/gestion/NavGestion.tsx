"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, ListChecks, UserCircle, Users } from "lucide-react";

/** Navegación inferior de la sección de gestión. Solo muestra lo que el rol puede usar. */
export function NavGestion({ auditoria, metricas, usuarios }: { auditoria: boolean; metricas: boolean; usuarios: boolean }) {
  const ruta = usePathname();
  const solapas = [
    { href: "/gestion/partidos", etiqueta: "Partidos", Icono: ListChecks, ver: true },
    { href: "/gestion/auditoria", etiqueta: "Auditoría", Icono: ClipboardList, ver: auditoria },
    { href: "/gestion/metricas", etiqueta: "Métricas", Icono: BarChart3, ver: metricas },
    { href: "/gestion/usuarios", etiqueta: "Usuarios", Icono: Users, ver: usuarios },
    { href: "/gestion/cuenta", etiqueta: "Cuenta", Icono: UserCircle, ver: true },
  ].filter((s) => s.ver);
  return (
    <nav aria-label="Navegación de gestión" className="sticky bottom-0 z-30 mt-auto bg-nav pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {solapas.map(({ href, etiqueta, Icono }) => {
          const activa = ruta.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${activa ? "text-crema" : "text-crema/50"}`}
              >
                <Icono size={22} strokeWidth={activa ? 2.3 : 1.7} />
                {etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
