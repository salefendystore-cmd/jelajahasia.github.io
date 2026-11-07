# Panduan Terbit di GitHub Pages (langkah demi langkah)

## Sekali sahaja
1. Daftar akaun di github.com (percuma).
2. Cipta repositori baharu, **Public**. Nama disyorkan: `NAMAGITHUB.github.io` (gantikan NAMAGITHUB dengan username anda). Jika guna nama lain, pautan site akan rosak kecuali anda sambung domain sendiri.
3. Muat naik semua fail dalam folder `site/` ke repositori itu (atau minta Claude buat `git push`).
4. Dalam repositori: **Settings → Pages → Source: GitHub Actions**.
5. **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Nama: `SITE_URL`
   - Nilai: `https://NAMAGITHUB.github.io` (atau domain anda, contoh `https://jelajahasia.com`)
6. Tab **Actions** → pilih "Bina dan terbit site" → **Run workflow**. Selepas ~1 minit, site hidup.

## Domain sendiri (diperlukan untuk AdSense)
1. Beli domain (~RM40 hingga 60/tahun).
2. Cipta fail `static/CNAME` yang mengandungi domain sahaja, contoh `jelajahasia.com`.
3. Di tetapan DNS domain, tambah rekod A ke 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 dan rekod CNAME `www` ke `NAMAGITHUB.github.io`.
4. Settings → Pages → masukkan domain → tandakan **Enforce HTTPS**.
5. Kemas kini nilai `SITE_URL` kepada domain baharu.

## Tambah artikel
Letak fail `.md` baharu dalam `content/` dengan tarikh terbit. Selepas push, site dibina semula. Setiap hari pada 06:05 pagi (waktu Malaysia) GitHub membina semula site secara automatik, jadi artikel berdasarkan tarikh akan terbit sendiri.

## Selepas AdSense lulus
Isi `adsenseClient` dan `analyticsId` di bahagian atas `build.mjs`, dan letak `ads.txt` dalam `static/`.
