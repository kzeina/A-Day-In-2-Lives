/* ══════════════════════════════════════════════════════════
   A Day in Two Lives · script.js
   ══════════════════════════════════════════════════════════ */

/* ─── STATE ─────────────────────────────────────────────── */
const state = {
  watched: {
    avani:  { morning: false, afternoon: false, evening: false },
    asemai: { morning: false, afternoon: false, evening: false }
  },
  voted: { morning: null, afternoon: null, evening: null },
  nudgeDismissed: { morning: false, afternoon: false, evening: false },
  flashOn: false,
  cameraStream: null,
  facingMode: 'user',
  capturedDataURL: null,
  daySlideInView: false,
  polaroidFrameColor: '#f8f3e8'
};

const APP_FILE_SLUG = 'a-day-in-two-lives';
const PERIODS  = ['morning', 'afternoon', 'evening'];
let daySlideIndex = 0;
const PERSONS  = ['avani', 'asemai'];
const OPPOSITE = { avani: 'asemai', asemai: 'avani' };

/* ─── NAVBAR SCROLL ──────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 60) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

/* ─── SMOOTH SECTION LINKS + DEEP-LINKS TO A PART OF THE DAY ─ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').replace(/^#/, '');
    if (PERIODS.includes(id)) {
      e.preventDefault();
      setDaySlide(PERIODS.indexOf(id), { scrollToDay: true, updateHash: true });
      return;
    }
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ─── “THE DAY” CAROUSEL ─────────────────────────────────── */
function setDaySlide(i, { scrollToDay = false, updateHash = false } = {}) {
  const n = PERIODS.length;
  const idx = ((i % n) + n) % n;
  daySlideIndex = idx;
  const track = document.getElementById('daySlidesTrack');
  if (track) {
    track.style.transform = `translateX(-${idx * 100}%)`;
  }
  document.querySelectorAll('.day-dot').forEach((dot, dIdx) => {
    const on = dIdx === idx;
    dot.classList.toggle('is-active', on);
    dot.setAttribute('aria-selected', on);
  });
  document.querySelectorAll('.day-slide').forEach((slide, sIdx) => {
    slide.setAttribute('aria-hidden', sIdx !== idx);
  });
  if (updateHash && history.replaceState) {
    const next = `#${PERIODS[idx]}`;
    if (location.hash !== next) {
      history.replaceState(null, '', next);
    }
  }
  if (scrollToDay) {
    const dayEl = document.getElementById('the-day');
    if (dayEl) dayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function daySlideNext() {
  setDaySlide(daySlideIndex + 1, { updateHash: true });
}
function daySlidePrev() {
  setDaySlide(daySlideIndex - 1, { updateHash: true });
}

function initDayFromHash() {
  const h = location.hash.replace(/^#/, '');
  if (PERIODS.includes(h)) {
    setDaySlide(PERIODS.indexOf(h), { updateHash: false });
  }
}


/* ═══════════════════════════════════════════════════════════
   VIDEO PLAYBACK
   ═══════════════════════════════════════════════════════════ */
function playVideo(person, period) {
  const srcEl = document.querySelector(`#vid-${person}-${period} source`);
  const src   = srcEl ? srcEl.getAttribute('src') : '';

  const lb      = document.getElementById('lightbox');
  const lbVid   = document.getElementById('lightboxVideo');
  const lbSrc   = document.getElementById('lightboxSource');
  const lbLabel = document.getElementById('lightboxLabel');

  lbLabel.textContent = `${capitalize(person)} · ${period}`;
  lbSrc.setAttribute('src', src);
  lbVid.load();
  lbVid.play().catch(() => {});
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  lbVid.onended = () => {
    markWatched(person, period);
    closeLightbox();
  };

  lbVid.ontimeupdate = () => {
    if (!lbVid.paused && lbVid.currentTime > 1) {
      markWatched(person, period);
    }
  };
}

function closeLightbox() {
  const lb    = document.getElementById('lightbox');
  const lbVid = document.getElementById('lightboxVideo');
  lbVid.pause();
  lbVid.currentTime = 0;
  lb.style.display = 'none';
  document.body.style.overflow = '';
}

/* ─── MARK WATCHED ───────────────────────────────────────── */
function markWatched(person, period) {
  if (state.watched[person][period]) return;
  state.watched[person][period] = true;

  const card  = document.getElementById(`card-${person}-${period}`);
  const badge = document.getElementById(`badge-${person}-${period}`);
  const overlay = document.getElementById(`overlay-${person}-${period}`);

  if (card)    card.classList.add('watched');
  if (badge)   badge.classList.add('visible');
  if (overlay) overlay.classList.add('hidden');

  updateWatchBtn(person, period);
  checkNudge(person, period);
  checkVote(period);
}

function updateWatchBtn(person, period) {
  const card = document.getElementById(`card-${person}-${period}`);
  if (!card) return;
  const btn = card.querySelector('.card-watch-btn');
  if (btn) {
    btn.textContent = `rewatch ${person}'s ${period}`;
  }
}

/* ─── NUDGE LOGIC ────────────────────────────────────────── */
function checkNudge(person, period) {
  if (state.nudgeDismissed[period]) return;

  const other      = OPPOSITE[person];
  const otherWatched = state.watched[other][period];
  const nudge      = document.getElementById(`nudge-${period}`);
  const nudgeText  = document.getElementById(`nudge-${period}-text`);
  const nudgeBtn   = document.getElementById(`nudge-${period}-btn`);

  if (otherWatched) return;

  nudgeText.textContent =
    `You just watched ${capitalize(person)}'s ${period} — want to see how ${capitalize(other)} spent theirs?`;
  nudgeBtn.textContent = `watch ${other}'s ${period}`;
  nudgeBtn.onclick = () => {
    dismissNudge(period);
    playVideo(other, period);
  };
  nudge.style.display = 'block';
}

function dismissNudge(period) {
  state.nudgeDismissed[period] = true;
  const nudge = document.getElementById(`nudge-${period}`);
  if (nudge) nudge.style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════
   POLAROID CAMERA
   ═══════════════════════════════════════════════════════════ */
async function startCamera() {
  const startWrap = document.getElementById('startCameraWrap');
  const indicator = document.getElementById('camIndicator');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    state.cameraStream = stream;
    const vid = document.getElementById('viewfinderVideo');
    vid.srcObject = stream;
    if (state.facingMode === 'user') {
      vid.classList.add('viewfinder--mirror');
    } else {
      vid.classList.remove('viewfinder--mirror');
    }
    vid.play();
    indicator.classList.add('active');
    if (startWrap) startWrap.style.display = 'none';
  } catch (err) {
    alert('Could not access camera. Please allow camera permissions and try again.');
    console.error(err);
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(t => t.stop());
    state.cameraStream = null;
  }
}

async function switchCamera() {
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  stopCamera();
  await startCamera();
}

function toggleFlash() {
  state.flashOn = !state.flashOn;
  const btn = document.getElementById('flashToggle');
  if (state.flashOn) {
    btn.classList.add('flash-on');
  } else {
    btn.classList.remove('flash-on');
  }
}

/* ─── SHUTTER ────────────────────────────────────────────── */
function takePhoto() {
  const vid = document.getElementById('viewfinderVideo');
  if (!state.cameraStream || vid.readyState < 2) {
    alert('Camera is not ready. Please start the camera first.');
    return;
  }

  flashEffect(() => {
    captureFrame(vid);
  });
}

function flashEffect(callback) {
  const overlay = document.getElementById('flashOverlay');
  overlay.classList.add('active');
  setTimeout(() => {
    overlay.classList.remove('active');
    callback();
  }, 80);
}

function captureFrame(videoEl) {
  const vw = videoEl.videoWidth  || 1280;
  const vh = videoEl.videoHeight || 720;

  const canvas = document.createElement('canvas');
  canvas.width  = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');

  if (state.facingMode === 'user') {
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoEl, 0, 0, vw, vh);

  state.capturedDataURL = canvas.toDataURL('image/png');
  renderPolaroid(state.capturedDataURL);
  triggerEjectAnimation();
}

const DEFAULT_POLAROID_FRAME = '#f8f3e8';

function relativeLuminanceFromHex(hex) {
  const m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/i.exec((hex || '').trim());
  if (!m) return 0.85;
  const lin = s => {
    const v = parseInt(s, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(m[1]);
  const g = lin(m[2]);
  const b = lin(m[3]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function polaroidInkForFrame(frameHex) {
  const L = relativeLuminanceFromHex(frameHex);
  if (L < 0.4) {
    return { main: '#f8f3e8', sub: 'rgba(240,232,220,0.95)' };
  }
  return { main: '#3a2e20', sub: '#5a4a38' };
}

function getPolaroidFrameColor() {
  return state.polaroidFrameColor || DEFAULT_POLAROID_FRAME;
}

function syncPolaroidFrameShell() {
  const el = document.getElementById('polaroidFrame');
  const input = document.getElementById('polaroidFrameColorInput');
  if (el) el.style.background = getPolaroidFrameColor();
  if (input) {
    const c = getPolaroidFrameColor();
    if (/^#([0-9a-fA-F]{6})$/.test(c)) {
      input.value = c[0] === '#' ? c : `#${c}`;
    }
  }
}

function setPolaroidFrameColor(hex) {
  if (!hex) return;
  const raw = (hex + '').trim();
  const h = raw[0] === '#' ? raw : `#${raw}`;
  if (!/^#([0-9a-fA-F]{6})$/.test(h)) return;
  state.polaroidFrameColor = h;
  syncPolaroidFrameShell();
  if (state.capturedDataURL) {
    renderPolaroid(state.capturedDataURL);
  }
}

function initPolaroidFrameColorUI() {
  const picker = document.getElementById('polaroidFramePicker');
  if (!picker) return;
  const swatches = picker.querySelectorAll('.polaroid-swatch[data-color]');
  const customInput = document.getElementById('polaroidFrameColorInput');

  swatches.forEach(btn => {
    btn.addEventListener('click', () => {
      setPolaroidFrameColor(btn.getAttribute('data-color'));
      swatches.forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  if (customInput) {
    customInput.addEventListener('input', () => {
      setPolaroidFrameColor(customInput.value);
      swatches.forEach(b => {
        b.classList.remove('is-selected');
        b.setAttribute('aria-pressed', 'false');
      });
    });
  }
}

/* ─── RENDER POLAROID CANVAS ─────────────────────────────── */
function renderPolaroid(imgDataURL) {
  const img = new Image();
  img.onload = () => {
    const IW = 800;
    const IH = Math.round(IW * img.height / img.width);
    const PAD_SIDE = 32;
    const PAD_TOP  = 32;
    const PAD_BOT  = 90;

    const CW = IW + PAD_SIDE * 2;
    const CH = IH + PAD_TOP + PAD_BOT;

    const canvas = document.getElementById('polaroidCanvas');
    canvas.width  = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d');
    const frame = getPolaroidFrameColor();
    const ink = polaroidInkForFrame(frame);

    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, CW, CH);

    ctx.drawImage(img, PAD_SIDE, PAD_TOP, IW, IH);

    const now = new Date();
    const ts  = formatTimestamp(now);

    ctx.font = '600 30px "Caveat", cursive';
    ctx.fillStyle = ink.main;
    ctx.textAlign = 'center';
    ctx.fillText(ts, CW / 2, IH + PAD_TOP + 38);

    const note = document.getElementById('polaroidNote').value.trim();
    if (note) {
      ctx.font = '400 24px "Caveat", cursive';
      ctx.fillStyle = ink.sub;
      ctx.fillText(note, CW / 2, IH + PAD_TOP + 66);
    }

    const outputDiv = document.getElementById('polaroidOutput');
    outputDiv.style.display = 'block';
    syncPolaroidFrameShell();
    outputDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

    document.getElementById('polaroidNote').oninput = () => {
      updatePolaroidNote(ctx, CW, CH, IH, PAD_TOP, PAD_SIDE, IW);
    };

    state.lastCtx = { ctx, CW, CH, IH, PAD_TOP, PAD_SIDE, IW, img };
  };
  img.src = imgDataURL;
}

function updatePolaroidNote(ctx, CW, CH, IH, PAD_TOP, PAD_SIDE, IW) {
  if (!state.lastCtx) return;
  const { ctx: c, CW: cw, CH: ch, IH: ih, PAD_TOP: pt, PAD_SIDE: ps, IW: iw, img } = state.lastCtx;
  const frame = getPolaroidFrameColor();
  const ink = polaroidInkForFrame(frame);

  c.fillStyle = frame;
  c.fillRect(0, ih + pt + 8, cw, ch - (ih + pt + 8));

  const now  = new Date();
  const ts   = formatTimestamp(now);
  c.font = '600 30px "Caveat", cursive';
  c.fillStyle = ink.main;
  c.textAlign = 'center';
  c.fillText(ts, cw / 2, ih + pt + 38);

  const note = document.getElementById('polaroidNote').value.trim();
  if (note) {
    c.font = '400 24px "Caveat", cursive';
    c.fillStyle = ink.sub;
    c.fillText(note, cw / 2, ih + pt + 66);
  }
}

/* ─── DOWNLOAD POLAROID ──────────────────────────────────── */
function downloadPolaroid() {
  const canvas = document.getElementById('polaroidCanvas');
  if (!canvas) return;

  const note    = document.getElementById('polaroidNote').value.trim();
  const now     = new Date();
  const ts      = now.toISOString().slice(0, 10);
  const name    = note
    ? `${APP_FILE_SLUG}-${ts}-${note.replace(/\s+/g,'-').replace(/[^a-z0-9\-]/gi,'').slice(0,20)}.png`
    : `${APP_FILE_SLUG}-${ts}.png`;

  const link = document.createElement('a');
  link.download = name;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ─── RETAKE ─────────────────────────────────────────────── */
function retakePhoto() {
  document.getElementById('polaroidOutput').style.display = 'none';
  document.getElementById('polaroidNote').value = '';
  state.capturedDataURL = null;
  state.lastCtx = null;
}

/* ─── EJECT ANIMATION ────────────────────────────────────── */
function triggerEjectAnimation() {
  const slot = document.getElementById('photoSlot');
  if (!slot) return;

  const el = document.createElement('div');
  el.className = 'ejecting-polaroid';
  el.innerHTML = `
    <div class="ejecting-polaroid-photo"></div>
    <div class="ejecting-polaroid-line"></div>
    <div class="ejecting-polaroid-line" style="width:60%;margin-top:5px;"></div>
  `;
  slot.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/* ═══════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════ */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTimestamp(date) {
  const pad = n => String(n).padStart(2, '0');
  const dd   = pad(date.getDate());
  const mm   = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh   = pad(date.getHours());
  const min  = pad(date.getMinutes());
  return `${dd} · ${mm} · ${yyyy}   ${hh}:${min}`;
}

/* ─── KEYBOARD SHORTCUTS ─────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
  if (e.key === ' ' && document.getElementById('lightbox').style.display === 'flex') {
    e.preventDefault();
    const v = document.getElementById('lightboxVideo');
    v.paused ? v.play() : v.pause();
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const t = e.target;
    if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
    if (t && t.isContentEditable) return;
    if (document.getElementById('lightbox').style.display === 'flex') return;
    if (!state.daySlideInView) return;
    e.preventDefault();
    if (e.key === 'ArrowLeft') daySlidePrev();
    else daySlideNext();
  }
});

/* ─── INTERSECTION OBSERVER: lazy-load card videos ──────── */
const vidObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const vid = entry.target;
      if (vid.dataset.src) {
        vid.querySelector('source').setAttribute('src', vid.dataset.src);
        vid.load();
        vidObserver.unobserve(vid);
      }
    }
  });
}, { rootMargin: '200px' });

document.querySelectorAll('.card-video').forEach(v => vidObserver.observe(v));

/* ─── INIT ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initDayFromHash();
  const dayWrap = document.getElementById('the-day');
  const prevBtn = document.getElementById('dayPagerPrev');
  const nextBtn = document.getElementById('dayPagerNext');
  if (prevBtn) prevBtn.addEventListener('click', daySlidePrev);
  if (nextBtn) nextBtn.addEventListener('click', daySlideNext);
  document.querySelectorAll('.day-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const j = parseInt(dot.getAttribute('data-day-index'), 10);
      if (!Number.isNaN(j)) setDaySlide(j, { updateHash: true });
    });
  });
  window.addEventListener('hashchange', initDayFromHash);
  if (dayWrap) {
    new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        state.daySlideInView = e.isIntersecting && e.intersectionRatio > 0.2;
      },
      { threshold: [0, 0.15, 0.2, 0.5, 1] }
    ).observe(dayWrap);
  }
  const vp = document.getElementById('daySlidesViewport');
  if (vp) {
    let touchX = null;
    vp.addEventListener('touchstart', te => {
      touchX = te.changedTouches[0].screenX;
    }, { passive: true });
    vp.addEventListener('touchend', te => {
      if (touchX == null) return;
      const dx = te.changedTouches[0].screenX - touchX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) daySlideNext();
        else daySlidePrev();
      }
      touchX = null;
    }, { passive: true });
  }
  const heroVid = document.getElementById('heroVideo');
  if (heroVid) {
    heroVid.addEventListener('error', () => {
      heroVid.parentElement.style.background =
        'linear-gradient(135deg, #2b3d52 0%, #4a7fa0 50%, #2b3d52 100%)';
    });
  }
  initPolaroidFrameColorUI();
});


/* ─── BTS Scroll ──────────────────────────────────────── */
let btsIndex = 0;

function updateBTS() {
  const track = document.getElementById('btsTrack');
  const total = track.children.length;
  btsIndex = (btsIndex + total) % total;
  track.style.transform = `translateX(-${btsIndex * 100}%)`;
}

function btsNext() {
  btsIndex++;
  updateBTS();
}

function btsPrev() {
  btsIndex--;
  updateBTS();
}