import { finalizeTimedOutSessions } from "../functions/lib/session.js";

export default {
  async scheduled(_event, env, _ctx) {
    try {
      const { finalized } = await finalizeTimedOutSessions(env);
      if (finalized > 0) {
        console.log(`Finalized ${finalized} timed-out session(s)`);
      }
    } catch (error) {
      console.error("Session timeout cron failed:", error);
    }
  },
};
