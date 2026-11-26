# Tirai

**Sistem informasi ZISWAF privacy-first.** Data mustahik dienkripsi di browser sebelum dikirim, setiap pembukaan data wajib menyebut tujuan dan tercatat di log berantai hash, dan setiap pengguna bisa melihat, mengekspor, atau menghapus datanya sendiri.

> Tugas Besar ICT dan Islam · Topik D: Aplikasi Privacy-First Berbasis Prinsip Digital Amanah

- **Enkripsi end-to-end:** server, admin, dan pengembang tidak bisa membaca data mustahik.
- **Login zero-knowledge:** password tidak pernah dikirim ke server.
- **Singkap dengan tujuan:** amil wajib menulis alasan sebelum membuka data, dan mustahik bisa melihat catatannya (QS. Al-Hujurat: 12).
- **Donasi anonim:** amil pun hanya melihat "Hamba Allah" (QS. Al-Baqarah: 271).
- **Log audit berantai hash:** perubahan diam-diam pada log langsung terdeteksi.
- **Hak subjek data (UU PDP):** lihat, ekspor, dan hapus akun dengan crypto-shredding.

Rancangan lengkap, model ancaman, dan landasan syariatnya ada di [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md).

## Mulai cepat

Butuh **Node.js 22 atau lebih baru**. PostgreSQL dan Docker tidak wajib, karena secara default proyek memakai PGlite (PostgreSQL dalam WebAssembly) yang tersimpan di folder `.data/`.

```bash
npm install
```

```bash
npm run db:setup
```

```bash
npm run dev
```

Buka http://localhost:3000.

### Akun demo

Semua akun memakai password **`tirai-demo-2026`**, hanya untuk pengembangan lokal. Nama, NIK, dan alamat di data demo semuanya fiktif.

| Username | Peran | Yang bisa dicoba |
|---|---|---|
| `amil.pusat` | Amil, Unit Pusat | Daftarkan mustahik lewat wizard, lalu singkap data dengan tujuan |
| `amil.barat` | Amil, Unit Barat | Tidak bisa melihat data Unit Pusat (isolasi antar-unit) |
| `auditor` | Auditor | Periksa keutuhan rantai log dan laporan agregat, tanpa identitas |
| `donatur` | Donatur | Berdonasi, termasuk secara anonim |
| `mustahik` | Mustahik | Lihat siapa yang membuka data Anda dan untuk apa |

### Skenario demo (untuk video)

1. Masuk sebagai `amil.pusat`, buka **Mustahik**, klik **Singkap** pada satu kartu, lalu tulis tujuannya. Data terbuka 60 detik, kemudian terkunci lagi.
2. Masuk sebagai `mustahik`, buka **Data Saya**. Pembukaan tadi muncul di timeline beserta tujuannya.
3. Masuk sebagai `amil.barat`. Data Unit Pusat tidak terlihat sama sekali.
4. Masuk sebagai `donatur` dan berdonasi dengan **Sembunyikan nama saya**. Masuk lagi sebagai amil, maka donasi itu tampil sebagai "Hamba Allah".
5. Masuk sebagai `auditor` dan buka **Audit** untuk melihat status rantai hash.

## Memakai PostgreSQL sungguhan

```bash
docker compose up -d
```

Lalu salin `.env.example` menjadi `.env.local`, aktifkan baris `DATABASE_URL`, dan jalankan `npm run db:setup`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan aplikasi di http://localhost:3000 |
| `npm test` | Test unit: kripto, RBAC, rantai audit, hash password |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | Build produksi |
| `npm run db:setup` | Migrasi + data demo |
| `npm run db:reset` | Menghapus database PGlite lokal (lalu jalankan `db:setup` lagi) |
| `npm run db:generate` | Membuat file migrasi baru setelah `schema.ts` diubah |

## Struktur

```
src/
  lib/crypto/      Enkripsi (Web Crypto API), sama persis di browser dan Node
  lib/auth/        Hash scrypt, sesi, data access layer
  lib/rbac.ts      Matriks izin per peran
  lib/audit*.ts    Log audit berantai hash
  lib/db/          Skema Drizzle dan koneksi (PGlite / PostgreSQL)
  lib/client/      Logika browser: brankas kunci, login, enkripsi asesmen
  app/api/         Route API (lihat docs/API.md)
  app/(app)/       Halaman setelah login
  components/      Komponen tampilan (gaya paper cut out)
scripts/           Migrasi, seed, reset
docs/              Arsitektur, API, pernyataan penggunaan AI
```

## Dokumentasi

- [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md): desain enkripsi, RBAC, model ancaman, hak subjek data, landasan syariat
- [docs/API.md](docs/API.md): semua endpoint API
- [docs/PERNYATAAN-AI.md](docs/PERNYATAAN-AI.md): draf pernyataan penggunaan AI (wajib menurut panduan tugas besar)

## Catatan

- **Jangan jalankan `db:seed` atau `db:reset` saat `npm run dev` sedang berjalan** jika memakai PGlite. PGlite hanya boleh dibuka oleh satu proses.
- Jika tampilan tidak berubah setelah menjalankan `npm run build`, hapus folder `.next` lalu jalankan `npm run dev` lagi.
- Font (Fredoka, Nunito) diunduh saat build dan disajikan dari server sendiri, jadi browser pengguna tidak menghubungi Google.
- Pembayaran donasi masih berupa simulasi dan belum terhubung ke payment gateway.
