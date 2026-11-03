/**
 * ADMINISTRATOR MODULE
 * Mengelola Master Data Guru, Sekolah & Radius GPS, Monitoring Absensi, Rekap Laporan & Pengaturan
 */

const AdminModule = {
  activeTab: 'dashboard',
  selectedAttendanceRecord: null,
  mapDetailInstance: null,

  /**
   * Inisialisasi Modul Admin
   */
  init() {
    this.setupAdminTabs();
    this.loadDashboardStats();
    this.loadSchoolsDropdown();
  },

  /**
   * Setup Tab Navigasi Admin
   */
  setupAdminTabs() {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-admin-tab');
        this.switchTab(target);
      });
    });
  },

  /**
   * Pindah Tab Admin
   */
  switchTab(tabName) {
    this.activeTab = tabName;

    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-admin-tab') === tabName);
    });

    document.querySelectorAll('.admin-tab-content').forEach(content => {
      content.style.display = 'none';
    });

    const targetEl = document.getElementById(`admin-tab-${tabName}`);
    if (targetEl) targetEl.style.display = 'block';

    if (tabName === 'dashboard') this.loadDashboardStats();
    else if (tabName === 'guru') this.loadGuruList();
    else if (tabName === 'sekolah') this.loadSekolahList();
    else if (tabName === 'absensi') this.loadAttendanceRecords();
    else if (tabName === 'laporan') this.setupReportSection();
    else if (tabName === 'pengaturan') this.loadSettingsForm();
    else if (tabName === 'logs') this.loadAuditLogs();
  },

  /**
   * Memuat Statistik Dashboard Real-time
   */
  async loadDashboardStats() {
    try {
      const res = await Api.getAdminStats(AppState.token);
      if (res.success && res.stats) {
        const s = res.stats;
        document.getElementById('stat-total-guru').textContent = s.totalGuru;
        document.getElementById('stat-hadir-today').textContent = s.hadirHariIni;
        document.getElementById('stat-tepat-waktu').textContent = s.tepatWaktuHariIni;
        document.getElementById('stat-terlambat').textContent = s.terlambatHariIni;
        document.getElementById('stat-belum-hadir').textContent = s.belumHadirHariIni;
        document.getElementById('stat-total-sekolah').textContent = s.totalSekolah;
      }
    } catch (e) {
      console.warn('Gagal memuat stats admin:', e);
    }
  },

  /**
   * Memuat Dropdown Data Unit Sekolah untuk Filter
   */
  async loadSchoolsDropdown() {
    try {
      const res = await Api.crudSekolah(AppState.token, 'LIST');
      if (res.success && res.data) {
        AppState.adminData.schools = res.data;
        const selects = ['filter-admin-sekolah', 'input-guru-sekolah', 'report-filter-sekolah'];
        selects.forEach(id => {
          const sel = document.getElementById(id);
          if (sel) {
            const currentVal = sel.value;
            sel.innerHTML = id.includes('filter') ? '<option value="">Semua Unit Sekolah</option>' : '';
            res.data.forEach(sch => {
              sel.innerHTML += `<option value="${sch.sekolah_id}">${sch.nama_sekolah}</option>`;
            });
            if (currentVal) sel.value = currentVal;
          }
        });
      }
    } catch (e) {}
  },

  // =============================================================
  // CRUD GURU
  // =============================================================
  async loadGuruList() {
    const tableBody = document.getElementById('table-guru-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Memuat data guru...</td></tr>';

    try {
      const res = await Api.crudGuru(AppState.token, 'LIST');
      if (res.success && res.data) {
        AppState.adminData.gurus = res.data;
        this.renderGuruTable(res.data);
      }
    } catch (e) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Gagal memuat data guru.</td></tr>';
    }
  },

  renderGuruTable(gurus) {
    const tableBody = document.getElementById('table-guru-body');
    if (!tableBody) return;

    if (gurus.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada data guru.</td></tr>';
      return;
    }

    tableBody.innerHTML = gurus.map((g, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><b>${g.niy}</b></td>
        <td>${g.nama_lengkap}</td>
        <td>${g.jabatan}</td>
        <td>${this.getSchoolName(g.sekolah_id)}</td>
        <td><span class="badge ${g.status === 'aktif' ? 'badge-success' : 'badge-danger'}">${g.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="AdminModule.openEditGuruModal('${g.guru_id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="AdminModule.deleteGuru('${g.guru_id}', '${g.nama_lengkap}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  },

  getSchoolName(sekolahId) {
    const sch = AppState.adminData.schools.find(s => s.sekolah_id === sekolahId);
    return sch ? sch.nama_sekolah : sekolahId || '-';
  },

  openAddGuruModal() {
    document.getElementById('modal-guru-title').textContent = 'Tambah Guru Baru';
    document.getElementById('form-guru').reset();
    document.getElementById('input-guru-id').value = '';
    document.getElementById('group-guru-password').style.display = 'block';
    document.getElementById('modal-guru').style.display = 'flex';
  },

  openEditGuruModal(guruId) {
    const guru = AppState.adminData.gurus.find(g => g.guru_id === guruId);
    if (!guru) return;

    document.getElementById('modal-guru-title').textContent = 'Edit Data Guru';
    document.getElementById('input-guru-id').value = guru.guru_id;
    document.getElementById('input-guru-niy').value = guru.niy;
    document.getElementById('input-guru-nama').value = guru.nama_lengkap;
    document.getElementById('input-guru-tempat').value = guru.tempat_lahir || '';
    document.getElementById('input-guru-tanggal').value = guru.tanggal_lahir || '';
    document.getElementById('input-guru-jabatan').value = guru.jabatan || '';
    document.getElementById('input-guru-sekolah').value = guru.sekolah_id || '';
    document.getElementById('input-guru-hp').value = guru.no_hp || '';
    document.getElementById('input-guru-email').value = guru.email || '';
    document.getElementById('input-guru-status').value = guru.status || 'aktif';

    // Sembunyikan field password saat edit biasa (ada tombol reset terpisah)
    document.getElementById('group-guru-password').style.display = 'none';

    document.getElementById('modal-guru').style.display = 'flex';
  },

  async handleSaveGuru(e) {
    e.preventDefault();
    const guruId = document.getElementById('input-guru-id').value;
    const isEdit = !!guruId;

    const data = {
      guru_id: guruId,
      niy: document.getElementById('input-guru-niy').value.trim(),
      nama_lengkap: document.getElementById('input-guru-nama').value.trim(),
      tempat_lahir: document.getElementById('input-guru-tempat').value.trim(),
      tanggal_lahir: document.getElementById('input-guru-tanggal').value,
      jabatan: document.getElementById('input-guru-jabatan').value.trim(),
      sekolah_id: document.getElementById('input-guru-sekolah').value,
      no_hp: document.getElementById('input-guru-hp').value.trim(),
      email: document.getElementById('input-guru-email').value.trim(),
      status: document.getElementById('input-guru-status').value
    };

    if (!isEdit) {
      data.password = document.getElementById('input-guru-password').value || 'guru123';
    }

    App.showLoading(true, 'Menyimpan data guru...');
    try {
      const subAction = isEdit ? 'UPDATE' : 'CREATE';
      const res = await Api.crudGuru(AppState.token, subAction, data);
      App.showLoading(false);

      if (res.success) {
        App.showToast(res.message || 'Data guru tersimpan.', 'success');
        document.getElementById('modal-guru').style.display = 'none';
        this.loadGuruList();
      } else {
        App.showToast(res.message || 'Gagal menyimpan guru.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Kesalahan server: ' + err.message, 'danger');
    }
  },

  async deleteGuru(guruId, nama) {
    if (confirm(`Yakin ingin menghapus data guru "${nama}" beserta akun loginnya?`)) {
      App.showLoading(true, 'Menghapus data...');
      try {
        const res = await Api.crudGuru(AppState.token, 'DELETE', { guru_id: guruId });
        App.showLoading(false);
        if (res.success) {
          App.showToast('Data guru berhasil dihapus.', 'success');
          this.loadGuruList();
        } else {
          App.showToast(res.message || 'Gagal menghapus.', 'danger');
        }
      } catch (e) {
        App.showLoading(false);
        App.showToast('Kesalahan: ' + e.message, 'danger');
      }
    }
  },

  // =============================================================
  // CRUD SEKOLAH & TITIK GPS
  // =============================================================
  async loadSekolahList() {
    const tableBody = document.getElementById('table-sekolah-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Memuat unit sekolah...</td></tr>';

    try {
      const res = await Api.crudSekolah(AppState.token, 'LIST');
      if (res.success && res.data) {
        AppState.adminData.schools = res.data;
        this.renderSekolahTable(res.data);
      }
    } catch (e) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Gagal memuat unit sekolah.</td></tr>';
    }
  },

  renderSekolahTable(schools) {
    const tableBody = document.getElementById('table-sekolah-body');
    if (!tableBody) return;

    tableBody.innerHTML = schools.map((s, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><b>${s.nama_sekolah}</b></td>
        <td>${s.alamat || '-'}</td>
        <td><span class="mono">${s.latitude}, ${s.longitude}</span></td>
        <td><b>${s.radius_meter} meter</b></td>
        <td><span class="badge ${s.status === 'aktif' ? 'badge-success' : 'badge-danger'}">${s.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="AdminModule.openEditSekolahModal('${s.sekolah_id}')">Edit Titik</button>
          <button class="btn btn-sm btn-danger" onclick="AdminModule.deleteSekolah('${s.sekolah_id}', '${s.nama_sekolah}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  },

  openAddSekolahModal() {
    document.getElementById('modal-sekolah-title').textContent = 'Tambah Unit Sekolah';
    document.getElementById('form-sekolah').reset();
    document.getElementById('input-sekolah-id').value = '';
    document.getElementById('input-sekolah-radius').value = '50';
    document.getElementById('modal-sekolah').style.display = 'flex';
  },

  openEditSekolahModal(sekolahId) {
    const sch = AppState.adminData.schools.find(s => s.sekolah_id === sekolahId);
    if (!sch) return;

    document.getElementById('modal-sekolah-title').textContent = 'Edit Titik Koordinat & Radius Sekolah';
    document.getElementById('input-sekolah-id').value = sch.sekolah_id;
    document.getElementById('input-sekolah-nama').value = sch.nama_sekolah;
    document.getElementById('input-sekolah-alamat').value = sch.alamat || '';
    document.getElementById('input-sekolah-lat').value = sch.latitude;
    document.getElementById('input-sekolah-lng').value = sch.longitude;
    document.getElementById('input-sekolah-radius').value = sch.radius_meter || 50;
    document.getElementById('input-sekolah-status').value = sch.status || 'aktif';

    document.getElementById('modal-sekolah').style.display = 'flex';
  },

  async handleSaveSekolah(e) {
    e.preventDefault();
    const sekolahId = document.getElementById('input-sekolah-id').value;
    const isEdit = !!sekolahId;

    const data = {
      sekolah_id: sekolahId,
      nama_sekolah: document.getElementById('input-sekolah-nama').value.trim(),
      alamat: document.getElementById('input-sekolah-alamat').value.trim(),
      latitude: parseFloat(document.getElementById('input-sekolah-lat').value),
      longitude: parseFloat(document.getElementById('input-sekolah-lng').value),
      radius_meter: parseInt(document.getElementById('input-sekolah-radius').value, 10),
      status: document.getElementById('input-sekolah-status').value
    };

    App.showLoading(true, 'Menyimpan unit sekolah...');
    try {
      const subAction = isEdit ? 'UPDATE' : 'CREATE';
      const res = await Api.crudSekolah(AppState.token, subAction, data);
      App.showLoading(false);

      if (res.success) {
        App.showToast('Data sekolah & koordinat berhasil disimpan.', 'success');
        document.getElementById('modal-sekolah').style.display = 'none';
        this.loadSekolahList();
        this.loadSchoolsDropdown();
      } else {
        App.showToast(res.message || 'Gagal menyimpan.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Kesalahan server: ' + err.message, 'danger');
    }
  },

  async deleteSekolah(sekolahId, nama) {
    if (confirm(`Yakin ingin menghapus unit sekolah "${nama}"?`)) {
      App.showLoading(true, 'Menghapus unit sekolah...');
      try {
        const res = await Api.crudSekolah(AppState.token, 'DELETE', { sekolah_id: sekolahId });
        App.showLoading(false);
        if (res.success) {
          App.showToast('Unit sekolah berhasil dihapus.', 'success');
          this.loadSekolahList();
        } else {
          App.showToast(res.message || 'Gagal menghapus.', 'danger');
        }
      } catch (e) {
        App.showLoading(false);
        App.showToast('Kesalahan: ' + e.message, 'danger');
      }
    }
  },

  // Mengisi latitude & longitude dari GPS lokasi saat ini
  fillCurrentCoordsToForm() {
    App.showLoading(true, 'Mengambil koordinat GPS saat ini...');
    GpsService.getCurrentPosition()
      .then(pos => {
        App.showLoading(false);
        document.getElementById('input-sekolah-lat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('input-sekolah-lng').value = pos.coords.longitude.toFixed(6);
        App.showToast(`Koordinat berhasil diambil! (Akurasi: ±${Math.round(pos.coords.accuracy)}m)`, 'success');
      })
      .catch(err => {
        App.showLoading(false);
        App.showToast('Gagal membaca GPS: ' + err.message, 'danger');
      });
  },

  // =============================================================
  // MONITORING TRANSAKSI ABSENSI & DETAIL PETA
  // =============================================================
  async loadAttendanceRecords() {
    const tableBody = document.getElementById('table-absensi-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Memuat catatan presensi...</td></tr>';

    const filters = {
      tanggal: document.getElementById('filter-admin-tanggal').value,
      sekolah_id: document.getElementById('filter-admin-sekolah').value,
      jenis: document.getElementById('filter-admin-jenis').value,
      search: document.getElementById('filter-admin-search').value
    };

    try {
      const res = await Api.getAdminAttendanceRecords(AppState.token, filters);
      if (res.success && res.data) {
        AppState.adminData.attendances = res.data;
        this.renderAttendanceTable(res.data);
      }
    } catch (e) {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Gagal memuat absensi.</td></tr>';
    }
  },

  renderAttendanceTable(records) {
    const tableBody = document.getElementById('table-absensi-body');
    if (!tableBody) return;

    if (records.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada transaksi absensi yang sesuai filter.</td></tr>';
      return;
    }

    tableBody.innerHTML = records.map((r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${r.tanggal}<br><small class="text-muted">${r.jam_server} WIB</small></td>
        <td><b>${r.nama_guru}</b><br><small class="text-muted">NIY: ${r.niy}</small></td>
        <td><span class="badge ${r.jenis === 'MASUK' ? 'badge-primary' : 'badge-info'}">${r.jenis}</span></td>
        <td>
          <span class="status-tag ${r.status_kehadiran === 'Tepat Waktu' || r.status_kehadiran === 'Pulang Normal' ? 'tag-good' : 'tag-warn'}">
            ${r.status_kehadiran}
          </span>
        </td>
        <td>${r.jarak_meter} m <br><small class="text-muted">±${Math.round(r.akurasi_gps || 0)}m</small></td>
        <td>${this.getSchoolName(r.sekolah_id)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="AdminModule.viewAttendanceDetail('${r.absen_id}')">
            📍 Peta & Foto
          </button>
        </td>
      </tr>
    `).join('');
  },

  /**
   * Menampilkan Detail Absensi pada Modal Lengkap dengan Peta dan Foto Selfie
   */
  viewAttendanceDetail(absenId) {
    const rec = AppState.adminData.attendances.find(a => a.absen_id === absenId);
    if (!rec) return;

    this.selectedAttendanceRecord = rec;

    document.getElementById('modal-detail-nama').textContent = rec.nama_guru;
    document.getElementById('modal-detail-niy').textContent = `NIY: ${rec.niy} | ${rec.jenis} (${rec.jam_server} WIB)`;
    document.getElementById('modal-detail-info').innerHTML = `
      <b>Tanggal:</b> ${rec.tanggal} | <b>Status:</b> ${rec.status_kehadiran}<br>
      <b>Jarak:</b> ${rec.jarak_meter} meter dari sekolah (Akurasi GPS: ±${Math.round(rec.akurasi_gps || 0)}m)<br>
      <b>Koordinat Pengguna:</b> <span class="mono">${rec.latitude}, ${rec.longitude}</span>
    `;

    // Foto selfie preview
    const photoContainer = document.getElementById('modal-detail-photo');
    if (rec.foto_url) {
      photoContainer.innerHTML = `<img src="${rec.foto_url}" alt="Foto Selfie ${rec.nama_guru}" style="max-width:100%;max-height:220px;border-radius:12px;border:2px solid #E2E8F0;">`;
    } else {
      photoContainer.innerHTML = `<div class="empty-photo">Tidak ada lampiran foto selfie.</div>`;
    }

    const modal = document.getElementById('modal-absen-detail');
    modal.style.display = 'flex';

    // Inisialisasi peta interaktif di dalam modal
    setTimeout(() => {
      this.renderDetailMap(rec);
    }, 250);
  },

  renderDetailMap(rec) {
    if (!window.L) return;

    const mapContainer = document.getElementById('detail-map-container');
    if (!mapContainer) return;

    if (this.mapDetailInstance) {
      try { this.mapDetailInstance.remove(); } catch(e) {}
      this.mapDetailInstance = null;
    }

    const userLat = parseFloat(rec.latitude);
    const userLng = parseFloat(rec.longitude);

    this.mapDetailInstance = L.map('detail-map-container', {
      zoomControl: false,
      attributionControl: false
    }).setView([userLat, userLng], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.mapDetailInstance);
    L.control.zoom({ position: 'bottomright' }).addTo(this.mapDetailInstance);

    // Marker Guru
    const userPin = L.marker([userLat, userLng])
      .addTo(this.mapDetailInstance)
      .bindPopup(`<b>${rec.nama_guru}</b><br>Jarak: ${rec.jarak_meter} m`)
      .openPopup();

    // Ambil koordinat sekolah terkait
    const sch = AppState.adminData.schools.find(s => s.sekolah_id === rec.sekolah_id);
    if (sch) {
      const schLat = parseFloat(sch.latitude);
      const schLng = parseFloat(sch.longitude);

      L.marker([schLat, schLng])
        .addTo(this.mapDetailInstance)
        .bindPopup(`<b>${sch.nama_sekolah}</b>`);

      L.circle([schLat, schLng], {
        color: '#10B981',
        fillColor: '#10B981',
        fillOpacity: 0.15,
        radius: sch.radius_meter || 50
      }).addTo(this.mapDetailInstance);

      const bounds = L.latLngBounds([[userLat, userLng], [schLat, schLng]]);
      this.mapDetailInstance.fitBounds(bounds, { padding: [30, 30] });
    }
  },

  // =============================================================
  // REKAP & LAPORAN (EXCEL & CETAK PDF)
  // =============================================================
  setupReportSection() {
    const today = new Date().toISOString().split('T')[0];
    const elStart = document.getElementById('report-date-start');
    const elEnd = document.getElementById('report-date-end');
    if (elStart && !elStart.value) elStart.value = today;
    if (elEnd && !elEnd.value) elEnd.value = today;
  },

  async generateReport() {
    const startDate = document.getElementById('report-date-start').value;
    const endDate = document.getElementById('report-date-end').value;
    const sekolahId = document.getElementById('report-filter-sekolah').value;

    App.showLoading(true, 'Menghasilkan rekap laporan...');

    try {
      // Ambil seluruh data absensi
      const res = await Api.getAdminAttendanceRecords(AppState.token, { sekolah_id: sekolahId });
      App.showLoading(false);

      if (res.success && res.data) {
        // Filter rentang tanggal
        const filtered = res.data.filter(r => {
          if (startDate && r.tanggal < startDate) return false;
          if (endDate && r.tanggal > endDate) return false;
          return true;
        });

        this.renderReportPreview(filtered, startDate, endDate);
      }
    } catch (e) {
      App.showLoading(false);
      App.showToast('Gagal membuat laporan: ' + e.message, 'danger');
    }
  },

  renderReportPreview(records, startDate, endDate) {
    const container = document.getElementById('report-preview-container');
    if (!container) return;

    if (records.length === 0) {
      container.innerHTML = '<div class="empty-state">Tidak ada data kehadiran pada periode tanggal yang dipilih.</div>';
      return;
    }

    container.innerHTML = `
      <div class="report-paper printable">
        <div class="report-header">
          <div class="report-logo">NIBRAS</div>
          <div class="report-meta">
            <h2>PERGURUAN ISLAM NIBRAS</h2>
            <h3>REKAPITULASI PRESENSI GURU & TENAGA KEPENDIDIKAN BERBASIS GPS</h3>
            <p>Periode: <b>${startDate}</b> s/d <b>${endDate}</b></p>
          </div>
        </div>
        <hr class="report-divider">
        <table class="report-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>NIY</th>
              <th>Nama Lengkap</th>
              <th>Jenis</th>
              <th>Jam (WIB)</th>
              <th>Status</th>
              <th>Jarak</th>
              <th>Sekolah</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.tanggal}</td>
                <td>${r.niy}</td>
                <td>${r.nama_guru}</td>
                <td>${r.jenis}</td>
                <td>${r.jam_server}</td>
                <td>${r.status_kehadiran}</td>
                <td>${r.jarak_meter} m</td>
                <td>${this.getSchoolName(r.sekolah_id)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="report-footer">
          <p>Dicetak otomatis melalui Sistem Presensi Online Perguruan Islam NIBRAS pada: ${new Date().toLocaleString('id-ID')}</p>
        </div>
      </div>
    `;

    document.getElementById('report-actions').style.display = 'flex';
  },

  /**
   * Ekspor Laporan ke Format Excel (CSV)
   */
  exportToCsv() {
    const table = document.querySelector('.report-table');
    if (!table) {
      App.showToast('Silakan generate preview laporan terlebih dahulu.', 'warning');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      const cols = row.querySelectorAll('th, td');
      const rowData = [];
      cols.forEach(col => {
        let text = col.innerText.replace(/"/g, '""');
        rowData.push(`"${text}"`);
      });
      csvContent += rowData.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Presensi_NIBRAS_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    App.showToast('Laporan Excel (CSV) berhasil diunduh.', 'success');
  },

  /**
   * Cetak Laporan / Simpan PDF Browser
   */
  printReport() {
    window.print();
  },

  // =============================================================
  // PENGATURAN OPERASIONAL SISTEM
  // =============================================================
  async loadSettingsForm() {
    try {
      const res = await Api.getAdminSettings(AppState.token);
      if (res.success && res.data) {
        res.data.forEach(item => {
          const el = document.getElementById(`setting-${item.setting_key}`);
          if (el) el.value = item.setting_value;
        });
      }
    } catch (e) {}
  },

  async handleSaveSettings(e) {
    e.preventDefault();
    const settings = [
      { setting_key: 'jam_masuk_mulai', setting_value: document.getElementById('setting-jam_masuk_mulai').value },
      { setting_key: 'jam_masuk_batas', setting_value: document.getElementById('setting-jam_masuk_batas').value },
      { setting_key: 'toleransi_terlambat_menit', setting_value: document.getElementById('setting-toleransi_terlambat_menit').value },
      { setting_key: 'jam_pulang_mulai', setting_value: document.getElementById('setting-jam_pulang_mulai').value },
      { setting_key: 'max_gps_accuracy', setting_value: document.getElementById('setting-max_gps_accuracy').value },
      { setting_key: 'default_radius', setting_value: document.getElementById('setting-default_radius').value }
    ];

    App.showLoading(true, 'Menyimpan pengaturan...');
    try {
      const res = await Api.updateAdminSettings(AppState.token, settings);
      App.showLoading(false);
      if (res.success) {
        App.showToast('Pengaturan sistem berhasil diperbarui.', 'success');
      } else {
        App.showToast(res.message || 'Gagal menyimpan.', 'danger');
      }
    } catch (err) {
      App.showLoading(false);
      App.showToast('Kesalahan server: ' + err.message, 'danger');
    }
  },

  // =============================================================
  // AUDIT LOGS
  // =============================================================
  async loadAuditLogs() {
    const tableBody = document.getElementById('table-logs-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Memuat audit log...</td></tr>';

    try {
      const res = await Api.getAdminLogs(AppState.token, 50);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada riwayat log.</td></tr>';
          return;
        }

        tableBody.innerHTML = res.data.map((l, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><small class="mono">${l.timestamp}</small></td>
            <td><b>${l.user_id}</b></td>
            <td><span class="badge badge-secondary">${l.action}</span></td>
            <td>${l.detail}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Gagal memuat log.</td></tr>';
    }
  }
};

