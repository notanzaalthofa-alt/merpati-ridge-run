// Merpati Ridge Run — entry program.
// One job: hand the game in. Copy game/ and screenshots/ into the output
// directory, then write /output/dossier.json with the kit's buildDossier.
import { buildDossier } from "./vendor/makefun-game.ts";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, "game"), join(outDir, "game"), { recursive: true });
cpSync(join(repoRoot, "screenshots"), join(outDir, "screenshots"), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000
});

writeFileSync(join(outDir, "dossier.json"), dossier);
console.log("Merpati Ridge Run: dossier written (" + dossier.length + " bytes) to " + outDir);
