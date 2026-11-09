// Kurs Planı — Güncel Müfredat, Hafta İçi Dinamik Erteleme ve iPhone Uyumlu Uygulama Mantığı

const STORAGE_KEY = "notom_plan_state_v3";

const TSM_TONES = [
  { id: "g3", name: "Sol Teli", note: "G3 · 196 Hz", hz: 196.0 },
  { id: "d4", name: "Re Teli", note: "D4 · 293.7 Hz", hz: 293.66 },
  { id: "a4", name: "La Teli", note: "A4 · 440 Hz", hz: 440.0 },
  { id: "e5", name: "Mi Teli", note: "E5 · 659.3 Hz", hz: 659.25 },
  { id: "segah-rast", name: "Rast Segâhı", note: "Si b1 · 486.6 Hz", hz: 486.6 },
  { id: "segah-ussak", name: "Uşşak Segâhı", note: "Si b2.5 · 477.5 Hz", hz: 477.5 },
  { id: "evic", name: "Eviç Perdesi", note: "Fa #4 · 366.3 Hz", hz: 366.3 },
  { id: "kurdi", name: "Kürdi Perdesi", note: "Si b · 466.2 Hz", hz: 466.16 }
];

const defaultState = {
  activeModules: {
    tennis: 0,
    violin: 0,
    ai: 0
  },
  passedModules: {},
  moduleRepeats: {},
  completedSessionsByWeek: {}, // { "2026-11-09": { "mon-tennis": true } }
  rescheduledByWeek: {},       // { "2026-11-09": { "tue-tennis": 4 } } -> Hafta içi dinamik erteleme
  checklist: {},
  weatherMode: "park",         // "park" (Normal) veya "rainy" (Yağmurlu: 10 dk hız devresi + C seansı)
  sundayLogs: [],
  tennisVideoNumber: 1,        // 1..36 (Feel Tennis)
  violinEtudeNumber: 1,        // Hohmann (1..155) / Wohlfahrt (1..60)
  aiCourseStep: 1
};

let state = loadState();
let currentTab = "today"; // "today" | "modules" | "studio" | "resources"
let moduleCourseFilter = "all";
let selectedDayIndex = new Date().getDay();

// Zamanlayıcı (Timer) Durumu
let activeTimerSession = null;
let activeTimerStepIndex = 0;
let timerRemainingSeconds = 0;
let timerTotalStepSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;

// Ses & Metronom Durumu
let audioCtx = null;
let metronomeInterval = null;
let isMetronomeOn = false;
let metronomeBpm = 60;
let activeDroneId = null;
let droneOsc = null;
let droneGain = null;
let wakeLockSentinel = null;

function loadState() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("notom_plan_state_v2") ||
      localStorage.getItem("notom_plan_state_v1");
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      activeModules: { ...defaultState.activeModules, ...(parsed.activeModules || {}) },
      passedModules: { ...defaultState.passedModules, ...(parsed.passedModules || {}) },
      completedSessionsByWeek: { ...(parsed.completedSessionsByWeek || {}) },
      rescheduledByWeek: { ...(parsed.rescheduledByWeek || {}) }
    };
  } catch (e) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  try {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    pushStateToBackend();
  } catch (e) {}
}

async function pushStateToBackend() {
  try {
    await fetch("/api/state?profile=nuri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, updatedAt: state.updatedAt })
    });
  } catch (e) {}
}

async function syncWithBackendNow() {
  try {
    const res = await fetch("/api/state?profile=nuri", { cache: "no-store" });
    if (!res.ok) return;
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
          completedSessionsByWeek: { ...(data.state.completedSessionsByWeek || {}) },
          rescheduledByWeek: { ...(data.state.rescheduledByWeek || {}) }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderApp();
      } else if (localTime > remoteTime) {
        await pushStateToBackend();
      }
    }
  } catch (e) {}
}

