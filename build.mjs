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
  // Pilihan Editor di halaman utama: nama fail artikel tanpa .md. Jika kosong/tidak sah, artikel terbaharu yang ada gambar digunakan.
  pilihanEditor: 'menjelajah-kyoto-kuil-kimono-kafe',
};
const CATS = {
  destinasi: { name: 'Destinasi', desc: 'Panduan dan itinerari ke destinasi terbaik di Asia.', c: 'a', by: 'Meja Destinasi', bio: 'Pasukan yang merangka panduan dan itinerari ke destinasi Asia, berdasarkan sumber rasmi dan laporan pengembara.' },
  'tips-travel': { name: 'Tips Travel', desc: 'Helah, perancangan dan tips jimat untuk pengembara.', c: 'b', by: 'Meja Tips Travel', bio: 'Pasukan yang menyusun helah, senarai semak dan strategi jimat untuk pengembara Malaysia.' },
  'sejarah-budaya': { name: 'Sejarah & Budaya', desc: 'Kisah silam, adat dan warisan Asia.', c: 'c', by: 'Meja Sejarah & Budaya', bio: 'Pasukan yang merujuk buku dan sumber sejarah untuk menulis kisah silam dan warisan Asia.' },
  ekonomi: { name: 'Ekonomi & Semasa', desc: 'Industri pelancongan dan perkembangan semasa.', c: 'd', by: 'Meja Ekonomi & Semasa', bio: 'Pasukan yang menjejak perkembangan industri pelancongan dan kesannya kepada pengembara.' },
  personaliti: { name: 'Personaliti', desc: 'Tokoh dan kisah di sebalik perjalanan.', c: 'b', by: 'Meja Personaliti', bio: 'Pasukan yang menulis kisah tokoh pengembara dan pengasas di sebalik industri travel.' },
  'fakta-menarik': { name: 'Fakta Menarik', desc: 'Trivia dan perkara pelik dari seluruh Asia.', c: 'a', by: 'Meja Fakta Menarik', bio: 'Pasukan yang mengumpul trivia dan perkara pelik dari seluruh Asia.' },
};

// Penulis dan penyemak: lihat data/penulis.json dan PANDUAN-PENULIS.md
const AUTHORS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'penulis.json'), 'utf8'));
const deskOf = cat => 'meja-' + cat;

// ====== Utiliti ======
const slugify = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

