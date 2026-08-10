const nodemailer = require("nodemailer");

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

exports.sendWrappedKeyEmail = async ({ email, filename, wrappedKey, expiresAt }) => {
  if (!emailUser || !emailPass) {
    throw new Error("Email credentials are missing in environment variables");
  }

  const expiryText = new Date(expiresAt).toLocaleString();

  await transporter.sendMail({
    from: emailUser,
    to: email,
    subject: "Encrypted AES Key for File Access",
    text: `
File: ${filename}
Expiry: ${expiryText}

Your wrapped AES key:
${wrappedKey}

Use your RSA private key to unwrap this AES key.
Then use the AES key to decrypt the encrypted file in the app.
`
  });
};

