import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { threadRouter } from "./routes/thread/route";
import { agentRouter } from "./routes/agent/route";

export const serverRouter = router({
  health: healthRouter,
  thread: threadRouter,
  agent: agentRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
