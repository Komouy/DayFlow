# DayFlow — Asisten Jadwal & Rencana Harian AI

Aplikasi asisten harian pribadi berbasis **Progressive Web App (PWA)** dengan integrasi **Google Gemini AI**. Dirancang dengan prinsip **Anti-Slop Design** (bebas emoji murahan, tipografi modern Plus Jakarta Sans, tabular numbers JetBrains Mono, palet dark-grey dengan aksen oranye hangat, serta feedback tactile 8-state).

---

## Fitur Utama

1. **Agenda Hari Ini (Dashboard):**
   - Salam dinamis berbahasa Indonesia sesuai waktu hari (Pagi/Siang/Sore/Malam).
   - Metrik kemajuan tugas harian yang riil (`X / Y Selesai`).
   - Penanda jadwal yang sedang aktif berlangsung secara otomatis.
   - Checklist selesai/belum selesai dalam 1 ketukan.

2. **Manajemen Jadwal Lengkap:**
   - Filter tanggal terpadu (Hari Ini, Besok, atau tanggal kustom).
   - Kategori tugas: *Kerja*, *Fokus*, *Pribadi*, *Kesehatan*.
   - Tambah, edit, dan hapus jadwal dengan modal *bottom-sheet* yang nyaman untuk jempol tangan di HP.

3. **Rencana AI (Natural Language Day Planner) & Chat:**
   - **Penyusun Jadwal Otomatis:** Ketik atau tempel rencanamu dalam kalimat santai (contoh: *"Besok jam 8:30 standup tim, jam 11 review kode, jam 1 siang makan siang dengan Budi, jam 4 sore evaluasi"*), Gemini akan otomatis menyusunnya ke dalam format waktu terstruktur.
   - Pratinjau jadwal hasil ekstraksi AI sebelum disimpan, dengan tombol **Simpan Semua ke Jadwal**.
   - **AI Chat Asisten:** Konsultasi strategi produktivitas, manajemen energi, atau evaluasi prioritas hari ini tanpa jawaban klise berbelit-belit.

4. **Sistem Pengingat & Bel Akustik:**
   - Notifikasi web browser terjadwal (5, 10, 15, atau 30 menit sebelum kegiatan).
   - Sintesis nada bel akustik dua-titik (harmonic chime) berbasis Web Audio API (bekerja 100% offline tanpa perlu file audio eksternal).

5. **Catatan Cepat & Pencarian AI:**
   - Simpan memo kilat harian.
   - Pencarian semantik catatan menggunakan bantuan Gemini.

6. **Cadangkan & Pulihkan (Backup & Restore):**
   - Ekspor seluruh data jadwal dan catatan ke file JSON pribadi.
   - Impor kembali data kapan saja.

7. **PWA (Bisa Di-install di HP Android):**
   - Mendukung Service Worker offline shell, Web App Manifest, dan "Add to Home screen" di Chrome Android.

---

## Cara Menjalankan

### 1. Jalankan di Laptop / Komputer
Buka terminal di folder proyek dan jalankan:
```bash
# Menjalankan Vite Dev Server (HMR instan & otomatis menampilkan IP untuk HP)
npm run dev

# Kompilasi build produksi teroptimasi
npm run build

# Menjalankan pratinjau build produksi lokal
npm run preview
```
Buka browser di: **`http://localhost:3000`**

### 2. Cara Buka & Pasang di HP Android
1. Pastikan HP dan Laptop terhubung ke jaringan Wi-Fi yang sama.
2. Cek IP lokal laptopmu (di Windows ketik `ipconfig` di terminal, cari *IPv4 Address*, misal: `192.168.1.15`).
3. Buka Google Chrome di HP Android, lalu ketik:
   ```
   http://192.168.1.15:3000
   ```
4. Di Chrome Android, ketuk menu **Titik Tiga (⋮)** di kanan atas -> Pilih **"Tambahkan ke Layar Utama" (Add to Home Screen)** atau **"Instal Aplikasi"**.
5. Ikon **DayFlow** akan muncul di layar HP-mu dan terbuka seperti aplikasi Android biasa!

---

## Menghubungkan Gemini API Key
1. Buka tab **Setelan** (ikon roda gigi di menu bawah).
2. Dapatkan API Key gratis di [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Masukkan API Key ke kolom input dan klik **Uji Koneksi Key**.
4. Klik **Simpan Pengaturan**. Key kamu tersimpan secara aman di browser lokal perangkatmu.

---

## Domain Online & PWA Siap Pakai

Aplikasi DayFlow telah aktif secara online di cloud Firebase Hosting:

🔗 **Production URL:** [https://dayflow-563b2.web.app](https://dayflow-563b2.web.app)  
*(Domain cadangan: `https://dayflow-563b2.firebaseapp.com`)*

### Cara Memasang di HP Android:
1. Buka link **[https://dayflow-563b2.web.app](https://dayflow-563b2.web.app)** di Google Chrome di HP Anda.
2. Ketuk ikon titik tiga (⋮) di pojok kanan atas Chrome.
3. Pilih **"Tambahkan ke Layar Utama" (Add to Home screen)** atau **"Instal Aplikasi"**.
4. Ikon DayFlow akan muncul di homescreen HP Anda dan siap digunakan secara offline maupun online dengan fitur notifikasi & bel pengingat!

