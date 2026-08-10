const msg = document.getElementById("msg");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const signupRole = document.getElementById("signupRole");

function setMessage(text, isError = false) {
  msg.style.color = isError ? "#b00020" : "#2e7d32";
  msg.innerText = text;
}

function showLogin() {
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
}

function showSignup() {
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
}

async function savePublicKey(publicKeyPem) {
  const res = await Auth.authFetch("/api/auth/public-key", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey: publicKeyPem })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to save public key");
  }
}

async function ensureUserKeysOnLogin(user, loginPassword) {
  if (user.role !== "USER") return user;

  if (!CryptoKeys.hasLocalKeys(user.id)) {
    const created = await CryptoKeys.generateAndStore(user.id, loginPassword);
    await savePublicKey(created.publicKeyPem);
    return { ...user, hasPublicKey: true };
  }

  if (!user.hasPublicKey) {
    const publicKey = CryptoKeys.getPublicKey(user.id);
    if (publicKey) {
      await savePublicKey(publicKey);
      return { ...user, hasPublicKey: true };
    }
  }

  return user;
}

loginTab.addEventListener("click", showLogin);
signupTab.addEventListener("click", showSignup);

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = {
      username: document.getElementById("signupUsername").value.trim(),
      email: document.getElementById("signupEmail").value.trim(),
      password: document.getElementById("signupPassword").value,
      role: signupRole.value
    };

    const res = await fetch(`${Auth.API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "Signup failed", true);
      return;
    }

    setMessage("Signup successful. Please login.");
    signupForm.reset();
    showLogin();
  } catch (error) {
    console.error(error);
    setMessage("Signup failed", true);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${Auth.API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "Login failed", true);
      return;
    }

    Auth.saveSession(data.token, data.user);

    const updatedUser = await ensureUserKeysOnLogin(data.user, password);
    if (updatedUser.hasPublicKey !== data.user.hasPublicKey) {
      Auth.updateUser(updatedUser);
    }

    setMessage("Login successful");
    Auth.redirectToDashboard();
  } catch (error) {
    console.error(error);
    setMessage("Login failed", true);
  }
});

const sessionUser = Auth.getCurrentUser();
if (Auth.getToken() && sessionUser) {
  Auth.redirectToDashboard();
}
