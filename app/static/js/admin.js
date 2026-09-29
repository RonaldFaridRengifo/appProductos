function adminLayout(user) {
  const items =
    user.role === "admin"
      ? [
          ["inicio", "Página de inicio"],
          ["categorias", "Categorías"],
          ["productos", "Productos"],
          ["sedes", "Sedes"],
          ["contacto", "Contacto"],
          ["usuarios", "Colaboradores"],
          ["apariencia", "Logo y colores"],
        ]
      : [["productos", "Productos"]];
  return `
    <div class="wrap">
      <h1 class="hero-title">Panel de Administración</h1>
      <p style="color:var(--muted);margin-top:0;">Sesión activa: <strong>${escapeHtml(user.name || user.username)}</strong> (${escapeHtml(user.role === "admin" ? "Administrador" : "Colaborador")})</p>
      <div class="admin-nav">
        ${items.map(([id, label]) => `<button data-admin="${id}">${label}</button>`).join("")}
        <button id="logout-btn" class="btn-ghost" style="margin-left:auto;">Cerrar sesión</button>
      </div>
      <div id="admin-view"></div>
    </div>
  `;
}

async function mountAdmin(root, user) {
  root.innerHTML = adminLayout(user);
  const view = root.querySelector("#admin-view");
  const navBtns = root.querySelectorAll("[data-admin]");

  const go = async (section) => {
    if (user.role !== "admin" && section !== "productos") section = "productos";
    navBtns.forEach((b) => b.classList.toggle("active", b.dataset.admin === section));
    if (section === "inicio") await adminHome(view);
    if (section === "categorias") await adminCategories(view);
    if (section === "productos") await adminProducts(view);
    if (section === "sedes") await adminLocations(view);
    if (section === "contacto") await adminContact(view);
    if (section === "usuarios") await adminUsers(view);
    if (section === "apariencia") await adminAppearance(view);
  };

  navBtns.forEach((btn) => btn.addEventListener("click", () => go(btn.dataset.admin)));
  root.querySelector("#logout-btn").onclick = () => {
    setToken(null);
    location.href = "/";
  };
  await go(user.role === "admin" ? "inicio" : "productos");
}

function field(label, html) {
  return `<label>${label}${html}</label>`;
}

async function adminHome(view) {
  const cards = await api("/api/admin/home");
  view.innerHTML = `
    <div class="form-card form-wide">
      <h2 id="card-form-title">Nueva tarjeta de inicio</h2>
      <form id="card-form" class="form form-wide">
        <input type="hidden" name="record_id" value="" />
        ${field("Título", '<input name="title" required maxlength="200" placeholder="Ej: Especialidad de la casa" />')}
        ${field("Descripción", '<textarea name="description" placeholder="Descripción breve del contenido"></textarea>')}
        <div class="row">
          ${field("Posición de la imagen", '<select name="image_side"><option value="left">A la izquierda</option><option value="right">A la derecha</option></select>')}
          ${field("Tamaño de tarjeta", '<select name="card_size"><option value="sm">Pequeña</option><option value="md" selected>Mediana</option><option value="lg">Grande</option><option value="full">Ancho completo</option></select>')}
          ${field("Tamaño de imagen", '<select name="image_size"><option value="sm">Pequeña</option><option value="md" selected>Mediana</option><option value="lg">Grande</option></select>')}
          ${field("Orden de aparición", '<input type="number" name="sort_order" value="0" />')}
        </div>
        ${field("Imagen (PNG, JPG o WEBP)", '<input type="file" name="image" accept="image/png,image/jpeg,image/webp" />')}
        <div id="card-msg"></div>
        <div class="row" style="margin-top:0.5rem;">
          <button class="btn" id="btn-save-card">Guardar tarjeta</button>
          <button type="button" class="btn-ghost" id="reset-card">Nueva tarjeta</button>
        </div>
      </form>

      <h3 style="margin-top:2rem;">Tarjetas existentes (${cards.length})</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Título</th>
              <th>Lado</th>
              <th>Tamaño</th>
              <th>Orden</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${cards.length ? cards.map((c) => `
              <tr>
                <td>${c.image_path ? `<img class="thumb" src="${c.image_path}" alt="">` : '<span style="color:var(--muted);font-size:0.85rem;">Sin imagen</span>'}</td>
                <td><strong>${escapeHtml(c.title)}</strong><div style="font-size:0.85rem;color:var(--muted);max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.description)}</div></td>
                <td>${c.image_side === "left" ? "Izquierda" : "Derecha"}</td>
                <td>${c.card_size}</td>
                <td>${c.sort_order}</td>
                <td class="row">
                  <button data-edit="${c.id}" class="btn-ghost">Editar</button>
                  <button data-del="${c.id}" class="btn-danger">Eliminar</button>
                </td>
              </tr>`).join("") : '<tr><td colspan="6" style="text-align:center;color:var(--muted);">No hay tarjetas creadas aún.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const form = view.querySelector("#card-form");
  const formTitle = view.querySelector("#card-form-title");
  const msgBox = view.querySelector("#card-msg");

  view.querySelector("#reset-card").onclick = () => {
    form.reset();
    form.record_id.value = "";
    formTitle.textContent = "Nueva tarjeta de inicio";
    msgBox.innerHTML = "";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    msgBox.innerHTML = "";
    const fd = new FormData(form);
    const payload = {
      title: fd.get("title"),
      description: fd.get("description") || "",
      image_side: fd.get("image_side"),
      card_size: fd.get("card_size"),
      image_size: fd.get("image_size"),
      sort_order: Number(fd.get("sort_order") || 0),
    };
    try {
      const id = form.record_id.value;
      const saved = id
        ? await api(`/api/admin/home/${id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await api("/api/admin/home", { method: "POST", body: JSON.stringify(payload) });

      const file = form.image.files[0];
      if (file && file.size) {
        const img = new FormData();
        img.append("file", file);
        await api(`/api/admin/home/${saved.id}/image`, { method: "POST", body: img });
      }
      await adminHome(view);
    } catch (err) {
      msgBox.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };

  view.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.onclick = () => {
      const c = cards.find((x) => x.id === Number(btn.dataset.edit));
      form.record_id.value = c.id;
      form.title.value = c.title;
      form.description.value = c.description;
      form.image_side.value = c.image_side;
      form.card_size.value = c.card_size;
      form.image_size.value = c.image_size;
      form.sort_order.value = c.sort_order;
      formTitle.textContent = `Editar tarjeta: ${c.title}`;
      form.scrollIntoView({ behavior: "smooth" });
    };
  });

  view.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("¿Eliminar esta tarjeta de inicio?")) return;
      await api(`/api/admin/home/${btn.dataset.del}`, { method: "DELETE" });
      await adminHome(view);
    };
  });
}

