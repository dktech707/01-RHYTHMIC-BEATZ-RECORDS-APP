/* RBR PWA — vanilla JS (Netlify-friendly, no build step) */
const state = {
  tab: 'home',
  config: null,
  releases: [],
  artists: [],
  ui: { relFilter:'all', relQuery:'', artQuery:'' }
};

const $ = (sel) => document.querySelector(sel);

function esc(s){ return String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function loadAll(){
  const BUILD = "2025-12-21-REV5.0";
  const fetchJson = async (path) => {
    const r = await fetch(path, { cache: 'no-store' });
    if(!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if(!ct.includes('application/json') && !path.endsWith('.json')) {
      // allow non-json, but we expect json here
    }
    return r.json();
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

    const get = (idx, fallback) => results[idx].status === 'fulfilled' ? results[idx].value : fallback;

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

    // tiny build marker for debugging (shows in DevTools + can be injected in UI if needed)
    console.log('RBR PWA BUILD', BUILD);

    // keep existing header links if present
    if(cfg?.links?.website) {
      const el = document.querySelector('#chipWebsite');
      if(el) el.href = cfg.links.website;
    }
    if(cfg?.appName) document.title = cfg.appName;

    render();
    initSignupOnce();
    registerSW();

  } catch (error) {
    console.error('Critical Error loading app:', error);
    const c = document.querySelector('#content') || document.body;
    c.innerHTML = `
      <div style="padding:16px;border-radius:12px;background:#4a0d14;color:#fff;max-width:720px;margin:40px auto;font-family:system-ui;">
        <h2 style="margin:0 0 8px 0;">App Error</h2>
        <p style="margin:0 0 10px 0;">Nije moguće učitati JSON podatke (deploy/folder mismatch ili 404).</p>
        <pre style="white-space:pre-wrap;margin:0;background:rgba(0,0,0,.35);padding:10px;border-radius:10px;">${error.message}</pre>
        <p style="margin:10px 0 0 0;opacity:.85;">Build: <b>${BUILD}</b></p>
        <button onclick="location.reload()" style="margin-top:14px;padding:10px 14px;border-radius:10px;border:0;cursor:pointer;">Retry</button>
      </div>
    `;
  }
}

function setActiveTab(tab){
  state.tab = tab;
  document.querySelectorAll('.tab').forEach(b=>{
    b.classList.toggle('is-active', b.dataset.tab === tab);
  });
  render();
  window.scrollTo({top:0, behavior:'auto'});
}

function coverFor(cat){
  const map = {
    'RBR001':'./assets/covers/rbr001.png',
        'RBR002':'./assets/covers/rbr002.png',
'RBR003':'./assets/covers/rbr003.png',
    'RBR004':'./assets/covers/rbr004.png',
    'RBR005':'./assets/covers/rbr005.png',
    'RBR006':'./assets/covers/rbr006.png',
    'RBR007':'./assets/covers/rbr007.png',
  };
  return map[cat] || './assets/logos/rbr-logo.png';
}

function coverThumbFor(cat){
  const map = {
    'RBR001':'./assets/covers_webp/rbr001.webp',
    'RBR002':'./assets/covers_webp/rbr002.webp',
    'RBR003':'./assets/covers_webp/rbr003.webp',
    'RBR004':'./assets/covers_webp/rbr004.webp',
    'RBR005':'./assets/covers_webp/rbr005.webp',
  };
  return map[cat] || '';
}


function relStatusKey(r){
  const s = String(r.status||'').toLowerCase();
  if(s.includes('out')) return 'out';
  return 'upcoming';
}
function relFormats(r){
  const f = Array.isArray(r.formats) ? r.formats : [];
  if(f.length) return f;
  const arr = [];
  if(r.beatport) arr.push('Digital');
  if(r.elasticstage || (state.config && state.config.links && state.config.links.elasticStage)) { arr.push('Vinyl'); arr.push('CD'); }
  return [...new Set(arr)];
}

function featuredRelease(){
  // prefer latest by date; fallback first
  return state.releases[0] || null;
}

function mailto(to, subject, body){
  const u = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = u;
}

function socialChips(){
  const l = state.config.links;
  const items = [
    ['Beatport', l.beatportLabel],
    ['Elastic Stage', l.elasticStage],
    ['Instagram', l.instagram],
    ['SoundCloud', l.soundcloud],
    ['YouTube', l.youtubebe || l.youtube],
    ['Bandcamp', l.bandcamp],
    ['TikTok', l.tiktok],
    ['WhatsApp', state.config.contacts.whatsappInvite]
  ].filter(x=>x[1]);
  return `
    <div class="actions">
      ${items.map(([t,u]) => `<a class="chip chip--blue" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}
    </div>
  `;
}

function renderRelease(r, opts={}){
  if(!r) return '';
  const cover = (opts.vinyl ? (r.vinylMockup || r.cover || coverFor(r.cat)) : (r.cover || coverFor(r.cat)));
  const thumb = coverThumbFor(r.cat);
  const imgSrc = (opts.thumb && thumb) ? thumb : cover;
  const title = r.title || '';
  const artists = r.artists || '';
  const date = r.date || '';
  const status = r.status || '';
  const formats = Array.isArray(r.formats) ? r.formats : [];
  const links = [];
  if(r.beatport) links.push(['Beatport', r.beatport]);
  if(r.elasticstage) links.push(['Elastic Stage', r.elasticstage]);
  if(r.qr) links.push(['QR / Link', r.qr]);
  if(r.bandcamp) links.push(['Bandcamp', r.bandcamp]);

  return `
    <article class="card">
      <div class="card__hd">
        <div>
          <div class="card__title">${esc(r.cat || '')} — ${esc(title)}</div>
          <div class="card__sub">${esc(artists)}${date ? ' • ' + esc(date) : ''}</div>
        </div>
        ${status ? `<div class="pill pill--muted">${esc(status)}</div>` : ``}
      </div>
      <div class="card__bd">
        <div class="img img--release"><img loading="lazy" src="${esc(imgSrc)}" alt="${esc(title || 'release')}"></div>
        ${formats.length ? `<div class="actions">${formats.map(f=>`<span class="badge badge--red"><span class="dot"></span>${esc(f)}</span>`).join('')}</div>` : ``}
        ${opts.showLinks && links.length ? `<div class="actions">${links.map(([t,u])=>`<a class="btn btn--blue" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div>` : ``}
      </div>
    </article>
  `;
}

function viewHome(){
  const relByCat = (cat)=> (Array.isArray(state.releases) ? state.releases.find(r=> (r.cat||'')===cat) : null);
  const rUpcoming = relByCat('RBR007');
  const rPrev = relByCat('RBR006');

  const ev = Array.isArray(state.events) ? state.events.slice() : [];
  const upcoming = ev
    .filter(e => (e.status||'').toUpperCase() === 'UPCOMING')
    .sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    .slice(0,2);

  const tile = (t)=> {
    const img = t.imageWebp || t.image || '';
    const hasImg = !!img;
    return `
      <button class="tile" type="button" ${t.go?`data-go="${esc(t.go)}"`:''} ${t.signup?`data-signup="1"`:''}>
        ${hasImg ? `<img class="tile__img" loading="lazy" src="${esc(img)}" alt="${esc(t.title)}">` : `<div class="tile__ph">${esc(t.title[0]||'R')}</div>`}
        <div class="tile__meta">
          <div class="tile__title">${esc(t.title)}</div>
          ${t.sub ? `<div class="tile__sub">${esc(t.sub)}</div>` : ``}
        </div>
        <div class="tile__chev" aria-hidden="true">→</div>
      </button>
    `;
  };

  const storeTiles = [
    { title:'Sample Pack I', sub:'Coming Jan 2026', go:'store', imageWebp:'./assets/store_webp/sample_pack_i.webp', image:'./assets/store/sample_pack_i.png' },
    { title:'Sample Pack II', sub:'Coming Jan 2026', go:'store', imageWebp:'./assets/store_webp/sample_pack_ii.webp', image:'./assets/store/sample_pack_ii.png' },
    { title:'Exclusive tracks', sub:'Coming soon', go:'store' },
    { title:'Unreleased tracks', sub:'Coming soon', go:'store' },
  ];

  return `
    <div class="stack">
      <section class="hero hero--compact">
        <div class="hero__kicker">FEATURED</div>
        <h1 class="hero__title">${esc(state.settings?.title || 'Rhythmic Beatz Records')}</h1>
        <div class="hero__sub">${esc(state.settings?.tagline || 'Hardgroove | Hypnotic | Hardtechno')}</div>
        <div class="hero__actions">
          <button class="btn btn--primary" data-signup="1">Sign up / free enter</button>
          <button class="btn btn--blue" data-go="events">Events</button>
          <button class="btn btn--blue" data-go="releases">Releases</button>
        </div>
      </section>

      <section class="section">
        <div class="section__hd">
          <div class="section__title">Label Catalogue</div>
          <button class="btn btn--ghost" data-go="releases">Explore</button>
        </div>
        <div class="grid cols2">
          ${rUpcoming ? renderRelease(rUpcoming, {showLinks:true, featured:true}) : `<div class="card"><div class="card__hd"><div class="card__title">RBR007 — Society Collapse</div><div class="card__sub">Add in releases.json</div></div></div>`}
          ${rPrev ? renderRelease(rPrev, {showLinks:true}) : ``}
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <div class="section__hd">
          <div class="section__title">Events</div>
          <button class="btn btn--ghost" data-go="events">Explore</button>
        </div>
        <div class="grid cols2">
          ${upcoming.map(e=>`
            <article class="card">
              <div class="card__hd">
                <div>
                  <div class="card__title">${esc(e.title || '')}</div>
                  <div class="card__sub">${esc((e.date||'').split('-').reverse().join('.'))}${e.venue?` • ${esc(e.venue)}`:''}${e.city?` • ${esc(e.city)}`:''}</div>
                </div>
                <span class="pill pill--muted">UPCOMING</span>
              </div>
              <div class="card__bd">
                ${e.image ? `<div class="img"><img loading="lazy" src="${esc(e.image)}" alt="${esc(e.title||'event')}"></div>`:''}
                ${e.notes?`<div class="p">${esc(e.notes)}</div>`:''}
                <div class="actions">
                  <button class="btn btn--primary" data-signup="1">Sign up / free enter</button>
                  <button class="btn btn--blue" data-go="events">Open Events</button>
                </div>
              </div>
            </article>
          `).join('') || `<div class="card"><div class="card__bd"><div class="p">Upcoming events will appear here once loaded.</div></div></div>`}
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <div class="section__hd">
          <div class="section__title">Store</div>
          <button class="btn btn--ghost" data-go="store">Open Store</button>
        </div>

        <div class="tiles">
          ${storeTiles.map(tile).join('')}
          <button class="tile tile--wide" type="button" data-go="booking">
            <div class="tile__meta">
              <div class="tile__title">Custom Order</div>
              <div class="tile__sub">Samples, tracks, workshops, art, automation</div>
            </div>
            <div class="tile__chev" aria-hidden="true">→</div>
          </button>
        </div>
      </section>
    </div>
  `;
}

function viewEvents(){
  const ev = Array.isArray(state.events) ? state.events.slice() : [];
  const upcoming = ev
    .filter(x => (x.status||'').toUpperCase() === 'UPCOMING')
    .filter(x => (x.segment||'').toUpperCase() === 'ROSTER' || (Array.isArray(x.artistIds) && x.artistIds.some(id=> String(id).toLowerCase()==='dktech')))
    .sort((a,b)=> (a.date||'').localeCompare(b.date||''));

  const heavyweight = ev
    .filter(x => (x.segment||'').toUpperCase() === 'SPECIAL' || /heavyweight/i.test(x.title||'') || /heavyweight/i.test(x.id||''))
    .sort((a,b)=> (b.date||'').localeCompare(a.date||''));

  const renderEvent = (e, opts={})=>`
    <article class="card ${opts.special?'card--special':''}">
      <div class="card__hd">
        <div>
          <div class="card__title">${esc(e.title || '')}</div>
          <div class="card__sub">${esc((e.date||'').split('-').reverse().join('.'))}${e.time?` • ${esc(e.time)}`:''}${e.venue?` • ${esc(e.venue)}`:''}${e.city?` • ${esc(e.city)}`:''}</div>
        </div>
        ${e.status ? `<div class="pill pill--muted">${esc((e.status||'').toUpperCase())}</div>` : ``}
      </div>
      <div class="card__bd">
        ${e.image ? `<div class="img"><img loading="lazy" src="${esc(e.image)}" alt="${esc(e.title || 'event')}"></div>` : ``}
        ${e.subtitle ? `<div class="p"><b>${esc(e.subtitle)}</b></div>`:''}
        ${opts.special ? `
          ${e.recap ? `<div class="p">${esc(e.recap)}</div>`:''}
          ${Array.isArray(e.highlights) && e.highlights.length ? `<div class="actions">${e.highlights.slice(0,4).map(h=>`<span class="chip chip--ghost"><span class="dot"></span>${esc(h)}</span>`).join('')}</div>`:''}
        ` : `
          ${e.notes ? `<div class="p">${esc(e.notes)}</div>` : ``}
          <div class="actions">
            <button class="btn btn--primary" data-signup="1">Sign up / free enter</button>
          </div>
        `}
      </div>
    </article>
  `;

  return `
    <div class="stack">
      <section class="section">
        <div class="section__hd">
          <div class="section__title">Upcoming</div>
          <button class="btn btn--ghost" data-signup="1">Sign up / free enter</button>
        </div>
        <div class="grid cols2">
          ${upcoming.map(e=>renderEvent(e)).join('') || `<div class="card"><div class="card__bd"><div class="p">No upcoming roster events loaded yet.</div></div></div>`}
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <div class="section__hd">
          <div class="section__title">Heavyweight Division</div>
          <span class="badge badge--accent">Special</span>
        </div>
        ${heavyweight.length ? heavyweight.map(e=>renderEvent(e,{special:true})).join('') : `<div class="card"><div class="card__bd"><div class="p">No Heavyweight Division event loaded yet.</div></div></div>`}
      </section>
    </div>
  `;
}


function viewArtists(){
  const list = Array.isArray(state.artists) ? state.artists.slice() : [];
  list.sort((a,b)=> (a.name||'').localeCompare(b.name||'', undefined, {sensitivity:'base'}));

  const q = (state.ui?.artQuery || '').trim().toLowerCase();

  const card = (a)=>{
    const name = a.name || '';
    const loc = `${a.country||''}${a.city?` • ${a.city}`:''}`.trim();
    const search = `${name} ${loc} ${a.bio||''}`.toLowerCase();
    const ok = !q || search.includes(q);

    const socials = a.socials ? Object.entries(a.socials).filter(([k,v])=>v).slice(0,6) : [];

    return `
      <article class="artistCard" data-artcard="1" data-artsearch="${esc(search)}" style="${ok?'':'display:none'}">
        <div class="artistCard__top">
          <img class="avatar" src="${esc(a.photo || './assets/logos/rbr-logo.png')}" alt="${esc(name||'artist')}" onerror="this.src='./assets/logos/rbr-logo.png'">
          <div>
            <div class="artistCard__name">${esc(name)}</div>
            <div class="artistCard__loc">${esc(loc || 'Roster')}</div>
          </div>
          <button class="btn btn--primary btn--sm" type="button" data-book="${esc(name)}">Book</button>
        </div>

        ${a.bio ? `<div class="bioClamp">${esc(a.bio)}</div>` : ``}

        ${socials.length ? `
          <div class="socialRow">
            ${socials.map(([k,v])=>`<a class="chip chip--ghost" href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}</a>`).join('')}
          </div>
        `:''}
      </article>
    `;
  };

  return `
    <div class="stack">
      <section class="card">
        <div class="card__hd">
          <div>
            <div class="card__title">Artists</div>
            <div class="card__sub">Roster profiles • booking-ready</div>
          </div>
          <input class="input" id="artSearch" data-artq placeholder="Search artists…" value="${esc(state.ui?.artQuery||'')}" />
        </div>
        <div class="card__bd">
          <div class="grid grid--cards" id="artGrid">
            ${list.map(card).join('')}
          </div>
        </div>
      </section>
    </div>
  `;
}



function viewNews(){
  const items = Array.isArray(state.news) ? state.news.slice() : [];
  items.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  return `
    <div class="stack">
      <section class="card">
        <div class="card__hd">
          <div>
            <div class="card__title">News</div>
            <div class="card__sub">Curated first for Balkan/Adria, then EU.</div>
          </div>
        </div>
        <div class="card__bd">
          ${(items.length ? items : [{title:'No news yet', date:'', body:'Add items in news.json'}]).map(n=>`
            <div class="newsItem">
              <div class="newsItem__title">${esc(n.title||'')}</div>
              ${n.date?`<div class="small">${esc(n.date)}</div>`:''}
              ${n.tag?`<div class="pill pill--muted">${esc(n.tag)}</div>`:''}
              <div class="p">${esc(n.body||'')}</div>
              ${n.url?`<a class="link" href="${esc(n.url)}" target="_blank" rel="noopener">Open</a>`:''}
              <div class="hr"></div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

function viewMore(){
  const w = state.config?.links?.website || '#';
  const wa = state.config?.contacts?.whatsappInvite || '';
  const socials = state.config?.links || {};
  const socialPairs = Object.entries(socials).filter(([k,v])=> !!v && ['instagram','soundcloud','youtube','bandcamp','tiktok'].includes(k));
  const podcasts = Array.isArray(state.podcast) ? state.podcast : [];
  const playlists = Array.isArray(state.playlists) ? state.playlists : [];

  return `
    <div class="stack">
      <section class="card">
        <div class="card__hd">
          <div>
            <div class="card__title">Tools</div>
            <div class="card__sub">Direct actions</div>
          </div>
        </div>
        <div class="card__bd">
          <div class="actions">
            <button class="btn btn--blue" data-go="store">Store</button>
            <button class="btn btn--blue" data-go="news">News</button>
            <button class="btn btn--blue" data-go="booking">Booking</button>
            <button class="btn btn--primary" data-go="demo">Submit Demo</button>
          </div>
          <div class="hr"></div>
          <div class="actions">
            <a class="btn btn--ghost" href="${esc(w)}" target="_blank" rel="noopener">Website</a>
            ${wa ? `<a class="btn btn--ghost" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>`:''}
            <button class="btn btn--ghost" data-signup="1">Guestlist</button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card__hd">
          <div>
            <div class="card__title">Media</div>
            <div class="card__sub">Tracks, playlists, picks</div>
          </div>
        </div>
        <div class="card__bd">
          ${playlists.map(p=>`
            <div class="newsItem">
              <div>
                <div class="newsItem__title">${esc(p.title||'')}</div>
                <div class="small muted">${esc(p.platform||'')}</div>
                ${p.notes?`<div class="p">${esc(p.notes)}</div>`:''}
              </div>
              ${p.url?`<a class="btn btn--blue" href="${esc(p.url)}" target="_blank" rel="noopener">Open</a>`:''}
            </div>
            <div class="hr"></div>
          `).join('') || `<div class="p">Playlists will appear here once added in <code>playlists.json</code>.</div>`}
        </div>
      </section>

      <section class="card">
        <div class="card__hd">
          <div>
            <div class="card__title">Social</div>
            <div class="card__sub">Follow the label</div>
          </div>
        </div>
        <div class="card__bd">
          <div class="actions">
            ${socialPairs.map(([k,v])=>`<a class="chip chip--ghost" href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}</a>`).join('') || `<span class="small muted">Add links in <code>data.json</code>.</span>`}
          </div>
        </div>
      </section>
    </div>
  `;
}


function viewReleases(){
  const list = Array.isArray(state.releases) ? state.releases.slice() : [];
  list.sort((a,b)=> (a.cat||'').localeCompare(b.cat||'', undefined, {numeric:true, sensitivity:'base'}));

  const filter = state.ui?.relFilter || 'all';
  const q = (state.ui?.relQuery || '').trim().toLowerCase();

  const card = (r)=>{
    const cat = r.cat || r.catalogNo || '';
    const statusKey = relStatusKey(r);
    const statusLabel = r.status || (statusKey==='out' ? 'Out now' : 'Upcoming');
    const formats = relFormats(r);
    const img = coverThumbFor(cat) || coverFor(cat);
    const vinylLink = r.elasticstage || state.config?.links?.elasticStage || '#';
    const search = `${cat} ${r.title||''} ${r.artists||''} ${r.date||''} ${statusLabel}`.toLowerCase();

    const ok = (filter==='all' || statusKey===filter) && (!q || search.includes(q));

    return `
      <article class="relCard" data-relcard="1" data-relstatus="${esc(statusKey)}" data-relsearch="${esc(search)}" style="${ok?'':'display:none'}">
        <img class="relCard__img" loading="lazy" src="${esc(img)}" alt="${esc(cat)}">
        <div class="relCard__bd">
          <div class="relCard__kicker">
            <div class="relCard__cat">${esc(cat)}</div>
            <div class="pill ${statusKey==='out'?'pill--out':'pill--up'}">${esc(statusLabel)}</div>
          </div>
          <div class="relCard__title">${esc(r.title || '')}</div>
          <div class="relCard__sub">${esc(r.artists || '')}${r.date?` • ${esc(r.date)}`:''}</div>

          ${formats.length ? `<div class="relCard__chips">
            ${formats.map(f=>`<span class="chip chip--ghost">${esc(f)}</span>`).join('')}
          </div>`:''}

          <div class="relCard__actions">
            ${r.beatport ? `<a class="btn btn--sm btn--outline" href="${esc(r.beatport)}" target="_blank" rel="noopener">Beatport</a>`:''}
            <a class="btn btn--sm btn--primary" href="${esc(vinylLink)}" target="_blank" rel="noopener">Vinyl + CD</a>
          </div>
        </div>
      </article>
    `;
  };

  return `
    <section class="card">
      <div class="card__hd">
        <div>
          <div class="card__title">Releases</div>
          <div class="card__sub">Catalogue • DSP links + Vinyl/CD</div>
        </div>
        <a class="chip chip--ghost" href="${esc(state.config.links.beatportLabel)}" target="_blank" rel="noopener">Beatport Label</a>
      </div>
      <div class="card__bd">
        <div class="toolbar">
          <div class="toolbar__left">
            <button class="chip ${filter==='all'?'chip--blue':'chip--ghost'}" type="button" data-relfilter="all">All</button>
            <button class="chip ${filter==='out'?'chip--blue':'chip--ghost'}" type="button" data-relfilter="out">Out now</button>
            <button class="chip ${filter==='upcoming'?'chip--blue':'chip--ghost'}" type="button" data-relfilter="upcoming">Upcoming</button>
          </div>
          <div class="toolbar__right">
            <input class="input" id="relSearch" data-relq placeholder="Search: RBR007, DKTech, Society…" value="${esc(state.ui?.relQuery||'')}" />
          </div>
        </div>

        <div class="grid grid--cards" id="relGrid">
          ${list.map(card).join('')}
        </div>
      </div>
    </section>
  `;
}



function viewBooking(){
  const email = state.config.contacts.infoEmail;
  return `
    <div class="grid cols2">
      <section class="card">
        <div class="card__hd">
          <div>
            <div class="card__title">Roster</div>
            <div class="card__sub">Bio + socials + Book Now</div>
          </div>
          <span class="badge"><span class="dot"></span>Email only</span>
        </div>
        <div class="card__bd">
          <div class="list">
            ${state.artists.map(a => `
              <div class="item">
                <img class="item__thumb" src="${esc(a.photo || './assets/logos/rbr-logo.png')}" alt="${esc(a.name)}" onerror="this.src='./assets/logos/rbr-logo.png'">
                <div class="item__meta">
                  <div class="item__name">${esc(a.name)}</div>
                  <div class="item__small">${esc(a.bio).slice(0,120)}${a.bio.length>120?'…':''}</div>
                </div>
                <div class="item__right">
                  <button class="chip chip--accent" data-book="${esc(a.name)}">Book Now</button>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="hr"></div>
        </div>
      </section>

      <section class="card">
        <div class="card__hd">
          <div class="card__title">Booking Form (Email draft)</div>
          <a class="chip chip--ghost" href="mailto:${esc(email)}">Open Mail</a>
        </div>
        <div class="card__bd">
          <div class="form">
            <div>
              <div class="label">Artist</div>
              <input class="input" id="bkArtist" placeholder="DKTech / Wyrus / ..." />
            </div>
            <div>
              <div class="label">Event / Venue</div>
              <input class="input" id="bkEvent" placeholder="Event name + venue" />
            </div>
            <div class="grid cols2">
              <div>
                <div class="label">Date</div>
                <input class="input" id="bkDate" placeholder="YYYY-MM-DD" />
              </div>
              <div>
                <div class="label">City / Country</div>
                <input class="input" id="bkCity" placeholder="Zagreb, Croatia" />
              </div>
            </div>
            <div class="grid cols2">
              <div>
                <div class="label">Set length</div>
                <input class="input" id="bkSet" placeholder="60/90/120 min" />
              </div>
              <div>
                <div class="label">Fee / Budget range</div>
                <input class="input" id="bkBudget" placeholder="€___–€___" />
              </div>
            </div>
            <div>
              <div class="label">Tech setup (CDJs/Mixer)</div>
              <input class="input" id="bkTech" placeholder="2x CDJ-3000 + DJM-900NXS2/V10" />
            </div>
            <div>
              <div class="label">Message</div>
              <textarea id="bkMsg" placeholder="Lineup/billing + any details..."></textarea>
            </div>
            <button class="btn btn--primary" id="bkSend">Create Email</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function viewDemo(){
  const email = state.config.contacts.infoEmail;
  return `
    <div class="grid cols2">
      <section class="card">
        <div class="card__hd">
          <div>
            <div class="card__title">Submit Demo</div>
            <div class="card__sub">Private link only (SoundCloud playlist preferred)</div>
          </div>
          <span class="badge"><span class="dot"></span>Quality first</span>
        </div>
        <div class="card__bd">
          <div class="hr"></div>
          <div class="actions">
            <a class="btn btn--blue" href="mailto:${esc(email)}?subject=${encodeURIComponent('Demo Submission — Rhythmic Beatz Records')}" rel="noopener">Open Mail</a>
            <a class="btn" href="${esc(state.config.links.soundcloud)}" target="_blank" rel="noopener">SoundCloud</a>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card__hd">
          <div class="card__title">Demo Form (Email draft)</div>
          <span class="badge badge--red"><span class="dot"></span>No attachments</span>
        </div>
        <div class="card__bd">
          <div class="form">
            <div>
              <div class="label">Artist name</div>
              <input class="input" id="dmArtist" placeholder="Artist name" />
            </div>
            <div class="grid cols2">
              <div>
                <div class="label">City / Country</div>
                <input class="input" id="dmLoc" placeholder="Zagreb, Croatia" />
              </div>
              <div>
                <div class="label">BPM (optional)</div>
                <input class="input" id="dmBpm" placeholder="145" />
              </div>
            </div>
            <div>
              <div class="label">Private link (SoundCloud playlist preferred)</div>
              <input class="input" id="dmLink" placeholder="https://soundcloud.com/... (private)" />
            </div>
            <div>
              <div class="label">Vibe reference (1–2 sentences)</div>
              <textarea id="dmVibe" placeholder="Peak-time warehouse hardgroove..."></textarea>
            </div>
            <div>
              <div class="label">Social links</div>
              <input class="input" id="dmSocial" placeholder="Instagram / SoundCloud" />
            </div>
            <button class="btn btn--primary" id="dmSend">Create Email</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function viewStore(){
  const items = Array.isArray(state.store) ? state.store.slice() : [];

  const byCat = (c)=> items.filter(i => (i.category||'')===c);

  const section = (title, subtitle, arr)=>`
    <section class="section">
      <div class="section__hd">
        <div>
          <div class="section__title">${esc(title)}</div>
          ${subtitle?`<div class="small muted">${esc(subtitle)}</div>`:''}
        </div>
      </div>
      <div class="grid cols2">
        ${arr.map(card).join('') || `<div class="card"><div class="card__bd"><div class="p">Coming soon.</div></div></div>`}
      </div>
    </section>
  `;

  const resolveImg = (it)=>{
    if(it.image) return it.image;
    const guess = (it.title||'').toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
    const w = `./assets/store_webp/${guess}.webp`;
    const p = `./assets/store/${guess}.png`;
    return w || p;
  };

  const card = (it)=> {
    const img = it.image || '';
    const price = it.price ? `<span class="pill pill--accent">${esc(it.price)}</span>` : '';
    const action = ()=>{
      const t = (it.ctaType||'').toLowerCase();
      if(t==='link' && it.ctaValue) return `<a class="btn btn--primary" href="${esc(it.ctaValue)}" target="_blank" rel="noopener">${esc(it.ctaText||'Open')}</a>`;
      if(t==='go' && it.ctaValue) return `<button class="btn btn--primary" data-go="${esc(it.ctaValue)}">${esc(it.ctaText||'Open')}</button>`;
      if(t==='signup') return `<button class="btn btn--primary" data-signup="1">${esc(it.ctaText||'Notify me')}</button>`;
      if(t==='mailto' && it.ctaValue) return `<a class="btn btn--primary" href="mailto:${esc(it.ctaValue)}">${esc(it.ctaText||'Email')}</a>`;
      return `<button class="btn btn--primary" data-signup="1">Notify me</button>`;
    };

    return `
      <article class="card">
        <div class="card__hd">
          <div>
            <div class="card__title">${esc(it.title||'')}</div>
            <div class="card__sub">${esc(it.status||'')}</div>
          </div>
          ${price}
        </div>
        <div class="card__bd">
          ${img ? `<div class="img"><img loading="lazy" src="${esc(img)}" alt="${esc(it.title||'item')}"></div>` : ``}
          ${it.description ? `<div class="p">${esc(it.description)}</div>` : ``}
          <div class="actions">
            ${action()}
            <button class="btn btn--ghost" data-go="booking">Custom order</button>
          </div>
        </div>
      </article>
    `;
  };

  const digital = byCat('DIGITAL');
  const vinyl = byCat('VINYL_CD');
  const merch = byCat('MERCH');
  const services = byCat('SERVICES');
  const offers = byCat('OFFERS');

  return `
    <div class="stack">
      <section class="hero hero--compact">
        <div class="hero__kicker">STORE</div>
        <h2 class="hero__title">Underground tools, packs, and services</h2>
        <div class="hero__sub">Minimal. Direct. No commercial noise.</div>
        <div class="hero__actions">
          <button class="btn btn--primary" data-go="booking">Custom Order</button>
          <button class="btn btn--blue" data-signup="1">Notify list</button>
        </div>
      </section>

      ${section('Digital', 'Releases / sample packs / exclusive drops', digital)}
      <div class="divider"></div>
      ${section('Vinyl + CD', 'External checkout via Elastic Stage', vinyl)}
      <div class="divider"></div>
      ${section('Merch', 'Limited drops', merch)}
      <div class="divider"></div>
      ${section('Services', 'Mix/Master • Production • Workshops • Ops', services)}
      <div class="divider"></div>
      ${section('Offers', 'Quick options', offers)}
    </div>
  `;
}

function viewShop(){
  return viewStore();
}



function initSearchFiltering(){
  // Releases filtering (no re-render while typing)
  const relInput = document.querySelector('#relSearch');
  const applyReleases = ()=>{
    const q = (relInput?.value || '').trim().toLowerCase();
    state.ui.relQuery = q;
    const filter = state.ui.relFilter || 'all';
    document.querySelectorAll('[data-relcard]').forEach(card=>{
      const s = (card.getAttribute('data-relsearch')||'').toLowerCase();
      const st = card.getAttribute('data-relstatus')||'all';
      const ok = (filter==='all' || st===filter) && (!q || s.includes(q));
      card.style.display = ok ? '' : 'none';
    });
  };
  document.querySelectorAll('[data-relfilter]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.ui.relFilter = btn.getAttribute('data-relfilter') || 'all';
      // update chip styles without full render
      document.querySelectorAll('[data-relfilter]').forEach(b=>{
        b.classList.remove('chip--blue'); b.classList.add('chip--ghost');
      });
      btn.classList.remove('chip--ghost'); btn.classList.add('chip--blue');
      applyReleases();
    });
  });
  if(relInput){
    relInput.addEventListener('input', applyReleases);
    applyReleases();
  }

  // Artists filtering
  const artInput = document.querySelector('#artSearch');
  const applyArtists = ()=>{
    const q = (artInput?.value || '').trim().toLowerCase();
    state.ui.artQuery = q;
    document.querySelectorAll('[data-artcard]').forEach(card=>{
      const s = (card.getAttribute('data-artsearch')||'').toLowerCase();
      const ok = !q || s.includes(q);
      card.style.display = ok ? '' : 'none';
    });
  };
  if(artInput){
    artInput.addEventListener('input', applyArtists);
    applyArtists();
  }
}


function render(){
  const el = $('#content');
  if(!state.config){ el.innerHTML = '<div class="p">Loading…</div>'; return; }

  const views = {
    home: viewHome,
    events: viewEvents,
    artists: viewArtists,
    releases: viewReleases,
    store: viewStore,
    more: viewMore,
    news: viewNews,
    booking: viewBooking,
    demo: viewDemo
  };
  el.innerHTML = (views[state.tab] || viewHome)();

  // wire actions
  const go = (t)=> setActiveTab(t);

  const goReleases = $('#goReleases'); if(goReleases) goReleases.onclick=(e)=>{e.preventDefault(); go('releases');};
  const qaBook = $('#qaBook'); if(qaBook) qaBook.onclick=()=>go('booking');
  const qaDemo = $('#qaDemo'); if(qaDemo) qaDemo.onclick=()=>go('demo');
  const qaPacks = $('#qaPacks'); if(qaPacks) qaPacks.onclick=()=>go('store');
  document.querySelectorAll('[data-go]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const t = btn.getAttribute('data-go');
      if(t) go(t);
    });
  });


  

  document.querySelectorAll('[data-signup]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      openSignup();
    });
  });
document.querySelectorAll('[data-book]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-book');
      $('#bkArtist').value = name || '';
      // scroll to form on desktop
      const f = $('#bkSend'); if(f) f.scrollIntoView({behavior:'smooth', block:'center'});
    });
  });

  initSearchFiltering();

  const bkSend = $('#bkSend');
  if(bkSend){
    bkSend.onclick = ()=>{
      const email = state.config.contacts.infoEmail;
      const artist = $('#bkArtist').value.trim() || 'Artist';
      const event = $('#bkEvent').value.trim() || 'Event/Venue';
      const date = $('#bkDate').value.trim() || 'YYYY-MM-DD';
      const city = $('#bkCity').value.trim() || 'City/Country';
      const set = $('#bkSet').value.trim() || 'Set length';
      const budget = $('#bkBudget').value.trim() || 'Budget';
      const tech = $('#bkTech').value.trim() || 'Tech setup';
      const msg = $('#bkMsg').value.trim();

      const subject = `Booking Request — ${artist} — ${date} — ${event}`;
      const body = [
        `Artist: ${artist}`,
        `Event/Venue: ${event}`,
        `Date: ${date}`,
        `City/Country: ${city}`,
        `Set length: ${set}`,
        `Fee/Budget range: ${budget}`,
        `Technical setup: ${tech}`,
        ``,
        `Lineup/Billing + details:`,
        msg || '(add details)',
        ``,
        `Sent via Rhythmic Beatz Records PWA`
      ].join('\n');

      mailto(email, subject, body);
    };
  }

  const dmSend = $('#dmSend');
  if(dmSend){
    dmSend.onclick = ()=>{
      const email = state.config.contacts.infoEmail;
      const artist = $('#dmArtist').value.trim() || 'Artist';
      const loc = $('#dmLoc').value.trim() || 'City/Country';
      const bpm = $('#dmBpm').value.trim();
      const link = $('#dmLink').value.trim() || '(private link)';
      const vibe = $('#dmVibe').value.trim() || '(vibe reference)';
      const socials = $('#dmSocial').value.trim() || '(social links)';
      const subject = `Demo Submission — ${artist}`;
      const body = [
        `Artist: ${artist}`,
        `Location: ${loc}`,
        `Private link: ${link}`,
        `BPM: ${bpm || '(optional)'}`,
        ``,
        `Vibe reference:`,
        vibe,
        ``,
        `Socials:`,
        socials,
        ``,
        `Notes: original, unreleased tracks only. Private link only.`
      ].join('\n');
      mailto(email, subject, body);
    };
  }
}


function openSignup(){
  const m = document.getElementById('signupModal');
  if(!m) return;
  m.classList.add('is-open');
  m.setAttribute('aria-hidden','false');
  const out = document.getElementById('signupResult'); if(out) out.textContent = '';
  const inp = document.getElementById('signupEmail'); if(inp){ inp.value=''; setTimeout(()=>inp.focus(), 50); }
}

function closeSignup(){
  const m = document.getElementById('signupModal');
  if(!m) return;
  m.classList.remove('is-open');
  m.setAttribute('aria-hidden','true');
}

let __signupInitDone = false;
function initSignupOnce(){
  if(__signupInitDone) return;
  __signupInitDone = true;

  document.querySelectorAll('[data-modal-close="signup"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{ e.preventDefault(); closeSignup(); });
  });

  const submit = document.getElementById('signupSubmit');
  if(submit){
    submit.addEventListener('click', ()=>{
      const email = (document.getElementById('signupEmail')?.value || '').trim();
      const out = document.getElementById('signupResult');
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!ok){
        if(out) out.textContent = 'Please enter a valid email.';
        return;
      }
      try{
        const key = 'rbr_signups_v1';
        const prev = JSON.parse(localStorage.getItem(key) || '[]');
        prev.push({email, ts: new Date().toISOString()});
        localStorage.setItem(key, JSON.stringify(prev.slice(-200)));
      }catch(_){}

      if(out) out.textContent = 'Saved. You are on the list.';
      // Optional: open mailto so the user can send it instantly (works even without backend)
      const to = state?.config?.contacts?.infoEmail || '';
      if(to){
        const subject = 'RBR — Guestlist signup';
        const body = `Email: ${email}\nSource: PWA signup`;
        // Do not force; open in new tab to avoid killing PWA state
        window.open(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
      }
      setTimeout(()=>closeSignup(), 400);
    });
  }

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') closeSignup();
  });
}


function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.tab');
  if(!btn) return;
  setActiveTab(btn.dataset.tab);
});

loadAll();
