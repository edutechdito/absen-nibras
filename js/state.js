/**
 * STATE MANAGEMENT STORE
 * Menyimpan data sesi, GPS, Kamera, dan Status Presensi secara reaktif
 */

const AppState = {
  // Sesi Pengguna
  token: null,
  user: null, // { user_id, username, role, nama_lengkap, niy, jabatan, sekolah_id, sekolah_lat, sekolah_lng, sekolah_radius, ... }
  isAuthenticated: false,

  // GPS State
  gps: {
    lat: null,
    lng: null,
    accuracy: null, // meter
    distance: null, // meter ke sekolah aktif
    insideRadius: false,
    isActive: false,
    isWatching: false,
    watchId: null,
    errorMessage: null,
    lastUpdated: null
  },

  // Target Sekolah Aktif untuk Presensi
  targetSchool: {
    name: 'Perguruan Islam NIBRAS',
    lat: -0.923456,
    lng: 100.367890,
    radius: 60
  },

  // Kamera State
  camera: {
    stream: null,
    capturedImage: null, // Base64 JPEG string
    facingMode: 'user'
  },

  // Presensi Hari Ini
  todayAttendance: {
    serverDate: null,
    serverTime: null,
    sudahMasuk: false,
    dataMasuk: null,
    sudahPulang: false,
    dataPulang: null
  },

  // Cache Data Admin
  adminData: {
    stats: null,
    gurus: [],
    schools: [],
    attendances: [],
    settings: []
  },

  // Update State Target Sekolah berdasarkan data User Guru
  updateTargetSchoolFromUser() {
    if (this.user && this.user.role === 'guru') {
      this.targetSchool.name = this.user.nama_sekolah || CONFIG.DEFAULT_SCHOOL.name;
      this.targetSchool.lat = parseFloat(this.user.sekolah_lat) || CONFIG.DEFAULT_SCHOOL.latitude;
      this.targetSchool.lng = parseFloat(this.user.sekolah_lng) || CONFIG.DEFAULT_SCHOOL.longitude;
      this.targetSchool.radius = parseFloat(this.user.sekolah_radius) || CONFIG.DEFAULT_SCHOOL.radius;
    }
  },

  // Reset Sesi
  clearSession() {
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;
    this.todayAttendance = {
      serverDate: null,
      serverTime: null,
      sudahMasuk: false,
      dataMasuk: null,
      sudahPulang: false,
      dataPulang: null
    };
    localStorage.removeItem(CONFIG.STORAGE_KEY_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEY_USER);
  }
};

