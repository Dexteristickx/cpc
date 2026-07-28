/* ============================================================
   CHOSEN PEOPLE'S CHURCH — shared site behaviour (redesign)
   INTEGRATIONS PRESERVED (same endpoints & contracts as live site):
     • YouTube feed ........... /api/youtube  (Google Cloud Console key stays server-side)
     • Audio sermons .......... /api/sermons
     • Events ................. /api/events
     • Gallery ................ /api/gallery
     • Receipt upload ......... POST receipt-submit.php (identical field names)
   Every fetch has a 10s timeout + graceful fallback, so a slow API
   never leaves visitors staring at a blank section (audit issue #5).
   ============================================================ */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

async function apiGet(url, timeout = 10000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) { return null; }
  finally { clearTimeout(timer); }
}
const fmtDate = d => {
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const liveNote = (title, desc) =>
  `<div class="live-note"><b>${title}</b>${desc}</div>`;
const LIVE_HINT = 'Streams automatically from the church server when deployed at chosenpeopleschurch.com. (Preview mode shows this placeholder.)';

/* ---------- Mobile menu ---------- */
const burger = $('#burger'), menuEl = $('#menu');
if (burger && menuEl) {
  burger.addEventListener('click', () => {
    menuEl.classList.toggle('open');
    burger.setAttribute('aria-expanded', menuEl.classList.contains('open'));
  });
  $$('#menu a').forEach(a => a.addEventListener('click', () => menuEl.classList.remove('open')));
}

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
}), { threshold: .12 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- Back to top ---------- */
const toTop = $('#toTop');
if (toTop) {
  addEventListener('scroll', () => toTop.classList.toggle('show', scrollY > 600), { passive: true });
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- Countdown → next Sunday 08:30 (logic preserved from live site) ---------- */
const daysEl = $('#days');
if (daysEl) {
  const next = new Date();
  next.setDate(next.getDate() + (7 - next.getDay()) % 7);
  next.setHours(8, 30, 0, 0);
  const tick = () => {
    const now = Date.now();
    if (next.getTime() - now < 0) next.setDate(next.getDate() + 7);
    const dist = next.getTime() - now;
    const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v).padStart(2, '0'); };
    set('#days', Math.floor(dist / 864e5));
    set('#hours', Math.floor(dist % 864e5 / 36e5));
    set('#minutes', Math.floor(dist % 36e5 / 6e4));
    set('#seconds', Math.floor(dist % 6e4 / 1e3));
  };
  tick(); setInterval(tick, 1000);
}

/* ---------- Announcement bar — DATA-DRIVEN (fixes stale hardcoded guest-speaker bar).
     Shows the nearest future event from /api/events; hides itself when there is none. ---------- */
const abar = $('#announcement-bar');
if (abar) {
  const closeBtn = $('#abar-close');
  if (closeBtn) closeBtn.addEventListener('click', () => { abar.style.display = 'none'; });
  (async () => {
    const events = await apiGet('/api/events');
    if (!Array.isArray(events)) return;                       // local preview / API down → stays hidden
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const nextEv = events
      .map(e => ({ ...e, _d: new Date(e.date) }))
      .filter(e => !isNaN(e._d) && e._d >= today)
      .sort((a, b) => a._d - b._d)[0];
    if (nextEv) {
      const t = $('[data-ab-text]', abar);
      if (t) t.innerHTML = `Next gathering: <strong>${nextEv.title}</strong> — ${fmtDate(nextEv.d)}`;
      abar.style.display = 'block';
    }
  })();
}

/* ---------- HOME: Latest videos — now via /api/youtube (replaces fragile rss2json bridge).
     Same endpoint Google Console already powers on the Sermons page. ---------- */
const homeVids = $('#home-videos');
if (homeVids) {
  (async () => {
    const data = await apiGet('/api/youtube');
    if (!data || !Array.isArray(data.items) || !data.items.length) {
      homeVids.innerHTML = liveNote('Latest sermons appear here', LIVE_HINT);
      return;
    }
    homeVids.innerHTML = '';
    data.items.slice(0, 4).forEach(v => {
      const s = v.snippet || {}, id = v.id && v.id.videoId;
      if (!id) return;
      const thumb = (s.thumbnails && (s.thumbnails.medium || s.thumbnails.default || {}).url) || '';
      homeVids.insertAdjacentHTML('beforeend', `
        <a class="vcard reveal on" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">
          <span class="thumb"><img src="${thumb}" alt="${s.title || 'Sermon video'}" loading="lazy">
            <span class="pbtn"><i><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></i></span></span>
          <span class="vb"><span class="tag">YouTube</span>
            <h3>${s.title || 'Latest message'}</h3>
            <span class="meta">${fmtDate(s.publishedAt)}</span></span>
        </a>`);
    });
    if (!homeVids.children.length) homeVids.innerHTML = liveNote('Latest sermons appear here', LIVE_HINT);
  })();
}