function showToast(msg) {
  const el = document.getElementById("toast-msg");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2200);
}

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// İçinde bulunduğumuz haftanın Pazartesi tarihini anahtar olarak döner (örn: "2026-11-09")
function getCurrentWeekKey() {
  const now = new Date();
  const currentDay = now.getDay();
  const normalize = (d) => (d === 0 ? 7 : d);
  const diffToMonday = 1 - normalize(currentDay);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayNameByIndex(dayIdx) {
  const found = PLAN_DATA.weeklySchedule.find((d) => d.dayIndex === dayIdx);
  return found ? found.dayName : "";
}

function findSessionWithOriginalDay(sessionId) {
  for (const day of PLAN_DATA.weeklySchedule) {
    for (const s of day.sessions) {
      if (s.id === sessionId) {
        return { session: s, originalDayIndex: day.dayIndex, originalDayName: day.dayName };
      }
    }
  }
  return null;
}

// Hafta içi dinamik ertelemeleri hesaba katarak o günün aktif ders listesini döner
function getEffectiveSessionsForDay(targetDayIndex) {
  const weekKey = getCurrentWeekKey();
  const weekMoves = state.rescheduledByWeek[weekKey] || {};
  const result = [];

  PLAN_DATA.weeklySchedule.forEach((day) => {
    day.sessions.forEach((session) => {
      const movedToDay =
        weekMoves[session.id] !== undefined ? Number(weekMoves[session.id]) : day.dayIndex;

      if (movedToDay === targetDayIndex) {
        result.push({
          ...session,
          originalDayIndex: day.dayIndex,
          originalDayName: day.dayName,
          isRescheduled: movedToDay !== day.dayIndex
        });
      }
    });
  });

  return result;
}

function isSessionCompleted(sessionId) {
  const weekKey = getCurrentWeekKey();
  return Boolean(state.completedSessionsByWeek[weekKey]?.[sessionId]);
}

window.toggleSessionCompleted = function (sessionId) {
  const weekKey = getCurrentWeekKey();
  if (!state.completedSessionsByWeek[weekKey]) {
    state.completedSessionsByWeek[weekKey] = {};
  }
  const newVal = !state.completedSessionsByWeek[weekKey][sessionId];
  state.completedSessionsByWeek[weekKey][sessionId] = newVal;
  saveState();
  if (newVal) {
    showToast("Tamamlandı");
  }
  renderApp();
};

function getSessionSubSteps(session) {
  const course = PLAN_DATA.courses[session.courseId];
  const modIndex = state.activeModules[session.courseId] || 0;
  const activeMod = course.modules[modIndex] || course.modules[0];

  if (session.courseId === "tennis" && session.hasWeatherToggle && state.weatherMode === "rainy") {
    return (
      session.rainySubSteps || [
        { label: "Coach 10 dk Hızlı Ev Devresi (5 hareket, 20 sn × 4 tur)", minutes: 10 },
        { label: "C Seansı: Haftanın videosu + gölge vuruş + sünger top volesi", minutes: 25 }
      ]
    );
  }

  if (session.useModuleSteps && activeMod.subSteps) {
    return activeMod.subSteps;
  }
  return session.subSteps || [{ label: session.focusTitle, minutes: session.durationMinutes }];
}

// ============================================================================
// HAFTA İÇİ DİNAMİK ERTELEME (Tek Ders veya Tüm Gün)
// ============================================================================
window.openRescheduleModal = function (sessionId) {
  const info = findSessionWithOriginalDay(sessionId);
  if (!info) return;
  const { session, originalDayIndex, originalDayName } = info;
  const weekKey = getCurrentWeekKey();
  const weekMoves = state.rescheduledByWeek[weekKey] || {};
  const currentAssignedDay =
    weekMoves[sessionId] !== undefined ? Number(weekMoves[sessionId]) : originalDayIndex;

  const isTennisASession = session.courseId === "tennis" && session.sessionType === "A";

  const dayButtonsHtml = PLAN_DATA.weeklySchedule
    .map((day) => {
      const effectiveSessions = getEffectiveSessionsForDay(day.dayIndex);
      const totalMins = effectiveSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const isCurrent = day.dayIndex === currentAssignedDay;
      const isOriginal = day.dayIndex === originalDayIndex;

      // Tenis A seansı için başka bir A seansı o günde veya komşu günde var mı bilgisi
      const hasOtherTennisA = effectiveSessions.some(
        (s) => s.id !== sessionId && s.courseId === "tennis" && s.sessionType === "A"
      );

      let metaLabel = `${effectiveSessions.length} ders · ${totalMins} dk`;
      if (totalMins === 0) metaLabel = "Boş gün (0 dk)";
      if (isTennisASession && hasOtherTennisA) {
        metaLabel += " · (A seansı var)";
      }

      return `
        <button class="reschedule-day-btn ${isCurrent ? "current-day" : ""}"
                onclick="rescheduleSessionToDay('${sessionId}', ${day.dayIndex})">
          <div>
            <div>
              ${day.dayName}
              ${isOriginal ? `<span style="font-size:0.74rem;font-weight:500;color:var(--text-secondary);"> (Normal günü)</span>` : ""}
            </div>
            <div style="font-size:0.75rem;font-weight:500;color:var(--text-secondary);margin-top:2px;">
              ${metaLabel}
            </div>
          </div>
          <span style="font-size:0.8rem;font-weight:700;">
            ${isCurrent ? "Seçili" : "Bu Güne Al →"}
          </span>
        </button>
      `;
    })
    .join("");

  const modal = document.getElementById("reschedule-modal");
  const sheet = document.getElementById("reschedule-sheet-content");
  modal.classList.add("open");

  sheet.innerHTML = `
    <div class="sheet-header">
      <div>
        <div style="font-size:0.76rem;color:var(--text-secondary);font-weight:600;">
          Hafta İçi Dinamik Erteleme (${originalDayName} dersi)
        </div>
        <div style="font-size:1.02rem;font-weight:800;">${session.focusTitle}</div>
      </div>
      <button class="btn-ghost" onclick="closeRescheduleModal()">Kapat</button>
    </div>

    <p style="font-size:0.81rem;color:var(--text-secondary);">
      Bugün müsait değilsen bu dersi <strong>bu hafta içinde</strong> yapacağın başka bir güne aktarabilirsin:
      ${isTennisASession ? `<br><strong style="color:var(--tennis-dark);">Not:</strong> İki A (patlayıcılık) seansı arasında en az 48 saat olmasına dikkat et.` : ""}
    </p>

    <div class="reschedule-day-list">
      ${dayButtonsHtml}
    </div>
  `;
};

window.openRescheduleWholeDayModal = function (fromDayIndex) {
  const dayName = getDayNameByIndex(fromDayIndex);
  const remainingSessions = getEffectiveSessionsForDay(fromDayIndex).filter(
    (s) => !isSessionCompleted(s.id)
  );
  if (remainingSessions.length === 0) {
    showToast("Bu günde ertelenecek tamamlanmamış ders yok");
    return;
  }

  const dayButtonsHtml = PLAN_DATA.weeklySchedule
    .filter((d) => d.dayIndex !== fromDayIndex)
    .map((day) => {
      const effectiveSessions = getEffectiveSessionsForDay(day.dayIndex);
      const totalMins = effectiveSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      return `
        <button class="reschedule-day-btn"
                onclick="rescheduleWholeDayTo(${fromDayIndex}, ${day.dayIndex})">
          <div>
            <div>${day.dayName}</div>
            <div style="font-size:0.75rem;font-weight:500;color:var(--text-secondary);margin-top:2px;">
              Mevcut yük: ${effectiveSessions.length} ders · ${totalMins} dk
            </div>
          </div>
          <span style="font-size:0.8rem;font-weight:700;">Tümünü Aktar →</span>
        </button>
      `;
    })
    .join("");

  const modal = document.getElementById("reschedule-modal");
  const sheet = document.getElementById("reschedule-sheet-content");
  modal.classList.add("open");

  sheet.innerHTML = `
    <div class="sheet-header">
      <div>
        <div style="font-size:0.76rem;color:var(--text-secondary);font-weight:600;">
          Tüm Günü Ertele
        </div>
        <div style="font-size:1.02rem;font-weight:800;">
          ${dayName} (${remainingSessions.length} ders)
        </div>
      </div>
      <button class="btn-ghost" onclick="closeRescheduleModal()">Kapat</button>
    </div>

    <p style="font-size:0.81rem;color:var(--text-secondary);">
      ${dayName} günü müsait değilsen kalan ${remainingSessions.length} dersi bu hafta hangi güne aktarmak istersin?
    </p>

    <div class="reschedule-day-list">
      ${dayButtonsHtml}
    </div>
  `;
};

window.closeRescheduleModal = function () {
  document.getElementById("reschedule-modal").classList.remove("open");
};

window.rescheduleSessionToDay = function (sessionId, targetDayIndex) {
  const info = findSessionWithOriginalDay(sessionId);
  if (!info) return;
  const weekKey = getCurrentWeekKey();
  if (!state.rescheduledByWeek[weekKey]) {
    state.rescheduledByWeek[weekKey] = {};
  }

  if (targetDayIndex === info.originalDayIndex) {
    delete state.rescheduledByWeek[weekKey][sessionId];
    showToast(`Ders normal gününe (${info.originalDayName}) döndürüldü`);
  } else {
    state.rescheduledByWeek[weekKey][sessionId] = targetDayIndex;
    showToast(`${getDayNameByIndex(targetDayIndex)} gününe ertelendi`);
  }

  saveState();
  closeRescheduleModal();
  renderApp();
};

window.rescheduleWholeDayTo = function (fromDayIndex, targetDayIndex) {
  const remaining = getEffectiveSessionsForDay(fromDayIndex).filter(
    (s) => !isSessionCompleted(s.id)
  );
  const weekKey = getCurrentWeekKey();
  if (!state.rescheduledByWeek[weekKey]) {
    state.rescheduledByWeek[weekKey] = {};
  }

  remaining.forEach((s) => {
    if (targetDayIndex === s.originalDayIndex) {
      delete state.rescheduledByWeek[weekKey][s.id];
    } else {
      state.rescheduledByWeek[weekKey][s.id] = targetDayIndex;
    }
  });

  saveState();
  closeRescheduleModal();
  showToast(`${remaining.length} ders ${getDayNameByIndex(targetDayIndex)} gününe aktarıldı`);
  selectedDayIndex = targetDayIndex;
  renderApp();
};

// Gün Seçici Bar
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
      const effectiveSessions = getEffectiveSessionsForDay(day.dayIndex);
      const allDone =
        effectiveSessions.length > 0 &&
        effectiveSessions.every((s) => isSessionCompleted(s.id));
      const dotsHtml = effectiveSessions
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
  renderApp();
};

