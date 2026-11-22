// Lantern Thief — hand-in program (Node 22, standard library only).
//
// The repository beside this file holds the game as static files under
// game/ and its screenshots under screenshots/. This program copies both
// into the output directory and writes the dossier the judge reads, built
// by the kit's own library (vendor/makefun-game.ts) so the bytes match
// what the scorer rebuilds. MAKEFUN_OUTPUT_DIR names the output directory
// outside the grader; inside, it is /output.
//
// Two grader habits are baked in:
//   - every path is resolved from this file's own location, never from the
//     process working directory (the grader starts the program elsewhere);
//   - the output directory itself is only ever created, never deleted —
//     it is a mount, and removing a mount fails.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, as the kit documents them: only text_max_bytes shapes
// the dossier's bytes; the rest make this program refuse exactly what the
// scorer would refuse (too many or too-large screenshots, a game tree past
// its file, byte or path limits).
const SCORER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree(join(repoDir, 'game'), join(outDir, 'game'));

const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  copyTree(shotsDir, join(outDir, 'screenshots'));
} else {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, SCORER_CAPS));
