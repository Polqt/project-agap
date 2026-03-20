import { publicProcedure, router } from "../index";
import { alertsRouter } from "./alerts";
import { barangaysRouter } from "./barangays";
import { broadcastsRouter } from "./broadcasts";
import { checkInsRouter } from "./checkIns";
import { dashboardRouter } from "./dashboard";
import { evacuationCentersRouter } from "./evacuationCenters";
import { householdsRouter } from "./households";
import { needsReportsRouter } from "./needsReports";
import { profileRouter } from "./profile";
import { smsLogsRouter } from "./smsLogs";
import { statusPingsRouter } from "./statusPings";

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
  smsLogs: smsLogsRouter,
  statusPings: statusPingsRouter,
});
export type AppRouter = typeof appRouter;
