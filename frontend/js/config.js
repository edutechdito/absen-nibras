/**
 * KONFIGURASI APLIKASI PRESENSI PERGURUAN ISLAM NIBRAS
 */

const CONFIG = {
  // URL Web App Google Apps Script Aktif
  API_URL: 'https://script.google.com/macros/s/AKfycbx7ZkwnPBJkCorvCS6qb0Ctg7FDh2IpzOmGk-uuU3wrjTzc1Qy-biRSNCjROlSHUFNy/exec',

  // Nama Institusi
  APP_NAME: 'Presensi Online Perguruan Islam NIBRAS',
  INSTITUTION_NAME: 'PERGURUAN ISLAM NIBRAS',
  TAGLINE: 'Membentuk Generasi Berkarakter, Cerdas, dan Berakhlak Mulia',

  // Default Koordinat & Radius (Jika data sekolah belum dimuat dari server)
  DEFAULT_SCHOOL: {
    name: 'Perguruan Islam NIBRAS',
    latitude: -0.9247,
    longitude: 100.3603,
    radius: 60 // meter
  },

  // Konfigurasi GPS & Kamera
  GPS_MAX_ACCURACY: 100, // meter (di atas ini dianggap lemah)
  CAMERA_MAX_DIMENSION: 400, // px (resolusi kompresi foto selfie)
  CAMERA_QUALITY: 0.75, // kualitas kompresi JPEG

  // Storage Keys
  STORAGE_KEY_TOKEN: 'nibras_session_token',
  STORAGE_KEY_USER: 'nibras_user_data',
  STORAGE_KEY_API_URL: 'nibras_custom_api_url',

  // Mengambil API URL aktif (memungkinkan pengguna mengubah URL dari modal pengaturan aplikasi)
  getApiUrl() {
    const custom = localStorage.getItem(this.STORAGE_KEY_API_URL);
    if (custom && custom.trim() !== '' && !custom.includes('YOUR_SCRIPT_ID') && custom.startsWith('https://script.google.com/')) {
      return custom.trim();
    }
    return this.API_URL;
  },

  setApiUrl(url) {
    if (url) {
      localStorage.setItem(this.STORAGE_KEY_API_URL, url.trim());
    } else {
      localStorage.removeItem(this.STORAGE_KEY_API_URL);
    }
  }
};

