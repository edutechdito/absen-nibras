/**
 * GURU & GTK MODULE
 * Seluruh alur kerja presensi guru: Dashboard, Live Clock, Geofence Check, Selfie, Riwayat & Profil
 */

const GuruModule = {
  activeTab: 'beranda',
  clockIntervalId: null,

  /**
   * Inisialisasi Modul Guru
   */
  init() {
    this.renderProfileCard();
    this.startLiveClock();
    this.loadTodayStatus();
    this.setupTabNavigation();
    this.switchTab('beranda');
  },

  /**
   * Menampilkan Data Profil Guru di Header
   */
  renderProfileCard() {
    const user = AppState.user;
    if (!user) return;

    const elNama = document.getElementById('guru-profile-nama');
    const elNiy = document.getElementById('guru-profile-niy');
    const elJabatan = document.getElementById('guru-profile-jabatan');
    const elSekolah = document.getElementById('guru-profile-sekolah');

    if (elNama) elNama.textContent = user.nama_lengkap || user.username;
    if (elNiy) elNiy.textContent = 'NIY: ' + (user.niy || '-');
    if (elJabatan) elJabatan.textContent = user.jabatan || 'Guru';
    if (elSekolah) elSekolah.textContent = user.nama_sekolah || CONFIG.DEFAULT_SCHOOL.name;

    // Profil detail di Tab Profil
    const elDetNama = document.getElementById('profile-detail-nama');
    const elDetNiy = document.getElementById('profile-detail-niy');
    const elDetTtl = document.getElementById('profile-detail-ttl');
    const elDetJabatan = document.getElementById('profile-detail-jabatan');
    const elDetSekolah = document.getElementById('profile-detail-sekolah');
    const elDetHp = document.getElementById('profile-detail-hp');

    if (elDetNama) elDetNama.textContent = user.nama_lengkap || '-';
    if (elDetNiy) elDetNiy.textContent = user.niy || '-';
    if (elDetTtl) elDetTtl.textContent = `${user.tempat_lahir || '-'}, ${user.tanggal_lahir || '-'}`;
    if (elDetJabatan) elDetJabatan.textContent = user.jabatan || '-';
    if (elDetSekolah) elDetSekolah.textContent = user.nama_sekolah || '-';
    if (elDetHp) elDetHp.textContent = user.no_hp || '-';
  },

  /**
   * Jam Digital Real-Time Resmi WIB (Asia/Jakarta)
   */
  startLiveClock() {
    if (this.clockIntervalId) clearInterval(this.clockIntervalId);

    const updateClock = () => {
      const now = new Date();
      // Format Jam WIB
      const optionsTime = { timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
      const timeStr = now.toLocaleTimeString('id-ID', optionsTime);

      // Format Hari & Tanggal
      const optionsDate = { timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const dateStr = now.toLocaleDateString('id-ID', optionsDate);

      const elTime = document.getElementById('guru-live-clock');
      const elDate = document.getElementById('guru-live-date');

      if (elTime) elTime.textContent = timeStr + ' WIB';
      if (elDate) elDate.textContent = dateStr;
    };

    updateClock();
    this.clockIntervalId = setInterval(updateClock, 1000);
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
    }
  },

  /**
   * Render Kartu Status Masuk & Pulang di Beranda Guru
   */
  renderTodayStatusCards() {
    const st = AppState.todayAttendance;

    const elCardMasuk = document.getElementById('card-status-masuk');
    const elCardPulang = document.getElementById('card-status-pulang');

    if (elCardMasuk) {
      if (st.sudahMasuk && st.dataMasuk) {
        elCardMasuk.innerHTML = `
          <div class="status-badge badge-success">✓ Sudah Absen</div>
          <div class="status-time">${st.dataMasuk.jam_server} WIB</div>
          <div class="status-label">${st.dataMasuk.status_kehadiran} (${st.dataMasuk.jarak_meter} m)</div>
        `;
      } else {
        elCardMasuk.innerHTML = `
          <div class="status-badge badge-warning">Belum Absen</div>
          <div class="status-time">-- : -- WIB</div>
          <div class="status-label">Batas: 07:15 WIB</div>
        `;
      }
    }

    if (elCardPulang) {
      if (st.sudahPulang && st.dataPulang) {
        elCardPulang.innerHTML = `
          <div class="status-badge badge-success">✓ Sudah Absen</div>
          <div class="status-time">${st.dataPulang.jam_server} WIB</div>
          <div class="status-label">${st.dataPulang.status_kehadiran} (${st.dataPulang.jarak_meter} m)</div>
        `;
      } else {
        elCardPulang.innerHTML = `
          <div class="status-badge badge-secondary">Belum Absen</div>
          <div class="status-time">-- : -- WIB</div>
          <div class="status-label">Mulai: 15:30 WIB</div>
        `;
      }
    }
  },

  /**
   * Navigasi Antar Tab Guru
   */
  setupTabNavigation() {
    const tabs = document.querySelectorAll('.guru-tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabTarget = btn.getAttribute('data-tab');
        this.switchTab(tabTarget);
      });
    });
  },

  /**
   * Pergantian Tab Konten
   */
  async switchTab(tabName) {
    this.activeTab = tabName;

    // Update active class pada navigasi bawah
    document.querySelectorAll('.guru-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Sembunyikan semua section
    document.querySelectorAll('.guru-view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    // Hentikan pemantauan kamera & GPS jika keluar dari form absen
    if (tabName !== 'absen-masuk' && tabName !== 'absen-pulang') {
      CameraService.stopCamera();
      GpsService.stopWatching();
    }

    // Tampilkan section terpilih
    const targetSection = document.getElementById(`guru-section-${tabName}`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }

    // Penanganan khusus tiap tab
    if (tabName === 'beranda') {
      this.loadTodayStatus();
    } else if (tabName === 'absen-masuk') {
      this.setupAttendanceForm('MASUK');
    } else if (tabName === 'absen-pulang') {
      this.setupAttendanceForm('PULANG');
    } else if (tabName === 'riwayat') {
      this.loadAttendanceHistory();
      this.loadMonthlyRecap();
    }
  },

  /**
   * Setup Form Presensi (Masuk atau Pulang)
   */
  async setupAttendanceForm(jenis) {
    const prefix = jenis.toLowerCase();
    const btnSubmit = document.getElementById(`btn-submit-${prefix}`);
    const elDistanceBadge = document.getElementById(`distance-badge-${prefix}`);
    const elDistanceValue = document.getElementById(`distance-value-${prefix}`);
    const elAccuracyValue = document.getElementById(`gps-accuracy-${prefix}`);
    const elCameraContainer = document.getElementById(`camera-video-${prefix}`);
    const elPhotoPreview = document.getElementById(`photo-preview-${prefix}`);
    const btnCapture = document.getElementById(`btn-capture-${prefix}`);
    const btnRetake = document.getElementById(`btn-retake-${prefix}`);

    // Reset capture
    CameraService.resetCapture();
    if (elPhotoPreview) elPhotoPreview.style.display = 'none';
    if (elCameraContainer) elCameraContainer.style.display = 'block';
    if (btnCapture) btnCapture.style.display = 'inline-flex';
    if (btnRetake) btnRetake.style.display = 'none';

    // Periksa apakah sudah absen
    const sudahAbsen = jenis === 'MASUK' ? AppState.todayAttendance.sudahMasuk : AppState.todayAttendance.sudahPulang;
    if (sudahAbsen) {
      const dataAbsen = jenis === 'MASUK' ? AppState.todayAttendance.dataMasuk : AppState.todayAttendance.dataPulang;
      const jam = dataAbsen ? dataAbsen.jam_server : '';
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `✓ Anda Sudah Absen ${jenis} Hari Ini (${jam} WIB)`;
      }
      App.showToast(`Anda sudah melakukan Absen ${jenis} hari ini pada pukul ${jam} WIB.`, 'info');
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span>⏳ Menunggu Lokasi & Foto Selfie</span>`;
    }

    // Inisialisasi Peta Leaflet
    const mapContainerId = `map-container-${prefix}`;
    setTimeout(() => {
      GpsService.initMap(mapContainerId, AppState.targetSchool.lat, AppState.targetSchool.lng, 17);
    }, 200);

    // Mulai Kamera Depan
    const videoId = `video-stream-${prefix}`;
    const camStarted = await CameraService.startCamera(videoId);
    if (!camStarted) {
      App.showToast('Kamera tidak dapat dibuka otomatis. Anda dapat menggunakan tombol ambil foto manual.', 'warning');
    }

    // Mulai Pemantauan GPS Real-time
    GpsService.startWatching((gpsState) => {
      this.updateGpsUi(gpsState, prefix);
      this.evaluateSubmitButton(prefix);
    });
  },

  /**
   * Update UI Indikator GPS & Radius
   */
  updateGpsUi(gpsState, prefix) {
    const elDistBadge = document.getElementById(`distance-badge-${prefix}`);
    const elDistVal = document.getElementById(`distance-value-${prefix}`);
    const elAccVal = document.getElementById(`gps-accuracy-${prefix}`);
    const elGpsAlert = document.getElementById(`gps-alert-${prefix}`);

    if (gpsState.errorMessage) {
      if (elGpsAlert) {
        elGpsAlert.style.display = 'block';
        elGpsAlert.innerHTML = `⚠️ <b>Perhatian:</b> ${gpsState.errorMessage}`;
      }
      return;
    }

    if (elGpsAlert) elGpsAlert.style.display = 'none';

    if (elAccVal && gpsState.accuracy !== null) {
      const acc = Math.round(gpsState.accuracy);
      elAccVal.textContent = `Akurasi: ±${acc} m`;
      elAccVal.className = 'accuracy-indicator ' + (acc <= 25 ? 'acc-good' : acc <= 50 ? 'acc-med' : 'acc-poor');
    }

    if (elDistVal && gpsState.distance !== null) {
      elDistVal.textContent = `${gpsState.distance} meter`;
    }

    if (elDistBadge && gpsState.distance !== null) {
      const targetRadius = AppState.targetSchool.radius;
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
   * Tangkap Foto Selfie dari Stream
   */
  captureSelfie(prefix) {
    const base64 = CameraService.captureSnapshot(`canvas-snapshot-${prefix}`);
    if (base64) {
      const elVideo = document.getElementById(`video-stream-${prefix}`);
      const elPreview = document.getElementById(`photo-preview-${prefix}`);
      const btnCapture = document.getElementById(`btn-capture-${prefix}`);
      const btnRetake = document.getElementById(`btn-retake-${prefix}`);

      if (elVideo) elVideo.style.display = 'none';
      if (elPreview) {
        elPreview.src = base64;
        elPreview.style.display = 'block';
      }
      if (btnCapture) btnCapture.style.display = 'none';
      if (btnRetake) btnRetake.style.display = 'inline-flex';

      CameraService.stopCamera();
      this.evaluateSubmitButton(prefix);
      App.showToast('Foto selfie berhasil diambil!', 'success');
    } else {
      App.showToast('Gagal mengambil foto. Pastikan kamera telah menyala.', 'warning');
    }
  },

  /**
   * Foto Ulang Selfie
   */
  async retakeSelfie(prefix) {
    CameraService.resetCapture();
    const elVideo = document.getElementById(`video-stream-${prefix}`);
    const elPreview = document.getElementById(`photo-preview-${prefix}`);
    const btnCapture = document.getElementById(`btn-capture-${prefix}`);
    const btnRetake = document.getElementById(`btn-retake-${prefix}`);

    if (elPreview) elPreview.style.display = 'none';
    if (elVideo) elVideo.style.display = 'block';
    if (btnCapture) btnCapture.style.display = 'inline-flex';
    if (btnRetake) btnRetake.style.display = 'none';

    await CameraService.startCamera(`video-stream-${prefix}`);
    this.evaluateSubmitButton(prefix);
  },

  /**
   * Evaluasi Tombol Kirim Presensi
   */
  evaluateSubmitButton(prefix) {
    const btn = document.getElementById(`btn-submit-${prefix}`);
    if (!btn) return;

    const gps = AppState.gps;
    const hasPhoto = !!CameraService.capturedBase64;
    const isInside = gps.insideRadius;

    if (!gps.isActive || gps.lat === null) {
      btn.disabled = true;
      btn.innerHTML = '<span>📡 Mencari Lokasi GPS...</span>';
      return;
    }

    if (!isInside) {
      btn.disabled = true;
      btn.innerHTML = `<span>⚠️ Di Luar Radius Sekolah (${gps.distance} m)</span>`;
      return;
    }

    if (!hasPhoto) {
      btn.disabled = true;
      btn.innerHTML = '<span>📸 Silakan Ambil Foto Selfie Dulu</span>';
      return;
    }

    btn.disabled = false;
    const label = prefix === 'masuk' ? 'Kirim Presensi Masuk' : 'Kirim Presensi Pulang';
    btn.innerHTML = `<span>🚀 ${label}</span>`;
  },

  /**
   * Submit Transaksi Presensi ke Server
   */
  async submitAttendance(jenis) {
    const prefix = jenis.toLowerCase();
    const gps = AppState.gps;
    const photoBase64 = CameraService.capturedBase64;

    if (!gps.insideRadius) {
      App.showToast('Anda berada di luar area sekolah. Absensi tidak dapat dilakukan.', 'danger');
      return;
    }

    if (!photoBase64) {
      App.showToast('Wajib mengambil foto selfie sebagai bukti fisik kehadiran.', 'warning');
      return;
    }

    App.showLoading(true, `Mengirim data presensi ${jenis}...`);

    try {
      const payload = {
        token: AppState.token,
        jenis: jenis,
        latitude: gps.lat,
        longitude: gps.lng,
        accuracy: gps.accuracy,
        foto_base64: photoBase64
      };

      const res = await Api.submitAttendance(payload);
      App.showLoading(false);

      if (res.success) {
        // Tampilkan modal sukses
        this.showSuccessModal(res.data || {});

        // Refresh data status
        await this.loadTodayStatus();

        // Alihkan kembali ke beranda setelah 2.5 detik
        setTimeout(() => {
          this.switchTab('beranda');
        }, 2500);
      } else {
        App.showToast(res.message || 'Gagal mengirim presensi.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Terjadi kesalahan: ' + err.message, 'danger');
    }
  },

  /**
   * Menampilkan Modal Konfirmasi Sukses Presensi
   */
  showSuccessModal(data) {
    const modal = document.getElementById('modal-absen-success');
    if (!modal) return;

    document.getElementById('modal-success-jenis').textContent = 'ABSENSI ' + (data.jenis || 'BERHASIL');
    document.getElementById('modal-success-jam').textContent = (data.jam_server || '--:--:--') + ' WIB';
    document.getElementById('modal-success-tanggal').textContent = data.tanggal || '';
    document.getElementById('modal-success-status').textContent = data.status_kehadiran || 'Tepat Waktu';
    document.getElementById('modal-success-jarak').textContent = (data.jarak_meter || 0) + ' meter dari titik sekolah';

    modal.style.display = 'flex';
  },

  /**
   * Memuat Riwayat Presensi Guru Pribadi
   */
  async loadAttendanceHistory() {
    const listEl = document.getElementById('history-list-container');
    if (!listEl) return;

    listEl.innerHTML = '<div class="loading-state">Memuat riwayat presensi...</div>';

    const selBulan = document.getElementById('filter-history-month');
    const selTahun = document.getElementById('filter-history-year');
    const bulan = selBulan ? selBulan.value : '';
    const tahun = selTahun ? selTahun.value : '';

    try {
      const res = await Api.getGuruHistory(AppState.token, bulan, tahun);
      if (res.success && res.data && res.data.length > 0) {
        listEl.innerHTML = res.data.map(item => `
          <div class="history-item-card">
            <div class="history-item-header">
              <span class="badge ${item.jenis === 'MASUK' ? 'badge-primary' : 'badge-info'}">${item.jenis}</span>
              <span class="history-date">${item.tanggal}</span>
            </div>
            <div class="history-item-body">
              <div class="history-time-box">
                <span class="time-main">${item.jam_server} WIB</span>
                <span class="status-tag ${item.status_kehadiran === 'Tepat Waktu' || item.status_kehadiran === 'Pulang Normal' ? 'tag-good' : 'tag-warn'}">
                  ${item.status_kehadiran}
                </span>
              </div>
              <div class="history-meta">
                <span>📍 Jarak: ${item.jarak_meter} m</span>
                <span>📡 Akurasi: ±${Math.round(item.akurasi_gps || 0)} m</span>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        listEl.innerHTML = '<div class="empty-state">Belum ada catatan presensi pada periode ini.</div>';
      }
    } catch (e) {
      listEl.innerHTML = '<div class="error-state">Gagal memuat riwayat. Periksa koneksi internet.</div>';
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
        document.getElementById('recap-total-hadir').textContent = d.total_hadir || 0;
        document.getElementById('recap-tepat-waktu').textContent = d.tepat_waktu || 0;
        document.getElementById('recap-terlambat').textContent = d.terlambat || 0;
        document.getElementById('recap-pulang-cepat').textContent = d.pulang_cepat || 0;
      }
    } catch (e) {}
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
  }
};

