// Muat turun gambar dari Wikimedia Commons (tanpa kunci API) untuk artikel yang ada `imageq:` tetapi belum ada `image:`.
// Guna:
//   node fetch-images-wikimedia.mjs            → muat turun calon pertama yang sesuai bagi setiap artikel
//   node fetch-images-wikimedia.mjs --senarai  → hanya senaraikan calon (tiada fail diubah)
//   node fetch-images-wikimedia.mjs slug=2     → guna calon ke-2 bagi artikel "slug" (boleh diulang)
// Hanya gambar mendatar, lebar >= 1200px, berlesen bebas (CC0, domain awam, CC BY, CC BY-SA) dipilih.
// Kredit (jurugambar + lesen) ditulis ke `credit:` dan dipaparkan di bawah gambar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(ROOT, 'content'), OUT = path.join(ROOT, 'static', 'images');
const UA = 'JelajahAsiaBlogImageFetcher/1.0 (static travel blog; contact via site)';
const args = process.argv.slice(2);
const listOnly = args.includes('--senarai');
const pick = Object.fromEntries(args.filter(a => a.includes('=')).map(a => { const [k, v] = a.split('='); return [k, +v]; }));
const OK_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?( [a-z]+)?)$/i;
const strip = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function candidates(q) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action: 'query', format: 'json', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '30',
    prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '1280' }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('Carian gagal ' + r.status);
  const pages = Object.values((await r.json()).query?.pages || {}).sort((a, b) => a.index - b.index);
  return pages.map(p => ({ title: p.title, ...p.imageinfo?.[0] })).filter(i => {
    const lic = strip(i.extmetadata?.LicenseShortName?.value);
    return i.mime === 'image/jpeg' && i.width >= 1200 && i.width / i.height >= 1.25 && i.width / i.height <= 2.2 && OK_LICENSE.test(lic);
  }).map(i => ({ title: i.title, page: i.descriptionurl, thumb: i.thumburl, w: i.width, h: i.height,
    artist: strip(i.extmetadata?.Artist?.value) || 'Tidak dinyatakan', license: strip(i.extmetadata?.LicenseShortName?.value) }));
}

for (const f of fs.readdirSync(CONTENT).filter(f => f.endsWith('.md'))) {
  const file = path.join(CONTENT, f); let raw = fs.readFileSync(file, 'utf8');
  const q = raw.match(/^imageq:\s*(.+)$/m)?.[1]?.trim();
  if (!q || /^image:/m.test(raw)) continue;
  const slug = f.replace(/\.md$/, '');
  const c = await candidates(q);
  if (!c.length) { console.log('Tiada calon:', slug, '←', q); continue; }
  if (listOnly) { console.log(`\n${slug}  (${q})`); c.slice(0, 5).forEach((x, i) => console.log(`  ${i + 1}. ${x.title}  ${x.w}x${x.h}  ${x.license}  — ${x.artist}`)); continue; }
  const x = c[(pick[slug] || 1) - 1] || c[0];
  const img = await fetch(x.thumb, { headers: { 'User-Agent': UA } });
  if (!img.ok) { console.log('GAGAL muat turun', slug, img.status); continue; }
  fs.writeFileSync(path.join(OUT, slug + '.jpg'), Buffer.from(await img.arrayBuffer()));
  const artist = x.artist.replace(/\n/g, ' ').slice(0, 80);
  raw = raw.replace(/^(category:.*)$/m, `$1\nimage: ${slug}.jpg\ncredit: Foto oleh ${artist}, ${x.license}, melalui Wikimedia Commons`);
  fs.writeFileSync(file, raw);
  console.log('OK', slug, '←', x.page);
  await new Promise(r => setTimeout(r, 500));
}
