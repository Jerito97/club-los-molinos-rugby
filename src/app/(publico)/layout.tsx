import { NavInferior } from "@/componentes/NavInferior";

/** Pantallas del espectador: contenido más la navegación inferior. */
export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex flex-1 flex-col">{children}</main>
      <NavInferior />
    </>
  );
}
