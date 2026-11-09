/**
 * AUTHENTICATION & SESSION CONTROLLER
 * Menangani login, logout, penyimpanan token, dan pergantian tampilan antarmuka
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

    this.showLoginView();
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
        this.showLoginView();
        App.showToast('Sesi Anda telah kedaluwarsa. Silakan login kembali.', 'warning');
      }
    } catch (e) {
      // Abaikan jika offline, biarkan user tetap di tampilan lokal
    }
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
      this.showLoginView();
      App.showToast('Anda telah keluar dari aplikasi.', 'info');
    }
  },

  /**
   * Menampilkan Tampilan Login
   */
  showLoginView() {
    document.getElementById('view-login').style.display = 'block';
    document.getElementById('view-guru').style.display = 'none';
    document.getElementById('view-admin').style.display = 'none';
    document.getElementById('nav-guru-bottom').style.display = 'none';

    // Reset Form Login
    const form = document.getElementById('form-login');
    if (form) form.reset();
  },

  /**
   * Mengarahkan Tampilan Berdasarkan Peran Pengguna (Guru / Admin)
   */
  routeUserView() {
    document.getElementById('view-login').style.display = 'none';

    if (AppState.user.role === 'admin') {
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

