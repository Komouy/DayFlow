# Panduan Setup Serverless AI Proxy DayFlow (100% Gratis & Aman)

Arsitektur ini memungkinkan Anda menggunakan satu **Gemini API Key milik Anda sendiri** untuk melayani seluruh pengguna DayFlow, tanpa pengguna lain perlu memasukkan API Key mereka, dan **tanpa mengekspos API Key Anda ke browser/DevTools**.

---

## Opsi 1: Cloudflare Workers (Paling Direkomendasikan)
* **Biaya**: **100% Gratis Selamanya** (100.000 request/hari gratis).
* **Kartu Kredit**: **TIDAK DIBUTUHKAN** (Bisa daftar langsung dengan email).
* **Waktu Pemasangan**: ~2-3 Menit.

### Langkah-langkah:
1. **Buka Dashboard Cloudflare**:
   - Masuk ke [dash.cloudflare.com](https://dash.cloudflare.com) (buat akun gratis jika belum punya).
2. **Buat Worker Baru**:
   - Di menu sebelah kiri, klik **Workers & Pages**.
   - Klik tombol **Create Application** lalu pilih **Create Worker**.
   - Beri nama worker (misalnya: `dayflow-ai-gateway`).
   - Klik **Deploy**.
3. **Salin Kode Proxy**:
   - Klik tombol **Edit code**.
   - Hapus semua kode bawaan, lalu salin dan tempelkan seluruh isi file [worker.js](file:///c:/Users/dhavi/Documents/ProyekAI/serverless-proxy/worker.js).
   - Klik **Deploy** (atau Save and Deploy).
4. **Masukkan API Key Anda (Secret)**:
   - Kembali ke halaman pengaturan Worker (`Settings`).
   - Pilih tab **Variables and Secrets**.
   - Di bagian *Secrets*, klik **Add**.
   - Masukkan nama variabel: `GEMINI_API_KEY`
   - Masukkan nilai API Key Gemini Anda (dari Google AI Studio).
   - Klik **Save and Deploy**.
5. **Hubungkan ke DayFlow**:
   - Salin URL worker Anda (contoh: `https://dayflow-ai-gateway.<username>.workers.dev`).
   - Buka file [js/config.js](file:///c:/Users/dhavi/Documents/ProyekAI/js/config.js) di proyek DayFlow.
   - Isi variabel `AI_PROXY_URL`:
     ```javascript
     export const APP_CONFIG = {
       AI_PROXY_URL: 'https://dayflow-ai-gateway.<username>.workers.dev',
       DEFAULT_MODEL: 'gemini-2.0-flash'
     };
     ```
   - Jalankan `npm run build` dan deploy ke Firebase Hosting: `firebase deploy --only hosting`.

Selesai! Sekarang semua pengguna DayFlow di seluruh dunia dapat langsung menikmati fitur AI tanpa perlu menginput API Key sama sekali.

---

## Opsi 2: Pengujian Langsung / Demo Cepat (Direct Key)
Jika Anda hanya ingin mencoba langsung di lingkungan lokal/demo internal tanpa memasang serverless proxy terlebih dahulu:
1. Buka file [js/config.js](file:///c:/Users/dhavi/Documents/ProyekAI/js/config.js).
2. Masukkan API Key Anda pada properti `CENTRAL_API_KEY`:
   ```javascript
   export const APP_CONFIG = {
     AI_PROXY_URL: '',
     CENTRAL_API_KEY: 'AIzaSy...', // API Key Anda
     DEFAULT_MODEL: 'gemini-2.0-flash'
   };
   ```
3. DayFlow akan otomatis menggunakan kunci tersebut untuk semua pengguna.
*(Catatan: Untuk situs publik berskala luas, sangat disarankan menggunakan Opsi 1 Cloudflare Workers agar API Key terlindung aman di server).*
