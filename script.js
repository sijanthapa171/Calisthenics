(function () {
  let counterSeconds = 0;

  function pad2(v) { return String(v).padStart(2, '0'); }
  function formatHHMMSS(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return pad2(hh) + ":" + pad2(mm) + ":" + pad2(ss);
  }
  function formatMS(ms) {
    const total = Math.max(0, Math.floor(ms));
    const s = Math.floor(total / 1000);
    const msRem = total % 1000;
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return pad2(mm) + ":" + pad2(ss) + "." + String(msRem).padStart(3, '0');
  }

  function formatHMSMS(ms) {
    const total = Math.max(0, Math.floor(ms));
    const msRem = total % 1000;
    const s = Math.floor(total / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return pad2(hh) + ":" + pad2(mm) + ":" + pad2(ss) + "." + String(msRem).padStart(3, '0');
  }

  function renderLaps() {
    if (!lapsList) return;
    lapsList.innerHTML = '';
    laps.forEach((lap) => {
      const el = document.createElement('div');
      el.className = 'lap-item';
      const label = document.createElement('div'); label.className = 'lap-label'; label.textContent = `Lap ${lap.idx}`;
      const time = document.createElement('div'); time.className = 'lap-time';
      time.textContent = `${formatHMSMS(lap.totalMs)} (+${formatHMSMS(lap.diffMs)})`;
      el.appendChild(label);
      el.appendChild(time);
      lapsList.appendChild(el);
    });
  }

  const globalDisplay = document.getElementById('global-display');
  const swDisplay = document.getElementById('stopwatch-display');
  const swStartBtn = document.getElementById('sw-start');
  const swResetBtn = document.getElementById('sw-reset');

  const swPauseBtn = document.getElementById('sw-pause');
  const swLapBtn = document.getElementById('sw-lap');
  const lapsList = document.getElementById('laps-list');

  const counterReadout = document.getElementById('counter-readout');
  const counterButtons = document.querySelectorAll('[data-delta]');
  const counterResetBtn = document.getElementById('counter-reset');

  const tMin = document.getElementById('t-min');
  const tSec = document.getElementById('t-sec');

  const cdDisplay = document.getElementById('countdown-display');
  const cdStart = document.getElementById('cd-start');
  const cdStop = document.getElementById('cd-stop');
  const cdReset = document.getElementById('cd-reset');

  const changeNameBtn = document.getElementById('change-name');
  const greetingEl = document.getElementById('greeting');
  const modal = document.getElementById('welcome-modal');
  const nameInput = document.getElementById('name-input');
  const nameSave = document.getElementById('name-save');
  const nameSkip = document.getElementById('name-skip');

  function setName(name) {
    const clean = String(name || '').trim();
    if (!clean) {
      if (greetingEl) greetingEl.textContent = 'Hello!';
      localStorage.removeItem('timmer_name');
      return;
    }
    localStorage.setItem('timmer_name', clean);
    if (greetingEl) greetingEl.textContent = `Hello, ${clean}!`;
  }

  function showModal(prefill) {
    if (!modal) return;
    const dialog = modal.querySelector('.modal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (dialog) dialog.classList.add('open');
    if (nameInput) { nameInput.value = prefill || ''; setTimeout(() => nameInput.focus(), 50); }
  }
  function hideModal() { if (!modal) return; const dialog = modal.querySelector('.modal'); modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); if (dialog) dialog.classList.remove('open'); }

  (function loadNameModal() {
    try {
      const saved = localStorage.getItem('timmer_name');
      if (saved) { setName(saved); }
      else { showModal(''); }
    } catch (e) { /* ignore storage errors */ }
  })();

  if (nameSave) {
    nameSave.addEventListener('click', () => {
      const v = nameInput ? nameInput.value.trim() : '';
      if (v) setName(v);
      hideModal();
    });
  }
  if (nameSkip) { nameSkip.addEventListener('click', () => { hideModal(); }); }
  if (nameInput) { nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = nameInput.value.trim(); if (v) setName(v); hideModal(); } }); }
  if (changeNameBtn) { changeNameBtn.addEventListener('click', () => { const current = localStorage.getItem('timmer_name') || ''; showModal(current); }); }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { hideModal(); }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
      hideModal();
    }
  });

  function clampNumberInput(id) {
    const el = document.getElementById(id);
    if (!el) return;
    let v = Number(el.value) || 0;
    const min = (el.min !== '') ? Number(el.min) : -Infinity;
    const max = (el.max !== '') ? Number(el.max) : Infinity;
    if (v < min) v = min;
    if (v > max) v = max;
    el.value = String(v);
  }

  document.querySelectorAll('.spin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (!el) return;
      const step = 1;
      const cur = Number(el.value) || 0;
      if (btn.classList.contains('spin-up')) {
        el.value = String(cur + step);
      } else {
        el.value = String(cur - step);
      }
      clampNumberInput(targetId);
    });
  });

  function updateGlobalUI() {
    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; 
    const hh = pad2(hours);
    const mm = pad2(now.getMinutes());
    const ss = pad2(now.getSeconds());
    globalDisplay.textContent = `${hh}:${mm}:${ss} ${ampm}`;
    counterReadout.textContent = String(counterSeconds);
  }

  let swInterval = null;
  let swStartTime = 0;
  let swElapsed = 0; 
  let laps = [];
  let lastLapMs = 0;

  swStartBtn.addEventListener('click', () => {
    swStartBtn.disabled = true;
    swPauseBtn.disabled = false;
    swLapBtn.disabled = false;
    swResetBtn.disabled = false;
    swStartTime = performance.now();
    swInterval = setInterval(() => {
      const now = performance.now();
      const total = swElapsed + (now - swStartTime);
      swDisplay.textContent = formatHMSMS(total);
    }, 33);
  });

  swPauseBtn.addEventListener('click', () => {
    if (swInterval) {
      clearInterval(swInterval); swInterval = null;
      const now = performance.now();
      swElapsed = swElapsed + (now - swStartTime);
      swElapsed = swElapsed % 1000;
      updateGlobalUI();
      swStartBtn.disabled = false;
      swPauseBtn.disabled = true;
      swLapBtn.disabled = true;
    }
  });

  swLapBtn.addEventListener('click', () => {
    if (!swInterval) return;
    const now = performance.now();
    const total = swElapsed + (now - swStartTime);
    const diff = total - lastLapMs;
    lastLapMs = total;
    const lapIndex = laps.length + 1;
    const lap = { idx: lapIndex, totalMs: total, diffMs: diff };
    laps.unshift(lap);
    renderLaps();
  });

  swResetBtn.addEventListener('click', () => {
    if (swInterval) { clearInterval(swInterval); swInterval = null; }
    swElapsed = 0; swStartTime = 0; lastLapMs = 0; laps = [];
    swDisplay.textContent = '00:00:00.000';
    renderLaps();
    swStartBtn.disabled = false; swPauseBtn.disabled = true; swLapBtn.disabled = true;
  });

  counterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = Number(btn.dataset.delta) || 0;
      counterSeconds += delta;
      if (counterSeconds < 0) counterSeconds = 0;
      updateGlobalUI();
    });
  });
  if (counterResetBtn) counterResetBtn.addEventListener('click', () => { counterSeconds = 0; updateGlobalUI(); });

  function readInputSeconds() {
    const m = Number(tMin.value) || 0;
    const s = Number(tSec.value) || 0;
    return Math.max(0, Math.floor(m * 60 + s));
  }


  let cdRemaining = 0; // seconds
  let cdInterval = null;
  function updateCdUI() {
    const mm = Math.floor(cdRemaining / 60);
    const ss = cdRemaining % 60;
    cdDisplay.textContent = pad2(mm) + ":" + pad2(ss);
  }

  cdStart.addEventListener('click', () => {
    if (cdInterval) return;
    cdRemaining = readInputSeconds();
    if (cdRemaining <= 0) return;
    cdStart.disabled = true; cdStop.disabled = false;
    updateCdUI();
    cdInterval = setInterval(() => {
      cdRemaining = Math.max(0, cdRemaining - 1);
      updateCdUI();
      if (cdRemaining <= 0) {
        clearInterval(cdInterval); cdInterval = null; cdStart.disabled = false; cdStop.disabled = true;
      }
    }, 1000);
  });

  cdStop.addEventListener('click', () => {
    if (cdInterval) { clearInterval(cdInterval); cdInterval = null; cdStart.disabled = false; cdStop.disabled = true; }
  });

  cdReset.addEventListener('click', () => {
    if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
    cdRemaining = 0; updateCdUI(); cdStart.disabled = false; cdStop.disabled = true;
  });

  updateGlobalUI(); updateCdUI();
  setInterval(updateGlobalUI, 250);

})();
