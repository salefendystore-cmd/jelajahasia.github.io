// Jana versi gambar yang ringan untuk web. Jalankan di Mac setiap kali gambar baharu ditambah:
//   node optimize-images.mjs
// Perlu: cwebp (brew install webp) dan sips (sedia ada di macOS).
// Hasil (commit ke repo bersama gambar asal):
//   static/images/opt/<nama>-480.webp, -800.webp, -1200.webp  → dipaparkan di laman (srcset)
//   static/images/og/<nama>.jpg (1200x630)                       → gambar pratonton WhatsApp/Facebook/X
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'static', 'images');
const OPT = path.join(SRC, 'opt'), OG = path.join(SRC, 'og');
export const WIDTHS = [480, 800, 1200];
fs.mkdirSync(OPT, { recursive: true }); fs.mkdirSync(OG, { recursive: true });

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const fresh = (out, src) => fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
const dims = f => { const o = run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', f]); return [+o.match(/pixelWidth: (\d+)/)[1], +o.match(/pixelHeight: (\d+)/)[1]]; };

let done = 0, skipped = 0, before = 0, after = 0;
for (const f of fs.readdirSync(SRC).filter(f => /\.(jpe?g|png)$/i.test(f))) {
  const src = path.join(SRC, f), name = f.replace(/\.[^.]+$/, '');
  before += fs.statSync(src).size;
  const [w, h] = dims(src);
  const outs = [];
  for (const W of WIDTHS) {
    const out = path.join(OPT, `${name}-${W}.webp`); outs.push(out);
    if (fresh(out, src)) continue;
    run('cwebp', ['-quiet', '-q', '72', '-m', '6', '-metadata', 'none', ...(w > W ? ['-resize', String(W), '0'] : []), src, '-o', out]);
  }
  // Gambar OG: skala supaya meliputi 1200x630, kemudian potong di tengah.
  const og = path.join(OG, `${name}.jpg`);
  if (!fresh(og, src)) {
    const s = Math.max(1200 / w, 630 / h);
    run('sips', ['-z', String(Math.ceil(h * s)), String(Math.ceil(w * s)), '-c', '630', '1200', '-s', 'format', 'jpeg', '-s', 'formatOptions', 'low', src, '--out', og]);
  } else skipped++;
  after += fs.statSync(path.join(OPT, `${name}-800.webp`)).size;
  done++;
}
console.log(`Siap: ${done} gambar (${skipped} sudah terkini). Saiz asal ${(before / 1048576).toFixed(1)} MB → versi 800px WebP ${(after / 1048576).toFixed(1)} MB.`);
