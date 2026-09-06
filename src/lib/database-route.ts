import "server-only";
import { assertDeploymentConfig } from "./deployment";
import { ensureDemoDatabase } from "./ensure-db";
import { publicDatabaseError } from "../db/config";

/** Consistent, actionable 503 instead of a serverless import crash or redirect loop. */
export function withDatabase<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try { assertDeploymentConfig(); await ensureDemoDatabase(); } catch (error) {
      return Response.json({ ok: false, error: publicDatabaseError(error) }, {
        status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" },
      });
    }
    return handler(...args);
  };
}
