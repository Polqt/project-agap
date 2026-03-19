import { publicProcedure, router } from "../index.js";
import { alertsRouter } from "./alerts.js";
import { barangaysRouter } from "./barangays.js";
import { broadcastsRouter } from "./broadcasts.js";
import { checkInsRouter } from "./checkIns.js";
import { dashboardRouter } from "./dashboard.js";
import { evacuationCentersRouter } from "./evacuationCenters.js";
import { evacuationRoutesRouter } from "./evacuationRoutes.js";
import { householdsRouter } from "./households.js";
import { needsReportsRouter } from "./needsReports.js";
import { profileRouter } from "./profile.js";
import { statusPingsRouter } from "./statusPings.js";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  alerts: alertsRouter,
  barangays: barangaysRouter,
  broadcasts: broadcastsRouter,
  checkIns: checkInsRouter,
  dashboard: dashboardRouter,
  evacuationCenters: evacuationCentersRouter,
  evacuationRoutes: evacuationRoutesRouter,
  households: householdsRouter,
  needsReports: needsReportsRouter,
  profile: profileRouter,
  statusPings: statusPingsRouter,
});
export type AppRouter = typeof appRouter;
