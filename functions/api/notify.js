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

  const message = [
    "Neuer Besuch",
    `Name: ${name}`,
    `Pfad: ${path}`,
    `Referrer: ${referrer}`,
    `Zeit: ${new Date().toISOString()}`,
  ].join("\n");

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });

  if (!telegramResponse.ok) {
    return new Response("Telegram error", { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequest(context) {
  return new Response("Method not allowed", { status: 405 });
}
