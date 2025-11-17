
const API_BASE = "https://maobe-pedidos.onrender.com";

const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get("tienda") || "demo";

let storeData = null;
let deliveryZones = [];
let coupons = [];
let cart = [];

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

async function loadCatalog() {
  try {
    const res = await fetch(`${API_BASE}/catalog/${slug}`);
    if (!res.ok) {
      document.body.innerHTML = "<h2 style='padding:1rem;'>Tienda no encontrada</h2>";
      return;
    }
    const data = await res.json();
    storeData = data.store;
    deliveryZones = data.delivery_zones || [];
    coupons = data.coupons || [];

    document.getElementById("store-name").textContent = data.store.name;
    document.getElementById("store-info").textContent =
      "Pedidos por WhatsApp al +" + data.store.whatsapp_number;

    const logoCircle = document.getElementById("store-logo-circle");
    if (storeData.logo_url) {
      logoCircle.style.backgroundImage = `url('${storeData.logo_url}')`;
      logoCircle.style.backgroundSize = "cover";
      logoCircle.textContent = "";
    }

    const container = document.getElementById("products");
    const emptyMsg = document.getElementById("no-products");
    container.innerHTML = "";

    if (!data.products || data.products.length === 0) {
      emptyMsg.style.display = "block";
    } else {
      emptyMsg.style.display = "none";
    }

    const categories = [...new Set(data.products.map(p => p.category).filter(Boolean))];

    data.products.forEach(prod => {
      const card = document.createElement("article");
      card.className = "product-card";

      const imgWrap = document.createElement("div");
      imgWrap.className = "product-image-wrap";

      if (prod.image_url) {
        const img = document.createElement("img");
        img.src = prod.image_url;
        img.alt = prod.name;
        img.loading = "lazy";
        imgWrap.appendChild(img);
      } else {
        imgWrap.innerHTML = "<span style='color:#64748b;font-size:.8rem;'>Sin imagen</span>";
      }

      const nameEl = document.createElement("h4");
      nameEl.className = "product-name";
      nameEl.textContent = prod.name;

      const descEl = document.createElement("p");
      descEl.className = "product-desc";
      let desc = prod.description || "";
      if (prod.stock !== null && prod.stock > 0) {
        desc += (desc ? " · " : "") + `Stock: ${prod.stock}`;
      } else if (prod.stock === 0) {
        desc += (desc ? " · " : "") + "Sin stock";
      }
      descEl.textContent = desc;

      const footer = document.createElement("div");
      footer.className = "product-footer";

      const priceEl = document.createElement("span");
      priceEl.className = "price";
      priceEl.textContent = money(prod.price);

      const btn = document.createElement("button");
      btn.className = "add-btn";
      btn.textContent = prod.stock === 0 ? "Sin stock" : "Agregar";
      btn.disabled = prod.stock === 0;
      btn.addEventListener("click", () => addToCart(prod));

      footer.appendChild(priceEl);
      footer.appendChild(btn);

      card.appendChild(imgWrap);
      card.appendChild(nameEl);
      card.appendChild(descEl);
      card.appendChild(footer);

      container.appendChild(card);
    });

    const zoneSelect = document.getElementById("delivery-zone");
    if (deliveryZones.length === 0) {
      zoneSelect.innerHTML = "<option value=''>Sin envío configurado</option>";
    } else {
      zoneSelect.innerHTML = "<option value=''>Seleccionar zona...</option>";
      deliveryZones.forEach(z => {
        const opt = document.createElement("option");
        opt.value = String(z.id);
        let label = `${z.name} (${money(z.price)})`;
        if (z.min_total_free) {
          label += ` · Gratis desde ${money(z.min_total_free)}`;
        }
        opt.textContent = label;
        zoneSelect.appendChild(opt);
      });
    }

    zoneSelect.addEventListener("change", updateDeliveryInfo);
    updateDeliveryInfo();
    updateCartUI();
  } catch (err) {
    console.error(err);
    document.body.innerHTML = "<h2 style='padding:1rem;'>Error cargando la tienda</h2>";
  }
}

