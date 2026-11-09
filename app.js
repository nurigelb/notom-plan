// NoTom — Kullanıcı Dostu Pratik Asistanı, Zamanlayıcı, TSM Koma Akortçusu, Metronom & Yan Yana Video Karşılaştırıcı

const STORAGE_KEY = "notom_plan_state_v2";

const TSM_TONES = [
  { id: "g3", name: "Sol Teli (Yegâh/Kaba Rast)", note: "G3", hz: 196.0, group: "string" },
  { id: "d4", name: "Re Teli (Neva)", note: "D4", hz: 293.66, group: "string" },
  { id: "a4", name: "La Teli (Dügâh - 440Hz)", note: "A4", hz: 440.0, group: "string" },
  { id: "e5", name: "Mi Teli (Hüseyni)", note: "E5", hz: 659.25, group: "string" },
  { id: "segah-rast", name: "Rast Segâhı (~1 Koma Bemol)", note: "Si b1 (Segâh)", hz: 486.6, group: "koma" },
  { id: "segah-ussak", name: "Uşşak Segâhı (~2.5 Koma Bemol)", note: "Si b2.5 (Uşşak)", hz: 477.5, group: "koma" },
  { id: "evic", name: "Eviç Perdesi (Fa ~4 Koma Diyez)", note: "Fa #4 (Eviç)", hz: 366.3, group: "koma" },
  { id: "kurdi", name: "Kürdi Perdesi (Si Bemol)", note: "Bb4 (Kürdi)", hz: 466.16, group: "koma" }
];

const TENNIS_DRILL_TARGETS = [
  { id: "sektirme50", label: "Raketle 50 Top Sektirme (Hafta 1–2)", target: 50 },
  { id: "fh20", label: "Duvara 20 Ardışık Forehand (Hafta 3–4 Sınav)", target: 20 },
  { id: "bh15", label: "Duvara 15 Ardışık Backhand (Hafta 5–6 Sınav)", target: 15 },
  { id: "servis8", label: "10 Servis Fırlatmadan 8 İsabet (Hafta 7–8 Sınav)", target: 8 },
  { id: "vole30", label: "Duvara 30 Ardışık Vole (Hafta 9–10 Sınav)", target: 30 }
];

const defaultState = {
  activeModules: {
    tennis: 0,
    violin: 0,
    ai: 0
  },
  passedModules: {
    "tennis-m1": false,
    "tennis-m2": false,
    "tennis-m3": false,
    "tennis-m4": false,
    "tennis-m5": false,
    "tennis-m6": false,
    "violin-m1": false,
    "violin-m2": false,
    "violin-m3": false,
    "violin-m4": false,
    "violin-m5": false,
    "violin-m6": false,
    "ai-m1": false,
    "ai-m2": false,
    "ai-m3": false,
    "ai-m4": false,
    "ai-m5": false,
    "ai-m6": false
  },
  moduleRepeats: {},
  completedSessionsByDate: {},
  checklist: {},
  weatherMode: "home", // "home" veya "park"
  sundayLogs: [],
  // Yeni kullanıcı dostu sayaçlar:
  tennisVideoNumber: 1, // 1..36 (Feel Tennis sınıfı)
  violinLessonStep: 1, // AKADEMA / TSM ders adımı
  aiCourseStep: 1,
  missingSemesterDone: false,
  githubProjects: {}, // { "ai-m1": "https://github.com/..." }
  drillCounts: {
    sektirme50: 0,
    fh20: 0,
    bh15: 0,
    servis8: 0,
    vole30: 0
  },
  selectedDrillId: "fh20"
};

let state = loadState();
let currentTab = "today"; // "today" | "modules" | "studio" | "checklist" | "resources"
let moduleCourseFilter = "all"; // "all" | "tennis" | "violin" | "ai"
let selectedDayIndex = new Date().getDay();
let deferredInstallPrompt = null;

// Timer & Audio State
let activeTimerSession = null;
let activeTimerStepIndex = 0;
let timerRemainingSeconds = 0;
let timerTotalStepSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;
let sessionRepCount = 0;

// Metronome & Audio Synth State
let audioCtx = null;
let metronomeInterval = null;
let isMetronomeOn = false;
let metronomeBpm = 60;
let metronomeBeatsPerBar = 4; // 4 (Düz), 3 (Semai), 5 (Türk Aksağı), 9 (Aksak)
let currentBeatIndex = 0;

// Continuous Drone Tone State
let activeDroneId = null;
let droneOsc1 = null;
let droneOsc2 = null;
let droneGain = null;

// Live Microphone Tuner State
let isTunerRunning = false;
let tunerStream = null;
let tunerAnalyser = null;
let tunerRafId = null;

// Side-by-Side Video URLs
let compareVideoLeftUrl = null;
let compareVideoRightUrl = null;
let comparePlaybackRate = 1.0;

let wakeLockSentinel = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("notom_plan_state_v1");
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      activeModules: { ...defaultState.activeModules, ...(parsed.activeModules || {}) },
      passedModules: { ...defaultState.passedModules, ...(parsed.passedModules || {}) },
      drillCounts: { ...defaultState.drillCounts, ...(parsed.drillCounts || {}) },
      githubProjects: { ...defaultState.githubProjects, ...(parsed.githubProjects || {}) }
    };
  } catch (e) {
    return structuredClone(defaultState);
  }
}

function updateSyncStatusBadge(statusText, isOnlineSync = true) {
  const el = document.getElementById("sync-status-text");
  if (!el) return;
  el.textContent = statusText;
  el.style.color = isOnlineSync ? "#34d399" : "var(--text-muted)";
}

function saveState() {
  try {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    pushStateToBackend();
  } catch (e) {
    console.error("State kaydedilemedi:", e);
  }
}

async function pushStateToBackend() {
  try {
    const res = await fetch("/api/state?profile=nuri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state,
        updatedAt: state.updatedAt || new Date().toISOString()
      })
    });
    if (res.ok) {
      updateSyncStatusBadge("☁️ Sunucu ile Senkronize", true);
    }
  } catch (e) {
    updateSyncStatusBadge("📱 Cihazda Kayıtlı (Çevrimdışı)", false);
  }
}

