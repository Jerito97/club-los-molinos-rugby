import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // El service worker se sirve sin caché para que los dispositivos tomen
  // siempre la última versión (necesario para las notificaciones push).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