async function adminCategories(view) {
  const cats = await api("/api/admin/categories");
  view.innerHTML = `
    <div class="form-card">
      <h2 id="cat-form-title">Nueva categoría</h2>
      <form id="cat-form" class="form">
        <input type="hidden" name="record_id" value="" />
        ${field("Nombre de la categoría", '<input name="name" required maxlength="160" placeholder="Ej: Bebidas, Postres, Platos Fuertes" />')}
        ${field("Orden de aparición", '<input type="number" name="sort_order" value="0" />')}
        <div id="cat-msg"></div>
        <div class="row">
          <button class="btn">Guardar categoría</button>
          <button type="button" class="btn-ghost" id="reset-cat">Nueva categoría</button>
        </div>
      </form>

      <h3 style="margin-top:2rem;">Categorías existentes (${cats.length})</h3>
      <table style="margin-top:0.8rem">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Productos asociados</th>
            <th>Orden</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${cats.length ? cats.map((c) => `
            <tr>
              <td><strong>${escapeHtml(c.name)}</strong></td>
              <td>${c.product_count} producto(s)</td>
              <td>${c.sort_order}</td>
              <td class="row">
                <button data-edit="${c.id}" class="btn-ghost">Editar</button>
                <button data-del="${c.id}" class="btn-danger">Eliminar</button>
              </td>
            </tr>`).join("") : '<tr><td colspan="4" style="text-align:center;color:var(--muted);">No hay categorías creadas.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  const form = view.querySelector("#cat-form");
  const formTitle = view.querySelector("#cat-form-title");
  const msgBox = view.querySelector("#cat-msg");

  view.querySelector("#reset-cat").onclick = () => {
    form.reset();
    form.record_id.value = "";
    formTitle.textContent = "Nueva categoría";
    msgBox.innerHTML = "";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    msgBox.innerHTML = "";
    const payload = { name: form.name.value, sort_order: Number(form.sort_order.value || 0) };
    try {
      if (form.record_id.value) {
        await api(`/api/admin/categories/${form.record_id.value}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/admin/categories", { method: "POST", body: JSON.stringify(payload) });
      }
      await adminCategories(view);
    } catch (err) {
      msgBox.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };

  view.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.onclick = () => {
      const c = cats.find((x) => x.id === Number(btn.dataset.edit));
      form.record_id.value = c.id;
      form.name.value = c.name;
      form.sort_order.value = c.sort_order;
      formTitle.textContent = `Editar categoría: ${c.name}`;
      form.scrollIntoView({ behavior: "smooth" });
    };
  });

  view.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      const c = cats.find((x) => x.id === Number(btn.dataset.del));
      if (!confirm(`¿Eliminar la categoría "${c.name}" y todos sus productos? Esta acción no se puede deshacer.`)) return;
      await api(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      await adminCategories(view);
    };
  });
}

