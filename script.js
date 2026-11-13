/* =========================================================
   ProTech — script.js  (كل منطق الموقع في ملف واحد)
   الموقع صفحة واحدة (index.html) والتنقل بين الأقسام بالـ hash:
   #/home  #/machines  #/store  #/product/<id>  #/team  #/settings
   فايربيز (db / auth) جاي من firebase.js
   ========================================================= */

let WHATSAPP_ADMIN = "201000000000";   // بيتغيّر تلقائيًا من إعدادات الأدمن
let SETTINGS = {};                      // settings/site_config
let MEDIA = [];                         // كل مستندات site_media
let MY_LIKES = new Set();               // إعجابات المستخدم الحالي
let SITE_WALLETS = {};
const VIEWS = ['home', 'machines', 'store', 'product', 'team', 'settings'];
let lastView = null;
let navDepth = 0;

/* ---------- أدوات صغيرة ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;
const byId = (id) => MEDIA.find((m) => m.id === id);
const byCat = (cat) => MEDIA.filter((m) => m.category === cat);

let toastTimer;
function toast(msg) {
  const el = $('siteToast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------- الهيدر + البانل الجانبي ---------- */
window.addEventListener('scroll', () => $('siteHeader').classList.toggle('scrolled', window.scrollY > 10));
function openMobilePanel() { $('mobilePanelOverlay').classList.add('open'); }
function closeMobilePanel() { $('mobilePanelOverlay').classList.remove('open'); }
$('navToggle').addEventListener('click', openMobilePanel);

/* ---------- الوضع الليلي ---------- */
function applySavedTheme() {
  const saved = localStorage.getItem('protech-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.querySelectorAll('.theme-switch').forEach((s) => s.classList.toggle('on', saved === 'dark'));
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('protech-theme', next);
  applySavedTheme();
}
applySavedTheme();

/* ---------- اللغة (عربي / إنجليزي) ---------- */
const TRANSLATIONS = {
  en: {
    nav_home: 'Home', nav_machines: 'Machines', nav_store: 'Store', nav_team: 'Team', nav_settings: 'Settings',
    hero_eyebrow: 'ProTech · Sales, Service & Genuine Ink',
    hero_title: '25+ Years of Experience in Printer Sales & Maintenance',
    hero_desc: 'Digital printing machines for sale, full technical support and maintenance, and genuine ink & toner for every type — with real warranty and follow-up until your machine runs perfectly.',
    hero_cta_shop: 'Shop Ink Now', hero_cta_consult: 'Request Technical Consultation',
    quick_title: 'What do you need right now?', quick_inks: 'Ink', quick_machines: 'Machines',
    quick_maintenance: 'Request Maintenance', quick_parts: 'Spare Parts',
    services_title: 'Everything You Need Under One Roof', faq_title: 'Frequently Asked Questions',
    mp_dark_mode: 'Dark Mode', mp_language: 'Language', mp_quick_actions: 'Quick Access',
    mp_cart: 'Cart', mp_whatsapp: 'WhatsApp Us', mp_maintenance: 'Request Maintenance'
  }
};
function applyLanguage(lang) {
  const dict = TRANSLATIONS[lang];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    if (el.dataset.orig === undefined) el.dataset.orig = el.innerHTML;
    if (el.dataset.custom) return; // نص جاي من الأدمن — ما نغيّرهوش
    el.innerHTML = (dict && dict[el.getAttribute('data-i18n')]) || el.dataset.orig;
  });
  document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'ar');
  document.documentElement.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');
  document.querySelectorAll('.mp-lang-btn, .lang-choice').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
  localStorage.setItem('protech-lang', lang);
}
function setLanguage(lang) { applyLanguage(lang); }

/* ---------- الصفحة الرئيسية: reveal + عدّاد + سلايدر + أسئلة شائعة ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in-view'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10), duration = 1400, start = performance.now();
  (function step(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = p < 1 ? Math.floor(p * target) : target;
    if (p < 1) requestAnimationFrame(step);
  })(start);
}
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { animateCounter(e.target); counterObserver.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));

let currentSlide = 0;
const heroSlides = document.querySelectorAll('.hero-slide');
const slideDots = document.querySelectorAll('.slide-dot');
function goToSlide(i) {
  heroSlides[currentSlide]?.classList.remove('active'); slideDots[currentSlide]?.classList.remove('active');
  currentSlide = i;
  heroSlides[currentSlide]?.classList.add('active'); slideDots[currentSlide]?.classList.add('active');
}
let slideTimer = setInterval(() => goToSlide((currentSlide + 1) % heroSlides.length), 4500);
slideDots.forEach((dot, i) => dot.addEventListener('click', () => {
  clearInterval(slideTimer); goToSlide(i);
  slideTimer = setInterval(() => goToSlide((currentSlide + 1) % heroSlides.length), 4500);
}));

document.querySelectorAll('.faq-item').forEach((item) => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

/* ---------- النوافذ (Modals) + Lightbox ---------- */
function openConsultationModal() { $('consultationModal').classList.add('open'); }
function closeConsultationModal() { $('consultationModal').classList.remove('open'); }
function openMaintenanceModal() { $('maintenanceModal').classList.add('open'); }
function closeMaintenanceModal() { $('maintenanceModal').classList.remove('open'); }
function openLightbox(src) { $('lightboxImg').src = src; $('myLightbox').classList.add('open'); }
function closeLightbox() { $('myLightbox').classList.remove('open'); }
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeConsultationModal(); closeMaintenanceModal(); closeCartModal(); closeLightbox(); closeMobilePanel(); }
});

/* ---------- حفظ الطلبات (بتظهر في تاب "الطلبات" بالأدمن) ---------- */
function saveOrder(data) {
  return db.collection('orders').add({ ...data, status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp() })
    .catch((err) => console.error('saveOrder error:', err.message));
}

