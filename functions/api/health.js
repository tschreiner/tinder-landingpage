export async function onRequestGet(context) {
  const { env } = context;

  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  return new Response(
    JSON.stringify({
      telegram: {
        hasToken: !!token,
        hasChatId: !!chatId,
        tokenLength: typeof token === "string" ? token.length : 0,
        chatIdLength: typeof chatId === "string" ? String(chatId).length : 0,
      },
      bindings: {
        sessions: !!env.SESSIONS,
        visitCounter: !!env.VISIT_COUNTER,
      },
      runtimeKeys: Object.keys(env).sort(),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
