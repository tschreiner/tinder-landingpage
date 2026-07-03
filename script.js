const steps = [
  {
    type: "intro",
    badge: "💘",
    eyebrow: "Persönlichkeitstest für Matches",
    title: (name) => `Oh hi ${name}.`,
    copy: "Ich brauche vor dem Weiterflirten eine sehr wissenschaftliche Einschätzung: Bist du eher Green Flag, charmantes Problem oder emotionaler Kabelbrand mit guten Absichten?",
    primaryLabel: "Okay, ich mach den Test"
  },
  {
    type: "question",
    badge: "🎙️",
    eyebrow: "Runde 1",
    title: "Wie antwortest du auf Sprachnachrichten?",
    copy: "Bitte ehrlich sein. Oder zumindest kreativ beim Lügen.",
    options: [
      {
        text: "Sofort. Ich bin verbal leider sehr verfügbar.",
        scores: { green: 3, chaos: 0, disaster: 0 }
      },
      {
        text: "Ich höre sie auf 1.5x und tue danach emotional beschäftigt.",
        scores: { green: 1, chaos: 2, disaster: 0 }
      },
      {
        text: "Ich antworte mit einem Meme. Worte sind overrated.",
        scores: { green: 0, chaos: 2, disaster: 1 }
      },
      {
        text: "Sprachnachricht? Also so richtig mit Ton? Mutig.",
        scores: { green: 0, chaos: 1, disaster: 3 }
      }
    ],
    primaryLabel: "Weiter zur Wahrheit"
  },
  {
    type: "question",
    badge: "🫠",
    eyebrow: "Runde 2",
    title: "Was ist dein größtes Dating-Laster?",
    copy: "Keine Sorge. Ich sammle Red Flags nur ästhetisch.",
    options: [
      {
        text: "Ich komme immer pünktlich. Ja, ich weiß. Unerträglich vorbildlich.",
        scores: { green: 3, chaos: 0, disaster: 0 }
      },
      {
        text: "Ich sage 'bin gleich da' und befinde mich noch unter der Dusche.",
        scores: { green: 0, chaos: 3, disaster: 1 }
      },
      {
        text: "Ich flirte besser in Textform als in Echtzeit. Live-Version folgt später.",
        scores: { green: 1, chaos: 2, disaster: 0 }
      },
      {
        text: "Ich verschwinde kurz und tauche dann mit Charme wieder auf. Fast wie WLAN.",
        scores: { green: 0, chaos: 1, disaster: 3 }
      }
    ],
    primaryLabel: "Weiter"
  },
  {
    type: "question",
    badge: "🌪️",
    eyebrow: "Runde 3",
    title: "Wie sieht dein ideales Chaos aus?",
    copy: "Hier trennt sich Green Flag von cineastischem Ausnahmezustand.",
    options: [
      {
        text: "Gemeinsam Kaffee holen, draußen sitzen, gesittet lachen.",
        scores: { green: 3, chaos: 0, disaster: 0 }
      },
      {
        text: "Planlos durch die Stadt, dumme Wetten, irgendwo Pommes.",
        scores: { green: 1, chaos: 3, disaster: 0 }
      },
      {
        text: "Irgendwer sagt 'nur kurz' und plötzlich ist es 4 Uhr morgens.",
        scores: { green: 0, chaos: 2, disaster: 2 }
      },
      {
        text: "Ich will eine Romanze, die sich leicht nach schlechter Entscheidung anfühlt.",
        scores: { green: 0, chaos: 1, disaster: 3 }
      }
    ],
    primaryLabel: "Mutig. Weiter."
  },
  {
    type: "question",
    badge: "⏳",
    eyebrow: "Finale Frage",
    title: "Wie ehrlich bist du bei 'Bin gleich da'?",
    copy: "Dies hier entscheidet über deinen sehr offiziellen Beziehungs-TÜV.",
    options: [
      {
        text: "Wenn ich das sage, bin ich praktisch schon vor der Tür.",
        scores: { green: 3, chaos: 0, disaster: 0 }
      },
      {
        text: "Das ist eine poetische Schätzung, keine Uhrzeit.",
        scores: { green: 0, chaos: 3, disaster: 1 }
      },
      {
        text: "Es heißt nur, dass ich mental darüber nachdenke, loszugehen.",
        scores: { green: 0, chaos: 1, disaster: 3 }
      },
      {
        text: "Ich schicke dann immerhin live Standort und kleine Entschuldigungs-Performance.",
        scores: { green: 1, chaos: 2, disaster: 0 }
      }
    ],
    primaryLabel: "Ergebnis freischalten"
  }
];