function inline(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) => url.startsWith('/')
      ? `<a class="xl" href="${url}" target="_blank" rel="noopener">${txt}<span class="sr-only"> (dibuka di tab baharu)</span></a>`
      : `<a href="${url}">${txt}</a>`);
}
function md(src) {
  const lines = src.split('\n'); const out = []; let list = null, para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const headings = []; const usedIds = {};
  const cells = r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const l = raw.trimEnd();
    let m;
    if (l.trim().startsWith('|') && lines[i + 1] && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      flush(); closeList();
      const head = cells(l); const rows = []; i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++; }
      i--;
      out.push(`<div class="tbl"><table><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (!l.trim()) { flush(); closeList(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.*)/))) {
      flush(); closeList();
      const lvl = m[1].length; let id = m[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bahagian'; usedIds[id] = (usedIds[id] || 0) + 1; if (usedIds[id] > 1) id += '-' + usedIds[id];
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
:root{--navy:#0B2545;--teal:#0a6f68;--teal-l:#13A89E;--sand:#F4EDE4;--coral:#FF6B4A;--on-accent:#0B2545;--ink:#1d2433;--mute:#5d6678;--line:#e6e1d8;--bg:#fff;--hdr:68px}
@media (prefers-color-scheme:dark){:root{--bg:#0e1522;--ink:#e8ecf3;--mute:#9aa6ba;--line:#26324a;--sand:#16213a;--navy:#e8ecf3;--teal:#2cc5ba}}
*{box-sizing:border-box;margin:0}
html{-webkit-text-size-adjust:100%;scroll-padding-top:calc(var(--hdr) + 16px)}
body{font-family:Inter,system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.7}
a{color:inherit;text-decoration:none}
:focus-visible{outline:3px solid var(--teal);outline-offset:2px;border-radius:4px}
.skip{position:absolute;left:-9999px;top:8px;background:var(--bg);color:var(--ink);padding:10px 16px;border-radius:8px;z-index:50;font-weight:600}
.skip:focus{left:12px}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.narrow{max-width:740px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:30}
.nav{display:flex;align-items:center;justify-content:space-between;height:var(--hdr);gap:16px}
.logo{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:24px;color:var(--navy)}.logo b{color:var(--teal-l)}
nav.inline{display:flex;gap:22px;font-size:14px;font-weight:500}
nav.inline a,.menu-panel a{padding:6px 0}
nav a:hover,nav a[aria-current]{color:var(--teal)}
nav a[aria-current]{text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:2px}
.menu-btn{display:none;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--ink);font:600 14px Inter,sans-serif;cursor:pointer}
.menu-btn svg{width:18px;height:18px}
.menu-panel{position:absolute;left:0;right:0;top:100%;background:var(--bg);border-bottom:1px solid var(--line);box-shadow:0 14px 28px rgba(0,0,0,.16);padding:4px 20px 12px}
.menu-panel[hidden]{display:none}
.menu-panel a{display:flex;align-items:center;min-height:48px;border-bottom:1px solid var(--line);font-weight:500;font-size:16px}
.menu-panel a:last-child{border-bottom:0}
@media (max-width:899px){
html{--hdr:60px}
.js nav.inline{display:none}.js .menu-btn{display:inline-flex}
html:not(.js) .nav{height:auto;flex-wrap:wrap;padding-top:8px;padding-bottom:8px}
html:not(.js) nav.inline{flex-wrap:wrap;gap:4px 16px}
}
.hero{background:linear-gradient(135deg,#0B2545,#16406b);color:#fff;padding:44px 0 48px}
.hero h1{font-family:Fraunces,Georgia,serif;font-size:clamp(28px,4.6vw,48px);line-height:1.15;max-width:700px}
.hero p{margin:12px 0 22px;max-width:560px;color:#d5deea;font-size:17px}
.hero :focus-visible{outline-color:#fff}
.btn{display:inline-block;background:var(--coral);color:var(--on-accent);padding:12px 24px;border-radius:999px;font-weight:700}
.btn:hover{filter:brightness(1.06)}
section{padding:44px 0}
h2.s{font-family:Fraunces,Georgia,serif;color:var(--navy);font-size:30px;margin-bottom:22px;line-height:1.25}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--teal);margin-bottom:10px}
.cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.cat{background:var(--sand);padding:18px;border-radius:14px;font-weight:600;color:var(--navy);border:1px solid var(--line)}
.cat:hover{border-color:var(--teal)}
.cat small{display:block;font-weight:400;color:var(--mute)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
@media (max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:600px){.grid{grid-template-columns:1fr}}
.card{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--bg);transition:.2s;display:flex;flex-direction:column}
.card:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(11,37,69,.14)}
.card[hidden]{display:none}
.img{height:170px;display:flex;align-items:flex-end;padding:14px;color:#fff;font-family:Fraunces,Georgia,serif;font-size:42px;font-weight:700}
img.img{padding:0;object-fit:cover;width:100%;display:block}
.g-a{background:linear-gradient(135deg,#0e7c75,#0B2545)}.g-b{background:linear-gradient(135deg,#b4431f,#5a1f0d)}.g-c{background:linear-gradient(135deg,#7a5f2e,#0B2545)}.g-d{background:linear-gradient(135deg,#2f6fb5,#0B2545)}
.card .t{padding:18px}
.tag{font-size:12px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.06em}
.card h3{font-family:Fraunces,Georgia,serif;font-size:20px;margin:6px 0;color:var(--navy);line-height:1.3}
.card p{font-size:14px;color:var(--mute)}
.card .note{display:block;margin-top:10px;font-size:13px;color:var(--mute)}
.feature{display:grid;grid-template-columns:1.15fr 1fr;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--bg)}
.feature:hover{box-shadow:0 12px 28px rgba(11,37,69,.14)}
.feature .fimg{width:100%;height:100%;min-height:240px;aspect-ratio:16/10;object-fit:cover;display:block}
.feature .ft{padding:28px 30px;display:flex;flex-direction:column;justify-content:center}
.feature h3{font-family:Fraunces,Georgia,serif;font-size:clamp(22px,3vw,30px);line-height:1.25;color:var(--navy);margin:6px 0 10px}
.feature p{color:var(--mute)}
.feature .more{margin-top:14px;font-weight:700;color:var(--teal)}
@media (max-width:760px){.feature{grid-template-columns:1fr}.feature .fimg{min-height:0;height:auto}.feature .ft{padding:18px 18px 20px}}
.filterbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 24px}
.filterbar label{font-weight:600}
.filterbar select{min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:500 15px Inter,sans-serif;max-width:100%}
.filterbar .hasil{color:var(--mute);font-size:14px}
html:not(.js) .filterbar{display:none}
.ad{background:var(--sand);border:1px dashed var(--line);color:var(--mute);text-align:center;padding:24px;border-radius:12px;font-size:13px;margin:28px 0}
.sand{background:var(--sand)}
article h1{font-family:Fraunces,Georgia,serif;font-size:clamp(28px,5vw,42px);line-height:1.2;color:var(--navy);margin:10px 0}
.meta{color:var(--mute);font-size:14px;margin-bottom:6px;line-height:1.6}
.meta a{color:var(--ink);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.meta .role{color:var(--mute);font-weight:400}
.review{color:var(--mute);font-size:14px;margin-bottom:6px}
.review a{color:var(--ink);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.cover,.coverimg{width:100%;border-radius:18px;margin:16px 0 28px}.cover{height:240px}
.coverimg{height:auto;aspect-ratio:1200/630;object-fit:cover;display:block}
.coverfig{margin:16px 0 28px}.coverfig .coverimg{margin:0}.coverfig figcaption{font-size:12px;color:var(--mute);margin-top:6px}
.toolbar{display:flex;align-items:center;gap:10px;position:relative;margin:14px 0 0}
.btn-s{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 14px Inter,sans-serif;cursor:pointer}
.btn-s:hover{border-color:var(--teal)}
.btn-s svg{width:18px;height:18px}
.share-panel{position:absolute;top:calc(100% + 8px);left:0;z-index:20;width:min(280px,calc(100vw - 40px));background:var(--bg);border:1px solid var(--line);border-radius:14px;box-shadow:0 14px 32px rgba(0,0,0,.2);padding:6px}
.share-panel[hidden]{display:none}
.share-panel a,.share-panel button{display:flex;align-items:center;width:100%;min-height:46px;padding:0 14px;border:0;background:none;color:var(--ink);font:500 15px Inter,sans-serif;text-align:left;border-radius:10px;cursor:pointer}
.share-panel a:hover,.share-panel button:hover{background:var(--sand)}
.status{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.endact{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:32px 0 20px;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:var(--sand)}
.endact .q{font-weight:600;color:var(--navy)}
.endact small{flex-basis:100%;color:var(--mute);font-size:13px}
.like{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 14px Inter,sans-serif;cursor:pointer}
.like[aria-pressed=true]{background:var(--coral);border-color:var(--coral);color:var(--on-accent)}
.author{display:flex;gap:14px;align-items:flex-start;background:var(--sand);border-radius:14px;padding:18px;margin:0 0 14px}
.author .av{flex:none;width:48px;height:48px;border-radius:50%;background:#0e7c75;color:#fff;display:grid;place-items:center;font:700 20px Fraunces,serif}
.author p{font-size:14px;color:var(--mute);line-height:1.5}
.author .who{font-weight:700;color:var(--navy)}.author .who a{text-decoration:underline;text-underline-offset:3px}
.author .rl{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--teal);display:block}
.prose{font-size:18px}
.prose p{margin:0 0 20px}.prose h2{font-family:Fraunces,Georgia,serif;color:var(--navy);font-size:28px;margin:40px 0 14px;line-height:1.25}
.prose h3{font-size:21px;margin:28px 0 10px;color:var(--navy)}
.prose ul,.prose ol{margin:0 0 20px;padding-left:24px}.prose li{margin-bottom:8px}
.prose a{color:var(--teal);text-decoration:underline}
.prose a.xl{text-decoration-thickness:1px;text-underline-offset:3px}
.prose a.xl::after{content:'↗';font-size:.7em;margin-left:2px;opacity:.7;text-decoration:none;display:inline-block}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.prose blockquote{border-left:4px solid var(--teal-l);background:var(--sand);padding:14px 18px;border-radius:0 12px 12px 0;margin:0 0 20px}
.tbl{overflow-x:auto;margin:0 0 20px;-webkit-overflow-scrolling:touch}
.prose table{border-collapse:collapse;width:100%;min-width:480px;font-size:15.5px}
.prose th,.prose td{border:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top;line-height:1.5}
.prose th{background:var(--sand);color:var(--navy);font-weight:700}
.toc{background:var(--sand);border-radius:14px;padding:16px 20px;margin-bottom:28px;font-size:15px}
.toc b{display:block;margin-bottom:6px}.toc a{display:block;padding:4px 0;color:var(--teal)}
.crumb{font-size:14px;color:var(--mute)}.crumb a:hover{color:var(--teal)}
footer{background:#0B2545;color:#c4d0e0;padding:40px 0;font-size:14px;margin-top:40px}
footer .logo{color:#fff}footer a:hover{color:#fff}
.flinks{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px}
.pagehead{padding:40px 0 8px}.pagehead h1{font-family:Fraunces,Georgia,serif;font-size:38px;color:var(--navy);line-height:1.2}
@media (max-width:640px){
.hero{padding:22px 0 26px}.hero h1{font-size:27px}.hero p{font-size:15px;margin:8px 0 14px}.btn{padding:10px 20px}
section{padding:28px 0}h2.s{font-size:24px;margin-bottom:16px}
.prose{font-size:17px}.prose h2{font-size:24px}
.cats{grid-template-columns:repeat(2,1fr)}
.pagehead h1{font-size:30px}
}
`;

const MENU_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const SHARE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg>';
const navLinks = (active) => Object.entries(CATS).map(([k, v]) => `<a href="/kategori/${k}/"${active === k ? ' aria-current="page"' : ''}>${esc(v.name)}</a>`).join('');

// Skrip global: menu telefon. Dimuatkan pada semua halaman.
const GLOBAL_JS = `<script>(function(){
var b=document.getElementById('menu-btn'),p=document.getElementById('menu-panel');
if(!b||!p)return;
function set(o){b.setAttribute('aria-expanded',o?'true':'false');p.hidden=!o;b.querySelector('.lbl').textContent=o?'Tutup':'Menu'}
b.addEventListener('click',function(e){e.stopPropagation();set(p.hidden)});
document.addEventListener('click',function(e){if(!p.hidden&&!p.contains(e.target)&&!b.contains(e.target))set(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!p.hidden){set(false);b.focus()}});
p.addEventListener('click',function(e){if(e.target.closest('a'))set(false)});
window.addEventListener('resize',function(){if(window.innerWidth>=900&&!p.hidden)set(false)});
})();</script>`;

function layout({ title, desc, path: p, body, active, type = 'website', jsonld = '', scripts = '' }) {
  const full = title === SITE.name ? `${SITE.name} – ${SITE.tagline}` : `${title} | ${SITE.name}`;
  return `<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>document.documentElement.className+=' js'</script>
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE.url}${p}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${SITE.url}${p}"><meta property="og:site_name" content="${SITE.name}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230B2545'/%3E%3Ccircle cx='16' cy='16' r='7' fill='%2313A89E'/%3E%3C/svg%3E">
<link rel="alternate" type="application/rss+xml" href="/rss.xml" title="${SITE.name}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
<meta name="theme-color" content="#0B2545">
${SITE.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}" crossorigin="anonymous"></script>` : ''}
${SITE.analyticsId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.analyticsId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${SITE.analyticsId}')</script>` : ''}
${jsonld}
</head><body>
<a class="skip" href="#utama">Langkau ke kandungan</a>
<header><div class="wrap nav"><a class="logo" href="/">Jelajah<b>Asia</b></a>
<nav class="inline" aria-label="Kategori utama">${navLinks(active)}</nav>
<button id="menu-btn" class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-panel">${MENU_ICON}<span class="lbl">Menu</span></button>
</div>
<nav id="menu-panel" class="menu-panel" aria-label="Semua kategori" hidden>${navLinks(active)}</nav></header>
<main id="utama">${body}</main>
<footer><div class="wrap"><a class="logo" href="/">Jelajah<b>Asia</b></a>
<p style="margin-top:8px">${esc(SITE.tagline)}</p>
<div class="flinks"><a href="/tentang/">Tentang Kami</a><a href="/penulis/">Penulis &amp; Penyemak</a><a href="/hubungi/">Hubungi</a><a href="/dasar-privasi/">Dasar Privasi</a><a href="/terma/">Terma</a><a href="/penafian/">Penafian</a><a href="/iklan-tajaan/">Iklan &amp; Tajaan</a></div>
<p style="margin-top:14px;color:#c4d0e0">© ${new Date().getFullYear()} ${SITE.name}. Hak cipta terpelihara.</p></div></footer>
${GLOBAL_JS}${scripts}
</body></html>`;
}

const adSlot = () => SITE.adsenseClient
  ? `<ins class="adsbygoogle" style="display:block" data-ad-client="${SITE.adsenseClient}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})</script>`
  : '';
const cover = (a, cls, eager) => a.image ? `<img class="${cls}" src="${a.image}" alt="${esc(a.imageAlt || a.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} width="1200" height="630">` : '';
const card = (a, note = '') => `<a class="card" href="${a.url}" data-negara="${a.negara.map(slugify).join(' ')}">${a.image ? cover(a, 'img') : `<div class="img g-${CATS[a.cat].c}">${esc(a.title.charAt(0))}</div>`}<div class="t"><span class="tag">${esc(CATS[a.cat].name)}</span><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p>${note ? `<span class="note">${esc(note)}</span>` : ''}</div></a>`;

// ---- Perkongsian dan suka (halaman artikel) ----
const shareBlock = (a) => {
  const u = encodeURIComponent(SITE.url + a.url), t = encodeURIComponent(a.title);
  return `<div class="toolbar" data-url="${SITE.url}${a.url}" data-title="${esc(a.title)}">
<button id="share-btn" class="btn-s" type="button" aria-expanded="false" aria-controls="share-panel">${SHARE_ICON}Kongsi</button>
<div id="share-panel" class="share-panel" role="group" aria-label="Pilihan perkongsian" hidden>
<a target="_blank" rel="noopener" href="https://wa.me/?text=${t}%20${u}">WhatsApp</a>
<a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${u}">Facebook</a>
<a target="_blank" rel="noopener" href="https://t.me/share/url?url=${u}&amp;text=${t}">Telegram</a>
<a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${u}&amp;text=${t}">X</a>
<button id="share-native" type="button" hidden>Lagi pilihan di peranti…</button>
<button id="share-copy" type="button">Salin pautan</button>
</div><span id="share-status" class="status" role="status" aria-live="polite"></span></div>`;
};
const likeBlock = (a) => `<div class="endact" data-slug="${a.slug}"><span class="q">Artikel ini membantu?</span>
<button id="like-btn" class="like" type="button" aria-pressed="false"><span id="like-h" aria-hidden="true">♡</span><span id="like-n">Suka artikel ini</span></button>
<small>Sukaan disimpan pada peranti anda sahaja.</small></div>`;
const ARTICLE_JS = `<script>(function(){
var L=function(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
var tb=document.querySelector('.toolbar'),sb=document.getElementById('share-btn'),sp=document.getElementById('share-panel');
if(tb&&sb&&sp){
var st=document.getElementById('share-status'),nat=document.getElementById('share-native'),cp=document.getElementById('share-copy');
function open(o){sb.setAttribute('aria-expanded',o?'true':'false');sp.hidden=!o;if(o){var f=sp.querySelector('a');if(f)f.focus()}}
sb.addEventListener('click',function(e){e.stopPropagation();open(sp.hidden)});
document.addEventListener('click',function(e){if(!sp.hidden&&!sp.contains(e.target)&&!sb.contains(e.target))open(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!sp.hidden){open(false);sb.focus()}});
if(navigator.share){nat.hidden=false;nat.addEventListener('click',function(){navigator.share({title:tb.dataset.title,url:tb.dataset.url}).catch(function(){});open(false)})}
cp.addEventListener('click',function(){var u=tb.dataset.url;
function done(){st.textContent='Pautan disalin';cp.textContent='Pautan disalin';setTimeout(function(){cp.textContent='Salin pautan';st.textContent='';open(false);sb.focus()},1200)}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(done,function(){prompt('Salin pautan:',u)})}else{prompt('Salin pautan:',u)}});
}
var ea=document.querySelector('.endact'),lb=document.getElementById('like-btn');
if(ea&&lb){var key='liked:'+ea.dataset.slug;
function paint(on){lb.setAttribute('aria-pressed',on?'true':'false');document.getElementById('like-h').textContent=on?'♥':'♡';document.getElementById('like-n').textContent=on?'Anda menyukai artikel ini':'Suka artikel ini'}
paint(L(key)==='1');
lb.addEventListener('click',function(){var on=L(key)!=='1';L(key,on?'1':'0');paint(on)});}
})();</script>`;
const FILTER_JS = `<script>(function(){
var sel=document.getElementById('negara');if(!sel)return;
var cards=[].slice.call(document.querySelectorAll('.card[data-negara]')),out=document.getElementById('hasil');
function apply(v,push){var n=0;cards.forEach(function(c){var show=!v||(' '+c.dataset.negara+' ').indexOf(' '+v+' ')>-1;c.hidden=!show;if(show)n++});
out.textContent=n+' artikel dipaparkan';
if(push){try{var u=new URL(location.href);if(v)u.searchParams.set('negara',v);else u.searchParams.delete('negara');history.replaceState(null,'',u)}catch(e){}}}
sel.addEventListener('change',function(){apply(sel.value,true)});
var q=new URLSearchParams(location.search).get('negara');
if(q&&[].some.call(sel.options,function(o){return o.value===q})){sel.value=q}
apply(sel.value,false);
})();</script>`;

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
  const penulis = meta.penulis || deskOf(meta.category);
  if (!AUTHORS[penulis]) throw new Error(`Penulis tidak wujud dalam data/penulis.json (${f}): ${penulis}`);
  if (meta.penyemak && !AUTHORS[meta.penyemak]) throw new Error(`Penyemak tidak wujud dalam data/penulis.json (${f}): ${meta.penyemak}`);
  if (meta.tarikhsemak && !meta.penyemak) console.warn(`Amaran: ${f} ada tarikhsemak tetapi tiada penyemak; tidak dipaparkan.`);
  const { html, headings } = md(body);
  const words = body.split(/\s+/).length;
  const negara = (meta.negara || '').split(',').map(x => x.trim()).filter(Boolean);
  return { slug, url: `/${slug}/`, image: meta.image ? `/images/${meta.image}` : '', imageAlt: meta.imageAlt || '', credit: meta.credit || '', title: meta.title, description: meta.description, cat: meta.category, date: meta.date, html, headings, words, negara, penulis, penyemak: meta.penyemak || '', tarikhsemak: meta.penyemak ? (meta.tarikhsemak || '') : '' };
}).filter(a => a.date <= today).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

// ---- Cadangan bacaan: destinasi sama dahulu, kemudian topik berkaitan, kategori sebagai sandaran ----
const STOP = new Set('yang untuk dalam dengan tentang atau dari pada ini itu serta adalah akan juga lebih paling kepada oleh bagi antara selepas sebelum seperti agar supaya kerana boleh tidak anda kita kami mereka satu dua tiga semua setiap mana apa bagaimana kenapa panduan'.split(' '));
const toks = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));
for (const a of articles) a._t = toks(a.title + ' ' + a.description);
function relatedFor(a) {
  return articles.filter(x => x.slug !== a.slug).map(x => {
    const shared = x.negara.filter(n => a.negara.includes(n));
    const inter = [...x._t].filter(w => a._t.has(w)).length, uni = new Set([...x._t, ...a._t]).size || 1;
    const jac = inter / uni;
    const primary = shared.length && (x.negara[0] === a.negara[0] || a.negara.includes(x.negara[0])) ? 1.5 : 0; // negara utama artikel sepadan
    const score = Math.min(shared.length, 2) * 10 + primary + (shared.length && x.cat === 'destinasi' && a.cat !== 'destinasi' ? 3 : 0) + (x.cat === a.cat ? 1 : 0) + jac * 6;
    const note = shared.length ? `Destinasi sama: ${shared.join(', ')}` : (jac >= 0.1 ? 'Topik berkaitan' : (x.cat === a.cat ? `Kategori sama: ${CATS[x.cat].name}` : ''));
    return { x, score, note };
  }).sort((p, q) => q.score - p.score || q.x.date.localeCompare(p.x.date) || p.x.title.localeCompare(q.x.title)).slice(0, 3);
}

