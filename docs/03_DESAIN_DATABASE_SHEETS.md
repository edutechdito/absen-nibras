# 3. DESAIN DATABASE GOOGLE SHEETS
## APLIKASI ABSENSI ONLINE GURU DAN TENAGA KEPENDIDIKAN BERBASIS GPS
### PERGURUAN ISLAM NIBRAS

---

Struktur Google Spreadsheet dibagi ke dalam 6 Sheet (Tabel Relasional) yang saling terhubung melalui Primary Key dan Foreign Key:

### 3.1 Sheet: `USERS`
Menyimpan kredensial akun pengguna, peran otorisasi, status aktif, dan session token.

| Kolom | Header | Tipe Data | Deskripsi | Contoh Data |
|---|---|---|---|---|
| A | `user_id` | String (PK) | Identifier unik akun | `USR001` |
| B | `username` | String (Unique) | Username login (NIY atau kode admin) | `admin`, `202401001` |
| C | `password_hash` | String | SHA-256 hash dari (password + salt) | `9f86d081884c7d659a2feaa0c55...` |
| D | `salt` | String | String acak acak unik pembuat hash | `a7b9c1d3e5f7` |
| E | `role` | String | Hak akses (`admin` / `guru`) | `guru` |
| F | `ref_id` | String (FK) | Relasi ke `guru_id` pada sheet GURU | `GUR001` (atau `ADMIN`) |
| G | `token` | String | Token sesi aktif | `tok_8f934279-d6e2-411...` |
| H | `token_expiry` | String (ISO) | Waktu kedaluwarsa token | `2026-11-10T12:00:00Z` |
| I | `status` | String | Status akun (`aktif` / `nonaktif`) | `aktif` |
| J | `created_at` | Datetime | Waktu pembuatan akun | `2026-11-01 08:00:00` |

---

### 3.2 Sheet: `GURU`
Menyimpan identitas lengkap guru dan tenaga kependidikan (GTK).

| Kolom | Header | Tipe Data | Deskripsi | Contoh Data |
|---|---|---|---|---|
| A | `guru_id` | String (PK) | Identifier unik guru | `GUR001` |
| B | `niy` | String (Unique) | Nomor Induk Yayasan (NIY) | `202401001` |
| C | `nama_lengkap` | String | Nama lengkap beserta gelar | `Ustadz Ahmad Fauzi, S.Pd.I` |
| D | `tempat_lahir` | String | Kota/kabupaten tempat lahir | `Padang` |
| E | `tanggal_lahir` | String (YYYY-MM-DD)| Tanggal lahir | `1990-05-14` |
| F | `jabatan` | String | Jabatan / Tugas | `Guru PAI & Wali Kelas VII` |
| G | `sekolah_id` | String (FK) | Relasi ke `sekolah_id` pada sheet SEKOLAH | `SCH001` |
| H | `no_hp` | String | Nomor WhatsApp aktif | `081234567890` |
| I | `email` | String | Email guru | `ahmad.fauzi@nibras.sch.id` |
| J | `status` | String | Status kepegawaian (`aktif` / `cuti` / `nonaktif`) | `aktif` |

---

### 3.3 Sheet: `SEKOLAH`
Menyimpan data unit sekolah di bawah Perguruan Islam NIBRAS beserta titik koordinat GPS dan radius absensi.

| Kolom | Header | Tipe Data | Deskripsi | Contoh Data |
|---|---|---|---|---|
| A | `sekolah_id` | String (PK) | Identifier unit sekolah | `SCH001` |
| B | `nama_sekolah` | String | Nama unit pendidikan | `SMP Islam Nibras Padang` |
| C | `alamat` | String | Alamat lengkap sekolah | `Jl. Khatib Sulaiman No. 45, Padang` |
| D | `latitude` | Float | Garis lintang titik pusat sekolah | `-0.923456` |
| E | `longitude` | Float | Garis bujur titik pusat sekolah | `100.367890` |
| F | `radius_meter` | Integer | Toleransi radius dalam meter | `50` |
| G | `status` | String | Status unit (`aktif` / `nonaktif`) | `aktif` |

