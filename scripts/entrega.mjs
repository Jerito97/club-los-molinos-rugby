// Genera entrega/codigo-fuente.zip con el código fuente del proyecto.
//
// Usa `git archive`, así que incluye solo los archivos versionados del
// último commit: no lleva node_modules, .env ni archivos generados. Se
// excluye además la carpeta docs/.
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

const salida = "entrega/codigo-fuente.zip";
mkdirSync("entrega", { recursive: true });

const pendientes = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
if (pendientes) {
  console.warn("Atención: hay cambios sin commitear y no se incluyen en el zip.\n");
}

execFileSync(
  "git",
  ["archive", "--format=zip", "--prefix=club-los-molinos/", "-o", salida, "HEAD", "--", ".", ":(exclude)docs"],
  { stdio: "inherit" }
);
console.log(`Listo: ${salida} (${(statSync(salida).size / 1024).toFixed(0)} KB)`);
