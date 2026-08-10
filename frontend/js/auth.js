(function authModule() {
  const API_BASE = "http://localhost:5000";
  const TOKEN_KEY = "sfs_token";
  const USER_KEY = "sfs_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function updateUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function dashboardForRole(role) {
    if (role === "ADMIN") return "admin.html";
    if (role === "OWNER") return "owner.html";
    return "user.html";
  }

  function redirectToDashboard() {
    const user = getCurrentUser();
    if (!user) return;
    window.location.href = dashboardForRole(user.role);
  }

  function requireRole(roles) {
    const token = getToken();
    const user = getCurrentUser();

    if (!token || !user) {
      window.location.href = "index.html";
      return null;
    }

    if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user.role)) {
      window.location.href = dashboardForRole(user.role);
      return null;
    }

    return user;
  }

  async function authFetch(pathOrUrl, options = {}) {
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE}${pathOrUrl}`;
    const token = getToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, {
      ...options,
      headers
    });
  }

  function logout() {
    clearSession();
    window.location.href = "index.html";
  }

  window.Auth = {
    API_BASE,
    getToken,
    getCurrentUser,
    saveSession,
    updateUser,
    clearSession,
    dashboardForRole,
    redirectToDashboard,
    requireRole,
    authFetch,
    logout
  };
})();