function updateDeliveryInfo() {
  const zoneSelect = document.getElementById("delivery-zone");
  const info = document.getElementById("delivery-info");
  const id = zoneSelect.value;
  if (!id) {
    info.textContent = "Si eliges envío, coordinarás el costo y la zona con el comercio por WhatsApp.";
    return;
  }
  const z = deliveryZones.find(z => String(z.id) === id);
  if (!z) {
    info.textContent = "";
    return;
  }
  let text = `Zona ${z.name}: envío ${money(z.price)}`;
  if (z.min_total_free) {
    text += ` · Gratis desde ${money(z.min_total_free)}`;
  }
  info.textContent = text;
}

function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      qty: 1
    });
  }
  updateCartUI();
}

function updateCartUI() {
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.qty * item.price, 0);

  const summaryEl = document.getElementById("cart-summary");
  const btn = document.getElementById("whatsapp-btn");
  const floatBtn = document.getElementById("floating-wa");

  if (totalItems === 0) {
    summaryEl.textContent = "Carrito vacío";
    btn.disabled = true;
    floatBtn.style.display = "none";
  } else {
    summaryEl.textContent = `${totalItems} ítems · Subtotal ${money(subtotal)}`;
    btn.disabled = false;
    floatBtn.style.display = "flex";
  }

  btn.onclick = sendToWhatsAppAndCreateOrder;
  floatBtn.onclick = sendToWhatsAppAndCreateOrder;
}

async function sendToWhatsAppAndCreateOrder() {
  if (!storeData || cart.length === 0) return;

  const customerName = document.getElementById("customer-name").value.trim() || null;
  const customerAddress = document.getElementById("customer-address").value.trim() || null;
  const customerNote = document.getElementById("customer-note").value.trim() || null;
  const deliveryType = document.getElementById("delivery-type").value || "retiro";
  const paymentMethod = document.getElementById("payment-method").value || null;
  const deliveryZoneIdRaw = document.getElementById("delivery-zone").value;
  const couponCode = document.getElementById("coupon-code").value.trim() || null;

  const deliveryZoneId = deliveryZoneIdRaw ? Number(deliveryZoneIdRaw) : null;

  try {
    const itemsForApi = cart.map(item => ({
      product_id: item.id,
      quantity: item.qty
    }));

    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_slug: slug,
        items: itemsForApi,
        customer_name: customerName,
        customer_address: customerAddress,
        customer_note: customerNote,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        delivery_zone_id: deliveryZoneId,
        coupon_code: couponCode
      })
    });

    let orderData = null;
    if (res.ok) {
      orderData = await res.json();
    } else {
      console.warn("No se pudo registrar el pedido en el backend");
    }

    let text = "Hola! Quiero hacer este pedido:%0A%0A";
    if (orderData && orderData.id) {
      text += `Pedido #${orderData.id}%0A%0A`;
    }

    cart.forEach(item => {
      text += `- ${item.name} x${item.qty} (${money(item.price)} c/u)%0A`;
    });

    if (orderData) {
      text += `%0ASubtotal: ${money(orderData.subtotal)}`;
      if (orderData.delivery_price && orderData.delivery_price > 0) {
        text += `%0AEnvío (${orderData.delivery_zone_name}): ${money(orderData.delivery_price)}`;
      }
      if (orderData.discount_value && orderData.discount_value > 0) {
        text += `%0ADescuento: -${money(orderData.discount_value)} (código ${orderData.coupon_code})`;
      }
      text += `%0ATotal: ${money(orderData.total)}`;
    }

    if (customerName) {
      text += `%0A%0ANombre: ${encodeURIComponent(customerName)}`;
    }
    if (customerAddress) {
      text += `%0ADirección/zona: ${encodeURIComponent(customerAddress)}`;
    }
    if (deliveryType) {
      text += `%0ATipo de entrega: ${encodeURIComponent(deliveryType)}`;
    }
    if (paymentMethod) {
      text += `%0AForma de pago: ${encodeURIComponent(paymentMethod)}`;
    }
    if (customerNote) {
      text += `%0AComentario: ${encodeURIComponent(customerNote)}`;
    }

    const waUrl = `https://wa.me/${storeData.whatsapp_number}?text=${text}`;
    window.open(waUrl, "_blank");
  } catch (err) {
    console.error(err);
    alert("Hubo un problema al registrar el pedido. Intenta de nuevo.");
  }
}

loadCatalog();
