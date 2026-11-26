# Dokumentasi API Tirai

Semua endpoint menerima dan mengembalikan JSON. Error selalu berbentuk `{ "error": "pesan" }`, ditambah `issues` untuk error validasi (400).

**Autentikasi:** cookie sesi `tirai_session` (httpOnly, SameSite=Lax, berlaku 8 jam), dibuat oleh `login` dan `register`.

**Perlindungan CSRF:** setiap `POST`/`DELETE` wajib membawa header `Origin` yang sama dengan host aplikasi. Browser mengirimnya otomatis. Permintaan dari situs lain ditolak dengan 403.

**Data terenkripsi** dikirim sebagai:
- `Encrypted`: `{ iv, ct }`, AES-256-GCM, base64
- `SealedBox`: `{ epk, iv, ct }`, ECDH P-256 ephemeral + HKDF + AES-256-GCM, base64

Server tidak pernah menerima data polos untuk bagian yang terenkripsi. Penjelasan lengkap ada di [ARSITEKTUR.md](ARSITEKTUR.md#4-desain-enkripsi-sudah).

---

## Autentikasi

### `POST /api/auth/prelogin`
Mengambil salt untuk menurunkan kunci dari password di browser.

| | |
|---|---|
| Izin | Publik |
| Body | `{ "username": "amil.pusat" }` |
| 200 | `{ "salt": "<base64>", "iterations": 600000 }` |

Username yang tidak terdaftar tetap mendapat salt palsu yang konsisten, supaya endpoint ini tidak bisa dipakai untuk menebak siapa saja yang punya akun.

### `POST /api/auth/register`
Mendaftar sebagai donatur. Semua kunci dibuat di browser.

| | |
|---|---|
| Izin | Publik |
| Body | `username`, `displayName`, `authKey`, `kdfSalt`, `kdfIterations` (≥ 600000), `publicKey`, `wrappedPrivateKey: Encrypted`, `recoveryWrappedPrivateKey: Encrypted`, `consent: true` |
| 201 | `{ "userId": "<uuid>" }` + cookie sesi |
| 409 | Username sudah dipakai |

### `POST /api/auth/login`

| | |
|---|---|
| Izin | Publik |
| Body | `{ "username", "authKey" }`. `authKey` diturunkan dari password, bukan password itu sendiri |
| 200 | `{ "userId", "wrappedPrivateKey": Encrypted }` + cookie sesi |
| 401 | Username atau password salah (pesannya sama untuk keduanya) |

### `POST /api/auth/logout`
Menghapus sesi. Selalu 200.

---

## Kunci

### `GET /api/keys/me`
Materi kunci milik pengguna, semuanya masih terenkripsi.

| | |
|---|---|
| Izin | Login |
| 200 | `{ kdfSalt, kdfIterations, publicKey, wrappedPrivateKey, units: [{ unitId, name, publicKey, sealedUnitKey: SealedBox }] }` |

`units` hanya terisi untuk amil. Isinya kunci privat unit yang disegel ke kunci publik amil tersebut.

---

## Mustahik

### `POST /api/mustahik`
Mendaftarkan mustahik. Isi asesmen dienkripsi di browser amil.

| | |
|---|---|
| Izin | `mustahik:create` + anggota unit |
| Body | `id` (UUID dari browser, dipakai sebagai AAD), `unitId`, `asnaf`, `district` (kecamatan), `ciphertext: Encrypted`, `unitSealedKey: SealedBox` |
| 201 | `{ "id", "code": "MST-XXXXXX" }` |
| 403 | Bukan anggota unit |

### `POST /api/mustahik/{id}/open`
Satu-satunya jalan untuk mendapatkan ciphertext data mustahik. Tujuan dicatat di log audit **sebelum** data diberikan.

| | |
|---|---|
| Izin | `mustahik:open` + anggota unit pemilik data |
| Body | `{ "purpose": "Verifikasi kelayakan penyaluran Ramadan" }` (10–300 karakter) |
| 200 | `{ unitId, ciphertext: Encrypted, sealedKey: SealedBox }` |
| 404 | Data tidak ada **atau** bukan unit Anda. Sengaja dibuat sama supaya keberadaan data tidak bocor |

---

## Donasi

### `POST /api/donasi`

| | |
|---|---|
| Izin | `donation:create` |
| Body | `{ "program": "zakat_mal" \| "zakat_fitrah" \| "infak" \| "sedekah" \| "wakaf", "amount": 100000, "isAnonymous": true }` |
| 201 | `{ "id" }` |

Donasi anonim tidak mencatat pelaku di log audit, dan nama donaturnya disembunyikan dari amil.

---

## Data Saya (hak subjek data)

### `GET /api/me`
Ekspor semua data milik pengguna.

| | |
|---|---|
| Izin | `data:own` |
| 200 | `{ exportedAt, profile, donations, assessments: [{ ..., ciphertext, sealedKey }], activity }` |

Asesmen dikirim terenkripsi. Browser pengguna membukanya dengan kunci privatnya sendiri sebelum file diunduh.

### `DELETE /api/me`
Menghapus akun.

| | |
|---|---|
| Izin | `data:own` |
| Body | `{ "confirmUsername": "<username sendiri>" }` |
| 200 | `{ "ok": true }`, sesi ikut dihapus |
| 400 | Username konfirmasi tidak cocok |
| 409 | Pengguna adalah satu-satunya pemegang kunci di unitnya (data unit akan terkunci selamanya) |

Yang terjadi saat akun dihapus dijelaskan di [ARSITEKTUR.md bagian 6](ARSITEKTUR.md#6-hak-subjek-data-uu-no-27-tahun-2022-tentang-pdp).
