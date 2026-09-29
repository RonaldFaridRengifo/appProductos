const app = document.getElementById("app");
let site = {};
let currentUser = null;

function path() {
  return location.pathname.replace(/\/$/, "") || "/";
}

function getContrastColor(hexColor) {
  if (!hexColor || !hexColor.startsWith("#")) return "#ffffff";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1c1914" : "#ffffff";
}

function applySite(data) {
  site = data;
  const headerBg = data.header_color || "#1f3a2e";
  const bodyBg = data.background_color || "#f6f1e8";
  const headerInk = getContrastColor(headerBg);
  const bodyInk = getContrastColor(bodyBg) === "#ffffff" ? "#f8f4ec" : "#1c1914";

  document.documentElement.style.setProperty("--header", headerBg);
  document.documentElement.style.setProperty("--header-ink", headerInk);
  document.documentElement.style.setProperty("--bg", bodyBg);
  document.documentElement.style.setProperty("--ink", bodyInk);

  document.getElementById("brand-name").textContent = data.company_name || "Catálogo";
  document.title = data.company_name || "Catálogo";
  const logo = document.getElementById("brand-logo");
  if (data.logo_path) {
    logo.src = data.logo_path;
    logo.classList.remove("hidden");
  } else {
    logo.classList.add("hidden");
  }
  const deliveryBtn = document.getElementById("delivery-btn");
  if (data.delivery_enabled && (data.delivery_desktop_url || data.delivery_mobile_deep_link || data.delivery_store_url)) {
    deliveryBtn.classList.remove("hidden");
    deliveryBtn.textContent = data.delivery_name ? `Pide a domicilio (${data.delivery_name})` : "Pide a domicilio";
  } else {
    deliveryBtn.classList.add("hidden");
  }
  document.getElementById("footer-copy").textContent = `${data.company_name || "Catálogo"} · catálogo en línea`;
}

function setActiveNav() {
  document.querySelectorAll("#main-nav a[data-link]").forEach((a) => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href === path() || (href !== "/" && path().startsWith(href)));
  });
}

async function refreshUser() {
  if (!getToken()) {
    currentUser = null;
    document.getElementById("login-link").textContent = "Login";
    document.getElementById("login-link").setAttribute("href", "/login");
    return;
  }
  try {
    currentUser = await api("/api/auth/me");
    document.getElementById("login-link").textContent = "Panel";
    document.getElementById("login-link").setAttribute("href", "/admin");
  } catch {
    setToken(null);
    currentUser = null;
  }
}

function homeView(cards) {
  if (!cards.length) {
    return `<div class="wrap"><h1 class="hero-title">Bienvenido</h1><p class="lede">El administrador aún no ha publicado tarjetas de inicio.</p></div>`;
  }
  return `<div class="wrap"><div class="home-grid">${cards.map((c) => `
    <article class="home-card side-${c.image_side} size-${c.card_size} ${!c.image_path ? "no-image" : ""}">
      ${c.image_path ? `<div class="home-img img-${c.image_size}"><img src="${c.image_path}" alt="${escapeHtml(c.title)}"></div>` : ""}
      <div class="home-copy">
        <h2>${escapeHtml(c.title)}</h2>
        <p>${escapeHtml(c.description)}</p>
      </div>
    </article>`).join("")}</div></div>`;
}

function productsView(catalog) {
  const cats = catalog.map((cat) => `
    <section class="category" data-cat="${cat.id}">
      <button class="category-head" type="button">
        <span>${escapeHtml(cat.name)} <span class="cat-count">(${cat.products.length})</span></span>
        <span class="cat-chevron">▼</span>
      </button>
      <div class="category-body">
        <div class="product-grid">
          ${cat.products.length ? cat.products.map((p) => `
            <article class="product-card ${p.discount_enabled ? "discounted" : ""}">
              ${p.discount_enabled ? '<span class="discount-badge">Descuento</span>' : ""}
              ${p.image_path ? `<img src="${p.image_path}" alt="${escapeHtml(p.title)}">` : `<div style="height:160px;background:#efe8da;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.9rem;">Sin imagen</div>`}
              <div class="product-body">
                <h3>${escapeHtml(p.title)}</h3>
                <p class="price">${p.discount_enabled ? `<span class="old-price">${formatMoney(p.price)}</span>${formatMoney(p.current_price)}` : formatMoney(p.current_price)}</p>
                <p class="desc-preview" id="prev-${p.id}">${escapeHtml(p.description)}</p>
                <button class="btn-ghost btn-ver-mas" data-more="${p.id}">Ver más</button>
                <p class="desc-full hidden" id="desc-${p.id}">${escapeHtml(p.description)}</p>
              </div>
            </article>`).join("") : '<p style="padding:1rem;color:var(--muted);">No hay productos en esta categoría.</p>'}
        </div>
      </div>
    </section>`).join("");
  return `<div class="wrap"><h1 class="hero-title">Productos</h1><div id="games-root"></div>${cats || "<p>Aún no hay categorías disponibles.</p>"}</div>`;
}

