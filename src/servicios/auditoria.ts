import { Prisma } from "@/generated/prisma/client";
import type { DB } from "@/lib/prisma";
import type { RegistroNuevo } from "@/dominio/auditoria";

const json = (v: RegistroNuevo["valor_anterior"]) => (v == null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

/**
 * Inserta registros de auditoría. Es la única escritura que se hace sobre
 * registro_auditoria: la aplicación nunca actualiza ni borra registros.
 */
export async function guardarAuditoria(db: DB, registros: RegistroNuevo | RegistroNuevo[]): Promise<void> {
  const lista = Array.isArray(registros) ? registros : [registros];
  if (lista.length === 0) return;
  await db.registroAuditoria.createMany({
    data: lista.map((r) => ({
      accion: r.accion,
      id_usuario: r.id_usuario,
      id_evento: r.id_evento ?? null,
      valor_anterior: json(r.valor_anterior ?? null),
      valor_nuevo: json(r.valor_nuevo ?? null),
      ip: r.ip ?? null,
      id_dispositivo: r.id_dispositivo ?? null,
      ...(r.fecha_hora ? { fecha_hora: r.fecha_hora } : {}),
    })),
  });
}
