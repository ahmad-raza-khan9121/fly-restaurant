/* ----------------------------------------------------------------
   1. AUTO BODY PADDING
   Measures actual header height (changes when mobile menu opens)
   and applies it to body so content is never hidden behind header
---------------------------------------------------------------- */
function syncPadding() {
  const header = document.querySelector('.header');
  if (!header) return;
  const h = header.offsetHeight;
  document.body.style.paddingTop = h + 'px';
  document.documentElement.style.setProperty('--header-h', h + 'px');

  // Extra fix for contact page — make sure heading is not hidden
  const contactSection = document.querySelector('.contact-section');
  if (contactSection) {
    // On mobile, add extra top padding so "Contact Us" heading is fully visible
    if (window.innerWidth <= 767) {
      contactSection.style.paddingTop = '30px';
    } else {
      contactSection.style.paddingTop = '';
    }
  }
}
syncPadding();
setTimeout(syncPadding, 300);
window.addEventListener('resize', syncPadding);

/* ----------------------------------------------------------------
   2. HEADER SCROLL SHADOW
   Throttled via requestAnimationFrame so it only updates once per
   rendered frame instead of on every single scroll event (which can
   fire dozens of times per frame and cause jank on longer pages).
---------------------------------------------------------------- */
let scrollShadowTicking = false;
window.addEventListener('scroll', () => {
  if (scrollShadowTicking) return;
  scrollShadowTicking = true;
  requestAnimationFrame(() => {
    const h = document.querySelector('.header');
    if (h) {
      h.style.boxShadow = window.scrollY > 60
        ? '0 4px 20px rgba(212,175,55,0.22)'
        : '0 2px 10px rgba(0,0,0,0.1)';
    }
    scrollShadowTicking = false;
  });
}, { passive: true });

/* ----------------------------------------------------------------
   3. CLOSE ALL DROPDOWNS
   Works on both mobile (removes .open class) and desktop.

   On desktop the dropdown opens via CSS :hover. Since the header is
   fixed, clicking a menu link and then scrolling does NOT move the
   mouse away from the "Menu" trigger — it stays hovered the whole
   time, so a simple timed inline-style reset would let :hover pop
   the dropdown back open a moment later. Instead we add a
   `.force-closed` class (see CSS, uses !important to beat :hover)
   and only remove it once the mouse actually leaves the dropdown —
   a real, natural signal instead of a guessed timeout.
---------------------------------------------------------------- */
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown').forEach(d => {
    d.classList.remove('open');
    d.classList.add('force-closed');
  });
}
document.querySelectorAll('.dropdown').forEach(d => {
  d.addEventListener('mouseleave', () => d.classList.remove('force-closed'));
});

/* ----------------------------------------------------------------
   4. HAMBURGER — open / close mobile nav
---------------------------------------------------------------- */
const hamburger = document.querySelector('.hamburger');
const nav = document.querySelector('.nav');

if (hamburger && nav) {

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = hamburger.classList.toggle('open');
    nav.classList.toggle('open', isOpen);
    if (!isOpen) closeAllDropdowns();
    setTimeout(syncPadding, 20);
  });

  // Close on outside click / tap
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header')) {
      hamburger.classList.remove('open');
      nav.classList.remove('open');
      closeAllDropdowns();
      setTimeout(syncPadding, 20);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hamburger.classList.remove('open');
      nav.classList.remove('open');
      closeAllDropdowns();
      setTimeout(syncPadding, 20);
    }
  });
}

/* ----------------------------------------------------------------
   5. MOBILE DROPDOWN — tap to open (accordion style)
   On desktop, CSS :hover handles opening automatically
---------------------------------------------------------------- */
document.querySelectorAll('.dropdown > a').forEach(trigger => {
  trigger.addEventListener('click', function (e) {
    if (window.innerWidth <= 767) {
      e.preventDefault();
      e.stopPropagation();
      const parent = this.closest('.dropdown');
      const wasOpen = parent.classList.contains('open');
      // Close all other dropdowns first
      document.querySelectorAll('.dropdown.open').forEach(d => {
        if (d !== parent) d.classList.remove('open');
      });
      parent.classList.remove('force-closed'); // clear any stuck state from a previous close
      parent.classList.toggle('open', !wasOpen);
      setTimeout(syncPadding, 20);
    }
  });
});

/* ----------------------------------------------------------------
   6. SMOOTH SCROLL + DROPDOWN AUTO-CLOSE
   - Closes dropdown on ALL devices when any #anchor link clicked
   - Scrolls the target flush under the fixed header using
     scroll-margin-top (see CSS) — the native, browser-handled way,
     kept deliberately simple so it can't drift or misfire.
   - Works for both same-page (#section) and cross-page
     (index.html#section) links
---------------------------------------------------------------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();

    // Close dropdown and mobile nav
    closeAllDropdowns();
    if (hamburger && nav) {
      hamburger.classList.remove('open');
      nav.classList.remove('open');
      setTimeout(syncPadding, 20);
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ----------------------------------------------------------------
   6b. LAND CORRECTLY WHEN ARRIVING WITH A #hash ALREADY IN THE URL
   (e.g. clicking "Starters" from contact.html sends the browser to
   index.html#starters — a fresh page load). scroll-margin-top (CSS)
   already handles this natively in most cases; this is just a
   belt-and-suspenders correction for slower-loading pages.
---------------------------------------------------------------- */
window.addEventListener('load', () => {
  if (window.location.hash && !window.location.hash.startsWith('#item-')) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }), 100);
    }
  }
});

