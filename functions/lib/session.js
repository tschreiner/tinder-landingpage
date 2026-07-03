import { buildMessage, callTelegram, createTimeoutEvent } from "./telegram.js";

export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
export const SESSION_KEY_PREFIX = "session:";

export function sessionKey(messageId) {
  return `${SESSION_KEY_PREFIX}${messageId}`;
}

export async function upsertSession(env, session) {
  if (!env.SESSIONS) return;

  const { messageId, finished } = session;
  if (!Number.isFinite(messageId)) return;

  const key = sessionKey(messageId);

  if (finished) {
    await env.SESSIONS.delete(key);
    return;
  }

  await env.SESSIONS.put(
    key,
    JSON.stringify({
      ...session,
      finished: false,
      lastActivity: Date.now(),
    })
  );
}

async function listAllSessionKeys(kv) {
  const keys = [];
  let cursor;

  do {
    const page = await kv.list({ prefix: SESSION_KEY_PREFIX, cursor });
    keys.push(...page.keys.map((entry) => entry.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return keys;
}

export async function finalizeTimedOutSessions(env) {
  if (!env.SESSIONS) return { finalized: 0 };

  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("Telegram not configured");
  }

  const now = Date.now();
  const keys = await listAllSessionKeys(env.SESSIONS);
  let finalized = 0;

  for (const key of keys) {
    try {
      const raw = await env.SESSIONS.get(key);
      if (!raw) continue;

      const session = JSON.parse(raw);
      if (session.finished) {
        await env.SESSIONS.delete(key);
        continue;
      }

      if (now - session.lastActivity < SESSION_TIMEOUT_MS) {
        continue;
      }

      const events = [...(session.events || []), createTimeoutEvent()];
      const message = buildMessage({
        name: session.name,
        path: session.path,
        referrer: session.referrer,
        metadata: session.metadata,
        visits: session.visits,
        events,
        finished: true,
      });

      await callTelegram(env, "editMessageText", {
        chat_id: chatId,
        message_id: session.messageId,
        text: message,
      });

      await env.SESSIONS.delete(key);
      finalized += 1;
    } catch (error) {
      console.error(`Failed to finalize session ${key}:`, error);
    }
  }

  return { finalized };
}
