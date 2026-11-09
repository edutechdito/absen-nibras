# 4. PANDUAN SETUP BACKEND GOOGLE APPS SCRIPT & GOOGLE SHEETS
## PERGURUAN ISLAM NIBRAS

---

Panduan ini menjelaskan langkah demi langkah pengaturan basis data Google Sheets dan Google Apps Script (GAS) sebagai backend API sistem presensi online.

---

### Langkah 1: Membuat Spreadsheet Baru
1. Buka peramban (browser) dan kunjungi: [https://sheets.new](https://sheets.new) (atau Google Drive Anda).
2. Beri nama file Spreadsheet: **"DB_PRESENSI_PERGURUAN_ISLAM_NIBRAS"**.
3. Pastikan Spreadsheet Anda berada pada akun Google resmi institusi atau akun pengelola sistem.

---

### Langkah 2: Membuka Script Editor
1. Pada menu Spreadsheet di bagian atas, klik: **Extensions** (Ekstensi) > **Apps Script**.
2. Tab baru Apps Script akan terbuka.
3. Ubah nama proyek Apps Script di sudut kiri atas dari *"Untitled project"* menjadi: **"API_PRESENSI_NIBRAS"**.

---

### Langkah 3: Menyiapkan File Program Backend
Di dalam Google Apps Script Editor, buat file script berikut sesuai dengan file yang ada di folder `backend/`:

1. **`Code.gs`**
   - Hapus kode bawaan di `Code.gs`.
   - Buka file [Code.gs](file:///d:/Antigravity%20Ide/Absen%20Online%20-%20NIBRAS/backend/Code.gs), salin seluruh kodenya, dan tempelkan ke `Code.gs`.

2. **`Database.gs`**
   - Klik tombol **+** di samping menu *Files* > Pilih **Script**.
   - Beri nama file: `Database`.
   - Buka file [Database.gs](file:///d:/Antigravity%20Ide/Absen%20Online%20-%20NIBRAS/backend/Database.gs), salin seluruh kodenya, dan tempelkan.

3. **`Auth.gs`**
   - Klik tombol **+** > Pilih **Script**.
   - Beri nama file: `Auth`.
   - Buka file [Auth.gs](file:///d:/Antigravity%20Ide/Absen%20Online%20-%20NIBRAS/backend/Auth.gs), salin kodenya, dan tempelkan.

4. **`Attendance.gs`**
   - Klik tombol **+** > Pilih **Script**.
   - Beri nama file: `Attendance`.
   - Buka file [Attendance.gs](file:///d:/Antigravity%20Ide/Absen%20Online%20-%20NIBRAS/backend/Attendance.gs), salin kodenya, dan tempelkan.

5. **`Admin.gs`**
   - Klik tombol **+** > Pilih **Script**.
   - Beri nama file: `Admin`.
   - Buka file [Admin.gs](file:///d:/Antigravity%20Ide/Absen%20Online%20-%20NIBRAS/backend/Admin.gs), salin kodenya, dan tempelkan.

6. **Konfigurasi Zona Waktu (`appsscript.json`)**
   - Di panel kiri, klik **Project Settings** (ikon roda gigi).
   - Beri centang pada opsi: **"Show 'appsscript.json' manifest file in editor"**.
   - Kembali ke Editor file, klik `appsscript.json`.
   - Pastikan `"timeZone": "Asia/Jakarta"`, lalu simpan.

---

### Langkah 4: Menjalankan Inisialisasi Database Otomatis
1. Di bilah menu atas editor, temukan dropdown fungsi (di sebelah tombol *Run* dan *Debug*).
2. Pilih fungsi: **`initDatabase`**.
3. Klik tombol **Run** (Jalankan).
4. Google akan meminta izin otorisasi akses (*Authorization Required*):
   - Klik **Review Permissions** (Tinjau Izin).
   - Pilih akun Google Anda.
   - Jika muncul peringatan *"Google hasn't verified this app"*, klik **Advanced** (Lanjutan) di kiri bawah, lalu klik **Go to API_PRESENSI_NIBRAS (unsafe)**.
   - Klik **Allow** (Izinkan).
5. Tunggu eksekusi selesai hingga muncul log: *"Inisialisasi Database Berhasil Selesai!"*.
6. Periksa Google Sheets Anda: Otomatis akan tercipta 6 Sheet lengkap dengan baris header dan data awal:
   - `USERS` (Berisi akun awal admin dan guru contoh)
   - `GURU` (Berisi biodata GTK)
   - `SEKOLAH` (Berisi unit sekolah, koordinat, dan radius)
   - `ABSENSI` (Tempat penampungan data kehadiran)
   - `PENGATURAN` (Konfigurasi jam masuk, toleransi telat, dll)
   - `LOGS` (Audit riwayat aktivitas)

---

### Langkah 5: Deployment Menjadi Web App
1. Di sudut kanan atas editor Apps Script, klik tombol biru **Deploy** > **New deployment** (Penerapan baru).
2. Klik ikon gerigi di samping *Select type* > Pilih **Web app**.
3. Isi parameter deployment berikut:
   - **Description**: `Presensi Nibras v1.0`
   - **Execute as**: **Me (email Anda)** *(Sangat penting agar script dapat menulis ke spreadsheet dan menyimpan foto ke Google Drive)*
   - **Who has access**: **Anyone** (Siapa saja, bahkan tanpa akun Google) *(Sangat penting agar PWA frontend dapat mengakses API tanpa terblokir dialog login Google)*
4. Klik tombol **Deploy**.
5. Salin (Copy) URL yang dihasilkan di bagian **Web app URL**.
   - Contoh format: `https://script.google.com/macros/s/AKfycbxABC123.../exec`
6. URL inilah yang akan dimasukkan ke aplikasi PWA Frontend.

---

### Langkah 6: Menghubungkan URL ke Frontend PWA
Ada 2 cara menghubungkan URL tersebut:
1. **Cara Cepat (Tanpa Mengedit Kode):**
   - Buka aplikasi web frontend di peramban Anda.
   - Klik tombol **⚙️ API** di pojok kanan atas navbar.
   - Tempelkan URL Web App hasil deploy tadi, lalu klik **Simpan URL**.
   - Selesai! Aplikasi langsung terhubung ke database Google Sheets Anda.
2. **Cara Permanen di Kode Sumber:**
   - Buka file `frontend/js/config.js`.
   - Ganti nilai `CONFIG.API_URL` dengan URL Web App Anda.