/* ----------------------------------------------------------------
   7. HERO IMAGE SLIDER
---------------------------------------------------------------- */
const slides = document.querySelectorAll('.slide');
let si = 0;
if (slides.length > 1) {
  setInterval(() => {
    slides[si].classList.remove('active');
    si = (si + 1) % slides.length;
    slides[si].classList.add('active');
  }, 3500);
}

/* ----------------------------------------------------------------
   8. SCROLL REVEAL — menu item cards animate in as you scroll
---------------------------------------------------------------- */
if ('IntersectionObserver' in window) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('show');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.menu-item').forEach(item => obs.observe(item));
} else {
  // Fallback: show all immediately (old browsers)
  document.querySelectorAll('.menu-item').forEach(item => item.classList.add('show'));
}

/* ----------------------------------------------------------------
   9. WISHLIST HEART TOGGLE
   Moved to js/cart.js — it now persists to localStorage, updates the
   header wishlist badge, and powers the real wishlist.html page.
   (Keeping a second handler here would double-fire on click, same
   class of bug that broke navigation on the fly-bazaar project.)
---------------------------------------------------------------- */

/* ----------------------------------------------------------------
   10. CONTACT FORM — validation + real submission via mailto:
   No backend server exists for this static site, so the most
   reliable way to actually get the message to the owner (without
   needing a paid form service + API key) is to open the visitor's
   own email app with everything pre-filled. They just hit Send in
   their email app. For a fully silent/automatic submission (no
   email app popup), a service like Formspree or EmailJS would need
   to be wired in with the owner's own account.
---------------------------------------------------------------- */
const form = document.querySelector('.contact-form');
if (form) {
  const btn = form.querySelector('button');
  const success = form.querySelector('.form-success');
  const name = form.querySelector('input[type="text"]');
  const email = form.querySelector('input[type="email"]');
  const phone = form.querySelector('input[type="tel"]');
  const msg = form.querySelector('textarea');
  const resDate = form.querySelector('#resDate');
  const resTime = form.querySelector('#resTime');
  const resGuests = form.querySelector('#resGuests');

  btn.addEventListener('click', () => {
    // Reset borders
    [name, email, msg].forEach(el => el.style.borderColor = 'rgba(255,255,255,0.1)');

    let err = false;
    if (!name.value.trim()) { name.style.borderColor = '#ff6b6b'; err = true; }
    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { email.style.borderColor = '#ff6b6b'; err = true; }
    if (!msg.value.trim()) { msg.style.borderColor = '#ff6b6b'; err = true; }

    if (err) {
      const orig = btn.textContent;
      btn.textContent = 'Fill all fields ✗';
      btn.style.cssText = 'background:linear-gradient(135deg,#ff6b6b,#ff4757);color:#fff;';
      setTimeout(() => { btn.textContent = orig; btn.style.cssText = ''; }, 2500);
      return;
    }

    // Build the email content
    const lines = [
      `Name: ${name.value.trim()}`,
      `Email: ${email.value.trim()}`,
    ];
    if (phone && phone.value.trim()) lines.push(`Phone: ${phone.value.trim()}`);
    if (resDate && resDate.value) lines.push(`Reservation Date: ${resDate.value}`);
    if (resTime && resTime.value) lines.push(`Reservation Time: ${resTime.value}`);
    if (resGuests && resGuests.value) lines.push(`Guests: ${resGuests.value}`);
    lines.push('', 'Message:', msg.value.trim());

    const subject = encodeURIComponent('New enquiry from Fly Restaurant website');
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:ahmadraza.khan9121@gmail.com?subject=${subject}&body=${body}`;

    if (success) success.style.display = 'block';
    name.value = ''; email.value = ''; msg.value = '';
    if (phone) phone.value = '';
    if (resDate) resDate.value = '';
    if (resTime) resTime.value = '';
    if (resGuests) resGuests.value = '';
    setTimeout(() => { if (success) success.style.display = 'none'; }, 6000);
  });
}

/* ----------------------------------------------------------------
   11. ACTIVE PAGE NAV HIGHLIGHT — underlines current page link
---------------------------------------------------------------- */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links > li > a').forEach(link => {
  const href = link.getAttribute('href') || '';
  if (href && href.includes(currentPage) && !link.closest('.dropdown')) {
    link.style.textDecoration = 'underline';
    link.style.textUnderlineOffset = '5px';
  }
});