const currentUser = Auth.requireRole(["USER"]);
if (!currentUser) {
  throw new Error("User authentication required");
}

const filesDropdown = document.getElementById("files");
const encryptedKeyInput = document.getElementById("encryptedKey");
const keyPasswordInput = document.getElementById("keyPassword");
const requestBtn = document.getElementById("requestBtn");
const decryptBtn = document.getElementById("decryptBtn");
const userInfo = document.getElementById("userInfo");
const keyStatus = document.getElementById("keyStatus");
const msg = document.getElementById("msg");
const logoutBtn = document.getElementById("logoutBtn");

userInfo.innerText = `${currentUser.username} (${currentUser.email})`;

function setMessage(text, isError = false) {
  msg.style.color = isError ? "#b00020" : "#2e7d32";
  msg.innerText = text;
}

function setKeyStatus() {
  if (CryptoKeys.hasLocalKeys(currentUser.id)) {
    keyStatus.innerText = "Private key is available on this device.";
    keyStatus.style.color = "#2e7d32";
  } else {
    keyStatus.innerText = "No local private key found. Login again to initialize keys.";
    keyStatus.style.color = "#b00020";
  }
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function pemToArrayBuffer(pemText, beginMarker, endMarker) {
  const cleaned = pemText
    .replace(beginMarker, "")
    .replace(endMarker, "")
    .replace(/\s+/g, "");

  return base64ToArrayBuffer(cleaned);
}

function hexToUint8Array(hex) {
  if (!hex || hex.length % 2 !== 0) {
    throw new Error("Invalid hex");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function unwrapAesKey(wrappedKeyBase64, privateKeyPem) {
  const privateKeyBuffer = pemToArrayBuffer(
    privateKeyPem,
    "-----BEGIN PRIVATE KEY-----",
    "-----END PRIVATE KEY-----"
  );

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );

  const wrappedBuffer = base64ToArrayBuffer(wrappedKeyBase64);
  const unwrappedBuffer = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    wrappedBuffer
  );

  return new TextDecoder().decode(unwrappedBuffer).trim();
}

async function decryptEncryptedFile(encryptedBytes, aesKeyHex, ivHex, authTagHex) {
  const keyBytes = hexToUint8Array(aesKeyHex);
  const ivBytes = hexToUint8Array(ivHex);
  const tagBytes = hexToUint8Array(authTagHex);
  const cipherBytes = new Uint8Array(encryptedBytes);
  const cipherPlusTag = new Uint8Array(cipherBytes.length + tagBytes.length);

  cipherPlusTag.set(cipherBytes, 0);
  cipherPlusTag.set(tagBytes, cipherBytes.length);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
    cryptoKey,
    cipherPlusTag
  );
}

function triggerDownload(buffer, filename, mimeType) {
  const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function loadFiles() {
  try {
    const res = await Auth.authFetch("/api/files");
    const files = await res.json().catch(() => []);
    if (!res.ok) {
      throw new Error(files.message || "Unable to load files");
    }

    filesDropdown.innerHTML = `<option value="">-- Select File --</option>`;
    files.forEach((f) => {
      const option = document.createElement("option");
      option.value = f.filename;
      option.textContent = f.filename;
      filesDropdown.appendChild(option);
    });
  } catch (error) {
    console.error(error);
    setMessage(error.message, true);
  }
}

async function requestFile() {
  const filename = filesDropdown.value;
  if (!filename) {
    setMessage("Select a file first", true);
    return;
  }

  try {
    const res = await Auth.authFetch("/api/admin/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "Request failed", true);
      return;
    }

    setMessage(data.message || "Request submitted");
  } catch (error) {
    console.error(error);
    setMessage("Request failed", true);
  }
}

async function decryptAndDownload() {
  try {
    const filename = filesDropdown.value;
    const wrappedKey = encryptedKeyInput.value.trim();
    const keyPassword = keyPasswordInput.value;

    if (!filename || !wrappedKey || !keyPassword) {
      setMessage("Select file, paste wrapped key and enter key password", true);
      return;
    }

    const privateKeyPem = await CryptoKeys.unlockPrivateKey(currentUser.id, keyPassword);
    const aesKeyHex = await unwrapAesKey(wrappedKey, privateKeyPem);

    const fileRes = await Auth.authFetch(`/api/encrypted-file?filename=${encodeURIComponent(filename)}`);
    if (!fileRes.ok) {
      const data = await fileRes.json().catch(() => ({}));
      setMessage(data.message || "Encrypted file download failed", true);
      return;
    }

    const ivHex = fileRes.headers.get("x-iv");
    const authTagHex = fileRes.headers.get("x-auth-tag");
    const originalName = decodeURIComponent(fileRes.headers.get("x-original-name") || filename);
    const mimeType = fileRes.headers.get("x-mime-type") || "application/octet-stream";
    const encryptedBytes = await fileRes.arrayBuffer();

    const decryptedBuffer = await decryptEncryptedFile(encryptedBytes, aesKeyHex, ivHex, authTagHex);
    triggerDownload(decryptedBuffer, originalName, mimeType);
    setMessage("File decrypted and downloaded");
  } catch (error) {
    console.error(error);
    setMessage(error.message || "Decrypt failed", true);
  }
}

requestBtn.addEventListener("click", requestFile);
decryptBtn.addEventListener("click", decryptAndDownload);
logoutBtn.addEventListener("click", () => Auth.logout());

setKeyStatus();
loadFiles();
