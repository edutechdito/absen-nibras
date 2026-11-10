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

  async loginByNiy(niy) {
    return await this.request({
      action: 'login_niy',
      niy: String(niy).trim()
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
  // SHARED LOCAL STORE (Sinkronisasi Pegawai & Admin saat Offline / Sebelum GAS Terhubung)
  // -------------------------------------------------------------
  SHARED_STORAGE_KEY: 'nibras_shared_store_v2',

  getSharedStore() {
    try {
      const raw = localStorage.getItem(this.SHARED_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    const today = new Date().toISOString().split('T')[0];
    const initial = {
      teachers: [
        { guru_id: 'GUR001', niy: '202401001', nama_lengkap: 'Ustadz Ahmad Fauzi, S.Pd.I', jabatan: 'Guru PAI & Wali Kelas VII', sekolah_id: 'SCH001', status: 'aktif', no_hp: '08126789001' },
        { guru_id: 'GUR002', niy: '202401002', nama_lengkap: 'Ustadzah Siti Rahmah, M.Pd', jabatan: 'Guru Bahasa Arab & Tahfidz', sekolah_id: 'SCH001', status: 'aktif', no_hp: '08126789002' },
        { guru_id: 'GUR003', niy: '202402001', nama_lengkap: 'Muhammad Ridwan, S.Kom', jabatan: 'Tenaga Kependidikan / IT Staff', sekolah_id: 'SCH002', status: 'aktif', no_hp: '08126789003' },
        { guru_id: 'GUR004', niy: '202401003', nama_lengkap: 'Dito Jurinaldo, S.Kom', jabatan: 'Operator IT & GTK', sekolah_id: 'SCH001', status: 'aktif', no_hp: '08126789004' }
      ],
      attendances: [
        {
          absen_id: 'ABS-INIT-1',
          guru_id: 'GUR001',
          niy: '202401001',
          nama_guru: 'Ustadz Ahmad Fauzi, S.Pd.I',
          tanggal: today,
          jam_server: '07:15:22',
          jenis: 'MASUK',
          status_kehadiran: 'Tepat Waktu',
          lokasi: '-0.9247, 100.3603',
          jarak_meter: 12.5,
          sekolah_id: 'SCH001',
          nama_sekolah: 'Perguruan Islam NIBRAS'
        },
        {
          absen_id: 'ABS-INIT-2',
          guru_id: 'GUR002',
          niy: '202401002',
          nama_guru: 'Ustadzah Siti Rahmah, M.Pd',
          tanggal: today,
          jam_server: '07:22:10',
          jenis: 'MASUK',
          status_kehadiran: 'Tepat Waktu',
          lokasi: '-0.9247, 100.3603',
          jarak_meter: 18.0,
          sekolah_id: 'SCH001',
          nama_sekolah: 'Perguruan Islam NIBRAS'
        }
      ]
    };
    try {
      localStorage.setItem(this.SHARED_STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {}
    return initial;
  },

  saveSharedStore(store) {
    try {
      localStorage.setItem(this.SHARED_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {}
  },

  // -------------------------------------------------------------
  // MOCK FALLBACK (UNTUK SINKRONISASI LENGKAP KETIKA SPREADSHEET BELUM AKTIF)
  // -------------------------------------------------------------
  handleMockFallback(payload) {
    const action = payload.action;
    const store = this.getSharedStore();
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().split(' ')[0];

    // 1. Mock Login Pegawai by NIY
    if (action === 'login_niy') {
      const niy = String(payload.niy || '').trim();
      if (!niy) {
        return { success: false, message: 'Harap masukkan Nomor Induk Yayasan (NIY).' };
      }

      // Cari atau daftarkan otomatis guru ini ke store agar sinkron dengan Admin
      let teacher = store.teachers.find(t => String(t.niy) === niy);
      if (!teacher) {
        teacher = {
          guru_id: 'GUR-' + niy,
          niy: niy,
          nama_lengkap: niy === '202401001' ? 'Ustadz Ahmad Fauzi, S.Pd.I' : 'Pegawai NIBRAS (' + niy + ')',
          jabatan: 'Tenaga Pendidik / GTK',
          sekolah_id: 'SCH001',
          nama_sekolah: 'Perguruan Islam NIBRAS',
          status: 'aktif'
        };
        store.teachers.push(teacher);
        this.saveSharedStore(store);
      }

      return {
        success: true,
        token: 'demo_guru_token_' + Date.now(),
        user: {
          user_id: 'USR-' + niy,
          username: niy,
          role: 'guru',
          ref_id: teacher.guru_id,
          nama_lengkap: teacher.nama_lengkap,
          niy: teacher.niy,
          tempat_lahir: 'Padang',
          tanggal_lahir: '1995-11-11',
          jabatan: teacher.jabatan,
          sekolah_id: 'SCH001',
          nama_sekolah: 'Perguruan Islam NIBRAS',
          alamat_sekolah: 'Jl. Khatib Sulaiman No. 45, Padang',
          sekolah_lat: -0.9247,
          sekolah_lng: 100.3603,
          sekolah_radius: 60,
          no_hp: teacher.no_hp || '08126789001',
          email: `${niy}@nibras.sch.id`
        }
      };
    }

    // 2. Mock Login Admin (SINGKRON: Menerima Username & Password apa pun tanpa memblokir!)
    if (action === 'login') {
      const u = String(payload.username || '').trim();
      const p = String(payload.password || '').trim();

      if (!u || !p) {
        return { success: false, message: 'Harap masukkan username dan password administrator.' };
      }

      // Selalu izinkan Admin masuk dan simpan profilnya agar singkron seperti Pegawai
      const displayName = u.toLowerCase() === 'admin' ? 'Administrator NIBRAS' : ('Administrator ' + u);
      return {
        success: true,
        token: 'demo_admin_token_' + Date.now(),
        user: {
          user_id: 'USR-' + u.toUpperCase(),
          username: u,
          role: 'admin',
          nama_lengkap: displayName,
          jabatan: 'Pengelola Presensi'
        }
      };
    }

    // 3. Status Presensi Hari Ini (Singkron membaca data absensi nyata yang sudah diinput)
    if (action === 'get_today_status') {
      const userNiy = payload.niy || (AppState.user ? AppState.user.niy : null);
      const userRecords = store.attendances.filter(a => a.tanggal === today && (a.niy === userNiy || a.guru_id === payload.guru_id));
      const masukRec = userRecords.find(a => a.jenis === 'MASUK');
      const pulangRec = userRecords.find(a => a.jenis === 'PULANG');

      return {
        success: true,
        serverDate: today,
        serverTime: nowTime,
        sudahMasuk: !!masukRec,
        jamMasuk: masukRec ? masukRec.jam_server : null,
        sudahPulang: !!pulangRec,
        jamPulang: pulangRec ? pulangRec.jam_server : null
      };
    }

    // 4. Submit Presensi dari Pegawai (SINGKRON: Otomatis masuk ke antrean Admin!)
    if (action === 'submit_attendance') {
      const jenis = String(payload.jenis || 'MASUK').toUpperCase();
      const userNiy = payload.niy || (AppState.user ? AppState.user.niy : '202401001');
      const namaGuru = payload.nama_guru || (AppState.user ? AppState.user.nama_lengkap : 'Pegawai NIBRAS');

      // Tentukan status kehadiran otomatis berdasarkan jam
      const now = new Date();
      let statusKehadiran = 'Tepat Waktu';
      if (jenis === 'MASUK') {
        const hour = now.getHours();
        const min = now.getMinutes();
        if (hour > 7 || (hour === 7 && min > 15)) {
          statusKehadiran = 'Terlambat Masuk';
        }
      } else {
        statusKehadiran = 'Pulang Normal';
      }

      const newRecord = {
        absen_id: 'ABS-' + Date.now().toString(36).toUpperCase(),
        guru_id: payload.guru_id || ('GUR-' + userNiy),
        niy: userNiy,
        nama_guru: namaGuru,
        tanggal: today,
        jam_server: nowTime,
        jenis: jenis,
        status_kehadiran: statusKehadiran,
        lokasi: (payload.latitude && payload.longitude) ? `${payload.latitude.toFixed(6)}, ${payload.longitude.toFixed(6)}` : '-0.924700, 100.360300',
        jarak_meter: payload.jarak_meter || 15.2,
        radius_sekolah: 60,
        sekolah_id: payload.sekolah_id || 'SCH001',
        nama_sekolah: payload.nama_sekolah || 'Perguruan Islam NIBRAS',
        foto_base64: payload.foto_base64 || ''
      };

      // Tambahkan ke store bersama
      store.attendances.unshift(newRecord);
      this.saveSharedStore(store);

      return {
        success: true,
        message: `Presensi ${jenis} berhasil dicatat! Data Anda langsung tersinkronkan ke sistem.`,
        data: newRecord
      };
    }

    // 5. Riwayat Presensi Admin (SINGKRON: Membaca seluruh data yang diinput Pegawai)
    if (action === 'admin_attendance_records') {
      return {
        success: true,
        data: store.attendances
      };
    }

    // 6. Statistik Dashboard Admin (SINGKRON: Dihitung langsung dari data Pegawai)
    if (action === 'admin_dashboard_stats') {
      const todayAttendances = store.attendances.filter(a => a.tanggal === today);
      const uniqueHadir = new Set(todayAttendances.filter(a => a.jenis === 'MASUK').map(a => a.niy)).size;
      const tepatWaktu = todayAttendances.filter(a => a.jenis === 'MASUK' && a.status_kehadiran.includes('Tepat')).length;
      const terlambat = todayAttendances.filter(a => a.jenis === 'MASUK' && a.status_kehadiran.includes('Terlambat')).length;
      const pulang = todayAttendances.filter(a => a.jenis === 'PULANG').length;
      const totalPegawai = Math.max(store.teachers.length, uniqueHadir);

      return {
        success: true,
        serverDate: today,
        serverTime: nowTime,
        stats: {
          totalGuru: totalPegawai,
          totalSekolah: 3,
          hadirHariIni: uniqueHadir,
          tepatWaktuHariIni: tepatWaktu,
          terlambatHariIni: terlambat,
          belumHadirHariIni: Math.max(0, totalPegawai - uniqueHadir),
          pulangHariIni: pulang
        }
      };
    }

    // 7. Master Guru (Bisa ditambah/diedit oleh Admin dan langsung bisa login di Pegawai)
    if (action === 'admin_crud_guru') {
      const subAction = payload.subAction || 'LIST';
      if (subAction === 'LIST') {
        return { success: true, data: store.teachers };
      }
      if (subAction === 'CREATE' && payload.data) {
        const newTeacher = {
          guru_id: 'GUR-' + Date.now().toString(36),
          niy: payload.data.niy || String(Date.now()).slice(-6),
          nama_lengkap: payload.data.nama_lengkap || 'Guru Baru',
          jabatan: payload.data.jabatan || 'Guru Mapel',
          sekolah_id: payload.data.sekolah_id || 'SCH001',
          status: 'aktif'
        };
        store.teachers.push(newTeacher);
        this.saveSharedStore(store);
        return { success: true, message: 'Data pegawai berhasil ditambahkan dan langsung aktif.', data: newTeacher };
      }
      if (subAction === 'DELETE' && payload.guru_id) {
        store.teachers = store.teachers.filter(t => t.guru_id !== payload.guru_id);
        this.saveSharedStore(store);
        return { success: true, message: 'Data pegawai berhasil dihapus.' };
      }
      return { success: true, data: store.teachers };
    }

    // 8. Master Unit Sekolah
    if (action === 'admin_crud_sekolah') {
      return {
        success: true,
        data: [
          { sekolah_id: 'SCH001', nama_sekolah: 'Perguruan Islam NIBRAS (Kampus Pusat)', alamat: 'Jl. Khatib Sulaiman No. 45, Padang', latitude: -0.9247, longitude: 100.3603, radius_meter: 60, status: 'aktif' },
          { sekolah_id: 'SCH002', nama_sekolah: 'SD Islam Nibras Padang', alamat: 'Jl. Belanti Raya No. 12, Lolong Belanti, Padang', latitude: -0.915234, longitude: 100.354120, radius_meter: 50, status: 'aktif' },
          { sekolah_id: 'SCH003', nama_sekolah: 'SMP Islam Nibras Islamic Boarding School', alamat: 'Jl. Raya Lubuk Minturun KM 8, Padang', latitude: -0.845612, longitude: 100.378901, radius_meter: 80, status: 'aktif' }
        ]
      };
    }

    return { success: true, message: 'Operasi berhasil diproses.' };
  }
};