window.adjustVideoNumber = function (delta) {
  state.tennisVideoNumber = Math.min(36, Math.max(1, (state.tennisVideoNumber || 1) + delta));
  saveState();
  renderApp();
};

window.adjustViolinEtudeNumber = function (delta) {
  state.violinEtudeNumber = Math.max(1, (state.violinEtudeNumber || 1) + delta);
  saveState();
  renderApp();
};

// 1. BUGÜN GÖRÜNÜMÜ
function renderTodayView() {
  const dayObj =
    PLAN_DATA.weeklySchedule.find((d) => d.dayIndex === selectedDayIndex) ||
    PLAN_DATA.weeklySchedule[0];

  const effectiveSessions = getEffectiveSessionsForDay(selectedDayIndex);
  const completedCount = effectiveSessions.filter((s) => isSessionCompleted(s.id)).length;
  const uncompletedCount = effectiveSessions.length - completedCount;
  const totalMinutes = effectiveSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const showWeatherBar = effectiveSessions.some((s) => s.hasWeatherToggle);

  let html = `
    <div class="day-summary-row">
      <div>
        <h2>${dayObj.dayName}</h2>
        <span style="font-size:0.78rem;color:var(--text-secondary);">
          ${completedCount}/${effectiveSessions.length} tamamlandı · Toplam ${totalMinutes} dk
        </span>
      </div>
      ${
        uncompletedCount > 0
          ? `<button class="btn-step" onclick="openRescheduleWholeDayModal(${selectedDayIndex})">
              Günü Ertele
            </button>`
          : `<span class="day-summary-pill">Tamamlandı</span>`
      }
    </div>
  `;

  if (showWeatherBar) {
    html += `
      <div class="weather-bar">
        <span>Hava durumu (Kural 3)</span>
        <div class="segmented-control">
          <button class="seg-btn ${state.weatherMode === "park" ? "active" : ""}"
                  onclick="setWeatherMode('park')">Park Açık</button>
          <button class="seg-btn ${state.weatherMode === "rainy" ? "active" : ""}"
                  onclick="setWeatherMode('rainy')">Yağmurlu (Evde 10dk + C)</button>
        </div>
      </div>
    `;
  }

  if (effectiveSessions.length === 0) {
    html += `
      <div class="section-card" style="text-align:center;padding:28px 16px;">
        <div style="font-weight:700;font-size:0.98rem;">Bu gün için bekleyen ders yok</div>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">
          Bu günün derslerini hafta içinde başka bir güne erteledin.
        </p>
      </div>
    `;
    return html;
  }

  const badgeNames = {
    tennis: "Tenis",
    violin: "TSM Keman",
    ai: "AI Mühendisliği"
  };

  effectiveSessions.forEach((session) => {
    const course = PLAN_DATA.courses[session.courseId];
    const modIndex = state.activeModules[session.courseId] || 0;
    const activeMod = course.modules[modIndex] || course.modules[0];
    const isDone = isSessionCompleted(session.id);

    let primaryLink = course.links[0];
    let practiceDescription = "";
    let displayTitle = session.focusTitle;
    let displayDuration = session.durationMinutes;

    if (session.courseId === "tennis") {
      if (session.hasWeatherToggle && state.weatherMode === "rainy") {
        displayTitle = "Yağmur Modu: 10 dk Hız Devresi + C Seansı (Ev)";
        displayDuration = 35;
        practiceDescription = `Coach 10 dk hız devresi (5 hareket, 20 sn × 4 tur) + ${activeMod.sessionC}`;
        primaryLink = course.links[3] || course.links[0];
      } else if (session.sessionType === "A") {
        practiceDescription = activeMod.sessionA;
        primaryLink = course.links[2] || course.links[0];
      } else if (session.sessionType === "B") {
        practiceDescription = activeMod.sessionB;
        primaryLink = course.links[1] || course.links[0];
      } else {
        practiceDescription = activeMod.sessionC;
        primaryLink = course.links[0];
      }
    } else if (session.courseId === "violin") {
      practiceDescription = `${activeMod.level} — ${activeMod.dailyRoutine}`;
    } else {
      practiceDescription = activeMod.lessons;
    }

    let counterRowHtml = "";
    if (session.courseId === "tennis") {
      counterRowHtml = `
        <div class="mini-counter-row">
          <span>Feel Tennis videosu: <strong>#${state.tennisVideoNumber} / 36</strong></span>
          <div class="mini-counter-controls">
            <button class="btn-step" onclick="adjustVideoNumber(-1)">−</button>
            <button class="btn-step" onclick="adjustVideoNumber(1)">+1</button>
          </div>
        </div>
      `;
    } else if (session.courseId === "violin") {
      counterRowHtml = `
        <div class="mini-counter-row">
          <span>Sıradaki Hohmann / Wohlfahrt No: <strong>#${state.violinEtudeNumber}</strong></span>
          <div class="mini-counter-controls">
            <button class="btn-step" onclick="adjustViolinEtudeNumber(-1)">−</button>
            <button class="btn-step" onclick="adjustViolinEtudeNumber(1)">+1</button>
          </div>
        </div>
      `;
    }

    const rescheduledBadgeHtml = session.isRescheduled
      ? `<span class="rescheduled-tag">${session.originalDayName} gününden ertelendi</span>`
      : "";

    html += `
      <article class="session-card course-${session.courseId} ${isDone ? "completed" : ""}">
        <div class="session-top">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span class="course-badge ${session.courseId}">${badgeNames[session.courseId]}</span>
            ${rescheduledBadgeHtml}
          </div>
          <span class="duration-text">${displayDuration} dk</span>
        </div>

        <div>
          <h3 class="session-title">${displayTitle}</h3>
          <p class="session-subtitle">${activeMod.period} · ${activeMod.title}</p>
        </div>

        <div class="session-focus-note">
          <div>${practiceDescription}</div>
          <div class="meta-line">
            <a href="${primaryLink.url}" target="_blank" rel="noopener" class="resource-inline-link">
              ${primaryLink.title.split("–")[0].trim()} kaynağını aç ↗
            </a>
          </div>
        </div>

        ${counterRowHtml}

        <div class="session-actions">
          <button class="btn-primary ${session.courseId}" onclick="openTimerForSession('${session.id}', ${selectedDayIndex})">
            Sayacı Başlat
          </button>
          <button class="btn-check" onclick="openRescheduleModal('${session.id}')">
            Ertele
          </button>
          <button class="btn-check ${isDone ? "done" : ""}"
                  onclick="toggleSessionCompleted('${session.id}')">
            ${isDone ? "Tamamlandı" : "Tamamla"}
          </button>
        </div>
      </article>
    `;
  });

  return html;
}

