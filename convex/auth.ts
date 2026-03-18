import { QueryCtx, MutationCtx, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

export type AuthResult =
  | { status: "authenticated"; employee: Doc<"employees"> }
  | { status: "needs_linking"; employee: Doc<"employees">; clerkUserId: string }
  | { status: "not_activated"; clerkUserId: string };

/**
 * Resolves the current Clerk identity to an employee record.
 * Used by queries (read-only — never writes).
 */
export async function getAuthenticatedEmployee(
  ctx: QueryCtx | MutationCtx
): Promise<AuthResult> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const clerkUserId = identity.subject;

  // 1. Try lookup by clerkUserId (fast path)
  const byClerkId = await ctx.db
    .query("employees")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
    .first();

  if (byClerkId) {
    if (!byClerkId.isActive) {
      throw new Error("Account deactivated");
    }
    return { status: "authenticated", employee: byClerkId };
  }

  // 2. Fallback: match by email (case-insensitive)
  const email = identity.email?.toLowerCase();
  if (!email) {
    return { status: "not_activated", clerkUserId };
  }

  const allByEmail = await ctx.db
    .query("employees")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();

  if (allByEmail) {
    if (!allByEmail.isActive) {
      throw new Error("Account deactivated");
    }
    return { status: "needs_linking", employee: allByEmail, clerkUserId };
  }

  return { status: "not_activated", clerkUserId };
}

/**
 * Requires a fully authenticated + linked employee. Throws otherwise.
 */
export async function requireEmployee(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"employees">> {
  const result = await getAuthenticatedEmployee(ctx);
  if (result.status === "authenticated") {
    return result.employee;
  }
  if (result.status === "needs_linking") {
    throw new Error("Account linking required — call linkClerkUser first");
  }
  throw new Error("Account not activated");
}

/**
 * Requires employee with one of the specified roles.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  roles: string[]
): Promise<Doc<"employees">> {
  const employee = await requireEmployee(ctx);
  if (!roles.includes(employee.adminRole)) {
    throw new Error("Insufficient permissions");
  }
  return employee;
}

/**
 * Links a Clerk user ID to an employee record. Called once on first login.
 */
export const linkClerkUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkUserId = identity.subject;
    const email = identity.email?.toLowerCase();
    if (!email) throw new Error("No email on Clerk account");

    // Check if this clerkUserId is already linked
    const existingLink = await ctx.db
      .query("employees")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .first();
    if (existingLink) {
      return existingLink._id; // Already linked
    }

    // Find employee by email
    const employee = await ctx.db
      .query("employees")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!employee) {
      throw new Error("No employee record found for this email");
    }
    if (!employee.isActive) {
      throw new Error("Employee account is deactivated");
    }

    // Link
    await ctx.db.patch(employee._id, {
      clerkUserId,
      inviteStatus: "accepted",
      updatedAt: Date.now(),
    });

    return employee._id;
  },
});

/**
 * Query to check auth status from the client.
 */
export const getAuthStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { status: "unauthenticated" as const };
    const result = await getAuthenticatedEmployee(ctx);
    if (result.status === "authenticated") {
      return { status: "authenticated" as const, employee: result.employee };
    }
    if (result.status === "needs_linking") {
      return { status: "needs_linking" as const, employee: result.employee };
    }
    return { status: "not_activated" as const };
  },
});

/**
 * Get all employees in the downward tree of a given employee.
 * Max depth 20, with visited-set cycle protection.
 */
export async function getDownwardTree(
  ctx: QueryCtx,
  employeeId: Id<"employees">,
  maxDepth: number = 20
): Promise<Doc<"employees">[]> {
  const result: Doc<"employees">[] = [];
  const visited = new Set<string>();

  async function collect(id: Id<"employees">, depth: number) {
    if (depth > maxDepth || visited.has(id)) return;
    visited.add(id);

    const reports = await ctx.db
      .query("employees")
      .withIndex("by_manager", (q) => q.eq("managerId", id))
      .collect();

    for (const report of reports) {
      if (!visited.has(report._id)) {
        result.push(report);
        await collect(report._id, depth + 1);
      }
    }
  }

  await collect(employeeId, 0);
  return result;
}