const outcomes = {
  green: {
    badge: "✨",
    eyebrow: "Ergebnis",
    title: "Green Flag Deluxe",
    copy: "Du wirkst verdammt angenehm. Fast verdächtig angenehm. Mit dir kann man vermutlich wirklich reden, lachen und pünktlich irgendwo auftauchen. Das ist in dieser Wirtschaft selten.",
    meta: "Diagnose: sicher flirtbar, minimal gefährlich, überdurchschnittlich date-tauglich.",
    primaryLabel: "Auf WhatsApp schreiben",
    secondaryLabel: "Nochmal spielen und etwas toxischer antworten",
    shareText: "Hi, ich habe gerade den Persönlichkeitstest gemacht. Ergebnis: Green Flag Deluxe. Ich glaube, wir sollten das bei einem Kaffee überprüfen 😄"
  },
  chaos: {
    badge: "🔥",
    eyebrow: "Ergebnis",
    title: "Charmantes Problem",
    copy: "Du hast Energie von 'könnte mein Lieblingsmensch werden' gemischt mit 'ich sollte vielleicht einen Helm tragen'. Genau die Art Risiko, die noch Spaß macht.",
    meta: "Diagnose: leicht chaotisch, sehr unterhaltsam, mit hohem Wiedersehen-Potenzial.",
    primaryLabel: "Auf WhatsApp schreiben",
    secondaryLabel: "Test wiederholen und unschuldiger wirken",
    shareText: "Hi, ich habe gerade den Persönlichkeitstest gemacht. Ergebnis: Charmantes Problem. Klingt riskant genug, um spannend zu sein 😄"
  },
  disaster: {
    badge: "🚨",
    eyebrow: "Ergebnis",
    title: "Certified Disaster mit Potenzial",
    copy: "Du bist nicht unbedingt eine Red Flag. Eher eine ganze Leuchtreklame mit guter Playlist. Das ist objektiv kompliziert, aber leider auch ein bisschen interessant.",
    meta: "Diagnose: emotional leicht brennbar, trotzdem schwer ignorierbar.",
    primaryLabel: "Auf WhatsApp schreiben",
    secondaryLabel: "Nochmal spielen und diesmal weniger ehrlich sein",
    shareText: "Hi, ich habe gerade den Persönlichkeitstest gemacht. Ergebnis: Certified Disaster mit Potenzial. Ich bin leicht besorgt, aber trotzdem interessiert 😄"
  },
  rejection: {
    badge: "💔",
    eyebrow: "Bonus-Ende",
    title: "Game Over",
    copy: "Zu viel Charme, zu wenig TÜV. Ich respektiere das Chaos aus sicherer Entfernung.",
    meta: "Abschlussnotiz: Fenster schließen, kurz reflektieren, dann vielleicht trotzdem nochmal schreiben.",
    primaryLabel: "Okay, gib mir eine zweite Chance",
    secondaryLabel: "Nochmal spielen"
  }
};

const state = {
  currentStep: 0,
  answers: [],
  selectedOption: null,
  resultKey: null
};

const WHATSAPP_NUMBER = "491706873202";
const TRACKING_ID = "G-5YLD0LB28R";
const STREAM_MESSAGE_ID_KEY = "telegram_stream_message_id";
const STREAM_EVENTS_KEY = "telegram_stream_events";
const STREAM_FINISHED_KEY = "telegram_stream_finished";
let lastTrackedView = "";
let hasTrackedQuizStart = false;
let hasTrackedCompletion = false;
let streamEvents = [];
let streamMessageId = null;
let streamFinished = false;
let streamUpdateQueue = Promise.resolve();

const titleEl = document.getElementById("title");
const eyebrowEl = document.getElementById("eyebrow");
const copyEl = document.getElementById("copy");
const badgeEl = document.getElementById("badge");
const optionsEl = document.getElementById("options");
const primaryButton = document.getElementById("primaryButton");
const progressBar = document.getElementById("progressBar");
const progressDots = document.getElementById("progressDots");
const card = document.getElementById("card");

