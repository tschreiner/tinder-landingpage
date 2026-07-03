import { buildMessage, callTelegram } from "../lib/telegram.js";
import { upsertSession } from "../lib/session.js";

const ALLOWED_HOSTS = new Set([
  "eddydate.com",
  "www.eddydate.com",
  "127.0.0.1",
  "localhost",
]);

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

  const sessionData = {
    messageId: null,
    name,
    path,
    referrer,
    metadata,
    visits,
    events,
    finished,
  };

  try {
    if (Number.isFinite(messageId)) {
      await callTelegram(env, "editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: message,
      });

      sessionData.messageId = messageId;
      await upsertSession(env, sessionData);

      return new Response(JSON.stringify({ ok: true, messageId }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await callTelegram(env, "sendMessage", {
      chat_id: chatId,
      text: message,
    });

    const newMessageId = data.result.message_id;
    sessionData.messageId = newMessageId;
    await upsertSession(env, sessionData);

    return new Response(JSON.stringify({ ok: true, messageId: newMessageId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response("Telegram error", { status: 502 });
  }
}

export async function onRequest() {
  return new Response("Method not allowed", { status: 405 });
}