// 2. MÜFREDAT & MODÜLLER GÖRÜNÜMÜ
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
    <div class="filter-bar">
      <button class="filter-pill ${moduleCourseFilter === "all" ? "active" : ""}" onclick="setModuleFilter('all')">Tümü</button>
      <button class="filter-pill ${moduleCourseFilter === "tennis" ? "active" : ""}" onclick="setModuleFilter('tennis')">Tenis</button>
      <button class="filter-pill ${moduleCourseFilter === "violin" ? "active" : ""}" onclick="setModuleFilter('violin')">TSM Keman</button>
      <button class="filter-pill ${moduleCourseFilter === "ai" ? "active" : ""}" onclick="setModuleFilter('ai')">AI Mühendisliği</button>
    </div>
  `;

  const courseKeys =
    moduleCourseFilter === "all" ? ["tennis", "violin", "ai"] : [moduleCourseFilter];

  const sectionsHtml = courseKeys
    .map((key) => {
      const course = PLAN_DATA.courses[key];
      const activeIdx = state.activeModules[key] || 0;

      const modulesHtml = course.modules
        .map((mod, idx) => {
          const isPassed = Boolean(state.passedModules[mod.id]);
          const isActive = idx === activeIdx;
          const unlocked = isModuleUnlocked(key, idx);
          const repeats = state.moduleRepeats[mod.id] || 0;

          let statusLabel = "Kilitli";
          if (isPassed) statusLabel = "Geçildi";
          else if (isActive) statusLabel = "Aktif Modül";
          else if (unlocked) statusLabel = "Açık";

          let detailText = "";
          if (key === "tennis") {
            detailText = `<strong>A (Park):</strong> ${mod.sessionA}<br><strong>B (Ayak işi):</strong> ${mod.sessionB}<br><strong>C (Ev):</strong> ${mod.sessionC}`;
          } else if (key === "violin") {
            detailText = `<strong>${mod.level}:</strong> ${mod.dailyRoutine}`;
          } else {
            detailText = mod.lessons;
          }

          return `
            <div class="module-item ${isActive ? "active-module" : ""} ${isPassed ? "passed-module" : ""} ${!unlocked ? "locked-module" : ""}">
              <div class="module-top-row">
                <span>${mod.period}${repeats > 0 ? ` (${repeats} hf tekrar)` : ""}</span>
                <span>${statusLabel}</span>
              </div>
              <div style="font-weight:700;font-size:0.95rem;">${mod.title}</div>
              <div style="font-size:0.81rem;color:var(--text-secondary);line-height:1.45;">${detailText}</div>
              <div class="criteria-box">
                <span>Geçme Kriteri</span>
                ${mod.passCriteria}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;">
                <button class="btn-step" ${!unlocked && !isPassed ? "disabled" : ""}
                        onclick="openExamModal('${key}', ${idx}, '${mod.id}')">
                  ${isPassed ? "Geçildi (Düzenle)" : "Sınavı Değerlendir"}
                </button>
                ${
                  !isActive && unlocked
                    ? `<button class="btn-step" onclick="setActiveModule('${key}', ${idx})">Aktif Yap</button>`
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <section class="section-card">
          <div>
            <span class="course-badge ${key}">${course.badge}</span>
            <h2 style="font-size:1.05rem;font-weight:700;margin-top:6px;">${course.title.replace(/^Kurs \d — /, "")}</h2>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${modulesHtml}
          </div>
        </section>
      `;
    })
    .join("");

  return filterBar + sectionsHtml;
}

window.setActiveModule = function (courseKey, idx) {
  if (!isModuleUnlocked(courseKey, idx)) {
    showToast("Önce bir önceki modülün kriterini tamamlamalısın");
    return;
  }
  state.activeModules[courseKey] = idx;
  saveState();
  renderApp();
};

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
        <div style="font-size:0.78rem;color:var(--text-secondary);font-weight:600;">${mod.period}</div>
        <div style="font-size:1.05rem;font-weight:700;">${mod.title}</div>
      </div>
      <button class="btn-ghost" onclick="closeExamModal()">Kapat</button>
    </div>

    <div class="criteria-box" style="padding:14px;">
      <span>Geçme Kriteri (Sınav)</span>
      <div style="font-size:0.92rem;font-weight:600;margin-top:4px;">${mod.passCriteria}</div>
    </div>

    <p style="font-size:0.82rem;color:var(--text-secondary);">
      Geçme kriterini sağladıysan bir sonraki modüle geçebilirsin. Sağlayamadıysan bu modülü 1 hafta daha tekrarla.
      ${repeats > 0 ? `<br>Tekrar sayısı: ${repeats} hafta.` : ""}
    </p>

    <div style="display:flex;flex-direction:column;gap:8px;">
      <button class="btn-primary" onclick="confirmPassExam('${courseKey}', ${idx}, '${modId}', true)">
        Kriteri Sağladım — Sonraki Modüle Geç
      </button>
      <button class="btn-check" onclick="repeatModuleFromExam('${modId}')">
        Henüz Değil — 1 Hafta Daha Tekrarla
      </button>
      ${
        isPassed
          ? `<button class="btn-step" style="padding:9px;" onclick="confirmPassExam('${courseKey}', ${idx}, '${modId}', false)">
              Geçiş İşaretini Kaldır
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
  if (passVal) showToast("Sonraki modüle geçildi");
  renderApp();
};

