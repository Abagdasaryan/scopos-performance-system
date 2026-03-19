import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireEmployee, requireRole } from "./auth";

// ── Mutations ──────────────────────────────────────────────────────────────────

export const createEvaluation = mutation({
  args: { roleType: v.string() },
  handler: async (ctx, { roleType }) => {
    const employee = await requireEmployee(ctx);
    const now = Date.now();
    return await ctx.db.insert("evaluations", {
      roleType,
      orgId: employee.orgId,
      empName: "",
      empPosition: "",
      reviewer: "",
      reviewDate: "",
      reviewPeriod: "",
      empProject: "",
      skillRatings: {},
      valueRatings: {},
      operationalMetrics: {},
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEmployeeInfo = mutation({
  args: {
    id: v.id("evaluations"),
    empName: v.optional(v.string()),
    empPosition: v.optional(v.string()),
    reviewer: v.optional(v.string()),
    reviewDate: v.optional(v.string()),
    reviewPeriod: v.optional(v.string()),
    empProject: v.optional(v.string()),
    managerNotes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const employee = await requireEmployee(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Evaluation not found");
    if (doc.orgId !== employee.orgId) throw new Error("Evaluation not found");
    if (doc.status === "finalized") throw new Error("Cannot edit a finalized evaluation");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    await ctx.db.patch(id, patch);
  },
});

export const updateSkillRating = mutation({
  args: {
    id: v.id("evaluations"),
    skillId: v.string(),
    rating: v.union(v.float64(), v.null()),
  },
  handler: async (ctx, { id, skillId, rating }) => {
    const employee = await requireEmployee(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Evaluation not found");
    if (doc.orgId !== employee.orgId) throw new Error("Evaluation not found");
    if (doc.status === "finalized") throw new Error("Cannot edit a finalized evaluation");
    const skillRatings = { ...doc.skillRatings, [skillId]: rating };
    await ctx.db.patch(id, { skillRatings, updatedAt: Date.now() });
  },
});

export const updateValueRating = mutation({
  args: {
    id: v.id("evaluations"),
    valueId: v.string(),
    rating: v.union(v.float64(), v.null()),
  },
  handler: async (ctx, { id, valueId, rating }) => {
    const employee = await requireEmployee(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Evaluation not found");
    if (doc.orgId !== employee.orgId) throw new Error("Evaluation not found");
    if (doc.status === "finalized") throw new Error("Cannot edit a finalized evaluation");
    const valueRatings = { ...doc.valueRatings, [valueId]: rating };
    await ctx.db.patch(id, { valueRatings, updatedAt: Date.now() });
  },
});

export const updateMetric = mutation({
  args: {
    id: v.id("evaluations"),
    metricId: v.string(),
    value: v.union(v.float64(), v.string(), v.null()),
  },
  handler: async (ctx, { id, metricId, value }) => {
    const employee = await requireEmployee(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Evaluation not found");
    if (doc.orgId !== employee.orgId) throw new Error("Evaluation not found");
    if (doc.status === "finalized") throw new Error("Cannot edit a finalized evaluation");
    const operationalMetrics = { ...doc.operationalMetrics, [metricId]: value };
    await ctx.db.patch(id, { operationalMetrics, updatedAt: Date.now() });
  },
});

export const updateAuthorityLevel = mutation({
  args: {
    id: v.id("evaluations"),
    level: v.string(),
  },
  handler: async (ctx, { id, level }) => {
    const employee = await requireEmployee(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Evaluation not found");
    if (doc.orgId !== employee.orgId) throw new Error("Evaluation not found");
    if (doc.status === "finalized") throw new Error("Cannot edit a finalized evaluation");
    await ctx.db.patch(id, { authorityLevel: level, updatedAt: Date.now() });
  },
});

export const updateDeficiencyPlan = mutation({
  args: {
    id: v.id("evaluations"),
    rows: v.array(
      v.object({
        gap: v.string(),
        action: v.string(),
        target: v.string(),
        deadline: v.string(),
      })
    ),
  },
  handler: async (ctx, { id, rows }) => {
    const employee = await requireEmployee(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Evaluation not found");
    if (doc.orgId !== employee.orgId) throw new Error("Evaluation not found");
    if (doc.status === "finalized") throw new Error("Cannot edit a finalized evaluation");
    await ctx.db.patch(id, { deficiencyPlan: rows, updatedAt: Date.now() });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("evaluations"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("reviewed"),
      v.literal("finalized")
    ),
  },
  handler: async (ctx, { id, status }) => {
    const employee = await requireEmployee(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Evaluation not found");
    if (doc.orgId !== employee.orgId) throw new Error("Evaluation not found");
    const isAdmin = ["super_admin", "hr_admin"].includes(employee.adminRole);
    const isReviewer = doc.reviewerId && doc.reviewerId === employee._id;
    if (!isAdmin && !isReviewer) throw new Error("Insufficient permissions");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

export const deleteEvaluation = mutation({
  args: { id: v.id("evaluations") },
  handler: async (ctx, { id }) => {
    const admin = await requireRole(ctx, ["super_admin", "hr_admin"]);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Evaluation not found");
    if (doc.orgId !== admin.orgId) throw new Error("Evaluation not found");
    await ctx.db.delete(id);
  },
});

// ── Queries ────────────────────────────────────────────────────────────────────

export const getEvaluation = query({
  args: { id: v.id("evaluations") },
  handler: async (ctx, { id }) => {
    const caller = await requireEmployee(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.orgId !== caller.orgId) return null;
    return doc;
  },
});

export const createEvaluationForEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    roleType: v.string(),
    cycleId: v.optional(v.id("reviewCycles")),
  },
  handler: async (ctx, { employeeId, roleType, cycleId }) => {
    const currentEmployee = await requireEmployee(ctx);
    const reviewerId = currentEmployee._id;
    const emp = await ctx.db.get(employeeId);
    if (!emp) throw new Error("Employee not found");
    if (emp.orgId !== currentEmployee.orgId) throw new Error("Employee not found");
    const reviewer = await ctx.db.get(reviewerId);
    if (!reviewer) throw new Error("Reviewer not found");

    const now = Date.now();
    return await ctx.db.insert("evaluations", {
      roleType,
      orgId: currentEmployee.orgId,
      empName: emp.name,
      empPosition: emp.title,
      reviewer: reviewer.name,
      reviewDate: "",
      reviewPeriod: "",
      empProject: "",
      skillRatings: {},
      valueRatings: {},
      operationalMetrics: {},
      status: "draft",
      employeeId,
      reviewerId,
      cycleId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listEvaluations = query({
  args: {
    roleType: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("reviewed"),
        v.literal("finalized")
      )
    ),
    empName: v.optional(v.string()),
    reviewer: v.optional(v.string()),
  },
  handler: async (ctx, { roleType, status, empName, reviewer }) => {
    const employee = await requireEmployee(ctx);
    let q;

    if (roleType && status) {
      q = ctx.db
        .query("evaluations")
        .withIndex("by_role_status", (q) =>
          q.eq("roleType", roleType).eq("status", status)
        );
    } else if (roleType) {
      q = ctx.db
        .query("evaluations")
        .withIndex("by_role", (q) => q.eq("roleType", roleType));
    } else if (status) {
      q = ctx.db
        .query("evaluations")
        .withIndex("by_status", (q) => q.eq("status", status));
    } else if (empName) {
      q = ctx.db
        .query("evaluations")
        .withIndex("by_employee", (q) => q.eq("empName", empName));
    } else if (reviewer) {
      q = ctx.db
        .query("evaluations")
        .withIndex("by_reviewer", (q) => q.eq("reviewer", reviewer));
    } else {
      q = ctx.db.query("evaluations").withIndex("by_created");
    }

    const results = await q.collect();

    // Apply remaining filters that weren't used as index
    let filtered = results;
    if (empName && !(roleType === undefined && status === undefined && reviewer === undefined)) {
      filtered = filtered.filter((e) => e.empName === empName);
    }
    if (reviewer && !(roleType === undefined && status === undefined && empName === undefined)) {
      filtered = filtered.filter((e) => e.reviewer === reviewer);
    }

    // Scope to current org
    filtered = filtered.filter((e) => e.orgId === employee.orgId);

    // Sort by createdAt descending
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    return filtered;
  },
});

export const getEvaluationsForEmployee = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, { employeeId }) => {
    const employee = await requireEmployee(ctx);
    const results = await ctx.db
      .query("evaluations")
      .withIndex("by_employee_id", (q) => q.eq("employeeId", employeeId))
      .collect();
    return results.filter((e) => e.orgId === employee.orgId);
  },
});

export const getEvaluationsForReviewer = query({
  args: { reviewerId: v.id("employees") },
  handler: async (ctx, { reviewerId }) => {
    const employee = await requireEmployee(ctx);
    const results = await ctx.db
      .query("evaluations")
      .withIndex("by_reviewer_id", (q) => q.eq("reviewerId", reviewerId))
      .collect();
    return results.filter((e) => e.orgId === employee.orgId);
  },
});

export const getEvaluationsForCycle = query({
  args: { cycleId: v.id("reviewCycles") },
  handler: async (ctx, { cycleId }) => {
    const employee = await requireEmployee(ctx);
    const results = await ctx.db
      .query("evaluations")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect();
    return results.filter((e) => e.orgId === employee.orgId);
  },
});
