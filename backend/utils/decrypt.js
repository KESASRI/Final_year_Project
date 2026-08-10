const crypto = require("crypto");

exports.decrypt = (encrypted, keyHex, ivHex, authTagHex) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(keyHex, "hex"),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted;
};
