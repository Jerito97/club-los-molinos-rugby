import type { MetadataRoute } from "next";

// Manifest de la aplicación web progresiva (PWA). Permite agregarla a la
// pantalla de inicio, requisito de iOS para recibir notificaciones push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Club Los Molinos",
    short_name: "Los Molinos",
    description: "Marcador en vivo, resultados y estadísticas del Club Los Molinos.",
    lang: "es-AR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F3EEE6",
    theme_color: "#4A1219",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
