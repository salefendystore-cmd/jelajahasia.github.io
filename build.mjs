// Penjana site statik tanpa dependency. Guna: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(ROOT, 'content');
const DIST = path.join(ROOT, 'dist');

// ====== Tetapan site (tukar di sini) ======
const SITE = {
  name: 'Jelajah Asia',
  tagline: 'Teroka Asia, satu cerita pada satu masa.',
  url: process.env.SITE_URL || 'https://example.com',
  email: 'hello@example.com',
  adsenseClient: '', // contoh: ca-pub-1234567890123456 (isi selepas AdSense lulus)
  analyticsId: '',   // contoh: G-XXXXXXXXXX
};
const CATS = {
  destinasi: { name: 'Destinasi', desc: 'Panduan dan itinerari ke destinasi terbaik di Asia.', c: 'a', by: 'Meja Destinasi', bio: 'Pasukan yang merangka panduan dan itinerari ke destinasi Asia, berdasarkan sumber rasmi dan laporan pengembara.' },
  'tips-travel': { name: 'Tips Travel', desc: 'Helah, perancangan dan tips jimat untuk pengembara.', c: 'b', by: 'Meja Tips Travel', bio: 'Pasukan yang menyusun helah, senarai semak dan strategi jimat untuk pengembara Malaysia.' },
  'sejarah-budaya': { name: 'Sejarah & Budaya', desc: 'Kisah silam, adat dan warisan Asia.', c: 'c', by: 'Meja Sejarah & Budaya', bio: 'Pasukan yang merujuk buku dan sumber sejarah untuk menulis kisah silam dan warisan Asia.' },
  ekonomi: { name: 'Ekonomi & Semasa', desc: 'Industri pelancongan dan perkembangan semasa.', c: 'd', by: 'Meja Ekonomi & Semasa', bio: 'Pasukan yang menjejak perkembangan industri pelancongan dan kesannya kepada pengembara.' },
  personaliti: { name: 'Personaliti', desc: 'Tokoh dan kisah di sebalik perjalanan.', c: 'b', by: 'Meja Personaliti', bio: 'Pasukan yang menulis kisah tokoh pengembara dan pengasas di sebalik industri travel.' },
  'fakta-menarik': { name: 'Fakta Menarik', desc: 'Trivia dan perkara pelik dari seluruh Asia.', c: 'a', by: 'Meja Fakta Menarik', bio: 'Pasukan yang mengumpul trivia dan perkara pelik dari seluruh Asia.' },
};

// ====== Utiliti ======
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

function inline(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
function md(src) {
  const lines = src.split('\n'); const out = []; let list = null, para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const headings = [];
  for (const raw of lines) {
    const l = raw.trimEnd();
    let m;
    if (!l.trim()) { flush(); closeList(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.*)/))) {
      flush(); closeList();
      const lvl = m[1].length; const id = m[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (lvl === 2) headings.push({ id, text: m[2] });
      out.push(`<h${lvl} id="${id}">${inline(m[2])}</h${lvl}>`); continue;
    }
    if ((m = l.match(/^>\s?(.*)/))) { flush(); closeList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if ((m = l.match(/^[-*]\s+(.*)/))) { flush(); if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = l.match(/^\d+\.\s+(.*)/))) { flush(); if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    closeList(); para.push(l.trim());
  }
  flush(); closeList();
  return { html: out.join('\n'), headings };
}
function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('Tiada front matter: ' + file);
  const meta = {};
  for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ''); }
  return { meta, body: m[2] };
}

