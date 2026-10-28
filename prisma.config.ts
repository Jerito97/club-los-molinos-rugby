import "dotenv/config";
import { defineConfig } from "prisma/config";

// Configuración del CLI de Prisma (migraciones, generate, seed).
// Las migraciones usan la conexión directa de Neon (DATABASE_URL_UNPOOLED),
// porque "migrate deploy" toma un advisory lock que el pooler no sostiene.
// En local, si no está definida, se usa DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"],
  },
});
