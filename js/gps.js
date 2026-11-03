/**
 * GPS & GEOLOCATION SERVICE
 * Menghitung jarak via Haversine, melacak koordinat presisi, dan visualisasi Leaflet Map
 */

const GpsService = {
  mapInstance: null,
  userMarker: null,
  schoolMarker: null,
  radiusCircle: null,
  onPositionUpdateCallback: null,

  /**
   * Menghitung Jarak Haversine (meter)
   */
  calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius bumi dalam meter
    const toRad = deg => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const rLat1 = toRad(lat1);
    const rLat2 = toRad(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rLat1) * Math.cos(rLat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10;
  },

  /**
   * Mengambil Posisi Pengguna Saat Ini Sekali (One-shot)
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Perangkat atau browser Anda tidak mendukung Geolocation GPS.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.handlePositionSuccess(pos);
          resolve(pos);
        },
        (err) => {
          this.handlePositionError(err);
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  },

  /**
   * Memulai Pemantauan GPS Real-Time (Watch Position)
   */
  startWatching(callback) {
    if (this.onPositionUpdateCallback !== callback) {
      this.onPositionUpdateCallback = callback;
    }

    if (!('geolocation' in navigator)) {
      AppState.gps.errorMessage = 'Geolocation tidak didukung pada browser ini.';
      if (this.onPositionUpdateCallback) this.onPositionUpdateCallback(AppState.gps);
      return;
    }

    if (AppState.gps.isWatching && AppState.gps.watchId !== null) {
      return; // Sudah berjalan
    }

    AppState.gps.isWatching = true;

    try {
      AppState.gps.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.handlePositionSuccess(pos);
          if (this.onPositionUpdateCallback) {
            this.onPositionUpdateCallback(AppState.gps);
          }
        },
        (err) => {
          this.handlePositionError(err);
          if (this.onPositionUpdateCallback) {
            this.onPositionUpdateCallback(AppState.gps);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 2000
        }
      );
    } catch (e) {
      console.warn('Gagal watchPosition:', e);
    }
  },

  /**
   * Menghentikan Pemantauan GPS
   */
  stopWatching() {
    if (AppState.gps.watchId !== null) {
      navigator.geolocation.clearWatch(AppState.gps.watchId);
      AppState.gps.watchId = null;
    }
    AppState.gps.isWatching = false;
  },

  /**
   * Handler Sukses Pembacaan Koordinat GPS
   */
  handlePositionSuccess(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;

    AppState.gps.lat = lat;
    AppState.gps.lng = lng;
    AppState.gps.accuracy = accuracy;
    AppState.gps.isActive = true;
    AppState.gps.errorMessage = null;
    AppState.gps.lastUpdated = new Date();

    // Hitung jarak ke sekolah aktif
    const target = AppState.targetSchool;
    const dist = this.calculateHaversine(lat, lng, target.lat, target.lng);
    AppState.gps.distance = dist;
    AppState.gps.insideRadius = dist <= target.radius;

    // Update peta interaktif jika sedang aktif
    this.updateMapPosition(lat, lng, target);
  },

  /**
   * Handler Error Pembacaan Koordinat GPS
   */
  handlePositionError(err) {
    AppState.gps.isActive = false;
    let message = 'Terjadi kesalahan saat mendeteksi GPS.';

    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = 'Izin Akses Lokasi Ditolak. Harap aktifkan izin lokasi di Pengaturan Browser/HP Anda agar dapat melakukan absensi.';
        break;
      case err.POSITION_UNAVAILABLE:
        message = 'Sinyal GPS tidak tersedia. Pastikan GPS/Lokasi HP sudah diaktifkan.';
        break;
      case err.TIMEOUT:
        message = 'Waktu pencarian GPS habis (Timeout). Cobalah berpindah ke area yang terbuka.';
        break;
    }

    AppState.gps.errorMessage = message;
    console.warn('[GPS Error]', message);
  },

  /**
   * Inisialisasi Peta Leaflet.js
   */
  initMap(containerId, centerLat, centerLng, zoom = 17) {
    if (!window.L) {
      console.warn('Leaflet.js belum dimuat.');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // Jika peta sudah ada di container ini, hapus dulu instance lama
    if (this.mapInstance) {
      try {
        this.mapInstance.remove();
      } catch (e) {}
      this.mapInstance = null;
    }

    this.mapInstance = L.map(containerId, {
      zoomControl: false,
      attributionControl: false
    }).setView([centerLat, centerLng], zoom);

    // Tile Layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.mapInstance);

    // Zoom control di kanan bawah
    L.control.zoom({ position: 'bottomright' }).addTo(this.mapInstance);

    // Tandai Sekolah & Lingkaran Radius
    this.renderSchoolGeofence(AppState.targetSchool);
  },

  /**
   * Render Marker Titik Sekolah dan Lingkaran Radius Toleransi
   */
  renderSchoolGeofence(school) {
    if (!this.mapInstance || !window.L) return;

    if (this.schoolMarker) this.mapInstance.removeLayer(this.schoolMarker);
    if (this.radiusCircle) this.mapInstance.removeLayer(this.radiusCircle);

    // Icon Sekolah Khusus
    const schoolIcon = L.divIcon({
      className: 'custom-school-pin',
      html: `<div style="background:#0B2545;color:#FCD34D;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;font-size:18px;">🏫</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    this.schoolMarker = L.marker([school.lat, school.lng], { icon: schoolIcon })
      .addTo(this.mapInstance)
      .bindPopup(`<b>${school.name}</b><br>Radius Absensi: ${school.radius} meter`);

    // Radius Circle
    this.radiusCircle = L.circle([school.lat, school.lng], {
      color: '#10B981',
      fillColor: '#10B981',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '4, 6',
      radius: school.radius
    }).addTo(this.mapInstance);
  },

  /**
   * Update Posisi Pengguna di Peta
   */
  updateMapPosition(lat, lng, school) {
    if (!this.mapInstance || !window.L) return;

    if (this.userMarker) {
      this.mapInstance.removeLayer(this.userMarker);
    }

    const isInside = AppState.gps.insideRadius;
    const pinColor = isInside ? '#10B981' : '#EF4444';

    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `
        <div style="position:relative;width:24px;height:24px;">
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:${pinColor};opacity:0.35;animation:pulsePin 1.5s infinite;"></div>
          <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:${pinColor};border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    this.userMarker = L.marker([lat, lng], { icon: userIcon })
      .addTo(this.mapInstance)
      .bindPopup(`<b>Posisi Anda</b><br>Jarak: ${AppState.gps.distance} m (${isInside ? 'Di Dalam Radius' : 'Di Luar Radius'})`);

    // Fit bounds untuk menampilkan sekolah dan user bersamaan jika peta baru dibuka
    const bounds = L.latLngBounds([
      [lat, lng],
      [school.lat, school.lng]
    ]);
    this.mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
  }
};