async function adminProducts(view) {
  const [products, cats] = await Promise.all([api("/api/admin/products"), api("/api/admin/categories")]);
  view.innerHTML = `
    <div class="form-card form-wide">
      <h2 id="prod-form-title">Nuevo producto</h2>
      ${cats.length ? "" : '<p class="error">Primero el administrador debe crear al menos una categoría para poder agregar productos.</p>'}
      <form id="prod-form" class="form form-wide">
        <input type="hidden" name="record_id" value="" />
        ${field("Categoría", `<select name="category_id" required ${cats.length ? "" : "disabled"}>${cats.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}</select>`)}
        ${field("Título / Nombre del producto", '<input name="title" required maxlength="200" placeholder="Ej: Pizza Artesanal Cuatro Quesos" />')}
        ${field("Descripción", '<textarea name="description" placeholder="Ingredientes, preparación y detalles"></textarea>')}
        ${field("Precio regular", '<input type="number" min="0" step="0.01" name="price" required placeholder="0" />')}

        <div style="background:#fef7f2;border:1px solid #f0d5c3;padding:0.9rem;border-radius:12px;margin:0.4rem 0;">
          <label class="switch" style="font-weight:600;cursor:pointer;">
            <input type="checkbox" name="discount_enabled" id="prod-discount-toggle" />
            Activar descuento
          </label>
          <div id="prod-discount-container" class="hidden" style="margin-top:0.7rem;">
            ${field("Nuevo precio con descuento", '<input type="number" min="0" step="0.01" name="discount_price" id="prod-discount-price" placeholder="Indique el precio rebajado" />')}
            <small style="color:var(--muted);display:block;margin-top:0.2rem;">El precio regular aparecerá tachado y este será el precio actual con indicador de descuento.</small>
          </div>
        </div>

        ${field("Orden de aparición", '<input type="number" name="sort_order" value="0" />')}
        ${field("Imagen del producto (PNG, JPG o WEBP)", '<input type="file" name="image" accept="image/png,image/jpeg,image/webp" />')}
        <div id="prod-msg"></div>
        <div class="row" style="margin-top:0.6rem;">
          <button class="btn" ${cats.length ? "" : "disabled"}>Guardar producto</button>
          <button type="button" class="btn-ghost" id="reset-prod">Nuevo producto</button>
        </div>
      </form>

      <h3 style="margin-top:2rem;">Productos existentes (${products.length})</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Descuento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${products.length ? products.map((p) => {
              const cat = cats.find((c) => c.id === p.category_id);
              return `
                <tr>
                  <td>${p.image_path ? `<img class="thumb" src="${p.image_path}" alt="">` : '<span style="color:var(--muted);font-size:0.85rem;">Sin imagen</span>'}</td>
                  <td><strong>${escapeHtml(p.title)}</strong><div style="font-size:0.85rem;color:var(--muted);max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.description)}</div></td>
                  <td>${cat ? escapeHtml(cat.name) : "—"}</td>
                  <td>${p.discount_enabled ? `<span style="color:#b03030;font-weight:700;">${formatMoney(p.discount_price)}</span> <s style="color:var(--muted);font-size:0.85rem;">${formatMoney(p.price)}</s>` : `<strong>${formatMoney(p.price)}</strong>`}</td>
                  <td>${p.discount_enabled ? '<span class="tag" style="background:#fdecea;color:#8a1f17;">Activo</span>' : '<span style="color:var(--muted);font-size:0.85rem;">Inactivo</span>'}</td>
                  <td class="row">
                    <button data-edit="${p.id}" class="btn-ghost">Editar</button>
                    <button data-del="${p.id}" class="btn-danger">Eliminar</button>
                  </td>
                </tr>`;
            }).join("") : '<tr><td colspan="6" style="text-align:center;color:var(--muted);">No hay productos registrados.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const form = view.querySelector("#prod-form");
  const formTitle = view.querySelector("#prod-form-title");
  const msgBox = view.querySelector("#prod-msg");
  const discountToggle = view.querySelector("#prod-discount-toggle");
  const discountContainer = view.querySelector("#prod-discount-container");
  const discountInput = view.querySelector("#prod-discount-price");

  discountToggle.addEventListener("change", () => {
    if (discountToggle.checked) {
      discountContainer.classList.remove("hidden");
      discountInput.required = true;
    } else {
      discountContainer.classList.add("hidden");
      discountInput.required = false;
    }
  });

  view.querySelector("#reset-prod").onclick = () => {
    form.reset();
    form.record_id.value = "";
    discountContainer.classList.add("hidden");
    discountInput.required = false;
    formTitle.textContent = "Nuevo producto";
    msgBox.innerHTML = "";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    msgBox.innerHTML = "";
    const isDiscount = discountToggle.checked;
    const discountVal = discountInput.value !== "" ? Number(discountInput.value) : null;
    if (isDiscount && (discountVal === null || isNaN(discountVal) || discountVal < 0)) {
      msgBox.innerHTML = '<p class="error">Por favor ingrese un precio válido para el descuento.</p>';
      return;
    }

    const payload = {
      category_id: Number(form.category_id.value),
      title: form.title.value,
      description: form.description.value || "",
      price: Number(form.price.value),
      discount_enabled: isDiscount,
      discount_price: isDiscount ? discountVal : null,
      sort_order: Number(form.sort_order.value || 0),
    };

    try {
      const saved = form.record_id.value
        ? await api(`/api/admin/products/${form.record_id.value}`, { method: "PUT", body: JSON.stringify(payload) })
        : await api("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });

      const file = form.image.files[0];
      if (file && file.size) {
        const img = new FormData();
        img.append("file", file);
        await api(`/api/admin/products/${saved.id}/image`, { method: "POST", body: img });
      }
      await adminProducts(view);
    } catch (err) {
      msgBox.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };

  view.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.onclick = () => {
      const p = products.find((x) => x.id === Number(btn.dataset.edit));
      form.record_id.value = p.id;
      form.category_id.value = p.category_id;
      form.title.value = p.title;
      form.description.value = p.description;
      form.price.value = p.price;
      discountToggle.checked = p.discount_enabled;
      discountInput.value = p.discount_price ?? "";
      if (p.discount_enabled) {
        discountContainer.classList.remove("hidden");
        discountInput.required = true;
      } else {
        discountContainer.classList.add("hidden");
        discountInput.required = false;
      }
      form.sort_order.value = p.sort_order;
      formTitle.textContent = `Editar producto: ${p.title}`;
      form.scrollIntoView({ behavior: "smooth" });
    };
  });

  view.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("¿Eliminar este producto?")) return;
      await api(`/api/admin/products/${btn.dataset.del}`, { method: "DELETE" });
      await adminProducts(view);
    };
  });
}

async function adminLocations(view) {
  const rows = await api("/api/admin/locations");
  view.innerHTML = `
    <div class="form-card form-wide">
      <h2 id="loc-form-title">Nueva sede</h2>
      <form id="loc-form" class="form form-wide">
        <input type="hidden" name="record_id" value="" />
        ${field("Nombre de la sede", '<input name="name" required placeholder="Ej: Sede Norte, Sede Virtual Domicilios" />')}
        ${field("Tipo de sede", '<select name="location_type" id="loc-type-select"><option value="presencial" selected>Presencial</option><option value="virtual">Virtual</option></select>')}

        <!-- Campos para Sedes Presenciales -->
        <div id="loc-presencial-section">
          ${field("Dirección física", '<input name="address" placeholder="Ej: Carrera 15 # 85-32" />')}
          <div class="row">
            ${field("Lunes a sábado: apertura", '<input type="time" name="hours_week_open" value="08:00" />')}
            ${field("Lunes a sábado: cierre", '<input type="time" name="hours_week_close" value="18:00" />')}
          </div>
          <div class="row">
            ${field("Domingos y festivos: apertura", '<input type="time" name="hours_sunday_open" value="09:00" />')}
            ${field("Domingos y festivos: cierre", '<input type="time" name="hours_sunday_close" value="14:00" />')}
          </div>
          ${field("Enlace 'Cómo llegar' (Google Maps / Waze)", '<input name="how_to_arrive_url" placeholder="https://maps.google.com/..." />')}
        </div>

        <!-- Campos para Sedes Virtuales -->
        <div id="loc-virtual-section" class="hidden" style="background:#f4f8f5;border:1px solid #c9decb;padding:1rem;border-radius:12px;">
          <h3 style="margin-top:0;">Horarios independientes de la sede virtual</h3>
          ${field("Lunes a viernes por la mañana", '<input name="virtual_weekday_morning" placeholder="Ej: 08:00 - 12:00" />')}
          ${field("Lunes a viernes por la tarde", '<input name="virtual_weekday_afternoon" placeholder="Ej: 14:00 - 20:00" />')}
          ${field("Sábado y domingo", '<input name="virtual_weekend" placeholder="Ej: 09:00 - 22:00" />')}

          <h3 style="margin-top:1.2rem;">Servicio de domicilio</h3>
          <label class="switch" style="font-weight:600;cursor:pointer;">
            <input type="checkbox" name="delivery_enabled" id="loc-delivery-toggle" />
            Habilitar servicio de domicilio en esta sede
          </label>
          <div id="loc-delivery-fields" class="hidden" style="margin-top:0.7rem;">
            ${field("Plataforma (Didi Food, Rappi, Uber Eats, etc.)", '<input name="delivery_name" placeholder="Ej: Didi Food" />')}
            ${field("URL en computador (para descargar o ver menú web)", '<input name="delivery_desktop_url" placeholder="https://www.didifood.com/..." />')}
            ${field("Enlace profundo para celular (deep link para abrir la app)", '<input name="delivery_mobile_deep_link" placeholder="didifood://..." />')}
            ${field("URL en tienda de aplicaciones (Play Store / App Store si no tiene la app instalada)", '<input name="delivery_store_url" placeholder="https://play.google.com/store/apps/..." />')}
          </div>
        </div>

        ${field("Orden de aparición", '<input type="number" name="sort_order" value="0" />')}
        <div id="loc-msg"></div>
        <div class="row" style="margin-top:0.6rem;">
          <button class="btn">Guardar sede</button>
          <button type="button" class="btn-ghost" id="reset-loc">Nueva sede</button>
        </div>
      </form>

      <h3 style="margin-top:2rem;">Sedes registradas (${rows.length})</h3>
      <table style="margin-top:0.8rem">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Detalles</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((l) => `
            <tr>
              <td><strong>${escapeHtml(l.name)}</strong></td>
              <td><span class="tag">${l.location_type === "virtual" ? "Virtual" : "Presencial"}</span></td>
              <td>${l.location_type === "presencial" ? escapeHtml(l.address || "Sin dirección") : (l.delivery_enabled ? `Domicilios: ${escapeHtml(l.delivery_name || "Activo")}` : "Solo virtual")}</td>
              <td class="row">
                <button data-edit="${l.id}" class="btn-ghost">Editar</button>
                <button data-del="${l.id}" class="btn-danger">Eliminar</button>
              </td>
            </tr>`).join("") : '<tr><td colspan="4" style="text-align:center;color:var(--muted);">No hay sedes registradas.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  const form = view.querySelector("#loc-form");
  const formTitle = view.querySelector("#loc-form-title");
  const msgBox = view.querySelector("#loc-msg");
  const typeSelect = view.querySelector("#loc-type-select");
  const presencialSection = view.querySelector("#loc-presencial-section");
  const virtualSection = view.querySelector("#loc-virtual-section");
  const deliveryToggle = view.querySelector("#loc-delivery-toggle");
  const deliveryFields = view.querySelector("#loc-delivery-fields");

  function syncType() {
    if (typeSelect.value === "virtual") {
      presencialSection.classList.add("hidden");
      virtualSection.classList.remove("hidden");
    } else {
      presencialSection.classList.remove("hidden");
      virtualSection.classList.add("hidden");
    }
  }

  typeSelect.addEventListener("change", syncType);
  deliveryToggle.addEventListener("change", () => {
    deliveryFields.classList.toggle("hidden", !deliveryToggle.checked);
  });

  view.querySelector("#reset-loc").onclick = () => {
    form.reset();
    form.record_id.value = "";
    typeSelect.value = "presencial";
    syncType();
    deliveryFields.classList.add("hidden");
    formTitle.textContent = "Nueva sede";
    msgBox.innerHTML = "";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    msgBox.innerHTML = "";
    const payload = {
      name: form.name.value,
      address: form.address.value || "",
      location_type: form.location_type.value,
      hours_week_open: form.hours_week_open.value || "08:00",
      hours_week_close: form.hours_week_close.value || "18:00",
      hours_sunday_open: form.hours_sunday_open.value || "09:00",
      hours_sunday_close: form.hours_sunday_close.value || "14:00",
      how_to_arrive_url: form.how_to_arrive_url.value || "",
      virtual_weekday_morning: form.virtual_weekday_morning.value || "",
      virtual_weekday_afternoon: form.virtual_weekday_afternoon.value || "",
      virtual_weekend: form.virtual_weekend.value || "",
      delivery_enabled: deliveryToggle.checked,
      delivery_name: form.delivery_name.value || "",
      delivery_desktop_url: form.delivery_desktop_url.value || "",
      delivery_mobile_deep_link: form.delivery_mobile_deep_link.value || "",
      delivery_store_url: form.delivery_store_url.value || "",
      sort_order: Number(form.sort_order.value || 0),
    };
    try {
      if (form.record_id.value) {
        await api(`/api/admin/locations/${form.record_id.value}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/admin/locations", { method: "POST", body: JSON.stringify(payload) });
      }
      await adminLocations(view);
    } catch (err) {
      msgBox.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };

  view.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.onclick = () => {
      const l = rows.find((x) => x.id === Number(btn.dataset.edit));
      form.record_id.value = l.id;
      Object.keys(l).forEach((k) => {
        if (k === "id" || !form[k] || !form[k].type) return;
        if (form[k].type === "checkbox") form[k].checked = !!l[k];
        else form[k].value = l[k] ?? "";
      });
      syncType();
      deliveryFields.classList.toggle("hidden", !deliveryToggle.checked);
      formTitle.textContent = `Editar sede: ${l.name}`;
      form.scrollIntoView({ behavior: "smooth" });
    };
  });

  view.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("¿Eliminar esta sede?")) return;
      await api(`/api/admin/locations/${btn.dataset.del}`, { method: "DELETE" });
      await adminLocations(view);
    };
  });
}

async function adminContact(view) {
  const settings = await api("/api/admin/settings");
  const messages = await api("/api/contact/messages");
  view.innerHTML = `
    <div class="form-card">
      <h2>Configuración de contacto</h2>
      <form id="contact-settings" class="form">
        ${field("Correo electrónico receptor de mensajes", `<input type="email" name="contact_email" value="${escapeHtml(settings.contact_email)}" placeholder="ejemplo@empresa.com" required />`)}
        <small style="color:var(--muted);display:block;margin-top:-0.4rem;">Los comentarios, peticiones y sugerencias enviadas por clientes se remitirán a esta dirección.</small>
        <div id="contact-set-msg"></div>
        <button class="btn" style="margin-top:0.4rem;">Guardar correo de contacto</button>
      </form>
    </div>
    <div class="form-card" style="margin-top:1.5rem">
      <h2>Mensajes recibidos (${messages.length})</h2>
      <div style="display:grid;gap:0.9rem;margin-top:0.8rem;">
        ${messages.length ? messages.map((m) => `
          <article style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:0.9rem 1.1rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
              <strong>${escapeHtml(m.name)}</strong>
              <span style="font-size:0.82rem;color:var(--muted);">${m.created_at ? new Date(m.created_at).toLocaleString("es-CO") : ""}</span>
            </div>
            <div style="color:var(--accent);font-size:0.88rem;margin-bottom:0.5rem;"><a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a></div>
            <p style="margin:0;color:var(--ink);white-space:pre-wrap;">${escapeHtml(m.message)}</p>
          </article>`).join("") : "<p style='color:var(--muted);'>Aún no se han recibido mensajes.</p>"}
      </div>
    </div>
  `;

  const form = view.querySelector("#contact-settings");
  const msgBox = view.querySelector("#contact-set-msg");
  form.onsubmit = async (e) => {
    e.preventDefault();
    msgBox.innerHTML = "";
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ ...settings, contact_email: form.contact_email.value }),
      });
      msgBox.innerHTML = '<p class="notice">Correo de contacto actualizado correctamente.</p>';
    } catch (err) {
      msgBox.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };
}

async function adminUsers(view) {
  const users = await api("/api/admin/users");
  view.innerHTML = `
    <div class="form-card">
      <h2 id="user-form-title">Nuevo colaborador</h2>
      <p style="color:var(--muted);font-size:0.92rem;margin-top:0;">Los colaboradores solo pueden crear, modificar y eliminar productos.</p>
      <form id="user-form" class="form">
        <input type="hidden" name="record_id" value="" />
        ${field("Nombre completo", '<input name="name" required placeholder="Ej: María Gómez" />')}
        ${field("Nombre de usuario", '<input name="username" required minlength="3" placeholder="Ej: maria.gomez" />')}
        ${field("Contraseña", '<input type="password" name="password" minlength="8" placeholder="Mínimo 8 caracteres" />')}
        <small id="user-pw-hint" class="hidden" style="color:var(--muted);display:block;margin-top:-0.4rem;">Dejar en blanco para conservar la contraseña actual.</small>
        <div id="user-msg"></div>
        <div class="row" style="margin-top:0.4rem;">
          <button class="btn">Guardar colaborador</button>
          <button type="button" class="btn-ghost" id="reset-user">Nuevo colaborador</button>
        </div>
      </form>

      <h3 style="margin-top:2rem;">Usuarios en el sistema (${users.length})</h3>
      <table style="margin-top:0.8rem">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${users.map((u) => `
            <tr>
              <td><strong>${escapeHtml(u.name || "—")}</strong></td>
              <td>${escapeHtml(u.username)}</td>
              <td><span class="tag" style="${u.role === "admin" ? "background:#e8f6ea;color:#1b5e20;" : ""}">${u.role === "admin" ? "Administrador" : "Colaborador"}</span></td>
              <td class="row">
                ${u.role === "collaborator" ? `<button data-edit="${u.id}" class="btn-ghost">Editar</button><button data-del="${u.id}" class="btn-danger">Eliminar</button>` : '<span style="color:var(--muted);font-size:0.85rem;">Principal</span>'}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  const form = view.querySelector("#user-form");
  const formTitle = view.querySelector("#user-form-title");
  const pwHint = view.querySelector("#user-pw-hint");
  const msgBox = view.querySelector("#user-msg");

  view.querySelector("#reset-user").onclick = () => {
    form.reset();
    form.record_id.value = "";
    pwHint.classList.add("hidden");
    form.password.required = true;
    formTitle.textContent = "Nuevo colaborador";
    msgBox.innerHTML = "";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    msgBox.innerHTML = "";
    const payload = { name: form.name.value, username: form.username.value };
    if (form.password.value) payload.password = form.password.value;
    try {
      if (form.record_id.value) {
        await api(`/api/admin/users/${form.record_id.value}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        if (!form.password.value) {
          msgBox.innerHTML = '<p class="error">La contraseña es obligatoria para nuevos colaboradores.</p>';
          return;
        }
        await api("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
      }
      await adminUsers(view);
    } catch (err) {
      msgBox.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };

  view.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.onclick = () => {
      const u = users.find((x) => x.id === Number(btn.dataset.edit));
      form.record_id.value = u.id;
      form.name.value = u.name;
      form.username.value = u.username;
      form.password.value = "";
      form.password.required = false;
      pwHint.classList.remove("hidden");
      formTitle.textContent = `Editar colaborador: ${u.username}`;
      form.scrollIntoView({ behavior: "smooth" });
    };
  });

  view.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("¿Eliminar este colaborador?")) return;
      try {
        await api(`/api/admin/users/${btn.dataset.del}`, { method: "DELETE" });
        await adminUsers(view);
      } catch (err) {
        alert(err.message);
      }
    };
  });
}

