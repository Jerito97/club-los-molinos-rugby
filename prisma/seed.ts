// Carga inicial de datos: `npm run db:seed` (también la ejecuta `npm run db:reset`).
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { reiniciarYSembrar } from "../src/servicios/demo/sembrar";

async function main() {
  const inicio = Date.now();
  await reiniciarYSembrar(prisma);
  console.log(`Datos iniciales cargados en ${((Date.now() - inicio) / 1000).toFixed(1)} s.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
