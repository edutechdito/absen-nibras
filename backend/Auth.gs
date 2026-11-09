/**
 * ============================================================================
 * AUTHENTICATION & SECURITY ENGINE
 * Perguruan Islam NIBRAS - Sistem Presensi Online Berbasis GPS
 * ============================================================================
 */

/**
 * Menghasilkan salt acak string heksadesimal.
 */
function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

/**
 * Melakukan hash password dengan SHA-256 + Salt.
 */
function hashPassword(password, salt) {
  var input = String(password) + String(salt);
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < rawHash.length; i++) {
    var b = rawHash[i];
    if (b < 0) b += 256;
    var byteString = b.toString(16);
    if (byteString.length == 1) byteString = '0' + byteString;
    hex += byteString;
  }
  return hex;
}

/**
 * Menghasilkan token sesi unik.
 */
function generateSessionToken() {
  return 'tok_' + Utilities.getUuid().replace(/-/g, '') + Date.now().toString(36);
}

/**
 * Login Pengguna (Guru / Admin).
 */
function loginUser(username, password) {
  if (!username || !password) {
    return { success: false, message: 'Username dan password wajib diisi.' };
  }

  var users = getRowsAsObjects(SHEET_NAMES.USERS);
  var user = null;

  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      user = users[i];
      break;
    }
  }

  if (!user) {
    return { success: false, message: 'Username atau password tidak cocok.' };
  }

  if (user.status !== 'aktif') {
    return { success: false, message: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.' };
  }

  // Verifikasi Password (Mendukung Hash Kriptografis DAN Password Teks Biasa dari Spreadsheet)
  var isPasswordValid = false;

  // 1. Cek jika sudah berupa SHA-256 Hash + Salt
  if (user.salt && user.password_hash) {
    var calculatedHash = hashPassword(password, user.salt);
    if (calculatedHash === user.password_hash) {
      isPasswordValid = true;
    }
  }

  // 2. Cek jika admin mengetikkan password teks biasa (plaintext) langsung di Spreadsheet
  if (!isPasswordValid && String(user.password_hash).trim() === String(password).trim()) {
    isPasswordValid = true;

    // Otomatis amankan menjadi Hash SHA-256 + Salt baru di Spreadsheet
    var newSalt = generateSalt();
    var secureHash = hashPassword(password, newSalt);
    updateRowByColumn(SHEET_NAMES.USERS, 'user_id', user.user_id, {
      password_hash: secureHash,
      salt: newSalt
    });
    user.salt = newSalt;
    user.password_hash = secureHash;
  }

  if (!isPasswordValid) {
    return { success: false, message: 'Username atau password tidak cocok.' };
  }

  // Generate Token baru (masa berlaku 7 hari)
  var token = generateSessionToken();
  var expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);
  var tokenExpiryStr = expiryDate.toISOString();

  // Simpan token ke database
  updateRowByColumn(SHEET_NAMES.USERS, 'user_id', user.user_id, {
    token: token,
    token_expiry: tokenExpiryStr
  });

  // Ambil profil data lengkap
  var profile = {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    ref_id: user.ref_id
  };

  if (user.role === 'guru') {
    var gurus = getRowsAsObjects(SHEET_NAMES.GURU);
    for (var g = 0; g < gurus.length; g++) {
      // Cocokkan berdasarkan ref_id ATAU langsung nomor NIY = username
      if (gurus[g].guru_id === user.ref_id || String(gurus[g].niy).trim() === String(user.username).trim()) {
        profile.nama_lengkap = gurus[g].nama_lengkap;
        profile.niy = gurus[g].niy;
        profile.tempat_lahir = gurus[g].tempat_lahir;
        profile.tanggal_lahir = gurus[g].tanggal_lahir;
        profile.jabatan = gurus[g].jabatan;
        profile.sekolah_id = gurus[g].sekolah_id;
        profile.no_hp = gurus[g].no_hp;
        profile.email = gurus[g].email;

        // Jika ref_id di sheet USERS sebelumnya kosong, otomatis perbarui dengan guru_id
        if (!user.ref_id && gurus[g].guru_id) {
          updateRowByColumn(SHEET_NAMES.USERS, 'user_id', user.user_id, { ref_id: gurus[g].guru_id });
          profile.ref_id = gurus[g].guru_id;
        }
        break;
      }
    }

    // Ambil data sekolah
    if (profile.sekolah_id) {
      var schools = getRowsAsObjects(SHEET_NAMES.SEKOLAH);
      for (var s = 0; s < schools.length; s++) {
        if (schools[s].sekolah_id === profile.sekolah_id) {
          profile.nama_sekolah = schools[s].nama_sekolah;
          profile.alamat_sekolah = schools[s].alamat;
          profile.sekolah_lat = Number(schools[s].latitude);
          profile.sekolah_lng = Number(schools[s].longitude);
          profile.sekolah_radius = Number(schools[s].radius_meter);
          break;
        }
      }
    }
  } else {
    profile.nama_lengkap = 'Administrator NIBRAS';
    profile.jabatan = 'Sistem Administrator';
  }

  // Catat Log Login
  logAudit(user.username, 'LOGIN', 'Pengguna berhasil masuk ke sistem');

  return {
    success: true,
    message: 'Login berhasil.',
    token: token,
    user: profile
  };
}

/**
 * Validasi Session Token aktif.
 */
