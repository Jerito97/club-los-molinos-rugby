import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/generated/prisma/client";

// Cliente único de Prisma. Se cachea en globalThis para que una misma
// instancia serverless de Vercel reutilice la conexión entre pedidos
// (y para que el recargado en caliente de desarrollo no abra conexiones nuevas).
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient; pool?: Pool };

const pool = globalParaPrisma.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
export const prisma = globalParaPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

globalParaPrisma.prisma = prisma;
globalParaPrisma.pool = pool;

/** Cliente o transacción: los servicios aceptan cualquiera de los dos. */
export type DB = Prisma.TransactionClient;
