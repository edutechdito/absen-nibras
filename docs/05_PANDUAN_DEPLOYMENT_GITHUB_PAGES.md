# 5. PANDUAN DEPLOYMENT FRONTEND KE GITHUB PAGES (HTTPS)
## PERGURUAN ISLAM NIBRAS

---

Progressive Web App (PWA) mensyaratkan protokol keamanan **HTTPS** agar fitur Service Worker, Geolocation GPS akurasi tinggi, dan Kamera Smartphone dapat diakses tanpa hambatan keamanan browser. GitHub Pages menyediakan hosting HTTPS gratis, cepat, dan handal dengan sertifikat SSL otomatis.

---

### Metode 1: Deployment via Git & GitHub Repository

#### 1. Inisialisasi Git Lokal
Buka terminal (PowerShell atau Command Prompt) pada direktori proyek:
```bash
cd "d:\Antigravity Ide\Absen Online - NIBRAS"
git init
git add .
git commit -m "feat: inisialisasi sistem presensi online NIBRAS v1.0"
```

#### 2. Buat Repository Baru di GitHub
1. Masuk ke akun GitHub Anda di [https://github.com](https://github.com).
2. Klik tombol **New** untuk membuat repositori baru.
3. Beri nama repositori, misalnya: `absen-nibras` atau `presensi-online-nibras`.
4. Pilih opsi **Public** (agar GitHub Pages gratis dapat aktif).
5. Jangan centang "Initialize with README" (karena kita sudah punya kode lokal).
6. Klik **Create repository**.

#### 3. Hubungkan Remote & Push Kode
Jalankan perintah berikut di terminal:
```bash
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/absen-nibras.git
git push -u origin main
```

#### 4. Mengaktifkan GitHub Pages
1. Masuk ke halaman repositori di GitHub.
2. Buka menu **Settings** (Pengaturan repositori).
3. Di panel sebelah kiri, klik menu **Pages** (di bawah kelompok *Code and automation*).
4. Pada bagian **Build and deployment**:
   - **Source**: Pilih `Deploy from a branch`.
   - **Branch**: Pilih `main`, dan untuk foldernya pilih folder `/frontend` (atau jika root, atur sesuai struktur repositori).
   - Klik tombol **Save**.
5. Tunggu 1 hingga 2 menit hingga GitHub Actions selesai memproses publikasi.
6. Halaman Anda akan aktif pada alamat HTTPS:
   `https://USERNAME_ANDA.github.io/absen-nibras/`

---

### Metode 2: Alternatif Hosting Statis Gratis Lainnya

Jika tidak menggunakan GitHub Pages, Anda dapat menggunakan layanan hosting statis gratis berikut yang langsung mendukung HTTPS dan PWA:

1. **Vercel**
   - Jalankan `vercel` di terminal atau hubungkan repositori GitHub Anda ke Vercel Dashboard.
   - Set *Root Directory* ke: `frontend`.
   - Otomatis mendapatkan domain: `https://absen-nibras.vercel.app`.

2. **Netlify**
   - Buka [https://netlify.com](https://netlify.com).
   - Drag & Drop folder `frontend` langsung ke dashboard Netlify.
   - Langsung aktif dalam 5 detik dengan alamat HTTPS instan.

3. **Cloudflare Pages**
   - Hubungkan ke repo GitHub dengan direct build, unlimited bandwidth gratis.

---

### Verifikasi Fitur PWA Setelah Deployment
Setelah halaman aktif pada URL HTTPS:
1. Buka URL menggunakan smartphone (Chrome di Android atau Safari di iOS).
2. Periksa apakah gembok HTTPS berwarna hijau/aman.
3. Uji fungsi Geolocation: Browser akan menampilkan pop-up meminta izin lokasi (*"Allow while visiting this site"*), klik **Izinkan (Allow)**.
4. Uji fungsi Kamera: Klik tombol selfie, izinkan akses kamera (*"Allow Camera"*).
5. Pasang ke layar utama:
   - Pada Android: Klik pop-up "Pasang Aplikasi" di bawah layar atau menu Chrome > **Install App**.
   - Pada iPhone: Klik ikon Share di Safari > **Add to Home Screen**.

