/**
 * ============================================================================
 * ADMINISTRATOR CONTROLLER & REPORTING ENGINE
 * Perguruan Islam NIBRAS - Sistem Presensi Online Berbasis GPS
 * ============================================================================
 */

/**
 * Validasi hak akses khusus Administrator.
 */
function requireAdmin(token) {
  var auth = validateToken(token);
  if (!auth.valid) return { authorized: false, message: auth.message };
  if (auth.user.role !== 'admin') {
    return { authorized: false, message: 'Akses ditolak. Fitur ini hanya untuk Administrator.' };
  }
  return { authorized: true, user: auth.user };
}

/**
 * Mendapatkan Statistik Dashboard Admin (Realtime Hari Ini).
 */
function getAdminDashboardStats(token) {
  var check = requireAdmin(token);
  if (!check.authorized) return { success: false, message: check.message };

  var now = new Date();
  var todayDateStr = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');
  var serverTimeStr = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm:ss');

  var gurus = getRowsAsObjects(SHEET_NAMES.GURU).filter(function(g) { return g.status === 'aktif'; });
  var schools = getRowsAsObjects(SHEET_NAMES.SEKOLAH).filter(function(s) { return s.status === 'aktif'; });
  var attendances = getRowsAsObjects(SHEET_NAMES.ABSENSI);

  var totalGuru = gurus.length;
  var totalSekolah = schools.length;

  var hadirHariIni = 0;
  var tepatWaktuHariIni = 0;
  var terlambatHariIni = 0;
  var pulangHariIni = 0;

  var checkedInGuruIds = {};

  attendances.forEach(function(rec) {
    if (rec.tanggal === todayDateStr) {
      if (rec.jenis === 'MASUK') {
        hadirHariIni++;
        checkedInGuruIds[rec.guru_id] = true;
        if (rec.status_kehadiran === 'Tepat Waktu') tepatWaktuHariIni++;
        else if (rec.status_kehadiran === 'Terlambat') terlambatHariIni++;
      } else if (rec.jenis === 'PULANG') {
        pulangHariIni++;
      }
    }
  });

  var belumHadirHariIni = Math.max(0, totalGuru - hadirHariIni);

  return {
    success: true,
    serverDate: todayDateStr,
    serverTime: serverTimeStr,
    stats: {
      totalGuru: totalGuru,
      totalSekolah: totalSekolah,
      hadirHariIni: hadirHariIni,
      tepatWaktuHariIni: tepatWaktuHariIni,
      terlambatHariIni: terlambatHariIni,
      belumHadirHariIni: belumHadirHariIni,
      pulangHariIni: pulangHariIni
    }
  };
}

/**
 * Mengambil Seluruh Catatan Absensi dengan Filter dan Pencarian.
 */
function getAdminAttendanceRecords(token, filters) {
  var check = requireAdmin(token);
  if (!check.authorized) return { success: false, message: check.message };

  var records = getRowsAsObjects(SHEET_NAMES.ABSENSI);
  filters = filters || {};

  var tanggal = filters.tanggal; // YYYY-MM-DD
  var sekolahId = filters.sekolah_id;
  var jenis = filters.jenis;
  var search = filters.search ? String(filters.search).toLowerCase() : '';

  var filtered = records.filter(function(r) {
    if (tanggal && r.tanggal !== tanggal) return false;
    if (sekolahId && r.sekolah_id !== sekolahId) return false;
    if (jenis && r.jenis !== jenis) return false;
    if (search) {
      var matchNama = String(r.nama_guru || '').toLowerCase().indexOf(search) !== -1;
      var matchNiy = String(r.niy || '').toLowerCase().indexOf(search) !== -1;
      if (!matchNama && !matchNiy) return false;
    }
    return true;
  });

  return {
    success: true,
    data: filtered.reverse() // Data terbaru paling atas
  };
}

/**
 * CRUD DATA GURU
 */
