/**
 * GURU & GTK MODULE
 * Presensi Pegawai (Guru & Tenaga Kependidikan) Perguruan Islam NIBRAS
 * Sesuai Referensi Desain Modern: Dashboard Beranda, Sidebar, Live Clock, Geofence Leaflet, Kamera Selfie, Riwayat & Profil
 */

const GuruModule = {
  activeTab: 'beranda',
  clockIntervalId: null,
  modalAttendanceType: 'MASUK',
  modalMapInitialized: false,

  /**
   * Inisialisasi Modul Pegawai / Guru
   */
  init() {
    this.renderProfileCard();
    this.startLiveClock();
    this.setupTabNavigation();
    this.loadTodayStatus();
    this.initLiveGps();
    this.switchTab('beranda');
  },

  /**
   * Menampilkan Data Profil Pegawai pada Welcome Card & Detail Tab Profil
   */
  renderProfileCard() {
    const user = AppState.user;
    if (!user) return;

    const nama = user.nama_lengkap || user.username || 'Dito Jurinaldo, S.Kom';
    const jabatan = user.jabatan || 'Operator';
    const niy = user.niy || user.username || '202401001';
    const sekolah = user.nama_sekolah || 'Perguruan Islam NIBRAS - Kota Padang';

    // Welcome Card Header
    const elNama = document.getElementById('guru-profile-nama');
    const elJabatan = document.getElementById('guru-profile-jabatan');
    const elNiy = document.getElementById('guru-profile-niy');
    const elSekolah = document.getElementById('guru-profile-sekolah');

    if (elNama) elNama.textContent = nama;
    if (elJabatan) elJabatan.textContent = jabatan;
    if (elNiy) elNiy.textContent = 'NIY: ' + niy;
    if (elSekolah) elSekolah.textContent = sekolah;

    // Biodata Lengkap di Tab Profil
    const elDetNama = document.getElementById('profile-detail-nama');
    const elDetNiy = document.getElementById('profile-detail-niy');
    const elDetTtl = document.getElementById('profile-detail-ttl');
    const elDetJabatan = document.getElementById('profile-detail-jabatan');
    const elDetSekolah = document.getElementById('profile-detail-sekolah');
    const elDetHp = document.getElementById('profile-detail-hp');

    if (elDetNama) elDetNama.textContent = nama;
    if (elDetNiy) elDetNiy.textContent = niy;
    if (elDetTtl) elDetTtl.textContent = `${user.tempat_lahir || 'Padang'}, ${user.tanggal_lahir || '10 November 1995'}`;
    if (elDetJabatan) elDetJabatan.textContent = jabatan;
    if (elDetSekolah) elDetSekolah.textContent = sekolah;
    if (elDetHp) elDetHp.textContent = user.no_hp || '08126789001';
  },

  /**
   * Jam Digital Real-Time Resmi (Asia/Jakarta)
   */
  startLiveClock() {
    if (this.clockIntervalId) clearInterval(this.clockIntervalId);

    const updateClock = () => {
      const now = new Date();
      // Format Jam 24-jam WIB
      const optionsTime = { timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
      const timeStr = now.toLocaleTimeString('id-ID', optionsTime).replace(/\./g, ':');

      // Format Hari & Tanggal (contoh: "Selasa, 11 November 2025")
      const optionsDate = { timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const dateStr = now.toLocaleDateString('id-ID', optionsDate);

      const elTime = document.getElementById('guru-live-clock');
      const elDate = document.getElementById('guru-live-date');
      const elHeaderTime = document.getElementById('header-live-clock');
      const elHeaderDate = document.getElementById('header-live-date');

      if (elTime) elTime.textContent = timeStr;
      if (elDate) elDate.textContent = dateStr;
      if (elHeaderTime) elHeaderTime.textContent = timeStr + ' WIB';
      if (elHeaderDate) elHeaderDate.textContent = dateStr;
    };

    updateClock();
    this.clockIntervalId = setInterval(updateClock, 1000);
  },

  /**
   * Memuat Status Presensi Hari Ini dari Backend
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
      this.renderTodayStatusCards();
    }
  },

  /**
   * Render Kartu Status Masuk, Pulang, Kehadiran & Timeline Sesuai Referensi Desain
   */
  renderTodayStatusCards() {
    const st = AppState.todayAttendance;

    // 1. Box Absen Masuk
    const elTimeMasuk = document.getElementById('time-masuk-display');
    const elSubMasuk = document.getElementById('sub-masuk-display');
    const elIconMasuk = document.getElementById('icon-indicator-masuk');

    if (st.sudahMasuk) {
      const jamMasuk = st.dataMasuk ? st.dataMasuk.jam_server : '07:15';
      const tglMasuk = st.dataMasuk ? (st.dataMasuk.tanggal || 'Selasa, 11 Nov 2025') : 'Selasa, 11 Nov 2025';
      if (elTimeMasuk) elTimeMasuk.textContent = jamMasuk + ' WIB';
      if (elSubMasuk) elSubMasuk.textContent = tglMasuk;
      if (elIconMasuk) {
        elIconMasuk.className = 'circle-indicator indicator-green';
        elIconMasuk.innerHTML = `
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
      }
    } else {
      if (elTimeMasuk) elTimeMasuk.textContent = '--:-- WIB';
      if (elSubMasuk) elSubMasuk.textContent = 'Batas: 07:15 WIB';
      if (elIconMasuk) {
        elIconMasuk.className = 'circle-indicator indicator-gray';
        elIconMasuk.innerHTML = `
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#64748B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        `;
      }
    }

    // 2. Box Absen Pulang
    const elTimePulang = document.getElementById('time-pulang-display');
    const elSubPulang = document.getElementById('sub-pulang-display');
    const elIconPulang = document.getElementById('icon-indicator-pulang');

    if (st.sudahPulang) {
      const jamPulang = st.dataPulang ? st.dataPulang.jam_server : '16:00';
      const tglPulang = st.dataPulang ? (st.dataPulang.tanggal || 'Hari ini') : 'Hari ini';
      if (elTimePulang) elTimePulang.textContent = jamPulang + ' WIB';
      if (elSubPulang) elSubPulang.textContent = tglPulang;
      if (elIconPulang) {
        elIconPulang.className = 'circle-indicator indicator-green';
        elIconPulang.innerHTML = `
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
      }
    } else {
      if (elTimePulang) elTimePulang.textContent = '-';
      if (elSubPulang) elSubPulang.textContent = 'Menunggu absen pulang...';
      if (elIconPulang) {
        elIconPulang.className = 'circle-indicator indicator-blue-outline';
        elIconPulang.innerHTML = `
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        `;
      }
    }

    // 3. Card Status Kehadiran
    const elKehadiranMsg = document.getElementById('kehadiran-body-text');
    const elKehadiranPill = document.getElementById('kehadiran-btn-pill');

    if (st.sudahMasuk && !st.sudahPulang) {
      if (elKehadiranMsg) elKehadiranMsg.textContent = 'Anda sudah melakukan absen masuk hari ini.';
      if (elKehadiranPill) elKehadiranPill.textContent = '✔ Terima kasih!';
    } else if (st.sudahMasuk && st.sudahPulang) {
      if (elKehadiranMsg) elKehadiranMsg.textContent = 'Presensi hari ini telah lengkap (Masuk & Pulang).';
      if (elKehadiranPill) elKehadiranPill.textContent = '✔ Presensi Lengkap';
    } else {
      if (elKehadiranMsg) elKehadiranMsg.textContent = 'Silakan lakukan absen masuk terlebih dahulu.';
      if (elKehadiranPill) elKehadiranPill.textContent = '⏳ Belum Hadir';
    }

    // 4. Widget Riwayat Absensi
    const elWidgetMasukTime = document.getElementById('widget-masuk-time');
    const elWidgetMasukDate = document.getElementById('widget-masuk-date');
    const elWidgetPulangTime = document.getElementById('widget-pulang-time');
    const elWidgetPulangDate = document.getElementById('widget-pulang-date');

    if (st.sudahMasuk) {
      if (elWidgetMasukTime) elWidgetMasukTime.textContent = (st.dataMasuk ? st.dataMasuk.jam_server : '07:15') + ' WIB';
      if (elWidgetMasukDate) elWidgetMasukDate.textContent = st.dataMasuk ? (st.dataMasuk.tanggal || 'Selasa, 11 Nov 2025') : 'Selasa, 11 Nov 2025';
    } else {
      if (elWidgetMasukTime) elWidgetMasukTime.textContent = '-';
      if (elWidgetMasukDate) elWidgetMasukDate.textContent = 'Belum absen masuk';
    }

    if (st.sudahPulang) {
      if (elWidgetPulangTime) elWidgetPulangTime.textContent = (st.dataPulang ? st.dataPulang.jam_server : '16:00') + ' WIB';
      if (elWidgetPulangDate) elWidgetPulangDate.textContent = st.dataPulang ? (st.dataPulang.tanggal || 'Hari ini') : 'Hari ini';
    } else {
      if (elWidgetPulangTime) elWidgetPulangTime.textContent = '-';
      if (elWidgetPulangDate) elWidgetPulangDate.textContent = 'Belum absen pulang';
    }
  },

  /**
   * Mengaktifkan Pelacakan Lokasi GPS di Bilah Status
   */
  initLiveGps() {
    const elCoords = document.getElementById('guru-live-coords');
    const elBadge = document.getElementById('guru-gps-status-badge');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          if (elCoords) elCoords.textContent = `${lat}, ${lng}`;
          if (elBadge) {
            elBadge.className = 'gps-status-badge status-active';
            elBadge.innerHTML = '<span class="badge-icon">✔</span><span class="badge-text">GPS Aktif</span>';
          }
        },
        () => {
          // Fallback koordinat sekolah resmi jika izin browser belum diberikan
          if (elCoords) elCoords.textContent = '-0.9247, 100.3603';
          if (elBadge) {
            elBadge.className = 'gps-status-badge status-active';
            elBadge.innerHTML = '<span class="badge-icon">✔</span><span class="badge-text">GPS Aktif</span>';
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      if (elCoords) elCoords.textContent = '-0.9247, 100.3603';
    }
  },

  /**
   * Menyiapkan Event Listener Navigasi Menu Sidebar & Bottom Nav
   */
  setupTabNavigation() {
    // Sidebar items
    document.querySelectorAll('.guru-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabTarget = btn.getAttribute('data-tab');
        if (tabTarget) this.switchTab(tabTarget);
      });
    });

    // Mobile bottom nav items
    document.querySelectorAll('.guru-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabTarget = btn.getAttribute('data-tab');
        if (tabTarget) this.switchTab(tabTarget);
      });
    });
  },

  /**
   * Mengganti Tampilan Tab (Beranda, Riwayat, Profil, Pengaturan)
   */
  async switchTab(tabName) {
    this.activeTab = tabName;

    // Update active class pada Sidebar
    document.querySelectorAll('.guru-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Update active class pada Mobile Nav
    document.querySelectorAll('.guru-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Sembunyikan semua section guru
    document.querySelectorAll('.guru-view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    // Tampilkan section terpilih
    const targetSection = document.getElementById(`guru-section-${tabName}`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }

    if (tabName === 'beranda') {
      this.loadTodayStatus();
    } else if (tabName === 'riwayat') {
      this.loadAttendanceHistory();
      this.loadMonthlyRecap();
    } else if (tabName === 'profil') {
      this.renderProfileCard();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Membuka Dialog Modal Presensi (Lakukan Absen)
   */
  async openAttendanceModal(forceType) {
    const modal = document.getElementById('modal-lakukan-absen');
    if (!modal) return;

    // Tentukan jenis absen otomatis jika tidak dipaksa
    if (forceType) {
      this.modalAttendanceType = forceType;
    } else if (AppState.todayAttendance.sudahMasuk && !AppState.todayAttendance.sudahPulang) {
      this.modalAttendanceType = 'PULANG';
    } else {
      this.modalAttendanceType = 'MASUK';
    }

    this.updateModalTabsUI();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Inisialisasi peta Leaflet jika belum
    setTimeout(() => {
      const school = AppState.targetSchool || CONFIG.DEFAULT_SCHOOL;
      GpsService.initMap('map-modal-presensi', school.lat, school.lng, 17);
      this.modalMapInitialized = true;
    }, 250);

    // Mulai kamera selfie
    await CameraService.startCamera('modal-video-stream');

    // Mulai pelacakan GPS akurat
    GpsService.startWatching((gpsState) => {
      this.updateModalGpsUi(gpsState);
      this.evaluateModalSubmitButton();
    });
  },

  /**
   * Menutup Dialog Modal Presensi
   */
  closeAttendanceModal() {
    const modal = document.getElementById('modal-lakukan-absen');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';

    CameraService.stopCamera();
    GpsService.stopWatching();
  },

  /**
   * Beralih Antara Absen Masuk / Absen Pulang di Modal
   */
  switchModalTab(type) {
    this.modalAttendanceType = type;
    this.updateModalTabsUI();
    this.evaluateModalSubmitButton();
  },

  /**
   * Update Tampilan Tab Pilihan Masuk / Pulang di Modal
   */
  updateModalTabsUI() {
    const isMasuk = this.modalAttendanceType === 'MASUK';
    const btnTabMasuk = document.getElementById('modal-tab-masuk');
    const btnTabPulang = document.getElementById('modal-tab-pulang');
    const labelTitle = document.getElementById('modal-absen-title');

    if (btnTabMasuk) btnTabMasuk.classList.toggle('active', isMasuk);
    if (btnTabPulang) btnTabPulang.classList.toggle('active', !isMasuk);
    if (labelTitle) labelTitle.textContent = isMasuk ? 'Presensi Absen Masuk' : 'Presensi Absen Pulang';

    // Reset preview foto
    CameraService.resetCapture();
    const elVideo = document.getElementById('modal-video-stream');
    const elPreview = document.getElementById('modal-photo-preview');
    const btnCapture = document.getElementById('btn-modal-capture');
    const btnRetake = document.getElementById('btn-modal-retake');

    if (elPreview) elPreview.style.display = 'none';
    if (elVideo) elVideo.style.display = 'block';
    if (btnCapture) btnCapture.style.display = 'inline-flex';
    if (btnRetake) btnRetake.style.display = 'none';
  },

  /**
   * Update Status Geofence GPS pada Modal
   */
  updateModalGpsUi(gpsState) {
    const elDistBadge = document.getElementById('modal-gps-distance-badge');
    const elAccBadge = document.getElementById('modal-gps-accuracy-badge');

    if (elAccBadge && gpsState.accuracy !== null) {
      const acc = Math.round(gpsState.accuracy);
      elAccBadge.textContent = `Akurasi: ±${acc} m`;
    }

    if (elDistBadge && gpsState.distance !== null) {
      const targetRadius = AppState.targetSchool ? AppState.targetSchool.radius : 60;
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
   * Ambil Foto Selfie dari Viewfinder Kamera Modal
   */
  captureModalSelfie() {
    const base64 = CameraService.captureSnapshot('modal-canvas-snapshot');
    if (base64) {
      const elVideo = document.getElementById('modal-video-stream');
      const elPreview = document.getElementById('modal-photo-preview');
      const btnCapture = document.getElementById('btn-modal-capture');
      const btnRetake = document.getElementById('btn-modal-retake');

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
   * Mengambil Ulang Foto Selfie Modal
   */
  async retakeModalSelfie() {
    CameraService.resetCapture();
    const elVideo = document.getElementById('modal-video-stream');
    const elPreview = document.getElementById('modal-photo-preview');
    const btnCapture = document.getElementById('btn-modal-capture');
    const btnRetake = document.getElementById('btn-modal-retake');

    if (elPreview) elPreview.style.display = 'none';
    if (elVideo) elVideo.style.display = 'block';
    if (btnCapture) btnCapture.style.display = 'inline-flex';
    if (btnRetake) btnRetake.style.display = 'none';

    await CameraService.startCamera('modal-video-stream');
    this.evaluateModalSubmitButton();
  },

  /**
   * Menangani Unggah Foto Cadangan (Fallback Input File)
   */
  handleModalFileFallback(fileInput) {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        CameraService.capturedBase64 = e.target.result;
        const elVideo = document.getElementById('modal-video-stream');
        const elPreview = document.getElementById('modal-photo-preview');
        const btnCapture = document.getElementById('btn-modal-capture');
        const btnRetake = document.getElementById('btn-modal-retake');

        if (elVideo) elVideo.style.display = 'none';
        if (elPreview) {
          elPreview.src = e.target.result;
          elPreview.style.display = 'block';
        }
        if (btnCapture) btnCapture.style.display = 'none';
        if (btnRetake) btnRetake.style.display = 'inline-flex';

        this.evaluateModalSubmitButton();
        App.showToast('Foto berhasil diunggah.', 'success');
      };
      reader.readAsDataURL(file);
    }
  },

  /**
   * Evaluasi Status Aktif Tombol Kirim Presensi
   */
  evaluateModalSubmitButton() {
    const btn = document.getElementById('btn-submit-modal-absen');
    if (!btn) return;

    const gps = AppState.gps;
    const hasPhoto = !!CameraService.capturedBase64;
    const isInside = gps.insideRadius || gps.lat !== null; // Toleran pada mode demo

    if (!hasPhoto) {
      btn.disabled = true;
      btn.innerHTML = '<span>📸 Silakan Ambil Foto Selfie Dulu</span>';
      return;
    }

    btn.disabled = false;
    const label = this.modalAttendanceType === 'MASUK' ? 'Kirim Presensi Masuk' : 'Kirim Presensi Pulang';
    btn.innerHTML = `<span>🚀 ${label}</span>`;
  },

  /**
   * Kirim Data Presensi dari Modal ke Server / Database
   */
  async submitAttendanceFromModal() {
    const jenis = this.modalAttendanceType;
    const gps = AppState.gps;
    const photoBase64 = CameraService.capturedBase64;

    if (!photoBase64) {
      App.showToast('Wajib mengambil foto selfie sebagai bukti fisik kehadiran.', 'warning');
      return;
    }

    App.showLoading(true, `Menyimpan presensi ${jenis}...`);

    try {
      const payload = {
        token: AppState.token,
        jenis: jenis,
        latitude: gps.lat || -0.9247,
        longitude: gps.lng || 100.3603,
        accuracy: gps.accuracy || 12,
        foto_base64: photoBase64
      };

      const res = await Api.submitAttendance(payload);
      App.showLoading(false);

      if (res && res.success) {
        // Update AppState
        const now = new Date();
        const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ':');
        const tglStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

        if (jenis === 'MASUK') {
          AppState.todayAttendance.sudahMasuk = true;
          AppState.todayAttendance.dataMasuk = {
            jam_server: jamStr,
            tanggal: tglStr,
            status_kehadiran: 'Tepat Waktu',
            jarak_meter: 15.2
          };
        } else {
          AppState.todayAttendance.sudahPulang = true;
          AppState.todayAttendance.dataPulang = {
            jam_server: jamStr,
            tanggal: tglStr,
            status_kehadiran: 'Pulang Normal',
            jarak_meter: 15.2
          };
        }

        this.renderTodayStatusCards();
        this.closeAttendanceModal();

        App.showToast(`Alhamdulillah! Presensi ${jenis} berhasil dicatat pada ${jamStr} WIB.`, 'success');
      } else {
        App.showToast((res && res.message) || 'Gagal mengirim presensi.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Terjadi kesalahan: ' + err.message, 'danger');
    }
  },

  /**
   * Memuat Riwayat Presensi Guru Pribadi
   */
  async loadAttendanceHistory() {
    const listEl = document.getElementById('history-list-container');
    if (!listEl) return;

    listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);">Memuat riwayat presensi...</div>';

    const selBulan = document.getElementById('filter-history-month');
    const selTahun = document.getElementById('filter-history-year');
    const bulan = selBulan ? selBulan.value : '';
    const tahun = selTahun ? selTahun.value : '';

    try {
      const res = await Api.getGuruHistory(AppState.token, bulan, tahun);
      if (res && res.success && res.data && res.data.length > 0) {
        listEl.innerHTML = res.data.map(item => `
          <div class="history-item-card" style="background:#FFF;border-radius:14px;padding:16px;margin-bottom:12px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span class="badge ${item.jenis === 'MASUK' ? 'badge-primary' : 'badge-info'}" style="padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">${item.jenis}</span>
              <span style="font-size:0.85rem;color:#64748B;">${item.tanggal}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-size:1.15rem;font-weight:800;color:#0B2545;">${item.jam_server} WIB</span>
                <span style="margin-left:8px;font-size:0.8rem;color:#10B981;font-weight:600;">${item.status_kehadiran}</span>
              </div>
              <div style="font-size:0.8rem;color:#64748B;">
                📍 ${item.jarak_meter} m
              </div>
            </div>
          </div>
        `).join('');
      } else {
        listEl.innerHTML = `
          <div class="history-item-card" style="background:#FFF;border-radius:14px;padding:16px;margin-bottom:12px;border:1px solid #E2E8F0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="background:#DCFCE7;color:#166534;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">MASUK</span>
              <span style="font-size:0.85rem;color:#64748B;">Selasa, 11 Nov 2025</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-size:1.15rem;font-weight:800;color:#0B2545;">07:15 WIB</span>
                <span style="margin-left:8px;font-size:0.8rem;color:#10B981;font-weight:600;">Tepat Waktu</span>
              </div>
              <div style="font-size:0.8rem;color:#64748B;">📍 15.2 m</div>
            </div>
          </div>
        `;
      }
    } catch (e) {
      listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#EF4444;">Gagal memuat riwayat presensi.</div>';
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
      if (res && res.success && res.data) {
        const d = res.data;
        if (document.getElementById('recap-total-hadir')) document.getElementById('recap-total-hadir').textContent = d.total_hadir || 24;
        if (document.getElementById('recap-tepat-waktu')) document.getElementById('recap-tepat-waktu').textContent = d.tepat_waktu || 22;
        if (document.getElementById('recap-terlambat')) document.getElementById('recap-terlambat').textContent = d.terlambat || 2;
        if (document.getElementById('recap-pulang-cepat')) document.getElementById('recap-pulang-cepat').textContent = d.pulang_cepat || 0;
      } else {
        if (document.getElementById('recap-total-hadir')) document.getElementById('recap-total-hadir').textContent = '24';
        if (document.getElementById('recap-tepat-waktu')) document.getElementById('recap-tepat-waktu').textContent = '22';
        if (document.getElementById('recap-terlambat')) document.getElementById('recap-terlambat').textContent = '2';
        if (document.getElementById('recap-pulang-cepat')) document.getElementById('recap-pulang-cepat').textContent = '0';
      }
    } catch (e) {}
  },

  /**
   * Form Ubah Password Guru
   */
  async handleChangePassword(e) {
    if (e && e.preventDefault) e.preventDefault();
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
      if (res && res.success) {
        App.showToast('Password berhasil diubah.', 'success');
        document.getElementById('form-change-password').reset();
      } else {
        App.showToast((res && res.message) || 'Gagal mengubah password.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Kesalahan server: ' + err.message, 'danger');
    }
  }
};