window.syncWithBackendNow = async function (showFeedback = false) {
  try {
    const res = await fetch("/api/state?profile=nuri", { cache: "no-store" });
    if (!res.ok) throw new Error("Sunucuya ulaşılamadı");
    const data = await res.json();
    if (data && data.ok && data.state) {
      const remoteTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
      const localTime = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
      if (remoteTime > localTime) {
        state = {
          ...structuredClone(defaultState),
          ...data.state,
          activeModules: { ...defaultState.activeModules, ...(data.state.activeModules || {}) },
          passedModules: { ...defaultState.passedModules, ...(data.state.passedModules || {}) },
          drillCounts: { ...defaultState.drillCounts, ...(data.state.drillCounts || {}) },
          githubProjects: { ...defaultState.githubProjects, ...(data.state.githubProjects || {}) }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderApp();
      } else if (localTime > remoteTime) {
        await pushStateToBackend();
      }
      updateSyncStatusBadge("☁️ Sunucu ile Senkronize", true);
      if (showFeedback) showToast("☁️ Sunucu ile senkronize edildi!");
    } else {
      await pushStateToBackend();
      if (showFeedback) showToast("☁️ Mevcut ilerlemen sunucuya kaydedildi!");
    }
  } catch (e) {
    updateSyncStatusBadge("📱 Cihazda Kayıtlı (Çevrimdışı)", false);
    if (showFeedback) showToast("📱 Çevrimdışı mod: Veriler telefonunda güvende.");
  }
};

function showToast(msg) {
  const el = document.getElementById("toast-msg");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2400);
}

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDateKeyForDayIndex(targetDayIndex) {
  const now = new Date();
  const currentDay = now.getDay();
  const normalize = (d) => (d === 0 ? 7 : d);
  const diff = normalize(targetDayIndex) - normalize(currentDay);
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSessionCompleted(dayIndex, sessionId) {
  const dateKey = getDateKeyForDayIndex(dayIndex);
  return Boolean(state.completedSessionsByDate[dateKey]?.[sessionId]);
}

window.toggleSessionCompleted = function (dayIndex, sessionId) {
  const dateKey = getDateKeyForDayIndex(dayIndex);
  if (!state.completedSessionsByDate[dateKey]) {
    state.completedSessionsByDate[dateKey] = {};
  }
  const newVal = !state.completedSessionsByDate[dateKey][sessionId];
  state.completedSessionsByDate[dateKey][sessionId] = newVal;
  saveState();
  if (newVal) {
    playBeep(880, 0.12);
    showToast("✓ Seans tamamlandı olarak işaretlendi!");
  }
  renderApp();
};

function getWeeklyCompletionStats() {
  let total = 0;
  let done = 0;
  PLAN_DATA.weeklySchedule.forEach((day) => {
    day.sessions.forEach((s) => {
      total++;
      if (isSessionCompleted(day.dayIndex, s.id)) {
        done++;
      }
    });
  });
  return { done, total };
}

function renderTopStreakStrip() {
  const strip = document.getElementById("top-streak-strip");
  if (!strip) return;
  const weekStats = getWeeklyCompletionStats();
  const tMod = (state.activeModules.tennis || 0) + 1;
  const vMod = (state.activeModules.violin || 0) + 1;
  const aMod = (state.activeModules.ai || 0) + 1;

  strip.innerHTML = `
    <div class="stat-mini-card" onclick="switchTab('today')" style="cursor:pointer;">
      <span class="stat-label">Bu Hafta</span>
      <span class="stat-val" style="color:var(--success-color);">${weekStats.done} / ${weekStats.total} Ders</span>
    </div>
    <div class="stat-mini-card" onclick="switchTab('modules')" style="cursor:pointer;">
      <span class="stat-label">Aktif Modül</span>
      <span class="stat-val">T:${tMod} · K:${vMod} · AI:${aMod}</span>
    </div>
    <div class="stat-mini-card" onclick="switchTab('studio')" style="cursor:pointer;">
      <span class="stat-label">Tenis Video</span>
      <span class="stat-val" style="color:var(--tennis-color);">#${state.tennisVideoNumber} / 36</span>
    </div>
  `;
}

// Resolve sub-steps dynamically based on active module
function getSessionSubSteps(session) {
  const course = PLAN_DATA.courses[session.courseId];
  const modIndex = state.activeModules[session.courseId] || 0;
  const activeMod = course.modules[modIndex] || course.modules[0];

  if (session.useModuleSteps && activeMod.subSteps) {
    return activeMod.subSteps;
  }
  return session.subSteps || [{ label: session.focusTitle, minutes: session.durationMinutes }];
}

// Render Day Selector Bar (Visible on "Bugün" tab)
function renderDaySelector() {
  const bar = document.getElementById("day-selector-bar");
  if (currentTab !== "today") {
    bar.style.display = "none";
    return;
  }
  bar.style.display = "grid";
  const realToday = new Date().getDay();

  bar.innerHTML = PLAN_DATA.weeklySchedule
    .map((day) => {
      const isActive = day.dayIndex === selectedDayIndex;
      const isToday = day.dayIndex === realToday;
      const allDone =
        day.sessions.length > 0 &&
        day.sessions.every((s) => isSessionCompleted(day.dayIndex, s.id));
      const dotsHtml = day.sessions
        .map((s) => `<span class="dot ${s.courseId}"></span>`)
        .join("");

      return `
        <button class="day-pill ${isActive ? "active" : ""} ${isToday ? "is-today" : ""} ${allDone ? "day-complete" : ""}"
                onclick="selectDay(${day.dayIndex})">
          <span class="day-short">${day.shortName}</span>
          <div class="day-dots">${dotsHtml}</div>
        </button>
      `;
    })
    .join("");
}

window.selectDay = function (dayIdx) {
  selectedDayIndex = dayIdx;
  renderApp();
};

window.setWeatherMode = function (mode) {
  state.weatherMode = mode;
  saveState();
  showToast(mode === "park" ? "🎾 Park / Duvar modu seçildi" : "🏠 Evde Gölge modu seçildi");
  renderApp();
};

window.adjustCourseCounter = function (courseId, delta) {
  if (courseId === "tennis") {
    state.tennisVideoNumber = Math.min(36, Math.max(1, (state.tennisVideoNumber || 1) + delta));
    showToast(`🎾 Sıradaki Feel Tennis Videosu: #${state.tennisVideoNumber} / 36`);
  } else if (courseId === "violin") {
    state.violinLessonStep = Math.max(1, (state.violinLessonStep || 1) + delta);
    showToast(`🎻 Keman Ders Adımı: #${state.violinLessonStep}`);
  } else if (courseId === "ai") {
    state.aiCourseStep = Math.max(1, (state.aiCourseStep || 1) + delta);
    showToast(`🤖 AI Ders Adımı: #${state.aiCourseStep}`);
  }
  saveState();
  renderApp();
};

// Render "Bugün Ne Var?" View
function renderTodayView() {
  const dayObj =
    PLAN_DATA.weeklySchedule.find((d) => d.dayIndex === selectedDayIndex) ||
    PLAN_DATA.weeklySchedule[0];

  const dateKey = getDateKeyForDayIndex(selectedDayIndex);
  const completedCount = dayObj.sessions.filter((s) =>
    isSessionCompleted(selectedDayIndex, s.id)
  ).length;
  const totalMinutes = dayObj.sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const showWeatherBar = dayObj.sessions.some((s) => s.hasWeatherToggle);

  let html = `
    <div class="today-banner">
      <div class="today-banner-info">
        <h2>${dayObj.dayName} Programı</h2>
        <p>${dayObj.sessions.length} seans · Toplam ${totalMinutes} dk (${dateKey})</p>
      </div>
      <div class="progress-ring-box">
        <span class="big-num">${completedCount} / ${dayObj.sessions.length}</span>
        <span class="sub-lbl">Tamamlandı</span>
      </div>
    </div>
  `;

  if (showWeatherBar) {
    html += `
      <div class="weather-bar">
        <span><strong>Kural 3:</strong> Hava durumu nasıl?</span>
        <div class="weather-toggle-group">
          <button class="weather-btn ${state.weatherMode === "home" ? "active" : ""}"
                  onclick="setWeatherMode('home')">🏠 Evde Gölge</button>
          <button class="weather-btn ${state.weatherMode === "park" ? "active" : ""}"
                  onclick="setWeatherMode('park')">🎾 Park / Duvar</button>
        </div>
      </div>
    `;
  }

  dayObj.sessions.forEach((session) => {
    const course = PLAN_DATA.courses[session.courseId];
    const modIndex = state.activeModules[session.courseId] || 0;
    const activeMod = course.modules[modIndex] || course.modules[0];
    const isDone = isSessionCompleted(selectedDayIndex, session.id);
    const subSteps = getSessionSubSteps(session);

    let trackerHtml = "";
    let moduleContextRows = "";

    if (session.courseId === "tennis") {
      const drillText =
        session.hasWeatherToggle && state.weatherMode === "park"
          ? activeMod.parkWallSession
          : activeMod.homeSession;
      const modeLabel =
        session.hasWeatherToggle && state.weatherMode === "park"
          ? "Park/Duvar:"
          : "Ev Seansı:";

      trackerHtml = `
        <div class="lesson-tracker-bar">
          <div class="lesson-tracker-info">
            <span>Feel Tennis Sınıfı (Her seansta maks. 1 yeni video)</span>
            <strong>Sıradaki Video: #${state.tennisVideoNumber} / 36</strong>
          </div>
          <div class="lesson-tracker-controls">
            <button class="stepper-btn" onclick="adjustCourseCounter('tennis', -1)">−</button>
            <button class="stepper-btn" onclick="adjustCourseCounter('tennis', 1)">+1 İzledim</button>
          </div>
        </div>
      `;

      moduleContextRows = `
        <div class="module-detail-row">
          <span class="module-detail-label">${modeLabel}</span>
          <span>${drillText}</span>
        </div>
        <div class="module-detail-row">
          <span class="module-detail-label">Geçme Kriteri:</span>
          <span>${activeMod.passCriteria}</span>
        </div>
      `;
    } else if (session.courseId === "violin") {
      trackerHtml = `
        <div class="lesson-tracker-bar" style="background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.25);">
          <div class="lesson-tracker-info">
            <span>${activeMod.level} · Ders & Etüt Takibi</span>
            <strong>Sıradaki Ders Adımı: #${state.violinLessonStep}</strong>
          </div>
          <div class="lesson-tracker-controls">
            <button class="stepper-btn" onclick="adjustCourseCounter('violin', -1)">−</button>
            <button class="stepper-btn" onclick="adjustCourseCounter('violin', 1)">+1 Ders</button>
            <button class="stepper-btn" style="color:var(--violin-color);border-color:var(--violin-border);" onclick="switchTab('studio')">🎻 Akort</button>
          </div>
        </div>
      `;

      moduleContextRows = `
        <div class="module-detail-row">
          <span class="module-detail-label">Günlük Plan:</span>
          <span>${activeMod.dailyRoutine}</span>
        </div>
        <div class="module-detail-row">
          <span class="module-detail-label">Geçme Kriteri:</span>
          <span>${activeMod.passCriteria}</span>
        </div>
      `;
    } else if (session.courseId === "ai") {
      trackerHtml = `
        <div class="lesson-tracker-bar">
          <div class="lesson-tracker-info">
            <span>Sertifikalı Kurs & Ünite Takibi</span>
            <strong>Sıradaki Ünite / Ders: #${state.aiCourseStep}</strong>
          </div>
          <div class="lesson-tracker-controls">
            <button class="stepper-btn" onclick="adjustCourseCounter('ai', -1)">−</button>
            <button class="stepper-btn" onclick="adjustCourseCounter('ai', 1)">+1 Ünite</button>
          </div>
        </div>
      `;

      moduleContextRows = `
        <div class="module-detail-row">
          <span class="module-detail-label">Sıradaki Ders:</span>
          <span>${activeMod.lessons}</span>
        </div>
        <div class="module-detail-row">
          <span class="module-detail-label">Ay Sonu Proje:</span>
          <span>${activeMod.passCriteria}</span>
        </div>
      `;
    }

    const stepsHtml = subSteps
      .map(
        (st) => `
        <li>
          <span>• ${st.label}</span>
          <span class="step-min">${st.minutes} dk</span>
        </li>
      `
      )
      .join("");

    const quickLinksHtml = course.links
      .slice(0, 3)
      .map(
        (lnk) => `
        <a href="${lnk.url}" target="_blank" rel="noopener" class="quick-link">
          🔗 ${lnk.tag}: ${lnk.title.split("–")[0].trim()}
        </a>
      `
      )
      .join("");

    html += `
      <article class="session-card course-${session.courseId} ${isDone ? "completed" : ""}">
        <div class="session-top">
          <div>
            <span class="course-chip ${session.courseId}">
              ${course.title.replace(/^Kurs \d — /, "")}
            </span>
            <h3 class="session-title">${session.focusTitle}</h3>
            <p class="session-module-tag">
              Aktif Modül (${activeMod.period}): <strong>${activeMod.title}</strong>
            </p>
          </div>
          <span class="duration-badge">⏱ ${session.durationMinutes} dk</span>
        </div>

        ${trackerHtml}

        <div class="module-detail-box">
          ${moduleContextRows}
        </div>

        <ul class="substeps-list">
          ${stepsHtml}
        </ul>

        <div class="quick-links">
          ${quickLinksHtml}
        </div>

        <div class="session-actions">
          <button class="btn-primary" onclick="openTimerForSession('${session.id}', ${selectedDayIndex})">
            ▶ Seansı Başlat (${session.durationMinutes} dk)
          </button>
          <button class="btn-check ${isDone ? "done" : ""}"
                  onclick="toggleSessionCompleted(${selectedDayIndex}, '${session.id}')">
            ${isDone ? "✓ Yapıldı" : "İşaretle"}
          </button>
        </div>
      </article>
    `;
  });

  if (selectedDayIndex === 0) {
    html += `
      <div class="course-section-card" style="border-color:rgba(245,158,11,0.4);">
        <h3 style="font-size:0.96rem;font-weight:800;">🎥 Pazar Video Karşılaştırma Aracı</h3>
        <p style="font-size:0.8rem;color:var(--text-muted);">
          Kural 2: Çektiğin 5 dakikalık tenis gölge vuruşu ve keman videolarını geçen haftanın videosuyla yan yana ağır çekimde izlemek için <strong>Pazar & Video</strong> sekmesini aç.
        </p>
        <button class="btn-primary" onclick="switchTab('checklist')">
          🎥 Yan Yana Video Karşılaştırıcıyı Aç
        </button>
      </div>
    `;
  }

  return html;
}

// Render "Modüller & Sınav Kilidi (Kural 1)" View
window.setModuleFilter = function (filter) {
  moduleCourseFilter = filter;
  renderApp();
};

function isModuleUnlocked(courseKey, idx) {
  if (idx === 0) return true;
  const course = PLAN_DATA.courses[courseKey];
  const prevMod = course.modules[idx - 1];
  return Boolean(state.passedModules[prevMod.id]);
}

function renderModulesView() {
  const filterBar = `
    <div class="course-filter-pills">
      <button class="filter-pill ${moduleCourseFilter === "all" ? "active" : ""}" onclick="setModuleFilter('all')">Tümü (3)</button>
      <button class="filter-pill ${moduleCourseFilter === "tennis" ? "active" : ""}" onclick="setModuleFilter('tennis')">🎾 Tenis</button>
      <button class="filter-pill ${moduleCourseFilter === "violin" ? "active" : ""}" onclick="setModuleFilter('violin')">🎻 Keman</button>
      <button class="filter-pill ${moduleCourseFilter === "ai" ? "active" : ""}" onclick="setModuleFilter('ai')">🤖 AI</button>
    </div>
  `;

  const courseKeys =
    moduleCourseFilter === "all" ? ["tennis", "violin", "ai"] : [moduleCourseFilter];

  const sectionsHtml = courseKeys
    .map((key) => {
      const course = PLAN_DATA.courses[key];
      const activeIdx = state.activeModules[key] || 0;

      let prereqBox = "";
      if (key === "ai") {
        prereqBox = `
          <label class="checklist-item ${state.missingSemesterDone ? "checked" : ""}" style="margin-bottom:4px;">
            <input type="checkbox" ${state.missingSemesterDone ? "checked" : ""}
                   onchange="toggleMissingSemester()" />
            <span><strong>Önkoşul (Opsiyonel 2 Hafta):</strong> MIT "The Missing Semester" (Terminal, Git, Editör) tamamlandı</span>
          </label>
        `;
      }

      const modulesHtml = course.modules
        .map((mod, idx) => {
          const isPassed = Boolean(state.passedModules[mod.id]);
          const isActive = idx === activeIdx;
          const unlocked = isModuleUnlocked(key, idx);
          const repeats = state.moduleRepeats[mod.id] || 0;

          let statusPill = `<span class="module-status-pill locked">🔒 Kilitli (Önceki Sınav)</span>`;
          if (isPassed) {
            statusPill = `<span class="module-status-pill passed">✓ Sınav Geçildi</span>`;
          } else if (isActive) {
            statusPill = `<span class="module-status-pill active">● Aktif Modül</span>`;
          } else if (unlocked) {
            statusPill = `<span class="module-status-pill active">Açık</span>`;
          }

          let detailLine = "";
          if (key === "tennis") {
            detailLine = `<p style="font-size:0.8rem;color:var(--text-muted)"><strong>Ev:</strong> ${mod.homeSession}<br><strong>Park/Duvar:</strong> ${mod.parkWallSession}</p>`;
          } else if (key === "violin") {
            detailLine = `<p style="font-size:0.8rem;color:var(--text-muted)"><strong>${mod.level}:</strong> ${mod.dailyRoutine}</p>`;
          } else {
            const repoUrl = state.githubProjects[mod.id] || "";
            detailLine = `
              <p style="font-size:0.8rem;color:var(--text-muted)"><strong>Ders:</strong> ${mod.lessons}</p>
              <div style="display:flex;gap:6px;margin-top:4px;">
                <input type="url" placeholder="GitHub Proje Linki (https://github.com/...)"
                       value="${escapeHtml(repoUrl)}"
                       onchange="saveGithubRepo('${mod.id}', this.value)"
                       style="flex:1;background:var(--bg-main);border:1px solid var(--border-subtle);border-radius:8px;padding:6px 9px;color:var(--text-main);font-size:0.76rem;" />
                ${
                  repoUrl
                    ? `<a href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener" class="btn-sm" style="text-decoration:none;">Aç ↗</a>`
                    : ""
                }
              </div>
            `;
          }

          return `
            <div class="module-item ${isActive ? "active-module" : ""} ${isPassed ? "passed-module" : ""} ${!unlocked ? "locked-module" : ""}">
              <div class="module-header">
                <span class="module-period">${mod.period} ${repeats > 0 ? `· (${repeats} hf tekrar)` : ""}</span>
                ${statusPill}
              </div>
              <div style="font-weight:800;font-size:0.93rem;">${mod.title}</div>
              ${detailLine}
              <div class="exam-box">
                <strong>🎓 Geçme Kriteri (Sınav — Kural 1)</strong>
                ${mod.passCriteria}
              </div>
              <div class="module-btn-row">
                <button class="btn-sm pass-btn" ${!unlocked && !isPassed ? "disabled" : ""}
                        onclick="openExamModal('${key}', ${idx}, '${mod.id}')">
                  ${isPassed ? "✓ Sınav Geçildi (Detay)" : "🎓 Sınavı Değerlendir"}
                </button>
                ${
                  !isPassed && unlocked
                    ? `<button class="btn-sm repeat-btn" onclick="repeatModuleWeek('${mod.id}')">
                        🔁 +1 Hafta Tekrarla
                      </button>`
                    : ""
                }
                ${
                  !isActive && unlocked
                    ? `<button class="btn-sm" onclick="setActiveModule('${key}', ${idx})">
                        Aktif Modül Yap
                      </button>`
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <section class="course-section-card">
          <div>
            <span class="course-chip ${key}">${course.badge}</span>
            <h2 style="font-size:1.06rem;font-weight:800;">${course.title}</h2>
            <p style="font-size:0.79rem;color:var(--text-muted);margin-top:4px;">${course.sessionTemplateNote}</p>
          </div>
          ${prereqBox}
          <div class="module-stepper">
            ${modulesHtml}
          </div>
        </section>
      `;
    })
    .join("");

  return filterBar + sectionsHtml;
}

window.toggleMissingSemester = function () {
  state.missingSemesterDone = !state.missingSemesterDone;
  saveState();
  renderApp();
};

window.saveGithubRepo = function (modId, url) {
  state.githubProjects[modId] = url.trim();
  saveState();
  showToast("💾 GitHub proje linki kaydedildi!");
  renderApp();
};

window.setActiveModule = function (courseKey, idx) {
  if (!isModuleUnlocked(courseKey, idx)) {
    showToast("🔒 Kural 1: Önce bir önceki modülün geçme kriterini tamamlamalısın!");
    return;
  }
  state.activeModules[courseKey] = idx;
  saveState();
  showToast("Aktif modül güncellendi!");
  renderApp();
};

// Exam Verification Modal (Rule #1 Gatekeeper)
window.openExamModal = function (courseKey, idx, modId) {
  const course = PLAN_DATA.courses[courseKey];
  const mod = course.modules[idx];
  const isPassed = Boolean(state.passedModules[modId]);
  const repeats = state.moduleRepeats[modId] || 0;

  const modal = document.getElementById("exam-modal");
  const sheet = document.getElementById("exam-sheet-content");
  modal.classList.add("open");

  sheet.innerHTML = `
    <div class="sheet-header">
      <div>
        <span class="course-chip ${courseKey}">${course.title}</span>
        <div style="font-size:1rem;font-weight:800;">${mod.period}: ${mod.title}</div>
      </div>
      <button class="icon-btn" onclick="closeExamModal()">✕ Kapat</button>
    </div>

    <div class="exam-box" style="padding:14px;font-size:0.9rem;">
      <strong>🎓 Modül Sonu Sınavı (Geçme Kriteri)</strong>
      <div style="margin-top:6px;font-weight:700;color:var(--text-main);">${mod.passCriteria}</div>
    </div>

    <p style="font-size:0.82rem;color:var(--text-muted);">
      <strong>Kural 1:</strong> Geçme kriteri olmadan bir sonraki modüle geçme. Geçemezsen bu modülü 1 hafta daha tekrarla.
      ${repeats > 0 ? `<br><span style="color:#fbbf24;">Şu ana kadar bu modülü ${repeats} hafta tekrarladın.</span>` : ""}
    </p>

    <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
      <button class="btn-primary" style="background:#10b981;color:#052e16;"
              onclick="confirmPassExam('${courseKey}', ${idx}, '${modId}', true)">
        🎉 Kriteri Sağladım — Modülü Geç & Sonrakini Aç!
      </button>
      <button class="btn-check" style="justify-content:center;border-color:rgba(245,158,11,0.45);color:#fbbf24;"
              onclick="repeatModuleFromExam('${modId}')">
        🔁 Henüz Geçemedim — +1 Hafta Daha Tekrarla
      </button>
      ${
        isPassed
          ? `<button class="btn-sm" onclick="confirmPassExam('${courseKey}', ${idx}, '${modId}', false)">
              Sınav Geçişini Geri Al
            </button>`
          : ""
      }
    </div>
  `;
};

window.closeExamModal = function () {
  document.getElementById("exam-modal").classList.remove("open");
};

window.confirmPassExam = function (courseKey, idx, modId, passVal) {
  state.passedModules[modId] = passVal;
  const course = PLAN_DATA.courses[courseKey];
  if (passVal && idx === state.activeModules[courseKey] && idx + 1 < course.modules.length) {
    state.activeModules[courseKey] = idx + 1;
  }
  saveState();
  closeExamModal();
  if (passVal) {
    playBeep(1046.5, 0.3);
    showToast("🎉 Tebrikler! Sınavı geçtin ve yeni modülün kilidi açıldı.");
  } else {
    showToast("Sınav durumu güncellendi.");
  }
  renderApp();
};

window.repeatModuleFromExam = function (modId) {
  state.moduleRepeats[modId] = (state.moduleRepeats[modId] || 0) + 1;
  saveState();
  closeExamModal();
  showToast("🔁 Kural 1: Modül +1 hafta tekrara alındı. Pes etmek yok!");
  renderApp();
};

window.repeatModuleWeek = function (modId) {
  state.moduleRepeats[modId] = (state.moduleRepeats[modId] || 0) + 1;
  saveState();
  showToast("🔁 +1 hafta tekrar eklendi.");
  renderApp();
};

// ============================================================================
// 🎻 STÜDYO & KOMA SEKME GÖRÜNÜMÜ (Metronom, TSM Koma Referans Sesleri, Mikrofonlu Akortçu, Tenis Sayacı)
// ============================================================================
function renderStudioView() {
  const stringTonesHtml = TSM_TONES.filter((t) => t.group === "string")
    .map(
      (t) => `
      <button class="tone-btn ${activeDroneId === t.id ? "playing" : ""}"
              onclick="toggleDroneTone('${t.id}', ${t.hz})">
        <div>
          <div style="font-weight:800;font-size:0.84rem;">${t.name}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);">${t.note} · ${t.hz} Hz</div>
        </div>
        <span>${activeDroneId === t.id ? "🔊" : "▶"}</span>
      </button>
    `
    )
    .join("");

  const komaTonesHtml = TSM_TONES.filter((t) => t.group === "koma")
    .map(
      (t) => `
      <button class="tone-btn ${activeDroneId === t.id ? "playing" : ""}"
              onclick="toggleDroneTone('${t.id}', ${t.hz})">
        <div>
          <div style="font-weight:800;font-size:0.84rem;">${t.name}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);">${t.note} · ${t.hz} Hz</div>
        </div>
        <span>${activeDroneId === t.id ? "🔊" : "▶"}</span>
      </button>
    `
    )
    .join("");

  const beatDots = Array.from({ length: metronomeBeatsPerBar })
    .map(
      (_, i) =>
        `<span id="studio-beat-dot-${i}" class="beat-dot ${i === 0 ? "accent-beat" : ""}"></span>`
    )
    .join("");

  const activeDrill =
    TENNIS_DRILL_TARGETS.find((d) => d.id === state.selectedDrillId) ||
    TENNIS_DRILL_TARGETS[0];
  const currentDrillVal = state.drillCounts[activeDrill.id] || 0;

  return `
    <!-- 1. Görsel & Sesli Keman Metronomu -->
    <section class="course-section-card">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <span class="course-chip violin">Keman & Ritim</span>
          <h2 style="font-size:1.05rem;font-weight:800;">⏱ Metronom (${metronomeBpm} BPM)</h2>
        </div>
        <button class="btn-primary" style="padding:9px 14px;background:${isMetronomeOn ? "#f59e0b" : "var(--text-main)"};"
                onclick="toggleMetronome()">
          ${isMetronomeOn ? "⏹ Durdur" : "▶ Başlat"}
        </button>
      </div>

      <div class="beat-dots-row">${beatDots}</div>

      <input type="range" min="40" max="140" value="${metronomeBpm}"
             oninput="changeMetronomeBpm(this.value)"
             style="width:100%;accent-color:var(--violin-color);" />

      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:space-between;">
        <button class="btn-sm" onclick="changeMetronomeBpm(60)">60 BPM (Düzey I Sınav)</button>
        <button class="btn-sm" onclick="changeMetronomeBpm(72)">72 BPM</button>
        <button class="btn-sm" onclick="changeMetronomeBpm(88)">88 BPM</button>
        <button class="btn-sm" onclick="changeMetronomeBpm(100)">100 BPM</button>
      </div>

      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <span style="font-size:0.76rem;color:var(--text-muted);font-weight:700;">Usul / Ölçü:</span>
        <button class="btn-sm ${metronomeBeatsPerBar === 4 ? "pass-btn" : ""}" onclick="setMetronomeMeter(4)">4/4 (Sofyan)</button>
        <button class="btn-sm ${metronomeBeatsPerBar === 3 ? "pass-btn" : ""}" onclick="setMetronomeMeter(3)">3/4 (Semai)</button>
        <button class="btn-sm ${metronomeBeatsPerBar === 5 ? "pass-btn" : ""}" onclick="setMetronomeMeter(5)">5/8 (Türk Aksağı)</button>
        <button class="btn-sm ${metronomeBeatsPerBar === 9 ? "pass-btn" : ""}" onclick="setMetronomeMeter(9)">9/8 (Aksak)</button>
      </div>
    </section>

    <!-- 2. Canlı Mikrofonlu Keman & Koma Akortçusu -->
    <section class="course-section-card">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <span class="course-chip violin">Entonasyon & Koma</span>
          <h2 style="font-size:1.05rem;font-weight:800;">🎙 Canlı Keman & Koma Akortçusu</h2>
        </div>
        <button class="btn-sm ${isTunerRunning ? "pass-btn" : ""}" onclick="toggleLiveTuner()">
          ${isTunerRunning ? "⏹ Mikrofonu Kapat" : "🎙 Mikrofonu Aç"}
        </button>
      </div>
      <p style="font-size:0.79rem;color:var(--text-muted);">
        Rast'taki Segâh, Uşşak'taki Eviç ve boş telleri her gün aynı yerde bulmak için kemanını çalarken frekansı (Hz) canlı takip et:
      </p>
      <div class="timer-display-box" style="padding:14px;">
        <div id="tuner-note-label" style="font-size:1.35rem;font-weight:800;color:var(--violin-color);">
          ${isTunerRunning ? "Ses Bekleniyor..." : "Mikrofon Kapalı"}
        </div>
        <div id="tuner-hz-label" style="font-size:0.88rem;color:var(--text-muted);font-variant-numeric:tabular-nums;">
          --.- Hz
        </div>
        <div class="tuner-meter-bar" style="width:100%;">
          <div id="tuner-needle" class="tuner-needle"></div>
        </div>
        <div id="tuner-advice" style="font-size:0.76rem;color:var(--text-muted);">
          Boş tel veya komalı perdeye basarak kontrol et
        </div>
      </div>
    </section>

    <!-- 3. Boş Tel & TSM Komalı Perdeler Referans Ses Üreteci (Diyapazon) -->
    <section class="course-section-card">
      <div>
        <span class="course-chip violin">Kulak Eğitimi (Drone Ses)</span>
        <h2 style="font-size:1.05rem;font-weight:800;">🔊 Boş Tel & Komalı Perde Referans Sesleri</h2>
        <p style="font-size:0.79rem;color:var(--text-muted);margin-top:2px;">
          Bir perdeye dokunduğunda sürekli referans sesi üretir; kemanla aynı sesi yakalayana kadar üzerinde çalışabilirsin:
        </p>
      </div>
      <div style="font-size:0.76rem;font-weight:700;color:var(--text-muted);">KEMAN BOŞ TELLERİ (Sol - Re - La - Mi)</div>
      <div class="tone-grid">${stringTonesHtml}</div>

      <div style="font-size:0.76rem;font-weight:700;color:var(--text-muted);margin-top:4px;">TSM KOMALI PERDELER (La=440Hz / Rast & Uşşak)</div>
      <div class="tone-grid">${komaTonesHtml}</div>
    </section>

    <!-- 4. Tenis Duvar & Hedef Seri Sayacı -->
    <section class="course-section-card">
      <div>
        <span class="course-chip tennis">Tenis Sınav & Seri Sayacı</span>
        <h2 style="font-size:1.05rem;font-weight:800;">🎾 Ardışık Vuruş & Servis Hedef Sayacı</h2>
      </div>
      <select onchange="selectTennisDrill(this.value)"
              style="width:100%;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-subtle);border-radius:10px;padding:10px;font-size:0.83rem;font-weight:700;">
        ${TENNIS_DRILL_TARGETS.map(
          (d) =>
            `<option value="${d.id}" ${d.id === activeDrill.id ? "selected" : ""}>${d.label}</option>`
        ).join("")}
      </select>

      <div class="rep-counter-bar">
        <div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Mevcut Seri / Hedef</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--tennis-color);">
            ${currentDrillVal} / ${activeDrill.target}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-sm" onclick="updateTennisDrillCount('${activeDrill.id}', 0)">Sıfırla</button>
          <button class="btn-sm" onclick="updateTennisDrillCount('${activeDrill.id}', ${currentDrillVal + 1})">+1</button>
          <button class="btn-primary" style="background:var(--tennis-color);color:#0b1120;padding:10px 14px;"
                  onclick="updateTennisDrillCount('${activeDrill.id}', ${currentDrillVal + 5})">+5</button>
        </div>
      </div>
    </section>
  `;
}

window.selectTennisDrill = function (drillId) {
  state.selectedDrillId = drillId;
  saveState();
  renderApp();
};

window.updateTennisDrillCount = function (drillId, newVal) {
  const drill = TENNIS_DRILL_TARGETS.find((d) => d.id === drillId);
  state.drillCounts[drillId] = Math.max(0, newVal);
  saveState();
  if (drill && state.drillCounts[drillId] >= drill.target) {
    playBeep(1046.5, 0.25);
    showToast(`🎾 Hedefe ulaştın! (${drill.target} tamamlandı)`);
  }
  renderApp();
};

// ============================================================================
// 🎥 PAZAR & VİDEO KARŞILAŞTIRICI + İLK AY KONTROL LİSTESİ
// ============================================================================
function renderChecklistView() {
  const checklistHtml = PLAN_DATA.firstMonthChecklist
    .map((item) => {
      const checked = Boolean(state.checklist[item.id]);
      return `
        <label class="checklist-item ${checked ? "checked" : ""}">
          <input type="checkbox" ${checked ? "checked" : ""}
                 onchange="toggleChecklistItem('${item.id}')" />
          <span>${item.text}</span>
        </label>
      `;
    })
    .join("");

  const rulesHtml = PLAN_DATA.meta.rules
    .map(
      (r) => `
      <div class="module-detail-box">
        <div style="font-weight:800;font-size:0.85rem;color:var(--text-main);">
          Kural ${r.number}: ${r.title}
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted);">${r.desc}</div>
      </div>
    `
    )
    .join("");

  const logsHtml =
    state.sundayLogs.length === 0
      ? `<p style="font-size:0.8rem;color:var(--text-muted);">Henüz pazar video karşılaştırma notu eklenmedi.</p>`
      : state.sundayLogs
          .map(
            (log, i) => `
          <div class="module-detail-box">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--ai-color);font-weight:700;">
              <span>📅 ${log.date} ${log.tag ? `· ${escapeHtml(log.tag)}` : ""}</span>
              <button onclick="deleteSundayLog(${i})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;">Sil</button>
            </div>
            <div style="font-size:0.83rem;white-space:pre-wrap;">${escapeHtml(log.note)}</div>
          </div>
        `
          )
          .join("");

  return `
    <!-- Yan Yana Video Karşılaştırma Aracı (Kural 2) -->
    <section class="course-section-card" style="border-color:rgba(56,189,248,0.4);">
      <div>
        <span class="course-chip ai">Kural 2 — Görsel Geri Bildirim</span>
        <h2 style="font-size:1.05rem;font-weight:800;">🎥 Yan Yana Video Karşılaştırıcı</h2>
        <p style="font-size:0.79rem;color:var(--text-muted);margin-top:2px;">
          Telefon galerinden <strong>Geçen Hafta</strong> ve <strong>Bu Hafta</strong> çektiğin tenis gölge vuruşu veya keman videolarını seç; ikisini aynı anda veya <strong>0.5x ağır çekimde</strong> karşılaştır:
        </p>
      </div>

      <div class="video-compare-grid">
        <div class="video-slot">
          <div style="font-size:0.74rem;font-weight:800;color:var(--text-muted);">1. GEÇEN HAFTA</div>
          <video id="compare-video-left" playsinline muted controls ${compareVideoLeftUrl ? `src="${compareVideoLeftUrl}"` : ""}></video>
          <button class="btn-sm" style="width:100%;" onclick="document.getElementById('video-file-left').click()">
            📂 1. Videoyu Seç
          </button>
          <input id="video-file-left" type="file" accept="video/*" style="display:none" onchange="loadCompareVideo('left', event)" />
        </div>

        <div class="video-slot">
          <div style="font-size:0.74rem;font-weight:800;color:var(--tennis-color);">2. BU HAFTA</div>
          <video id="compare-video-right" playsinline muted controls ${compareVideoRightUrl ? `src="${compareVideoRightUrl}"` : ""}></video>
          <button class="btn-sm" style="width:100%;" onclick="document.getElementById('video-file-right').click()">
            📂 2. Videoyu Seç / Çek
          </button>
          <input id="video-file-right" type="file" accept="video/*" style="display:none" onchange="loadCompareVideo('right', event)" />
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-primary" style="flex:1;" onclick="syncPlayBothVideos()">
          ▶ İkisini Aynı Anda Oynat / Duraklat
        </button>
        <button class="btn-sm" onclick="syncRestartBothVideos()">↺ Başa Sar</button>
        <button class="btn-sm" onclick="toggleCompareSlowMo()">
          🐢 Hız: ${comparePlaybackRate}x
        </button>
      </div>
    </section>

    <!-- Pazar Video Gelişim Notları -->
    <section class="course-section-card">
      <h2 style="font-size:1.05rem;font-weight:800;">📝 Pazar Gelişim & Karşılaştırma Notları</h2>
      <div style="display:flex;gap:6px;">
        <select id="sunday-note-tag" style="background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-subtle);border-radius:8px;padding:8px;font-size:0.8rem;font-weight:700;">
          <option value="🎾 Tenis & 🎻 Keman">🎾 Tenis & 🎻 Keman</option>
          <option value="🎾 Tenis Gölge / Duvar">🎾 Sadece Tenis</option>
          <option value="🎻 TSM Keman">🎻 Sadece Keman</option>
          <option value="🤖 AI Mühendisliği">🤖 AI Mühendisliği</option>
        </select>
      </div>
      <textarea id="sunday-note-input" class="note-textarea"
                placeholder="Örn: Split-step topa vurmadan önce oturmaya başladı. Kemanda Rast segâh perdesinde parmak baskısı daha tutarlı..."></textarea>
      <button class="btn-primary" onclick="addSundayLog()">+ Haftalık Notu Kaydet</button>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
        ${logsHtml}
      </div>
    </section>

    <!-- İlk Ay Kontrol Listesi -->
    <section class="course-section-card">
      <h2 style="font-size:1.05rem;font-weight:800;">✅ İlk Ay Kontrol Listesi (6 Hedef)</h2>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${checklistHtml}
      </div>
    </section>

    <!-- 3 Altın Kural -->
    <section class="course-section-card">
      <h2 style="font-size:1.05rem;font-weight:800;">📌 Planın 3 Altın Kuralı</h2>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${rulesHtml}
      </div>
      <div class="exam-box" style="margin-top:4px;">
        <strong>💡 İpucu (Özel Ders Eki)</strong>
        ${PLAN_DATA.meta.proTip}
      </div>
    </section>
  `;
}

window.loadCompareVideo = function (side, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (side === "left") {
    if (compareVideoLeftUrl) URL.revokeObjectURL(compareVideoLeftUrl);
    compareVideoLeftUrl = url;
  } else {
    if (compareVideoRightUrl) URL.revokeObjectURL(compareVideoRightUrl);
    compareVideoRightUrl = url;
  }
  renderApp();
};

window.syncPlayBothVideos = function () {
  const v1 = document.getElementById("compare-video-left");
  const v2 = document.getElementById("compare-video-right");
  if (!v1 && !v2) return;
  const shouldPlay = (v1 && v1.paused) || (v2 && v2.paused);
  [v1, v2].forEach((v) => {
    if (v && v.src) {
      v.playbackRate = comparePlaybackRate;
      if (shouldPlay) v.play().catch(() => {});
      else v.pause();
    }
  });
};

window.syncRestartBothVideos = function () {
  const v1 = document.getElementById("compare-video-left");
  const v2 = document.getElementById("compare-video-right");
  [v1, v2].forEach((v) => {
    if (v && v.src) {
      v.currentTime = 0;
      v.playbackRate = comparePlaybackRate;
      v.play().catch(() => {});
    }
  });
};

window.toggleCompareSlowMo = function () {
  if (comparePlaybackRate === 1.0) comparePlaybackRate = 0.5;
  else if (comparePlaybackRate === 0.5) comparePlaybackRate = 0.25;
  else comparePlaybackRate = 1.0;

  const v1 = document.getElementById("compare-video-left");
  const v2 = document.getElementById("compare-video-right");
  [v1, v2].forEach((v) => {
    if (v) v.playbackRate = comparePlaybackRate;
  });
  showToast(`🐢 Video oynatma hızı: ${comparePlaybackRate}x`);
  renderApp();
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.toggleChecklistItem = function (id) {
  state.checklist[id] = !state.checklist[id];
  saveState();
  if (state.checklist[id]) {
    playBeep(880, 0.12);
    showToast("✓ İlk ay hedefi tamamlandı!");
  }
  renderApp();
};

window.addSundayLog = function () {
  const input = document.getElementById("sunday-note-input");
  const tagEl = document.getElementById("sunday-note-tag");
  const text = (input?.value || "").trim();
  if (!text) return;
  state.sundayLogs.unshift({
    date: getTodayDateKey(),
    tag: tagEl?.value || "",
    note: text
  });
  saveState();
  showToast("📝 Haftalık gelişim notun kaydedildi!");
  renderApp();
};

window.deleteSundayLog = function (idx) {
  state.sundayLogs.splice(idx, 1);
  saveState();
  renderApp();
};

// Render "Kaynaklar & Telefona Kısayol" View
function renderResourcesView() {
  const courseKeys = ["tennis", "violin", "ai"];
  const linksSections = courseKeys
    .map((key) => {
      const course = PLAN_DATA.courses[key];
      const linksList = course.links
        .map(
          (l) => `
          <a href="${l.url}" target="_blank" rel="noopener"
             class="module-detail-box" style="text-decoration:none;color:var(--text-main);display:flex;flex-direction:row;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:0.72rem;font-weight:700;color:var(--ai-color);text-transform:uppercase;">${l.tag}</div>
              <div style="font-size:0.86rem;font-weight:600;">${l.title}</div>
            </div>
            <span style="font-size:1rem;">↗</span>
          </a>
        `
        )
        .join("");

      return `
        <section class="course-section-card">
          <span class="course-chip ${key}">${course.title}</span>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${linksList}
          </div>
        </section>
      `;
    })
    .join("");

  return `
    <section class="course-section-card" style="border-color:rgba(56,189,248,0.4);">
      <h2 style="font-size:1.05rem;font-weight:800;">📲 Telefona Uygulama Kısayolu Olarak Ekle (PC Gerekmez)</h2>
      <p style="font-size:0.81rem;color:var(--text-muted);">
        Bu uygulama <strong>PWA (Progressive Web App)</strong> mimarisiyle çalışır. Telefonunun ana ekranına eklediğinde <strong>bilgisayarın kapalıyken ve internetsizken bile</strong> normal bir mobil uygulama gibi anında açılır:
      </p>
      <div class="module-detail-box">
        <div><strong>1. Adım (Ücretsiz Kalıcı Link):</strong> Bu klasörü <a href="https://app.netlify.com/drop" target="_blank" rel="noopener" style="color:var(--ai-color);">Netlify Drop</a> sayfasına sürükleyip bırakarak saniyeler içinde kalıcı mobil linkini alabilirsin.</div>
        <div><strong>2. Android (Chrome):</strong> Sağ üst menüden (⋮) <em>"Ana ekrana ekle / Uygulamayı yükle"</em> seçeneğine dokun.</div>
        <div><strong>3. iPhone (Safari):</strong> Alt ortadaki <em>Paylaş</em> butonuna basıp <em>"Ana Ekrana Ekle"</em> seçeneğine dokun.</div>
      </div>
      <button id="pwa-install-btn" class="btn-primary" onclick="triggerPwaInstall()" style="display:${deferredInstallPrompt ? "inline-flex" : "none"};">
        📲 Tek Tıkla Ana Ekrana Yükle
      </button>
    </section>

    ${linksSections}

    <section class="course-section-card">
      <h2 style="font-size:1rem;font-weight:800;">☁️ Sunucu Senkronizasyonu & Yedek</h2>
      <p style="font-size:0.79rem;color:var(--text-muted);">
        Verilerin hem telefonunda (çevrimdışı) hem de sunucuda (<code>/api/state</code>) otomatik olarak senkronize edilir.
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-sm pass-btn" onclick="syncWithBackendNow(true)">☁️ Şimdi Sunucuyla Eşitle</button>
        <button class="btn-sm" onclick="exportProgressJson()">⬇ Yedeği İndir (JSON)</button>
        <button class="btn-sm" onclick="document.getElementById('import-file').click()">⬆ Yedek Yükle</button>
        <input id="import-file" type="file" accept=".json" style="display:none" onchange="importProgressJson(event)" />
      </div>
    </section>
  `;
}

window.exportProgressJson = function () {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `notom-yedek-${getTodayDateKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

window.importProgressJson = function (event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      state = { ...structuredClone(defaultState), ...imported };
      saveState();
      renderApp();
      showToast("✓ Yedek başarıyla yüklendi!");
    } catch (err) {
      alert("Geçersiz yedek dosyası.");
    }
  };
  reader.readAsText(file);
};

// Switch Bottom Navigation Tabs
window.switchTab = function (tabName) {
  currentTab = tabName;
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  renderApp();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ============================================================================
// INTERACTIVE SESSION TIMER MODAL (With In-Timer Metronome, Drone & Rep Counter)
// ============================================================================
window.openTimerForSession = function (sessionId, dayIdx) {
  const dayObj = PLAN_DATA.weeklySchedule.find((d) => d.dayIndex === dayIdx);
  if (!dayObj) return;
  const session = dayObj.sessions.find((s) => s.id === sessionId);
  if (!session) return;

  stopTimerInterval();

  activeTimerSession = { ...session, dayIdx };
  activeTimerStepIndex = 0;
  sessionRepCount = 0;
  const subSteps = getSessionSubSteps(session);
  timerTotalStepSeconds = (subSteps[0]?.minutes || session.durationMinutes) * 60;
  timerRemainingSeconds = timerTotalStepSeconds;
  isTimerRunning = false;

  document.getElementById("timer-modal").classList.add("open");
  renderTimerModal();
};

window.closeTimerModal = function () {
  stopTimerInterval();
  stopMetronome();
  stopDroneTone();
  releaseWakeLock();
  document.getElementById("timer-modal").classList.remove("open");
};

window.selectTimerStep = function (stepIdx) {
  if (!activeTimerSession) return;
  stopTimerInterval();
  isTimerRunning = false;
  activeTimerStepIndex = stepIdx;
  const subSteps = getSessionSubSteps(activeTimerSession);
  timerTotalStepSeconds = (subSteps[stepIdx]?.minutes || 5) * 60;
  timerRemainingSeconds = timerTotalStepSeconds;
  renderTimerModal();
};

window.toggleTimerRun = function () {
  if (!activeTimerSession) return;
  if (isTimerRunning) {
    stopTimerInterval();
    isTimerRunning = false;
  } else {
    isTimerRunning = true;
    requestWakeLock();
    timerInterval = setInterval(() => {
      if (timerRemainingSeconds > 0) {
        timerRemainingSeconds--;
        updateTimerClockDom();
      } else {
        playBeep(880, 0.25);
        const subSteps = getSessionSubSteps(activeTimerSession);
        if (activeTimerStepIndex + 1 < subSteps.length) {
          activeTimerStepIndex++;
          timerTotalStepSeconds = subSteps[activeTimerStepIndex].minutes * 60;
          timerRemainingSeconds = timerTotalStepSeconds;
          showToast(`🔔 Sıradaki bölüm: ${subSteps[activeTimerStepIndex].label}`);
          renderTimerModal();
        } else {
          stopTimerInterval();
          isTimerRunning = false;
          playBeep(1046.5, 0.4);
          if (!isSessionCompleted(activeTimerSession.dayIdx, activeTimerSession.id)) {
            toggleSessionCompleted(activeTimerSession.dayIdx, activeTimerSession.id);
          }
          renderTimerModal();
        }
      }
    }, 1000);
  }
  renderTimerModal();
};

window.resetCurrentStepTimer = function () {
  stopTimerInterval();
  isTimerRunning = false;
  timerRemainingSeconds = timerTotalStepSeconds;
  renderTimerModal();
};

window.addSessionRep = function (delta) {
  sessionRepCount = Math.max(0, sessionRepCount + delta);
  renderTimerModal();
};

window.completeSessionFromTimer = function () {
  if (!activeTimerSession) return;
  if (!isSessionCompleted(activeTimerSession.dayIdx, activeTimerSession.id)) {
    toggleSessionCompleted(activeTimerSession.dayIdx, activeTimerSession.id);
  }
  closeTimerModal();
};

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateTimerClockDom() {
  const clockEl = document.getElementById("timer-clock-val");
  const fillEl = document.getElementById("timer-progress-fill");
  if (clockEl) clockEl.textContent = formatClock(timerRemainingSeconds);
  if (fillEl && timerTotalStepSeconds > 0) {
    const pct = Math.min(
      100,
      Math.max(0, ((timerTotalStepSeconds - timerRemainingSeconds) / timerTotalStepSeconds) * 100)
    );
    fillEl.style.width = `${pct}%`;
  }
}

function renderTimerModal() {
  if (!activeTimerSession) return;
  const subSteps = getSessionSubSteps(activeTimerSession);
  const currentStep = subSteps[activeTimerStepIndex] || subSteps[0];
  const pct =
    timerTotalStepSeconds > 0
      ? ((timerTotalStepSeconds - timerRemainingSeconds) / timerTotalStepSeconds) * 100
      : 0;

  const stepsListHtml = subSteps
    .map(
      (st, idx) => `
      <div class="step-selector-item ${idx === activeTimerStepIndex ? "active-step" : ""}"
           onclick="selectTimerStep(${idx})">
        <span>${idx + 1}. ${st.label}</span>
        <span>${st.minutes} dk</span>
      </div>
    `
    )
    .join("");

  let courseSpecificToolHtml = "";
  if (activeTimerSession.courseId === "violin") {
    courseSpecificToolHtml = `
      <div class="metronome-bar">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <strong>🎻 Keman Metronomu (${metronomeBpm} BPM)</strong>
            <div style="font-size:0.72rem;color:var(--text-muted);">Boş tel & gam için sabit tempo</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn-sm" onclick="changeMetronomeBpm(${metronomeBpm - 5})">-5</button>
            <button class="btn-sm" onclick="changeMetronomeBpm(${metronomeBpm + 5})">+5</button>
            <button class="btn-sm" onclick="toggleMetronome()" style="background:${isMetronomeOn ? "#f59e0b" : "var(--bg-card-elevated)"};color:${isMetronomeOn ? "#0b1120" : "var(--text-main)"};">
              ${isMetronomeOn ? "🔊 Açık" : "🔇 Başlat"}
            </button>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-sm" onclick="toggleDroneTone('a4', 440)">🔊 La (440Hz)</button>
          <button class="btn-sm" onclick="toggleDroneTone('d4', 293.66)">🔊 Re (293Hz)</button>
          <button class="btn-sm" onclick="toggleDroneTone('segah-rast', 486.6)">🔊 Rast Segâh</button>
          ${activeDroneId ? `<button class="btn-sm" onclick="stopDroneTone();renderTimerModal();">⏹ Sesi Kapat</button>` : ""}
        </div>
      </div>
    `;
  } else if (activeTimerSession.courseId === "tennis") {
    courseSpecificToolHtml = `
      <div class="rep-counter-bar">
        <div>
          <strong>🎾 Seans İçi Tekrar / Duvar Sayacı</strong>
          <div style="font-size:0.73rem;color:var(--text-muted);">Gölge seti, sektirme veya ardışık duvar vuruşu</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn-sm" onclick="addSessionRep(-1)">−</button>
          <span style="font-size:1.15rem;font-weight:800;min-width:28px;text-align:center;color:var(--tennis-color);">${sessionRepCount}</span>
          <button class="btn-sm" onclick="addSessionRep(1)">+1</button>
          <button class="btn-sm" onclick="addSessionRep(10)">+10</button>
        </div>
      </div>
    `;
  }

  const sheet = document.getElementById("timer-sheet-content");
  if (!sheet) return;
  sheet.innerHTML = `
    <div class="sheet-header">
      <div>
        <span class="course-chip ${activeTimerSession.courseId}">${activeTimerSession.courseTitle}</span>
        <div style="font-size:0.95rem;font-weight:800;">${activeTimerSession.focusTitle}</div>
      </div>
      <button class="icon-btn" onclick="closeTimerModal()">✕ Kapat</button>
    </div>

    <div class="timer-display-box">
      <div style="font-size:0.74rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">
        Bölüm ${activeTimerStepIndex + 1} / ${subSteps.length}
      </div>
      <div id="timer-clock-val" class="timer-clock">${formatClock(timerRemainingSeconds)}</div>
      <div class="timer-step-title">${currentStep.label}</div>
      <div class="timer-progress-bar">
        <div id="timer-progress-fill" class="timer-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>

    <div class="timer-controls">
      <button class="timer-btn" onclick="resetCurrentStepTimer()">↺ Sıfırla</button>
      <button class="timer-btn main-toggle" onclick="toggleTimerRun()">
        ${isTimerRunning ? "⏸ Duraklat" : "▶ Başlat"}
      </button>
      <button class="timer-btn" style="color:#34d399;border-color:rgba(16,185,129,0.4);"
              onclick="completeSessionFromTimer()">✓ Bitir</button>
    </div>

    ${courseSpecificToolHtml}

    <div>
      <div style="font-size:0.76rem;font-weight:700;color:var(--text-muted);margin-bottom:6px;">
        SEANS BÖLÜMLERİ (Dokunarak istediğin bölüme geçebilirsin)
      </div>
      <div class="step-selector-list">
        ${stepsListHtml}
      </div>
    </div>
  `;
}

// ============================================================================
// WEB AUDIO API: BEEP, METRONOME, CONTINUOUS VIOLIN DRONE & LIVE PITCH TUNER
// ============================================================================
function ensureAudioCtx() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playBeep(freq = 800, duration = 0.07) {
  try {
    ensureAudioCtx();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.24, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

window.toggleMetronome = function () {
  if (isMetronomeOn) {
    stopMetronome();
  } else {
    startMetronomeLoop();
  }
  if (document.getElementById("timer-modal")?.classList.contains("open")) {
    renderTimerModal();
  } else {
    renderApp();
  }
};

window.changeMetronomeBpm = function (newBpm) {
  metronomeBpm = Math.min(160, Math.max(40, Number(newBpm) || 60));
  if (isMetronomeOn) {
    startMetronomeLoop();
  }
  if (document.getElementById("timer-modal")?.classList.contains("open")) {
    renderTimerModal();
  } else {
    renderApp();
  }
};

window.setMetronomeMeter = function (beats) {
  metronomeBeatsPerBar = beats;
  currentBeatIndex = 0;
  if (isMetronomeOn) {
    startMetronomeLoop();
  }
  renderApp();
};

function startMetronomeLoop() {
  stopMetronome();
  isMetronomeOn = true;
  currentBeatIndex = 0;
  const triggerBeat = () => {
    const isAccent = currentBeatIndex === 0;
    playBeep(isAccent ? 1180 : 820, 0.055);
    for (let i = 0; i < metronomeBeatsPerBar; i++) {
      const dot = document.getElementById(`studio-beat-dot-${i}`);
      if (dot) dot.classList.toggle("active-beat", i === currentBeatIndex);
    }
    currentBeatIndex = (currentBeatIndex + 1) % metronomeBeatsPerBar;
  };
  triggerBeat();
  const intervalMs = Math.round((60 / metronomeBpm) * 1000);
  metronomeInterval = setInterval(triggerBeat, intervalMs);
}

function stopMetronome() {
  isMetronomeOn = false;
  if (metronomeInterval) {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
  }
}

// Continuous Warm Violin Reference Tone (Drone)
window.toggleDroneTone = function (toneId, hz) {
  if (activeDroneId === toneId) {
    stopDroneTone();
  } else {
    stopDroneTone();
    try {
      ensureAudioCtx();
      if (!audioCtx) return;
      activeDroneId = toneId;
      droneOsc1 = audioCtx.createOscillator();
      droneOsc2 = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      droneGain = audioCtx.createGain();

      droneOsc1.type = "sawtooth";
      droneOsc2.type = "triangle";
      droneOsc1.frequency.value = hz;
      droneOsc2.frequency.value = hz;

      filter.type = "lowpass";
      filter.frequency.value = hz * 3.2;

      droneGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.14, audioCtx.currentTime + 0.15);

      droneOsc1.connect(filter);
      droneOsc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(audioCtx.destination);

      droneOsc1.start();
      droneOsc2.start();
    } catch (e) {}
  }
  if (document.getElementById("timer-modal")?.classList.contains("open")) {
    renderTimerModal();
  } else {
    renderApp();
  }
};

window.stopDroneTone = function () {
  activeDroneId = null;
  try {
    if (droneOsc1) {
      droneOsc1.stop();
      droneOsc1.disconnect();
      droneOsc1 = null;
    }
    if (droneOsc2) {
      droneOsc2.stop();
      droneOsc2.disconnect();
      droneOsc2 = null;
    }
    if (droneGain) {
      droneGain.disconnect();
      droneGain = null;
    }
  } catch (e) {}
};

// Live Microphone Pitch Detector (Autocorrelation) for Violin Strings & TSM Koma Notes
window.toggleLiveTuner = async function () {
  if (isTunerRunning) {
    stopLiveTuner();
    renderApp();
    return;
  }
  try {
    ensureAudioCtx();
    tunerStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false
      }
    });
    const source = audioCtx.createMediaStreamSource(tunerStream);
    tunerAnalyser = audioCtx.createAnalyser();
    tunerAnalyser.fftSize = 2048;
    source.connect(tunerAnalyser);
    isTunerRunning = true;
    renderApp();
    updateTunerLoop();
  } catch (err) {
    showToast("Mikrofon izni verilemedi; aşağıdaki referans ses butonlarını kullanabilirsin.");
  }
};