window.repeatModuleFromExam = function (modId) {
  state.moduleRepeats[modId] = (state.moduleRepeats[modId] || 0) + 1;
  saveState();
  closeExamModal();
  showToast("1 hafta tekrar eklendi");
  renderApp();
};

// 3. ARAÇLAR GÖRÜNÜMÜM (Metronom, Referans Sesler, İlk Ay Listesi & Pazar Notu)
function renderStudioView() {
  const tonesHtml = TSM_TONES.map(
    (t) => `
      <button class="tone-btn ${activeDroneId === t.id ? "playing" : ""}"
              onclick="toggleDroneTone('${t.id}', ${t.hz})">
        <div>
          <div style="font-weight:600;font-size:0.84rem;">${t.name}</div>
          <div style="font-size:0.73rem;color:var(--text-secondary);">${t.note}</div>
        </div>
        <span style="font-size:0.78rem;font-weight:600;">${activeDroneId === t.id ? "Durdur" : "Çal"}</span>
      </button>
    `
  ).join("");

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

  const logsHtml =
    state.sundayLogs.length === 0
      ? ""
      : state.sundayLogs
          .map(
            (log, i) => `
          <div class="session-focus-note">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-secondary);margin-bottom:3px;">
              <span>${log.date}</span>
              <button onclick="deleteSundayLog(${i})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;">Sil</button>
            </div>
            <div style="white-space:pre-wrap;">${escapeHtml(log.note)}</div>
          </div>
        `
          )
          .join("");

  return `
    <!-- Keman Metronomu -->
    <section class="section-card">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;">Keman Çalışması</div>
          <h2 style="font-size:1.02rem;font-weight:700;">Metronom · ${metronomeBpm} BPM</h2>
        </div>
        <button class="btn-primary violin" style="padding:8px 16px;" onclick="toggleMetronome()">
          ${isMetronomeOn ? "Durdur" : "Başlat"}
        </button>
      </div>
      <input type="range" min="40" max="130" value="${metronomeBpm}"
             oninput="changeMetronomeBpm(this.value)"
             style="width:100%;accent-color:var(--violin-main);" />
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn-step" onclick="changeMetronomeBpm(60)">60 BPM (Hohmann Sınav)</button>
        <button class="btn-step" onclick="changeMetronomeBpm(72)">72 BPM</button>
        <button class="btn-step" onclick="changeMetronomeBpm(88)">88 BPM</button>
        <button class="btn-step" onclick="changeMetronomeBpm(100)">100 BPM</button>
      </div>
    </section>

    <!-- Keman Boş Tel & Komalı Referans Sesler -->
    <section class="section-card">
      <div>
        <div style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;">Akort & Koma Kulak Referansı</div>
        <h2 style="font-size:1.02rem;font-weight:700;">Referans Sesler</h2>
      </div>
      <div class="tone-grid">${tonesHtml}</div>
    </section>

    <!-- İlk Ay Kontrol Listesi -->
    <section class="section-card">
      <h2 style="font-size:1.02rem;font-weight:700;">İlk Ay Kontrol Listesi</h2>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${checklistHtml}
      </div>
    </section>

    <!-- Pazar Video & 5-10-5 Süre / Gelişim Notları -->
    <section class="section-card">
      <div>
        <h2 style="font-size:1.02rem;font-weight:700;">Pazar Video & 5-10-5 Süre Notları</h2>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">
          Pazar video karşılaştırma notlarını ve 1. hafta / 12. hafta 5-10-5 mekik süreni buraya kaydedebilirsin.
        </p>
      </div>
      <textarea id="sunday-note-input" class="note-textarea"
                placeholder="Örn: 1. Hafta 5-10-5 mekik süresi: 6.4 sn. Gölge vuruşta split-step zamanlaması..."></textarea>
      <button class="btn-primary" onclick="addSundayLog()">Notu Kaydet</button>
      ${logsHtml ? `<div style="display:flex;flex-direction:column;gap:8px;">${logsHtml}</div>` : ""}
    </section>
  `;
}

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
  renderApp();
};

