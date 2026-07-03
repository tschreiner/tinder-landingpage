/**
 * Local verification for session timeout logic (no Cloudflare API required).
 * Run: node workers/test-session-timeout.mjs
 */

import {
  SESSION_TIMEOUT_MS,
  sessionKey,
  upsertSession,
  finalizeTimedOutSessions,
} from "../functions/lib/session.js";

function createMockKv() {
  const store = new Map();

  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix, cursor }) {
      const keys = [...store.keys()]
        .filter((name) => name.startsWith(prefix))
        .map((name) => ({ name }));

      return { keys, list_complete: true, cursor: undefined };
    },
    _store: store,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const kv = createMockKv();
  const telegramCalls = [];

  const env = {
    SESSIONS: kv,
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_CHAT_ID: "test-chat",
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    telegramCalls.push({ url, body: JSON.parse(init.body) });
    return {
      json: async () => ({ ok: true }),
    };
  };

  try {
    await upsertSession(env, {
      messageId: 42,
      name: "Test",
      path: "/",
      referrer: "direkt",
      metadata: { environment: { label: "Dev", detail: "test" }, ip: "1.2.3.4", userAgent: "test" },
      visits: { total: 1, ip: 1 },
      events: [{ t: "2026-07-03T10:00:00.000Z", event: "page_view" }],
      finished: false,
    });

    assert(kv._store.has(sessionKey(42)), "live session should be stored in KV");

    const stored = JSON.parse(kv._store.get(sessionKey(42)));
    stored.lastActivity = Date.now() - SESSION_TIMEOUT_MS - 1000;
    kv._store.set(sessionKey(42), JSON.stringify(stored));

    const { finalized } = await finalizeTimedOutSessions(env);
    assert(finalized === 1, `expected 1 finalized session, got ${finalized}`);
    assert(!kv._store.has(sessionKey(42)), "timed-out session should be removed from KV");
    assert(telegramCalls.length === 1, "telegram editMessageText should be called once");
    assert(
      telegramCalls[0].body.text.includes("Abgeschlossen"),
      "telegram message should show Abgeschlossen status"
    );
    assert(
      telegramCalls[0].body.text.includes("Session beendet (Inaktivität)"),
      "telegram message should include timeout event"
    );

    await upsertSession(env, {
      messageId: 99,
      name: "Done",
      path: "/",
      referrer: "direkt",
      metadata: { environment: { label: "Dev", detail: "test" }, ip: "1.2.3.4", userAgent: "test" },
      visits: { total: 1, ip: 1 },
      events: [],
      finished: true,
    });

    assert(!kv._store.has(sessionKey(99)), "finished session should not be stored in KV");

    console.log("All session timeout checks passed.");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
