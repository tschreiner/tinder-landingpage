const ALLOWED_HOSTS = new Set([
  "eddydate.com",
  "www.eddydate.com",
  "127.0.0.1",
  "localhost",
]);

const EVENT_LABELS = {
  page_view: "Seite geoeffnet",
  intro_view: "Intro angezeigt",
  quiz_started: "Quiz gestartet",
  intro_cta_click: "Intro-Button geklickt",
  question_view: "Frage angezeigt",
  answer_selected: "Antwort gewaehlt",
  quiz_completed: "Quiz abgeschlossen",
  result_view: "Ergebnis angezeigt",
  whatsapp_cta_click: "WhatsApp-Button geklickt",
  quiz_reset: "Quiz neu gestartet",
};

const TELEGRAM_TEXT_LIMIT = 4096;

function isAllowedHost(hostname) {
  if (!hostname) return false;

  const host = hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  if (host.endsWith(".eddydate-com.pages.dev")) return true;

  return false;
}

function getRequestHost(request) {
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      // ignore invalid origin
    }
  }

  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {
      // ignore invalid referer
    }
  }

  return null;
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unbekannt"
  );
}

function getRequestMetadata(request) {
  const cf = request.cf || {};
  const ip = getClientIp(request);
  const userAgent = request.headers.get("User-Agent") || "unbekannt";

  const geoParts = [cf.city, cf.region, cf.country].filter(Boolean);
  const geo = geoParts.length > 0 ? geoParts.join(", ") : "unbekannt";

  return {
    ip,
    userAgent,
    geo,
    country: cf.country || null,
    region: cf.region || null,
    city: cf.city || null,
    timezone: cf.timezone || null,
    latitude: cf.latitude ?? null,
    longitude: cf.longitude ?? null,
    colo: cf.colo || null,
  };
}

async function incrementVisitCount(env, ip) {
  if (!env.VISIT_COUNTER) {
    return { total: null, ip: null };
  }

  const totalKey = "visits:total";
  const ipKey = `visits:ip:${ip}`;

  const currentTotal = Number.parseInt((await env.VISIT_COUNTER.get(totalKey)) || "0", 10);
  const currentIp = Number.parseInt((await env.VISIT_COUNTER.get(ipKey)) || "0", 10);

  const total = currentTotal + 1;
  const ipCount = currentIp + 1;

  await env.VISIT_COUNTER.put(totalKey, String(total));
  await env.VISIT_COUNTER.put(ipKey, String(ipCount));

  return { total, ip: ipCount };
}

async function getVisitCount(env, ip) {
  if (!env.VISIT_COUNTER) {
    return { total: null, ip: null };
  }

  const total = Number.parseInt((await env.VISIT_COUNTER.get("visits:total")) || "0", 10);
  const ipCount = Number.parseInt((await env.VISIT_COUNTER.get(`visits:ip:${ip}`)) || "0", 10);

  return { total, ip: ipCount };
}