function locationsView(rows) {
  const cards = rows.map((l) => `
    <article class="loc-card">
      <span class="tag">${l.location_type === "virtual" ? "Virtual" : "Presencial"}</span>
      <h2>${escapeHtml(l.name)}</h2>
      ${l.address ? `<p>${escapeHtml(l.address)}</p>` : ""}
      ${l.location_type === "presencial" ? `
        <p>Lunes a sábado: ${escapeHtml(l.hours_week_open)} - ${escapeHtml(l.hours_week_close)}</p>
        <p>Domingos y festivos: ${escapeHtml(l.hours_sunday_open)} - ${escapeHtml(l.hours_sunday_close)}</p>
        ${l.how_to_arrive_url ? `<p><a class="btn" href="${escapeHtml(l.how_to_arrive_url)}" target="_blank" rel="noopener">Cómo llegar</a></p>` : ""}
      ` : `
        <p>Lunes a viernes mañana: ${escapeHtml(l.virtual_weekday_morning || "—")}</p>
        <p>Lunes a viernes tarde: ${escapeHtml(l.virtual_weekday_afternoon || "—")}</p>
        <p>Sábado y domingo: ${escapeHtml(l.virtual_weekend || "—")}</p>
        ${l.delivery_enabled ? `<p><button class="btn-delivery" data-loc-delivery="${l.id}">Pedir en ${escapeHtml(l.delivery_name || "domicilio")}</button></p>` : ""}
      `}
    </article>`).join("");
  return `<div class="wrap"><h1 class="hero-title">Sedes</h1><div class="location-grid">${cards || "<p>Aún no hay sedes.</p>"}</div></div>`;
}

function contactView() {
  return `
    <div class="wrap">
      <div class="form-card">
        <h1 class="hero-title">Contacto</h1>
        <p class="lede">Escríbanos un comentario, agradecimiento, petición o solicitud.</p>
        <form id="contact-form" class="form">
          <label>Nombre del cliente<input name="name" required minlength="2" maxlength="160" /></label>
          <label>Correo electrónico<input type="email" name="email" required /></label>
          <label>Mensaje<textarea name="message" required minlength="5" maxlength="4000"></textarea></label>
          <div id="contact-msg"></div>
          <button class="btn">Enviar</button>
        </form>
      </div>
    </div>
  `;
}

function loginView() {
  return `
    <div class="wrap">
      <div class="form-card">
        <h1 class="hero-title">Iniciar sesión</h1>
        <form id="login-form" class="form">
          <label>Usuario<input name="username" required /></label>
          <label>Contraseña<input type="password" name="password" required /></label>
          <div id="login-msg"></div>
          <button class="btn">Entrar</button>
        </form>
      </div>
    </div>
  `;
}

async function render() {
  setActiveNav();
  document.getElementById("main-nav").classList.remove("open");
  const route = path();
  try {
    if (route === "/") {
      const cards = await api("/api/public/home");
      app.innerHTML = homeView(cards);
      return;
    }
    if (route === "/productos") {
      const catalog = await api("/api/public/catalog");
      app.innerHTML = productsView(catalog);
      renderGames(document.getElementById("games-root"));
      app.querySelectorAll(".category-head").forEach((btn) => {
        btn.onclick = () => {
          const parent = btn.parentElement;
          parent.classList.toggle("open");
          const chev = btn.querySelector(".cat-chevron");
          if (chev) chev.textContent = parent.classList.contains("open") ? "▲" : "▼";
        };
      });
      app.querySelectorAll("[data-more]").forEach((btn) => {
        btn.onclick = () => {
          const full = document.getElementById(`desc-${btn.dataset.more}`);
          const prev = document.getElementById(`prev-${btn.dataset.more}`);
          full.classList.toggle("hidden");
          prev.classList.toggle("hidden");
          btn.textContent = full.classList.contains("hidden") ? "Ver más" : "Ver menos";
        };
      });
      return;
    }
    if (route === "/sedes") {
      const rows = await api("/api/public/locations");
      app.innerHTML = locationsView(rows);
      app.querySelectorAll("[data-loc-delivery]").forEach((btn) => {
        btn.onclick = () => {
          const loc = rows.find((x) => x.id === Number(btn.dataset.locDelivery));
          openDelivery(loc);
        };
      });
      return;
    }
    if (route === "/contacto") {
      app.innerHTML = contactView();
      app.querySelector("#contact-form").onsubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const box = document.getElementById("contact-msg");
        try {
          const res = await api("/api/contact", {
            method: "POST",
            body: JSON.stringify({
              name: form.name.value,
              email: form.email.value,
              message: form.message.value,
            }),
          });
          box.innerHTML = `<p class="notice">${escapeHtml(res.message)}</p>`;
          form.reset();
        } catch (err) {
          box.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
        }
      };
      return;
    }
    if (route === "/login") {
      if (currentUser) {
        history.replaceState({}, "", "/admin");
        return render();
      }
      app.innerHTML = loginView();
      app.querySelector("#login-form").onsubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        try {
          const res = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username: form.username.value, password: form.password.value }),
          });
          setToken(res.token);
          currentUser = res.user;
          history.pushState({}, "", "/admin");
          await render();
        } catch (err) {
          document.getElementById("login-msg").innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
        }
      };
      return;
    }
    if (route === "/admin") {
      if (!getToken()) {
        history.replaceState({}, "", "/login");
        return render();
      }
      await refreshUser();
      if (!currentUser) {
        history.replaceState({}, "", "/login");
        return render();
      }
      if (currentUser.must_setup) {
        await renderSetup(app, currentUser);
        return;
      }
      await mountAdmin(app, currentUser);
      return;
    }
    app.innerHTML = `<div class="wrap"><h1>Página no encontrada</h1></div>`;
  } catch (err) {
    app.innerHTML = `<div class="wrap"><p class="error">${escapeHtml(err.message)}</p></div>`;
  }
}

document.getElementById("nav-toggle").onclick = () => {
  document.getElementById("main-nav").classList.toggle("open");
};

document.getElementById("delivery-btn").onclick = () => openDelivery(site);

document.body.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a) return;
  e.preventDefault();
  history.pushState({}, "", a.getAttribute("href"));
  render();
});

window.addEventListener("popstate", render);
window.addEventListener("app:nav", render);

(async function init() {
  site = await api("/api/public/site");
  applySite(site);
  await refreshUser();
  await render();
})();
