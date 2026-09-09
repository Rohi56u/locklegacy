/* =====================================================================
   LegacyLock — crypto.js (FRONTEND, not backend)
   Zero-knowledge client-side encryption using the native Web Crypto API.
   No external libraries, no build step — drop this in next to app.js
   and load it BEFORE app.js:
       <script src="crypto.js"></script>
       <script src="app.js"></script>

   THE MODEL
   ----------------------------------------------------------------
   - The vault passphrase (create_vault_passphrase screen) never leaves
     this file, is never sent to the server, and is never stored anywhere
     — not in localStorage, not in a variable that outlives the unlock
     flow.
   - It derives a Key-Encryption-Key (KEK) via PBKDF2-SHA256 (600,000
     iterations, per current OWASP guidance for PBKDF2). The KEK unwraps
     a randomly generated Data-Encryption-Key (DEK); the DEK is what
     actually encrypts/decrypts vault records with AES-256-GCM.
   - The DEK is wrapped TWICE — once under the passphrase-derived KEK,
     once under a key derived from a separately generated Recovery Key
     (the "recovery kit"). Either secret independently unlocks the vault;
     the server only ever stores the two wrapped copies + salts, never
     an unwrapped DEK, the passphrase, or the recovery key.
   - Once unlocked, the DEK lives ONLY in memory (a module-level
     variable) for the session. Reloading the page requires unlocking
     again. This is deliberate: persisting the unwrapped DEK anywhere
     durable (localStorage, IndexedDB) defeats the entire point of a
     zero-knowledge design — anyone with access to the device could then
     read the vault without ever knowing the passphrase.

   WHAT THIS DOES NOT PROTECT AGAINST
   ----------------------------------------------------------------
   Be upfront with users about this, don't oversell it: a compromised
   browser (malicious extension, XSS on this origin, keylogger) can
   capture the passphrase at entry time or read the DEK out of memory
   while unlocked. Zero-knowledge encryption protects the data at rest
   against a compromised SERVER/database — it is not magic protection
   against a compromised client. Serve this over HTTPS only, keep a
   strict CSP, and treat XSS prevention as security-critical, not
   cosmetic.
   ===================================================================== */

