/* ================================================================
   FLY RESTAURANT — cart.js
   Cart, Wishlist, Live Search, Login/Register, Toasts, Back-to-top.
   Uses MENU_DB from js/products-data.js (loaded before this file).
   All state persists via localStorage — no backend needed.
================================================================ */

const MENU = (typeof MENU_DB !== 'undefined') ? MENU_DB : [];
const LS_CART = 'flyrest_cart';
const LS_WISH = 'flyrest_wishlist';
const LS_USER = 'flyrest_user';

function findItem(slug) { return MENU.find(m => m.slug === slug); }

/* Make a non-button element (like our header <li> icons) behave like
   a real button for keyboard users — Enter/Space triggers the same
   action as a click, and it's already focusable via tabindex. */
function makeKeyboardClickable(el, handler) {
  if (!el) return;
  el.addEventListener('click', handler);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler(e);
    }
  });
}

/* ────────────────────────────────────────────
   TOAST NOTIFICATIONS
──────────────────────────────────────────── */
function ensureToastContainer() {
  let c = document.getElementById('toastContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}
function showToast(message, icon) {
  const c = ensureToastContainer();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<i class="fa-solid ${icon || 'fa-circle-check'}"></i><span>${message}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ────────────────────────────────────────────
   CART
──────────────────────────────────────────── */
function getCart() {
  try { return JSON.parse(localStorage.getItem(LS_CART)) || []; }
  catch { return []; }
}
function saveCart(cart) { localStorage.setItem(LS_CART, JSON.stringify(cart)); }

function addToCart(slug, qty = 1) {
  const cart = getCart();
  const existing = cart.find(c => c.slug === slug);
  if (existing) existing.qty += qty;
  else cart.push({ slug, qty });
  saveCart(cart);
  updateCartBadge();
  const item = findItem(slug);
  showToast((item ? item.name : 'Item') + ' added to cart', 'fa-cart-shopping');
}
function updateCartQty(slug, delta) {
  const cart = getCart();
  const row = cart.find(c => c.slug === slug);
  if (!row) return;
  row.qty += delta;
  const filtered = row.qty <= 0 ? cart.filter(c => c.slug !== slug) : cart;
  saveCart(filtered);
  updateCartBadge();
  renderCartPage();
}
function removeFromCart(slug) {
  saveCart(getCart().filter(c => c.slug !== slug));
  updateCartBadge();
  renderCartPage();
  showToast('Removed from cart', 'fa-trash');
}
function cartCount() { return getCart().reduce((sum, c) => sum + c.qty, 0); }
function cartTotal() {
  return getCart().reduce((sum, c) => {
    const item = findItem(c.slug);
    return sum + (item ? item.price * c.qty : 0);
  }, 0);
}
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  badge.textContent = cartCount();
  badge.classList.add('pulse');
  setTimeout(() => badge.classList.remove('pulse'), 400);
}

/* ────────────────────────────────────────────
   WISHLIST
──────────────────────────────────────────── */
function getWishlist() {
  try { return JSON.parse(localStorage.getItem(LS_WISH)) || []; }
  catch { return []; }
}
function saveWishlist(list) { localStorage.setItem(LS_WISH, JSON.stringify(list)); }
function isWishlisted(slug) { return getWishlist().includes(slug); }

function toggleWishlist(slug, iconEl) {
  let list = getWishlist();
  const active = list.includes(slug);
  if (active) {
    list = list.filter(s => s !== slug);
    showToast('Removed from wishlist', 'fa-heart-crack');
  } else {
    list.push(slug);
    showToast('Added to wishlist', 'fa-heart');
  }
  saveWishlist(list);
  updateWishBadge();
  if (iconEl) {
    iconEl.classList.toggle('active', !active);
    iconEl.classList.toggle('fa-solid', !active);
    iconEl.classList.toggle('fa-regular', active);
  }
  renderWishlistPage();
}
function updateWishBadge() {
  const badge = document.getElementById('wishBadge');
  if (!badge) return;
  badge.textContent = getWishlist().length;
  badge.classList.add('pulse');
  setTimeout(() => badge.classList.remove('pulse'), 400);
}

/* Sync heart icons already in the DOM (index.html menu grid) with
   whatever is currently saved in localStorage, on every page load */
function syncWishlistIcons() {
  const wished = getWishlist();
  document.querySelectorAll('.menu-item').forEach(card => {
    const slug = (card.id || '').replace('item-', '');
    const icon = card.querySelector('.wishlist');
    if (!icon || !slug) return;
    const active = wished.includes(slug);
    icon.classList.toggle('active', active);
    icon.classList.toggle('fa-solid', active);
    icon.classList.toggle('fa-regular', !active);
  });
}

/* ────────────────────────────────────────────
   ITEM DETAIL MODAL
──────────────────────────────────────────── */
function createItemModal() {
  if (document.getElementById('itemModalOverlay')) return;
  const el = document.createElement('div');
  el.id = 'itemModalOverlay';
  el.className = 'auth-modal-overlay item-modal-overlay';
  el.innerHTML = `<div class="item-modal" id="itemModalBody"></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeItemModal(); });
}
function openItemModal(slug) {
  const item = findItem(slug);
  if (!item) return;
  createItemModal();
  const dietLabel = { veg: 'Vegetarian', nonveg: 'Non-Vegetarian', egg: 'Contains Egg' }[item.veg];
  const dietClass = { veg: 'veg-dot', nonveg: 'nonveg-dot', egg: 'egg-dot' }[item.veg];
  const body = document.getElementById('itemModalBody');
  body.innerHTML = `
    <button class="auth-modal-close" id="itemModalClose"><i class="fa-solid fa-xmark"></i></button>
    <img src="${item.img}" alt="${item.name}" class="item-modal-img" onerror="this.onerror=null;this.src='assets/fly-restaurant-logo.png';">
    <div class="item-modal-info">
      <div class="item-modal-top">
        <span class="diet-indicator ${dietClass}" title="${dietLabel}" style="position:static"><span class="diet-dot"></span></span>
        ${item.bestseller ? '<span class="bestseller-ribbon" style="position:static">Bestseller</span>' : ''}
      </div>
      <h3>${item.name}</h3>
      <div class="item-rating" style="margin-bottom:10px"><i class="fa-solid fa-star"></i> ${item.rating} <span>(${item.reviews} reviews) • ${item.categoryLabel}</span></div>
      <p class="item-modal-desc">${item.description}</p>
      <div class="item-modal-footer">
        <span class="item-modal-price">₹${item.price}</span>
        <div class="cart-qty" id="modalQtyBox">
          <button data-modal-qty="-1">−</button>
          <span id="modalQtyVal">1</span>
          <button data-modal-qty="1">+</button>
        </div>
        <button class="checkout-btn" id="modalAddCartBtn" style="width:auto;padding:12px 24px;margin:0"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
      </div>
    </div>`;

  let qty = 1;
  body.querySelectorAll('[data-modal-qty]').forEach(b => {
    b.addEventListener('click', () => {
      qty = Math.max(1, qty + Number(b.dataset.modalQty));
      body.querySelector('#modalQtyVal').textContent = qty;
    });
  });
  body.querySelector('#itemModalClose').addEventListener('click', closeItemModal);
  body.querySelector('#modalAddCartBtn').addEventListener('click', () => {
    addToCart(slug, qty);
    closeItemModal();
  });

  document.getElementById('itemModalOverlay').classList.add('open');
}
function closeItemModal() {
  document.getElementById('itemModalOverlay')?.classList.remove('open');
}

/* ────────────────────────────────────────────
   NEWSLETTER SIGNUP (footer)
   NOTE: This is a front-end only demo — emails are saved in this
   browser's localStorage so the form has real working behaviour,
   but nothing is sent anywhere. To actually collect subscriber
   emails, connect this to a real service (Mailchimp, Brevo, a
   Google Sheet via a form backend, etc.) using their API/embed code.
──────────────────────────────────────────── */
function initNewsletter() {
  const btn = document.getElementById('newsletterBtn');
  const input = document.getElementById('newsletterEmail');
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address', 'fa-triangle-exclamation');
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem('flyrest_newsletter')) || [];
      if (!list.includes(email)) list.push(email);
      localStorage.setItem('flyrest_newsletter', JSON.stringify(list));
    } catch { }
    input.value = '';
    showToast('Subscribed! Thanks for joining us.', 'fa-envelope-circle-check');
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
}

/* ────────────────────────────────────────────
   VEG / NON-VEG FILTER
──────────────────────────────────────────── */
function initDietFilter() {
  const bar = document.getElementById('dietFilterBar');
  if (!bar) return;
  bar.querySelectorAll('.diet-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.diet-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.diet;
      document.querySelectorAll('.menu-item').forEach(card => {
        const indicator = card.querySelector('.diet-indicator');
        const diet = indicator ? indicator.dataset.diet : 'veg';
        let show = true;
        if (mode === 'veg') show = diet === 'veg';
        if (mode === 'nonveg') show = diet === 'nonveg' || diet === 'egg';
        card.classList.toggle('diet-hidden', !show);
      });
    });
  });
}

/* ────────────────────────────────────────────
   SEARCH OVERLAY
──────────────────────────────────────────── */
function createSearchOverlay() {
  if (document.getElementById('searchOverlay')) return;
  const el = document.createElement('div');
  el.id = 'searchOverlay';
  el.className = 'search-overlay';
  el.innerHTML = `
    <div class="search-panel">
      <div class="search-input-row">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="searchMain" placeholder="Search for dishes, starters, biryani, desserts..." autocomplete="off">
        <button class="search-close-btn" id="searchCloseBtn"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="search-results" id="searchResults">
        <div class="search-empty">Start typing to search the menu...</div>
      </div>
    </div>`;
  document.body.appendChild(el);

  el.addEventListener('click', e => { if (e.target === el) closeSearch(); });
  document.getElementById('searchCloseBtn').addEventListener('click', closeSearch);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });

  document.getElementById('searchMain').addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    const res = document.getElementById('searchResults');
    if (!q) { res.innerHTML = '<div class="search-empty">Start typing to search the menu...</div>'; window.__searchMatches = []; return; }
    const matches = MENU.filter(m => m.name.toLowerCase().includes(q) || m.categoryLabel.toLowerCase().includes(q)).slice(0, 8);
    if (!matches.length) { res.innerHTML = '<div class="search-empty">No dishes found for "' + q + '"</div>'; window.__searchMatches = []; return; }
    res.innerHTML = matches.map((m, i) => `
      <div class="search-result-item" data-idx="${i}">
        <img src="${m.img}" alt="${m.name}" onerror="this.onerror=null;this.src='assets/fly-restaurant-logo.png';">
        <div class="search-result-info">
          <div class="search-result-name">${m.name}</div>
          <div class="search-result-cat">${m.categoryLabel}</div>
        </div>
        <div class="search-result-price">₹${m.price}</div>
      </div>`).join('');
    res.querySelectorAll('.search-result-item').forEach(row => {
      row.addEventListener('click', () => goToItem(matches[Number(row.dataset.idx)]));
    });
    window.__searchMatches = matches;
  });

  document.getElementById('searchMain').addEventListener('keydown', e => {
    if (e.key === 'Enter' && window.__searchMatches && window.__searchMatches.length) {
      goToItem(window.__searchMatches[0]);
    }
  });
}
function openSearch() {
  createSearchOverlay();
  document.getElementById('searchOverlay').classList.add('open');
  setTimeout(() => document.getElementById('searchMain')?.focus(), 50);
}
function closeSearch() {
  document.getElementById('searchOverlay')?.classList.remove('open');
}
window.closeSearch = closeSearch;

/* Navigate to a menu item — index.html is the only page with the
   menu, so every result deep-links there via #item-<slug> and gets
   scrolled to + highlighted. If we're already on index.html, just
   scroll there directly instead of a full page reload. */
function goToItem(item) {
  const path = window.location.pathname;
  const onIndex = /index\.html$/.test(path) || path.endsWith('/');
  if (onIndex) {
    closeSearch();
    scrollToItem(item.slug);
  } else {
    window.location.href = 'index.html#item-' + item.slug;
  }
}
function scrollToItem(slug) {
  const card = document.getElementById('item-' + slug);
  if (!card) return;
  const headerH = document.querySelector('.header')?.offsetHeight || 0;
  const top = card.getBoundingClientRect().top + window.scrollY - headerH - 24;
  window.scrollTo({ top, behavior: 'smooth' });
  card.classList.add('product-highlight');
  setTimeout(() => card.classList.remove('product-highlight'), 2200);
}
function handleItemDeepLink() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#item-')) {
    const slug = hash.replace('#item-', '');
    setTimeout(() => scrollToItem(slug), 400);
  }
}

/* ────────────────────────────────────────────
   BACK TO TOP
──────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  btn.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(btn);
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      btn.classList.toggle('show', window.scrollY > 400);
      ticking = false;
    });
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ────────────────────────────────────────────
   LOGIN / REGISTER MODAL
──────────────────────────────────────────── */
function getUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER)); }
  catch { return null; }
}
function createAuthModal() {
  if (document.getElementById('authModalOverlay')) return;
  const el = document.createElement('div');
  el.id = 'authModalOverlay';
  el.className = 'auth-modal-overlay';
  el.innerHTML = `
    <div class="auth-modal">
      <button class="auth-modal-close" id="authCloseBtn"><i class="fa-solid fa-xmark"></i></button>
      <h2 id="authTitle">Welcome Back</h2>
      <p class="sub" id="authSub">Login to save your favourites & orders</p>
      <div class="auth-error" id="authError"></div>
      <input type="text" id="authName" placeholder="Full Name" style="display:none">
      <input type="email" id="authEmail" placeholder="Email address">
      <input type="password" id="authPassword" placeholder="Password">
      <button class="auth-submit" id="authSubmitBtn">Login</button>
      <div class="auth-switch">
        <span id="authSwitchText">New here? <a id="authSwitchLink">Create an account</a></span>
      </div>
    </div>`;
  document.body.appendChild(el);

  let mode = 'login';
  const nameInput = el.querySelector('#authName');
  const title = el.querySelector('#authTitle');
  const sub = el.querySelector('#authSub');
  const submitBtn = el.querySelector('#authSubmitBtn');
  const switchText = el.querySelector('#authSwitchText');
  const errorBox = el.querySelector('#authError');

  function setMode(m) {
    mode = m;
    errorBox.classList.remove('show');
    if (m === 'login') {
      nameInput.style.display = 'none';
      title.textContent = 'Welcome Back';
      sub.textContent = 'Login to save your favourites & orders';
      submitBtn.textContent = 'Login';
      switchText.innerHTML = 'New here? <a id="authSwitchLink">Create an account</a>';
    } else {
      nameInput.style.display = 'block';
      title.textContent = 'Create Account';
      sub.textContent = 'Join Fly Restaurant for a better ordering experience';
      submitBtn.textContent = 'Register';
      switchText.innerHTML = 'Already have an account? <a id="authSwitchLink">Login</a>';
    }
    el.querySelector('#authSwitchLink').addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
  }
  setMode('login');

  el.addEventListener('click', e => { if (e.target === el) closeLoginModal(); });
  el.querySelector('#authCloseBtn').addEventListener('click', closeLoginModal);

  submitBtn.addEventListener('click', () => {
    const email = el.querySelector('#authEmail').value.trim();
    const pass = el.querySelector('#authPassword').value.trim();
    const name = nameInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || pass.length < 4 || (mode === 'register' && !name)) {
      errorBox.textContent = mode === 'register'
        ? 'Please fill your name, a valid email, and a password (4+ characters).'
        : 'Please enter a valid email and password.';
      errorBox.classList.add('show');
      return;
    }
    const displayName = mode === 'register' ? name : email.split('@')[0];
    localStorage.setItem(LS_USER, JSON.stringify({ name: displayName, email }));
    closeLoginModal();
    updateUserIcon();
    showToast(`Welcome, ${displayName}!`, 'fa-user');
  });
}
function openLoginModal() {
  createAuthModal();
  document.getElementById('authModalOverlay').classList.add('open');
}
function closeLoginModal() {
  document.getElementById('authModalOverlay')?.classList.remove('open');
}
function logoutUser() {
  localStorage.removeItem(LS_USER);
  updateUserIcon();
  document.querySelector('.user-greet-menu')?.classList.remove('open');
  showToast('Logged out', 'fa-right-from-bracket');
}
function updateUserIcon() {
  const btn = document.getElementById('userIconBtn');
  if (!btn) return;
  const user = getUser();
  let greetMenu = document.querySelector('.user-greet-menu');
  if (user) {
    btn.innerHTML = '<i class="fa-solid fa-circle-user"></i>' + user.name.split(' ')[0];
    if (!greetMenu) {
      greetMenu = document.createElement('div');
      greetMenu.className = 'user-greet-menu';
      btn.appendChild(greetMenu);
    }
    greetMenu.innerHTML = `<p>Signed in as<br><span>${user.name}</span></p><button id="logoutBtn">Logout</button>`;
    greetMenu.querySelector('#logoutBtn').addEventListener('click', (e) => { e.stopPropagation(); logoutUser(); });
  } else {
    btn.innerHTML = '<i class="fa-regular fa-user"></i>Account';
    greetMenu?.remove();
  }
}

/* ────────────────────────────────────────────
   CART PAGE RENDER (cart.html)
──────────────────────────────────────────── */
function renderCartPage() {
  const container = document.getElementById('cartPageContent');
  if (!container) return;
  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-cart-shopping"></i>
        <p>Your cart is empty. Explore our menu and add something delicious!</p>
        <a href="index.html#menu">Browse Menu</a>
      </div>`;
    return;
  }
  const rows = cart.map(c => {
    const item = findItem(c.slug);
    if (!item) return '';
    return `
      <div class="cart-row">
        <img src="${item.img}" alt="${item.name}" onerror="this.onerror=null;this.src='assets/fly-restaurant-logo.png';">
        <div class="cart-row-info">
          <h4>${item.name}</h4>
          <div class="cat">${item.categoryLabel}</div>
        </div>
        <div class="cart-qty">
          <button data-act="dec" data-slug="${item.slug}">−</button>
          <span>${c.qty}</span>
          <button data-act="inc" data-slug="${item.slug}">+</button>
        </div>
        <div class="cart-row-price">₹${item.price * c.qty}</div>
        <button class="cart-remove" data-slug="${item.slug}"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  }).join('');

  const subtotal = cartTotal();
  const gst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst;
  const deliveryNote = subtotal > 0 ? 'Calculated at delivery' : '—';

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-list">${rows}</div>
      <div class="cart-summary">
        <h3>Order Summary</h3>
        <div class="cart-summary-row"><span>Items (${cartCount()})</span><span>₹${subtotal}</span></div>
        <div class="cart-summary-row"><span>GST (5%)</span><span>₹${gst}</span></div>
        <div class="cart-summary-row"><span>Delivery</span><span>${deliveryNote}</span></div>
        <div class="cart-summary-row total"><span>Total</span><span>₹${grandTotal}</span></div>
        <button class="checkout-btn" id="whatsappOrderBtn"><i class="fa-brands fa-whatsapp"></i> Place Order via WhatsApp</button>
        <p class="note">Your order details will open in WhatsApp so our team can confirm availability, delivery time & payment.</p>
      </div>
    </div>`;

  container.querySelectorAll('[data-act="inc"]').forEach(b => b.addEventListener('click', () => updateCartQty(b.dataset.slug, 1)));
  container.querySelectorAll('[data-act="dec"]').forEach(b => b.addEventListener('click', () => updateCartQty(b.dataset.slug, -1)));
  container.querySelectorAll('.cart-remove').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.slug)));
  document.getElementById('whatsappOrderBtn')?.addEventListener('click', placeOrderViaWhatsApp);
}