function sendMaintenanceRequest(event) {
  event.preventDefault();
  const form = event.target;
  const customerName = form.customerName.value.trim(), machine = form.machine.value.trim();
  const issue = form.issue.value.trim(), phone = form.phone.value.trim();
  saveOrder({ type: 'maintenance', customerName, phone, details: `الماكينة: ${machine} — المشكلة: ${issue}` });
  const message = `طلب صيانة جديد من موقع ProTech%0A` +
    `اسم العميل: ${encodeURIComponent(customerName)}%0Aنوع الماكينة: ${encodeURIComponent(machine)}%0A` +
    `المشكلة: ${encodeURIComponent(issue)}%0Aرقم التواصل: ${encodeURIComponent(phone)}`;
  window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${message}`, '_blank');
  form.reset(); closeMaintenanceModal();
  return false;
}

/* =========================================================
   السلة (localStorage — المفتاح protech_cart)
   ========================================================= */
function getCart() { try { return JSON.parse(localStorage.getItem('protech_cart') || '[]'); } catch (e) { return []; } }
function saveCart(cart) { localStorage.setItem('protech_cart', JSON.stringify(cart)); updateCartBadge(); }
function updateCartBadge() {
  const count = getCart().reduce((s, i) => s + (i.qty || 1), 0);
  ['cart-count', 'cart-count-mp'].forEach((id) => { if ($(id)) $(id).textContent = count; });
}
function addToCart(title, price, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find((i) => i.title === title && i.price === (price || 0));
  if (existing) existing.qty = (existing.qty || 1) + qty;
  else cart.push({ title, price: price || 0, qty });
  saveCart(cart);
  toast(`تمت إضافة (${title}) إلى السلة`);
}
function addToCartById(id, qty) { const it = byId(id); if (it) addToCart(it.title || 'منتج', it.price || 0, qty || 1); }
function buyNowById(id, qty) { addToCartById(id, qty); openCartModal(); }
function changeCartQty(idx, delta) {
  const cart = getCart();
  if (!cart[idx]) return;
  cart[idx].qty = Math.max(1, (cart[idx].qty || 1) + delta);
  saveCart(cart); renderCart();
}
function removeFromCart(idx) { const cart = getCart(); cart.splice(idx, 1); saveCart(cart); renderCart(); }
function clearCart() {
  if (!getCart().length) return;
  if (!confirm('تفريغ السلة بالكامل؟')) return;
  saveCart([]); renderCart();
}
function renderCart() {
  const cart = getCart(), box = $('cartItemsContainer');
  let total = 0;
  box.innerHTML = cart.length ? '' : '<p style="text-align:center;color:var(--muted);padding:14px 0">السلة فاضية دلوقتي</p>';
  cart.forEach((item, idx) => {
    const price = item.price || 0, qty = item.qty || 1;
    total += price * qty;
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <span>${esc(item.title)}
        <span class="qty-mini"><button onclick="changeCartQty(${idx},-1)">−</button><b>${qty}</b><button onclick="changeCartQty(${idx},1)">+</button></span>
      </span>
      <span style="display:flex;align-items:center;gap:10px">
        <b>${money(price * qty)}</b>
        <button onclick="removeFromCart(${idx})" style="background:none;border:none;color:#e11d48;font-size:17px">&times;</button>
      </span>`;
    box.appendChild(row);
  });
  $('cartTotalPrice').textContent = money(total);
}
function openCartModal() { renderCart(); renderPaymentOptions(); $('cartModal').classList.add('open'); }
function closeCartModal() { $('cartModal').classList.remove('open'); }

/* ---------- طرق الدفع ---------- */
const PAYMENT_METHOD_LABELS = { cash: 'الدفع عند الاستلام', wallet: 'محفظة إلكترونية', card: 'فيزا / بطاقة' };
const WALLET_LABELS = { vodafone: 'فودافون كاش', etisalat: 'اتصالات كاش', orange: 'أورانج كاش' };
let selectedPaymentMethod = 'cash';
let selectedWalletProvider = null;