(function () {
  'use strict';

  var PBKDF2_ITERATIONS = 600000;
  var subtle = window.crypto.subtle;

  // ---- encoding helpers ----
  function bufToB64(buf) {
    var bytes = new Uint8Array(buf);
    var bin = '';
    for (var i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToBuf(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function randomBytes(n) { return window.crypto.getRandomValues(new Uint8Array(n)); }

  // ---- key derivation (passphrase or recovery key -> KEK) ----
  async function deriveKEK(secret, saltB64, iterations) {
    var baseKey = await subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey(
      { name: 'PBKDF2', salt: b64ToBuf(saltB64), iterations: iterations || PBKDF2_ITERATIONS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function generateSalt() { return bufToB64(randomBytes(16)); }

  // ---- the vault's Data Encryption Key (DEK) ----
  async function generateDEK() {
    return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }

  async function wrapDEK(dek, kek) {
    var iv = randomBytes(12);
    var raw = await subtle.exportKey('raw', dek);
    var wrapped = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, kek, raw);
    return { wrapped: bufToB64(wrapped), iv: bufToB64(iv) };
  }

  async function unwrapDEK(wrappedB64, ivB64, kek) {
    var raw = await subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(ivB64) }, kek, b64ToBuf(wrappedB64));
    return subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
  }

  // ---- a human-manageable recovery key, e.g. "K7F2-9XQP-3MRT-8LWZ-2VBN-6HDC" ----
  function generateRecoveryKey() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
    var groups = [];
    for (var g = 0; g < 6; g++) {
      var chars = randomBytes(4);
      var group = '';
      for (var i = 0; i < 4; i++) group += alphabet[chars[i] % alphabet.length];
      groups.push(group);
    }
    return groups.join('-');
  }

  // ---- record encryption using the (unwrapped, in-memory) DEK ----
  async function encryptRecord(dek, plainObject) {
    var iv = randomBytes(12);
    var data = new TextEncoder().encode(JSON.stringify(plainObject));
    var ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, dek, data);
    return { ciphertext: bufToB64(ciphertext), iv: bufToB64(iv) };
  }

  async function decryptRecord(dek, ciphertextB64, ivB64) {
    var plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(ivB64) }, dek, b64ToBuf(ciphertextB64));
    return JSON.parse(new TextDecoder().decode(plainBuf));
  }

  // ---- session-scoped DEK holder: memory only, never persisted ----
  var _sessionDEK = null;
  function setSessionDEK(dek) { _sessionDEK = dek; }
  function getSessionDEK() { return _sessionDEK; }
  function clearSessionDEK() { _sessionDEK = null; }

  /**
   * First-time setup (create_vault_passphrase screen). Returns everything
   * that's safe to send to the server, plus the one-time recovery key to
   * show the user (it cannot be retrieved again — that's the point).
   */
  async function setupVault(passphrase) {
    var dek = await generateDEK();

    var kdfSalt = generateSalt();
    var passphraseKEK = await deriveKEK(passphrase, kdfSalt, PBKDF2_ITERATIONS);
    var wrappedForPassphrase = await wrapDEK(dek, passphraseKEK);

    var recoveryKey = generateRecoveryKey();
    var recoveryKdfSalt = generateSalt();
    var recoveryKEK = await deriveKEK(recoveryKey, recoveryKdfSalt, PBKDF2_ITERATIONS);
    var wrappedForRecovery = await wrapDEK(dek, recoveryKEK);

    setSessionDEK(dek);

    return {
      // -> send this object to POST /vault/setup ; recoveryKey is for
      // display ONLY, never transmitted or stored anywhere.
      serverPayload: {
        kdfSalt: kdfSalt,
        kdfIterations: PBKDF2_ITERATIONS,
        wrappedDekPassphrase: wrappedForPassphrase.wrapped,
        wrappedDekPassphraseIv: wrappedForPassphrase.iv,
        recoveryKdfSalt: recoveryKdfSalt,
        wrappedDekRecovery: wrappedForRecovery.wrapped,
        wrappedDekRecoveryIv: wrappedForRecovery.iv
      },
      recoveryKeyForDisplay: recoveryKey
    };
  }

  /** Unlock with the passphrase, given the wrapped material the server returned. */
  async function unlockWithPassphrase(passphrase, serverRecord) {
    var kek = await deriveKEK(passphrase, serverRecord.kdfSalt, serverRecord.kdfIterations || PBKDF2_ITERATIONS);
    var dek = await unwrapDEK(serverRecord.wrappedDekPassphrase, serverRecord.wrappedDekPassphraseIv, kek);
    setSessionDEK(dek);
    return dek;
  }

  /** Unlock with the recovery key instead (passphrase forgotten). */
  async function unlockWithRecoveryKey(recoveryKey, serverRecord) {
    var kek = await deriveKEK(recoveryKey, serverRecord.recoveryKdfSalt, serverRecord.kdfIterations || PBKDF2_ITERATIONS);
    var dek = await unwrapDEK(serverRecord.wrappedDekRecovery, serverRecord.wrappedDekRecoveryIv, kek);
    setSessionDEK(dek);
    return dek;
  }

  /**
   * Seals a THIRD copy of the DEK for eventual nominee release, under a
   * "release passphrase" the owner sets once and tells trusted nominees
   * OUT OF BAND (verbally, in a will, in a sealed letter) — this string
   * is never sent to or stored by the server, exactly like the vault
   * passphrase and recovery key. Call this once, typically right after
   * setupVault(), and send serverPayload to POST /vault/nominee-seal.
   */
  async function sealForNomineeRelease(dek, releasePassphrase) {
    var salt = generateSalt();
    var kek = await deriveKEK(releasePassphrase, salt, PBKDF2_ITERATIONS);
    var wrapped = await wrapDEK(dek, kek);
    return { serverPayload: { nomineeKdfSalt: salt, wrappedDekNominee: wrapped.wrapped, wrappedDekNomineeIv: wrapped.iv } };
  }

  /** What a verified nominee calls once LegacyLock releases the sealed envelope to them. */
  async function unlockWithReleasePassphrase(releasePassphrase, serverRecord) {
    var kek = await deriveKEK(releasePassphrase, serverRecord.nomineeKdfSalt, serverRecord.kdfIterations || PBKDF2_ITERATIONS);
    var dek = await unwrapDEK(serverRecord.wrappedDekNominee, serverRecord.wrappedDekNomineeIv, kek);
    setSessionDEK(dek);
    return dek;
  }

  window.LLCrypto = {
    setupVault: setupVault,
    unlockWithPassphrase: unlockWithPassphrase,
    unlockWithRecoveryKey: unlockWithRecoveryKey,
    sealForNomineeRelease: sealForNomineeRelease,
    unlockWithReleasePassphrase: unlockWithReleasePassphrase,
    encryptRecord: encryptRecord,
    decryptRecord: decryptRecord,
    getSessionDEK: getSessionDEK,
    clearSessionDEK: clearSessionDEK,
    generateRecoveryKey: generateRecoveryKey // exposed for testing/demoing only
  };
})();
