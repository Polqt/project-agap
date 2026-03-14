import { publicProcedure, router } from "../index.js";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
});
export type AppRouter = typeof appRouter;