function adminCrudGuru(token, action, data) {
  var check = requireAdmin(token);
  if (!check.authorized) return { success: false, message: check.message };

  if (action === 'LIST') {
    var gurus = getRowsAsObjects(SHEET_NAMES.GURU);
    return { success: true, data: gurus };
  }

  if (action === 'CREATE') {
    if (!data.niy || !data.nama_lengkap || !data.sekolah_id) {
      return { success: false, message: 'NIY, Nama Lengkap, dan Sekolah wajib diisi.' };
    }

    // Cek NIY unik
    var existing = getRowsAsObjects(SHEET_NAMES.GURU);
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i].niy) === String(data.niy)) {
        return { success: false, message: 'NIY sudah terdaftar.' };
      }
    }

    var guruId = 'GUR-' + Date.now().toString(36).toUpperCase();
    var newGuru = {
      guru_id: guruId,
      niy: data.niy,
      nama_lengkap: data.nama_lengkap,
      tempat_lahir: data.tempat_lahir || '',
      tanggal_lahir: data.tanggal_lahir || '',
      jabatan: data.jabatan || 'Guru',
      sekolah_id: data.sekolah_id,
      no_hp: data.no_hp || '',
      email: data.email || '',
      status: data.status || 'aktif'
    };

    insertRow(SHEET_NAMES.GURU, newGuru);

    // Otomatis buatkan Akun Pengguna untuk guru baru
    var defaultPassword = data.password || 'guru123';
    var salt = generateSalt();
    var hash = hashPassword(defaultPassword, salt);

    insertRow(SHEET_NAMES.USERS, {
      user_id: 'USR-' + guruId,
      username: data.niy,
      password_hash: hash,
      salt: salt,
      role: 'guru',
      ref_id: guruId,
      token: '',
      token_expiry: '',
      status: 'aktif',
      created_at: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss')
    });

    logAudit(check.user.username, 'CREATE_GURU', 'Menambahkan guru baru: ' + data.nama_lengkap + ' (' + data.niy + ')');
    return { success: true, message: 'Data guru berhasil ditambahkan dan akun berhasil dibuat.', data: newGuru };
  }

  if (action === 'UPDATE') {
    if (!data.guru_id) return { success: false, message: 'guru_id wajib disertakan.' };

    var updated = updateRowByColumn(SHEET_NAMES.GURU, 'guru_id', data.guru_id, {
      niy: data.niy,
      nama_lengkap: data.nama_lengkap,
      tempat_lahir: data.tempat_lahir,
      tanggal_lahir: data.tanggal_lahir,
      jabatan: data.jabatan,
      sekolah_id: data.sekolah_id,
      no_hp: data.no_hp,
      email: data.email,
      status: data.status
    });

    if (updated) {
      logAudit(check.user.username, 'UPDATE_GURU', 'Memperbarui data guru ID: ' + data.guru_id);
      return { success: true, message: 'Data guru berhasil diperbarui.' };
    }
    return { success: false, message: 'Gagal memperbarui data guru.' };
  }

  if (action === 'DELETE') {
    if (!data.guru_id) return { success: false, message: 'guru_id wajib disertakan.' };

    deleteRowByColumn(SHEET_NAMES.GURU, 'guru_id', data.guru_id);
    deleteRowByColumn(SHEET_NAMES.USERS, 'ref_id', data.guru_id);

    logAudit(check.user.username, 'DELETE_GURU', 'Menghapus data guru ID: ' + data.guru_id);
    return { success: true, message: 'Data guru dan akun terkait berhasil dihapus.' };
  }

  return { success: false, message: 'Aksi guru tidak dikenali.' };
}

/**
 * CRUD DATA SEKOLAH & TITIK KOORDINAT
 */
function adminCrudSekolah(token, action, data) {
  var check = requireAdmin(token);
  if (!check.authorized) return { success: false, message: check.message };

  if (action === 'LIST') {
    var schools = getRowsAsObjects(SHEET_NAMES.SEKOLAH);
    return { success: true, data: schools };
  }

  if (action === 'CREATE') {
    if (!data.nama_sekolah || isNaN(parseFloat(data.latitude)) || isNaN(parseFloat(data.longitude))) {
      return { success: false, message: 'Nama Sekolah, Latitude, dan Longitude wajib diisi dengan benar.' };
    }

    var sekolahId = 'SCH-' + Date.now().toString(36).toUpperCase();
    var newSchool = {
      sekolah_id: sekolahId,
      nama_sekolah: data.nama_sekolah,
      alamat: data.alamat || '',
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      radius_meter: parseInt(data.radius_meter, 10) || 50,
      status: data.status || 'aktif'
    };

    insertRow(SHEET_NAMES.SEKOLAH, newSchool);
    logAudit(check.user.username, 'CREATE_SEKOLAH', 'Menambahkan unit sekolah: ' + data.nama_sekolah);
    return { success: true, message: 'Unit sekolah berhasil ditambahkan.', data: newSchool };
  }

  if (action === 'UPDATE') {
    if (!data.sekolah_id) return { success: false, message: 'sekolah_id wajib disertakan.' };

    var updated = updateRowByColumn(SHEET_NAMES.SEKOLAH, 'sekolah_id', data.sekolah_id, {
      nama_sekolah: data.nama_sekolah,
      alamat: data.alamat,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      radius_meter: parseInt(data.radius_meter, 10) || 50,
      status: data.status
    });

    if (updated) {
      logAudit(check.user.username, 'UPDATE_SEKOLAH', 'Memperbarui data unit sekolah ID: ' + data.sekolah_id);
      return { success: true, message: 'Data sekolah berhasil diperbarui.' };
    }
    return { success: false, message: 'Gagal memperbarui data sekolah.' };
  }

  if (action === 'DELETE') {
    if (!data.sekolah_id) return { success: false, message: 'sekolah_id wajib disertakan.' };

    deleteRowByColumn(SHEET_NAMES.SEKOLAH, 'sekolah_id', data.sekolah_id);
    logAudit(check.user.username, 'DELETE_SEKOLAH', 'Menghapus data unit sekolah ID: ' + data.sekolah_id);
    return { success: true, message: 'Data unit sekolah berhasil dihapus.' };
  }

  return { success: false, message: 'Aksi sekolah tidak dikenali.' };
}