/* ---------- HOME: CPC Moments preview (same /api/gallery) ---------- */
const momGrid = $('#moments-grid');
if (momGrid) {
  (async () => {
    const items = await apiGet('/api/gallery');
    if (!Array.isArray(items) || !items.length) {
      momGrid.innerHTML = liveNote('Church moments appear here', LIVE_HINT);
      return;
    }
    momGrid.innerHTML = '';
    items.slice(-4).forEach(it => {
      momGrid.insertAdjacentHTML('beforeend',
        `<a class="gitem" href="gallery.html"><img src="${encodeURI(it.imageUrl)}" alt="${it.caption || 'Church moment'}" loading="lazy"></a>`);
    });
  })();
}

/* ---------- EVENTS PAGE (past events filtered out — fixes audit issue #3) ---------- */
const evList = $('#events-list');
if (evList) {
  (async () => {
    const events = await apiGet('/api/events');
    const empty = $('#events-empty');
    if (!Array.isArray(events)) {
      evList.innerHTML = liveNote('Upcoming events appear here', LIVE_HINT);
      return;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = events
      .map(e => ({ ...e, _d: new Date(e.date) }))
      .filter(e => !isNaN(e._d) && e._d >= today)
      .sort((a, b) => a._d - b._d);
    evList.innerHTML = '';
    if (!upcoming.length) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    upcoming.forEach(e => {
      const mon = e._d.toLocaleString('default', { month: 'short' }).toUpperCase();
      evList.insertAdjacentHTML('beforeend', `
        <div class="evrow">
          <div class="evdate"><span class="m">${mon}</span><span class="d">${e._d.getDate()}</span></div>
          <div><h3>${e.title}</h3>
            <div class="evmeta"><span>🕒 ${e.time || ''}</span><span>📍 ${e.location || ''}</span></div>
            <p>${e.description || ''}</p></div>
        </div>`);
    });
  })();
}

/* ---------- SERMONS PAGE ---------- */
const tabVideo = $('#tab-video'), tabAudio = $('#tab-audio');
const panelVideo = $('#panel-videos'), panelAudio = $('#panel-audio');
if (tabVideo && tabAudio && panelVideo && panelAudio) {
  const switchTab = which => {
    tabVideo.classList.toggle('active', which === 'v');
    tabAudio.classList.toggle('active', which === 'a');
    panelVideo.style.display = which === 'v' ? '' : 'none';
    panelAudio.style.display = which === 'a' ? '' : 'none';
  };
  tabVideo.addEventListener('click', () => switchTab('v'));
  tabAudio.addEventListener('click', () => switchTab('a'));

  /* shared search */
  const q = $('#sermon-search');
  if (q) q.addEventListener('input', () => {
    const term = q.value.toLowerCase();
    $$('.vcard, .acard', panelVideo.parentElement).forEach(c =>
      c.style.display = c.textContent.toLowerCase().includes(term) ? '' : 'none');
  });

  /* VIDEO tab — via the site's /api/youtube (Google Console key stays server-side) */
  (async () => {
    const data = await apiGet('/api/youtube');
    if (!data || !Array.isArray(data.items) || !data.items.length) {
      panelVideo.innerHTML = liveNote('Video sermons appear here', LIVE_HINT);
      return;
    }
    panelVideo.innerHTML = '<div class="vgrid"></div>';
    const grid = $('.vgrid', panelVideo);
    data.items.forEach(v => {
      const s = v.snippet || {}, id = v.id && v.id.videoId;
      if (!id) return;
      const thumb = (s.thumbnails && (s.thumbnails.medium || s.thumbnails.default || {}).url) || '';
      grid.insertAdjacentHTML('beforeend', `
        <a class="vcard" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">
          <span class="thumb"><img src="${thumb}" alt="${s.title || 'Sermon video'}" loading="lazy">
            <span class="pbtn"><i><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></i></span></span>
          <span class="vb"><span class="tag">${(v.snippet && 'Video Message') || 'Video Message'}</span>
            <h3>${s.title || ''}</h3><span class="meta">${fmtDate(s.publishedAt)}</span></span>
        </a>`);
    });
  })();

  /* AUDIO tab — /api/sermons; filters BUILT FROM DATA (fixes audit issue #7:
     no more hardcoded pastors/series that match nothing) */
  (async () => {
    const data = await apiGet('/api/sermons');
    if (!Array.isArray(data) || !data.length) {
      panelAudio.innerHTML = liveNote('Audio sermons appear here', 'The audio archive streams from the church server when deployed. Add sermons in the CPC Control Center and they show up automatically.');
      return;
    }
    const selSpeaker = $('#filter-speaker'), selSeries = $('#filter-series');
    const speakers = [...new Set(data.map(s => s.speaker).filter(s => s && s !== '<unknown>'))];
    const series = [...new Set(data.map(s => s.series).filter(Boolean))];
    if (selSpeaker) speakers.forEach(sp => selSpeaker.insertAdjacentHTML('beforeend', `<option>${sp}</option>`));
    if (selSeries) series.forEach(sr => selSeries.insertAdjacentHTML('beforeend', `<option>${sr}</option>`));

    const render = list => {
      panelAudio.innerHTML = '';
      list.forEach((sm, i) => {
        panelAudio.insertAdjacentHTML('beforeend', `
          <div class="acard" data-speaker="${sm.speaker || ''}" data-series="${sm.series || ''}">
            <span class="tag" style="font-size:.7rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--green-dark)">${sm.series || 'Audio Message'}</span>
            <h3>${sm.title || 'Untitled sermon'}</h3>
            <div class="meta"><span>🎙 ${sm.speaker || 'CPC Media'}</span><span>📅 ${sm.date || ''}</span></div>
            ${sm.audioUrl ? `
            <div class="player" data-src="${encodeURI(sm.audioUrl)}">
              <button type="button" aria-label="Play">▶</button>
              <div class="pbar"><div class="ptrack"><div class="pfill"></div></div>
              <div class="ptime"><span class="cur">0:00</span><span class="dur">--:--</span></div></div>
              <audio preload="none" src="${encodeURI(sm.audioUrl)}"></audio>
            </div>` : '<p class="meta">Audio file pending upload.</p>'}
          </div>`);
      });
      wirePlayers();
    };

    const applyFilters = () => {
      const sp = selSpeaker ? selSpeaker.value : '', sr = selSeries ? selSeries.value : '';
      const filtered = data.filter(sm =>
        (!sp || sm.speaker === sp) && (!sr || sm.series === sr));
      if (!filtered.length) {
        panelAudio.innerHTML = `<div class="empty-state"><b>No messages match those filters</b>Try a different speaker or series.</div>`;
      } else render(filtered);
    };
    if (selSpeaker) selSpeaker.addEventListener('change', applyFilters);
    if (selSeries) selSeries.addEventListener('change', applyFilters);
    render(data);

    function wirePlayers() {
      $$('.player', panelAudio).forEach(pl => {
        const audio = $('audio', pl), btn = $('button', pl),
          fill = $('.pfill', pl), cur = $('.cur', pl), dur = $('.dur', pl), track = $('.ptrack', pl);
        if (!audio || !btn) return;
        const t = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '--:--';
        btn.addEventListener('click', () => {
          $$('#panel-audio audio').forEach(a => { if (a !== audio && !a.paused) { a.pause(); } });
          if (audio.paused) { audio.play(); btn.textContent = '⏸'; } else { audio.pause(); btn.textContent = '▶'; }
        });
        audio.addEventListener('loadedmetadata', () => dur.textContent = t(audio.duration));
        audio.addEventListener('timeupdate', () => {
          if (audio.duration) fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
          cur.textContent = t(audio.currentTime);
        });
        audio.addEventListener('ended', () => { btn.textContent = '▶'; fill.style.width = '0'; });
        if (track) track.addEventListener('click', e => {
          const r = track.getBoundingClientRect();
          if (audio.duration) audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
        });
      });
    }
  })();
}

/* ---------- GALLERY PAGE — /api/gallery, filters generated from the data
   (no more empty hardcoded tabs), encodeURI guards space-filenames ---------- */
const ggrid = $('#gallery-grid');
if (ggrid) {
  (async () => {
    const items = await apiGet('/api/gallery');
    if (!Array.isArray(items) || !items.length) {
      ggrid.insertAdjacentHTML('beforebegin', liveNote('The full photo library appears here', LIVE_HINT));
      return;
    }
    const tabsWrap = $('#gallery-tabs');
    const cats = ['All Photos', ...new Set(items.map(i => i.category || 'Photos'))];
    const countFor = c => c === 'All Photos' ? items.length : items.filter(i => (i.category || 'Photos') === c).length;
    tabsWrap.innerHTML = cats.map((c, i) =>
      `<button class="gtab${i === 0 ? ' active' : ''}" data-cat="${c}">${c}<small>${countFor(c)}</small></button>`).join('');

    let current = items, idx = 0;
    const render = cat => {
      current = cat === 'All Photos' ? items : items.filter(i => (i.category || 'Photos') === cat);
      ggrid.innerHTML = current.map((it, i) =>
        `<button class="gitem" data-i="${i}"><img src="${encodeURI(it.imageUrl)}" alt="${it.caption || 'Church photo'}" loading="lazy"></button>`).join('');
      $$('.gitem', ggrid).forEach(b => b.addEventListener('click', () => openLbx(+b.dataset.i)));
    };
    $$('.gtab', tabsWrap).forEach(t => t.addEventListener('click', () => {
      $$('.gtab', tabsWrap).forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      render(t.dataset.cat);
    }));
    render('All Photos');

    /* lightbox */
    const lbx = $('#lightbox'), limg = $('#lbx-img'), lcap = $('#lbx-cap'), lnum = $('#lbx-num');
    const openLbx = i => { idx = i; update(); lbx.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const closeLbx = () => { lbx.classList.remove('open'); document.body.style.overflow = ''; };
    const update = () => {
      const it = current[idx];
      limg.src = encodeURI(it.imageUrl);
      limg.alt = it.caption || 'Church photo';
      lcap.textContent = it.caption || '';
      lnum.textContent = `${idx + 1} / ${current.length}`;
    };
    $('#lbx-close').addEventListener('click', closeLbx);
    $('#lbx-prev').addEventListener('click', e => { e.stopPropagation(); idx = (idx - 1 + current.length) % current.length; update(); });
    $('#lbx-next').addEventListener('click', e => { e.stopPropagation(); idx = (idx + 1) % current.length; update(); });
    lbx.addEventListener('click', e => { if (e.target === lbx) closeLbx(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLbx(); });
  })();
}

/* ---------- GIVING PAGE ---------- */
/* calculator (logic preserved) */
const slider = $('#income-slider');
if (slider) {
  const upd = () => {
    const income = +slider.value, tithe = Math.round(income * .1);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = '₦' + v.toLocaleString(); };
    set('#income-display', income); set('#tithe-display', tithe);
    const btn = $('#btn-amount'); if (btn) btn.textContent = '₦' + tithe.toLocaleString() + '.00';
    $$('.calc-amt').forEach(el => el.textContent = '₦' + tithe.toLocaleString());
  };
  slider.addEventListener('input', upd); upd();
}
/* fund buttons */
$$('.fund').forEach(b => b.addEventListener('click', () => {
  $$('.fund').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const sel = $('#designated_fund'); if (sel && b.dataset.fund) sel.value = b.dataset.fund;
}));
/* copy-to-clipboard (bank details) */
$$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    const old = btn.textContent; btn.textContent = 'Copied ✓';
    setTimeout(() => btn.textContent = old, 1800);
  } catch (e) { btn.textContent = 'Select & copy manually'; }
}));

