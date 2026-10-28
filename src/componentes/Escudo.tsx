import Image from "next/image";

/** Escudo del Club Los Molinos. */
export function Escudo({ tamano = 40, className = "" }: { tamano?: number; className?: string }) {
  return (
    <Image
      src="/escudo.png"
      alt="Escudo del Club Los Molinos"
      width={Math.round(tamano * 0.8)}
      height={tamano}
      className={`object-contain ${className}`}
      priority
    />
  );
}
