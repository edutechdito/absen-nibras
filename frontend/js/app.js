/**
 * CORE APPLICATION BOOTSTRAPPER & UI MANAGERS
 * Inisialisasi PWA Service Worker, Toast Notifications, Loading Spinners, dan Modals
 */

const App = {
  deferredInstallPrompt: null,

  /**
   * Inisialisasi Aplikasi Saat Halaman Selesai Dimuat
   */
  async init() {
    console.log('Menginisialisasi Presensi Online Perguruan Islam NIBRAS...');

    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupGlobalEvents();
    this.checkApiEndpointConfig();

    // Inisialisasi Sesi Pengguna
    await AuthService.initSession();
  },

  /**
   * Registrasi Service Worker PWA & Auto-Update
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then(reg => {
            console.log('[SW] Service Worker terdaftar. Scope:', reg.scope);
            // Paksa pengecekan versi baru dari server
            reg.update();
          })
          .catch(err => {
            console.warn('[SW] Pendaftaran Service Worker gagal:', err);
          });
      });
    }
  },

  /**
   * Penanganan Prompt Install PWA (A2HS - Add to Home Screen)
   */
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      this.deferredInstallPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Aplikasi berhasil diinstal ke Homescreen.');
      this.deferredInstallPrompt = null;
      this.showToast('Aplikasi berhasil dipasang di layar utama HP Anda!', 'success');
    });
  },

  /**
   * Memicu Install PWA saat tombol diklik
   */
  triggerInstall() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      this.deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] Pengguna menerima instalasi.');
        } else {
          console.log('[PWA] Pengguna menolak instalasi.');
        }
        this.deferredInstallPrompt = null;
      });
    } else {
      // Petunjuk untuk iOS Safari
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIos) {
        alert('Untuk menginstal di iPhone/iPad:\n1. Tekan tombol Bagikan (Share) di Safari.\n2. Pilih "Tambah ke Layar Utama" (Add to Home Screen).');
      } else {
        alert('Gunakan menu browser (titik tiga di kanan atas) dan pilih "Tambahkan ke Layar Utama" atau "Instal Aplikasi".');
      }
    }
  },

  /**
   * Memeriksa Apakah Pengguna Perlu Mengonfigurasi URL Endpoint GAS
   */
  checkApiEndpointConfig() {
    const configBtn = document.getElementById('btn-open-endpoint-config');
    if (configBtn) {
      configBtn.addEventListener('click', () => this.openEndpointModal());
    }
  },

  openEndpointModal() {
    const modal = document.getElementById('modal-endpoint-config');
    const input = document.getElementById('input-custom-endpoint');
    if (input) input.value = localStorage.getItem(CONFIG.STORAGE_KEY_API_URL) || '';
    if (modal) modal.style.display = 'flex';
  },

  saveCustomEndpoint() {
    const input = document.getElementById('input-custom-endpoint');
    const val = input ? input.value.trim() : '';

    if (val && !val.startsWith('https://script.google.com/')) {
      this.showToast('URL harus diawali dengan https://script.google.com/...', 'warning');
      return;
    }

    CONFIG.setApiUrl(val);
    document.getElementById('modal-endpoint-config').style.display = 'none';
    this.showToast('URL Google Apps Script berhasil disimpan.', 'success');
  },

  resetCustomEndpoint() {
    CONFIG.setApiUrl('');
    document.getElementById('modal-endpoint-config').style.display = 'none';
    this.showToast('URL dikembalikan ke setelan awal.', 'info');
  },

  /**
   * Event Listener Global
   */
  setupGlobalEvents() {
    // Form Login Submit
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        AuthService.handleLogin(u, p);
      });
    }

    // Tombol Toggle Password
    const togglePass = document.getElementById('toggle-password');
    if (togglePass) {
      togglePass.addEventListener('click', () => {
        const passInput = document.getElementById('login-password');
        const isText = passInput.type === 'text';
        passInput.type = isText ? 'password' : 'text';
        togglePass.textContent = isText ? '👁️' : '🙈';
      });
    }

    // Tombol Logout Guru
    const btnLogoutGuru = document.getElementById('btn-logout-guru');
    if (btnLogoutGuru) {
      btnLogoutGuru.addEventListener('click', () => AuthService.handleLogout());
    }

    // Tombol Logout Admin
    const btnLogoutAdmin = document.getElementById('btn-logout-admin');
    if (btnLogoutAdmin) {
      btnLogoutAdmin.addEventListener('click', () => AuthService.handleLogout());
    }

    // Form Ubah Password Guru
    const formChangePass = document.getElementById('form-change-password');
    if (formChangePass) {
      formChangePass.addEventListener('submit', (e) => GuruModule.handleChangePassword(e));
    }

    // Event Kamera Masuk
    const btnCaptureMasuk = document.getElementById('btn-capture-masuk');
    if (btnCaptureMasuk) {
      btnCaptureMasuk.addEventListener('click', () => GuruModule.captureSelfie('masuk'));
    }
    const btnRetakeMasuk = document.getElementById('btn-retake-masuk');
    if (btnRetakeMasuk) {
      btnRetakeMasuk.addEventListener('click', () => GuruModule.retakeSelfie('masuk'));
    }
    const btnSubmitMasuk = document.getElementById('btn-submit-masuk');
    if (btnSubmitMasuk) {
      btnSubmitMasuk.addEventListener('click', () => GuruModule.submitAttendance('MASUK'));
    }

    // File Input Fallback Masuk
    const fileInputMasuk = document.getElementById('file-fallback-masuk');
    if (fileInputMasuk) {
      fileInputMasuk.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          App.showLoading(true, 'Memproses foto...');
          try {
            const base64 = await CameraService.processFileInput(e.target.files[0]);
            App.showLoading(false);
            const elPreview = document.getElementById('photo-preview-masuk');
            const elVideo = document.getElementById('video-stream-masuk');
            if (elPreview) {
              elPreview.src = base64;
              elPreview.style.display = 'block';
            }
            if (elVideo) elVideo.style.display = 'none';
            GuruModule.evaluateSubmitButton('masuk');
            App.showToast('Foto berhasil dimuat.', 'success');
          } catch (err) {
            App.showLoading(false);
            App.showToast(err.message, 'danger');
          }
        }
      });
    }

    // Event Kamera Pulang
    const btnCapturePulang = document.getElementById('btn-capture-pulang');
    if (btnCapturePulang) {
      btnCapturePulang.addEventListener('click', () => GuruModule.captureSelfie('pulang'));
    }
    const btnRetakePulang = document.getElementById('btn-retake-pulang');
    if (btnRetakePulang) {
      btnRetakePulang.addEventListener('click', () => GuruModule.retakeSelfie('pulang'));
    }
    const btnSubmitPulang = document.getElementById('btn-submit-pulang');
    if (btnSubmitPulang) {
      btnSubmitPulang.addEventListener('click', () => GuruModule.submitAttendance('PULANG'));
    }

    // File Input Fallback Pulang
    const fileInputPulang = document.getElementById('file-fallback-pulang');
    if (fileInputPulang) {
      fileInputPulang.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          App.showLoading(true, 'Memproses foto...');
          try {
            const base64 = await CameraService.processFileInput(e.target.files[0]);
            App.showLoading(false);
            const elPreview = document.getElementById('photo-preview-pulang');
            const elVideo = document.getElementById('video-stream-pulang');
            if (elPreview) {
              elPreview.src = base64;
              elPreview.style.display = 'block';
            }
            if (elVideo) elVideo.style.display = 'none';
            GuruModule.evaluateSubmitButton('pulang');
            App.showToast('Foto berhasil dimuat.', 'success');
          } catch (err) {
            App.showLoading(false);
            App.showToast(err.message, 'danger');
          }
        }
      });
    }

    // Filter Riwayat Guru
    const selFilterMonth = document.getElementById('filter-history-month');
    const selFilterYear = document.getElementById('filter-history-year');
    if (selFilterMonth) selFilterMonth.addEventListener('change', () => {
      GuruModule.loadAttendanceHistory();
      GuruModule.loadMonthlyRecap();
    });
    if (selFilterYear) selFilterYear.addEventListener('change', () => {
      GuruModule.loadAttendanceHistory();
      GuruModule.loadMonthlyRecap();
    });

    // Event Admin Form Guru
    const formGuru = document.getElementById('form-guru');
    if (formGuru) {
      formGuru.addEventListener('submit', (e) => AdminModule.handleSaveGuru(e));
    }

    // Event Admin Form Sekolah
    const formSekolah = document.getElementById('form-sekolah');
    if (formSekolah) {
      formSekolah.addEventListener('submit', (e) => AdminModule.handleSaveSekolah(e));
    }

    // Event Admin Form Pengaturan
    const formSettings = document.getElementById('form-settings');
    if (formSettings) {
      formSettings.addEventListener('submit', (e) => AdminModule.handleSaveSettings(e));
    }

    // Filter Absensi Admin
    ['filter-admin-tanggal', 'filter-admin-sekolah', 'filter-admin-jenis'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => AdminModule.loadAttendanceRecords());
    });
    const searchAdmin = document.getElementById('filter-admin-search');
    if (searchAdmin) {
      searchAdmin.addEventListener('input', () => {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => AdminModule.loadAttendanceRecords(), 400);
      });
    }

    // Tutup Modal ketika tombol close atau backdrop diklik
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.style.display = 'none';
      });
    });
  },

  /**
   * Menampilkan / Menyembunyikan Loading Overlay
   */
  showLoading(show, message = 'Memuat...') {
    const loadingEl = document.getElementById('global-loading');
    const textEl = document.getElementById('global-loading-text');
    if (!loadingEl) return;

    if (show) {
      if (textEl) textEl.textContent = message;
      loadingEl.style.display = 'flex';
    } else {
      loadingEl.style.display = 'none';
    }
  },

  /**
   * Menampilkan Notifikasi Toast
   */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-slide-in`;

    const icon = type === 'success' ? '✓' : type === 'danger' ? '✕' : type === 'warning' ? '⚠️' : 'ℹ️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('toast-slide-in');
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }
};

// Bootstrap saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

