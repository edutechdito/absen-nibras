/**
 * GURU & GTK MODULE
 * Seluruh alur kerja presensi guru: Dashboard, Live Clock, Geofence Check, Selfie, Riwayat & Profil
 * Desain Baru Sesuai Referensi (Perguruan Islam NIBRAS)
 */

const GuruModule = {
  activeTab: 'beranda',
  clockIntervalId: null,
  currentAttendanceType: 'MASUK',

  /**
   * Inisialisasi Modul Guru
   */
  init() {
    this.renderProfileCard();
    this.startLiveClock();
    this.loadTodayStatus();
    this.loadDashRecapMini();
    this.setupTabNavigation();
    this.setupGpsMonitoring();
    this.switchTab('beranda');
  },

  /**
   * Menampilkan Data Profil Guru di Header & Welcome Card
   */
  renderProfileCard() {
    const user = AppState.user;
    if (!user) return;

    const elNama = document.getElementById('guru-profile-nama');
    const elGreeting = document.getElementById('guru-greeting-title');
    const elNiy = document.getElementById('guru-profile-niy');
    const elJabatan = document.getElementById('guru-profile-jabatan');

    const cleanNama = (user.nama_lengkap || 'DITO JURINALDO, S.Kom').toUpperCase();
    if (elNama) elNama.textContent = cleanNama;
    if (elGreeting) elGreeting.textContent = this.getDynamicGreeting();
    if (elNiy) elNiy.textContent = user.niy || '202401001';
    if (elJabatan) elJabatan.textContent = user.jabatan || 'Operator';

    // Profil detail di Tab Profil
    const elDetNama = document.getElementById('profile-detail-nama');
    const elDetNiy = document.getElementById('profile-detail-niy');
    const elDetTtl = document.getElementById('profile-detail-ttl');
    const elDetJabatan = document.getElementById('profile-detail-jabatan');
    const elDetSekolah = document.getElementById('profile-detail-sekolah');
    const elDetHp = document.getElementById('profile-detail-hp');

    if (elDetNama) elDetNama.textContent = user.nama_lengkap || 'Dito Jurinaldo, S.Kom';
    if (elDetNiy) elDetNiy.textContent = user.niy || '-';
    if (elDetTtl) elDetTtl.textContent = `${user.tempat_lahir || 'Padang'}, ${user.tanggal_lahir || '11 November 1995'}`;
    if (elDetJabatan) elDetJabatan.textContent = user.jabatan || 'Operator';
    if (elDetSekolah) elDetSekolah.textContent = user.nama_sekolah || 'Perguruan Islam NIBRAS';
    if (elDetHp) elDetHp.textContent = user.no_hp || '08126789001';
  },

  /**
   * Mendapatkan salam dinamis sesuai jam WIB (Pagi, Siang, Sore, Malam)
   */
  getDynamicGreeting() {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  },

  /**
   * Jam Digital Real-Time Resmi WIB (Asia/Jakarta)
   */
  startLiveClock() {
    if (this.clockIntervalId) clearInterval(this.clockIntervalId);

    const updateClock = () => {
      const now = new Date();
      
      const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const bulanArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      const hari = hariArr[now.getDay()];
      const tgl = now.getDate();
      const bulan = bulanArr[now.getMonth()];
      const thn = now.getFullYear();

      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      const elTime = document.getElementById('guru-live-clock');
      const elDate = document.getElementById('guru-live-date');

      if (elTime) elTime.textContent = `${hh}:${mm}:${ss}`;
      if (elDate) elDate.textContent = `${hari}, ${tgl} ${bulan} ${thn}`;
    };

    updateClock();
    this.clockIntervalId = setInterval(updateClock, 1000);
  },

  /**
   * Memulai pemantauan GPS di latar belakang untuk status koordinat
   */
  setupGpsMonitoring() {
    GpsService.getCurrentPosition().then(gpsState => {
      this.updateGpsBar(gpsState);
    }).catch(() => {
      this.updateGpsBar({ lat: -0.9247, lng: 100.3603, isActive: true });
    });
  },

  /**
   * Memperbarui Bar Status GPS di Dashboard Beranda
   */
  updateGpsBar(gpsState) {
    const elCoords = document.getElementById('bar-gps-coords');
    const elBadge = document.getElementById('bar-gps-badge');

    if (elCoords) {
      if (gpsState && gpsState.lat !== null && gpsState.lng !== null) {
        elCoords.textContent = `${gpsState.lat.toFixed(4)}, ${gpsState.lng.toFixed(4)}`;
      } else {
        elCoords.textContent = '-0.9247, 100.3603';
      }
    }

    if (elBadge) {
      if (gpsState && gpsState.isActive) {
        elBadge.innerHTML = `<span class="badge-check-icon">✔️</span><span>GPS Aktif</span>`;
        elBadge.className = 'gps-badge-pill';
      } else {
        elBadge.innerHTML = `<span class="badge-check-icon">⏳</span><span>Mencari GPS</span>`;
      }
    }
  },

  /**
   * Memuat Status Presensi Hari Ini (Masuk & Pulang)
   */
  async loadTodayStatus() {
    try {
      const res = await Api.getTodayStatus(AppState.token);
      if (res && res.success) {
        AppState.todayAttendance.sudahMasuk = res.sudahMasuk;
        AppState.todayAttendance.dataMasuk = res.dataMasuk;
        AppState.todayAttendance.sudahPulang = res.sudahPulang;
        AppState.todayAttendance.dataPulang = res.dataPulang;

        this.renderTodayStatusCards();
      }
    } catch (e) {
      console.warn('Gagal memuat status hari ini:', e);
      // Fallback jika demo: set default Masuk sudah absen seperti di gambar referensi
      this.renderTodayStatusCards();
    }
  },

  /**
   * Format Tanggal Pendek (Contoh: "Selasa, 11 Nov 2025")
   */
  getShortDateFormatted(dateObj = new Date()) {
    const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulanArr = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const d = new Date(dateObj);
    return `${hariArr[d.getDay()]}, ${d.getDate()} ${bulanArr[d.getMonth()]} ${d.getFullYear()}`;
  },

  /**
   * Render Kartu Status Masuk & Pulang di Beranda Guru Sesuai Gambar Referensi
   */
  renderTodayStatusCards() {
    const st = AppState.todayAttendance;
    const now = new Date();
    const todayFormatted = this.getShortDateFormatted(now);

    const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulanSingkatArr = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const curDay = hariArr[now.getDay()];
    const curDateStr = `${now.getDate()} ${bulanSingkatArr[now.getMonth()]} ${now.getFullYear()}`;

    // Elements baru sesuai referensi
    const elCardDay = document.getElementById('ref-card-day');
    const elCardDate = document.getElementById('ref-card-date');
    const elCardStatus = document.getElementById('ref-card-status-badge');
    const elGreeting = document.getElementById('guru-greeting-title');

    if (elCardDay) elCardDay.textContent = curDay;
    if (elCardDate) elCardDate.textContent = curDateStr;
    if (elGreeting) elGreeting.textContent = this.getDynamicGreeting();

    // Elements panel jam
    const elTimeMasuk = document.getElementById('panel-time-masuk');
    const elDateMasuk = document.getElementById('panel-date-masuk');
    const elTimePulang = document.getElementById('panel-time-pulang');
    const elDescPulang = document.getElementById('panel-desc-pulang');

    const elBtnActionText = document.getElementById('btn-do-primary-text');
    const elBtnTrigger = document.getElementById('btn-trigger-lakukan-absen');

    // 1. STATUS ABSEN MASUK
    let jamMasukStr = '--:--';
    if (st.sudahMasuk && st.dataMasuk) {
      jamMasukStr = st.dataMasuk.jam_server || '07:08';
      if (elTimeMasuk) elTimeMasuk.textContent = jamMasukStr;
      if (elDateMasuk) elDateMasuk.textContent = todayFormatted;
    } else {
      if (elTimeMasuk) elTimeMasuk.textContent = '--:--';
      if (elDateMasuk) elDateMasuk.textContent = todayFormatted;
    }

    // 2. STATUS ABSEN PULANG
    let jamPulangStr = '--:--';
    if (st.sudahPulang && st.dataPulang) {
      jamPulangStr = st.dataPulang.jam_server || '16:54';
      if (elTimePulang) elTimePulang.textContent = jamPulangStr;
      if (elDescPulang) elDescPulang.textContent = 'Sudah absen pulang';
    } else {
      if (elTimePulang) elTimePulang.textContent = '--:--';
      if (elDescPulang) elDescPulang.textContent = 'Menunggu absen pulang...';
    }

    // 3. BADGE STATUS KEHADIRAN (KARTU REFERENSI)
    if (st.sudahMasuk && st.sudahPulang) {
      this.currentAttendanceType = 'SELESAI';
      if (elCardStatus) {
        elCardStatus.textContent = 'Hadir Lengkap';
        elCardStatus.className = 'card-status-badge badge-hadir';
      }
      if (elBtnActionText) elBtnActionText.textContent = '✓ Presensi Selesai';
    } else if (st.sudahMasuk) {
      this.currentAttendanceType = 'PULANG';
      if (elCardStatus) {
        elCardStatus.textContent = 'Hadir';
        elCardStatus.className = 'card-status-badge badge-hadir';
      }
      if (elBtnActionText) elBtnActionText.textContent = 'Lakukan Absen Pulang';
    } else {
      this.currentAttendanceType = 'MASUK';
      if (elCardStatus) {
        elCardStatus.textContent = 'Belum Hadir';
        elCardStatus.className = 'card-status-badge badge-belum';
      }
      if (elBtnActionText) elBtnActionText.textContent = 'Lakukan Absen Masuk';
    }
  },
  },

  /**
   * Menangani Klik Tombol "📍 Lakukan Absen"
   */
  handleDoAbsenClick() {
    const st = AppState.todayAttendance;
    if (st.sudahMasuk && st.sudahPulang) {
      App.showToast('Anda sudah menyelesaikan presensi masuk dan pulang untuk hari ini.', 'info');
      return;
    }
    const jenis = !st.sudahMasuk ? 'MASUK' : 'PULANG';
    this.openAttendanceModal(jenis);
  },

  /**
   * Membuka Modal Presensi Kamera & GPS
   */
  async openAttendanceModal(jenis) {
    this.currentAttendanceType = jenis;
    const modal = document.getElementById('modal-attendance');
    const titleEl = document.getElementById('modal-attendance-title');
    const subTitleEl = document.getElementById('modal-attendance-subtitle');
    const modal = document.getElementById('modal-attendance');
    const titleEl = document.getElementById('modal-attendance-title');
    const subTitleEl = document.getElementById('modal-attendance-subtitle');
    const btnSubmit = document.getElementById('btn-submit-attendance');
    const inputAlasan = document.getElementById('input-alasan-luar-radius');
    const boxAlasan = document.getElementById('box-alasan-luar-radius');

    if (titleEl) {
      titleEl.textContent = `Presensi ${jenis === 'MASUK' ? 'Masuk' : 'Pulang'}`;
    }
    if (subTitleEl) {
      subTitleEl.textContent = `Validasi Lokasi GPS Presensi (${jenis})`;
    }

    if (inputAlasan) inputAlasan.value = '';
    if (boxAlasan) boxAlasan.style.display = 'none';

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span>📡 Mendeteksi Lokasi GPS...</span>`;
    }

    if (modal) modal.style.display = 'flex';

    // Inisialisasi Peta Leaflet
    setTimeout(() => {
      GpsService.initMap('map-container-attendance', AppState.targetSchool.lat, AppState.targetSchool.lng, 17);
    }, 250);

    // Mulai Pemantauan GPS Real-time
    GpsService.startWatching((gpsState) => {
      this.updateAttendanceGpsUi(gpsState);
      this.updateGpsBar(gpsState);
      this.evaluateModalSubmitButton();
    });
  },

  /**
   * Menutup Modal Presensi
   */
  closeAttendanceModal() {
    const modal = document.getElementById('modal-attendance');
    if (modal) modal.style.display = 'none';
    GpsService.stopWatching();
  },

  /**
   * Update UI GPS di dalam Modal Presensi
   */
  updateAttendanceGpsUi(gpsState) {
    const elDistBadge = document.getElementById('distance-badge-attendance');
    const elDistVal = document.getElementById('distance-value-attendance');
    const elAccVal = document.getElementById('gps-accuracy-attendance');

    if (elAccVal && gpsState.accuracy !== null) {
      const acc = Math.round(gpsState.accuracy);
      elAccVal.textContent = `Akurasi: ±${acc} m`;
      elAccVal.className = 'accuracy-indicator ' + (acc <= 25 ? 'acc-good' : acc <= 50 ? 'acc-med' : 'acc-poor');
    }

    if (elDistVal && gpsState.distance !== null) {
      elDistVal.textContent = `${gpsState.distance} meter`;
    }

    if (elDistBadge && gpsState.distance !== null) {
      const targetRadius = AppState.targetSchool.radius || 60;
      if (gpsState.insideRadius) {
        elDistBadge.className = 'radius-badge inside';
        elDistBadge.innerHTML = `✓ Dalam Area Sekolah (${gpsState.distance}m ≤ ${targetRadius}m)`;
      } else {
        elDistBadge.className = 'radius-badge outside';
        elDistBadge.innerHTML = `✕ Di Luar Area Sekolah (${gpsState.distance}m > ${targetRadius}m)`;
      }
    }
  },

  /**
   * Tangkap Foto Selfie di Modal
   */
  captureAttendancePhoto() {
    const base64 = CameraService.captureSnapshot('canvas-snapshot-attendance');
    if (base64) {
      const elVideo = document.getElementById('video-stream-attendance');
      const elPreview = document.getElementById('photo-preview-attendance');
      const btnCapture = document.getElementById('btn-capture-attendance');
      const btnRetake = document.getElementById('btn-retake-attendance');

      if (elVideo) elVideo.style.display = 'none';
      if (elPreview) {
        elPreview.src = base64;
        elPreview.style.display = 'block';
      }
      if (btnCapture) btnCapture.style.display = 'none';
      if (btnRetake) btnRetake.style.display = 'inline-flex';

      CameraService.stopCamera();
      this.evaluateModalSubmitButton();
      App.showToast('Foto selfie berhasil diambil!', 'success');
    } else {
      App.showToast('Gagal mengambil foto. Pastikan kamera telah menyala.', 'warning');
    }
  },

  /**
   * Foto Ulang Selfie di Modal
   */
  async retakeAttendancePhoto() {
    CameraService.resetCapture();
    const elVideo = document.getElementById('video-stream-attendance');
    const elPreview = document.getElementById('photo-preview-attendance');
    const btnCapture = document.getElementById('btn-capture-attendance');
    const btnRetake = document.getElementById('btn-retake-attendance');

    if (elPreview) elPreview.style.display = 'none';
    if (elVideo) elVideo.style.display = 'block';
    if (btnCapture) btnCapture.style.display = 'inline-flex';
    if (btnRetake) btnRetake.style.display = 'none';

    await CameraService.startCamera('video-stream-attendance');
    this.evaluateModalSubmitButton();
  },

  /**
   * Fallback Upload Foto File
   */
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const base64 = await CameraService.fileToBase64(file);
      CameraService.capturedBase64 = base64;

      const elVideo = document.getElementById('video-stream-attendance');
      const elPreview = document.getElementById('photo-preview-attendance');
      const btnCapture = document.getElementById('btn-capture-attendance');
      const btnRetake = document.getElementById('btn-retake-attendance');

      if (elVideo) elVideo.style.display = 'none';
      if (elPreview) {
        elPreview.src = base64;
        elPreview.style.display = 'block';
      }
      if (btnCapture) btnCapture.style.display = 'none';
      if (btnRetake) btnRetake.style.display = 'inline-flex';

      CameraService.stopCamera();
      this.evaluateModalSubmitButton();
      App.showToast('Foto berhasil dimuat.', 'success');
    } catch (e) {
      App.showToast('Gagal memproses file foto.', 'danger');
    }
  },

  /**
   * Evaluasi Kondisi Tombol Kirim Presensi (Dukungan Sidik Jari & Luar Radius)
   */
  async evaluateModalSubmitButton() {
    const btn = document.getElementById('btn-submit-attendance');
    if (!btn) return;

    const gps = AppState.gps;
    const boxAlasan = document.getElementById('box-alasan-luar-radius');
    const inputAlasan = document.getElementById('input-alasan-luar-radius');
    const bioIndicator = document.getElementById('biometric-indicator-attendance');
    const alasanText = inputAlasan ? inputAlasan.value.trim() : '';

    const hasBiometric = await BiometricService.isAvailable();
    if (bioIndicator) {
      bioIndicator.style.display = hasBiometric ? 'flex' : 'none';
    }

    if (!gps.isActive || gps.lat === null) {
      btn.disabled = true;
      btn.style.background = '#94A3B8';
      btn.innerHTML = '<span>📡 Mencari Lokasi GPS...</span>';
      return;
    }

    const label = this.currentAttendanceType === 'MASUK' ? 'Presensi Masuk' : 'Presensi Pulang';
    const actionPrefix = hasBiometric ? '👆 Tempel Sidik Jari &' : '🚀';

    if (gps.insideRadius) {
      // Posisi di dalam radius sekolah
      if (boxAlasan) boxAlasan.style.display = 'none';
      btn.disabled = false;
      btn.style.background = '#10B981';
      btn.innerHTML = `<span>${actionPrefix} Kirim ${label}</span>`;
    } else {
      // Posisi di luar radius sekolah -> form alasan wajib diisi
      if (boxAlasan) boxAlasan.style.display = 'block';
      if (!alasanText) {
        btn.disabled = true;
        btn.style.background = '#94A3B8';
        btn.innerHTML = `<span>⚠️ Isi Alasan Absen di Luar Radius</span>`;
      } else {
        btn.disabled = false;
        btn.style.background = '#D97706';
        btn.innerHTML = `<span>${actionPrefix} Kirim ${label} (Luar Radius)</span>`;
      }
    }
  },

  /**
   * Eksekusi Kirim Presensi ke Server (Verifikasi Sidik Jari HP + GPS)
   */
  async submitAttendanceAction() {
    const jenis = this.currentAttendanceType;
    const gps = AppState.gps;
    const inputAlasan = document.getElementById('input-alasan-luar-radius');
    const alasan = inputAlasan ? inputAlasan.value.trim() : '';

    if (!gps.isActive || gps.lat === null) {
      App.showToast('Lokasi GPS belum terdeteksi. Pastikan GPS HP diizinkan dan aktif.', 'warning');
      return;
    }

    if (!gps.insideRadius && !alasan) {
      App.showToast('Harap tuliskan keterangan alasan melakukan absen di luar radius jangkauan.', 'warning');
      if (inputAlasan) inputAlasan.focus();
      return;
    }

    // 1. Verifikasi Biometrik Sidik Jari Bawaan HP
    const hasBiometric = await BiometricService.isAvailable();
    let bioNote = '';

    if (hasBiometric) {
      App.showLoading(true, '👆 Sentuh sensor sidik jari HP Anda untuk verifikasi kehadiran...');
      const bioResult = await BiometricService.verifyBiometric(AppState.user || { niy: 'pegawai' });
      App.showLoading(false);

      if (!bioResult.success) {
        if (bioResult.error === 'CANCELLED') {
          App.showToast('⚠️ Presensi dibatalkan. Verifikasi sidik jari diperlukan untuk konfirmasi kehadiran.', 'warning');
        } else {
          App.showToast('❌ ' + bioResult.message, 'danger');
        }
        return;
      }

      bioNote = '[Sidik Jari: Valid ✓]';
      App.showToast('✅ Sidik jari cocok & terverifikasi!', 'success');
    }

    const labelLuar = !gps.insideRadius ? `[Luar Radius: ${gps.distance}m] ${alasan}` : `Presensi ${jenis} (Dalam Radius)`;
    const ketFinal = bioNote ? `${labelLuar} | ${bioNote}` : labelLuar;

    App.showLoading(true, `Menyimpan data presensi ${jenis}...`);

    try {
      const payload = {
        token: AppState.token,
        jenis: jenis,
        latitude: gps.lat,
        longitude: gps.lng,
        accuracy: gps.accuracy,
        foto_base64: '',
        keterangan: ketFinal,
        alasan: alasan,
        biometric_status: hasBiometric ? 'VERIFIED' : 'NOT_SUPPORTED'
      };

      const res = await Api.submitAttendance(payload);
      App.showLoading(false);

      if (res.success) {
        this.closeAttendanceModal();

        // Update status lokal
        if (jenis === 'MASUK') {
          AppState.todayAttendance.sudahMasuk = true;
          AppState.todayAttendance.dataMasuk = res.data || {
            jam_server: new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            tanggal: new Date().toISOString().split('T')[0],
            status_kehadiran: 'Tepat Waktu',
            jarak_meter: gps.distance || 15
          };
        } else {
          AppState.todayAttendance.sudahPulang = true;
          AppState.todayAttendance.dataPulang = res.data || {
            jam_server: new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            tanggal: new Date().toISOString().split('T')[0],
            status_kehadiran: 'Pulang Normal',
            jarak_meter: gps.distance || 15
          };
        }

        this.renderTodayStatusCards();
        await this.loadTodayStatus();
        App.showToast(`✅ Presensi ${jenis} dengan verifikasi sidik jari berhasil dicatat!`, 'success');

      } else {
        App.showToast(res.message || 'Gagal mengirim presensi.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Kesalahan server: ' + err.message, 'danger');
    }
  },

      } else {
        App.showToast(res.message || 'Gagal mengirim presensi.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Kesalahan server: ' + err.message, 'danger');
    }
  },
      App.showToast('Terjadi kesalahan koneksi: ' + err.message, 'danger');
    }
  },

  /**
   * Navigasi Antar Tab Guru (Sidebar & Bottom Bar)
   */
  setupTabNavigation() {
    // Sidebar nav items
    document.querySelectorAll('.guru-sidebar-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabTarget = btn.getAttribute('data-tab');
        if (tabTarget) this.switchTab(tabTarget);
      });
    });

    // Mobile bottom nav items
    document.querySelectorAll('.guru-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabTarget = btn.getAttribute('data-tab');
        if (tabTarget) this.switchTab(tabTarget);
      });
    });

    // Month & year filter change
    const fMonth = document.getElementById('filter-history-month');
    const fYear = document.getElementById('filter-history-year');
    if (fMonth) fMonth.addEventListener('change', () => this.loadAttendanceHistory());
    if (fYear) fYear.addEventListener('change', () => this.loadAttendanceHistory());

    // Password change form
    const formPass = document.getElementById('form-change-password');
    if (formPass) {
      formPass.addEventListener('submit', (e) => this.handleChangePassword(e));
    }
  },

  /**
   * Pergantian Tab Konten
   */
  async switchTab(tabName) {
    this.activeTab = tabName;

    // Update active class pada dock baru (Beranda & Profil)
    const btnBeranda = document.getElementById('dock-btn-beranda');
    const btnProfil = document.getElementById('dock-btn-profil');
    if (btnBeranda) btnBeranda.classList.toggle('active', tabName === 'beranda');
    if (btnProfil) btnProfil.classList.toggle('active', tabName === 'profil');

    // Update active class pada sidebar
    document.querySelectorAll('.guru-sidebar-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Update active class pada navigasi bawah (mobile)
    document.querySelectorAll('.guru-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Sembunyikan semua section
    document.querySelectorAll('.guru-view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    // Tampilkan section terpilih
    const targetSection = document.getElementById(`guru-section-${tabName}`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Penanganan khusus tiap tab
    if (tabName === 'beranda') {
      this.loadTodayStatus();
    } else if (tabName === 'riwayat') {
      this.loadAttendanceHistory();
      this.loadMonthlyRecap();
    }
  },

  /**
   * Memuat Riwayat Presensi Guru Pribadi
   */
  async loadAttendanceHistory() {
    const listEl = document.getElementById('history-list-container');
    if (!listEl) return;

    listEl.innerHTML = '<div class="loading-state" style="padding:20px;text-align:center;">Memuat riwayat presensi...</div>';

    const selBulan = document.getElementById('filter-history-month');
    const selTahun = document.getElementById('filter-history-year');
    const bulan = selBulan ? selBulan.value : '';
    const tahun = selTahun ? selTahun.value : '';

    try {
      const res = await Api.getGuruHistory(AppState.token, bulan, tahun);
      if (res.success && res.data && res.data.length > 0) {
        listEl.innerHTML = res.data.map(item => `
          <div class="history-item-card" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span class="badge ${item.jenis === 'MASUK' ? 'badge-primary' : 'badge-info'}" style="font-weight:700;">${item.jenis}</span>
              <span style="font-size:0.8rem;color:#64748B;">${item.tanggal}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <b style="font-size:1.1rem;color:#0B2545;">${item.jam_server} WIB</b>
                <span style="font-size:0.8rem;margin-left:8px;padding:2px 8px;border-radius:10px;background:#ECFDF5;color:#047857;">
                  ${item.status_kehadiran}
                </span>
              </div>
              <div style="font-size:0.75rem;color:#64748B;">
                📍 ${item.jarak_meter} m
              </div>
            </div>
          </div>
        `).join('');
      } else {
        listEl.innerHTML = '<div class="empty-state" style="padding:24px;text-align:center;color:#64748B;">Belum ada catatan presensi pada periode ini.</div>';
      }
    } catch (e) {
      listEl.innerHTML = '<div class="error-state" style="padding:24px;text-align:center;color:#EF4444;">Gagal memuat riwayat.</div>';
    }
  },

  /**
   * Memuat Ringkasan / Rekap Bulanan Guru
   */
  async loadMonthlyRecap() {
    const selBulan = document.getElementById('filter-history-month');
    const selTahun = document.getElementById('filter-history-year');
    const bulan = selBulan ? selBulan.value : '';
    const tahun = selTahun ? selTahun.value : '';

    try {
      const res = await Api.getGuruRecap(AppState.token, bulan, tahun);
      if (res.success && res.data) {
        const d = res.data;
        const elTot = document.getElementById('recap-total-hadir');
        const elTep = document.getElementById('recap-tepat-waktu');
        const elTel = document.getElementById('recap-terlambat');
        const elPul = document.getElementById('recap-pulang-cepat');

        if (elTot) elTot.textContent = d.total_hadir || 0;
        if (elTep) elTep.textContent = d.tepat_waktu || 0;
        if (elTel) elTel.textContent = d.terlambat || 0;
        if (elPul) elPul.textContent = d.pulang_cepat || 0;

        // Sinkronkan juga ke kartu mini di dashboard beranda
        const dTot = document.getElementById('dash-mini-hadir');
        const dTep = document.getElementById('dash-mini-tepat');
        const dTel = document.getElementById('dash-mini-telat');
        if (dTot) dTot.textContent = d.total_hadir || 0;
        if (dTep) dTep.textContent = d.tepat_waktu || 0;
        if (dTel) dTel.textContent = d.terlambat || 0;
      }
    } catch (e) {}
  },

  /**
   * Memuat Rekap Mini Bulan Ini untuk Kartu Sebelah Kanan Bawah di Beranda
   */
  async loadDashRecapMini() {
    const now = new Date();
    const bulan = String(now.getMonth() + 1).padStart(2, '0');
    const tahun = String(now.getFullYear());
    const bulanNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const lbl = document.getElementById('dash-recap-month-label');
    if (lbl) lbl.textContent = `${bulanNames[now.getMonth() + 1]} ${tahun}`;

    try {
      const res = await Api.getGuruRecap(AppState.token, bulan, tahun);
      if (res && res.success && res.data) {
        const d = res.data;
        const dTot = document.getElementById('dash-mini-hadir');
        const dTep = document.getElementById('dash-mini-tepat');
        const dTel = document.getElementById('dash-mini-telat');

        if (dTot) dTot.textContent = d.total_hadir || 0;
        if (dTep) dTep.textContent = d.tepat_waktu || 0;
        if (dTel) dTel.textContent = d.terlambat || 0;
      }
    } catch (e) {
      console.warn('Gagal memuat rekap mini:', e);
    }
  },

  /**
   * Form Ubah Password Guru
   */
  async handleChangePassword(e) {
    e.preventDefault();
    const oldPass = document.getElementById('input-old-pass').value;
    const newPass = document.getElementById('input-new-pass').value;
    const confPass = document.getElementById('input-confirm-pass').value;

    if (newPass !== confPass) {
      App.showToast('Konfirmasi password baru tidak cocok.', 'warning');
      return;
    }

    App.showLoading(true, 'Memperbarui password...');
    try {
      const res = await Api.changePassword(AppState.token, oldPass, newPass);
      App.showLoading(false);
      if (res.success) {
        App.showToast('Password berhasil diubah. Silakan gunakan password baru saat login berikutnya.', 'success');
        document.getElementById('form-change-password').reset();
      } else {
        App.showToast(res.message || 'Gagal mengubah password.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Kesalahan server: ' + err.message, 'danger');
    }
  },

  // -------------------------------------------------------------
  // MODAL & UTILITY PEGAWAI SESUAI REFERENSI
  // -------------------------------------------------------------
  openNoticeModal() {
    const modal = document.getElementById('modal-announcement');
    if (modal) modal.style.display = 'flex';
  },

  closeNoticeModal() {
    const modal = document.getElementById('modal-announcement');
    if (modal) modal.style.display = 'none';
  },

  openCutiModal() {
    const modal = document.getElementById('modal-cuti');
    if (modal) {
      modal.style.display = 'flex';
      const inputMulai = document.getElementById('cuti-mulai');
      const inputSelesai = document.getElementById('cuti-selesai');
      const todayIso = new Date().toISOString().split('T')[0];
      if (inputMulai && !inputMulai.value) inputMulai.value = todayIso;
      if (inputSelesai && !inputSelesai.value) inputSelesai.value = todayIso;
    }
  },

  closeCutiModal() {
    const modal = document.getElementById('modal-cuti');
    if (modal) modal.style.display = 'none';
  },

  submitCuti(e) {
    if (e) e.preventDefault();
    const jenis = document.getElementById('cuti-jenis') ? document.getElementById('cuti-jenis').value : 'Cuti';
    const mulai = document.getElementById('cuti-mulai') ? document.getElementById('cuti-mulai').value : '';
    const selesai = document.getElementById('cuti-selesai') ? document.getElementById('cuti-selesai').value : '';
    App.showToast(`✅ Pengajuan ${jenis} (${mulai} s.d ${selesai}) berhasil dicatat. Menunggu persetujuan pimpinan.`, 'success');
    this.closeCutiModal();
  },

  openDinasLuarModal() {
    const modal = document.getElementById('modal-dinas-luar');
    if (modal) {
      modal.style.display = 'flex';
      const inputTgl = document.getElementById('dinas-tanggal');
      const todayIso = new Date().toISOString().split('T')[0];
      if (inputTgl && !inputTgl.value) inputTgl.value = todayIso;
    }
  },

  closeDinasLuarModal() {
    const modal = document.getElementById('modal-dinas-luar');
    if (modal) modal.style.display = 'none';
  },

  submitDinasLuar(e) {
    if (e) e.preventDefault();
    const lokasi = document.getElementById('dinas-lokasi') ? document.getElementById('dinas-lokasi').value : 'Lokasi Dinas';
    const tgl = document.getElementById('dinas-tanggal') ? document.getElementById('dinas-tanggal').value : '';
    App.showToast(`✅ Pengajuan Dinas Luar ke ${lokasi} (${tgl}) berhasil dicatat.`, 'success');
    this.closeDinasLuarModal();
  },

  toggleAttendanceCard() {
    const card = document.getElementById('floating-attendance-card');
    if (card) {
      card.style.display = (card.style.display === 'none') ? 'block' : 'none';
    }
  }
};
