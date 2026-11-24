// HALCYON KEYS: hands the game in for make.fun's gta6-01 bounty (Node 22, standard library only).
// Copies game/ (static three.js open-world crime game) and screenshots/ to the output folder and
// writes dossier.json with the vendored make.fun library. Deterministic: two runs give identical bytes.
//
// Play locally: `node serve.ts`, then open http://localhost:8080.
// Hand-in dry run outside the grader: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyFolder(name: string): void {
  const from = join(repoRoot, name);
  mkdirSync(join(outputDir, name), { recursive: true });
  if (existsSync(from)) cpSync(from, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');

// The scorer's caps: at most 4 screenshots of 256 KiB, 993 game entries, 48 MiB, 1000-byte paths, 160 KiB of text.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
