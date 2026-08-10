const crypto = require("crypto");

function encrypt(buffer) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    keyHex: key.toString("hex"),
    ivHex: iv.toString("hex"),
    authTagHex: authTag.toString("hex")
  };
}

exports.encrypt = encrypt;
