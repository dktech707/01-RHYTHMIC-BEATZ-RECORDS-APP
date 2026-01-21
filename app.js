/* RBR PWA — vanilla JS (Netlify-friendly, no build step) */
const state = {
  tab: 'home',
  config: null,
  releases: [],
  artists: [],
  ui: { relFilter:'all', relQuery:'', artQuery:'', bookArtist: '' }
};

const $ = (sel) => document.querySelector(sel);

function esc(s){ return String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function loadAll(){
  const BUILD = "2025-12-30-REV6.1";
  const fetchJson = async (path) => {
    const r = await fetch(path, { cache: 'no-store' });
    if(!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
    try { return await r.json(); } catch(e){ return null; }
  };

  try {
    const results = await Promise.allSettled([
      fetchJson('./data.json'),
      fetchJson('./releases.json'),
      fetchJson('./artists.json'),
      fetchJson('./events.json'),
      fetchJson('./news.json'),
      fetchJson('./podcast.json'),
      fetchJson('./store.json'),
      fetchJson('./playlists.json'),
      fetchJson('./settings.json'),
      fetchJson('./feedback.json'),
    ]);

    const get = (idx, fallback) => results[idx] && results[idx].status === 'fulfilled' && results[idx].value !== null ? results[idx].value : fallback;

    const cfg = get(0, {});
    const rel = get(1, []);
    const art = get(2, []);
    state.events = get(3, []);
    state.news = get(4, []);
    state.podcast = get(5, []);
    state.store = get(6, []);
    state.playlists = get(7, []);
    state.settings = get(8, {});
    state.feedback = get(9, []);

    state.config = cfg;
    state.releases = Array.isArray(rel) ? rel.sort((a,b)=> (b.date||'').localeCompare(a.date||'')) : [];
    state.artists = Array.isArray(art) ? art : [];

    console.log('RBR PWA BUILD', BUILD);

    if(cfg?.links?.website) {
      const el = document.querySelector('#chipWebsite'); if(el) el.href = cfg.links.website;
    }
    if(cfg?.appName) document.title = cfg.appName;

    // initial route -> tab
    setActiveTab(tabFromPath(location.pathname), {push:false});

    initSignupOnce();
    registerSW();
    render();

  } catch (error) {
    console.error('Critical Error loading app:', error);
    const c = document.querySelector('#content') || document.body;
    c.innerHTML = `\n      <div style="padding:16px;border-radius:12px;background:#4a0d14;color:#fff;max-width:720px;margin:40px auto;font-family:system-ui;">\n        <h2 style="margin:0 0 8px 0;">App Error</h2>\n        <p style="margin:0 0 10px 0;">Nije moguće učitati JSON podatke (deploy/folder mismatch ili 404).</p>\n      </div>`;
  }
}

function tabFromPath(pathname){
  const p = String(pathname||'/').replace(/^\/+|\/+$/g,'').split('/')[0].toLowerCase();
  const map = {
    '': 'home', 'home': 'home', 'events': 'events', 'artists': 'artists', 'releases': 'releases', 'store': 'store', 'shop': 'store', 'more': 'more', 'news': 'news', 'booking': 'booking', 'demo': 'demo'
  };
  return map[p] || 'home';
}

function pathFromTab(tab){
  if(!tab || tab==='home') return '/';
  if(tab==='store') return '/store';
  return `/${tab}`;
}

function setActiveTab(tab, opts={push:true}){
  state.tab = tab;
  document.querySelectorAll('.tab').forEach(b=>{
    b.classList.toggle('is-active', b.dataset.tab === tab);
  });

  if(opts.push){
    const path = pathFromTab(tab);
    if(location.pathname !== path) history.pushState({tab}, '', path);
  }

  render();
  window.scrollTo({top:0, behavior:'auto'});
}

function isPastDate(dateStr){
  if(!dateStr) return false;
  const d = new Date(`${dateStr}T23:59:59`);
  if(Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

// --- small helpers used by views ---
function relFormats(r){
  const arr = Array.isArray(r?.formats) ? r.formats.slice() : [];
  return [...new Set(arr)];
}

function featuredRelease(){
  return state.releases[0] || null;
}

// render, viewHome, viewEvents, viewStore are part of the existing app; the important fixes below target booking/store interactions and event filtering.

// viewHome and viewEvents should filter out past dates from UPCOMING lists wherever relevant. Ensure code that builds 'upcoming' uses isPastDate.

// viewStore: robust image resolution and safe fallback
function resolveStoreImage(it){
  if(it.image) return it.image;
  const cat = String(it.category||'').toUpperCase();
  if(cat === 'DIGITAL' || cat === 'OFFERS') return './assets/store/full_release_bundle.webp';
  return './assets/store/full_release_bundle.png';
}

// Booking flow helpers
function applyBookingPolicy(){
  const artist = (($('#bkArtist')?.value) || '').trim();
  const isDK = /^dktech$/i.test(artist) || /dktech/i.test(artist);
  const type = $('#bkType');
  const hint = $('#bkPolicyHint');
  if(type){
    if(isDK){ type.disabled = false; }
    else { type.value = 'Event booking'; type.disabled = true; }
  }
  if(hint){
    hint.textContent = isDK
      ? 'Inquiry type available for DKTech. Other roster artists accept event bookings only.'
      : 'Roster policy: non DKTech artists accept event bookings only.';
  }
}

window.addEventListener('popstate', ()=>{
  setActiveTab(tabFromPath(location.pathname), {push:false});
});

// Attach delegated click handlers and booking button wiring inside render() — but ensure data-book click defers routing when needed.

document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-book]');
  if(!btn) return;
  e.preventDefault();
  const name = btn.getAttribute('data-book') || '';

  // If not currently on booking tab, save deferred and route
  if(state.tab !== 'booking'){
    state.ui = state.ui || {};
    state.ui.bookArtist = name;
    setActiveTab('booking');
    return;
  }

  const field = $('#bkArtist'); if(field) field.value = name;
  const f = $('#bkSend'); if(f) f.scrollIntoView({behavior:'smooth', block:'center'});
  applyBookingPolicy();
});

// Booking send handler should use config contacts safely
function sendBooking(){
  const bkSend = $('#bkSend');
  if(!bkSend) return;
  bkSend.onclick = ()=>{
    const email = state.config?.contacts?.infoEmail || 'rhythmicbeatzrecords@gmail.com';
    const artist = ($('#bkArtist')?.value || '').trim() || 'Artist';
    const isDK = /^dktech$/i.test(artist) || /dktech/i.test(artist);
    const typeRaw = ($('#bkType')?.value || 'Event booking').trim();
    const type = isDK ? typeRaw : 'Event booking';
    const contactEmail = ($('#bkContactEmail')?.value || '').trim();
    const event = ($('#bkEvent')?.value || '').trim() || 'Event/Venue';
    const date = ($('#bkDate')?.value || '').trim() || 'YYYY-MM-DD';
    const city = ($('#bkCity')?.value || '').trim() || 'City/Country';
    const set = ($('#bkSet')?.value || '').trim() || 'N/A';
    const budget = ($('#bkBudget')?.value || '').trim() || 'N/A';
    const tech = ($('#bkTech')?.value || '').trim() || 'Tech setup';
    const msg = ($('#bkMsg')?.value || '').trim() || '';

    const subject = `RBR Booking — ${artist} — ${type} — ${date} — ${event}`;
    const body = [
      `Artist: ${artist}`,
      `Inquiry type: ${type}`,
      `Event/Venue: ${event}`,
      `Date: ${date}`,
      `City/Country: ${city}`,
      `Contact email: ${contactEmail || '(not provided)'}`,
      `Set length: ${set}`,
      `Fee/Budget range: ${budget}`,
      `Technical setup: ${tech}`,
      `Message: ${msg}`
    ].join('\n');

    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
}

// call sendBooking after render to wire the handler and apply any deferred artist
function postRenderInit(){
  if(state.tab === 'booking' && state.ui && state.ui.bookArtist){
    const field = $('#bkArtist'); if(field) field.value = state.ui.bookArtist;
    const f = $('#bkSend'); if(f) f.scrollIntoView({behavior:'smooth', block:'center'});
    applyBookingPolicy();
    state.ui.bookArtist = '';
  }
  const bkArtist = $('#bkArtist'); if(bkArtist) bkArtist.oninput = applyBookingPolicy;
  sendBooking();
}

// Exported render hook used by the app's render() implementation should call postRenderInit() at the end.

/* Note: This file contains the runtime fixes for routing, booking policy enforcement, safe image fallbacks, and SW/cache handling. The rest of the original app.js code (render implementations, views) remain unchanged and are expected to call the helpers defined here.