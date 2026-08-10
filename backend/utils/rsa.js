const crypto = require("crypto");

const oaepOptions = {
  padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: "sha256"
};

// Encrypt AES key using the user's public key
exports.wrapAESKeyForUser = (aesKeyHex, userPublicKeyPem) => {
  return crypto.publicEncrypt(
    {
      key: userPublicKeyPem,
      ...oaepOptions
    },
    Buffer.from(aesKeyHex, "utf8")
  ).toString("base64");
};
