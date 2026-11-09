/**
 * AUTHENTICATION & SESSION CONTROLLER
 * Menangani login, logout, penyimpanan token, pemilihan portal, dan pergantian tampilan antarmuka
 */

const AuthService = {
  currentPortalRole: 'guru',

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
    const headerLogout = document.getElementById('header-logout-btn');

    if (viewLanding) viewLanding.style.display = 'block';
    if (viewLogin) viewLogin.style.display = 'none';
    if (viewGuru) viewGuru.style.display = 'none';
    if (viewAdmin) viewAdmin.style.display = 'none';
    if (navGuru) navGuru.style.display = 'none';
    if (headerLogout) headerLogout.style.display = 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Membuka Form Login Berdasarkan Portal yang Dipilih (Pegawai / Admin)
   */
  openLoginPortal(role) {
    this.currentPortalRole = role || 'guru';

    const viewLanding = document.getElementById('view-landing');
    const viewLogin = document.getElementById('view-login');
    const viewGuru = document.getElementById('view-guru');
    const viewAdmin = document.getElementById('view-admin');
    const navGuru = document.getElementById('nav-guru-bottom');
    const headerLogout = document.getElementById('header-logout-btn');

    if (viewLanding) viewLanding.style.display = 'none';
    if (viewGuru) viewGuru.style.display = 'none';
    if (viewAdmin) viewAdmin.style.display = 'none';
    if (navGuru) navGuru.style.display = 'none';
    if (headerLogout) headerLogout.style.display = 'none';
    if (viewLogin) viewLogin.style.display = 'flex';

    const roleBadgeEl = document.getElementById('login-role-badge');
    const titleEl = document.getElementById('login-title');
    const subtitleEl = document.getElementById('login-subtitle');
    const labelUserEl = document.getElementById('label-login-username');
    const inputUserEl = document.getElementById('login-username');
    const passGroupEl = document.getElementById('form-group-password');
    const inputPassEl = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-submit-login');
    const hintTextEl = document.getElementById('login-hint-text');

    if (inputPassEl) inputPassEl.value = '';

    if (this.currentPortalRole === 'admin') {
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
      if (passGroupEl) passGroupEl.style.display = 'block';
      if (inputPassEl) inputPassEl.required = true;
      if (hintTextEl) hintTextEl.style.display = 'none';
      if (submitBtn) {
        submitBtn.innerHTML = '<span>Masuk Administrator</span><span class="btn-arrow">→</span>';
        submitBtn.style.background = 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)';
        submitBtn.style.borderColor = '#7C3AED';
      }
    } else {
      if (roleBadgeEl) {
        roleBadgeEl.textContent = '👨‍🏫 Portal Masuk Pegawai (Guru & GTK)';
        roleBadgeEl.className = 'login-portal-badge portal-badge-guru';
      }
      if (titleEl) titleEl.textContent = 'Masuk Portal Pegawai';
      if (subtitleEl) subtitleEl.textContent = 'Silakan masukkan Nomor Induk Yayasan (NIY) Anda';
      if (labelUserEl) labelUserEl.textContent = 'Nomor Induk Yayasan (NIY)';
      if (inputUserEl) {
        inputUserEl.placeholder = 'Masukkan NIY (Contoh: 202401001)';
        inputUserEl.value = '';
      }
      if (passGroupEl) passGroupEl.style.display = 'none';
      if (inputPassEl) inputPassEl.required = false;
      if (hintTextEl) hintTextEl.style.display = 'block';
      if (submitBtn) {
        submitBtn.innerHTML = '<span>Masuk ke Dashboard</span><span class="btn-arrow">→</span>';
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
    if (!username) {
      const msg = this.currentPortalRole === 'guru' ? 'Harap masukkan Nomor Induk Yayasan (NIY).' : 'Harap masukkan username.';
      App.showToast(msg, 'warning');
      return false;
    }

    // Default password guru123 jika diakses melalui portal Pegawai tanpa input password
    let passToSend = password;
    if (this.currentPortalRole === 'guru' && (!passToSend || passToSend.trim() === '')) {
      passToSend = 'guru123';
    }

    if (this.currentPortalRole === 'admin' && (!passToSend || passToSend.trim() === '')) {
      App.showToast('Harap masukkan password administrator.', 'warning');
      return false;
    }

    App.showLoading(true, 'Memverifikasi kredensial...');

    try {
      const res = await Api.login(username, passToSend);
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
        App.showToast(res.message || 'NIY atau kredensial tidak sesuai.', 'danger');
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
    const headerLogout = document.getElementById('header-logout-btn');

    if (viewLanding) viewLanding.style.display = 'none';
    if (viewLogin) viewLogin.style.display = 'none';
    if (headerLogout) headerLogout.style.display = 'inline-flex';

    if (AppState.user && AppState.user.role === 'admin') {
      document.getElementById('view-guru').style.display = 'none';
      if (document.getElementById('nav-guru-bottom')) document.getElementById('nav-guru-bottom').style.display = 'none';
      document.getElementById('view-admin').style.display = 'block';
      AdminModule.init();
    } else {
      document.getElementById('view-admin').style.display = 'none';
      document.getElementById('view-guru').style.display = 'block';
      if (document.getElementById('nav-guru-bottom')) {
        document.getElementById('nav-guru-bottom').style.display = window.innerWidth <= 768 ? 'flex' : 'none';
      }
      GuruModule.init();
    }
  }
};
