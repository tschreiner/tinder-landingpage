const RESULT_LABELS = {
  green: "Green Flag Deluxe",
  chaos: "Charmantes Problem",
  disaster: "Certified Disaster",
  rejection: "Game Over",
};

export const EVENT_LABELS = {
  page_view: "Seite geöffnet",
  quiz_started: "Quiz gestartet",
  intro_cta_click: "Intro-Button geklickt",
  answer_selected: "Antwort gewählt",
  quiz_completed: "Quiz abgeschlossen",
  result_view: "Ergebnis angezeigt",
  whatsapp_cta_click: "WhatsApp geklickt",
  quiz_reset: "Quiz neu gestartet",
  session_timeout: "Session beendet (Inaktivität)",
};

const TELEGRAM_TEXT_LIMIT = 4096;

function escapeHtml(text) {
  if (typeof text !== "string") return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeText(value, maxLength = 120) {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function shortenUserAgent(userAgent) {
  if (!userAgent || userAgent === "unbekannt") return "unbekannt";

  let browser = "Browser";
  let os = "OS";

  if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("Firefox/")) browser = "Firefox";
  else if (userAgent.includes("Chrome/")) browser = "Chrome";
  else if (userAgent.includes("Safari/")) browser = "Safari";

  if (userAgent.includes("Windows")) os = "Win";
  else if (userAgent.includes("Mac OS")) os = "Mac";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Linux")) os = "Linux";

  return sanitizeText(`${browser}/${os}`, 60);
}

function formatTime(event) {
  if (typeof event?.t !== "string") return "??:??:??";

  const parsed = new Date(event.t);
  if (Number.isNaN(parsed.getTime())) return "??:??:??";

  return parsed.toISOString().slice(11, 19);
}

function shortenQuestionTitle(title) {
  if (!title) return "Frage";

  const sanitized = sanitizeText(title, 80);
  const beforeQuestion = sanitized.split("?")[0].trim();

  if (beforeQuestion.length > 0 && beforeQuestion.length < sanitized.length) {
    return sanitizeText(beforeQuestion, 40);
  }

  return sanitizeText(sanitized, 40);
}

function compressEvents(events) {
  if (!Array.isArray(events)) return [];

  const hasResultView = events.some((event) => event.event === "result_view");

  return events.filter((event, index, allEvents) => {
    const type = event.event;

    if (type === "intro_view" || type === "question_view") return false;
    if (type === "quiz_completed" && hasResultView) return false;

    if (type === "intro_cta_click" && allEvents[index - 1]?.event === "quiz_started") {
      return false;
    }

    return true;
  });
}

function formatMetadataBlock(metadata = {}, visits = {}) {
  const locationParts = [metadata.city, metadata.region].filter(Boolean);
  let locationLine = locationParts.length > 0 ? locationParts.join(", ") : "unbekannt";

  if (metadata.country) {
    locationLine += ` · ${metadata.country}`;
  }

  if (metadata.timezone) {
    locationLine += ` · ${metadata.timezone}`;
  }

  if (metadata.latitude != null && metadata.longitude != null) {
    locationLine += ` · ${metadata.latitude}, ${metadata.longitude}`;
  }

  const ipLine = `IP: ${metadata.ip || "unbekannt"}`;
  const coloPart = metadata.colo ? ` · Colo: ${metadata.colo}` : "";
  const uaShort = shortenUserAgent(metadata.userAgent);

  let visitsText = "—";
  if (visits.total !== null && visits.total !== undefined && visits.ip !== null && visits.ip !== undefined) {
    visitsText = `${visits.total} gesamt (${visits.ip}× diese IP)`;
  }

  return [
    escapeHtml(locationLine),
    `${escapeHtml(ipLine)}${escapeHtml(coloPart)}`,
    `${escapeHtml(uaShort)} · Besuche: ${escapeHtml(visitsText)}`,
  ];
}

function formatTimeline(events) {
  const lines = [];

  for (const event of compressEvents(events)) {
    const time = formatTime(event);

    switch (event.event) {
      case "page_view": {
        const ref =
          event.referrer && event.referrer !== "direkt"
            ? ` · ${escapeHtml(sanitizeText(event.referrer, 60))}`
            : "";
        lines.push(`${time}  Seite geöffnet${ref}`);
        break;
      }
      case "quiz_started":
        lines.push(`${time}  Quiz gestartet`);
        break;
      case "answer_selected": {
        const questionNumber = event.question_index ?? "?";
        const title = escapeHtml(shortenQuestionTitle(event.question_title));
        const answer = escapeHtml(sanitizeText(event.answer_text, 100));

        lines.push(`${time}  <b>F${questionNumber}</b> · ${title}`);
        if (answer) {
          lines.push(`       ↳ ${answer}`);
        }
        break;
      }
      case "result_view": {
        const label = RESULT_LABELS[event.result_key] || event.result_key || "unbekannt";
        lines.push(`${time}  Ergebnis: ${escapeHtml(label)}`);
        break;
      }
      case "whatsapp_cta_click":
        lines.push(`${time}  WhatsApp geklickt ✓`);
        break;
      case "quiz_reset":
        lines.push(`${time}  Quiz neu gestartet`);
        break;
      default: {
        const label = EVENT_LABELS[event.event] || event.event || "Event";
        lines.push(`${time}  ${escapeHtml(label)}`);
      }
    }
  }

  return lines;
}

export function buildMessage({ name, path, referrer, metadata = {}, visits = {}, events = [], finished }) {
  const status = finished ? "Abgeschlossen" : "Live";
  const safeName = escapeHtml(sanitizeText(name, 60) || "unbekannt");
  const safePath = escapeHtml(sanitizeText(path, 240) || "/");
  const safeReferrer = escapeHtml(sanitizeText(referrer, 240) || "direkt");
  const envLabel = escapeHtml(sanitizeText(metadata.environment?.label, 40) || "Dev");
  const envDetail = sanitizeText(metadata.environment?.detail, 80) || "unbekannt";
  const siteLabel =
    metadata.environment?.label === "Prod" ? "eddydate.com" : `eddydate.com (${envDetail})`;

  const staticParts = [
    `<b>Neuer Besuch auf ${escapeHtml(siteLabel)}</b>`,
    `<i>${status}</i> · <b>${envLabel}</b> · ${safeName} · ${safePath}`,
    "",
    "<b>Besucher</b>",
    `Name: ${safeName} · Referrer: ${safeReferrer}`,
    "",
    "<b>Standort &amp; Technik</b>",
    ...formatMetadataBlock(metadata, visits),
    "",
    "<b>Ablauf</b>",
  ];

  const timelineLines = formatTimeline(events);
  let message = [...staticParts, ...timelineLines].join("\n");

  if (message.length > TELEGRAM_TEXT_LIMIT) {
    const staticBlock = staticParts.join("\n");
    const trimmedTimeline = [];

    for (let index = timelineLines.length - 1; index >= 0; index -= 1) {
      const candidate = [timelineLines[index], ...trimmedTimeline];
      const candidateMessage = `${staticBlock}\n${candidate.join("\n")}\n<i>…(ältere Events gekürzt)</i>`;

      if (candidateMessage.length <= TELEGRAM_TEXT_LIMIT) {
        trimmedTimeline.unshift(timelineLines[index]);
      } else {
        break;
      }
    }

    message = `${staticBlock}\n${trimmedTimeline.join("\n")}\n<i>…(ältere Events gekürzt)</i>`;
  }

  return message.slice(0, TELEGRAM_TEXT_LIMIT);
}

export async function callTelegram(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...payload,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (data.ok) {
    return data;
  }

  if (method === "editMessageText" && data.description?.includes("message is not modified")) {
    return data;
  }

  const description = typeof data.description === "string" ? `: ${data.description}` : "";
  throw new Error(`Telegram ${method} failed${description}`);
}

export function createTimeoutEvent() {
  return {
    t: new Date().toISOString(),
    event: "session_timeout",
  };
}