---

### 3.4 Sheet: `ABSENSI`
Menyimpan rekaman setiap transaksi absensi (masuk dan pulang) yang lolos validasi server.

| Kolom | Header | Tipe Data | Deskripsi | Contoh Data |
|---|---|---|---|---|
| A | `absen_id` | String (PK) | Identifier unik transaksi | `ABS-20261103-0001` |
| B | `guru_id` | String (FK) | Relasi ke sheet GURU | `GUR001` |
| C | `niy` | String | Duplikasi NIY untuk kemudahan query | `202401001` |
| D | `nama_guru` | String | Nama guru saat transaksi | `Ustadz Ahmad Fauzi, S.Pd.I` |
| E | `sekolah_id` | String (FK) | Unit sekolah tempat bertugas | `SCH001` |
| F | `tanggal` | String (YYYY-MM-DD)| Tanggal resmi server | `2026-11-03` |
| G | `jenis` | String | Jenis presensi (`MASUK` / `PULANG`) | `MASUK` |
| H | `jam_server` | String (HH:mm:ss) | Waktu resmi server (WIB) | `06:58:45` |
| I | `latitude` | Float | Posisi lintang pengguna | `-0.923480` |
| J | `longitude` | Float | Posisi bujur pengguna | `100.367850` |
| K | `akurasi_gps` | Float | Tingkat akurasi GPS dalam meter | `12.5` |
| L | `jarak_meter` | Float | Jarak terhitung ke pusat sekolah | `18.4` |
| M | `status_kehadiran` | String | `Tepat Waktu` / `Terlambat` / `Pulang Normal` / `Pulang Cepat` | `Tepat Waktu` |
| N | `foto_url` | String (URL) | Link foto selfie di Google Drive | `https://drive.google.com/uc?id=...` |
| O | `keterangan` | String | Catatan tambahan | `Hadir tepat waktu di kelas` |

---

### 3.5 Sheet: `PENGATURAN`
Menyimpan konfigurasi operasional presensi Perguruan Islam NIBRAS.

| Kolom | Header | Tipe Data | Deskripsi | Contoh Data |
|---|---|---|---|---|
| A | `setting_key` | String (PK) | Kunci pengaturan | `jam_masuk_normal` |
| B | `setting_value` | String | Nilai konfigurasi | `07:15` |
| C | `keterangan` | String | Penjelasan parameter | `Batas akhir absensi masuk normal (WIB)` |

Daftar parameter pengaturan standar:
1. `jam_masuk_mulai`: `06:00` (Pukul pembukaan absen masuk)
2. `jam_masuk_batas`: `07:15` (Batas waktu masuk sebelum dihitung terlambat)
3. `toleransi_terlambat_menit`: `15` (Toleransi keterlambatan menit)
4. `jam_pulang_mulai`: `15:30` (Pukul dimulainya presensi pulang)
5. `max_gps_accuracy`: `100` (Akurasi GPS maksimal yang diizinkan dalam meter)
6. `nama_yayasan`: `Perguruan Islam NIBRAS`
7. `default_radius`: `50` (Radius standar dalam meter jika unit belum diatur)

---

### 3.6 Sheet: `LOGS`
Menyimpan riwayat audit aktivitas sistem untuk akuntabilitas.

| Kolom | Header | Tipe Data | Deskripsi | Contoh Data |
|---|---|---|---|---|
| A | `log_id` | String (PK) | Identifier log | `LOG-1001` |
| B | `timestamp` | Datetime | Waktu kejadian (WIB) | `2026-11-03 08:30:12` |
| C | `user_id` | String | Aktor yang melakukan aksi | `admin` |
| D | `action` | String | Jenis aktivitas (`LOGIN`, `UPDATE_GURU`, dll)| `UPDATE_SEKOLAH` |
| E | `detail` | String | Rincian aktivitas | `Mengubah radius SCH001 menjadi 60m` |
| F | `ip_address` | String | Informasi client (user-agent/IP) | `Mozilla/5.0 (Windows NT 10.0...)` |

