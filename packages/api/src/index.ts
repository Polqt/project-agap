import { initTRPC } from "@trpc/server";

import type { Context } from "./context";
import { ApiError } from "./errors";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

const enforceAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw ApiError.unauthorized();
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

const enforceOfficial = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw ApiError.unauthorized();
  }

  const profile = ctx.profile;

  if (!profile || profile.role !== "official") {
    throw ApiError.forbidden("Official access required.");
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      profile,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuthenticated);
export const officialProcedure = t.procedure.use(enforceOfficial);
