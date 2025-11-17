
const API_BASE = "https://maobe-pedidos.onrender.com";

let currentStore = null;
let currentZones = [];
let currentCoupons = [];

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

async function createOrUpdateStore(event) {
  event.preventDefault();
  const name = document.getElementById("store-name").value.trim();
  const slug = document.getElementById("store-slug").value.trim();
  const whatsapp = document.getElementById("store-whatsapp").value.trim();
  const logo = document.getElementById("store-logo").value.trim();
  const color = document.getElementById("store-color").value.trim();

  setText("store-status", "");
  setHTML("store-link", "");
  setText("store-status-badge", "Guardando...");

  try {
    let method = "POST";
    let url = `${API_BASE}/stores`;
    let body = {
      name,
      slug,
      whatsapp_number: whatsapp,
      logo_url: logo || null,
      primary_color: color || null
    };

    if (currentStore && currentStore.id) {
      method = "PATCH";
      url = `${API_BASE}/stores/${currentStore.id}`;
      body = {
        name,
        whatsapp_number: whatsapp,
        logo_url: logo || null,
        primary_color: color || null
      };
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.detail || "Error guardando tienda";
      document.getElementById("store-status").className = "status error";
      setText("store-status", msg);
      setText("store-status-badge", "Error");
      return;
    }

    currentStore = data;
    document.getElementById("store-status").className = "status ok";
    setText("store-status", currentStore.id ? "Tienda guardada correctamente." : "Tienda creada correctamente.");
    setText("store-status-badge", `Tienda #${data.id}`);

    const catalogUrl = `${window.location.origin}/catalog.html?tienda=${encodeURIComponent(data.slug)}`;
    setHTML("store-link", `Enlace catálogo: <br><strong>${catalogUrl}</strong>`);

    await loadZones();
    await loadCoupons();
    await loadProducts();
    await loadOrders();
    await loadStats();
  } catch (err) {
    console.error(err);
    document.getElementById("store-status").className = "status error";
    setText("store-status", "Error de conexión con el servidor.");
    setText("store-status-badge", "Error");
  }
}

async function loadProducts() {
  const wrapper = document.getElementById("products-table-wrapper");
  if (!currentStore) {
    wrapper.innerHTML = "<p style='font-size:.8rem;color:var(--muted);'>No hay tienda seleccionada.</p>";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/stores/${currentStore.id}/products`);
    if (!res.ok) {
      wrapper.innerHTML = "<p style='font-size:.8rem;color:var(--muted);'>No se pudieron cargar los productos.</p>";
      return;
    }
    const products = await res.json();
    if (!products.length) {
      wrapper.innerHTML = "<p style='font-size:.8rem;color:var(--muted);'>Todavía no hay productos para esta tienda.</p>";
      return;
    }

    let html = "<table class='table'><thead><tr>";
    html += "<th>Nombre</th><th>Categoría</th><th>Stock</th><th class='price'>Precio</th>";
    html += "</tr></thead><tbody>";

    products.forEach(p => {
      const lowStock = p.min_stock && p.stock <= p.min_stock;
      html += `<tr style="${lowStock ? "color:#f97373;" : ""}">
        <td>${p.name}</td>
        <td>${p.category || "-"}</td>
        <td>${p.stock != null ? p.stock : "-"}</td>
        <td class='price'>$${Number(p.price).toFixed(2)}</td>
      </tr>`;
    });

    html += "</tbody></table>";
    wrapper.innerHTML = html;
  } catch (err) {
    console.error(err);
    wrapper.innerHTML = "<p style='font-size:.8rem;color:var(--muted);'>Error cargando productos.</p>";
  }
}

async function addProduct(event) {
  event.preventDefault();
  if (!currentStore) {
    document.getElementById("product-status").className = "status error";
    setText("product-status", "Primero crea una tienda.");
    return;
  }

  const name = document.getElementById("product-name").value.trim();
  const desc = document.getElementById("product-desc").value.trim();
  const priceRaw = document.getElementById("product-price").value;
  const image = document.getElementById("product-image").value.trim();
  const category = document.getElementById("product-category").value.trim();
  const stock = Number(document.getElementById("product-stock").value || 0);
  const minStock = Number(document.getElementById("product-min-stock").value || 0);

  const price = Number(priceRaw);
  if (!name || !price || price <= 0) {
    document.getElementById("product-status").className = "status error";
    setText("product-status", "Nombre y precio son obligatorios.");
    return;
  }

  document.getElementById("product-status").className = "status";
  setText("product-status", "Agregando producto...");

  try {
    const res = await fetch(`${API_BASE}/stores/${currentStore.id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: desc || null,
        price,
        image_url: image || null,
        category: category || null,
        is_active: true,
        stock,
        min_stock: minStock
      })
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.detail || "Error agregando producto";
      document.getElementById("product-status").className = "status error";
      setText("product-status", msg);
      return;
    }

    document.getElementById("product-status").className = "status ok";
    setText("product-status", "Producto agregado.");

    document.getElementById("product-name").value = "";
    document.getElementById("product-desc").value = "";
    document.getElementById("product-price").value = "";
    document.getElementById("product-image").value = "";
    document.getElementById("product-category").value = "";
    document.getElementById("product-stock").value = "0";
    document.getElementById("product-min-stock").value = "0";

    await loadProducts();
  } catch (err) {
    console.error(err);
    document.getElementById("product-status").className = "status error";
    setText("product-status", "Error de conexión.");
  }
}

