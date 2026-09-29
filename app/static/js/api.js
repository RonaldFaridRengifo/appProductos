const TOKEN_KEY = "catalog_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    let message = "Ocurrió un error.";
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail)) message = detail.map((d) => d.msg || d).join(" ");
    throw new Error(message);
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMoney(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

function isMobileDevice() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function openDelivery(cfg) {
  if (!cfg || !cfg.delivery_enabled) return;
  const desktop = cfg.delivery_desktop_url;
  const deep = cfg.delivery_mobile_deep_link;
  const store = cfg.delivery_store_url || desktop;
  if (isMobileDevice()) {
    if (deep) {
      const started = Date.now();
      window.location.href = deep;
      setTimeout(() => {
        if (document.visibilityState === "visible" && Date.now() - started < 2500 && store) {
          window.location.href = store;
        }
      }, 1400);
      return;
    }
    if (store) window.location.href = store;
    return;
  }
  if (desktop) window.open(desktop, "_blank", "noopener");
  else if (store) window.open(store, "_blank", "noopener");
}
