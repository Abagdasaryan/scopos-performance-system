import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createEmployee = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    title: v.string(),
    department: v.optional(v.string()),
    roleType: v.optional(v.string()),
    managerId: v.optional(v.id("employees")),
    adminRole: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("employees")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (existing) {
      throw new Error(`An employee with email "${normalizedEmail}" already exists.`);
    }
    const now = Date.now();
    return await ctx.db.insert("employees", {
      ...args,
      email: normalizedEmail,
      adminRole: args.adminRole ?? "employee",
      inviteStatus: "none",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEmployee = mutation({
  args: {
    id: v.id("employees"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    title: v.optional(v.string()),
    department: v.optional(v.string()),
    roleType: v.optional(v.string()),
    managerId: v.optional(v.id("employees")),
    adminRole: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    if (fields.email !== undefined) {
      fields.email = fields.email.trim().toLowerCase();
      const existing = await ctx.db
        .query("employees")
        .withIndex("by_email", (q) => q.eq("email", fields.email!))
        .first();
      if (existing && existing._id !== id) {
        throw new Error(`An employee with email "${fields.email}" already exists.`);
      }
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    await ctx.db.patch(id, patch);
  },
});

export const deactivateEmployee = mutation({
  args: { id: v.id("employees") },
  handler: async (ctx, { id }) => {
    const emp = await ctx.db.get(id);
    if (!emp) throw new Error("Employee not found");
    const reports = await ctx.db
      .query("employees")
      .withIndex("by_manager", (q) => q.eq("managerId", id))
      .collect();
    const activeReports = reports.filter((r) => r.isActive);
    if (activeReports.length > 0) {
      throw new Error(
        `Cannot deactivate ${emp.name} — they have ${activeReports.length} active direct reports. Reassign their reports first.`
      );
    }
    await ctx.db.patch(id, { isActive: false, updatedAt: Date.now() });
  },
});

export const getEmployee = query({
  args: { id: v.id("employees") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getAllEmployees = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, { includeInactive }) => {
    if (includeInactive) {
      return await ctx.db.query("employees").collect();
    }
    return await ctx.db
      .query("employees")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const getDirectReports = query({
  args: { managerId: v.id("employees") },
  handler: async (ctx, { managerId }) => {
    return await ctx.db
      .query("employees")
      .withIndex("by_manager", (q) => q.eq("managerId", managerId))
      .collect();
  },
});

export const listEmployees = query({
  args: {
    department: v.optional(v.string()),
    roleType: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { department, roleType, isActive }) => {
    let results;
    if (department) {
      results = await ctx.db
        .query("employees")
        .withIndex("by_department", (q) => q.eq("department", department))
        .collect();
    } else if (isActive !== undefined) {
      results = await ctx.db
        .query("employees")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    } else {
      results = await ctx.db.query("employees").collect();
    }
    if (roleType) {
      results = results.filter((e) => e.roleType === roleType);
    }
    if (isActive !== undefined && department) {
      results = results.filter((e) => e.isActive === isActive);
    }
    return results;
  },
});