function validateToken(token) {
  if (!token) return { valid: false, message: 'Sesi tidak ditemukan atau telah kedaluwarsa.' };

  var users = getRowsAsObjects(SHEET_NAMES.USERS);
  for (var i = 0; i < users.length; i++) {
    if (users[i].token === token) {
      // Cek expiry
      var expiry = new Date(users[i].token_expiry);
      if (new Date() > expiry) {
        return { valid: false, message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' };
      }
      if (users[i].status !== 'aktif') {
        return { valid: false, message: 'Akun Anda dinonaktifkan.' };
      }
      return { valid: true, user: users[i] };
    }
  }
  return { valid: false, message: 'Sesi tidak valid. Silakan login kembali.' };
}

/**
 * Logout Pengguna (Menghapus token dari database).
 */
function logoutUser(token) {
  if (!token) return { success: true };
  var users = getRowsAsObjects(SHEET_NAMES.USERS);
  for (var i = 0; i < users.length; i++) {
    if (users[i].token === token) {
      updateRowByColumn(SHEET_NAMES.USERS, 'user_id', users[i].user_id, {
        token: '',
        token_expiry: ''
      });
      logAudit(users[i].username, 'LOGOUT', 'Pengguna keluar dari sistem');
      break;
    }
  }
  return { success: true, message: 'Berhasil keluar.' };
}

/**
 * Ganti Password Pengguna.
 */
function changePassword(token, oldPassword, newPassword) {
  var auth = validateToken(token);
  if (!auth.valid) return { success: false, message: auth.message };

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Password baru minimal 6 karakter.' };
  }

  var user = auth.user;
  var oldHash = hashPassword(oldPassword, user.salt);
  if (oldHash !== user.password_hash) {
    return { success: false, message: 'Password lama salah.' };
  }

  var newSalt = generateSalt();
  var newHash = hashPassword(newPassword, newSalt);

  updateRowByColumn(SHEET_NAMES.USERS, 'user_id', user.user_id, {
    password_hash: newHash,
    salt: newSalt
  });

  logAudit(user.username, 'CHANGE_PASSWORD', 'Pengguna mengganti kata sandi');
  return { success: true, message: 'Password berhasil diperbarui.' };
}

/**
 * Pencatatan Riwayat Aktivitas (Audit Logs).
 */
function logAudit(userId, action, detail, ipAddress) {
  try {
    var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    insertRow(SHEET_NAMES.LOGS, {
      log_id: 'LOG-' + Date.now().toString(36).toUpperCase(),
      timestamp: nowStr,
      user_id: userId || 'SYSTEM',
      action: action || 'INFO',
      detail: detail || '',
      ip_address: ipAddress || 'Web Client'
    });
  } catch (e) {
    Logger.log('Gagal menulis log: ' + e.message);
  }
}

/**
 * ============================================================================
 * MENU KHUSUS SPREADSHEET GOOGLE
 * Otomatis muncul di menu atas Google Sheets saat dokumen dibuka
 * ============================================================================
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('🕌 Presensi NIBRAS')
      .addItem('🔐 Enkripsi Password Baru di Sheet USERS', 'encryptPlainPasswordsInSheet')
      .addItem('🔄 Inisialisasi Ulang Database', 'initDatabase')
      .addToUi();
  } catch (e) {
    // Abaikan jika dijalankan di konteks non-UI (seperti trigger Web App)
  }
}

/**
 * FUNGSI BANTU UNTUK ADMIN:
 * Mengonversi seluruh password teks biasa (plaintext) yang baru diketik di sheet USERS
 * menjadi Hash Kriptografis SHA-256 + Salt secara otomatis.
 */
function encryptPlainPasswordsInSheet() {
  var sheet = getSheet(SHEET_NAMES.USERS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('Sheet USERS masih kosong.');
    return;
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var colPass = headers.indexOf('password_hash');
  var colSalt = headers.indexOf('salt');
  var colUserId = headers.indexOf('user_id');
  var colStatus = headers.indexOf('status');
  var colCreated = headers.indexOf('created_at');

  var countConverted = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var currentPass = String(row[colPass] || '').trim();
    var currentSalt = String(row[colSalt] || '').trim();

    // Jika baris kosong, lewati
    if (!currentPass) continue;

    // Jika password belum di-hash (panjang bukan 64 karakter heksadesimal SHA-256) atau salt kosong
    var isAlreadyHashed = currentPass.length === 64 && currentSalt.length > 0 && /^[0-9a-fA-F]+$/.test(currentPass);

    if (!isAlreadyHashed) {
      var newSalt = generateSalt();
      var newHash = hashPassword(currentPass, newSalt);
      var rowIndex = i + 1;

      // Update password_hash & salt
      sheet.getRange(rowIndex, colPass + 1).setValue(newHash);
      sheet.getRange(rowIndex, colSalt + 1).setValue(newSalt);

      // Isi user_id jika kosong
      if (colUserId !== -1 && !row[colUserId]) {
        sheet.getRange(rowIndex, colUserId + 1).setValue('USR-' + Date.now().toString(36).toUpperCase() + i);
      }

      // Isi status aktif jika kosong
      if (colStatus !== -1 && !row[colStatus]) {
        sheet.getRange(rowIndex, colStatus + 1).setValue('aktif');
      }

      // Isi created_at jika kosong
      if (colCreated !== -1 && !row[colCreated]) {
        sheet.getRange(rowIndex, colCreated + 1).setValue(Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'));
      }

      countConverted++;
    }
  }

  SpreadsheetApp.flush();

  var msg = countConverted > 0
    ? 'Berhasil! Sebanyak ' + countConverted + ' akun dengan password baru telah berhasil diamankan (di-hash).'
    : 'Semua akun di sheet USERS sudah dalam kondisi terenkripsi aman.';

  try {
    SpreadsheetApp.getUi().alert('Presensi NIBRAS', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(msg);
  }
}

