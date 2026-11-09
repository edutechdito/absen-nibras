/**
 * ============================================================================
 * DATABASE ENGINE & SHEET HELPERS
 * Perguruan Islam NIBRAS - Sistem Presensi Online Berbasis GPS
 * ============================================================================
 */

// Konstanta Nama Sheet
var SHEET_NAMES = {
  USERS: 'USERS',
  GURU: 'GURU',
  SEKOLAH: 'SEKOLAH',
  ABSENSI: 'ABSENSI',
  PENGATURAN: 'PENGATURAN',
  LOGS: 'LOGS'
};

// Nama Folder Google Drive untuk Arsip Foto Selfie Presensi
var DRIVE_FOLDER_NAME = 'NIBRAS_PRESENSI_SELFIE';

/**
 * Mendapatkan instance Spreadsheet aktif.
 * Jika script terikat langsung (container-bound), gunakan getActiveSpreadsheet().
 * Jika standalone, pengguna dapat mengganti SPREADSHEET_ID pada file config.
 */
function getDb() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    // Fallback jika standalone script
    var prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (prop) {
      return SpreadsheetApp.openById(prop);
    }
    throw new Error('Spreadsheet tidak terhubung. Buka Tools > Script Editor dari Google Sheets atau isi Script Property SPREADSHEET_ID.');
  }
}

/**
 * Mendapatkan objek Sheet berdasarkan nama.
 */
function getSheet(sheetName) {
  var ss = getDb();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Jalankan fungsi initDatabase() terlebih dahulu.');
  }
  return sheet;
}

/**
 * Mengonversi seluruh isi sheet menjadi array of objects berdasarkan baris header (baris 1).
 */
function getRowsAsObjects(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Lewati baris kosong
    if (row.join('').trim() === '') continue;

    var obj = { _rowIndex: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Menambahkan 1 baris baru ke sheet berdasarkan objek kolom.
 */
function insertRow(sheetName, rowObject) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    throw new Error('Sheet "' + sheetName + '" belum memiliki baris header.');
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var newRow = [];

  for (var j = 0; j < headers.length; j++) {
    var key = headers[j];
    newRow.push(rowObject[key] !== undefined ? rowObject[key] : '');
  }

  sheet.appendRow(newRow);
  SpreadsheetApp.flush();
  return rowObject;
}

/**
 * Memperbarui baris berdasarkan nilai Primary Key pada kolom tertentu.
 */
function updateRowByColumn(sheetName, idColumn, idValue, updatedFields) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idColIndex = headers.indexOf(idColumn);
  if (idColIndex === -1) {
    throw new Error('Kolom ID "' + idColumn + '" tidak ditemukan di sheet ' + sheetName);
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(idValue)) {
      var rowIndex = i + 1;
      for (var key in updatedFields) {
        var colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(updatedFields[key]);
        }
      }
      SpreadsheetApp.flush();
      return true;
    }
  }
  return false;
}

/**
 * Menghapus baris berdasarkan nilai ID.
 */
function deleteRowByColumn(sheetName, idColumn, idValue) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idColIndex = headers.indexOf(idColumn);
  if (idColIndex === -1) return false;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(idValue)) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return true;
    }
  }
  return false;
}

/**
 * Mendapatkan atau membuat folder di Google Drive untuk menyimpan foto selfie absensi.
 */
function getOrCreatePhotoFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  // Atur izin baca publik untuk link foto
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Menyimpan gambar Base64 ke Google Drive dan mengembalikan URL publik.
 */
function saveBase64ImageToDrive(base64Data, filename) {
  if (!base64Data || base64Data.indexOf('data:image') === -1) {
    return '';
  }
  try {
    var folder = getOrCreatePhotoFolder();
    var parts = base64Data.split(',');
    var contentType = parts[0].split(':')[1].split(';')[0];
    var decoded = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(decoded, contentType, filename);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getDownloadUrl() || file.getUrl();
  } catch (err) {
    Logger.log('Gagal menyimpan foto ke Drive: ' + err.message);
    return '';
  }
}

/**
 * INISIALISASI DATABASE OTOMATIS
 * Jalankan fungsi ini sekali dari Script Editor untuk membuat seluruh sheet,
 * kolom header, dan data awal (seed data) jika belum ada.
 */