/* receipt form — IDENTICAL contract to the live site's receipt-submit.php.
   Same field names, same FormData POST, same JSON success/error handling. */
const rForm = $('#receipt-form');
if (rForm) {
  const dz = $('#drop-zone'), fi = $('#receipt_file'), fn = $('#file-name');
  const showFile = f => { if (f) { fn.textContent = f.name + ' (' + Math.round(f.size / 1024) + ' KB)'; } };
  if (dz && fi) {
    dz.addEventListener('click', () => fi.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('over');
      if (e.dataTransfer.files.length) { fi.files = e.dataTransfer.files; showFile(fi.files[0]); checkFile(fi); }
    });
    fi.addEventListener('change', () => { showFile(fi.files[0]); checkFile(fi); });
  }
  function checkFile(input) {
    const f = input.files[0]; if (!f) return;
    const okType = ['image/jpeg', 'image/png', 'application/pdf'].includes(f.type);
    if (!okType || f.size > 5 * 1024 * 1024) {
      alert('Please attach a JPG, PNG or PDF no larger than 5MB.');
      input.value = ''; if (fn) fn.textContent = 'No file chosen';
    }
  }
  rForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!rForm.reportValidity()) return;
    const btn = $('#receipt-submit-btn');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const res = await fetch('receipt-submit.php', { method: 'POST', body: new FormData(rForm) });
      const data = await res.json();
      if (data.success) {
        rForm.style.display = 'none';
        const ok = $('#receipt-success'); if (ok) ok.classList.add('show');
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      alert('This form delivers receipts when deployed at chosenpeopleschurch.com (it posts to receipt-submit.php).');
    } finally {
      btn.disabled = false; btn.innerHTML = '✈ Send Receipt to Church';
    }
  });
  const again = $('#receipt-again');
  if (again) again.addEventListener('click', () => {
    $('#receipt-success').classList.remove('show');
    rForm.style.display = ''; rForm.reset();
    if (fn) fn.textContent = 'No file chosen';
  });
}
