/**
 * AUTHENTICATION & SESSION CONTROLLER
 * Menangani login, logout, penyimpanan token, pemilihan portal, dan pergantian tampilan antarmuka
 */

const AuthService = {
  /**
   * Inisialisasi Sesi Saat Aplikasi Dibuka
   */
  async initSession() {
    const savedToken = localStorage.getItem(CONFIG.STORAGE_KEY_TOKEN);
    const savedUserJson = localStorage.getItem(CONFIG.STORAGE_KEY_USER);

    if (savedToken && savedUserJson) {
      try {
        const user = JSON.parse(savedUserJson);
        AppState.token = savedToken;
        AppState.user = user;
        AppState.isAuthenticated = true;
        AppState.updateTargetSchoolFromUser();

        // Tampilkan antarmuka sesuai role
        this.routeUserView();

        // Validasi token di latar belakang
        this.verifyTokenInBackground(savedToken);
        return;
      } catch (e) {
        console.warn('Gagal membaca sesi lokal:', e);
        AppState.clearSession();
      }
    }

    // Default ke Halaman Awal / Landing Page (Sesuai Referensi Desain)
    this.showLandingView();
  },

  /**
   * Verifikasi Token ke Server secara background
   */
  async verifyTokenInBackground(token) {
    try {
      const res = await Api.validateSession(token);
      if (!res.success) {
        console.warn('Sesi server kadaluarsa.');
        AppState.clearSession();
        this.showLandingView();
        App.showToast('Sesi Anda telah kedaluwarsa. Silakan masuk kembali.', 'warning');
      }
    } catch (e) {
      // Abaikan jika offline, biarkan user tetap di tampilan lokal
    }
  },

  /**
   * Menampilkan Halaman Awal / Landing Portal (Pilihan Pegawai vs Admin)
   */
  showLandingView() {
    const viewLanding = document.getElementById('view-landing');
    const viewLogin = document.getElementById('view-login');
    const viewGuru = document.getElementById('view-guru');
    const viewAdmin = document.getElementById('view-admin');
    const navGuru = document.getElementById('nav-guru-bottom');

    if (viewLanding) viewLanding.style.display = 'block';
    if (viewLogin) viewLogin.style.display = 'none';
    if (viewGuru) viewGuru.style.display = 'none';
    if (viewAdmin) viewAdmin.style.display = 'none';
    if (navGuru) navGuru.style.display = 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Membuka Form Login Berdasarkan Portal yang Dipilih (Pegawai / Admin)
   */
  openLoginPortal(role) {
    const viewLanding = document.getElementById('view-landing');
    const viewLogin = document.getElementById('view-login');
    const viewGuru = document.getElementById('view-guru');
    const viewAdmin = document.getElementById('view-admin');
    const navGuru = document.getElementById('nav-guru-bottom');

    if (viewLanding) viewLanding.style.display = 'none';
    if (viewGuru) viewGuru.style.display = 'none';
    if (viewAdmin) viewAdmin.style.display = 'none';
    if (navGuru) navGuru.style.display = 'none';
    if (viewLogin) viewLogin.style.display = 'flex';

    const roleBadgeEl = document.getElementById('login-role-badge');
    const titleEl = document.getElementById('login-title');
    const subtitleEl = document.getElementById('login-subtitle');
    const labelUserEl = document.getElementById('label-login-username');
    const inputUserEl = document.getElementById('login-username');
    const inputPassEl = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-submit-login');

    if (inputPassEl) inputPassEl.value = '';

    if (role === 'admin') {
      if (roleBadgeEl) {
        roleBadgeEl.textContent = '🛡️ Portal Masuk Administrator';
        roleBadgeEl.className = 'login-portal-badge portal-badge-admin';
      }
      if (titleEl) titleEl.textContent = 'Masuk Administrator';
      if (subtitleEl) subtitleEl.textContent = 'Pengelolaan Data & Laporan Absensi';
      if (labelUserEl) labelUserEl.textContent = 'Username Admin';
      if (inputUserEl) {
        inputUserEl.placeholder = 'Masukkan username administrator';
        inputUserEl.value = '';
      }
      if (submitBtn) {
        submitBtn.style.background = 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)';
        submitBtn.style.borderColor = '#7C3AED';
      }
    } else {
      if (roleBadgeEl) {
        roleBadgeEl.textContent = '👨‍🏫 Portal Masuk Pegawai (Guru & GTK)';
        roleBadgeEl.className = 'login-portal-badge portal-badge-guru';
      }
      if (titleEl) titleEl.textContent = 'Masuk Pegawai / Guru';
      if (subtitleEl) subtitleEl.textContent = 'Presensi Guru & Tenaga Kependidikan';
      if (labelUserEl) labelUserEl.textContent = 'Username / NIY';
      if (inputUserEl) {
        inputUserEl.placeholder = 'Masukkan NIY atau Username';
        inputUserEl.value = '';
      }
      if (submitBtn) {
        submitBtn.style.background = 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)';
        submitBtn.style.borderColor = '#0284C7';
      }
    }

    setTimeout(() => {
      if (inputUserEl) inputUserEl.focus();
    }, 120);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Menampilkan Tampilan Login Default
   */
  showLoginView() {
    this.openLoginPortal('guru');
  },

  /**
   * Melakukan Login Pengguna
   */
  async handleLogin(username, password) {
    if (!username || !password) {
      App.showToast('Harap masukkan username dan password.', 'warning');
      return false;
    }

    App.showLoading(true, 'Memverifikasi kredensial...');

    try {
      const res = await Api.login(username, password);
      App.showLoading(false);

      if (res.success && res.token && res.user) {
        AppState.token = res.token;
        AppState.user = res.user;
        AppState.isAuthenticated = true;
        AppState.updateTargetSchoolFromUser();

        // Simpan ke localStorage
        localStorage.setItem(CONFIG.STORAGE_KEY_TOKEN, res.token);
        localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(res.user));

        App.showToast('Selamat datang, ' + (res.user.nama_lengkap || res.user.username) + '!', 'success');
        this.routeUserView();
        return true;
      } else {
        App.showToast(res.message || 'Login gagal. Periksa username dan password Anda.', 'danger');
        return false;
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Gagal terhubung ke server: ' + err.message, 'danger');
      return false;
    }
  },

  /**
   * Melakukan Logout
   */
  async handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
      App.showLoading(true, 'Sedang keluar...');
      try {
        if (AppState.token) {
          await Api.logout(AppState.token);
        }
      } catch (e) {}

      GpsService.stopWatching();
      CameraService.stopCamera();
      AppState.clearSession();
      App.showLoading(false);
      this.showLandingView();
      App.showToast('Anda telah keluar dari aplikasi.', 'info');
    }
  },

  /**
   * Mengarahkan Tampilan Berdasarkan Peran Pengguna (Guru / Admin)
   */
  routeUserView() {
    const viewLanding = document.getElementById('view-landing');
    const viewLogin = document.getElementById('view-login');

    if (viewLanding) viewLanding.style.display = 'none';
    if (viewLogin) viewLogin.style.display = 'none';

    if (AppState.user && AppState.user.role === 'admin') {
      document.getElementById('view-guru').style.display = 'none';
      document.getElementById('nav-guru-bottom').style.display = 'none';
      document.getElementById('view-admin').style.display = 'block';
      AdminModule.init();
    } else {
      document.getElementById('view-admin').style.display = 'none';
      document.getElementById('view-guru').style.display = 'block';
      document.getElementById('nav-guru-bottom').style.display = 'flex';
      GuruModule.init();
    }
  }
};
