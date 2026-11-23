/* ANCACHA Studios — vanilla JS */
(() => {
  'use strict';

  /* ---------- Data ---------- */
  const SETS = {
    loft:      { name: 'Y2K Chrome & Neon Loft',     rate: 60 },
    daylight:  { name: 'Golden Hour Daylight Suite', rate: 55 },
    cyclorama: { name: 'Infinite Cyclorama Wall',    rate: 85 },
  };
  // Package discount by hours: longer sessions get a discount on the hourly rate
  const discountFor = h => (h >= 6 ? 0.2 : h >= 3 ? 0.1 : 0);
  const SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];
  const BOOKED = ['11:00', '15:00', '19:00']; // simulated unavailable slots
  const MAX_HOURS = 8;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = n => '$' + n.toFixed(2);
  const form = $('#bookForm');
  const state = { slot: '' };

  /* ---------- Mobile menu ---------- */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Footer year ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Scroll to booking helper ---------- */
  const goBook = () => $('#book').scrollIntoView({ behavior: 'smooth' });

  /* ---------- Select Set / Choose Package ---------- */
  $$('.select-set').forEach(b => b.addEventListener('click', () => {
    $('#set').value = b.dataset.set;
    clearErr('set');
    update();
    goBook();
  }));
  $$('.choose-pkg').forEach(b => b.addEventListener('click', () => {
    $('#hours').value = b.dataset.hours;
    update();
    goBook();
  }));

  /* ---------- Form setup: duration, date, slots ---------- */
  const hoursSel = $('#hours');
  for (let h = 1; h <= MAX_HOURS; h++) {
    hoursSel.add(new Option(`${h} hour${h > 1 ? 's' : ''}`, h));
  }

  const dateInput = $('#date');
  const pad = n => String(n).padStart(2, '0');
  const d = new Date();
  dateInput.min = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // disables past dates

  const slotsEl = $('#slots');
  SLOTS.forEach(t => {
    const b = document.createElement('button');
    const booked = BOOKED.includes(t);
    b.type = 'button';
    b.className = 'slot';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.dataset.time = t;
    b.disabled = booked;
    b.textContent = booked ? `${t} Booked` : t;
    slotsEl.appendChild(b);
  });
  slotsEl.addEventListener('click', e => {
    const b = e.target.closest('.slot');
    if (!b || b.disabled) return;
    state.slot = b.dataset.time;
    $$('.slot').forEach(s => s.setAttribute('aria-checked', String(s === b)));
    clearErr('slot');
    update();
  });

  /* ---------- Price calculation ---------- */
  function calc() {
    const set = SETS[$('#set').value];
    const hours = +hoursSel.value;
    const discPct = discountFor(hours);
    const base = set ? set.rate * hours : 0;
    const discount = base * discPct;
    const addons = $$('input[name=addon]:checked').map(c => ({ name: c.dataset.name, price: +c.dataset.price }));
    const addonTotal = addons.reduce((s, a) => s + a.price, 0);
    return { set, hours, discPct, base, discount, addons, total: base - discount + addonTotal };
  }

  const line = (a, b) => `<div class="ln"><span>${a}</span><span>${b}</span></div>`;
  function summaryHTML(c, full) {
    const date = dateInput.value ? new Date(dateInput.value + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    let h = '';
    if (full) h += line('Name', esc($('#name').value.trim())) + line('Shoot', esc($('#shoot').value));
    h += line('Set', c.set ? c.set.name : '—');
    h += line('Date', date) + line('Start', state.slot || '—');
    h += line('Duration', `${c.hours} hr${c.hours > 1 ? 's' : ''}`);
    h += line('Rate', c.set ? `${money(c.set.rate)}/hr` : '—');
    h += line('Subtotal', money(c.base));
    if (c.discount) h += line(`Package −${c.discPct * 100}%`, '−' + money(c.discount));
    c.addons.forEach(a => { h += line(a.name, money(a.price)); });
    return h;
  }
  function esc(s) { const p = document.createElement('p'); p.textContent = s; return p.innerHTML; }

  function update() {
    const c = calc();
    $('#receiptBody').innerHTML = summaryHTML(c, false);
    $('#total').textContent = money(c.total);
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);

  /* ---------- Validation ---------- */
  function setErr(id, msg) {
    const el = $(`.err[data-for="${id}"]`);
    if (el) el.textContent = msg;
    const field = $('#' + id);
    if (field) field.classList.add('invalid');
  }
  function clearErr(id) {
    const el = $(`.err[data-for="${id}"]`);
    if (el) el.textContent = '';
    const field = $('#' + id);
    if (field) field.classList.remove('invalid');
  }
  ['set', 'date', 'name', 'email', 'shoot'].forEach(id => $('#' + id).addEventListener('input', () => clearErr(id)));

  function validate() {
    ['set', 'date', 'slot', 'name', 'email', 'shoot'].forEach(clearErr);
    let first = null;
    const fail = (id, msg) => { setErr(id, msg); first = first || (id === 'slot' ? slotsEl : $('#' + id)); };

    if (!$('#set').value) fail('set', 'Choose a studio set.');
    if (!dateInput.value) fail('date', 'Pick a date.');
    else if (dateInput.value < dateInput.min) fail('date', 'Pick today or a future date.');
    if (!state.slot) fail('slot', 'Choose an available start time.');
    if ($('#name').value.trim().length < 2) fail('name', 'Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#email').value.trim())) fail('email', 'Enter a valid email address.');
    if (!$('#shoot').value) fail('shoot', 'Choose a shoot type.');

    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first.focus && first !== slotsEl) first.focus({ preventScroll: true });
      return false;
    }
    return true;
  }

  /* ---------- Confirmation modal ---------- */
  const modal = $('#modal');
  let lastFocus = null;
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;
    const c = calc();
    const ref = `ANC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    $('#mRef').textContent = ref;
    $('#mBody').innerHTML = summaryHTML(c, true);
    $('#mTotal').textContent = money(c.total);
    $('#mEmail').textContent = $('#email').value.trim();
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#mClose').focus();
  });
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $('#mClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* ---------- Gallery filter ---------- */
  const filters = $$('.filter');
  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(f => f.classList.toggle('active', f === btn));
    $$('#galleryGrid figure').forEach(fig => {
      fig.classList.toggle('hide', btn.dataset.filter !== 'all' && fig.dataset.cat !== btn.dataset.filter);
    });
  }));

  /* ---------- FAQ accordion ---------- */
  $$('.faq-i button').forEach(btn => btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const open = !item.classList.contains('open');
    item.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  }));

  /* ---------- Image fallback if a remote photo fails ---------- */
  $$('img').forEach(img => img.addEventListener('error', () => {
    img.style.background = 'linear-gradient(135deg,#00E5FF,#FF2A85,#FFB800)';
    img.removeAttribute('src');
  }, { once: true }));

  update(); // initial empty receipt
})();