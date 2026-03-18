import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  evaluations: defineTable({
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
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_role", ["roleType"])
    .index("by_status", ["status"])
    .index("by_employee", ["empName"])
    .index("by_reviewer", ["reviewer"])
    .index("by_date", ["reviewDate"])
    .index("by_role_status", ["roleType", "status"])
    .index("by_created", ["createdAt"]),
});
