# Rilink Developer API Tester

Website lokal sederhana untuk menguji langsung **Rilink Developer Messaging API**.

## Ringkasan API yang diuji

Rilink mengekspos **dua** endpoint Developer API publik, keduanya di bawah guard yang sama:

| | |
|---|---|
| Endpoints | `POST /api/v1/messages/send`, `GET /api/v1/devices` |
| Auth | Laravel Sanctum bearer token, dengan ability `messages:send`. Token yang sudah lewat `expires_at` otomatis dihapus & ditolak (401). |
| Rate limit | 60 request/menit per token (`throttle:60,1`) |
| Dibuat di | `routes/api.php`, `app/Http/Controllers/Api/V1/DeveloperMessageController.php`, `app/Services/DeveloperApiMessageService.php` |
| Token dikelola di | Dashboard Rilink → **Developer API → Manage Tokens** (`routes/web.php` → `DeveloperApiController`) |

`POST /api/v1/messages/send` mengirim pesan WhatsApp lewat device yang sudah terhubung ke akun,
dengan 8 tipe pesan: `text`, `image`, `video`, `audio`, `document`, `button`, `list`, `carousel`.
Device pengirim diidentifikasi lewat **salah satu** dari dua field (`required_without` satu sama
lain):
- `device_id` (integer) — ID device, dicocokkan langsung ke kolom `id`.
- `sender_phone` (string) — nomor WhatsApp device, dicocokkan ke `phone_number` (dinormalisasi
  otomatis oleh server: suffix JID dibuang, awalan `0` diganti kode negara default `62`).

`GET /api/v1/devices` mengembalikan daftar device tenant yang `status = "connected"`
(`{"data": [{"id", "name", "sender_phone", "status"}, ...]}`) — dipakai tool ini untuk memetakan
nomor WhatsApp ke `device_id` tanpa perlu buka dashboard Rilink secara terpisah.

Field opsional tambahan di `messages/send`: `contact_name` dan `save_contact` (boolean) — bila
`to` belum jadi kontak dan `save_contact=true`, kontak baru otomatis dibuat.

**Update 18 Agt 2026** (commit `fe486fb`, "fix: require media for developer api interactive
messages"): `media_url` sekarang **wajib** untuk tipe `button` dan `list`, tidak hanya
`image/video/audio/document`. Dikonfirmasi end-to-end sampai ke Node `whatsapp-service` (Baileys
`^7.0.0-rc13`):
- `button` → `sendLegacyHybridInteractive` hanya mendukung **image** sebagai header.
- `list` → `sendNativeInteractive` mendukung **image/video/dokumen** sebagai header (dideteksi dari
  ekstensi URL).

Endpoint API lain di codebase (`WhatsAppController`, `BroadcastWebhookController`) adalah
webhook/endpoint internal antara Laravel dan service Node `whatsapp-service`, **bukan** bagian
dari Developer API publik, jadi tidak disertakan di tool ini.

## Menjalankan

Butuh Node.js ≥ 18 (tidak ada dependency npm yang perlu di-install).

```bash
node server.js
```

Buka `http://localhost:4780` di browser.

## Mengapa ada server lokal, bukan HTML statis saja?

Backend Rilink tidak memiliki konfigurasi CORS publik, jadi API-nya tidak mengirim header
`Access-Control-Allow-Origin`. Kalau halaman statis langsung `fetch()` ke `https://rilink.id`
dari browser, request preflight (`OPTIONS`) akan diblokir CORS. `server.js` menyediakan dua
endpoint proxy same-origin (`POST /api/proxy/send`, `POST /api/proxy/devices`) yang meneruskan
request itu server-ke-server ke endpoint asli (`POST .../messages/send`, `GET .../devices`), jadi
browser cukup bicara ke `localhost` dan CORS tidak relevan lagi. Proxy ini tidak menyimpan token
di mana pun — token hanya diteruskan per-request.

## Cara pakai

1. Buat personal access token dari halaman **Developer API** di dashboard Rilink (perlu plan yang
   mengaktifkan `developer_api_enabled`). Tempel token itu ke field **Bearer Token**.
2. Isi **Base URL** — default `https://rilink.id`, atau arahkan ke instance development lokal Anda
   (misalnya `http://localhost:8000` kalau backend dijalankan via `php artisan serve`).
3. Di **Compose Pesan**, pilih cara mengidentifikasi device pengirim: `device_id` (integer) atau
   `sender_phone` (nomor WhatsApp device). Kalau tidak hafal ID/nomornya, klik **"Ambil Daftar
   Device (GET /api/v1/devices)"** — dropdown akan terisi device yang `connected` di akun Anda
   (nama, nomor, ID); memilih salah satu otomatis mengisi field yang sesuai dengan mode aktif.
4. Isi `to` (nomor tujuan, format apa saja yang mengandung digit, mis. `6281234567890`).
5. Pilih `type`, lalu klik **"Muat contoh payload untuk type ini"** untuk mengisi form otomatis,
   atau isi manual. Untuk `button`/`list`/`carousel`, gunakan tombol `+ Tambah ...` untuk menambah
   baris.
6. Klik **Kirim Request**. Response asli dari API (status HTTP, durasi, body JSON) akan tampil di
   panel kanan, beserta riwayat request sebelumnya.
7. Panel **Skenario Cepat** menjalankan beberapa kasus error yang aman (tidak benar-benar mengirim
   WhatsApp) untuk memverifikasi penanganan error: tanpa token (401), tanpa `device_id`/
   `sender_phone` (422), `type` tidak valid (422), `text` kosong (422), `sender_phone` tidak
   terdaftar (422), dan `device_id`/`sender_phone` yang saling tidak cocok (422).

**Perhatian:** mengirim payload valid untuk `type` apa pun akan benar-benar mengirim pesan
WhatsApp nyata lewat device yang terhubung ke token Anda. Gunakan nomor tujuan milik sendiri saat
menguji.

## Struktur file

```
api_test/
├── server.js          # server statis + proxy (Node, tanpa dependency eksternal)
├── package.json
└── public/
    ├── index.html      # UI tester
    ├── style.css
    └── app.js          # form dinamis per tipe pesan, kirim request, render response
```
