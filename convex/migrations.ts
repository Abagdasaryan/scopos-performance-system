import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * One-time migration: set orgId on all existing records.
 * Run via: npx convex run migrations:backfillOrgId '{"orgId": "scopos"}'
 * Safe to run multiple times (idempotent).
 */
export const backfillOrgId = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    let updated = 0;

    const employees = await ctx.db.query("employees").collect();
    for (const emp of employees) {
      if (!emp.orgId) {
        await ctx.db.patch(emp._id, { orgId });
        updated++;
      }
    }

    const evaluations = await ctx.db.query("evaluations").collect();
    for (const ev of evaluations) {
      if (!ev.orgId) {
        await ctx.db.patch(ev._id, { orgId });
        updated++;
      }
    }

    const cycles = await ctx.db.query("reviewCycles").collect();
    for (const cycle of cycles) {
      if (!cycle.orgId) {
        await ctx.db.patch(cycle._id, { orgId });
        updated++;
      }
    }

    return { updated };
  },
});
