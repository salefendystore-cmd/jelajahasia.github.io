// Muat turun gambar Pixabay untuk artikel yang ada `imageq:` tetapi belum ada `image:`.
// Guna: PIXABAY_KEY=xxxx node fetch-images.mjs   (kunci TIDAK disimpan dalam fail)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(ROOT, 'content'), OUT = path.join(ROOT, 'static', 'images');
const KEY = process.env.PIXABAY_KEY;
if (!KEY) { console.error('Sila set PIXABAY_KEY'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const used = new Set();
for (const f of fs.readdirSync(CONTENT).filter(f => f.endsWith('.md'))) {
  const file = path.join(CONTENT, f); let raw = fs.readFileSync(file, 'utf8');
  const q = raw.match(/^imageq:\s*(.+)$/m)?.[1]?.trim();
  if (!q || /^image:/m.test(raw)) continue;
  const slug = f.replace(/\.md$/, '');
  const r = await fetch(`https://pixabay.com/api/?key=${KEY}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&min_width=1200&per_page=20&order=popular`);
  if (!r.ok) { console.log('GAGAL carian', f, r.status); continue; }
  const hits = (await r.json()).hits.filter(h => !used.has(h.id));
  if (!hits.length) { console.log('Tiada hasil:', f, q); continue; }
  const h = hits[0]; used.add(h.id);
  const img = await fetch(h.largeImageURL);
  if (!img.ok) { console.log('GAGAL muat turun', f); continue; }
  fs.writeFileSync(path.join(OUT, slug + '.jpg'), Buffer.from(await img.arrayBuffer()));
  const alt = (h.tags || q).split(',').slice(0, 4).join(', ');
  raw = raw.replace(/^(category:.*)$/m, `$1\nimage: ${slug}.jpg\nimageAlt: ${alt}\ncredit: Foto oleh ${h.user} di Pixabay`);
  fs.writeFileSync(file, raw);
  console.log('OK', slug, '←', h.pageURL);
  await new Promise(r => setTimeout(r, 700));
}