function initDatabase() {
  var ss = getDb();

  var schemas = [
    {
      name: SHEET_NAMES.USERS,
      headers: ['user_id', 'username', 'password_hash', 'salt', 'role', 'ref_id', 'token', 'token_expiry', 'status', 'created_at']
    },
    {
      name: SHEET_NAMES.GURU,
      headers: ['guru_id', 'niy', 'nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jabatan', 'sekolah_id', 'no_hp', 'email', 'status']
    },
    {
      name: SHEET_NAMES.SEKOLAH,
      headers: ['sekolah_id', 'nama_sekolah', 'alamat', 'latitude', 'longitude', 'radius_meter', 'status']
    },
    {
      name: SHEET_NAMES.ABSENSI,
      headers: ['absen_id', 'guru_id', 'niy', 'nama_guru', 'sekolah_id', 'tanggal', 'jenis', 'jam_server', 'latitude', 'longitude', 'akurasi_gps', 'jarak_meter', 'status_kehadiran', 'foto_url', 'keterangan']
    },
    {
      name: SHEET_NAMES.PENGATURAN,
      headers: ['setting_key', 'setting_value', 'keterangan']
    },
    {
      name: SHEET_NAMES.LOGS,
      headers: ['log_id', 'timestamp', 'user_id', 'action', 'detail', 'ip_address']
    }
  ];

  schemas.forEach(function(schema) {
    var sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
      // Format baris header
      sheet.appendRow(schema.headers);
      var headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0B2545'); // Navy Blue
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  });

  // Hapus "Sheet1" bawaan jika ada dan kosong
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  // Isi data awal (Seed Data)
  seedInitialData();

  Logger.log('Inisialisasi Database Berhasil Selesai!');
  return { success: true, message: 'Database initialized successfully' };
}

/**
 * Mengisi data awal (Sekolah, Pengaturan, Akun Admin, dan Contoh Guru).
 */