async function addZone(event) {
  event.preventDefault();
  if (!currentStore) {
    document.getElementById("zone-status").className = "status error";
    setText("zone-status", "Primero crea una tienda.");
    return;
  }

  const name = document.getElementById("zone-name").value.trim();
  const price = Number(document.getElementById("zone-price").value || 0);
  const minTotal = document.getElementById("zone-min-total").value;
  const minTotalNum = minTotal ? Number(minTotal) : null;

  if (!name || price < 0) {
    document.getElementById("zone-status").className = "status error";
    setText("zone-status", "Nombre y precio son obligatorios.");
    return;
  }

  document.getElementById("zone-status").className = "status";
  setText("zone-status", "Agregando zona...");

  try {
    const res = await fetch(`${API_BASE}/stores/${currentStore.id}/delivery-zones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        price,
        min_total_free: minTotalNum
      })
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.detail || "Error agregando zona";
      document.getElementById("zone-status").className = "status error";
      setText("zone-status", msg);
      return;
    }

    document.getElementById("zone-status").className = "status ok";
    setText("zone-status", "Zona agregada.");
    document.getElementById("zone-name").value = "";
    document.getElementById("zone-price").value = "";
    document.getElementById("zone-min-total").value = "";

    await loadZones();
  } catch (err) {
    console.error(err);
    document.getElementById("zone-status").className = "status error";
    setText("zone-status", "Error de conexión.");
  }
}

async function loadZones() {
  const container = document.getElementById("zones-list");
  if (!currentStore) {
    container.textContent = "No hay tienda seleccionada.";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/stores/${currentStore.id}/delivery-zones`);
    if (!res.ok) {
      container.textContent = "No se pudieron cargar las zonas.";
      return;
    }
    const zones = await res.json();
    currentZones = zones;
    if (!zones.length) {
      container.textContent = "No hay zonas configuradas.";
      return;
    }
    let html = "<ul style='padding-left:1rem;margin:0;'>";
    zones.forEach(z => {
      html += `<li>${z.name}: $${z.price.toFixed(2)} ${z.min_total_free ? `(gratis desde $${z.min_total_free.toFixed(2)})` : ""}</li>`;
    });
    html += "</ul>";
    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.textContent = "Error cargando zonas.";
  }
}

async function addCoupon(event) {
  event.preventDefault();
  if (!currentStore) {
    document.getElementById("coupon-status").className = "status error";
    setText("coupon-status", "Primero crea una tienda.");
    return;
  }

  const code = document.getElementById("coupon-code").value.trim();
  const percent = Number(document.getElementById("coupon-percent").value || 0);
  const minTotal = document.getElementById("coupon-min-total").value;
  const minTotalNum = minTotal ? Number(minTotal) : null;

  if (!code || percent <= 0) {
    document.getElementById("coupon-status").className = "status error";
    setText("coupon-status", "Código y % de descuento son obligatorios.");
    return;
  }

  document.getElementById("coupon-status").className = "status";
  setText("coupon-status", "Agregando cupón...");

  try {
    const res = await fetch(`${API_BASE}/stores/${currentStore.id}/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        percent,
        min_total: minTotalNum,
        active: true
      })
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.detail || "Error agregando cupón";
      document.getElementById("coupon-status").className = "status error";
      setText("coupon-status", msg);
      return;
    }

    document.getElementById("coupon-status").className = "status ok";
    setText("coupon-status", "Cupón agregado.");
    document.getElementById("coupon-code").value = "";
    document.getElementById("coupon-percent").value = "10";
    document.getElementById("coupon-min-total").value = "";

    await loadCoupons();
  } catch (err) {
    console.error(err);
    document.getElementById("coupon-status").className = "status error";
    setText("coupon-status", "Error de conexión.");
  }
}

async function loadCoupons() {
  const container = document.getElementById("coupons-list");
  if (!currentStore) {
    container.textContent = "No hay tienda seleccionada.";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/stores/${currentStore.id}/coupons`);
    if (!res.ok) {
      container.textContent = "No se pudieron cargar los cupones.";
      return;
    }
    const coupons = await res.json();
    currentCoupons = coupons;
    if (!coupons.length) {
      container.textContent = "No hay cupones configurados.";
      return;
    }
    let html = "<ul style='padding-left:1rem;margin:0;'>";
    coupons.forEach(c => {
      html += `<li>${c.code}: ${c.percent}% ${c.min_total ? `(mínimo $${c.min_total.toFixed(2)})` : ""}</li>`;
    });
    html += "</ul>";
    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.textContent = "Error cargando cupones.";
  }
}

