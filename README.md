# Rilink Developer API Tester

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/No%20Dependencies-000000?logo=npm&logoColor=white" alt="No Dependencies" />
  <img src="https://img.shields.io/badge/API-Rilink-00AED9" alt="Rilink API" />
</p>

Website sederhana untuk menguji langsung **Rilink Developer Messaging API**.

---

> [!WARNING]
> ⚠️ **PERHATIAN SAAT MENGUJI:**
> Mengirim payload valid untuk `type` apa pun akan **benar-benar mengirim pesan WhatsApp nyata** lewat device yang terhubung ke token Anda. Gunakan nomor tujuan milik sendiri saat menguji.

---

## ✨ Fitur Utama

- 🚀 **Tanpa Dependensi Eksternal** — Menggunakan murni Node.js bawaan (tanpa `npm install`).
- 🔄 **Bypass CORS Otomatis** — Menyediakan proxy same-origin agar testing dari browser berjalan mulus tanpa masalah CORS.
- 📱 **Mendukung 8 Tipe Pesan** — Teks, Gambar, Video, Audio, Dokumen, Button, List, dan Carousel.
- 🔎 **Auto-Lookup Device** — Tarik daftar device yang terhubung (`GET /api/v1/devices`) langsung dari UI.
- ⚡ **Skenario Error Cepat** — Pengujian instan untuk memverifikasi penanganan error (missing token, invalid type, dll).

---

## 💻 Persyaratan System

- **Node.js** ≥ 18 terinstal di sistem Anda.
- Akun **Rilink** dengan Personal Access Token (membutuhkan paket yang mengaktifkan `developer_api_enabled`).
- Device WhatsApp yang sudah terhubung (status `connected`) di dashboard Rilink Anda.

---

## 🛠️ Quick Start (Pengujian Lokal)

### 1. Clone & Jalankan
```bash
git clone https://github.com/ultraboks/rilink-api-tester.git
cd rilink-api-tester
node server.js
```
*(Tidak perlu menjalankan `npm install` karena tidak ada dependensi eksternal).*

### 2. Akses UI
Buka browser Anda dan kunjungi:
```
http://localhost:4780
```

---

## 📖 Cara Pakai

1. Buat personal access token dari halaman **Developer API** di dashboard Rilink. Tempel token itu ke field **Bearer Token**.
2. Isi **Base URL** — default `https://rilink.id`, atau arahkan ke instance development lokal Anda (misalnya `http://localhost:8000` kalau backend dijalankan via `php artisan serve`).
3. Di **Compose Pesan**, pilih cara mengidentifikasi device pengirim: `device_id` (integer) atau `sender_phone` (nomor WhatsApp device). 
   - Kalau tidak hafal ID/nomornya, klik **"Ambil Daftar Device (GET /api/v1/devices)"** — dropdown akan terisi otomatis dengan device yang `connected` di akun Anda.
4. Isi `to` (nomor tujuan, format apa saja yang mengandung digit, mis. `6281234567890`).
5. Pilih `type` pesan, lalu klik **"Muat contoh payload untuk type ini"** untuk mengisi form secara otomatis, atau isi manual. Untuk `button`/`list`/`carousel`, gunakan tombol `+ Tambah ...` untuk menambah baris interaktif.
6. Klik **Kirim Request**. Response asli dari API (status HTTP, durasi, body JSON) akan tampil di panel kanan, beserta riwayat request sebelumnya.
7. Gunakan panel **Skenario Cepat** untuk menjalankan beberapa kasus error yang aman (tidak mengirim pesan nyata) guna memverifikasi validasi dan response dari API.

---

## 📚 Ringkasan API yang Diuji

Rilink mengekspos **dua** endpoint Developer API publik, keduanya di bawah guard yang sama:

| Keterangan | Detail |
|---|---|
| **Endpoints** | `POST /api/v1/messages/send`, `GET /api/v1/devices` |
| **Auth** | Laravel Sanctum bearer token, dengan ability `messages:send`. Token yang kedaluwarsa otomatis dihapus & ditolak (401). |
| **Rate limit** | 60 request/menit per token (`throttle:60,1`) |
| **Lokasi Code** | `routes/api.php`, `DeveloperMessageController.php`, `DeveloperApiMessageService.php` |

- `POST /api/v1/messages/send`: Mengirim pesan WhatsApp lewat device yang terhubung, dengan 8 pilihan tipe pesan. Device pengirim diidentifikasi lewat **salah satu** dari `device_id` (ID integer) atau `sender_phone` (string nomor telepon).
- `GET /api/v1/devices`: Mengembalikan daftar device tenant yang `status = "connected"`. Endpoint ini dimanfaatkan oleh alat testing ini untuk memetakan nomor WhatsApp ke `device_id`.
- **Field Kontak (Opsional)**: `contact_name` dan `save_contact` (boolean). Jika tujuan (`to`) belum tersimpan di kontak dan `save_contact=true`, maka sistem otomatis membuat kontak baru.
- **Aturan Media (Update 18 Agt 2026, commit `fe486fb`)**: `media_url` sekarang **wajib** untuk tipe `button` dan `list`. `button` mendukung *image* sebagai header, sedangkan `list` mendukung *image*, *video*, atau *dokumen* sebagai header (otomatis dideteksi dari ekstensi URL).
- *Catatan:* Endpoint API lain di codebase (seperti `WhatsAppController` atau webhook) adalah endpoint internal Node.js `whatsapp-service`, dan bukan bagian dari Developer API publik, sehingga tidak diuji melalui alat ini.

---

## 🌐 Mengapa Ada Server Lokal? (CORS)

Backend API Rilink tidak memiliki konfigurasi CORS publik, sehingga API-nya tidak mengirimkan header `Access-Control-Allow-Origin`. Jika halaman HTML statis melakukan `fetch()` langsung ke `https://rilink.id` dari browser, maka preflight request (`OPTIONS`) akan diblokir oleh CORS di browser.

`server.js` berfungsi ganda:
1. Menyajikan file antarmuka statis HTML/CSS/JS.
2. Menyediakan endpoint **proxy same-origin** (`POST /api/proxy/send` dan `POST /api/proxy/devices`) yang akan meneruskan request tersebut secara server-ke-server menuju endpoint asli Rilink.
Dengan cara ini, browser hanya berbicara dengan `localhost`, sehingga batasan CORS tidak relevan lagi. **Proxy ini 100% transparan dan stateless** — token Anda tidak disimpan di mana pun melainkan hanya diteruskan per request.

---

## 📂 Struktur File

```text
api_test/
├── server.js          # Server statis + proxy (Node.js)
├── package.json       # Informasi proyek
└── public/
    ├── index.html      # UI tester utama
    ├── style.css       # Styling
    └── app.js          # Logic form dinamis, kirim request, & render response
```