async function adminAppearance(view) {
  const s = await api("/api/admin/settings");
  view.innerHTML = `
    <div class="form-card form-wide">
      <h2>Logo y colores de la página</h2>
      <p style="color:var(--muted);font-size:0.92rem;margin-top:0;">Personalice la identidad visual y el botón de domicilio.</p>
      
      <div style="margin-bottom:1.5rem;padding:1rem;background:#fff;border:1px solid var(--line);border-radius:12px;display:flex;align-items:center;gap:1.5rem;">
        <div>
          <label style="font-weight:600;margin-bottom:0.4rem;display:block;">Logo actual</label>
          ${s.logo_path ? `<img src="${s.logo_path}" alt="Logo" style="height:60px;background:#f9f9f9;padding:6px;border-radius:8px;border:1px solid var(--line);object-fit:contain;">` : '<p style="color:var(--muted);font-size:0.9rem;margin:0;">No se ha subido ningún logo aún.</p>'}
        </div>
      </div>

      <form id="look-form" class="form form-wide">
        ${field("Nombre de la empresa", `<input name="company_name" required value="${escapeHtml(s.company_name)}" />`)}
        
        <div class="row">
          ${field("Color del header", `<input type="color" name="header_color" value="${s.header_color}" style="height:44px;width:100px;cursor:pointer;padding:2px;" />`)}
          ${field("Color de fondo general", `<input type="color" name="background_color" value="${s.background_color}" style="height:44px;width:100px;cursor:pointer;padding:2px;" />`)}
        </div>

        ${field("Subir nuevo logo PNG", '<input type="file" name="logo" accept="image/png" />')}
        <small style="color:var(--muted);display:block;margin-top:-0.4rem;">Debe ser un archivo en formato PNG (fondo transparente recomendado).</small>

        <h3 style="margin-top:1.5rem;">Botón 'Pide a domicilio' en el header</h3>
        <label class="switch" style="font-weight:600;cursor:pointer;">
          <input type="checkbox" name="delivery_enabled" id="app-delivery-toggle" ${s.delivery_enabled ? "checked" : ""} />
          Mostrar botón 'Pide a domicilio' en la barra de navegación superior
        </label>

        <div id="app-delivery-fields" class="${s.delivery_enabled ? "" : "hidden"}" style="margin-top:0.7rem;">
          ${field("Nombre de la plataforma", `<input name="delivery_name" value="${escapeHtml(s.delivery_name)}" placeholder="Ej: Didi Food, WhatsApp, Rappi" />`)}
          ${field("URL en computador (descarga o web)", `<input name="delivery_desktop_url" value="${escapeHtml(s.delivery_desktop_url)}" placeholder="https://..." />`)}
          ${field("Enlace profundo para celular (deep link)", `<input name="delivery_mobile_deep_link" value="${escapeHtml(s.delivery_mobile_deep_link)}" placeholder="didifood://... o https://..." />`)}
          ${field("URL de la tienda si no tiene la app", `<input name="delivery_store_url" value="${escapeHtml(s.delivery_store_url)}" placeholder="https://play.google.com/..." />`)}
        </div>

        <div id="look-msg" style="margin-top:0.5rem;"></div>
        <button class="btn" style="margin-top:0.6rem;">Guardar apariencia y configuración</button>
      </form>
    </div>
  `;

  const form = view.querySelector("#look-form");
  const msgBox = view.querySelector("#look-msg");
  const deliveryToggle = view.querySelector("#app-delivery-toggle");
  const deliveryFields = view.querySelector("#app-delivery-fields");

  deliveryToggle.addEventListener("change", () => {
    deliveryFields.classList.toggle("hidden", !deliveryToggle.checked);
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    msgBox.innerHTML = "";
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          company_name: form.company_name.value,
          header_color: form.header_color.value,
          background_color: form.background_color.value,
          contact_email: s.contact_email,
          delivery_enabled: deliveryToggle.checked,
          delivery_name: form.delivery_name.value || "",
          delivery_desktop_url: form.delivery_desktop_url.value || "",
          delivery_mobile_deep_link: form.delivery_mobile_deep_link.value || "",
          delivery_store_url: form.delivery_store_url.value || "",
        }),
      });

      const file = form.logo.files[0];
      if (file && file.size) {
        const img = new FormData();
        img.append("file", file);
        await api("/api/admin/settings/logo", { method: "POST", body: img });
      }

      msgBox.innerHTML = '<p class="notice">Apariencia guardada correctamente. Actualizando vista...</p>';
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      msgBox.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };
}

