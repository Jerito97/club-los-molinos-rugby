import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { RegistroServiceWorker } from "@/componentes/RegistroServiceWorker";
import "./globals.css";

const bebas = Bebas_Neue({ variable: "--font-bebas", weight: "400", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const DESCRIPCION =
  "Marcador en vivo, resultados, posiciones y estadísticas del Club Los Molinos — Primera C, URBA.";

export const metadata: Metadata = {
  title: { default: "Club Los Molinos", template: "%s · Club Los Molinos" },
  description: DESCRIPCION,
  applicationName: "Club Los Molinos",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Los Molinos" },
  icons: { icon: "/icon.png", apple: "/iconos/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#4A1219",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${bebas.variable} ${inter.variable} antialiased`}>
      <body>
        {/* En desktop la app se centra en una columna de ancho móvil. */}
        <div className="app-columna mx-auto flex w-full max-w-[480px] flex-col bg-crema shadow-xl shadow-black/30">
          {children}
        </div>
        <RegistroServiceWorker />
      </body>
    </html>
  );
}
