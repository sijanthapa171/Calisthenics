(function () {
  const timeEl = document.getElementById('time');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const lapBtn = document.getElementById('lapBtn');
  const resetBtn = document.getElementById('resetBtn');
  const lapsList = document.getElementById('lapsList');

  const overlay = document.getElementById('overlay');
  const nameInput = document.getElementById('nameInput');
  const saveName = document.getElementById('saveName');
  const skipName = document.getElementById('skipName');
  const greeting = document.getElementById('greeting');
  const changeName = document.getElementById('changeName');

  let startAt = 0;
  let elapsed = 0;
  let running = false;
  let raf = null;
  let laps = [];

  const STATE_KEY = 'stopwatch_state_v1';
  let lastSaved = 0;

  const COUNTER_KEY = 'stopwatch_counter_v1';
  let counter = 0;

  const TIMER_KEY = 'stopwatch_timer_v1';
  let timerDuration = 0;
  let timerEndAt = 0;
  let timerRunning = false;
  let timerRaf = null;

  function format(ms) {
    const totalMs = Math.max(0, Math.floor(ms));
    const milliseconds = totalMs % 1000;
    const totalSeconds = Math.floor(totalMs / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    return (hours).toString().padStart(2, '0') + ':' +
      (minutes).toString().padStart(2, '0') + ':' +
      (seconds).toString().padStart(2, '0') + '.' +
      (milliseconds).toString().padStart(3, '0');
  }

  function getNow() { return Date.now(); }

  function currentElapsed() {
    return running ? (elapsed + Math.max(0, getNow() - startAt)) : elapsed;
  }

  function render() {
    const diff = currentElapsed();
    timeEl.textContent = format(diff);
  }

  function tick() {
    render();
    const now = getNow();
    if (now - lastSaved > 500) { saveState(); lastSaved = now; }
    raf = requestAnimationFrame(tick);
  }

  function timerNow() { return Date.now(); }

  function renderTimer() {
    const remaining = timerRunning ? Math.max(0, timerEndAt - timerNow()) : timerDuration;
    const s = Math.floor(remaining / 1000);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    const el = document.getElementById('timerDisplay');
    if (el) el.textContent = `${mm}:${ss}`;
    if (timerRunning && remaining <= 0) {
      stopTimer(true);
    }
  }

  function timerTick() {
    renderTimer();
    timerRaf = requestAnimationFrame(timerTick);
  }

  function start() {
    if (running) return;
    startAt = getNow();
    running = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    lapBtn.disabled = false;
    resetBtn.disabled = false;
    tick();
    saveState();
  }

  function pause() {
    if (!running) return;
    running = false;
    elapsed = currentElapsed();
    cancelAnimationFrame(raf);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    saveState();
  }

  function reset() {
    running = false;
    cancelAnimationFrame(raf);
    startAt = 0;
    elapsed = 0;
    laps = [];
    lapsList.innerHTML = '';
    timeEl.textContent = '00:00:00.000';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    lapBtn.disabled = true;
    resetBtn.disabled = true;
    saveState();
  }

  function saveCounter() { localStorage.setItem(COUNTER_KEY, String(counter)); }
  function loadCounter() { counter = Number(localStorage.getItem(COUNTER_KEY) || 0); const el = document.getElementById('counterValue'); if (el) el.textContent = String(counter); }
  function incCounter() { counter += 1; document.getElementById('counterValue').textContent = String(counter); saveCounter(); }
  function incCounterBy(n) { counter += n; document.getElementById('counterValue').textContent = String(counter); saveCounter(); }
  function decCounter() { counter -= 1; document.getElementById('counterValue').textContent = String(counter); saveCounter(); }
  function resetCounter() { counter = 0; document.getElementById('counterValue').textContent = '0'; saveCounter(); }

  function saveTimer() {
    try { const state = { timerDuration: timerDuration, timerEndAt: timerEndAt, timerRunning: timerRunning, savedAt: getNow() }; localStorage.setItem(TIMER_KEY, JSON.stringify(state)); } catch (e) { }
  }
  function loadTimer() {
    try {
      const raw = localStorage.getItem(TIMER_KEY); if (!raw) return;
      const s = JSON.parse(raw);
      timerDuration = s.timerDuration || 0;
      timerRunning = !!s.timerRunning;
      if (timerRunning && s.timerEndAt) {
        const savedAt = s.savedAt || getNow();
        const diff = getNow() - savedAt;
        timerEndAt = (s.timerEndAt || 0) + diff;
        if (timerEndAt < getNow()) {
          timerDuration = 0; timerRunning = false; timerEndAt = 0;
        }
      } else {
        timerEndAt = 0;
      }
      renderTimer();
    } catch (e) { console.warn('loadTimer', e); }
  }

  function startTimerFromInput() {
    const m = Number(document.getElementById('timerMinutes').value || 0);
    const s = Number(document.getElementById('timerSeconds').value || 0);
    const total = (Math.max(0, m) * 60 + Math.max(0, s)) * 1000;
    if (total <= 0) return;
    timerDuration = total;
    timerEndAt = getNow() + timerDuration;
    timerRunning = true;
    document.getElementById('timerStart').disabled = true;
    document.getElementById('timerPause').disabled = false;
    document.getElementById('timerReset').disabled = false;
    timerTick();
    saveTimer();
  }

  function pauseTimer() { if (!timerRunning) return; timerDuration = Math.max(0, timerEndAt - getNow()); timerRunning = false; cancelAnimationFrame(timerRaf); document.getElementById('timerStart').disabled = false; document.getElementById('timerPause').disabled = true; saveTimer(); }

  function stopTimer(triggerAlert) { timerRunning = false; cancelAnimationFrame(timerRaf); timerDuration = 0; timerEndAt = 0; renderTimer(); document.getElementById('timerStart').disabled = false; document.getElementById('timerPause').disabled = true; document.getElementById('timerReset').disabled = true; saveTimer(); if (triggerAlert) { try { navigator.vibrate && navigator.vibrate(200); } catch (e) { } alert('Timer finished'); } }

  function resetTimer() { timerRunning = false; cancelAnimationFrame(timerRaf); timerDuration = 0; timerEndAt = 0; renderTimer(); document.getElementById('timerStart').disabled = false; document.getElementById('timerPause').disabled = true; document.getElementById('timerReset').disabled = true; saveTimer(); }

  function lap() {
    const nowMs = currentElapsed();
    const lapTime = nowMs;
    const prev = laps.length ? laps[laps.length - 1].time : 0;
    const delta = lapTime - prev;
    const li = document.createElement('li');
    const idx = laps.length + 1;
    li.innerHTML = `<span>Lap ${idx}</span><span>${format(lapTime)} <small> (+${format(delta)})</small></span>`;
    lapsList.prepend(li);
    laps.push({ time: lapTime });
    saveState();
  }

  function saveState() {
    try {
      const state = {
        elapsed: elapsed,
        running: running,
        startAt: running ? startAt : null,
        laps: laps,
        name: localStorage.getItem('stopwatch_name') || null,
        savedAt: getNow()
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) { console.warn('saveState failed', e); }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      elapsed = s.elapsed || 0;
      running = !!s.running;
      if (running && s.startAt) {
        startAt = s.startAt + (getNow() - s.savedAt || 0);
        if (startAt > getNow()) startAt = getNow();
      } else {
        startAt = 0;
      }
      laps = Array.isArray(s.laps) ? s.laps : [];
      lapsList.innerHTML = '';
      for (let i = 0; i < laps.length; i++) {
        const li = document.createElement('li');
        const idx = i + 1;
        const t = laps[i].time || 0;
        const prev = i ? laps[i - 1].time : 0;
        li.innerHTML = `<span>Lap ${idx}</span><span>${format(t)} <small> (+${format(t - prev)})</small></span>`;
        lapsList.prepend(li);
      }
      return true;
    } catch (e) { console.warn('loadState failed', e); return false; }
  }

  function updateGreeting(name) {
    if (name) greeting.textContent = `Hello, ${name}!`;
    else greeting.textContent = 'Hello!';
  }

  function openModal() {
    overlay.style.display = 'flex';
    nameInput.focus();
  }

  function closeModal() {
    overlay.style.display = 'none';
  }

  saveName.addEventListener('click', () => {
    const val = nameInput.value.trim();
    if (val) {
      localStorage.setItem('stopwatch_name', val);
      updateGreeting(val);
      saveState();
    }
    closeModal();
  });

  skipName.addEventListener('click', () => {
    closeModal();
  });

  changeName.addEventListener('click', () => {
    nameInput.value = localStorage.getItem('stopwatch_name') || '';
    openModal();
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveName.click();
  });

  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', reset);
  lapBtn.addEventListener('click', lap);

  document.getElementById('incBtn').addEventListener('click', incCounter);
  document.getElementById('inc5Btn').addEventListener('click', () => incCounterBy(5));
  document.getElementById('inc50Btn').addEventListener('click', () => incCounterBy(50));
  document.getElementById('decBtn').addEventListener('click', decCounter);
  document.getElementById('resetCounter').addEventListener('click', resetCounter);

  document.getElementById('timerStart').addEventListener('click', startTimerFromInput);
  document.getElementById('timerPause').addEventListener('click', pauseTimer);
  document.getElementById('timerReset').addEventListener('click', resetTimer);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (running) pause(); else start();
    }
    if (e.key.toLowerCase() === 'l') {
      if (!lapBtn.disabled) lap();
    }
    if (e.key.toLowerCase() === 'r') {
      reset();
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
    }).catch(err => {
    });
  }

  const sysTimeCardEl = document.getElementById('sysTimeCard');
  function pad(n) { return String(n).padStart(2, '0'); }
  function updateSystemTime() {
    const d = new Date();
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hh = pad(hours);
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const text = `${hh}:${mm}:${ss} ${ampm}`;
    if (sysTimeCardEl) sysTimeCardEl.textContent = text;
  }
  updateSystemTime();
  setInterval(updateSystemTime, 1000);

  const THEME_KEY = 'stopwatch_theme_v1';
  const themeToggle = document.getElementById('themeToggle');

  function applyTheme(theme) {
    if (theme === 'white') {
      document.body.classList.add('theme-white');
      themeToggle.setAttribute('aria-pressed', 'true');
      themeToggle.textContent = 'White';
    } else {
      document.body.classList.remove('theme-white');
      themeToggle.setAttribute('aria-pressed', 'false');
      themeToggle.textContent = 'Black';
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  themeToggle.addEventListener('click', () => {
    const cur = localStorage.getItem(THEME_KEY) === 'white' ? 'black' : 'white';
    applyTheme(cur);
  });

  (function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'black';
    applyTheme(saved);
  })();

  (function init() {
    const savedName = localStorage.getItem('stopwatch_name');
    if (savedName) updateGreeting(savedName);

    const loaded = loadState();
    if (loaded) {
      if (running) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        lapBtn.disabled = false;
        resetBtn.disabled = false;
        tick();
      } else {
        render();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        lapBtn.disabled = laps.length === 0;
        resetBtn.disabled = (elapsed === 0 && laps.length === 0);
      }
      closeModal();
    } else {
      openModal();
    }

    loadCounter();
    loadTimer();
    if (timerRunning) { document.getElementById('timerStart').disabled = true; document.getElementById('timerPause').disabled = false; document.getElementById('timerReset').disabled = false; timerTick(); }
    else { document.getElementById('timerStart').disabled = false; document.getElementById('timerPause').disabled = true; document.getElementById('timerReset').disabled = (timerDuration === 0); }
  })();

})();