async function renderSetup(root, user) {
  root.innerHTML = `
    <div class="wrap">
      <div class="form-card">
        <h1 class="hero-title">Configuración inicial requerida</h1>
        <p class="lede">Por seguridad de la plataforma, en el primer inicio de sesión debe configurar un nuevo usuario administrador, contraseña segura y un correo electrónico de recuperación.</p>
        <form id="setup-form" class="form">
          ${field("Nombre del administrador", '<input name="name" required minlength="2" placeholder="Ej: Administrador General" />')}
          ${field("Nuevo nombre de usuario", '<input name="username" required minlength="3" placeholder="Mínimo 3 caracteres" />')}
          ${field("Nueva contraseña segura", '<input type="password" name="password" required minlength="8" placeholder="Mínimo 8 caracteres" />')}
          ${field("Correo electrónico de recuperación", '<input type="email" name="email" id="setup-email" required placeholder="correo@ejemplo.com" />')}
          
          <div id="code-box" class="${user.smtp_configured ? "" : "hidden"}" style="background:#f4f8f5;border:1px solid #c9decb;padding:0.9rem;border-radius:12px;">
            <p style="margin:0 0 0.5rem;font-size:0.9rem;">El servidor de correo SMTP está activo. Se enviará un código de verificación a su correo:</p>
            <div class="row">
              <input name="verification_code" placeholder="Código de 6 dígitos" style="max-width:180px;" />
              <button type="button" class="btn-ghost" id="send-code">Enviar código al correo</button>
            </div>
          </div>
          
          ${user.smtp_configured ? "" : '<p style="color:var(--muted);font-size:0.88rem;">Nota: El servidor SMTP no está configurado actualmente, por lo que el código por correo no es necesario para completar la configuración.</p>'}
          <div id="setup-msg"></div>
          <button class="btn" style="margin-top:0.4rem;">Completar configuración inicial</button>
        </form>
      </div>
    </div>
  `;

  const msg = root.querySelector("#setup-msg");
  root.querySelector("#send-code")?.addEventListener("click", async () => {
    msg.innerHTML = "";
    try {
      const email = root.querySelector("#setup-email").value;
      if (!email) {
        msg.innerHTML = '<p class="error">Por favor ingrese primero el correo de recuperación.</p>';
        return;
      }
      await api("/api/auth/send-code", { method: "POST", body: JSON.stringify({ email }) });
      msg.innerHTML = '<p class="notice">Código de verificación enviado al correo. Revise su bandeja de entrada.</p>';
    } catch (err) {
      msg.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  });

  root.querySelector("#setup-form").onsubmit = async (e) => {
    e.preventDefault();
    msg.innerHTML = "";
    const form = e.target;
    try {
      const data = await api("/api/auth/setup", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.value,
          username: form.username.value,
          password: form.password.value,
          email: form.email.value,
          verification_code: form.verification_code ? form.verification_code.value || null : null,
        }),
      });
      setToken(data.token);
      history.pushState({}, "", "/admin");
      window.dispatchEvent(new Event("app:nav"));
    } catch (err) {
      msg.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };
}
