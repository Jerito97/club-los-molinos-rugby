"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, Menu } from "lucide-react";

const SOLAPAS = [
  { href: "/", etiqueta: "Inicio", Icono: Home },
  { href: "/partidos", etiqueta: "Partidos", Icono: CalendarDays },
  { href: "/estadisticas", etiqueta: "Estadísticas", Icono: BarChart3 },
  { href: "/mas", etiqueta: "Más", Icono: Menu },
] as const;

/** Navegación inferior fija del espectador. */
export function NavInferior() {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-30 mt-auto bg-nav pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {SOLAPAS.map(({ href, etiqueta, Icono }) => {
          const activa = href === "/" ? ruta === "/" : ruta.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  activa ? "text-crema" : "text-crema/50"
                }`}
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