// ---- Halaman penulis ----
const initials = n => n.replace(/^Meja\s+/i, '').trim().charAt(0).toUpperCase() || 'J';
const hasProfile = id => AUTHORS[id] && AUTHORS[id].halaman !== false;
const authorName = id => hasProfile(id) ? `<a href="/penulis/${id}/">${esc(AUTHORS[id].nama)}</a>` : esc(AUTHORS[id].nama);
const roleOf = id => AUTHORS[id].jenis === 'meja' ? 'Meja editorial' : AUTHORS[id].peranan;
const authorCard = (id, label) => `<div class="author"><div class="av" aria-hidden="true">${esc(initials(AUTHORS[id].nama))}</div><div><span class="rl">${esc(label)}</span><span class="who">${authorName(id)}</span> <span class="rl" style="display:inline;text-transform:none;letter-spacing:0;font-weight:400;color:var(--mute)">· ${esc(roleOf(id))}</span><p>${esc(AUTHORS[id].bio)}</p></div></div>`;

for (const a of articles) {
  const rel = relatedFor(a);
  const toc = a.headings.length > 2 ? `<nav class="toc" aria-label="Isi kandungan"><b>Dalam artikel ini</b>${a.headings.map(h => `<a href="#${h.id}">${esc(h.text)}</a>`).join('')}</nav>` : '';
  const au = AUTHORS[a.penulis];
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.description, datePublished: a.date, author: { '@type': au.jenis === 'orang' ? 'Person' : 'Organization', name: au.nama, ...(hasProfile(a.penulis) ? { url: `${SITE.url}/penulis/${a.penulis}/` } : {}) }, publisher: { '@type': 'Organization', name: SITE.name } })}</script>`;
  const rev = a.penyemak ? `<div class="review">Disemak oleh ${authorName(a.penyemak)} <span class="role">(${esc(roleOf(a.penyemak))})</span>${a.tarikhsemak ? ` · semakan terakhir: ${fmtDate(a.tarikhsemak)}` : ''}</div>` : '';
  write(`${a.slug}/index.html`, layout({
    title: a.title, desc: a.description, path: a.url, active: a.cat, type: 'article', jsonld: ld, scripts: ARTICLE_JS,
    body: `<div class="narrow"><article style="padding-top:28px">
