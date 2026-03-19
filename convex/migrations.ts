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

/**
 * Seed the initial super_admin employee (no auth required).
 * Run via: npx convex run migrations:seedAdmin '{"name":"...","email":"...","orgId":"scopos"}'
 */
export const seedAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    title: v.optional(v.string()),
    orgId: v.string(),
  },
  handler: async (ctx, { name, email, title, orgId }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("employees")
      .withIndex("by_org_email", (q) => q.eq("orgId", orgId).eq("email", normalizedEmail))
      .first();
    if (existing) {
      return { id: existing._id, status: "already_exists" };
    }
    const now = Date.now();
    const id = await ctx.db.insert("employees", {
      orgId,
      name,
      email: normalizedEmail,
      title: title ?? "",
      adminRole: "super_admin",
      isActive: true,
      inviteStatus: "none",
      createdAt: now,
      updatedAt: now,
    });
    return { id, status: "created" };
  },
});
