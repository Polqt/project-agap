import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

const enforceAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication is required.",
    });
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
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication is required.",
    });
  }

  const profile = ctx.profile;

  if (!profile || profile.role !== "official") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Official access is required.",
    });
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