function renderPaymentOptions() {
  selectedPaymentMethod = 'cash'; selectedWalletProvider = null;
  $('paymentMethodBox').innerHTML = `
    <label class="pm-label">طريقة الدفع</label>
    <div class="pm-cards">
      <button type="button" class="pm-card active" data-method="cash" onclick="selectPaymentMethod('cash')"><i class="fa-solid fa-truck-fast"></i><span>${PAYMENT_METHOD_LABELS.cash}</span></button>
      <button type="button" class="pm-card" data-method="wallet" onclick="selectPaymentMethod('wallet')"><i class="fa-solid fa-wallet"></i><span>${PAYMENT_METHOD_LABELS.wallet}</span></button>
      <button type="button" class="pm-card" data-method="card" onclick="selectPaymentMethod('card')"><i class="fa-solid fa-credit-card"></i><span>${PAYMENT_METHOD_LABELS.card}</span></button>
    </div>
    <div id="paymentDetailBox"></div>`;
  renderPaymentDetail();
}
function selectPaymentMethod(method) {
  selectedPaymentMethod = method; selectedWalletProvider = null;
  document.querySelectorAll('.pm-card').forEach((c) => c.classList.toggle('active', c.dataset.method === method));
  renderPaymentDetail();
}
function renderPaymentDetail() {
  const box = $('paymentDetailBox');
  if (!box) return;
  if (selectedPaymentMethod === 'cash') box.innerHTML = `<p class="pm-note"><i class="fa-solid fa-circle-check"></i> هتدفع نقدًا وقت الاستلام مباشرة.</p>`;
  else if (selectedPaymentMethod === 'card') box.innerHTML = `<p class="pm-note"><i class="fa-solid fa-circle-info"></i> بعد تأكيد الطلب، هيتواصل معاك فريقنا على واتساب برابط دفع آمن بالفيزا.</p>`;
  else box.innerHTML = `
      <div class="wallet-providers">
        <button type="button" class="wp-chip" data-provider="vodafone" onclick="selectWalletProvider('vodafone')"><i class="fa-solid fa-wallet" style="color:#e60000"></i> فودافون كاش</button>
        <button type="button" class="wp-chip" data-provider="etisalat" onclick="selectWalletProvider('etisalat')"><i class="fa-solid fa-wallet" style="color:#00a651"></i> اتصالات كاش</button>
        <button type="button" class="wp-chip" data-provider="orange" onclick="selectWalletProvider('orange')"><i class="fa-solid fa-wallet" style="color:#ff7900"></i> أورانج كاش</button>
      </div>
      <div id="walletStepsBox"></div>`;
}
function selectWalletProvider(provider) {
  selectedWalletProvider = provider;
  document.querySelectorAll('.wp-chip').forEach((c) => c.classList.toggle('active', c.dataset.provider === provider));
  const number = SITE_WALLETS[provider], steps = $('walletStepsBox');
  if (!number) {
    steps.innerHTML = `<p class="pm-note" style="color:#e5484d"><i class="fa-solid fa-triangle-exclamation"></i> لسه مفيش رقم ${WALLET_LABELS[provider]} متاح، اختار طريقة تانية.</p>`;
    return;
  }
  steps.innerHTML = `
    <div class="pm-steps">
      <div class="pm-step"><span class="step-num">1</span>
        <div>حوّل المبلغ على رقم <b class="mono-num">${esc(number)}</b> (${WALLET_LABELS[provider]})
          <button type="button" class="copy-btn" onclick="copyWalletNumber(this,'${esc(number)}')"><i class="fa-solid fa-copy"></i> نسخ</button></div></div>
      <div class="pm-step"><span class="step-num">2</span><div><input type="tel" id="cartPaymentRef" placeholder="اكتب رقمك اللي حوّلت منه"></div></div>
    </div>`;
}
function copyWalletNumber(btn, number) {
  navigator.clipboard.writeText(number).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> اتنسخ';
    setTimeout(() => (btn.innerHTML = original), 1800);
  });
}

function downloadInvoice() {
  const cart = getCart();
  if (!cart.length) { toast('السلة فاضية، مفيش فاتورة لتنزيلها.'); return; }
  let total = 0, text = 'فاتورة ProTech\n===================\n';
  cart.forEach((item) => {
    const price = item.price || 0, qty = item.qty || 1;
    total += price * qty;
    text += `${item.title} × ${qty} = ${price * qty} ج.م\n`;
  });
  text += `===================\nالإجمالي: ${total} ج.م`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  link.download = 'protech-invoice.txt';
  link.click();
}