/**
 * PENGATURAN SISTEM
 */
function adminGetSettings(token) {
  var check = requireAdmin(token);
  if (!check.authorized) return { success: false, message: check.message };

  var sheet = getSheet(SHEET_NAMES.PENGATURAN);
  if (!sheet) return { success: false, message: 'Sheet PENGATURAN tidak ditemukan.' };

  var displayData = sheet.getDataRange().getDisplayValues();
  if (displayData.length <= 1) return { success: true, data: [] };

  var headers = displayData[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var keyCol = headers.indexOf('setting_key');
  var valCol = headers.indexOf('setting_value');
  var ketCol = headers.indexOf('keterangan');

  if (keyCol === -1 || valCol === -1) {
    keyCol = 0;
    valCol = 1;
  }

  var list = [];
  for (var i = 1; i < displayData.length; i++) {
    var k = String(displayData[i][keyCol] || '').trim();
    var v = String(displayData[i][valCol] || '').trim();
    if (!k) continue;

    // Normalisasi format waktu jika nilai berbentuk "06.00" atau sejenisnya
    if (/^\d{1,2}[.:]\d{2}/.test(v)) {
      v = v.replace('.', ':');
      var parts = v.split(':');
      if (parts[0].length === 1) parts[0] = '0' + parts[0];
      v = parts.slice(0, 2).join(':');
    }

    list.push({
      setting_key: k,
      setting_value: v,
      keterangan: ketCol !== -1 ? String(displayData[i][ketCol] || '').trim() : ''
    });
  }

  return { success: true, data: list };
}

function adminUpdateSettings(token, settingsArray) {
  var check = requireAdmin(token);
  if (!check.authorized) return { success: false, message: check.message };

  if (!Array.isArray(settingsArray)) {
    return { success: false, message: 'Data pengaturan harus berupa array.' };
  }

  var sheet = getSheet(SHEET_NAMES.PENGATURAN);
  if (!sheet) return { success: false, message: 'Sheet PENGATURAN tidak ditemukan.' };

  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var keyCol = headers.indexOf('setting_key');
  var valCol = headers.indexOf('setting_value');
  if (keyCol === -1 || valCol === -1) {
    keyCol = 0;
    valCol = 1;
  }

  for (var i = 0; i < settingsArray.length; i++) {
    var item = settingsArray[i];
    if (item.setting_key && item.setting_value !== undefined) {
      var targetKey = String(item.setting_key).trim().toLowerCase();
      var newVal = String(item.setting_value).trim();
      var found = false;

      for (var r = 1; r < data.length; r++) {
        if (String(data[r][keyCol]).trim().toLowerCase() === targetKey) {
          // Format sel sebagai teks murni (@) agar Google Sheets tidak mengubah "06:00" menjadi Date/Waktu acak
          var cell = sheet.getRange(r + 1, valCol + 1);
          cell.setNumberFormat('@');
          cell.setValue(newVal);
          found = true;
          break;
        }
      }

      // Jika key belum ada di spreadsheet, tambahkan baris baru
      if (!found) {
        sheet.appendRow([item.setting_key, newVal, '']);
      }
    }
  }

  SpreadsheetApp.flush();
  logAudit(check.user.username, 'UPDATE_SETTINGS', 'Memperbarui konfigurasi sistem operasional');
  return { success: true, message: 'Pengaturan sistem berhasil disimpan.' };
}

/**
 * MANAJEMEN PENGGUNA (RESET PASSWORD DLL)
 */
function adminResetPassword(token, userId, newPassword) {
  var check = requireAdmin(token);
  if (!check.authorized) return { success: false, message: check.message };

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Password baru minimal 6 karakter.' };
  }

  var newSalt = generateSalt();
  var newHash = hashPassword(newPassword, newSalt);

  var updated = updateRowByColumn(SHEET_NAMES.USERS, 'user_id', userId, {
    password_hash: newHash,
    salt: newSalt,
    token: '', // Paksa relogin
    token_expiry: ''
  });

  if (updated) {
    logAudit(check.user.username, 'RESET_PASSWORD', 'Reset kata sandi user ID: ' + userId);
    return { success: true, message: 'Password pengguna berhasil direset.' };
  }
  return { success: false, message: 'Pengguna tidak ditemukan.' };
}

/**
 * AUDIT LOGS
 */
function adminGetAuditLogs(token, limit) {
  var check = requireAdmin(token);
  if (!check.authorized) return { success: false, message: check.message };

  var logs = getRowsAsObjects(SHEET_NAMES.LOGS);
  var maxLimit = parseInt(limit, 10) || 100;
  return {
    success: true,
    data: logs.reverse().slice(0, maxLimit)
  };
}