// ====== Templat ======
const CSS = `
:root{--navy:#0B2545;--teal:#0e8f86;--teal-l:#13A89E;--sand:#F4EDE4;--coral:#FF6B4A;--ink:#1d2433;--mute:#5d6678;--line:#e6e1d8;--bg:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0e1522;--ink:#e8ecf3;--mute:#9aa6ba;--line:#26324a;--sand:#16213a;--navy:#e8ecf3;--teal:#2cc5ba}}
*{box-sizing:border-box;margin:0}
body{font-family:Inter,system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.7}
a{color:inherit;text-decoration:none}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.narrow{max-width:740px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:5}
.nav{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.logo{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:24px;color:var(--navy)}.logo b{color:var(--teal-l)}
nav{display:flex;gap:20px;font-size:14px;font-weight:500;overflow-x:auto;white-space:nowrap}
nav a:hover,nav a.on{color:var(--teal)}
.hero{background:linear-gradient(135deg,#0B2545,#16406b);color:#fff;padding:72px 0}
.hero h1{font-family:Fraunces,Georgia,serif;font-size:clamp(32px,5vw,52px);line-height:1.15;max-width:700px}
.hero p{margin:16px 0 28px;max-width:560px;color:#cfd9e6;font-size:18px}
.btn{display:inline-block;background:var(--coral);color:#fff;padding:12px 24px;border-radius:999px;font-weight:600}
section{padding:48px 0}
h2.s{font-family:Fraunces,Georgia,serif;color:var(--navy);font-size:30px;margin-bottom:24px}
.cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.cat{background:var(--sand);padding:18px;border-radius:14px;font-weight:600;color:var(--navy);border:1px solid var(--line)}
.cat small{display:block;font-weight:400;color:var(--mute)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
.card{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--bg);transition:.2s;display:block}
.card:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(11,37,69,.14)}
.img{height:170px;display:flex;align-items:flex-end;padding:14px;color:#fff;font-family:Fraunces,Georgia,serif;font-size:42px;font-weight:700;opacity:.98}
.g-a{background:linear-gradient(135deg,#13A89E,#0B2545)}.g-b{background:linear-gradient(135deg,#FF6B4A,#9c3517)}.g-c{background:linear-gradient(135deg,#9a7b45,#0B2545)}.g-d{background:linear-gradient(135deg,#2f6fb5,#0B2545)}
.card .t{padding:18px}
.tag{font-size:12px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.06em}
.card h3{font-family:Fraunces,Georgia,serif;font-size:20px;margin:6px 0;color:var(--navy);line-height:1.3}
.card p{font-size:14px;color:var(--mute)}
.ad{background:var(--sand);border:1px dashed var(--line);color:var(--mute);text-align:center;padding:24px;border-radius:12px;font-size:13px;margin:28px 0}
.sand{background:var(--sand)}
article h1{font-family:Fraunces,Georgia,serif;font-size:clamp(30px,5vw,42px);line-height:1.2;color:var(--navy);margin:10px 0}
.meta{color:var(--mute);font-size:14px;margin-bottom:24px}
.cover{height:240px;border-radius:18px;margin:20px 0 32px}
.prose{font-size:18px}
.prose p{margin:0 0 20px}.prose h2{font-family:Fraunces,Georgia,serif;color:var(--navy);font-size:28px;margin:40px 0 14px;line-height:1.25}
.prose h3{font-size:21px;margin:28px 0 10px;color:var(--navy)}
.prose ul,.prose ol{margin:0 0 20px 24px}.prose li{margin-bottom:8px}
.prose a{color:var(--teal);text-decoration:underline}
.prose blockquote{border-left:4px solid var(--teal-l);background:var(--sand);padding:14px 18px;border-radius:0 12px 12px 0;margin:0 0 20px}
.toc{background:var(--sand);border-radius:14px;padding:16px 20px;margin-bottom:28px;font-size:15px}
.toc b{display:block;margin-bottom:6px}.toc a{display:block;padding:2px 0;color:var(--teal)}
.crumb{font-size:14px;color:var(--mute)}.crumb a:hover{color:var(--teal)}
footer{background:#0B2545;color:#b9c6d8;padding:40px 0;font-size:14px;margin-top:40px}
footer .logo{color:#fff}footer a:hover{color:#fff}
.flinks{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px}
.pagehead{padding:40px 0 8px}.pagehead h1{font-family:Fraunces,Georgia,serif;font-size:38px;color:var(--navy)}
`;