function checkoutToWhatsApp() {
  const cart = getCart();
  if (!cart.length) { toast('السلة فاضية، ضيف منتجات الأول.'); return; }
  const customerName = $('cartCustomerName').value.trim(), customerPhone = $('cartCustomerPhone').value.trim();
  if (!customerName || !customerPhone) { alert('من فضلك اكتب اسمك ورقم تليفونك قبل إتمام الطلب.'); return; }

  let paymentRef = '', paymentLabel = PAYMENT_METHOD_LABELS.cash, paymentStatus = 'not_required';
  if (selectedPaymentMethod === 'wallet') {
    if (!selectedWalletProvider) { alert('اختار نوع المحفظة الأول.'); return; }
    paymentRef = ($('cartPaymentRef') || {}).value ? $('cartPaymentRef').value.trim() : '';
    if (!paymentRef) { alert('اكتب رقمك اللي حوّلت منه قبل تأكيد الطلب.'); return; }
    paymentLabel = `محفظة إلكترونية — ${WALLET_LABELS[selectedWalletProvider]}`;
    paymentStatus = 'awaiting_confirmation';
  } else if (selectedPaymentMethod === 'card') {
    paymentLabel = 'فيزا / بطاقة (هيتواصل معاك فريقنا برابط دفع آمن)';
    paymentStatus = 'awaiting_link';
  }

  let total = 0;
  const itemsList = [];
  let message = 'طلب شراء جديد من موقع ProTech%0A%0A';
  message += `اسم العميل: ${encodeURIComponent(customerName)}%0Aرقم التليفون: ${encodeURIComponent(customerPhone)}%0A`;
  message += `طريقة الدفع: ${encodeURIComponent(paymentLabel)}%0A`;
  if (paymentRef) message += `رقم التحويل منه: ${encodeURIComponent(paymentRef)}%0A`;
  message += '%0A';
  cart.forEach((item) => {
    const price = item.price || 0, qty = item.qty || 1;
    total += price * qty;
    itemsList.push(`${item.title} × ${qty} = ${price * qty} ج.م`);
    message += `${encodeURIComponent(item.title)} × ${qty} = ${price * qty} ج.م%0A`;
  });
  message += `%0Aالإجمالي: ${total} ج.م`;

  saveOrder({
    type: 'purchase', customerName, phone: customerPhone, details: itemsList.join(' | '), total,
    paymentMethod: selectedPaymentMethod, walletProvider: selectedWalletProvider, paymentRef, paymentStatus
  });
  window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${message}`, '_blank');
}

updateCartBadge();
window.addEventListener('storage', (e) => { if (e.key === 'protech_cart') updateCartBadge(); });

/* =========================================================
   إعدادات الموقع العامة (settings/site_config) — بتتحدّث لايف من الأدمن
   ========================================================= */
const SOCIAL_ICON_MAP = {
  whatsapp: 'fa-brands fa-whatsapp', facebook: 'fa-brands fa-facebook-f', instagram: 'fa-brands fa-instagram',
  tiktok: 'fa-brands fa-tiktok', youtube: 'fa-brands fa-youtube', email: 'fa-solid fa-envelope',
  website: 'fa-solid fa-globe', phone: 'fa-solid fa-phone'
};

function updateWaLink(el, phone) { el.href = el.href.replace(/wa\.me\/\d+/, 'wa.me/' + phone); }

let adsTimer;
function applySiteSettings() {
  const s = SETTINGS;
  if (s.phone1) document.querySelectorAll('[data-wa="phone1"]').forEach((el) => updateWaLink(el, s.phone1));
  if (s.phone2) document.querySelectorAll('[data-wa="phone2"]').forEach((el) => updateWaLink(el, s.phone2));
  if (s.cartPhone || s.phone1) WHATSAPP_ADMIN = s.cartPhone || s.phone1;

  // البار العلوي
  const bar = $('topbar');
  if (s.topbarStatus || s.topbarHours) {
    bar.style.display = 'flex';
    bar.querySelector('.topbar-status').innerHTML = s.topbarStatus ? `<span class="dot"></span> ${esc(s.topbarStatus)}` : '';
    bar.querySelector('.topbar-hours').innerHTML = s.topbarHours ? `<i class="fa-regular fa-clock"></i> ${esc(s.topbarHours)}` : '';
  } else bar.style.display = 'none';

  // شريط الإعلان الثابت
  let promo = $('promoBanner');
  if (s.promoEnabled && s.promoText) {
    if (!promo) {
      promo = document.createElement('div');
      promo.id = 'promoBanner'; promo.className = 'promo-banner';
      $('siteHeader').insertAdjacentElement('afterend', promo);
    }
    promo.innerHTML = `<span><i class="fa-solid fa-bullhorn"></i> ${esc(s.promoText)}</span>
      ${s.promoLink ? `<a href="${esc(s.promoLink)}" target="_blank">التفاصيل</a>` : ''}
      <button aria-label="إغلاق" onclick="this.parentElement.remove()">&times;</button>`;
  } else if (promo) promo.remove();

  SITE_WALLETS = { vodafone: s.walletVodafone || '', etisalat: s.walletEtisalat || '', orange: s.walletOrange || '' };

  if (Array.isArray(s.socialLinks) && s.socialLinks.length) {
    $('footerSocial').innerHTML = s.socialLinks.map((l) =>
      `<a href="${esc(l.url)}" target="_blank"><i class="${SOCIAL_ICON_MAP[l.platform] || 'fa-solid fa-link'}"></i></a>`).join('');
  }
  if (Array.isArray(s.consultationNumbers) && s.consultationNumbers.length) {
    $('consultationNumbersList').innerHTML = s.consultationNumbers.map((c) =>
      `<a class="wa-choice" href="https://wa.me/${esc(c.phone)}" target="_blank"><i class="fa-brands fa-whatsapp"></i> ${esc(c.name || 'تواصل معنا')}</a>`).join('');
  }

  // الإعلانات الدوّارة في الرئيسية
  const adsEl = $('adsStrip'), ads = (Array.isArray(s.ads) ? s.ads : []).filter((a) => a.text);
  clearInterval(adsTimer);
  if (ads.length) {
    adsEl.style.display = 'flex';
    let i = 0;
    const render = () => {
      const ad = ads[i % ads.length];
      adsEl.innerHTML = ad.link ? `<a href="${esc(ad.link)}" target="_blank">${esc(ad.text)}</a>` : `<span>${esc(ad.text)}</span>`;
    };
    render();
    if (ads.length > 1) adsTimer = setInterval(() => { i++; render(); }, 4000);
  } else adsEl.style.display = 'none';
}

function watchSettings() {
  db.collection('settings').doc('site_config').onSnapshot((doc) => {
    SETTINGS = doc.exists ? doc.data() : {};
    applySiteSettings();
    renderCurrentView();
  }, (err) => console.error('settings error:', err.message));
}

/* ---------- بيانات site_media (كل الأقسام من اشتراك واحد) ---------- */
function watchMedia() {
  db.collection('site_media').onSnapshot((snap) => {
    MEDIA = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderCurrentView();
  }, (err) => console.error('media error:', err.message));
}

/* بانر الصفحة (من تبويب "البانرات" في الأدمن) — الصورة والنص الافتراضيين بيفضلوا لو الأدمن ماحطش حاجة */
function applyBanner(key, heroEl, titleEl, descEl) {
  const b = byCat(key)[0];
  if (!b) return;
  if (b.title && titleEl) { titleEl.textContent = b.title; titleEl.dataset.custom = '1'; }
  if (b.desc && descEl) { descEl.textContent = b.desc; descEl.dataset.custom = '1'; }
  if (b.imageUrl && heroEl) {
    heroEl.style.backgroundImage = `linear-gradient(0deg, rgba(10,20,32,.55), rgba(10,20,32,.55)), url('${b.imageUrl}')`;
    heroEl.style.backgroundSize = 'cover';
  }
}

/* =========================================================
   مكوّنات العرض المشتركة
   ========================================================= */
const catLabel = (cat) => cat === 'inks' ? 'الأحبار' : cat === 'متجر_مكن' ? 'ماكينات للبيع' : cat === 'team' ? 'الفريق' : (cat || 'عام');
const skeletons = (n) => Array.from({ length: n }, () => '<div class="skeleton-card"><div class="sk-thumb"></div><div class="sk-line" style="width:70%"></div><div class="sk-line" style="width:45%"></div></div>').join('');

function mediaThumb(item) {
  if (item.videoUrl && item.videoUrl.trim()) {
    return `<div style="position:relative"><video muted preload="metadata" src="${esc(item.videoUrl)}#t=0.5" ${item.imageUrl ? `poster="${esc(item.imageUrl)}"` : ''}></video>
      <span class="play-overlay"><i class="fa-solid fa-play"></i></span></div>`;
  }
  return `<img src="${esc(item.imageUrl || 'https://via.placeholder.com/300x200?text=ProTech')}" alt="${esc(item.title)}" loading="lazy">`;
}

function itemCard(item) {
  const price = Number(item.price) || 0, liked = MY_LIKES.has(item.id);
  const actions = price
    ? `<div class="row">
         <button class="btn-add-cart" onclick="event.stopPropagation(); addToCartById('${item.id}')"><i class="fa-solid fa-cart-plus"></i> أضف</button>
         <button class="btn-like ${liked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike('${item.id}')"><i class="fa-${liked ? 'solid' : 'regular'} fa-heart"></i> <span>${item.likes || 0}</span></button>
       </div>
       <button class="btn-buy-now" onclick="event.stopPropagation(); buyNowById('${item.id}')"><i class="fa-solid fa-bolt"></i> شراء الآن</button>`
    : `<div class="row">
         <a class="btn-add-cart" style="text-align:center" target="_blank" onclick="event.stopPropagation()" href="https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent('عايز أسأل عن: ' + (item.title || ''))}"><i class="fa-brands fa-whatsapp"></i> اسأل عن السعر</a>
         <button class="btn-like ${liked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike('${item.id}')"><i class="fa-${liked ? 'solid' : 'regular'} fa-heart"></i> <span>${item.likes || 0}</span></button>
       </div>`;
  return `<div class="ink-card" onclick="location.hash='#/product/${item.id}'">
    <div>${mediaThumb(item)}<h3>${esc(item.title || 'بدون عنوان')}</h3>
      ${price ? `<p class="price">${money(price)}</p>` : `<p class="price ask">السعر عند الاستفسار</p>`}</div>
    <div class="card-actions">${actions}</div></div>`;
}

function sortNewest(list) {
  return list.slice().sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
}

/* =========================================================
   الرئيسية
   ========================================================= */
function renderHome() {
  // معرض الشهادات
  const track = $('galleryTrack'), certs = byCat('certificates');
  if (!MEDIA.length) return;
  track.innerHTML = certs.length ? certs.map((c) => `
      <div class="gallery-item" onclick="openLightbox('${esc(c.imageUrl)}')">
        <img src="${esc(c.imageUrl)}" alt="${esc(c.title || 'شهادة')}" loading="lazy" onerror="this.closest('.gallery-item').classList.add('img-missing')">
        <span class="cap">${esc(c.title || '')}</span></div>`).join('')
    : '<p style="color:var(--muted);padding:16px 4px;font-size:13.5px">لا توجد شهادات مضافة بعد.</p>';

  // بانر الرئيسية (عنوان/وصف/٣ صور بتعليقاتها)
  const b = byCat('banner_index')[0];
  if (b) {
    if (b.title) { $('heroTitle').textContent = b.title; $('heroTitle').dataset.custom = '1'; }
    if (b.desc) { $('heroDesc').textContent = b.desc; $('heroDesc').dataset.custom = '1'; }
    const slideEls = [$('heroSlideMain'), $('heroSlide2'), $('heroSlide3')];
    [b.imageUrl, b.image2, b.image3].forEach((url, i) => {
      if (url && slideEls[i]) slideEls[i].style.backgroundImage = `linear-gradient(0deg, rgba(10,20,32,.78), rgba(10,20,32,.35)), url('${url}')`;
    });
    [b.caption1, b.caption2, b.caption3].forEach((cap, i) => { if (cap) $(`slideCaption${i + 1}`).textContent = cap; });
  }
}

/* =========================================================
   المكن: نوع → ماركة → (مقاس/نوع) → الموديلات / قطع الغيار
   ========================================================= */
const BRANDS = ['Bloprint', 'G2', 'STP', 'Aprint'];
const MACH_TYPES = {
  outdoor: { label: 'أوت دور', imgKey: 'أوت دور', icon: 'fa-sun', prefix: '', subs: ['5.3', '3.2'], subTitle: (s) => `مقاس ${s}` },
  eco: { label: 'إيكو سولفينت', imgKey: 'إكو سولفينت', icon: 'fa-leaf', prefix: 'إيكو ', subs: ['5.3', '3.2'], subTitle: (s) => `مقاس ${s}` },
  uv: { label: 'UV', imgKey: 'UV_MAIN', icon: 'fa-lightbulb', prefix: 'UV ', subs: ['فلات بد', 'رول تو رول', 'هيبرد', 'DTF', '7 في 1'], subTitle: (s) => s },
  lamination: { label: 'لمينيشن', imgKey: 'لمينيشن', icon: 'fa-layer-group', cat: 'لمينيشن' },
  plotter: { label: 'بلوتر / ولتريلوتر', imgKey: 'بلوتر / ولتريلوتر', icon: 'fa-pen-ruler', cat: 'بلوتر / ولتريلوتر' }
};

function machineBannerKey(type, brand, sub) {
  if (type === 'uv' && brand) return `banner_uv_${brand.toLowerCase()}`;
  if ((type === 'outdoor' || type === 'eco') && brand && sub) return `banner_${type}_${brand.toLowerCase()}_${String(sub).replace('.', '')}`;
  return 'banner_videos';
}

function catCard(label, href, imgKey, icon, small) {
  const img = (SETTINGS.categoryImages || {})[imgKey];
  const iconStyle = img ? `style="background-image:url('${esc(img)}')"` : '';
  return `<button class="cat-card" data-cat="${esc(imgKey)}" onclick="location.hash='${href}'">
    <div class="m-icon" ${iconStyle}>${img ? '' : `<i class="fa-solid ${icon}"></i>`}</div>
    <h3>${esc(label)}</h3>${small ? `<small>${esc(small)}</small>` : ''}</button>`;
}

function renderMachines(args) {
  const [type, brand, sub, tab] = args;
  const T = MACH_TYPES[type];
  const cats = $('machinesCats'), items = $('machinesItems'), tabs = $('machinesTabs');
  cats.classList.add('hidden'); items.classList.add('hidden'); tabs.classList.add('hidden');

  // مسار التنقل (breadcrumb)
  let crumb = `<a href="#/home">الرئيسية</a> / `;
  crumb += T ? `<a href="#/machines">المكن</a>` : `<b>المكن</b>`;
  if (T) crumb += ` / ${brand || T.cat ? `<a href="#/machines/${type}">${esc(T.label)}</a>` : `<b>${esc(T.label)}</b>`}`;
  if (T && brand && T.subs) crumb += ` / ${sub ? `<a href="#/machines/${type}/${encodeURIComponent(brand)}">${esc(brand)}</a>` : `<b>${esc(brand)}</b>`}`;
  if (T && brand && sub) crumb += ` / <b>${esc(T.subTitle ? T.subTitle(sub) : sub)}</b>`;
  $('machinesCrumb').innerHTML = crumb;

  // البانر
  $('machinesTitle').textContent = T ? (brand ? `${T.label} — ${brand}${sub ? ' ' + (T.subTitle ? T.subTitle(sub) : sub) : ''}` : T.label) : 'ماكينات الطباعة';
  $('machinesDesc').textContent = 'اختار القسم المناسب وشوف الموديلات والفيديوهات المتاحة.';
  $('machinesHero').style.backgroundImage = '';
  if (!MEDIA.length) { cats.classList.remove('hidden'); cats.innerHTML = skeletons(4); return; }
  applyBanner(machineBannerKey(type, brand, sub), $('machinesHero'), $('machinesTitle'), $('machinesDesc'));

  // المستوى 1: أنواع الماكينات
  if (!T) {
    cats.classList.remove('hidden');
    cats.innerHTML = Object.entries(MACH_TYPES).map(([k, t]) => catCard(t.label, `#/machines/${k}`, t.imgKey, t.icon)).join('');
    return;
  }
  // لمينيشن / بلوتر: قايمة مباشرة
  if (T.cat) { showMachineItems(byCat(T.cat)); return; }

  // المستوى 2: الماركة
  if (!brand) {
    cats.classList.remove('hidden');
    cats.innerHTML = BRANDS.map((b) => catCard(b, `#/machines/${type}/${encodeURIComponent(b)}`, `shared_${b.toLowerCase()}`, 'fa-print')).join('');
    return;
  }
  // المستوى 3: المقاس / نوع الماكينة
  if (!sub) {
    cats.classList.remove('hidden');
    cats.innerHTML = T.subs.map((s) => catCard(T.subTitle(s), `#/machines/${type}/${encodeURIComponent(brand)}/${encodeURIComponent(s)}`, `shared_${brand.toLowerCase()}`, 'fa-print')).join('');
    return;
  }
  // المستوى 4: الموديلات أو قطع الغيار
  const parts = tab === 'parts', base = `${T.prefix}${brand} ${sub}`;
  const baseHash = `#/machines/${type}/${encodeURIComponent(brand)}/${encodeURIComponent(sub)}`;
  tabs.classList.remove('hidden');
  tabs.innerHTML = `
    <button class="store-tab ${parts ? '' : 'active'}" onclick="location.hash='${baseHash}'"><i class="fa-solid fa-print"></i> الماكينات</button>
    <button class="store-tab ${parts ? 'active' : ''}" onclick="location.hash='${baseHash}/parts'"><i class="fa-solid fa-gears"></i> قطع الغيار</button>`;
  showMachineItems(byCat(parts ? `${base} - قطع غيار` : base));
}

