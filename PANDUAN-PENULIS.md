# Cara mengisi penulis dan penyemak

Semua maklumat penulis ada dalam `data/penulis.json`. Tiada nama sebenar dicipta oleh sistem; ia hanya dipaparkan jika anda mengisinya.

## 1. Tambah orang sebenar
Tambah satu entri dalam `data/penulis.json`:

```json
"nama-anda": {
  "nama": "Nama Penuh Anda",
  "jenis": "orang",
  "peranan": "Penulis dan penyunting",
  "bio": "Dua atau tiga ayat tentang anda dan kepakaran anda."
}
```
- `jenis`: `"orang"` untuk individu, `"meja"` untuk pasukan editorial.
- Halaman profil `/penulis/nama-anda/` dijana secara automatik. Letak `"halaman": false` jika tidak mahu profil.

## 2. Tetapkan penulis atau penyemak pada artikel
Dalam bahagian atas fail artikel (`content/*.md`), tambah:

```
penulis: nama-anda
penyemak: id-penyemak
tarikhsemak: 2026-11-20
```
- Tanpa `penulis`, artikel dipaparkan atas nama meja editorial kategorinya.
- "Disemak oleh" hanya muncul jika `penyemak` diisi. Hanya isi apabila semakan benar-benar dibuat.
- `tarikhsemak` ialah tarikh semakan terakhir.

## 3. Pilihan Editor di halaman utama
Tukar `pilihanEditor` di bahagian atas `build.mjs` kepada nama fail artikel (tanpa `.md`).
