const owner = Auth.requireRole(["OWNER"]);
if (!owner) {
  throw new Error("Owner authentication required");
}

const msg = document.getElementById("msg");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("file");
const ownerInfo = document.getElementById("ownerInfo");
const logoutBtn = document.getElementById("logoutBtn");

ownerInfo.innerText = `${owner.username} (${owner.email})`;

function setMessage(text, isError = false) {
  msg.style.color = isError ? "#b00020" : "#2e7d32";
  msg.innerText = text;
}

logoutBtn.addEventListener("click", () => Auth.logout());

uploadBtn.addEventListener("click", async () => {
  try {
    const file = fileInput.files[0];
    if (!file) {
      setMessage("Choose a file first", true);
      return;
    }

    const form = new FormData();
    form.append("file", file);

    const res = await Auth.authFetch("/api/upload", {
      method: "POST",
      body: form
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "Upload failed", true);
      return;
    }

    setMessage(data.message || "Uploaded");
    fileInput.value = "";
  } catch (error) {
    console.error(error);
    setMessage("Upload failed", true);
  }
});