const CSS2 = `
.cover,.coverimg{width:100%;border-radius:18px;margin:20px 0 32px}.coverimg{height:auto;aspect-ratio:1200/630;object-fit:cover;display:block}
.coverfig{margin:20px 0 32px}.coverfig .coverimg{margin:0}.coverfig figcaption{font-size:12px;color:var(--mute);margin-top:6px}
img.img{padding:0;object-fit:cover;width:100%;display:block}
.share{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px}.share.bottom{margin:28px 0}
.share .s,.share .like{display:inline-flex;align-items:center;gap:5px;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:500 12.5px Inter,sans-serif;cursor:pointer;line-height:1}
.share .wa{background:#25D366;border-color:#25D366;color:#fff}.share .fb{background:#1877F2;border-color:#1877F2;color:#fff}.share .tg{background:#229ED9;border-color:#229ED9;color:#fff}.share .x{background:#111;border-color:#111;color:#fff}
.share .like.on{background:var(--coral);border-color:var(--coral);color:#fff}
.author{display:flex;gap:14px;align-items:flex-start;background:var(--sand);border-radius:14px;padding:18px;margin:8px 0 24px}
.author .av{flex:none;width:48px;height:48px;border-radius:50%;background:var(--teal-l);color:#fff;display:grid;place-items:center;font:700 20px Fraunces,serif}
.author p{font-size:14px;color:var(--mute);line-height:1.5}
html{-webkit-text-size-adjust:100%}
@media (max-width:640px){
.hero{padding:44px 0}.hero p{font-size:16px}section{padding:32px 0}h2.s{font-size:24px}
.prose{font-size:17px}.prose h2{font-size:24px}.grid{grid-template-columns:1fr}
.nav{height:60px}.cats{grid-template-columns:repeat(2,1fr)}
.share{gap:6px}.share .s,.share .like{flex:1 1 calc(33.33% - 6px);justify-content:center;min-height:38px;padding:0 8px}
}
`;
const nav = (active) => Object.entries(CATS).map(([k, v]) => `<a href="/kategori/${k}/"${active === k ? ' class="on"' : ''}>${esc(v.name)}</a>`).join('');

