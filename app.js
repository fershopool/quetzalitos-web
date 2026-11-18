(function () {
  'use strict';

  const QZ = window.QZ;
  const KEY = 'qz-cart';
  const $ = (sel) => document.querySelector(sel);
  const money = (n) => '$' + n;

  function el(tag, cls, text, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    return n;
  }

  /* ---------- Reveal y navegación activa ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach((n) => io.observe(n));

    const links = document.querySelectorAll('a.nav__link');
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));
  } else {
    reveals.forEach((n) => n.classList.add('is-visible'));
  }

  /* ---------- Destellos del hero ---------- */
  const sparkles = $('.hero__sparkles');
  for (let i = 0; sparkles && i < 18; i++) {
    const s = document.createElement('i');
    s.style.left = (Math.random() * 100).toFixed(1) + '%';
    s.style.top = (Math.random() * 100).toFixed(1) + '%';
    s.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
    sparkles.appendChild(s);
  }

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2200);
  }

  /* ---------- Mapa (MapLibre + PMTiles locales, estilo Quetzalitos) ---------- */
  const places = $('#places');
  const caf = QZ.cafeterias;
  const buttons = [];
  const markers = [];
  let map = null;
  let activePlace = -1;

  function selectPlace(i, fly) {
    activePlace = i;
    buttons.forEach((b, j) => {
      b.classList.toggle('is-active', j === i);
      b.setAttribute('aria-pressed', String(j === i));
    });
    markers.forEach((m, j) => m.getElement().classList.toggle('is-active', j === i));
    if (i < 0) return;
    buttons[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    if (map && fly) map.flyTo({ center: [caf[i].lng, caf[i].lat], zoom: 16.2, speed: 1.2 });
    if (map) markers.forEach((m, j) => { if (j !== i && m.getPopup().isOpen()) m.togglePopup(); });
    if (map && !markers[i].getPopup().isOpen()) markers[i].togglePopup();
  }

  caf.forEach((c, i) => {
    const btn = el('button', 'place', null, { type: 'button', 'data-i': String(i), 'aria-pressed': 'false' });
    btn.append(el('strong', null, c.nombre), el('span', null, c.zona));
    const li = el('li');
    li.appendChild(btn);
    places.appendChild(li);
    buttons.push(btn);
  });

  // Atajos de zona: «Ver todas» + una por cada zona distinta.
  const zonesEl = $('#zones');
  function fitZone(zona) {
    if (!map) return;
    const pts = caf.filter((c) => !zona || c.zona === zona);
    const lngs = pts.map((c) => c.lng);
    const lats = pts.map((c) => c.lat);
    selectPlace(-1);
    markers.forEach((m) => { if (m.getPopup().isOpen()) m.togglePopup(); });
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 16, duration: 900 });
  }
  [''].concat(Array.from(new Set(caf.map((c) => c.zona)))).forEach((z) => {
    zonesEl.appendChild(el('button', 'zone', z || 'Ver todas', { type: 'button', 'data-z': z }));
  });
  zonesEl.addEventListener('click', (e) => {
    const b = e.target.closest('.zone');
    if (!b) return;
    zonesEl.querySelectorAll('.zone').forEach((n) => n.classList.toggle('is-active', n === b));
    fitZone(b.dataset.z);
  });
  zonesEl.firstChild.classList.add('is-active');

  places.addEventListener('click', (e) => {
    const btn = e.target.closest('.place');
    if (btn) selectPlace(Number(btn.dataset.i), true);
  });

  function initMap(maplibregl) {
    const base = new URL('mapa/', document.baseURI).href;
    maplibregl.setWorkerUrl(base + 'vendor/maplibre-gl-worker.mjs');
    maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);
    return fetch(base + 'style.json').then((r) => r.text()).then((txt) => {
      const bounds = new maplibregl.LngLatBounds();
      caf.forEach((c) => bounds.extend([c.lng, c.lat]));
      map = new maplibregl.Map({
        container: 'map',
        style: JSON.parse(txt.split('__BASE__').join(base)),
        bounds, fitBoundsOptions: { padding: 50 },
        minZoom: 10.5, maxZoom: 17.5,
        maxBounds: [[-99.25, 19.34], [-99.03, 19.5]],
        cooperativeGestures: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      caf.forEach((c, i) => {
        const node = el('button', 'pin', null, { type: 'button', 'aria-label': c.nombre });
        node.appendChild(el('span'));
        const popup = new maplibregl.Popup({ offset: [0, -38], closeButton: false });
        const box = el('div');
        box.append(el('strong', null, c.nombre), document.createElement('br'), document.createTextNode(c.zona));
        popup.setDOMContent(box);
        const m = new maplibregl.Marker({ element: node, anchor: 'bottom' }).setLngLat([c.lng, c.lat]).setPopup(popup).addTo(map);
        node.addEventListener('click', () => selectPlace(i, false));
        markers.push(m);
      });
      if (activePlace >= 0) selectPlace(activePlace, false);
      map.on('error', (e) => { if (e.error && !map.loaded()) mapFallback(); });
    });
  }

  function mapFallback() {
    const m = $('#map');
    if (m && !m.dataset.failed) {
      m.dataset.failed = '1';
      m.replaceChildren(el('p', 'map__fail', 'No pudimos cargar el mapa. Elige una cafetería de la lista para ver dónde está.'));
    }
  }

  // El mapa se carga al acercarse a la sección: no pesa en el primer render.
  const mapBox = $('#map');
  function loadMap() {
    if (loadMap.done || !mapBox) return;
    loadMap.done = true;
    import('./mapa/vendor/maplibre-gl.mjs').then((mod) => initMap(mod.default || mod)).catch(mapFallback);
  }
  if (mapBox && 'IntersectionObserver' in window) {
    new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { o.disconnect(); loadMap(); } }, { rootMargin: '400px' }).observe(mapBox);
  } else loadMap();

  /* ---------- Pedido (carrito) ---------- */
  function load() {
    const out = {};
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      Object.keys(raw).forEach((id) => {
        const q = raw[id];
        if (Object.prototype.hasOwnProperty.call(QZ.productos, id) && Number.isInteger(q) && q > 0) out[id] = q;
      });
    } catch (e) { /* sin storage o JSON corrupto: arranca vacío */ }
    return out;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* sin storage: solo en memoria */ }
  }

  const cart = load();
  const cartEl = $('#cart');
  const backdrop = $('#cart-backdrop');
  const openBtn = $('#cart-open');
  const closeBtn = $('#cart-close');
  const countEl = $('#cart-count');
  const emptyEl = $('#cart-empty');
  const itemsEl = $('#cart-items');
  const totalEl = $('#cart-total');
  const sendBtn = $('#cart-send');

  function totalText() {
    let sum = 0;
    let pending = false;
    Object.keys(cart).forEach((id) => {
      const p = QZ.productos[id];
      if (typeof p.precio === 'number') sum += p.precio * cart[id];
      else pending = true;
    });
    if (pending && !sum) return 'Por cotizar';
    return money(sum) + (pending ? ' + por cotizar' : '');
  }

  function itemNode(id) {
    const p = QZ.productos[id];
    const q = cart[id];
    const qty = el('div', 'qty');
    qty.append(
      el('button', null, '−', { type: 'button', 'data-dec': id, 'aria-label': 'Quitar uno' }),
      el('output', null, String(q)),
      el('button', null, '+', { type: 'button', 'data-inc': id, 'aria-label': 'Agregar uno' })
    );
    const sub = typeof p.precio === 'number' ? money(p.precio * q) : 'Por cotizar';
    const li = el('li', 'cart__item');
    li.append(el('span', 'cart__name', p.nombre), qty, el('span', 'cart__sub', sub));
    return li;
  }

  let bumpTimer = 0;
  function bump(node) {
    node.classList.remove('is-bump');
    void node.offsetWidth; // reinicia la animación
    node.classList.add('is-bump');
    clearTimeout(bumpTimer);
    bumpTimer = setTimeout(() => node.classList.remove('is-bump'), 400);
  }

  let lastCount = null;
  function render() {
    const ids = Object.keys(cart);
    const count = ids.reduce((s, id) => s + cart[id], 0);
    countEl.textContent = String(count);
    countEl.hidden = count === 0;
    if (lastCount !== null && count !== lastCount) bump(countEl);
    lastCount = count;
    emptyEl.hidden = ids.length > 0;
    itemsEl.replaceChildren(...ids.map(itemNode));
    totalEl.textContent = totalText();
    sendBtn.disabled = ids.length === 0;
    save();
  }

  function change(id, delta) {
    const q = (cart[id] || 0) + delta;
    if (q > 0) cart[id] = q;
    else delete cart[id];
    render();
  }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    if (add) {
      const p = QZ.productos[add.dataset.add];
      if (!p) return;
      change(add.dataset.add, 1);
      add.classList.add('is-added');
      setTimeout(() => add.classList.remove('is-added'), 600);
      toast('Agregado: ' + p.nombre);
    } else if (inc) {
      change(inc.dataset.inc, 1);
    } else if (dec) {
      change(dec.dataset.dec, -1);
    }
  });

  let closeTimer = 0;
  function openCart() {
    clearTimeout(closeTimer);
    cartEl.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      cartEl.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.classList.add('cart-open');
      closeBtn.focus();
    });
  }

  function closeCart() {
    if (cartEl.hidden) return;
    cartEl.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.classList.remove('cart-open');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => { cartEl.hidden = true; backdrop.hidden = true; }, 300);
    openBtn.focus();
  }

  openBtn.addEventListener('click', openCart);
  closeBtn.addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartEl.classList.contains('is-open')) closeCart();
  });

  /* ---------- WhatsApp ---------- */
  function wa(texto) {
    window.open('https://wa.me/' + QZ.whatsapp + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  }

  sendBtn.addEventListener('click', () => {
    const lines = ['Hola Quetzalitos, quiero hacer este pedido:'];
    Object.keys(cart).forEach((id) => {
      const p = QZ.productos[id];
      const q = cart[id];
      const sub = typeof p.precio === 'number' ? money(p.precio * q) : 'por cotizar';
      lines.push('• ' + q + ' × ' + p.nombre + ' — ' + sub);
    });
    lines.push('Total: ' + totalText());
    wa(lines.join('\n'));
  });

  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const v = (name) => form.elements.namedItem(name).value.trim();
    const nombre = v('nombre');
    const negocio = v('negocio');
    const interes = v('interes');
    const mensaje = v('mensaje');
    const lines = ['Hola Quetzalitos, soy ' + nombre + (negocio ? ' (' + negocio + ')' : '') + '.'];
    if (interes) lines.push('Me interesa: ' + interes);
    if (mensaje) lines.push(mensaje);
    wa(lines.join('\n'));
  });

  /* ---------- Toast y arranque ---------- */
  render();
})();