function stopLiveTuner() {
  isTunerRunning = false;
  if (tunerRafId) {
    cancelAnimationFrame(tunerRafId);
    tunerRafId = null;
  }
  if (tunerStream) {
    tunerStream.getTracks().forEach((t) => t.stop());
    tunerStream = null;
  }
}

function autoCorrelatePitch(buf, sampleRate) {
  let size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.015) return -1;

  let r1 = 0;
  let r2 = size - 1;
  const thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buf[size - i]) < thres) {
      r2 = size - i;
      break;
    }
  }
  buf = buf.slice(r1, r2);
  size = buf.length;

  const c = new Array(size).fill(0);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
  }
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  const T0 = maxpos;
  return sampleRate / T0;
}

function findClosestTsmOrViolinTarget(hz) {
  let best = TSM_TONES[0];
  let minDiff = Infinity;
  TSM_TONES.forEach((t) => {
    const diff = Math.abs(hz - t.hz);
    if (diff < minDiff) {
      minDiff = diff;
      best = t;
    }
  });
  return best;
}

function updateTunerLoop() {
  if (!isTunerRunning || !tunerAnalyser) return;
  const buf = new Float32Array(tunerAnalyser.fftSize);
  tunerAnalyser.getFloatTimeDomainData(buf);
  const pitch = autoCorrelatePitch(buf, audioCtx.sampleRate);

  const noteEl = document.getElementById("tuner-note-label");
  const hzEl = document.getElementById("tuner-hz-label");
  const needleEl = document.getElementById("tuner-needle");
  const adviceEl = document.getElementById("tuner-advice");

  if (pitch !== -1 && pitch >= 160 && pitch <= 1000 && noteEl && hzEl && needleEl) {
    const target = findClosestTsmOrViolinTarget(pitch);
    const cents = 1200 * Math.log2(pitch / target.hz);
    const clampedPct = Math.min(95, Math.max(5, 50 + cents));

    noteEl.textContent = `${target.note} — ${target.name.split("(")[0].trim()}`;
    hzEl.textContent = `${pitch.toFixed(1)} Hz (Hedef: ${target.hz} Hz)`;
    needleEl.style.left = `${clampedPct}%`;

    if (Math.abs(cents) <= 10) {
      needleEl.style.background = "#10b981";
      if (adviceEl) adviceEl.textContent = "✓ Tam Perde! (Entonasyon Doğru)";
    } else if (cents < 0) {
      needleEl.style.background = "#f59e0b";
      if (adviceEl) adviceEl.textContent = "↑ Biraz Pes — Parmağı hafif ileri/tize kaydır";
    } else {
      needleEl.style.background = "#ef4444";
      if (adviceEl) adviceEl.textContent = "↓ Biraz Tiz — Parmağı hafif geri/pese çek";
    }
  }
  tunerRafId = requestAnimationFrame(updateTunerLoop);
}

// Screen WakeLock so phone doesn't sleep during Tennis / Violin practice
async function requestWakeLock() {
  if ("wakeLock" in navigator) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request("screen");
    } catch (e) {}
  }
}

function releaseWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}

// PWA Install Prompt Handling
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  renderApp();
});

window.triggerPwaInstall = async function () {
  if (!deferredInstallPrompt) {
    switchTab("resources");
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  renderApp();
};

// Main Render Entry
function renderApp() {
  renderTopStreakStrip();
  renderDaySelector();
  if (currentTab !== "studio" && isTunerRunning) {
    stopLiveTuner();
  }
  const container = document.getElementById("main-view-container");
  if (!container) return;

  if (currentTab === "today") {
    container.innerHTML = renderTodayView();
  } else if (currentTab === "modules") {
    container.innerHTML = renderModulesView();
  } else if (currentTab === "studio") {
    container.innerHTML = renderStudioView();
  } else if (currentTab === "checklist") {
    container.innerHTML = renderChecklistView();
  } else if (currentTab === "resources") {
    container.innerHTML = renderResourcesView();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderApp();
  syncWithBackendNow(false);
  window.addEventListener("online", () => syncWithBackendNow(false));
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
