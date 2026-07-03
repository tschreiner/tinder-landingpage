const ALLOWED_HOSTS = new Set([
  "eddydate.com",
  "www.eddydate.com",
  "127.0.0.1",
  "localhost",
]);

const RESULT_LABELS = {
  green: "Green Flag Deluxe",
  chaos: "Charmantes Problem",
  disaster: "Certified Disaster",
  rejection: "Game Over",
};

const EVENT_LABELS = {
  page_view: "Seite geöffnet",
  quiz_started: "Quiz gestartet",
  intro_cta_click: "Intro-Button geklickt",
  answer_selected: "Antwort gewählt",
  quiz_completed: "Quiz abgeschlossen",
  result_view: "Ergebnis angezeigt",
  whatsapp_cta_click: "WhatsApp geklickt",
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

function parseClientIpFromCf(clientIp) {
  if (typeof clientIp !== "string" || !clientIp.trim()) return null;

  const ipv6Match = clientIp.match(/\[(?<ip>[^\]]+)\](?::\d+)?$/);
  if (ipv6Match?.groups?.ip) return ipv6Match.groups.ip;

  const ipv4Match = clientIp.match(/^(?<ip>\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (ipv4Match?.groups?.ip) return ipv4Match.groups.ip;

  const genericV6 = clientIp.match(/\[(?<ip>[^\]]+)\]:\d+/);
  if (genericV6?.groups?.ip) return genericV6.groups.ip;

  const genericV4 = clientIp.match(/^(?<ip>[^:]+):\d+$/);
  if (genericV4?.groups?.ip && genericV4.groups.ip.includes(".")) {
    return genericV4.groups.ip;
  }

  return clientIp.includes(":") ? null : clientIp;
}

function getClientIp(request) {
  const cf = request.cf || {};

  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Real-IP") ||
    parseClientIpFromCf(cf.clientIp) ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unbekannt"
  );
}

function getEnvironment(request, env = {}) {
  const host = getRequestHost(request)?.toLowerCase();

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return { label: "Dev", detail: "lokal" };
  }

  if (host === "eddydate.com" || host === "www.eddydate.com") {
    return { label: "Prod", detail: host };
  }

  if (host.endsWith(".pages.dev")) {
    return { label: "Dev", detail: "preview" };
  }

  const pagesUrl = typeof env.CF_PAGES_URL === "string" ? env.CF_PAGES_URL.toLowerCase() : "";
  if (pagesUrl.includes(".pages.dev")) {
    return { label: "Dev", detail: "preview" };
  }

  return { label: "Dev", detail: host };
}

function getRequestMetadata(request, env = {}) {
  const cf = request.cf || {};
  const ip = getClientIp(request);
  const userAgent = request.headers.get("User-Agent") || "unbekannt";
  const environment = getEnvironment(request, env);

  return {
    ip,
    userAgent,
    environment,
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
  return typeof event.t === "string" ? event.t.slice(11, 19) : "??:??:??";
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

function formatMetadataBlock(metadata, visits) {
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

  const ipLine = `IP: ${metadata.ip}`;
  const coloPart = metadata.colo ? ` · Colo: ${metadata.colo}` : "";
  const uaShort = shortenUserAgent(metadata.userAgent);

  let visitsText = "—";
  if (visits.total !== null && visits.ip !== null) {
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

function buildMessage({ name, path, referrer, metadata, visits, events, finished }) {
  const status = finished ? "Abgeschlossen" : "Live";
  const safeName = escapeHtml(name);
  const safePath = escapeHtml(path);
  const safeReferrer = escapeHtml(referrer);
  const envLabel = escapeHtml(metadata.environment?.label || "Dev");
  const envDetail = escapeHtml(metadata.environment?.detail || "unbekannt");
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

async function callTelegram(env, method, payload) {
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

  const metadata = getRequestMetadata(request, env);
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
  });

  try {
    if (Number.isFinite(messageId)) {
      await callTelegram(env, "editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: message,
      });

      return new Response(JSON.stringify({ ok: true, messageId }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await callTelegram(env, "sendMessage", {
      chat_id: chatId,
      text: message,
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