function showMachineItems(list) {
  const box = $('machinesItems');
  box.classList.remove('hidden');
  box.innerHTML = list.length ? sortNewest(list).map(itemCard).join('') : '<p class="empty-note">لا توجد عناصر في هذا القسم حاليًا.</p>';
}

/* =========================================================
   المتجر: الأحبار / ماكينات للبيع / قطع الغيار (صور من GitHub)
   ========================================================= */
const GITHUB_OWNER = 'hmztzyadtarq-wq';
const GITHUB_REPO = 'pro-tech1.com';
const SPARE_PARTS_FOLDER = 'صورقطع-غيار';
let PARTS_CACHE = null;

function renderStore(args) {
  const bucket = ['inks', 'machines', 'parts'].includes(args[0]) ? args[0] : 'inks';
  document.querySelectorAll('#view-store .store-tab').forEach((b) => b.classList.toggle('active', b.dataset.bucket === bucket));
  $('storeTitle').textContent = { inks: 'المنتجات المتاحة', machines: 'الماكينات المعروضة للبيع', parts: 'قطع الغيار' }[bucket];
  applyBanner('banner_inks', $('storeHero'), $('storeHeroTitle'), $('storeHeroDesc'));

  const grid = $('storeItems'), parts = $('partsContainer');
  grid.classList.toggle('hidden', bucket === 'parts');
  parts.classList.toggle('hidden', bucket !== 'parts');
  if (bucket === 'parts') { $('storeMeta').textContent = ''; renderSpareParts(); return; }

  if (!MEDIA.length) { grid.innerHTML = skeletons(4); return; }
  const list = sortNewest(byCat(bucket === 'machines' ? 'متجر_مكن' : 'inks'));
  $('storeMeta').textContent = `${list.length} منتج`;
  grid.innerHTML = list.length ? list.map(itemCard).join('') : '<p class="empty-note">لا توجد منتجات في هذا القسم حاليًا.</p>';
}

