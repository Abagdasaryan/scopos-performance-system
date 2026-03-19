import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireEmployee } from "./auth";

export const createReviewCycle = mutation({
  args: {
    name: v.string(),
    period: v.string(),
    startDate: v.string(),
    dueDate: v.string(),
    selectedEmployeeIds: v.array(v.id("employees")),
  },
  handler: async (ctx, args) => {
    const employee = await requireRole(ctx, ["super_admin", "hr_admin"]);
    const now = Date.now();
    return await ctx.db.insert("reviewCycles", {
      ...args,
      orgId: employee.orgId,
      createdBy: employee._id,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReviewCycle = mutation({
  args: {
    id: v.id("reviewCycles"),
    name: v.optional(v.string()),
    period: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    selectedEmployeeIds: v.optional(v.array(v.id("employees"))),
  },
  handler: async (ctx, { id, ...fields }) => {
    const admin = await requireRole(ctx, ["super_admin", "hr_admin"]);
    const cycle = await ctx.db.get(id);
    if (!cycle) throw new Error("Review cycle not found");
    if (cycle.orgId !== admin.orgId) throw new Error("Review cycle not found");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(id, patch);
  },
});

export const closeReviewCycle = mutation({
  args: { id: v.id("reviewCycles") },
  handler: async (ctx, { id }) => {
    const admin = await requireRole(ctx, ["super_admin", "hr_admin"]);
    const cycle = await ctx.db.get(id);
    if (!cycle) throw new Error("Review cycle not found");
    if (cycle.orgId !== admin.orgId) throw new Error("Review cycle not found");
    await ctx.db.patch(id, { status: "closed", updatedAt: Date.now() });
  },
});

export const activateReviewCycle = mutation({
  args: { id: v.id("reviewCycles") },
  handler: async (ctx, { id }) => {
    const admin = await requireRole(ctx, ["super_admin", "hr_admin"]);
    const cycle = await ctx.db.get(id);
    if (!cycle) throw new Error("Review cycle not found");
    if (cycle.orgId !== admin.orgId) throw new Error("Review cycle not found");
    if (cycle.status !== "draft") throw new Error("Only draft cycles can be activated");

    const noManager: string[] = [];
    const noRoleType: string[] = [];
    let created = 0;

    for (const empId of cycle.selectedEmployeeIds) {
      const emp = await ctx.db.get(empId);
      if (!emp || !emp.isActive) continue;

      if (!emp.managerId) {
        noManager.push(emp.name);
        continue;
      }
      if (!emp.roleType) {
        noRoleType.push(emp.name);
        continue;
      }

      const manager = await ctx.db.get(emp.managerId);
      const now = Date.now();
      await ctx.db.insert("evaluations", {
        orgId: admin.orgId,
        roleType: emp.roleType,
        empName: emp.name,
        empPosition: emp.title,
        reviewer: manager?.name ?? "",
        reviewDate: "",
        reviewPeriod: cycle.period,
        empProject: "",
        skillRatings: {},
        valueRatings: {},
        operationalMetrics: {},
        status: "draft",
        employeeId: empId,
        reviewerId: emp.managerId,
        cycleId: id,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    await ctx.db.patch(id, { status: "active", updatedAt: Date.now() });
    return { created, skipped: { noManager, noRoleType } };
  },
});

export const getReviewCycle = query({
  args: { id: v.id("reviewCycles") },
  handler: async (ctx, { id }) => {
    const caller = await requireEmployee(ctx);
    const cycle = await ctx.db.get(id);
    if (!cycle || cycle.orgId !== caller.orgId) return null;
    return cycle;
  },
});

export const listReviewCycles = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const employee = await requireEmployee(ctx);
    if (status) {
      return await ctx.db
        .query("reviewCycles")
        .withIndex("by_org_status", (q) => q.eq("orgId", employee.orgId).eq("status", status))
        .collect();
    }
    const results = await ctx.db
      .query("reviewCycles")
      .withIndex("by_org", (q) => q.eq("orgId", employee.orgId))
      .collect();
    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getCycleProgress = query({
  args: { cycleId: v.id("reviewCycles") },
  handler: async (ctx, { cycleId }) => {
    const caller = await requireEmployee(ctx);
    const cycle = await ctx.db.get(cycleId);
    if (!cycle || cycle.orgId !== caller.orgId) return null;
    const evals = await ctx.db
      .query("evaluations")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect();

    const total = evals.length;
    const completed = evals.filter(
      (e) => e.status === "submitted" || e.status === "finalized"
    ).length;
    const pending = evals.filter((e) => e.status === "draft").length;

    // Group by reviewer
    const byReviewer: Record<string, { name: string; total: number; completed: number }> = {};
    for (const e of evals) {
      const rid = e.reviewerId ? String(e.reviewerId) : "unknown";
      if (!byReviewer[rid]) {
        byReviewer[rid] = { name: e.reviewer, total: 0, completed: 0 };
      }
      byReviewer[rid].total++;
      if (e.status === "submitted" || e.status === "finalized") {
        byReviewer[rid].completed++;
      }
    }

    return {
      total,
      completed,
      pending,
      byReviewer: Object.values(byReviewer),
      evaluations: evals,
    };
  },
});
