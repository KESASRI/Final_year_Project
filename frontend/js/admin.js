const admin = Auth.requireRole(["ADMIN"]);
if (!admin) {
  throw new Error("Admin authentication required");
}

const list = document.getElementById("list");
const adminInfo = document.getElementById("adminInfo");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

adminInfo.innerText = `${admin.username} (${admin.email})`;

logoutBtn.addEventListener("click", () => Auth.logout());
refreshBtn.addEventListener("click", loadRequests);

async function requestAction(path, id) {
  const res = await Auth.authFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Request action failed");
  }
  return data;
}

async function approve(id) {
  try {
    const data = await requestAction("/api/admin/approve", id);
    alert(data.message || "Approved");
    await loadRequests();
  } catch (error) {
    alert(error.message);
  }
}

async function deny(id) {
  try {
    const data = await requestAction("/api/admin/deny", id);
    alert(data.message || "Denied");
    await loadRequests();
  } catch (error) {
    alert(error.message);
  }
}

function statusBadge(status) {
  if (status === "APPROVED") return "status-green";
  if (status === "DENIED") return "status-red";
  return "status-yellow";
}

async function loadRequests() {
  try {
    const res = await Auth.authFetch("/api/admin/requests");
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      throw new Error(data.message || "Failed to load requests");
    }

    list.innerHTML = "";

    data.forEach((r) => {
      const li = document.createElement("li");
      const requestText = document.createElement("div");
      requestText.className = "request-text";
      requestText.innerHTML = `
        <strong>${r.email}</strong><br>
        ${r.filename}<br>
        <span class="${statusBadge(r.status)}">${r.status}</span>
      `;

      const actions = document.createElement("div");
      actions.className = "button-row";
      const approveBtn = document.createElement("button");
      approveBtn.className = "small-btn";
      approveBtn.textContent = "Approve";
      approveBtn.disabled = r.status !== "PENDING";
      approveBtn.addEventListener("click", () => approve(r._id));

      const denyBtn = document.createElement("button");
      denyBtn.className = "small-btn";
      denyBtn.textContent = "Deny";
      denyBtn.disabled = r.status !== "PENDING";
      denyBtn.addEventListener("click", () => deny(r._id));

      actions.appendChild(approveBtn);
      actions.appendChild(denyBtn);

      li.appendChild(requestText);
      li.appendChild(actions);
      list.appendChild(li);
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = `<li>${error.message}</li>`;
  }
}

loadRequests();