<div class="crumb"><a href="/">Utama</a> › <a href="/kategori/${a.cat}/">${esc(CATS[a.cat].name)}</a></div>
<h1>${esc(a.title)}</h1>
<div class="meta">Ditulis oleh ${authorName(a.penulis)} <span class="role">(${esc(roleOf(a.penulis))})</span> · ${fmtDate(a.date)} · ${Math.max(1, Math.round(a.words / 200))} minit bacaan</div>
${rev}
${shareBlock(a)}
${a.image ? `<figure class="coverfig">${cover(a, 'coverimg', true)}${a.credit ? `<figcaption>${esc(a.credit)}</figcaption>` : ''}</figure>` : `<div class="cover g-${CATS[a.cat].c}"></div>`}${toc}<div class="prose">${a.html}</div>
${likeBlock(a)}
${authorCard(a.penulis, 'Ditulis oleh')}${a.penyemak ? authorCard(a.penyemak, 'Disemak oleh') : ''}
${adSlot()}</article></div>
${rel.length ? `<section><div class="wrap"><h2 class="s">Baca Seterusnya</h2><div class="grid">${rel.map(r => card(r.x, r.note)).join('')}</div></div></section>` : ''}`,
  }));
}

// Halaman penulis
const profiles = Object.keys(AUTHORS).filter(hasProfile);
const byAuthor = id => articles.filter(a => a.penulis === id);
const byReviewer = id => articles.filter(a => a.penyemak === id);
for (const id of profiles) {
  const au = AUTHORS[id], w = byAuthor(id), r = byReviewer(id);
  write(`penulis/${id}/index.html`, layout({
    title: au.nama, desc: `${au.nama}, ${roleOf(id).toLowerCase()} di ${SITE.name}. ${au.bio}`, path: `/penulis/${id}/`,
    body: `<div class="wrap"><div class="pagehead"><div class="eyebrow">${esc(roleOf(id))}</div><h1>${esc(au.nama)}</h1><p style="color:var(--mute);max-width:640px;margin-top:8px">${esc(au.bio)}</p></div>