function getDisplayName() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("id")?.trim();
  if (!raw) return "du";
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function computeResult() {
  const totals = state.answers.reduce(
    (sum, answer) => ({
      green: sum.green + answer.green,
      chaos: sum.chaos + answer.chaos,
      disaster: sum.disaster + answer.disaster
    }),
    { green: 0, chaos: 0, disaster: 0 }
  );

  if (totals.disaster >= 9) {
    return "rejection";
  }

  if (totals.green >= totals.chaos && totals.green >= totals.disaster) {
    return "green";
  }

  if (totals.disaster > totals.green && totals.disaster >= totals.chaos) {
    return "disaster";
  }

  return "chaos";
}

function getScoreTotals() {
  return state.answers.reduce(
    (sum, answer) => ({
      green: sum.green + answer.green,
      chaos: sum.chaos + answer.chaos,
      disaster: sum.disaster + answer.disaster
    }),
    { green: 0, chaos: 0, disaster: 0 }
  );
}

function trackEvent(eventName, params = {}, streamOptions = {}) {
  streamNotify(eventName, params, streamOptions);

  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, {
    send_to: TRACKING_ID,
    ...params
  });
}

function loadStreamState() {
  try {
    streamMessageId = sessionStorage.getItem(STREAM_MESSAGE_ID_KEY);
    const storedEvents = sessionStorage.getItem(STREAM_EVENTS_KEY);
    streamEvents = storedEvents ? JSON.parse(storedEvents) : [];
    streamFinished = sessionStorage.getItem(STREAM_FINISHED_KEY) === "1";
  } catch {
    streamEvents = [];
    streamFinished = false;
  }
}

function saveStreamState() {
  try {
    if (streamMessageId) {
      sessionStorage.setItem(STREAM_MESSAGE_ID_KEY, streamMessageId);
    }
    sessionStorage.setItem(STREAM_EVENTS_KEY, JSON.stringify(streamEvents));
    if (streamFinished) {
      sessionStorage.setItem(STREAM_FINISHED_KEY, "1");
    }
  } catch {
    // ignore storage errors
  }
}

function queueStreamUpdate() {
  streamUpdateQueue = streamUpdateQueue.then(() => sendStreamUpdate()).catch(() => {});
}

async function sendStreamUpdate() {
  const response = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messageId: streamMessageId ? Number(streamMessageId) : undefined,
      path: `${location.pathname}${location.search}`,
      name: getDisplayName(),
      referrer: document.referrer || "direkt",
      events: streamEvents,
      finished: streamFinished
    })
  });

  if (!response.ok) return;

  const data = await response.json().catch(() => null);
  if (data?.messageId && !streamMessageId) {
    streamMessageId = String(data.messageId);
    saveStreamState();
  }
}

function streamNotify(eventName, detail = {}, options = {}) {
  if (streamFinished) return;

  streamEvents.push({
    t: new Date().toISOString(),
    event: eventName,
    ...detail
  });

  if (options.finished) {
    streamFinished = true;
  }

  saveStreamState();
  queueStreamUpdate();
}

function trackView() {
  const step = steps[state.currentStep];
  const isResult = state.currentStep >= steps.length;
  const viewKey = isResult ? `result:${state.resultKey}` : `${step.type}:${state.currentStep}`;

  if (viewKey === lastTrackedView) return;
  lastTrackedView = viewKey;

  if (isResult) {
    const totals = getScoreTotals();
    trackEvent("result_view", {
      result_key: state.resultKey,
      total_green: totals.green,
      total_chaos: totals.chaos,
      total_disaster: totals.disaster,
      answered_questions: state.answers.length
    });

    if (!hasTrackedCompletion) {
      hasTrackedCompletion = true;
      trackEvent("quiz_completed", {
        result_key: state.resultKey,
        answered_questions: state.answers.length
      });
    }
    return;
  }

  if (step.type === "intro") {
    trackEvent("intro_view", {
      step_index: state.currentStep
    });
    return;
  }

  trackEvent("question_view", {
    question_index: state.currentStep,
    question_title: step.title
  });
}

function getProgressValue() {
  if (state.currentStep === 0) return 20;
  if (state.currentStep >= steps.length) return 100;
  return ((state.currentStep + 1) / steps.length) * 100;
}

