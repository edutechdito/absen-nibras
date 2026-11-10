/**
 * ============================================================================
 * MAIN API ROUTER & CONTROLLER DISPATCHER
 * Perguruan Islam NIBRAS - Sistem Presensi Online Berbasis GPS
 * ============================================================================
 */

/**
 * Helper untuk merespons output JSON dengan format standar.
 */
function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * ROUTER HTTP GET
 * Digunakan untuk health check, inisialisasi awal, atau query ringan.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'ping';

    // Health check endpoint
    if (action === 'ping') {
      return jsonResponse({
        success: true,
        message: 'API Presensi NIBRAS Aktif & Siap Digunakan',
        serverTime: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
        timezone: 'Asia/Jakarta (WIB)'
      });
    }

    // Endpoint Inisialisasi Database (bisa diakses dengan parameter ?action=init_db)
    if (action === 'init_db') {
      var initResult = initDatabase();
      return jsonResponse(initResult);
    }

    // Mendapatkan Info Sekolah Publik (untuk dropdown login / setup)
    if (action === 'get_schools_public') {
      var schools = getRowsAsObjects(SHEET_NAMES.SEKOLAH).filter(function(s) {
        return s.status === 'aktif';
      });
      return jsonResponse({ success: true, data: schools });
    }

    return jsonResponse({
      success: false,
      message: 'Aksi GET "' + action + '" tidak didukung. Gunakan POST untuk transaksi data.'
    });

  } catch (error) {
    Logger.log('Error doGet: ' + error.toString());
    return jsonResponse({
      success: false,
      message: 'Terjadi kesalahan internal server: ' + error.message
    });
  }
}

/**
 * ROUTER HTTP POST
 * Menangani semua transaksi data, autentikasi, presensi GPS, dan administrasi.
 */
function doPost(e) {
  // LockService untuk mencegah Race Condition pada absensi serentak
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback jika dikirim via URL Encoded Form
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action;
    if (!action) {
      return jsonResponse({ success: false, message: 'Parameter "action" wajib disertakan.' });
    }

    // Acquire lock untuk aksi yang mengubah data kehadiran
    if (action === 'submit_attendance') {
      lockAcquired = lock.tryLock(10000); // Tunggu hingga 10 detik
      if (!lockAcquired) {
        return jsonResponse({
          success: false,
          message: 'Server sedang memproses antrian presensi lain. Silakan coba lagi dalam beberapa detik.'
        });
      }
    }

    var responseData;

    switch (action) {
      // -------------------------------------------------------------
      // 1. AUTENTIKASI PENGGUNA
      // -------------------------------------------------------------
      case 'login':
        responseData = loginUser(payload.username, payload.password);
        break;

      case 'login_niy':
        responseData = loginGuruByNiy(payload.niy);
        break;

      case 'logout':
        responseData = logoutUser(payload.token);
        break;

      case 'validate_session':
        var authCheck = validateToken(payload.token);
        responseData = {
          success: authCheck.valid,
          message: authCheck.message || '',
          user: authCheck.valid ? authCheck.user : null
        };
        break;

      case 'change_password':
        responseData = changePassword(payload.token, payload.old_password, payload.new_password);
        break;

      // -------------------------------------------------------------
      // 2. FITUR PRESENSI GURU
      // -------------------------------------------------------------
      case 'submit_attendance':
        responseData = submitAttendance(payload);
        break;

      case 'get_today_status':
        responseData = getTodayAttendanceStatus(payload.token);
        break;

      case 'get_guru_history':
        responseData = getGuruAttendanceHistory(payload.token, payload.month, payload.year);
        break;

      case 'get_guru_recap':
        responseData = getGuruMonthlyRecap(payload.token, payload.month, payload.year);
        break;

      // -------------------------------------------------------------
      // 3. FITUR ADMINISTRATOR
      // -------------------------------------------------------------
      case 'admin_dashboard_stats':
        responseData = getAdminDashboardStats(payload.token);
        break;

      case 'admin_attendance_records':
        responseData = getAdminAttendanceRecords(payload.token, payload.filters);
        break;

      case 'admin_crud_guru':
        responseData = adminCrudGuru(payload.token, payload.subAction, payload.data);
        break;

      case 'admin_crud_sekolah':
        responseData = adminCrudSekolah(payload.token, payload.subAction, payload.data);
        break;

      case 'admin_get_settings':
        responseData = adminGetSettings(payload.token);
        break;

      case 'admin_update_settings':
        responseData = adminUpdateSettings(payload.token, payload.settings);
        break;

      case 'admin_reset_password':
        responseData = adminResetPassword(payload.token, payload.user_id, payload.new_password);
        break;

      case 'admin_audit_logs':
        responseData = adminGetAuditLogs(payload.token, payload.limit);
        break;

      // -------------------------------------------------------------
      // 4. GENERAL
      // -------------------------------------------------------------
      case 'init_db':
        responseData = initDatabase();
        break;

      default:
        responseData = { success: false, message: 'Aksi API "' + action + '" tidak dikenali.' };
        break;
    }

    return jsonResponse(responseData);

  } catch (err) {
    Logger.log('Critical Error doPost: ' + err.stack || err.message);
    return jsonResponse({
      success: false,
      message: 'Kesalahan Server: ' + err.message
    });
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