<section style="padding-top:24px"><h2 class="s">Ditulis oleh ${esc(au.nama)} (${w.length})</h2><div class="grid">${w.map(a => card(a)).join('') || '<p>Belum ada artikel.</p>'}</div></section>
${r.length ? `<section style="padding-top:0"><h2 class="s">Disemak oleh ${esc(au.nama)} (${r.length})</h2><div class="grid">${r.map(a => card(a)).join('')}</div></section>` : ''}</div>`,
  }));
}
write('penulis/index.html', layout({
  title: 'Penulis & Penyemak', desc: `Pasukan penulis dan penyemak ${SITE.name}.`, path: '/penulis/',
  body: `<div class="narrow"><div class="pagehead"><h1>Penulis &amp; Penyemak</h1></div><div class="prose" style="padding-bottom:24px"><p>Setiap artikel dipaparkan bersama penulisnya. Nama penyemak hanya ditunjukkan apabila seseorang benar-benar telah menyemak artikel itu.</p></div>
${profiles.map(id => authorCard(id, AUTHORS[id].jenis === 'meja' ? 'Pasukan' : 'Individu')).join('')}<div style="height:24px"></div></div>`,
}));

// Laman utama
const catCount = k => articles.filter(a => a.cat === k).length;
const featured = articles.find(a => a.slug === SITE.pilihanEditor) || articles.find(a => a.image) || articles[0];
const featuredHtml = featured ? `<a class="feature" href="${featured.url}">${featured.image ? `<img class="fimg" src="${featured.image}" alt="${esc(featured.imageAlt || featured.title)}" fetchpriority="high" width="1200" height="630">` : `<div class="fimg g-${CATS[featured.cat].c}"></div>`}<div class="ft"><span class="tag">${esc(CATS[featured.cat].name)}</span><h3>${esc(featured.title)}</h3><p>${esc(featured.description)}</p><span class="more">Baca artikel →</span></div></a>` : '';
write('index.html', layout({
  title: SITE.name, desc: 'Panduan destinasi, tips jimat, sejarah, ekonomi dan kisah menarik dari seluruh Asia dalam Bahasa Melayu.', path: '/', scripts: '',
  body: `<div class="hero"><div class="wrap"><h1>${esc(SITE.tagline)}</h1><p>Panduan destinasi, tips jimat, sejarah dan kisah menarik dari seluruh Asia, dalam Bahasa Melayu.</p><a class="btn" href="#terkini">Mula Membaca</a></div></div>