function renderDots() {
  progressDots.innerHTML = "";
  for (let i = 0; i < steps.length; i += 1) {
    const dot = document.createElement("span");
    if (i === Math.min(state.currentStep, steps.length - 1)) {
      dot.classList.add("is-active");
    }
    progressDots.appendChild(dot);
  }
}

function renderOptions(step) {
  optionsEl.innerHTML = "";

  if (!step.options) return;

  step.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option";
    if (state.selectedOption === index) {
      button.classList.add("is-selected");
    }

    button.innerHTML = `
      <span class="option-bullet" aria-hidden="true"></span>
      <span class="option-label">${option.text}</span>
    `;

    button.addEventListener("click", () => {
      state.selectedOption = index;
      trackEvent("answer_selected", {
        question_index: state.currentStep,
        question_title: step.title,
        answer_index: index,
        answer_text: option.text
      });
      render();
    });

    optionsEl.appendChild(button);
  });
}

function renderResult() {
  const result = outcomes[state.resultKey];
  card.dataset.mode = state.resultKey === "rejection" ? "result-rejection" : "result";

  badgeEl.textContent = result.badge;
  eyebrowEl.textContent = result.eyebrow;
  titleEl.textContent = result.title;
  copyEl.textContent = result.copy;
  optionsEl.innerHTML = `<div class="result-meta">${result.meta}</div>`;
  primaryButton.textContent = result.primaryLabel;
  primaryButton.disabled = false;
  primaryButton.classList.toggle("is-whatsapp", state.resultKey !== "rejection");
}

function renderStep() {
  const step = steps[state.currentStep];
  card.dataset.mode = step.type;

  badgeEl.textContent = step.badge;
  eyebrowEl.textContent = step.eyebrow;
  titleEl.textContent = typeof step.title === "function" ? step.title(getDisplayName()) : step.title;
  copyEl.textContent = step.copy;
  primaryButton.textContent = step.primaryLabel;
  primaryButton.disabled = step.type === "question" && state.selectedOption === null;
  primaryButton.classList.remove("is-whatsapp");

  renderOptions(step);
}

function render() {
  card.classList.remove("fade-in");
  void card.offsetWidth;
  card.classList.add("fade-in");

  progressBar.style.width = `${getProgressValue()}%`;
  renderDots();

  if (state.currentStep >= steps.length) {
    renderResult();
    trackView();
    return;
  }

  renderStep();
  trackView();
}

function openResultWhatsApp() {
  const result = outcomes[state.resultKey];
  if (!result?.shareText) return;

  const text = encodeURIComponent(result.shareText);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  trackEvent("whatsapp_cta_click", {
    result_key: state.resultKey,
    destination: "whatsapp",
    phone_suffix: WHATSAPP_NUMBER.slice(-4)
  }, { finished: true });
  window.open(url, "_blank", "noopener,noreferrer");
}

function goToNextStep() {
  if (state.currentStep === 0) {
    if (!hasTrackedQuizStart) {
      hasTrackedQuizStart = true;
      trackEvent("quiz_started", {
        total_questions: steps.filter((step) => step.type === "question").length
      });
    }

    trackEvent("intro_cta_click", {
      cta_label: steps[0].primaryLabel
    });
    state.currentStep += 1;
    state.selectedOption = null;
    render();
    return;
  }

  if (state.currentStep < steps.length) {
    const step = steps[state.currentStep];
    if (step.type === "question" && state.selectedOption !== null) {
      state.answers.push(step.options[state.selectedOption].scores);
      state.currentStep += 1;
      state.selectedOption = null;

      if (state.currentStep >= steps.length) {
        state.resultKey = computeResult();
      }

      render();
    }
    return;
  }

  openResultWhatsApp();
}

function resetFlow() {
  trackEvent("quiz_reset", {
    previous_result: state.resultKey
  });
  state.currentStep = 0;
  state.answers = [];
  state.selectedOption = null;
  state.resultKey = null;
  lastTrackedView = "";
  hasTrackedQuizStart = false;
  hasTrackedCompletion = false;
  render();
}

primaryButton.addEventListener("click", goToNextStep);

loadStreamState();
if (!streamFinished) {
  streamNotify("page_view", {
    referrer: document.referrer || "direkt"
  });
}
render();
