import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * One-time migration: set orgId on all existing records.
 * Run via: npx convex run migrations:backfillOrgId '{"orgId": "scopos"}'
 * Safe to run multiple times (idempotent).
 */
export const backfillOrgId = internalMutation({
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
export const seedAdmin = internalMutation({
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

/**
 * Debug: check what auth sees for the current Clerk user.
 */
export const debugAuth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { error: "no identity" };

    const email = identity.email?.toLowerCase();
    const clerkUserId = identity.subject;

    const byClerk = await ctx.db
      .query("employees")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .first();

    const byEmail = email
      ? await ctx.db
          .query("employees")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first()
      : null;

    return {
      clerkIdentity: {
        subject: clerkUserId,
        email: identity.email,
        emailLower: email,
      },
      foundByClerkId: byClerk ? { id: byClerk._id, email: byClerk.email, orgId: byClerk.orgId } : null,
      foundByEmail: byEmail ? { id: byEmail._id, email: byEmail.email, orgId: byEmail.orgId } : null,
    };
  },
});
