(function cryptoKeysModule() {
  const ITERATIONS = 310000;

  function storageKey(userId) {
    return `sfs_key_backup_${userId}`;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function formatPem(base64, beginLine, endLine) {
    const chunks = base64.match(/.{1,64}/g) || [];
    return `${beginLine}\n${chunks.join("\n")}\n${endLine}`;
  }

  async function deriveAesKey(password, saltBytes) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptPrivatePem(privatePem, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(privatePem)
    );

    return {
      encryptedPrivateKeyB64: arrayBufferToBase64(encrypted),
      saltB64: arrayBufferToBase64(salt),
      ivB64: arrayBufferToBase64(iv),
      iterations: ITERATIONS
    };
  }

  async function decryptPrivatePem(record, password) {
    const decoder = new TextDecoder();
    const salt = new Uint8Array(base64ToArrayBuffer(record.saltB64));
    const iv = new Uint8Array(base64ToArrayBuffer(record.ivB64));
    const encryptedBytes = base64ToArrayBuffer(record.encryptedPrivateKeyB64);
    const key = await deriveAesKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedBytes
    );

    return decoder.decode(decrypted);
  }

  async function generateRsaPemPair() {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );

    const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);

    const publicKeyPem = formatPem(
      arrayBufferToBase64(spki),
      "-----BEGIN PUBLIC KEY-----",
      "-----END PUBLIC KEY-----"
    );

    const privateKeyPem = formatPem(
      arrayBufferToBase64(pkcs8),
      "-----BEGIN PRIVATE KEY-----",
      "-----END PRIVATE KEY-----"
    );

    return { publicKeyPem, privateKeyPem };
  }

  function getRecord(userId) {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function saveRecord(userId, record) {
    localStorage.setItem(storageKey(userId), JSON.stringify(record));
  }

  async function generateAndStore(userId, password) {
    if (!password) {
      throw new Error("Password is required to protect private key");
    }

    const { publicKeyPem, privateKeyPem } = await generateRsaPemPair();
    const encrypted = await encryptPrivatePem(privateKeyPem, password);

    const record = {
      publicKeyPem,
      encryptedPrivateKeyB64: encrypted.encryptedPrivateKeyB64,
      saltB64: encrypted.saltB64,
      ivB64: encrypted.ivB64,
      iterations: encrypted.iterations,
      createdAt: new Date().toISOString()
    };

    saveRecord(userId, record);
    return record;
  }

  async function unlockPrivateKey(userId, password) {
    const record = getRecord(userId);
    if (!record) {
      throw new Error("No local private key found. Login again.");
    }
    return decryptPrivatePem(record, password);
  }

  function getPublicKey(userId) {
    const record = getRecord(userId);
    return record ? record.publicKeyPem : "";
  }

  function hasLocalKeys(userId) {
    return Boolean(getRecord(userId));
  }

  window.CryptoKeys = {
    generateAndStore,
    unlockPrivateKey,
    getPublicKey,
    hasLocalKeys
  };
})();
