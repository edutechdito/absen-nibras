# 6. PANDUAN PENGUJIAN APLIKASI (TESTING & SECURITY COMPLIANCE)
## PERGURUAN ISLAM NIBRAS

---

Panduan ini berisi protokol pengujian komprehensif untuk memastikan aplikasi presensi berjalan akurat, aman, dan tanpa kendala di gawai Android dan iPhone.

---

### 6.1 Matriks Skenario Pengujian (Test Matrix)

| ID | Skenario Uji | Prosedur | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| **TC-01** | Login Berhasil (Guru) | Masukkan username `202401001` dan password `guru123`. | Masuk ke dashboard guru, menampilkan nama, NIY, sekolah, dan jam digital. | Passed |
| **TC-02** | Login Gagal | Masukkan username benar dengan password salah. | Muncul notifikasi merah "Username atau password tidak cocok". | Passed |
| **TC-03** | Login Administrator | Masukkan username `admin` dan password `admin123`. | Masuk ke antarmuka administrator, menampilkan KPI dan menu master data. | Passed |
| **TC-04** | Deteksi GPS Dalam Radius | Buka menu Absen Masuk saat berada di dalam area sekolah (< 60m). | Indikator berwarna hijau: "Dalam Area Sekolah", tombol aktif setelah selfie. | Passed |
| **TC-05** | Deteksi GPS Luar Radius | Buka menu Absen Masuk saat berada di rumah / luar sekolah (> 60m). | Indikator berwarna merah: "Di Luar Area Sekolah", tombol presensi terkunci disabled. | Passed |
| **TC-06** | Penolakan Manipulasi Client | Mengirim payload koordinat palsu langsung ke API saat posisi di luar radius. | Server Apps Script menolak dengan pesan "Anda berada di luar area sekolah!". | Passed |
| **TC-07** | Verifikasi Jam Server | Mengubah jam pada HP pengguna 2 jam lebih lambat, lalu melakukan absen. | Waktu presensi yang tercatat tetap mengikuti jam server resmi (WIB). | Passed |
| **TC-08** | Pencegahan Absen Ganda | Melakukan presensi masuk 2x pada hari yang sama. | Transaksi kedua ditolak server: "Anda sudah melakukan Absen MASUK hari ini". | Passed |
| **TC-09** | Pengambilan Foto Selfie | Menekan tombol "Ambil Foto Selfie" di depan kamera ponsel. | Kamera menangkap wajah, mengompresi gambar ke canvas, dan menampilkan thumbnail. | Passed |
| **TC-10** | Instalasi PWA Android | Buka di Google Chrome Android, klik banner / menu "Install App". | Ikon Nibras terpasang di Homescreen; terbuka dalam mode standalone tanpa address bar. | Passed |
| **TC-11** | Instalasi PWA iPhone | Buka di Safari iOS, tekan Share > "Add to Home Screen". | Ikon WebClip Nibras terpasang di layar utama; terbuka dalam mode layar penuh (standalone). | Passed |
| **TC-12** | Ekspor Laporan Excel/CSV | Klik tombol "Ekspor ke Excel (CSV)" pada tab laporan admin. | File CSV terunduh dengan rapi dan dapat dibuka di Microsoft Excel. | Passed |

---

### 6.2 Prosedur Pengujian Khusus Android (Chrome / Samsung Internet)
1. **Perizinan Lokasi (GPS):**
   - Pastikan GPS ponsel dalam setelan: **Akurasi Tinggi (Google Location Accuracy: ON)**.
   - Jika izin terblokir, buka ikon gembok di sebelah URL > **Permissions** > **Location** > Ubah ke **Allow**.
2. **Perizinan Kamera:**
   - Izinkan kamera saat browser meminta dialog izin.
   - PWA akan otomatis memilih kamera depan (`facingMode: 'user'`).

---

### 6.3 Prosedur Pengujian Khusus iPhone (iOS Safari)
1. **Perizinan Lokasi di iOS:**
   - Masuk ke **Settings (Pengaturan) iPhone** > **Privacy & Security** > **Location Services** > Pastikan Aktif.
   - Gulir ke bawah ke **Safari Websites** > Pilih **While Using the App** dan aktifkan **Precise Location**.
2. **Penambahan ke Layar Utama (PWA WebClip):**
   - Buka URL menggunakan **Safari** (PWA di iOS wajib melalui browser Safari).
   - Ketuk ikon **Bagikan (Share)** (kotak dengan panah atas di bilah bawah).
   - Gulir ke bawah dan ketuk **Add to Home Screen (Tambah ke Layar Utama)**.
   - Buka aplikasi dari layar utama; perhatikan bahwa bilah navigasi Safari hilang dan aplikasi tampil seperti aplikasi native iOS.

---

### 6.4 Pengujian Keamanan & Integritas Data (Security Checklist)

1. **Penyimpanan Password Aman:**
   - Password disimpan dengan hash SHA-256 dan salt kriptografis unik 16 karakter.
   - Tidak ada teks password asli yang dapat dibaca di Google Sheets.
2. **Validasi Otorisasi Berbasis Peran (RBAC):**
   - Request endpoint administrator (seperti tambah guru, ubah koordinat sekolah, dan pengaturan) mewajibkan verifikasi session token dengan `role === 'admin'`. Jika token milik guru dikirim ke endpoint admin, server menolak dengan HTTP 200 JSON `{ success: false, message: 'Akses ditolak' }`.
3. **Integritas Waktu:**
   - Tanggal dan jam transaksi diambil dari fungsi runtime `Utilities.formatDate(new Date(), 'Asia/Jakarta', ...)`.
   - Tidak ada parameter jam yang diterima dari input client, sehingga pemalsuan jam lokal HP tidak berdampak.
4. **Pencegahan Kondisi Balapan (Concurrency Lock):**
   - Backend menggunakan `LockService.getScriptLock()` untuk memastikan pencatatan presensi saat ratusan guru absen serentak pada pukul 07:00 WIB tidak mengalami race condition atau duplikasi data sheet.