function sanitizeText(value, maxLength = 120) {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function formatEventDetail(event) {
  const details = [];

  if (event.referrer) {
    details.push(`Referrer: ${sanitizeText(event.referrer, 80)}`);
  }

  if (typeof event.question_index === "number") {
    details.push(`Frage ${event.question_index}`);
  }

  if (event.question_title) {
    details.push(`"${sanitizeText(event.question_title, 80)}"`);
  }

  if (event.answer_text) {
    details.push(`Antwort: "${sanitizeText(event.answer_text, 100)}"`);
  }

  if (event.result_key) {
    details.push(`Ergebnis: ${event.result_key}`);
  }

  if (typeof event.answered_questions === "number") {
    details.push(`${event.answered_questions} Fragen beantwortet`);
  }

  if (event.cta_label) {
    details.push(`CTA: "${sanitizeText(event.cta_label, 80)}"`);
  }

  if (event.destination) {
    details.push(`Ziel: ${event.destination}`);
  }

  return details.join(" · ");
}

function formatEventLine(event) {
  const time = typeof event.t === "string" ? event.t.slice(11, 19) : "??:??:??";
  const label = EVENT_LABELS[event.event] || event.event || "event";
  const detail = formatEventDetail(event);

  return detail ? `• ${time} ${label} — ${detail}` : `• ${time} ${label}`;
}

function formatVisitCount(visits) {
  if (visits.total === null || visits.ip === null) {
    return "nicht verfuegbar (KV nicht gebunden)";
  }

  return `${visits.total} gesamt · ${visits.ip} von dieser IP`;
}

function buildMessage({
  name,
  path,
  referrer,
  metadata,
  visits,
  events,
  finished,
  isNewSession,
}) {
  const header = finished ? "Session abgeschlossen" : "Live-Session";
  const lines = [
    header,
    "",
    `Name: ${name}`,
    `Pfad: ${path}`,
    `Referrer: ${referrer}`,
    "",
    "Metadaten",
    `IP: ${metadata.ip}`,
    `Geo: ${metadata.geo}`,
    `Zeitzone: ${metadata.timezone || "unbekannt"}`,
    `Land: ${metadata.country || "unbekannt"}`,
    `Region: ${metadata.region || "unbekannt"}`,
    `Stadt: ${metadata.city || "unbekannt"}`,
    `Koordinaten: ${
      metadata.latitude != null && metadata.longitude != null
        ? `${metadata.latitude}, ${metadata.longitude}`
        : "unbekannt"
    }`,
    `Edge Colo: ${metadata.colo || "unbekannt"}`,
    `User-Agent: ${sanitizeText(metadata.userAgent, 180)}`,
    `Besuche: ${formatVisitCount(visits)}`,
    isNewSession ? "Besuchszaehler: +1 (neue Session)" : "",
    "",
    "Timeline",
  ].filter((line, index) => line !== "" || index < 3);

  const eventLines = Array.isArray(events) ? events.map(formatEventLine) : [];
  let message = [...lines, ...eventLines].join("\n");

  if (message.length > TELEGRAM_TEXT_LIMIT) {
    const staticBlock = lines.join("\n");
    const reserved = staticBlock.length + 40;
    const trimmedEvents = [];

    for (let index = eventLines.length - 1; index >= 0; index -= 1) {
      const candidate = [...trimmedEvents];
      candidate.unshift(eventLines[index]);
      const candidateMessage = `${staticBlock}\n${candidate.join("\n")}\n…(aeltere Events gekuerzt)`;

      if (candidateMessage.length <= TELEGRAM_TEXT_LIMIT) {
        trimmedEvents.unshift(eventLines[index]);
      } else {
        break;
      }
    }

    message = `${staticBlock}\n${trimmedEvents.join("\n")}\n…(aeltere Events gekuerzt)`;
  }

  return message.slice(0, TELEGRAM_TEXT_LIMIT);
}

async function callTelegram(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (data.ok) {
    return data;
  }

  if (method === "editMessageText" && data.description?.includes("message is not modified")) {
    return data;
  }

  throw new Error(`Telegram ${method} failed`);
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!isAllowedHost(getRequestHost(request))) {
    return new Response("Forbidden", { status: 403 });
  }

  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return new Response("Not configured", { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "unbekannt";
  const path = typeof body.path === "string" && body.path.trim() ? body.path.trim() : "/";
  const referrer =
    typeof body.referrer === "string" && body.referrer.trim() ? body.referrer.trim() : "direkt";
  const events = Array.isArray(body.events) ? body.events : [];
  const finished = body.finished === true;
  const messageId = Number.parseInt(body.messageId, 10);

  const metadata = getRequestMetadata(request);
  const isNewSession = !Number.isFinite(messageId);
  const visits = isNewSession
    ? await incrementVisitCount(env, metadata.ip)
    : await getVisitCount(env, metadata.ip);

  const message = buildMessage({
    name,
    path,
    referrer,
    metadata,
    visits,
    events,
    finished,
    isNewSession,
  });

  try {
    if (Number.isFinite(messageId)) {
      await callTelegram(env, "editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: message,
        disable_web_page_preview: true,
      });

      return new Response(JSON.stringify({ ok: true, messageId }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await callTelegram(env, "sendMessage", {
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    });

    return new Response(JSON.stringify({ ok: true, messageId: data.result.message_id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response("Telegram error", { status: 502 });
  }
}

export async function onRequest() {
  return new Response("Method not allowed", { status: 405 });
}
