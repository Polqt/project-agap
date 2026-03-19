import { TRPCError } from "@trpc/server";

export const ApiError = {
  notFound: (resource: string) =>
    new TRPCError({
      code: "NOT_FOUND",
      message: /not found/i.test(resource) ? resource : `${resource} not found.`,
    }),

  forbidden: (reason?: string) =>
    new TRPCError({ code: "FORBIDDEN", message: reason ?? "Access denied." }),

  unauthorized: () =>
    new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required." }),

  badRequest: (message: string) => new TRPCError({ code: "BAD_REQUEST", message }),

  internal: (message: string, cause?: unknown) =>
    new TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause }),
};