function seedInitialData() {
  // 1. Seed SEKOLAH
  var sekolahRows = getRowsAsObjects(SHEET_NAMES.SEKOLAH);
  if (sekolahRows.length === 0) {
    insertRow(SHEET_NAMES.SEKOLAH, {
      sekolah_id: 'SCH001',
      nama_sekolah: 'Perguruan Islam NIBRAS (Kampus Pusat)',
      alamat: 'Jl. Khatib Sulaiman No. 45, Padang, Sumatera Barat',
      latitude: -0.923456,
      longitude: 100.367890,
      radius_meter: 60,
      status: 'aktif'
    });
    insertRow(SHEET_NAMES.SEKOLAH, {
      sekolah_id: 'SCH002',
      nama_sekolah: 'SD Islam Nibras Padang',
      alamat: 'Jl. Belanti Raya No. 12, Lolong Belanti, Padang',
      latitude: -0.915234,
      longitude: 100.354120,
      radius_meter: 50,
      status: 'aktif'
    });
    insertRow(SHEET_NAMES.SEKOLAH, {
      sekolah_id: 'SCH003',
      nama_sekolah: 'SMP Islam Nibras Islamic Boarding School',
      alamat: 'Jl. Raya Lubuk Minturun KM 8, Koto Tangah, Padang',
      latitude: -0.845612,
      longitude: 100.378901,
      radius_meter: 80,
      status: 'aktif'
    });
  }

  // 2. Seed PENGATURAN
  var settingRows = getRowsAsObjects(SHEET_NAMES.PENGATURAN);
  if (settingRows.length === 0) {
    var defaultSettings = [
      { setting_key: 'jam_masuk_mulai', setting_value: '06:00', keterangan: 'Waktu pembukaan presensi masuk (WIB)' },
      { setting_key: 'jam_masuk_batas', setting_value: '07:15', keterangan: 'Batas akhir absen tepat waktu (WIB)' },
      { setting_key: 'toleransi_terlambat_menit', setting_value: '15', keterangan: 'Toleransi keterlambatan dalam menit' },
      { setting_key: 'jam_pulang_mulai', setting_value: '15:30', keterangan: 'Waktu dimulainya presensi pulang (WIB)' },
      { setting_key: 'jam_pulang_batas', setting_value: '18:00', keterangan: 'Batas akhir presensi pulang (WIB)' },
      { setting_key: 'max_gps_accuracy', setting_value: '100', keterangan: 'Batas akurasi GPS maksimal yang diizinkan (meter)' },
      { setting_key: 'nama_yayasan', setting_value: 'Perguruan Islam NIBRAS', keterangan: 'Nama Lembaga / Yayasan' },
      { setting_key: 'default_radius', setting_value: '50', keterangan: 'Radius presensi default (meter)' }
    ];
    defaultSettings.forEach(function(s) {
      insertRow(SHEET_NAMES.PENGATURAN, s);
    });
  }

  // 3. Seed GURU Contoh
  var guruRows = getRowsAsObjects(SHEET_NAMES.GURU);
  if (guruRows.length === 0) {
    insertRow(SHEET_NAMES.GURU, {
      guru_id: 'GUR001',
      niy: '202401001',
      nama_lengkap: 'Ustadz Ahmad Fauzi, S.Pd.I',
      tempat_lahir: 'Padang',
      tanggal_lahir: '1990-05-14',
      jabatan: 'Guru PAI & Wali Kelas VII',
      sekolah_id: 'SCH001',
      no_hp: '08126789001',
      email: 'ahmad.fauzi@nibras.sch.id',
      status: 'aktif'
    });
    insertRow(SHEET_NAMES.GURU, {
      guru_id: 'GUR002',
      niy: '202401002',
      nama_lengkap: 'Ustadzah Siti Rahmah, M.Pd',
      tempat_lahir: 'Bukittinggi',
      tanggal_lahir: '1993-08-22',
      jabatan: 'Guru Bahasa Arab & Tahfidz',
      sekolah_id: 'SCH001',
      no_hp: '08126789002',
      email: 'siti.rahmah@nibras.sch.id',
      status: 'aktif'
    });
    insertRow(SHEET_NAMES.GURU, {
      guru_id: 'GUR003',
      niy: '202402001',
      nama_lengkap: 'Muhammad Ridwan, S.Kom',
      tempat_lahir: 'Solok',
      tanggal_lahir: '1995-11-03',
      jabatan: 'Tenaga Kependidikan / IT Staff',
      sekolah_id: 'SCH002',
      no_hp: '08126789003',
      email: 'm.ridwan@nibras.sch.id',
      status: 'aktif'
    });
  }

  // 4. Seed USERS (Admin & Guru)
  var userRows = getRowsAsObjects(SHEET_NAMES.USERS);
  if (userRows.length === 0) {
    // Salt unik untuk admin dan guru
    var saltAdmin = generateSalt();
    var hashAdmin = hashPassword('admin123', saltAdmin);

    insertRow(SHEET_NAMES.USERS, {
      user_id: 'USR-ADMIN',
      username: 'admin',
      password_hash: hashAdmin,
      salt: saltAdmin,
      role: 'admin',
      ref_id: 'ADMIN',
      token: '',
      token_expiry: '',
      status: 'aktif',
      created_at: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss')
    });

    // Akun Guru 1 (username = NIY '202401001', password = 'guru123')
    var saltGuru1 = generateSalt();
    var hashGuru1 = hashPassword('guru123', saltGuru1);
    insertRow(SHEET_NAMES.USERS, {
      user_id: 'USR-GUR001',
      username: '202401001',
      password_hash: hashGuru1,
      salt: saltGuru1,
      role: 'guru',
      ref_id: 'GUR001',
      token: '',
      token_expiry: '',
      status: 'aktif',
      created_at: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss')
    });

    // Akun Guru 2 (username = NIY '202401002', password = 'guru123')
    var saltGuru2 = generateSalt();
    var hashGuru2 = hashPassword('guru123', saltGuru2);
    insertRow(SHEET_NAMES.USERS, {
      user_id: 'USR-GUR002',
      username: '202401002',
      password_hash: hashGuru2,
      salt: saltGuru2,
      role: 'guru',
      ref_id: 'GUR002',
      token: '',
      token_expiry: '',
      status: 'aktif',
      created_at: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss')
    });
  }
}

