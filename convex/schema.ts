import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  evaluations: defineTable({
    orgId: v.string(),
    roleType: v.string(),
    empName: v.string(),
    empPosition: v.string(),
    reviewer: v.string(),
    reviewDate: v.string(),
    reviewPeriod: v.string(),
    empProject: v.string(),
    skillRatings: v.record(v.string(), v.union(v.float64(), v.null())),
    valueRatings: v.record(v.string(), v.union(v.float64(), v.null())),
    operationalMetrics: v.record(
      v.string(),
      v.union(v.float64(), v.string(), v.null())
    ),
    authorityLevel: v.optional(v.string()),
    deficiencyPlan: v.optional(
      v.array(
        v.object({
          gap: v.string(),
          action: v.string(),
          target: v.string(),
          deadline: v.string(),
        })
      )
    ),
    managerNotes: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("reviewed"),
      v.literal("finalized")
    ),
    createdBy: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
    reviewerId: v.optional(v.id("employees")),
    cycleId: v.optional(v.id("reviewCycles")),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_role", ["roleType"])
    .index("by_status", ["status"])
    .index("by_employee", ["empName"])
    .index("by_reviewer", ["reviewer"])
    .index("by_date", ["reviewDate"])
    .index("by_role_status", ["roleType", "status"])
    .index("by_created", ["createdAt"])
    .index("by_employee_id", ["employeeId"])
    .index("by_reviewer_id", ["reviewerId"])
    .index("by_org", ["orgId"])
    .index("by_cycle", ["cycleId"]),

  employees: defineTable({
    orgId: v.string(),
    name: v.string(),
    email: v.string(),
    title: v.string(),
    department: v.optional(v.string()),
    roleType: v.optional(v.string()),
    managerId: v.optional(v.id("employees")),
    adminRole: v.string(),
    isActive: v.boolean(),
    hireDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
    clerkUserId: v.optional(v.string()),
    inviteStatus: v.optional(v.string()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_active", ["orgId", "isActive"])
    .index("by_org_email", ["orgId", "email"])
    .index("by_email", ["email"])
    .index("by_manager", ["managerId"])
    .index("by_department", ["department"])
    .index("by_role", ["roleType"])
    .index("by_active", ["isActive"])
    .index("by_clerk_user", ["clerkUserId"]),

  reviewCycles: defineTable({
    orgId: v.string(),
    name: v.string(),
    period: v.string(),
    startDate: v.string(),
    dueDate: v.string(),
    status: v.string(),
    selectedEmployeeIds: v.array(v.id("employees")),
    createdBy: v.id("employees"),
    metadata: v.optional(v.any()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
});
