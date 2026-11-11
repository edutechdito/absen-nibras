/**
 * BIOMETRIC SERVICE - PRESENSI ONLINE PERGURUAN ISLAM NIBRAS
 * Menggunakan WebAuthn API untuk memverifikasi sensor sidik jari / Touch ID / Face ID bawaan HP.
 */
const BiometricService = {
  /**
   * Cek apakah perangkat HP mendukung sensor sidik jari / biometrik platform
   */
  async isAvailable() {
    try {
      if (!window.PublicKeyCredential) return false;
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') return false;
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  },

  /**
   * Memicu pop-up sensor sidik jari resmi dari sistem operasi HP
   * (Android Fingerprint / iPhone Touch ID / Face ID / Windows Hello)
   */
  async verifyBiometric(user = {}) {
    const isAvail = await this.isAvailable();
    if (!isAvail) {
      return { success: false, error: 'NOT_SUPPORTED', message: 'Perangkat tidak memiliki sensor sidik jari.' };
    }

    const cleanUsername = String(user.niy || user.username || 'pegawai_nibras').trim();
    const storageKey = `nibras_bio_cred_${cleanUsername}`;
    const existingCredId = localStorage.getItem(storageKey);

    // Buat token tantangan acak 32 bytes
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // 1. Coba verifikasi dengan credential yang sudah terdaftar sebelumnya
    if (existingCredId) {
      try {
        const rawId = this.base64ToUint8Array(existingCredId);
        const getOptions = {
          publicKey: {
            challenge: challenge,
            timeout: 60000,
            userVerification: 'required',
            allowCredentials: [{
              id: rawId,
              type: 'public-key',
              transports: ['internal']
            }]
          }
        };

        const assertion = await navigator.credentials.get(getOptions);
        if (assertion) {
          return { success: true, verified: true };
        }
      } catch (err) {
        console.warn('Biometric assertion gagal, beralih ke pembuatan kredensial baru:', err);
      }
    }

    // 2. Registrasi dan verifikasi langsung dengan sensor sidik jari
    try {
      const userId = new TextEncoder().encode(cleanUsername);

      const createOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Presensi GTK NIBRAS'
          },
          user: {
            id: userId,
            name: cleanUsername,
            displayName: user.nama_lengkap || cleanUsername
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Sensor sidik jari bawaan HP
            userVerification: 'required',        // Wajib verifikasi fisik
            residentKey: 'discouraged'
          },
          timeout: 60000,
          attestation: 'none'
        }
      };

      const credential = await navigator.credentials.create(createOptions);
      if (credential) {
        const credIdBase64 = this.uint8ArrayToBase64(new Uint8Array(credential.rawId));
        localStorage.setItem(storageKey, credIdBase64);
        return { success: true, verified: true };
      }

      return { success: false, error: 'UNKNOWN', message: 'Sensor sidik jari tidak menghasilkan respon.' };

    } catch (err) {
      const errName = err.name || '';
      const errMsg = err.message || '';

      if (errName === 'NotAllowedError' || errMsg.includes('canceled') || errMsg.includes('cancelled') || errMsg.includes('not allowed')) {
        return { success: false, error: 'CANCELLED', message: 'Verifikasi sidik jari dibatalkan.' };
      }
      if (errName === 'TimeoutError') {
        return { success: false, error: 'TIMEOUT', message: 'Waktu menyentuh sensor sidik jari habis. Silakan coba lagi.' };
      }

      return { success: false, error: 'FAILED', message: 'Sidik jari tidak cocok atau sensor tidak aktif: ' + errMsg };
    }
  },

  // Helper konversi Buffer <-> Base64
  uint8ArrayToBase64(uint8) {
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return window.btoa(binary);
  },

  base64ToUint8Array(base64) {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
};