function layout({ title, desc, path: p, body, active, type = 'website', jsonld = '' }) {
  const full = title === SITE.name ? `${SITE.name} – ${SITE.tagline}` : `${title} | ${SITE.name}`;
  return `<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE.url}${p}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${SITE.url}${p}"><meta property="og:site_name" content="${SITE.name}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230B2545'/%3E%3Ccircle cx='16' cy='16' r='7' fill='%2313A89E'/%3E%3C/svg%3E">
<link rel="alternate" type="application/rss+xml" href="/rss.xml" title="${SITE.name}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>${CSS}${CSS2}</style>
<meta name="theme-color" content="#0B2545">
${SITE.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}" crossorigin="anonymous"></script>` : ''}
${SITE.analyticsId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.analyticsId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${SITE.analyticsId}')</script>` : ''}
${jsonld}
</head><body>
<header><div class="wrap nav"><a class="logo" href="/">Jelajah<b>Asia</b></a><nav>${nav(active)}</nav></div></header>
${body}
<footer><div class="wrap"><a class="logo" href="/">Jelajah<b>Asia</b></a>
<p style="margin-top:8px">${esc(SITE.tagline)}</p>
<div class="flinks"><a href="/tentang/">Tentang Kami</a><a href="/hubungi/">Hubungi</a><a href="/dasar-privasi/">Dasar Privasi</a><a href="/terma/">Terma</a><a href="/penafian/">Penafian</a><a href="/iklan-tajaan/">Iklan &amp; Tajaan</a></div>
<p style="margin-top:14px;opacity:.7">© ${new Date().getFullYear()} ${SITE.name}. Hak cipta terpelihara.</p></div></footer>
${p !== '/' && /^\/[^/]+\/$/.test(p) ? SCRIPT : ''}
</body></html>`;
}

const adSlot = () => SITE.adsenseClient
  ? `<ins class="adsbygoogle" style="display:block" data-ad-client="${SITE.adsenseClient}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})</script>`
  : '';
const cover = (a, cls) => a.image ? `<img class="${cls}" src="${a.image}" alt="${esc(a.imageAlt || a.title)}" ${cls === 'coverimg' ? 'fetchpriority="high"' : 'loading="lazy"'} width="1200" height="630">` : '';
const card = a => `<a class="card" href="${a.url}">${a.image ? cover(a, 'img') : `<div class="img g-${CATS[a.cat].c}">${esc(a.title.charAt(0))}</div>`}<div class="t"><span class="tag">${esc(CATS[a.cat].name)}</span><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p></div></a>`;


const shareBar = (a, bottom) => {
  const u = encodeURIComponent(SITE.url + a.url), t = encodeURIComponent(a.title);
  return `<div class="share${bottom ? ' bottom' : ''}" data-url="${SITE.url}${a.url}" data-title="${esc(a.title)}" data-slug="${a.slug}">
<button class="like" type="button" aria-pressed="false" aria-label="Suka artikel ini"><span class="h">♡</span> <span class="n">Suka</span></button>
<a class="s wa" target="_blank" rel="noopener" href="https://wa.me/?text=${t}%20${u}">WhatsApp</a>
<a class="s fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${u}">Facebook</a>
<a class="s tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${u}&text=${t}">Telegram</a>
<a class="s x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${u}&text=${t}">X</a>
<button class="s copy" type="button">Salin pautan</button></div>`;
};
const SCRIPT = `<script>(function(){
var L=function(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
document.querySelectorAll('.share').forEach(function(b){
var slug=b.dataset.slug,like=b.querySelector('.like'),key='liked:'+slug;
function paint(on){like.setAttribute('aria-pressed',on);like.classList.toggle('on',on);like.querySelector('.h').textContent=on?'♥':'♡';like.querySelector('.n').textContent=on?'Disukai':'Suka'}
paint(L(key)==='1');
like.onclick=function(){var on=L(key)!=='1';L(key,on?'1':'0');paint(on);document.querySelectorAll('.share[data-slug="'+slug+'"] .like').forEach(function(x){x.classList.toggle('on',on);x.setAttribute('aria-pressed',on);x.querySelector('.h').textContent=on?'♥':'♡';x.querySelector('.n').textContent=on?'Disukai':'Suka'})};
b.querySelector('.copy').onclick=function(){var c=this,u=b.dataset.url;
if(navigator.share){navigator.share({title:b.dataset.title,url:u}).catch(function(){});return}
if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){c.textContent='Disalin!';setTimeout(function(){c.textContent='Salin pautan'},1800)})}else{prompt('Salin pautan:',u)}};
});})();</script>`;

// ====== Bina ======
// Jika SITE_URL mempunyai sub-laluan (contoh GitHub Pages projek), awalkan semua pautan dalaman.
const BASE = new URL(SITE.url).pathname.replace(/\/$/, '');
const write = (p, c) => {
  if (BASE && p.endsWith('.html')) c = c.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`);
  const f = path.join(DIST, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c);
};
fs.rmSync(DIST, { recursive: true, force: true });
const STATIC = path.join(ROOT, 'static');
if (fs.existsSync(STATIC)) fs.cpSync(STATIC, DIST, { recursive: true }); // gambar, CNAME, ads.txt

const articles = fs.readdirSync(CONTENT).filter(f => f.endsWith('.md')).map(f => {
  const { meta, body } = parse(path.join(CONTENT, f));
  const slug = f.replace(/\.md$/, '');
  if (!CATS[meta.category]) throw new Error(`Kategori tidak sah dalam ${f}: ${meta.category}`);
  const { html, headings } = md(body);
  const words = body.split(/\s+/).length;
  return { slug, url: `/${slug}/`, image: meta.image ? `/images/${meta.image}` : '', imageAlt: meta.imageAlt || '', credit: meta.credit || '', title: meta.title, description: meta.description, cat: meta.category, date: meta.date, html, headings, words };
}).filter(a => a.date <= today).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

for (const a of articles) {
  const related = articles.filter(x => x.cat === a.cat && x.slug !== a.slug).slice(0, 3);
  const toc = a.headings.length > 2 ? `<div class="toc"><b>Dalam artikel ini</b>${a.headings.map(h => `<a href="#${h.id}">${esc(h.text)}</a>`).join('')}</div>` : '';
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.description, datePublished: a.date, author: { '@type': 'Organization', name: SITE.name }, publisher: { '@type': 'Organization', name: SITE.name } })}</script>`;
  write(`${a.slug}/index.html`, layout({
    title: a.title, desc: a.description, path: a.url, active: a.cat, type: 'article', jsonld: ld,
    body: `<div class="narrow"><article style="padding-top:32px">
<div class="crumb"><a href="/">Utama</a> › <a href="/kategori/${a.cat}/">${esc(CATS[a.cat].name)}</a></div>
<h1>${esc(a.title)}</h1><div class="meta">Oleh <strong>${esc(CATS[a.cat].by)}</strong> · ${fmtDate(a.date)} · ${Math.max(1, Math.round(a.words / 200))} minit bacaan</div>
${shareBar(a)}
${a.image ? `<figure class="coverfig">${cover(a, 'coverimg')}${a.credit ? `<figcaption>${esc(a.credit)}</figcaption>` : ''}</figure>` : `<div class="cover g-${CATS[a.cat].c}"></div>`}${toc}<div class="prose">${a.html}</div>
${shareBar(a, true)}
<div class="author"><div class="av">${esc(CATS[a.cat].by.charAt(5) || 'J')}</div><div><strong>${esc(CATS[a.cat].by)}</strong><p>${esc(CATS[a.cat].bio)}</p></div></div>
${adSlot()}</article></div>
${related.length ? `<section><div class="wrap"><h2 class="s">Baca Seterusnya</h2><div class="grid">${related.map(card).join('')}</div></div></section>` : ''}`,
  }));
}

// Laman utama
const catCount = k => articles.filter(a => a.cat === k).length;
write('index.html', layout({
  title: SITE.name, desc: 'Panduan destinasi, tips jimat, sejarah, ekonomi dan kisah menarik dari seluruh Asia dalam Bahasa Melayu.', path: '/',
  body: `<div class="hero"><div class="wrap"><h1>${esc(SITE.tagline)}</h1><p>Panduan destinasi, tips jimat, sejarah dan kisah menarik dari seluruh Asia, dalam Bahasa Melayu.</p><a class="btn" href="#terkini">Mula Membaca</a></div></div>
<section><div class="wrap"><h2 class="s">Layari Mengikut Topik</h2><div class="cats">${Object.entries(CATS).map(([k, v]) => `<a class="cat" href="/kategori/${k}/">${esc(v.name)}<small>${catCount(k)} artikel</small></a>`).join('')}</div></div></section>
<section id="terkini" style="padding-top:0"><div class="wrap"><h2 class="s">Artikel Terkini</h2><div class="grid">${articles.slice(0, 12).map(card).join('')}</div>${SITE.adsenseClient ? '' : ''}</div></section>`,
}));

// Kategori
for (const [k, v] of Object.entries(CATS)) {
  const list = articles.filter(a => a.cat === k);
  write(`kategori/${k}/index.html`, layout({
    title: v.name, desc: v.desc, path: `/kategori/${k}/`, active: k,
    body: `<div class="wrap"><div class="pagehead"><h1>${esc(v.name)}</h1><p style="color:var(--mute)">${esc(v.desc)}</p></div><section style="padding-top:24px"><div class="grid">${list.map(card).join('') || '<p>Artikel akan datang.</p>'}</div></section></div>`,
  }));
}

// Halaman statik
const pages = {
  tentang: ['Tentang Kami', `<p>${SITE.name} ialah laman web panduan pelancongan dalam Bahasa Melayu yang memfokuskan Asia. Kami menulis tentang destinasi, tips perjalanan, sejarah, budaya, ekonomi pelancongan dan kisah tokoh pengembara.</p><p>Matlamat kami mudah: membantu pembaca merancang perjalanan yang lebih bijak, jimat dan bermakna, dengan maklumat yang jelas dan mudah difahami.</p><h2>Cara Kami Menulis</h2><p>Setiap artikel disemak untuk ketepatan fakta. Harga, visa dan peraturan perjalanan sering berubah, jadi sentiasa sahkan dengan sumber rasmi sebelum bertolak. Jika anda terjumpa kesilapan, sila <a href="/hubungi/">hubungi kami</a>.</p>`],
  hubungi: ['Hubungi Kami', `<p>Ada soalan, pembetulan, cadangan topik atau tawaran kerjasama? Hantarkan emel kepada kami di <a href="mailto:${SITE.email}">${SITE.email}</a>. Kami cuba membalas dalam masa 3 hari bekerja.</p>`],
  'dasar-privasi': ['Dasar Privasi', `<p>Kemas kini terakhir: ${fmtDate(today)}.</p><p>Kami menghormati privasi anda. Laman ini tidak meminta anda mendaftar dan kami tidak mengumpul maklumat peribadi secara terus.</p><h2>Kuki dan iklan</h2><p>Laman ini boleh menggunakan perkhidmatan pihak ketiga seperti Google Analytics dan Google AdSense. Pihak ketiga ini, termasuk Google, menggunakan kuki untuk memaparkan iklan berdasarkan lawatan anda ke laman ini dan laman lain. Anda boleh menyahaktifkan iklan diperibadikan di <a href="https://adssettings.google.com">Tetapan Iklan Google</a>.</p><h2>Pautan luar</h2><p>Artikel kami mungkin mengandungi pautan ke laman lain. Kami tidak bertanggungjawab ke atas dasar privasi laman tersebut.</p><h2>Pautan affiliate</h2><p>Sesetengah pautan ialah pautan affiliate. Kami mungkin menerima komisen kecil tanpa kos tambahan kepada anda.</p><h2>Hubungi</h2><p>Soalan tentang dasar ini boleh dihantar ke ${SITE.email}.</p>`],
  terma: ['Terma Penggunaan', `<p>Dengan menggunakan laman ini, anda bersetuju dengan terma berikut. Kandungan disediakan untuk maklumat am sahaja. Dilarang menyalin atau menerbitkan semula kandungan tanpa kebenaran bertulis. Kami boleh mengubah kandungan dan terma ini pada bila-bila masa.</p>`],
  penafian: ['Penafian', `<p>Maklumat di ${SITE.name} disediakan untuk tujuan am dan bukan nasihat profesional. Harga, syarat visa, waktu operasi dan peraturan perjalanan sering berubah. Sila sahkan dengan pihak berkuasa atau penyedia perkhidmatan rasmi sebelum membuat keputusan atau tempahan. Kami tidak bertanggungjawab ke atas kerugian akibat penggunaan maklumat di laman ini.</p>`],
  'iklan-tajaan': ['Iklan & Tajaan', `<p>Berminat untuk mengiklankan produk atau perkhidmatan pelancongan anda kepada pembaca ${SITE.name}? Kami menawarkan artikel tajaan, ulasan dan ruang iklan. Hubungi kami di <a href="mailto:${SITE.email}">${SITE.email}</a> untuk kit media dan kadar.</p><p>Semua kandungan tajaan akan dilabel dengan jelas.</p>`],
};
for (const [slug, [title, html]] of Object.entries(pages)) {
  write(`${slug}/index.html`, layout({ title, desc: title + ' – ' + SITE.name, path: `/${slug}/`, body: `<div class="narrow"><div class="pagehead"><h1>${esc(title)}</h1></div><div class="prose" style="padding-bottom:24px">${html}</div></div>` }));
}

// SEO
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', ...Object.keys(CATS).map(k => `/kategori/${k}/`), ...articles.map(a => a.url)].map(u => `<url><loc>${SITE.url}${u}</loc></url>`).join('')}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${SITE.name}</title><link>${SITE.url}</link><description>${esc(SITE.tagline)}</description>${articles.slice(0, 30).map(a => `<item><title>${esc(a.title)}</title><link>${SITE.url}${a.url}</link><description>${esc(a.description)}</description><pubDate>${new Date(a.date).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`);
write('404.html', layout({ title: 'Halaman tidak dijumpai', desc: '404', path: '/404.html', body: `<div class="narrow" style="padding:80px 20px;text-align:center"><h1 style="font-family:Fraunces,serif;font-size:48px">404</h1><p>Halaman tidak dijumpai. <a href="/" style="color:var(--teal)">Kembali ke laman utama</a>.</p></div>` }));

console.log(`Siap: ${articles.length} artikel diterbitkan (tarikh <= ${today}).`);