${featured ? `<section style="padding-bottom:12px"><div class="wrap"><div class="eyebrow">Pilihan Editor</div>${featuredHtml}</div></section>` : ''}
<section><div class="wrap"><h2 class="s">Layari Mengikut Topik</h2><div class="cats">${Object.entries(CATS).map(([k, v]) => `<a class="cat" href="/kategori/${k}/">${esc(v.name)}<small>${catCount(k)} artikel</small></a>`).join('')}</div></div></section>
<section id="terkini" style="padding-top:0"><div class="wrap"><h2 class="s">Artikel Terkini</h2><div class="grid">${articles.filter(a => a !== featured).slice(0, 12).map(a => card(a)).join('')}</div></div></section>`,
}));

// Kategori (Destinasi mempunyai penapis Ikut Negara)
for (const [k, v] of Object.entries(CATS)) {
  const list = articles.filter(a => a.cat === k);
  let filter = '', scripts = '';
  if (k === 'destinasi') {
    const counts = {};
    for (const a of list) for (const n of a.negara) counts[n] = (counts[n] || 0) + 1;
    const opts = Object.entries(counts).sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0], 'ms'));
    filter = `<div class="filterbar"><label for="negara">Ikut Negara</label><select id="negara"><option value="">Semua negara (${list.length})</option>${opts.map(([n, c]) => `<option value="${slugify(n)}">${esc(n)} (${c})</option>`).join('')}</select><span id="hasil" class="hasil" role="status" aria-live="polite"></span></div>`;
    scripts = FILTER_JS;
  }
  write(`kategori/${k}/index.html`, layout({
    title: v.name, desc: v.desc, path: `/kategori/${k}/`, active: k, scripts,
    body: `<div class="wrap"><div class="pagehead"><h1>${esc(v.name)}</h1><p style="color:var(--mute)">${esc(v.desc)}</p></div><section style="padding-top:24px">${filter}<div class="grid">${list.map(a => card(a)).join('') || '<p>Artikel akan datang.</p>'}</div></section></div>`,
  }));
}

// Halaman statik
const pages = {
  tentang: ['Tentang Kami', `<p>${SITE.name} ialah laman web panduan pelancongan dalam Bahasa Melayu yang memfokuskan Asia. Kami menulis tentang destinasi, tips perjalanan, sejarah, budaya, ekonomi pelancongan dan kisah tokoh pengembara.</p><p>Matlamat kami mudah: membantu pembaca merancang perjalanan yang lebih bijak, jimat dan bermakna, dengan maklumat yang jelas dan mudah difahami.</p><h2>Cara Kami Menulis</h2><p>Setiap artikel disemak untuk ketepatan fakta. Harga, visa dan peraturan perjalanan sering berubah, jadi sentiasa sahkan dengan sumber rasmi sebelum bertolak. Jika anda terjumpa kesilapan, sila <a href="/hubungi/">hubungi kami</a>.</p><h2>Siapa yang menulis dan menyemak</h2><p>Setiap artikel menunjukkan penulisnya. Nama penyemak dan tarikh semakan hanya dipaparkan apabila semakan itu benar-benar dibuat. Lihat senarai penuh di halaman <a href="/penulis/">Penulis &amp; Penyemak</a>.</p>`],
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
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/penulis/', ...profiles.map(id => `/penulis/${id}/`), ...Object.keys(CATS).map(k => `/kategori/${k}/`), ...articles.map(a => a.url)].map(u => `<url><loc>${SITE.url}${u}</loc></url>`).join('')}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${SITE.name}</title><link>${SITE.url}</link><description>${esc(SITE.tagline)}</description>${articles.slice(0, 30).map(a => `<item><title>${esc(a.title)}</title><link>${SITE.url}${a.url}</link><description>${esc(a.description)}</description><pubDate>${new Date(a.date).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`);
write('404.html', layout({ title: 'Halaman tidak dijumpai', desc: '404', path: '/404.html', body: `<div class="narrow" style="padding:80px 20px;text-align:center"><h1 style="font-family:Fraunces,serif;font-size:48px">404</h1><p>Halaman tidak dijumpai. <a href="/" style="color:var(--teal);text-decoration:underline">Kembali ke laman utama</a>.</p></div>` }));

console.log(`Siap: ${articles.length} artikel diterbitkan (tarikh <= ${today}).`);