async function loadOrders() {
  const wrapper = document.getElementById("orders-table-wrapper");
  if (!currentStore) {
    wrapper.innerHTML = "<p style='font-size:.8rem;color:var(--muted);'>No hay tienda seleccionada.</p>";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/stores/${currentStore.id}/orders`);
    if (!res.ok) {
      wrapper.innerHTML = "<p style='font-size:.8rem;color:var(--muted);'>No se pudieron cargar los pedidos.</p>";
      return;
    }
    const orders = await res.json();
    if (!orders.length) {
      wrapper.innerHTML = "<p style='font-size:.8rem;color:var(--muted);'>No hay pedidos para esta tienda.</p>";
      return;
    }

    let html = "<table class='table'><thead><tr>";
    html += "<th>#</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th class='total'>Total</th><th></th>";
    html += "</tr></thead><tbody>";

    orders.forEach(o => {
      const dateStr = o.created_at ? o.created_at.replace("T", " ").slice(0, 16) : "";
      html += `<tr>
        <td>#${o.id}</td>
        <td>${dateStr}</td>
        <td>${o.customer_name || "-"}</td>
        <td>${o.status}</td>
        <td class='total'>$${o.total.toFixed(2)}</td>
        <td><button class="btn btn-secondary" data-order-id="${o.id}">Detalle</button></td>
      </tr>`;
    });

    html += "</tbody></table>";
    wrapper.innerHTML = html;

    wrapper.querySelectorAll("button[data-order-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-order-id"));
        const order = orders.find(o => o.id === id);
        if (order) {
          showOrderDetail(order);
        }
      });
    });
  } catch (err) {
    console.error(err);
    wrapper.innerHTML = "<p style='font-size:.8rem;color:var(--muted);'>Error cargando pedidos.</p>";
  }
}

function showOrderDetail(order) {
  let text = `Pedido #${order.id}\n`;
  text += `Estado: ${order.status}\n`;
  if (order.customer_name) text += `Cliente: ${order.customer_name}\n`;
  if (order.customer_address) text += `Dirección: ${order.customer_address}\n`;
  if (order.delivery_type) text += `Entrega: ${order.delivery_type}\n`;
  if (order.payment_method) text += `Pago: ${order.payment_method}\n`;
  text += "\nItems:\n";
  order.items.forEach(it => {
    text += `- ${it.product_name} x${it.quantity} ($${it.unit_price.toFixed(2)})\n`;
  });
  text += `\nSubtotal: $${order.subtotal.toFixed(2)}\n`;
  if (order.delivery_price && order.delivery_price > 0) {
    text += `Envío: $${order.delivery_price.toFixed(2)} (${order.delivery_zone_name})\n`;
  }
  if (order.discount_value && order.discount_value > 0) {
    text += `Descuento: -$${order.discount_value.toFixed(2)} (${order.coupon_code})\n`;
  }
  text += `Total: $${order.total.toFixed(2)}\n`;
  if (order.customer_note) {
    text += `\nComentario: ${order.customer_note}\n`;
  }
  alert(text);
}

async function loadStats() {
  if (!currentStore) return;
  try {
    const res = await fetch(`${API_BASE}/stores/${currentStore.id}/stats/summary`);
    if (!res.ok) return;
    const s = await res.json();
    setText("stat-today-orders", s.today_orders);
    setText("stat-today-total", "$" + s.today_total.toFixed(2));
    setText("stat-last7-orders", s.last7_orders);
    setText("stat-last7-total", "$" + s.last7_total.toFixed(2));
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("store-form").addEventListener("submit", createOrUpdateStore);
document.getElementById("product-form").addEventListener("submit", addProduct);
document.getElementById("zone-form").addEventListener("submit", addZone);
document.getElementById("coupon-form").addEventListener("submit", addCoupon);
