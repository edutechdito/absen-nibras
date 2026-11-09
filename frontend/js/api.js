/**
 * API CLIENT LAYER
 * Komunikasi dengan Google Apps Script Web App Endpoint
 */

const Api = {
  /**
   * Mengirim request ke Backend Google Apps Script
   */
  async request(payload) {
    const apiUrl = CONFIG.getApiUrl();

    // Deteksi jika API URL masih default placeholder
    if (!apiUrl || apiUrl.includes('YOUR_SCRIPT_ID')) {
      console.warn('[API] API URL belum diisi. Masuk ke Mode Demo / Simulasi Lokal.');
      return this.handleMockFallback(payload);
    }

    try {
      // Gunakan Content-Type 'text/plain;charset=utf-8' untuk menghindari CORS Preflight OPTIONS
      // yang sering gagal pada Google Apps Script Web App
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 detik timeout

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      return json;

    } catch (error) {
      console.error('[API Error]:', error);
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Koneksi ke server timeout (lebih dari 20 detik). Periksa sinyal internet Anda.'
        };
      }
      return {
        success: false,
        message: 'Gagal menghubungi server: ' + (error.message || 'Periksa koneksi internet.')
      };
    }
  },

  // -------------------------------------------------------------
  // AUTENTIKASI
  // -------------------------------------------------------------
  async login(username, password) {
    return await this.request({
      action: 'login',
      username,
      password
    });
  },

  async logout(token) {
    return await this.request({
      action: 'logout',
      token
    });
  },

  async validateSession(token) {
    return await this.request({
      action: 'validate_session',
      token
    });
  },

  async changePassword(token, oldPassword, newPassword) {
    return await this.request({
      action: 'change_password',
      token,
      old_password: oldPassword,
      new_password: newPassword
    });
  },

  // -------------------------------------------------------------
  // PRESENSI GURU
  // -------------------------------------------------------------
  async submitAttendance(attendanceData) {
    // attendanceData: { token, jenis, latitude, longitude, accuracy, foto_base64, keterangan }
    return await this.request({
      action: 'submit_attendance',
      ...attendanceData
    });
  },

  async getTodayStatus(token) {
    return await this.request({
      action: 'get_today_status',
      token
    });
  },

  async getGuruHistory(token, month, year) {
    return await this.request({
      action: 'get_guru_history',
      token,
      month,
      year
    });
  },

  async getGuruRecap(token, month, year) {
    return await this.request({
      action: 'get_guru_recap',
      token,
      month,
      year
    });
  },

  // -------------------------------------------------------------
  // ADMINISTRATOR
  // -------------------------------------------------------------
  async getAdminStats(token) {
    return await this.request({
      action: 'admin_dashboard_stats',
      token
    });
  },

  async getAdminAttendanceRecords(token, filters) {
    return await this.request({
      action: 'admin_attendance_records',
      token,
      filters
    });
  },

  async crudGuru(token, subAction, data) {
    return await this.request({
      action: 'admin_crud_guru',
      token,
      subAction,
      data
    });
  },

  async crudSekolah(token, subAction, data) {
    return await this.request({
      action: 'admin_crud_sekolah',
      token,
      subAction,
      data
    });
  },

  async getAdminSettings(token) {
    return await this.request({
      action: 'admin_get_settings',
      token
    });
  },

  async updateAdminSettings(token, settings) {
    return await this.request({
      action: 'admin_update_settings',
      token,
      settings
    });
  },

  async resetUserPassword(token, userId, newPassword) {
    return await this.request({
      action: 'admin_reset_password',
      token,
      user_id: userId,
      new_password: newPassword
    });
  },

  async getAdminLogs(token, limit) {
    return await this.request({
      action: 'admin_audit_logs',
      token,
      limit
    });
  },

  // -------------------------------------------------------------
  // MOCK FALLBACK (UNTUK DEMO KETIKA GOOGLE APPS SCRIPT BELUM DI-DEPLOY)
  // -------------------------------------------------------------
  handleMockFallback(payload) {
    const action = payload.action;

    // Mock Login
    if (action === 'login') {
      const u = String(payload.username).toLowerCase().trim();
      if (u === 'admin' && payload.password === 'admin123') {
        return {
          success: true,
          token: 'demo_admin_token_' + Date.now(),
          user: {
            user_id: 'USR-ADMIN',
            username: 'admin',
            role: 'admin',
            nama_lengkap: 'Administrator NIBRAS',
            jabatan: 'Sistem Administrator IT'
          }
        };
      }
      if ((u === '202401001' || u === 'guru') && payload.password === 'guru123') {
        return {
          success: true,
          token: 'demo_guru_token_' + Date.now(),
          user: {
            user_id: 'USR-GUR001',
            username: '202401001',
            role: 'guru',
            ref_id: 'GUR001',
            nama_lengkap: 'Ustadz Ahmad Fauzi, S.Pd.I',
            niy: '202401001',
            tempat_lahir: 'Padang',
            tanggal_lahir: '1990-05-14',
            jabatan: 'Guru PAI & Wali Kelas VII',
            sekolah_id: 'SCH001',
            nama_sekolah: 'Perguruan Islam NIBRAS (Kampus Pusat)',
            alamat_sekolah: 'Jl. Khatib Sulaiman No. 45, Padang',
            sekolah_lat: -0.923456,
            sekolah_lng: 100.367890,
            sekolah_radius: 60,
            no_hp: '08126789001',
            email: 'ahmad.fauzi@nibras.sch.id'
          }
        };
      }
      return { success: false, message: 'Username atau password tidak sesuai (Gunakan: admin/admin123 atau guru/guru123)' };
    }

    if (action === 'get_today_status') {
      const today = new Date().toISOString().split('T')[0];
      return {
        success: true,
        serverDate: today,
        serverTime: new Date().toTimeString().split(' ')[0],
        sudahMasuk: false,
        sudahPulang: false
      };
    }

    if (action === 'submit_attendance') {
      const now = new Date();
      return {
        success: true,
        message: 'Presensi ' + payload.jenis + ' berhasil dicatat (Mode Demo)!',
        data: {
          absen_id: 'ABS-DEMO-' + Date.now().toString(36),
          jenis: payload.jenis,
          tanggal: now.toISOString().split('T')[0],
          jam_server: now.toTimeString().split(' ')[0],
          jarak_meter: 15.2,
          radius_sekolah: 60,
          status_kehadiran: 'Tepat Waktu',
          nama_guru: 'Ustadz Ahmad Fauzi, S.Pd.I',
          nama_sekolah: 'Perguruan Islam NIBRAS (Kampus Pusat)'
        }
      };
    }

    if (action === 'admin_dashboard_stats') {
      return {
        success: true,
        serverDate: new Date().toISOString().split('T')[0],
        serverTime: new Date().toTimeString().split(' ')[0],
        stats: {
          totalGuru: 28,
          totalSekolah: 3,
          hadirHariIni: 24,
          tepatWaktuHariIni: 21,
          terlambatHariIni: 3,
          belumHadirHariIni: 4,
          pulangHariIni: 18
        }
      };
    }

    if (action === 'admin_crud_guru' && payload.subAction === 'LIST') {
      return {
        success: true,
        data: [
          { guru_id: 'GUR001', niy: '202401001', nama_lengkap: 'Ustadz Ahmad Fauzi, S.Pd.I', jabatan: 'Guru PAI & Wali Kelas VII', sekolah_id: 'SCH001', status: 'aktif' },
          { guru_id: 'GUR002', niy: '202401002', nama_lengkap: 'Ustadzah Siti Rahmah, M.Pd', jabatan: 'Guru Bahasa Arab & Tahfidz', sekolah_id: 'SCH001', status: 'aktif' },
          { guru_id: 'GUR003', niy: '202402001', nama_lengkap: 'Muhammad Ridwan, S.Kom', jabatan: 'Tenaga Kependidikan / IT Staff', sekolah_id: 'SCH002', status: 'aktif' }
        ]
      };
    }

    if (action === 'admin_crud_sekolah' && payload.subAction === 'LIST') {
      return {
        success: true,
        data: [
          { sekolah_id: 'SCH001', nama_sekolah: 'Perguruan Islam NIBRAS (Kampus Pusat)', alamat: 'Jl. Khatib Sulaiman No. 45, Padang', latitude: -0.923456, longitude: 100.367890, radius_meter: 60, status: 'aktif' },
          { sekolah_id: 'SCH002', nama_sekolah: 'SD Islam Nibras Padang', alamat: 'Jl. Belanti Raya No. 12, Lolong Belanti, Padang', latitude: -0.915234, longitude: 100.354120, radius_meter: 50, status: 'aktif' },
          { sekolah_id: 'SCH003', nama_sekolah: 'SMP Islam Nibras Islamic Boarding School', alamat: 'Jl. Raya Lubuk Minturun KM 8, Padang', latitude: -0.845612, longitude: 100.378901, radius_meter: 80, status: 'aktif' }
        ]
      };
    }

    return { success: true, message: 'Operasi demo berhasil' };
  }
};

