# 1. ANALISIS KEBUTUHAN SISTEM (SYSTEM REQUIREMENTS ANALYSIS)
## APLIKASI ABSENSI ONLINE GURU DAN TENAGA KEPENDIDIKAN BERBASIS GPS
### PERGURUAN ISLAM NIBRAS

---

### 1.1 Latar Belakang & Identifikasi Masalah
Perguruan Islam NIBRAS membutuhkan sistem pencatatan kehadiran (presensi) bagi Guru dan Tenaga Kependidikan (GTK) yang:
1. Akurat dan tidak dapat dimanipulasi dengan fake GPS atau titip absen.
2. Praktis dapat diakses langsung dari gawai (smartphone) masing-masing guru (Android & iPhone) tanpa harus mengunduh aplikasi berat dari Play Store/App Store.
3. Terpusat dan hemat biaya operasional tanpa memerlukan server khusus berbayar, memanfaatkan ekosistem Google (Google Apps Script & Google Sheets) serta Progressive Web App (PWA) yang di-host pada HTTPS (GitHub Pages/Hosting statis).
4. Mampu memvalidasi radius presensi secara real-time pada setiap unit sekolah di lingkungan Perguruan Islam NIBRAS.

---

### 1.2 Tujuan Sistem
- Memastikan kehadiran fisik pegawai berada di dalam area radius sekolah yang sah pada saat jam masuk dan jam pulang.
- Mencegah kecurangan absensi melalui verifikasi ganda: validasi koordinat GPS (rumus Haversine sisi server) dan verifikasi foto selfie langsung (kamera live, bukan upload galeri).
- Menggunakan waktu server resmi (WIB / UTC+7) sehingga tidak dapat dicurangi dengan mengubah jam pada perangkat pengguna.
- Mempermudah manajemen dalam rekapitulasi kehadiran, pemantauan realtime, serta ekspor laporan bulanan (Excel/PDF).

---

### 1.3 Pengguna Sistem (Actor & Roles)
1. **Guru & Tenaga Kependidikan (GTK)**
   - Autentikasi dengan Username & Password resmi.
   - Mengakses profil lengkap (Nama, NIY, TTL, Jabatan, Unit Sekolah).
   - Melakukan Absen Masuk dan Absen Pulang dengan validasi radius lokasi & foto live selfie.
   - Melihat status realtime jarak ke titik pusat sekolah.
   - Melihat riwayat presensi harian dan rekap persentase kehadiran bulanan.

2. **Administrator / Pimpinan Sekolah**
   - Mengelola akun pengguna (tambah, edit, reset password, status aktif).
   - Mengelola master data Guru dan Tenaga Kependidikan.
   - Mengonfigurasi master data Unit Sekolah (Latitude, Longitude, Radius toleransi meter).
   - Mengonfigurasi jam kerja (Jam Masuk, Jam Pulang, Toleransi Keterlambatan dalam menit).
   - Memantau presensi harian secara realtime (Hadir Tepat Waktu, Terlambat, Pulang Cepat, Belum Hadir).
   - Meninjau titik koordinat absensi di peta interaktif.
   - Mengunduh rekap laporan kehadiran dalam format Spreadsheet / Excel dan PDF.

---

### 1.4 Kebutuhan Fungsional (Functional Requirements)
| ID | Kebutuhan Fungsional | Deskripsi |
|---|---|---|
| **FR-01** | Autentikasi & Autorisasi | Login aman dengan username dan password ber-hash SHA-256 + salt; penanganan token sesi aktif; pemisahan hak akses Guru vs Admin. |
| **FR-02** | Manajemen Data GTK | CRUD data identitas guru (NIY, Nama, Tempat/Tgl Lahir, Jabatan, Unit Sekolah, No HP, Status). |
| **FR-03** | Manajemen Data Sekolah | Konfigurasi koordinat GPS (Latitude, Longitude) dan batas radius toleransi per unit sekolah. |
| **FR-04** | Manajemen Aturan Waktu | Konfigurasi jam masuk, toleransi keterlambatan, dan jam pulang minimum. |
| **FR-05** | Deteksi GPS Otomatis | Membaca Geolocation API perangkat pengguna dengan opsi `enableHighAccuracy: true` dan pemfilteran akurasi (misal akurasi < 50 meter). |
| **FR-06** | Validasi Jarak Server-side | Menghitung jarak pengguna terhadap titik sekolah menggunakan formula Haversine di Google Apps Script untuk menjamin data tidak dimanipulasi di sisi client. |
| **FR-07** | Waktu Resmi Server | Seluruh pencatatan waktu dilakukan oleh server Google Apps Script (WIB / GMT+7), mengabaikan jam lokal pada gawai pengguna. |
| **FR-08** | Verifikasi Visual Kamera | Pengambilan foto selfie langsung dari kamera depan untuk mencegah titip absen; foto dikompresi sebelum dikirim. |
| **FR-09** | Pencegahan Absen Ganda | Sistem otomatis menolak transaksi jika pengguna sudah melakukan Absen Masuk atau Absen Pulang pada tanggal kalender yang sama. |
| **FR-10** | Rekap & Riwayat Presensi | Guru dapat melihat riwayat kehadiran pribadi; Admin dapat memfilter berdasarkan nama, unit, tanggal, dan status kehadiran. |
| **FR-11** | Ekspor Laporan | Admin dapat mencetak laporan dalam format PDF berstandar resmi serta mengekspor data ke Excel (CSV/XLSX). |

---

### 1.5 Kebutuhan Non-Fungsional (Non-Functional Requirements)
| Kategori | Parameter | Spesifikasi |
|---|---|---|
| **Performance** | Waktu Respon API | Transaksi absensi selesai dalam waktu < 2.5 detik pada koneksi 4G standar. |
| **Security** | Enkripsi & Token | Password di-hash menggunakan SHA-256 + salt unik. Komunikasi wajib HTTPS. Token sesi tervalidasi di backend. |
| **Reliability** | Ketersediaan | Didukung infrastruktur Google Cloud / Google Workspace dengan uptime 99.9%. |
| **Portability** | Multi-Platform PWA | Dapat diinstal (A2HS - Add to Home Screen) pada Android (Chrome/Edge/Samsung Internet) dan iOS/iPhone (Safari WebClip) dengan responsif penuh. |
| **Usability** | Desain Antarmuka | UI/UX ramah pengguna, palet warna Biru Navy (#0B2545) & Putih (#FFFFFF), font terbaca jelas, navigasi jempol (thumb-friendly). |
| **Offline-Aware** | Service Worker | Asset PWA (HTML, CSS, JS, Icon) tersimpan di cache lokal; menampilkan layar offline informatif jika koneksi terputus. |