async function renderSpareParts() {
  const box = $('partsContainer');
  const paint = (images) => {
    box.innerHTML = images.length ? images.map((f) => {
      const label = f.name.replace(/\.(jpe?g|png|webp|gif)$/i, '').replace(/[-_]+/g, ' ');
      return `<div class="part-item" onclick="openLightbox('${esc(f.download_url)}')"><img src="${esc(f.download_url)}" alt="${esc(label)}" loading="lazy"><span>${esc(label)}</span></div>`;
    }).join('') : '<p class="empty-note">لسه مفيش صور قطع غيار مرفوعة في المجلد.</p>';
  };
  if (PARTS_CACHE) { paint(PARTS_CACHE); return; }
  box.innerHTML = '<p class="empty-note">جاري تحميل الصور...</p>';
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(SPARE_PARTS_FOLDER)}`);
    if (!res.ok) throw new Error('تعذر قراءة المجلد');
    PARTS_CACHE = (await res.json()).filter((f) => f.type === 'file' && /\.(jpe?g|png|webp|gif)$/i.test(f.name));
    paint(PARTS_CACHE);
  } catch (err) {
    box.innerHTML = '<p class="empty-note">تعذر تحميل صور قطع الغيار حاليًا.</p>';
    console.error('renderSpareParts error:', err);
  }
}

/* =========================================================
   تفاصيل المنتج / الماكينة
   ========================================================= */
function goBack() { if (navDepth > 0) history.back(); else location.hash = '#/store'; }

function renderProduct(args) {
  const box = $('detailsContent'), id = args[0], item = byId(id);
  if (!MEDIA.length) { box.innerHTML = '<div class="details-card"><div class="skeleton-line" style="height:260px"></div><div><div class="skeleton-line" style="width:40%"></div><div class="skeleton-line" style="width:80%;height:26px"></div><div class="skeleton-line" style="width:100%"></div></div></div>'; return; }
  if (!item) {
    box.innerHTML = `<div class="not-found"><i class="fa-regular fa-face-frown"></i><p>العنصر ده مش موجود أو اتشال.</p><a href="#/store" class="btn btn-primary" style="margin-top:16px">رجوع للمتجر</a></div>`;
    return;
  }
  const qtyNow = ($('qtyInput') && $('qtyInput').dataset.id === id) ? $('qtyInput').value : '1';
  const price = Number(item.price) || 0, liked = MY_LIKES.has(id);
  const media = item.videoUrl && item.videoUrl.trim()
    ? `<video controls ${item.imageUrl ? `poster="${esc(item.imageUrl)}"` : ''} src="${esc(item.videoUrl)}"></video>`
    : `<img src="${esc(item.imageUrl || 'https://via.placeholder.com/500')}" alt="${esc(item.title)}" onclick="openLightbox(this.src)">`;

  box.innerHTML = `
    <div class="details-card">
      <div class="details-media">${media}</div>
      <div class="details-info">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <span class="details-cat">${esc(catLabel(item.category))}</span>
          <button class="btn-like ${liked ? 'liked' : ''}" style="border-radius:999px;padding:6px 14px;font-weight:700" onclick="toggleLike('${id}')"><i class="fa-${liked ? 'solid' : 'regular'} fa-heart"></i> <span>${item.likes || 0}</span></button>
        </div>
        <h1>${esc(item.title || 'بدون عنوان')}</h1>
        ${price ? `<div class="details-price">${money(price)}</div>` : `<div class="details-price ask">السعر عند الاستفسار</div>`}
        <p class="details-desc">${esc(item.desc || 'لا يوجد وصف حاليًا.')}</p>
        ${price ? `<div class="qty-row"><span>الكمية</span>
          <div class="qty-control"><button onclick="changeQty(1)">+</button><input type="text" id="qtyInput" data-id="${id}" value="${esc(qtyNow)}" readonly><button onclick="changeQty(-1)">−</button></div></div>` : ''}
        <div class="details-actions">
          ${price ? `<button class="btn btn-primary" onclick="buyNowById('${id}', currentQty())"><i class="fa-solid fa-bolt"></i> اشتري الآن</button>
          <button class="btn btn-outline-dark" onclick="addToCartById('${id}', currentQty())"><i class="fa-solid fa-cart-plus"></i> أضف للسلة</button>` : ''}
          <a href="https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent('عايز أسأل عن: ' + (item.title || ''))}" target="_blank" class="btn ${price ? 'btn-outline-dark' : 'btn-primary'}"><i class="fa-brands fa-whatsapp"></i> اسأل عن ${price ? 'المنتج' : 'السعر'}</a>
        </div>
      </div>
    </div>`;
}
function currentQty() { return parseInt(($('qtyInput') || {}).value, 10) || 1; }
function changeQty(delta) { const i = $('qtyInput'); i.value = Math.max(1, (parseInt(i.value, 10) || 1) + delta); }

/* =========================================================
   الفريق
   ========================================================= */
function renderTeam() {
  applyBanner('banner_team', $('teamHero'), $('teamTitle'), $('teamDesc'));
  const grid = $('teamGrid');
  if (!MEDIA.length) { grid.innerHTML = skeletons(3); return; }
  const list = sortNewest(byCat('team')).reverse();
  grid.innerHTML = list.length ? list.map((m) => {
    const wa = (m.whatsapp || m.phone || '').replace(/\D/g, '');
    return `<div class="team-card">
      <img src="${esc(m.imageUrl || 'https://via.placeholder.com/110')}" alt="${esc(m.title)}" onclick="openLightbox(this.src)">
      <h3>${esc(m.title)}</h3><p>${esc(m.desc || '')}</p>
      <div class="team-links">
        ${wa ? `<a class="wa" target="_blank" href="https://wa.me/${wa}"><i class="fa-brands fa-whatsapp"></i> واتساب</a>` : ''}
        ${m.phone ? `<a href="tel:${esc(m.phone)}"><i class="fa-solid fa-phone"></i> اتصال</a>` : ''}
        ${m.extraLink ? `<a target="_blank" href="${esc(m.extraLink)}"><i class="fa-solid fa-link"></i> ${esc(m.extraLinkLabel || 'رابط')}</a>` : ''}
      </div></div>`;
  }).join('') : '<p class="empty-note">لا يوجد أعضاء مضافين بعد.</p>';
}

/* =========================================================
   الحساب + الإعجابات + الإعدادات
   ========================================================= */
function switchAuthTab(tab) {
  $('tabLogin').classList.toggle('active', tab === 'login');
  $('tabSignup').classList.toggle('active', tab === 'signup');
  $('loginForm').classList.toggle('hidden', tab !== 'login');
  $('signupForm').classList.toggle('hidden', tab !== 'signup');
}
function doLogin(event) {
  event.preventDefault();
  $('loginError').textContent = '';
  auth.signInWithEmailAndPassword($('loginEmail').value.trim(), $('loginPassword').value)
    .catch(() => { $('loginError').textContent = 'بيانات الدخول غير صحيحة.'; });
  return false;
}
function forgotPassword() {
  const email = $('loginEmail').value.trim();
  if (!email) { $('loginError').textContent = 'اكتب إيميلك الأول وبعدين دوس "نسيت كلمة المرور".'; return false; }
  auth.sendPasswordResetEmail(email)
    .then(() => { $('loginError').style.color = '#10b981'; $('loginError').textContent = 'بعتنالك رابط تغيير كلمة المرور على الإيميل.'; })
    .catch(() => { $('loginError').style.color = '#e5484d'; $('loginError').textContent = 'تعذر الإرسال — تأكد من الإيميل.'; });
  return false;
}
function doSignup(event) {
  event.preventDefault();
  const email = $('signupEmail').value.trim(), phone = $('signupPhone').value.trim(), password = $('signupPassword').value;
  $('signupError').textContent = '';
  auth.createUserWithEmailAndPassword(email, password).then((cred) =>
    db.collection('users').doc(cred.user.uid).set({ email, phone, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
  ).catch((err) => {
    $('signupError').textContent = err.code === 'auth/email-already-in-use' ? 'الإيميل ده مسجل بالفعل — جرب تسجيل الدخول.' : 'حصل خطأ: ' + err.message;
  });
  return false;
}
function doLogout() { auth.signOut(); }

function getCurrentUser() { return auth.currentUser; }
function requireLogin(label) {
  if (getCurrentUser()) return true;
  if (confirm(`محتاج تسجل دخولك الأول عشان ${label || 'تكمل'}. تحب تروح لصفحة الإعدادات دلوقتي؟`)) location.hash = '#/settings';
  return false;
}

function toggleLike(id) {
  if (!requireLogin('تسجل إعجابك')) return;
  const uid = getCurrentUser().uid, item = byId(id), likeId = `${uid}_${id}`;
  const likeRef = db.collection('likes').doc(likeId), mediaRef = db.collection('site_media').doc(id);
  const isLiked = MY_LIKES.has(id);
  if (isLiked) {
    MY_LIKES.delete(id);
    likeRef.delete(); mediaRef.update({ likes: firebase.firestore.FieldValue.increment(-1) });
  } else {
    MY_LIKES.add(id);
    likeRef.set({
      userId: uid, itemId: id, itemTitle: (item && item.title) || '',
      itemType: item && item.category === 'inks' ? 'product' : 'machine',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    mediaRef.update({ likes: firebase.firestore.FieldValue.increment(1) });
  }
  renderCurrentView();
}

function loadMyLikes(uid) {
  const box = $('myLikesBox');
  box.innerHTML = '<p class="empty-hint">جاري التحميل...</p>';
  db.collection('likes').where('userId', '==', uid).get().then((snap) => {
    MY_LIKES = new Set(snap.docs.map((d) => d.data().itemId));
    renderCurrentView();
    if (snap.empty) { box.innerHTML = '<p class="empty-hint">لسه مسجلتش أي إعجاب.</p>'; return; }
    const typeLabels = { product: 'منتج', machine: 'ماكينة' };
    const rows = snap.docs.map((d) => d.data()).sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
    box.innerHTML = `<div class="likes-list">${rows.map((l) => `
      <div class="like-row" onclick="location.hash='#/product/${esc(l.itemId)}'"><span class="title">${esc(l.itemTitle)}</span><span class="type">${typeLabels[l.itemType] || ''}</span></div>`).join('')}</div>`;
  }).catch((err) => { box.innerHTML = '<p class="empty-hint">حصل خطأ في التحميل.</p>'; console.error(err); });
}

auth.onAuthStateChanged((user) => {
  $('loggedOutView').classList.toggle('hidden', !!user);
  $('loggedInView').classList.toggle('hidden', !user);
  if (user) {
    $('currentUserEmail').textContent = user.email;
    loadMyLikes(user.uid);
  } else {
    MY_LIKES = new Set();
    $('myLikesBox').innerHTML = '<p class="empty-hint">سجّل دخولك عشان تشوف المنتجات والماكينات اللي عجبتك.</p>';
    renderCurrentView();
  }
});

/* =========================================================
   الراوتر (التنقل بين الأقسام بالـ hash)
   ========================================================= */
function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name: VIEWS.includes(parts[0]) ? parts[0] : 'home', args: parts.slice(1) };
}

function renderCurrentView() {
  const { name, args } = parseHash();
  ({ home: renderHome, machines: renderMachines, store: renderStore, product: renderProduct, team: renderTeam, settings: () => {} }[name])(args);
}

function router() {
  const { name } = parseHash();
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  const navName = name === 'product' ? 'store' : name;
  document.querySelectorAll('[data-route]').forEach((b) => b.classList.toggle('active', b.dataset.route === navName));
  if (name !== lastView || name === 'machines' || name === 'store') window.scrollTo({ top: 0, behavior: 'instant' });
  lastView = name;
  renderCurrentView();
}

// أزرار التنقل (الهيدر + البانل + الشريط السفلي)
document.querySelectorAll('[data-route]').forEach((b) => b.addEventListener('click', () => { location.hash = `#/${b.dataset.route}`; }));
window.addEventListener('hashchange', () => { navDepth++; router(); });

/* ---------- تشغيل ---------- */
applyLanguage(localStorage.getItem('protech-lang') || 'ar');
if (!location.hash) location.replace('#/home');
router();
watchSettings();
watchMedia();
