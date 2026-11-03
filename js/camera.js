/**
 * CAMERA & SELFIE VERIFICATION ENGINE
 * Mengakses kamera depan smartphone untuk foto selfie presensi dan kompresi kanvas
 */

const CameraService = {
  stream: null,
  videoElement: null,
  canvasElement: null,
  capturedBase64: null,

  /**
   * Mengaktifkan Kamera Depan Smartphone
   */
  async startCamera(videoElementId) {
    this.videoElement = document.getElementById(videoElementId);
    if (!this.videoElement) return false;

    // Hentikan stream aktif sebelumnya jika ada
    this.stopCamera();

    // Cek ketersediaan mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('WebRTC getUserMedia tidak didukung pada browser ini.');
      return false;
    }

    try {
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'user' }, // Prioritaskan kamera depan
          width: { ideal: 480 },
          height: { ideal: 480 }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      this.videoElement.setAttribute('playsinline', 'true'); // Wajib untuk iOS Safari
      await this.videoElement.play();

      AppState.camera.stream = this.stream;
      return true;

    } catch (err) {
      console.warn('Gagal mengakses kamera depan:', err);
      return false;
    }
  },

  /**
   * Menghentikan Stream Kamera (Hemat Baterai & Privasi)
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    AppState.camera.stream = null;
  },

  /**
   * Mengambil Snapshot Foto dari Video Stream dan Mengompresinya
   */
  captureSnapshot(canvasElementId) {
    if (!this.videoElement || !this.stream) {
      return null;
    }

    let canvas = document.getElementById(canvasElementId);
    if (!canvas) {
      canvas = document.createElement('canvas');
    }

    const video = this.videoElement;
    const vWidth = video.videoWidth || 320;
    const vHeight = video.videoHeight || 320;

    // Potong tengah (Center Crop) agar persegi (1:1)
    const minDim = Math.min(vWidth, vHeight);
    const startX = (vWidth - minDim) / 2;
    const startY = (vHeight - minDim) / 2;

    const targetDim = Math.min(minDim, CONFIG.CAMERA_MAX_DIMENSION || 400);
    canvas.width = targetDim;
    canvas.height = targetDim;

    const ctx = canvas.getContext('2d');
    // Mirroring horizontal seperti cermin selfie biasa
    ctx.translate(targetDim, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);

    // Ambil Data URL JPEG terkompresi
    const base64Data = canvas.toDataURL('image/jpeg', CONFIG.CAMERA_QUALITY || 0.75);
    this.capturedBase64 = base64Data;
    AppState.camera.capturedImage = base64Data;

    return base64Data;
  },

  /**
   * Menangani Fallback jika pengguna mengambil foto lewat input file
   */
  processFileInput(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Tidak ada file yang dipilih.'));

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = CONFIG.CAMERA_MAX_DIMENSION || 400;
          let w = img.width;
          let h = img.height;

          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const compressed = canvas.toDataURL('image/jpeg', CONFIG.CAMERA_QUALITY || 0.75);
          this.capturedBase64 = compressed;
          AppState.camera.capturedImage = compressed;
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Format gambar tidak valid.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Reset foto yang sudah diambil
   */
  resetCapture() {
    this.capturedBase64 = null;
    AppState.camera.capturedImage = null;
  }
};

