/**
 * ============================================================================
 * ATTENDANCE & GEOLOCATION VALIDATION ENGINE
 * Perguruan Islam NIBRAS - Sistem Presensi Online Berbasis GPS
 * ============================================================================
 */

/**
 * Menghitung jarak antara dua titik koordinat GPS menggunakan Formula Haversine (meter).
 * lat1, lon1: Koordinat Pengguna (Gawai)
 * lat2, lon2: Koordinat Pusat Unit Sekolah
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  var R = 6371000; // Radius Bumi dalam meter
  var toRad = function(degree) {
    return (degree * Math.PI) / 180;
  };

  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var rLat1 = toRad(lat1);
  var rLat2 = toRad(lat2);

  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(rLat1) * Math.cos(rLat2) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var distance = R * c;

  return Math.round(distance * 10) / 10; // Pembulatan 1 desimal
}

/**
 * Mengambil pengaturan sistem sebagai key-value map.
 */
function getSettingsMap() {
  var sheet = getSheet(SHEET_NAMES.PENGATURAN);
  if (!sheet) return {};

  var displayData = sheet.getDataRange().getDisplayValues();
  if (displayData.length <= 1) return {};

  var headers = displayData[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var keyCol = headers.indexOf('setting_key');
  var valCol = headers.indexOf('setting_value');
  if (keyCol === -1 || valCol === -1) {
    keyCol = 0;
    valCol = 1;
  }

  var map = {};
  for (var i = 1; i < displayData.length; i++) {
    var k = String(displayData[i][keyCol] || '').trim().toLowerCase();
    var v = String(displayData[i][valCol] || '').trim();
    if (k) map[k] = v;
  }
  return map;
}

/**
 * Konversi string waktu "HH:mm" atau "HH:mm:ss" ke menit dari tengah malam.
 */
function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  var str = String(timeStr).trim().replace('.', ':');
  if (str.includes('T')) {
    var m = str.match(/T(\d{2}):(\d{2})/);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  var parts = str.split(':');
  var hours = parseInt(parts[0], 10) || 0;
  var minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * PROSES UTAMA TRANSAKSI PRESENSI (MASUK / PULANG)
 * Validasi ketat dilakukan sepenuhnya di sisi Server:
 * 1. Token sesi aktif
 * 2. Kelengkapan koordinat & akurasi
 * 3. Titik koordinat sekolah guru
 * 4. Perhitungan jarak Haversine vs radius sekolah
 * 5. Pengecekan duplikasi pada tanggal dan jenis yang sama
 * 6. Penentuan status keterlambatan berdasarkan jam server resmi
 * 7. Penyimpanan foto selfie ke Drive
 * 8. Penyimpanan rekaman ke Sheet ABSENSI
 */
function submitAttendance(payload) {
  // 1. Verifikasi Sesi Pengguna
  var auth = validateToken(payload.token);
  if (!auth.valid) {
    return { success: false, message: auth.message };
  }

  var user = auth.user;
  if (user.role !== 'guru') {
    return { success: false, message: 'Hanya akun Guru/GTK yang dapat melakukan presensi.' };
  }

  // Ambil Data Guru
  var gurus = getRowsAsObjects(SHEET_NAMES.GURU);
  var guru = null;
  for (var g = 0; g < gurus.length; g++) {
    if (gurus[g].guru_id === user.ref_id) {
      guru = gurus[g];
      break;
    }
  }

  if (!guru) {
    return { success: false, message: 'Data identitas guru tidak ditemukan.' };
  }

  // 2. Validasi Parameter Koordinat
  var userLat = parseFloat(payload.latitude);
  var userLng = parseFloat(payload.longitude);
  var userAccuracy = parseFloat(payload.accuracy) || 0;
  var jenis = String(payload.jenis || '').toUpperCase().trim(); // 'MASUK' atau 'PULANG'

  if (isNaN(userLat) || isNaN(userLng) || (userLat === 0 && userLng === 0)) {
    return {
      success: false,
      message: 'Koordinat GPS tidak valid. Pastikan layanan lokasi pada perangkat Anda aktif dengan mode akurasi tinggi.'
    };
  }

  if (jenis !== 'MASUK' && jenis !== 'PULANG') {
    return { success: false, message: 'Jenis presensi tidak valid (harus MASUK atau PULANG).' };
  }

  // 3. Ambil data sekolah guru
  var schools = getRowsAsObjects(SHEET_NAMES.SEKOLAH);
  var school = null;
  for (var s = 0; s < schools.length; s++) {
    if (schools[s].sekolah_id === guru.sekolah_id) {
      school = schools[s];
      break;
    }
  }

  if (!school) {
    return { success: false, message: 'Data unit sekolah untuk guru ini belum ditentukan oleh Administrator.' };
  }

  var schoolLat = parseFloat(school.latitude);
  var schoolLng = parseFloat(school.longitude);
  var allowedRadius = parseFloat(school.radius_meter) || 50;

  if (isNaN(schoolLat) || isNaN(schoolLng)) {
    return { success: false, message: 'Titik koordinat sekolah belum dikonfigurasi dengan benar oleh Administrator.' };
  }

  // 4. Hitung Jarak Menggunakan Formula Haversine di Server
  var distance = calculateHaversineDistance(userLat, userLng, schoolLat, schoolLng);

  // Ambil Pengaturan
  var settings = getSettingsMap();
  var maxGpsAccuracy = parseFloat(settings.max_gps_accuracy) || 100;

  // Cek Akurasi GPS
  if (userAccuracy > maxGpsAccuracy) {
    return {
      success: false,
      message: 'Akurasi GPS perangkat Anda lemah (' + Math.round(userAccuracy) + ' m). Batas maksimal yang diizinkan adalah ' + maxGpsAccuracy + ' m. Pindahlah ke area terbuka dan refresh sinyal GPS.'
    };
  }

  // Validasi Radius Geofence & Alasan Luar Radius
  var keteranganPresensi = '';
  if (distance > allowedRadius) {
    var alasanLuar = String(payload.keterangan || payload.alasan || '').trim();
    if (!alasanLuar) {
      return {
        success: false,
        distance: distance,
        allowedRadius: allowedRadius,
        message: 'Anda berada di luar area sekolah (' + distance + ' m, radius: ' + allowedRadius + ' m). Harap sertakan keterangan alasan mengambil absen di luar radius.'
      };
    }
    keteranganPresensi = '[Luar Radius: ' + distance + 'm] ' + alasanLuar;
  } else {
    keteranganPresensi = payload.keterangan || (jenis === 'MASUK' ? 'Presensi Masuk (Dalam Radius)' : 'Presensi Pulang (Dalam Radius)');
  }

  // 5. Waktu Resmi Server (WIB / GMT+7)
  var now = new Date();
  var todayDateStr = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');
  var serverTimeStr = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm:ss');
  var currentMinutes = timeStringToMinutes(serverTimeStr);

  // 6. Pencegahan Absensi Ganda (Cek duplikasi pada tanggal dan tipe yang sama)
  var attendances = getRowsAsObjects(SHEET_NAMES.ABSENSI);
  for (var a = 0; a < attendances.length; a++) {
    var rec = attendances[a];
    var isSameGuru = (rec.guru_id === guru.guru_id) || (rec.niy && guru.niy && String(rec.niy).trim() === String(guru.niy).trim());
    if (isSameGuru && String(rec.tanggal).startsWith(todayDateStr) && rec.jenis === jenis) {
      return {
        success: false,
        message: 'Anda sudah melakukan Absen ' + jenis + ' hari ini pada pukul ' + rec.jam_server + ' WIB.'
      };
    }
  }

  // 7. Evaluasi Aturan Waktu & Status Kehadiran
  var statusKehadiran = 'Tepat Waktu';
  var jamMasukBatas = settings.jam_masuk_batas || '07:15';
  var toleransiMenit = parseInt(settings.toleransi_terlambat_menit || '15', 10);
  var jamPulangMulai = settings.jam_pulang_mulai || '15:30';

  if (jenis === 'MASUK') {
    var limitMinutes = timeStringToMinutes(jamMasukBatas) + toleransiMenit;
    if (currentMinutes > limitMinutes) {
      statusKehadiran = 'Terlambat';
    } else {
      statusKehadiran = 'Tepat Waktu';
    }
  } else if (jenis === 'PULANG') {
    var pulangMinutes = timeStringToMinutes(jamPulangMulai);
    if (currentMinutes < pulangMinutes) {
      statusKehadiran = 'Pulang Cepat';
    } else {
      statusKehadiran = 'Pulang Normal';
    }
  }

  // 8. Simpan Foto Selfie ke Google Drive (Opsional)
  var photoUrl = '-';
  if (payload.foto_base64 && String(payload.foto_base64).length > 50) {
    var filename = 'ABSEN_' + guru.niy + '_' + todayDateStr + '_' + jenis + '_' + Date.now() + '.jpg';
    photoUrl = saveBase64ImageToDrive(payload.foto_base64, filename);
  }

  // 9. Simpan Catatan ke Sheet ABSENSI
  var absenId = 'ABS-' + todayDateStr.replace(/-/g, '') + '-' + Utilities.getUuid().substring(0, 6).toUpperCase();

  var newAttendance = {
    absen_id: absenId,
    guru_id: guru.guru_id,
    niy: guru.niy,
    nama_guru: guru.nama_lengkap,
    sekolah_id: school.sekolah_id,
    tanggal: todayDateStr,
    jenis: jenis,
    jam_server: serverTimeStr,
    latitude: userLat,
    longitude: userLng,
    akurasi_gps: userAccuracy,
    jarak_meter: distance,
    status_kehadiran: statusKehadiran,
    foto_url: photoUrl,
    keterangan: keteranganPresensi
  };

  insertRow(SHEET_NAMES.ABSENSI, newAttendance);

  // Catat Audit Log
  logAudit(
    guru.niy,
    'ABSEN_' + jenis,
    'Berhasil absen ' + jenis + ' | Jarak: ' + distance + 'm | Status: ' + statusKehadiran + ' | Ket: ' + keteranganPresensi
  );

  return {
    success: true,
    message: 'Absensi ' + jenis + ' berhasil dicatat!',
    data: {
      absen_id: absenId,
      jenis: jenis,
      tanggal: todayDateStr,
      jam_server: serverTimeStr,
      jarak_meter: distance,
      radius_sekolah: allowedRadius,
      status_kehadiran: statusKehadiran,
      nama_guru: guru.nama_lengkap,
      nama_sekolah: school.nama_sekolah,
      foto_url: photoUrl,
      keterangan: keteranganPresensi
    }
  };
}

/**
 * Mengambil Riwayat Presensi Guru Pribadi.
 */
function getGuruAttendanceHistory(token, month, year) {
  var auth = validateToken(token);
  if (!auth.valid) return { success: false, message: auth.message };

  var user = auth.user;
  var allRecords = getRowsAsObjects(SHEET_NAMES.ABSENSI);
  var filtered = [];

  var targetMonth = month ? String(month).padStart(2, '0') : '';
  var targetYear = year ? String(year) : '';

  for (var i = allRecords.length - 1; i >= 0; i--) {
    var rec = allRecords[i];
    var isMatch = (user.ref_id && String(rec.guru_id).trim() === String(user.ref_id).trim()) ||
                  (user.username && String(rec.niy).trim() === String(user.username).trim()) ||
                  (user.niy && String(rec.niy).trim() === String(user.niy).trim());
    if (isMatch) {
      if (targetYear && targetMonth) {
        var recDate = String(rec.tanggal);
        if (recDate.startsWith(targetYear + '-' + targetMonth)) {
          filtered.push(rec);
        }
      } else {
        filtered.push(rec);
      }
    }
  }

  return {
    success: true,
    data: filtered.slice(0, 100) // Ambil 100 data terbaru
  };
}

/**
 * Menghitung Rekap Kehadiran Bulanan Guru.
 */
function getGuruMonthlyRecap(token, month, year) {
  var auth = validateToken(token);
  if (!auth.valid) return { success: false, message: auth.message };

  var user = auth.user;
  var now = new Date();
  var m = month ? String(month).padStart(2, '0') : Utilities.formatDate(now, 'Asia/Jakarta', 'MM');
  var y = year ? String(year) : Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy');
  var prefix = y + '-' + m;

  var allRecords = getRowsAsObjects(SHEET_NAMES.ABSENSI);

  var stats = {
    bulan: m,
    tahun: y,
    total_hadir: 0,
    tepat_waktu: 0,
    terlambat: 0,
    pulang_normal: 0,
    pulang_cepat: 0,
    hari_kerja_tercatat: {}
  };

  for (var i = 0; i < allRecords.length; i++) {
    var rec = allRecords[i];
    var isMatch = (user.ref_id && String(rec.guru_id).trim() === String(user.ref_id).trim()) ||
                  (user.username && String(rec.niy).trim() === String(user.username).trim()) ||
                  (user.niy && String(rec.niy).trim() === String(user.niy).trim());
    if (isMatch && String(rec.tanggal).startsWith(prefix)) {
      stats.hari_kerja_tercatat[rec.tanggal] = true;
      if (rec.jenis === 'MASUK') {
        stats.total_hadir++;
        if (rec.status_kehadiran === 'Tepat Waktu') stats.tepat_waktu++;
        else if (rec.status_kehadiran === 'Terlambat') stats.terlambat++;
      } else if (rec.jenis === 'PULANG') {
        if (rec.status_kehadiran === 'Pulang Normal') stats.pulang_normal++;
        else if (rec.status_kehadiran === 'Pulang Cepat') stats.pulang_cepat++;
      }
    }
  }

  stats.total_hari_absen = Object.keys(stats.hari_kerja_tercatat).length;
  delete stats.hari_kerja_tercatat;

  return { success: true, data: stats };
}

/**
 * Memeriksa status presensi hari ini untuk guru (apakah sudah masuk/pulang).
 */
function getTodayAttendanceStatus(token) {
  var auth = validateToken(token);
  if (!auth.valid) return { success: false, message: auth.message };

  var user = auth.user;
  var now = new Date();
  var todayDateStr = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');
  var serverTimeStr = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm:ss');

  var allRecords = getRowsAsObjects(SHEET_NAMES.ABSENSI);
  var recordMasuk = null;
  var recordPulang = null;

  for (var i = 0; i < allRecords.length; i++) {
    var rec = allRecords[i];
    var isMatch = (user.ref_id && String(rec.guru_id).trim() === String(user.ref_id).trim()) ||
                  (user.username && String(rec.niy).trim() === String(user.username).trim()) ||
                  (user.niy && String(rec.niy).trim() === String(user.niy).trim());
    if (isMatch && String(rec.tanggal).startsWith(todayDateStr)) {
      if (rec.jenis === 'MASUK') recordMasuk = rec;
      if (rec.jenis === 'PULANG') recordPulang = rec;
    }
  }

  return {
    success: true,
    serverDate: todayDateStr,
    serverTime: serverTimeStr,
    sudahMasuk: recordMasuk !== null,
    dataMasuk: recordMasuk,
    sudahPulang: recordPulang !== null,
    dataPulang: recordPulang
  };
}