window.addSundayLog = function () {
  const input = document.getElementById("sunday-note-input");
  const text = (input?.value || "").trim();
  if (!text) return;
  state.sundayLogs.unshift({
    date: getTodayDateKey(),
    note: text
  });
  saveState();
  showToast("Not kaydedildi");
  renderApp();
};

window.deleteSundayLog = function (idx) {
  state.sundayLogs.splice(idx, 1);
  saveState();
  renderApp();
};

// 4. KAYNAKLAR GÖRÜNÜMÜ
function renderResourcesView() {
  const courseKeys = ["tennis", "violin", "ai"];
  const linksSections = courseKeys
    .map((key) => {
      const course = PLAN_DATA.courses[key];
      const linksList = course.links
        .map(
          (l) => `
          <a href="${l.url}" target="_blank" rel="noopener" class="resource-row">
            <div>
              <div style="font-size:0.72rem;color:var(--text-secondary);font-weight:600;">${l.tag}</div>
              <div style="font-weight:600;">${l.title}</div>
            </div>
            <span style="color:var(--text-muted);">↗</span>
          </a>
        `
        )
        .join("");

      return `
        <section class="section-card">
          <h2 style="font-size:1rem;font-weight:700;">${course.title.replace(/^Kurs \d — /, "")}</h2>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${linksList}
          </div>
        </section>
      `;
    })
    .join("");

  return `
    ${linksSections}
    <section class="section-card">
      <h2 style="font-size:0.98rem;font-weight:700;">Veri Yedeği</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-step" style="padding:8px 12px;" onclick="exportProgressJson()">Yedeği İndir (JSON)</button>
        <button class="btn-step" style="padding:8px 12px;" onclick="document.getElementById('import-file').click()">Yedek Yükle</button>
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
  a.download = `kurs-plani-yedek-${getTodayDateKey()}.json`;
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
      showToast("Yedek yüklendi");
    } catch (err) {
      alert("Geçersiz dosya");
    }
  };
  reader.readAsText(file);
};

window.switchTab = function (tabName) {
  currentTab = tabName;
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  renderApp();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// SEANS ZAMANLAYICISI
window.openTimerForSession = function (sessionId, dayIdx) {
  const effectiveSessions = getEffectiveSessionsForDay(dayIdx);
  const session = effectiveSessions.find((s) => s.id === sessionId);
  if (!session) return;

  stopTimerInterval();

  activeTimerSession = { ...session, dayIdx };
  activeTimerStepIndex = 0;
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
        playBeep(784, 0.2);
        const subSteps = getSessionSubSteps(activeTimerSession);
        if (activeTimerStepIndex + 1 < subSteps.length) {
          activeTimerStepIndex++;
          timerTotalStepSeconds = subSteps[activeTimerStepIndex].minutes * 60;
          timerRemainingSeconds = timerTotalStepSeconds;
          renderTimerModal();
        } else {
          stopTimerInterval();
          isTimerRunning = false;
          playBeep(880, 0.35);
          if (!isSessionCompleted(activeTimerSession.id)) {
            toggleSessionCompleted(activeTimerSession.id);
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

window.completeSessionFromTimer = function () {
  if (!activeTimerSession) return;
  if (!isSessionCompleted(activeTimerSession.id)) {
    toggleSessionCompleted(activeTimerSession.id);
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

  const violinMetronomeRow =
    activeTimerSession.courseId === "violin"
      ? `
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-subtle);padding:10px 12px;border-radius:10px;font-size:0.82rem;">
        <span>Metronom (${metronomeBpm} BPM)</span>
        <button class="btn-step" onclick="toggleMetronome()">
          ${isMetronomeOn ? "Metronomu Kapat" : "60 BPM Aç"}
        </button>
      </div>
    `
      : "";

  const sheet = document.getElementById("timer-sheet-content");
  if (!sheet) return;
  sheet.innerHTML = `
    <div class="sheet-header">
      <div>
        <div style="font-size:0.76rem;color:var(--text-secondary);font-weight:600;">${activeTimerSession.courseTitle}</div>
        <div style="font-size:1rem;font-weight:700;">${activeTimerSession.focusTitle}</div>
      </div>
      <button class="btn-ghost" onclick="closeTimerModal()">Kapat</button>
    </div>

    <div class="timer-display-box">
      <div style="font-size:0.74rem;color:var(--text-secondary);font-weight:600;">
        Bölüm ${activeTimerStepIndex + 1} / ${subSteps.length}
      </div>
      <div id="timer-clock-val" class="timer-clock">${formatClock(timerRemainingSeconds)}</div>
      <div class="timer-step-title">${currentStep.label}</div>
      <div class="timer-progress-bar">
        <div id="timer-progress-fill" class="timer-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>

    <div class="timer-controls">
      <button class="timer-btn" onclick="resetCurrentStepTimer()">Sıfırla</button>
      <button class="timer-btn main-toggle" onclick="toggleTimerRun()">
        ${isTimerRunning ? "Duraklat" : "Başlat"}
      </button>
      <button class="timer-btn" onclick="completeSessionFromTimer()">Tamamla</button>
    </div>

    ${violinMetronomeRow}

    <div>
      <div style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">
        Seans Bölümleri
      </div>
      <div class="step-selector-list">
        ${stepsListHtml}
      </div>
    </div>
  `;
}

// SES & METRONOM
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

function playBeep(freq = 800, duration = 0.06) {
  try {
    ensureAudioCtx();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
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
  metronomeBpm = Math.min(140, Math.max(40, Number(newBpm) || 60));
  if (isMetronomeOn) {
    startMetronomeLoop();
  }
  renderApp();
};

function startMetronomeLoop() {
  stopMetronome();
  isMetronomeOn = true;
  playBeep(880, 0.05);
  const intervalMs = Math.round((60 / metronomeBpm) * 1000);
  metronomeInterval = setInterval(() => {
    playBeep(880, 0.05);
  }, intervalMs);
}

function stopMetronome() {
  isMetronomeOn = false;
  if (metronomeInterval) {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
  }
}

window.toggleDroneTone = function (toneId, hz) {
  if (activeDroneId === toneId) {
    stopDroneTone();
  } else {
    stopDroneTone();
    try {
      ensureAudioCtx();
      if (!audioCtx) return;
      activeDroneId = toneId;
      droneOsc = audioCtx.createOscillator();
      droneGain = audioCtx.createGain();
      droneOsc.type = "triangle";
      droneOsc.frequency.value = hz;
      droneGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.12);
      droneOsc.connect(droneGain);
      droneGain.connect(audioCtx.destination);
      droneOsc.start();
    } catch (e) {}
  }
  renderApp();
};

function stopDroneTone() {
  activeDroneId = null;
  try {
    if (droneOsc) {
      droneOsc.stop();
      droneOsc.disconnect();
      droneOsc = null;
    }
    if (droneGain) {
      droneGain.disconnect();
      droneGain = null;
    }
  } catch (e) {}
}

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

function renderApp() {
  renderDaySelector();
  const container = document.getElementById("main-view-container");
  if (!container) return;

  if (currentTab === "today") {
    container.innerHTML = renderTodayView();
  } else if (currentTab === "modules") {
    container.innerHTML = renderModulesView();
  } else if (currentTab === "studio") {
    container.innerHTML = renderStudioView();
  } else if (currentTab === "resources") {
    container.innerHTML = renderResourcesView();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderApp();
  syncWithBackendNow();
  window.addEventListener("online", () => syncWithBackendNow());
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
