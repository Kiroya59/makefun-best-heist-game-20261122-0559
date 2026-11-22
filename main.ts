// The Velvet Vault — entry program (Node 22, standard library only).
//
// main.ts hands the heist game in. The game itself is the plain static
// files under game/ (index.html and its ES modules, no library, no network
// request), and screenshots/ holds four JPEG renders of the game in a
// browser. This program copies both folders from beside this file to
// /output and writes /output/dossier.json, the summary the judge reads,
// with the vendored make.fun library.
//
// Play it locally: serve game/ (any static server, e.g. python3 -m
// http.server inside game/) and open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate allows 3 or 4 screenshots, each at most 256 KiB. Refuse to hand
// in a broken set rather than let the grader find it.
function checkScreenshots(dir) {
  if (!existsSync(dir)) throw new Error('screenshots/ is missing');
  const files = readdirSync(dir).filter((name) => !name.startsWith('.'));
  if (files.length < 3 || files.length > 4) {
    throw new Error(`screenshots/ holds ${files.length} images, the gate wants 3 or 4`);
  }
  for (const name of files) {
    const size = statSync(join(dir, name)).size;
    if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

mkdirSync(out, { recursive: true });
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — the game cannot be served');
}
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  checkScreenshots(join(here, 'screenshots'));
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