function placeOrderViaWhatsApp() {
  const cart = getCart();
  if (!cart.length) return;
  const subtotal = cartTotal();
  const gst = Math.round(subtotal * 0.05);
  let lines = ['Hi Fly Restaurant! I would like to order:', ''];
  cart.forEach(c => {
    const item = findItem(c.slug);
    if (item) lines.push(`• ${item.name} x${c.qty} — ₹${item.price * c.qty}`);
  });
  lines.push('', `Subtotal: ₹${subtotal}`, `GST (5%): ₹${gst}`, `Total: ₹${subtotal + gst}`, '', 'Please confirm availability & delivery time. Thank you!');
  const message = encodeURIComponent(lines.join('\n'));
  window.open(`https://wa.me/919022187677?text=${message}`, '_blank', 'noopener,noreferrer');
}

/* ────────────────────────────────────────────
   WISHLIST PAGE RENDER (wishlist.html)
──────────────────────────────────────────── */
function renderWishlistPage() {
  const container = document.getElementById('wishlistPageContent');
  if (!container) return;
  const list = getWishlist();
  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-heart"></i>
        <p>Your wishlist is empty. Tap the heart icon on any dish to save it here.</p>
        <a href="index.html#menu">Browse Menu</a>
      </div>`;
    return;
  }
  const cards = list.map(slug => {
    const item = findItem(slug);
    if (!item) return '';
    return `
      <div class="menu-item show">
        <img src="${item.img}" alt="${item.name}" onerror="this.onerror=null;this.src='assets/fly-restaurant-logo.png';">
        <h4>${item.name}</h4>
        <span class="price">₹${item.price}</span>
        <div class="actions">
          <i class="fa-solid fa-heart wishlist active" title="Remove from wishlist" data-slug="${item.slug}" role="button" tabindex="0" aria-label="Remove from wishlist"></i>
          <button data-slug="${item.slug}" data-add-cart>Order</button>
        </div>
      </div>`;
  }).join('');
  container.innerHTML = `<div class="wishlist-grid">${cards}</div>`;

  container.querySelectorAll('.wishlist').forEach(icon => {
    makeKeyboardClickable(icon, () => toggleWishlist(icon.dataset.slug, icon));
  });
  container.querySelectorAll('[data-add-cart]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.slug, 1));
  });
}

/* ────────────────────────────────────────────
   INIT
──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Header icon wiring
  makeKeyboardClickable(document.getElementById('searchIconBtn'), openSearch);
  makeKeyboardClickable(document.getElementById('cartIconBtn'), () => window.location = 'cart.html');
  makeKeyboardClickable(document.getElementById('wishlistIconBtn'), () => window.location = 'wishlist.html');

  const userBtn = document.getElementById('userIconBtn');
  if (userBtn) {
    makeKeyboardClickable(userBtn, (e) => {
      e.stopPropagation();
      if (getUser()) {
        document.querySelector('.user-greet-menu')?.classList.toggle('open');
      } else {
        openLoginModal();
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#userIconBtn')) document.querySelector('.user-greet-menu')?.classList.remove('open');
    });
  }

  // Wire "Order" buttons on the live menu grid (index.html) — event
  // delegation so it works no matter how many .menu-item cards exist
  document.querySelectorAll('.menu-item').forEach(card => {
    const slug = (card.id || '').replace('item-', '');
    if (!slug) return;
    const orderBtn = card.querySelector('.actions button');
    orderBtn?.addEventListener('click', (e) => { e.stopPropagation(); addToCart(slug, 1); });
    const heartIcon = card.querySelector('.wishlist');
    if (heartIcon) {
      heartIcon.setAttribute('role', 'button');
      heartIcon.setAttribute('tabindex', '0');
      heartIcon.setAttribute('aria-label', 'Toggle wishlist');
      makeKeyboardClickable(heartIcon, (e) => {
        e.stopPropagation();
        toggleWishlist(slug, heartIcon);
      });
    }
    // Clicking the card itself (image/name/anywhere but the action
    // icons) opens the full item detail view
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openItemModal(slug));
  });

  updateCartBadge();
  updateWishBadge();
  updateUserIcon();
  syncWishlistIcons();
  initBackToTop();
  initDietFilter();
  initNewsletter();
  handleItemDeepLink();

  renderCartPage();
  renderWishlistPage();
});
