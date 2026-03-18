# Clerk Auth Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk authentication with invite-only access, role-based authorization, and employee account linking to the SCOPOS performance system.

**Architecture:** Clerk handles identity via `@clerk/nextjs`. Convex owns roles and hierarchy via the existing `employees` table. A `ConvexProviderWithClerk` bridges the two. All Convex functions are guarded by a `getAuthenticatedEmployee` helper that resolves the Clerk identity to an employee record. First-login linking uses a two-step query-then-mutation pattern.

**Tech Stack:** Next.js 16, Convex 1.33, `@clerk/nextjs`, Clerk Invitations API

**Spec:** `docs/superpowers/specs/2026-03-18-clerk-auth-integration-design.md`

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `convex/auth.config.ts` | Clerk JWT issuer configuration for Convex |
| `convex/auth.ts` | `getAuthenticatedEmployee` helper, `linkClerkUser` mutation, `getDownwardTree` query |
| `convex/invites.ts` | `sendInvite` and `resendInvite` Convex actions (Clerk API calls) |
| `src/middleware.ts` | Clerk auth middleware — protects all routes except `/sign-in` |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn>` component page |
| `src/components/auth/AuthGate.tsx` | Client wrapper: handles linking flow + "not activated" screen |
| `src/components/auth/RoleGate.tsx` | Client wrapper: checks role before rendering children |
| `src/hooks/useCurrentEmployee.ts` | Hook: returns current authenticated employee from Convex |

### Modified Files
| File | Change |
|------|--------|
| `convex/schema.ts` | Add `clerkUserId`, `inviteStatus` fields + `by_clerk_user` index to employees |
| `convex/employees.ts` | Normalize email to lowercase in create/update; add `inviteStatus` default; add `getEmployeeByClerkUser` query |
| `convex/evaluations.ts` | Add auth guards to all mutations/queries; derive `createdBy` server-side |
| `convex/reviewCycles.ts` | Add auth guards; derive `createdBy` server-side |
| `src/components/providers/ConvexProvider.tsx` | Replace with `ConvexProviderWithClerk` |
| `src/app/layout.tsx` | Wrap with `<ClerkProvider>`, add `<AuthGate>` |
| `src/components/layout/Navigation.tsx` | Add Clerk `<UserButton>`, hide admin links by role |
| `src/app/my-team/page.tsx` | Remove "Acting As" picker, use authenticated employee |
| `src/app/admin/employees/[id]/page.tsx` | Add "Send Invite" / "Resend Invite" buttons |
| `src/app/admin/employees/page.tsx` | Add invite status badge column |
| `src/lib/types.ts` | Add `clerkUserId`, `inviteStatus` to `Employee` interface |
| `package.json` | Add `@clerk/nextjs` dependency |
| `.env.local` | Add Clerk env vars |

---

## Task 1: Install Clerk and Configure Environment

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install @clerk/nextjs**

```bash
npm install @clerk/nextjs
```

- [ ] **Step 2: Add Clerk environment variables to `.env.local`**

Add these lines to `.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
```

Note: The user must provide the publishable key from Clerk dashboard (PIP-project → Configure → API Keys).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @clerk/nextjs and configure env vars"
```

Note: Do NOT commit `.env.local` — it should be in `.gitignore`. Verify `.gitignore` includes it.

---

## Task 2: Convex Auth Config + Schema Changes

**Files:**
- Create: `convex/auth.config.ts`
- Modify: `convex/schema.ts:56-75`
- Modify: `src/lib/types.ts:76-91`

- [ ] **Step 1: Create Convex auth config**

Create `convex/auth.config.ts`:
```typescript
export default {
  providers: [
    {
      domain: "https://brave-gull-23.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

- [ ] **Step 2: Add `clerkUserId` and `inviteStatus` to employees schema**

In `convex/schema.ts`, add to the `employees` table definition (after `metadata` field, before `createdAt`):
```typescript
clerkUserId: v.optional(v.string()),
inviteStatus: v.optional(v.string()),
```

Add new index after `by_active`:
```typescript
.index("by_clerk_user", ["clerkUserId"])
```

- [ ] **Step 3: Update Employee TypeScript interface**

In `src/lib/types.ts`, add to the `Employee` interface (after `metadata`):
```typescript
clerkUserId?: string;
inviteStatus?: string;
```

- [ ] **Step 4: Deploy schema to Convex**

```bash
npx convex dev
```

Verify no errors in the terminal. The schema push should succeed since both new fields are optional.

- [ ] **Step 5: Commit**

```bash
git add convex/auth.config.ts convex/schema.ts src/lib/types.ts
git commit -m "feat: add Convex auth config and employee schema fields for Clerk"
```

---

## Task 3: Auth Helper + Employee Linking

**Files:**
- Create: `convex/auth.ts`
- Modify: `convex/employees.ts:4-33` (createEmployee), `convex/employees.ts:36-68` (updateEmployee)

- [ ] **Step 1: Create `convex/auth.ts` with `getAuthenticatedEmployee` helper**

Create `convex/auth.ts`:
```typescript
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
```

- [ ] **Step 2: Normalize email to lowercase in `createEmployee`**

In `convex/employees.ts`, in the `createEmployee` handler, change the insert to normalize email:
```typescript
// Before the uniqueness check, normalize email
const normalizedEmail = args.email.trim().toLowerCase();

// Use normalizedEmail in the uniqueness check and insert
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
```

- [ ] **Step 3: Normalize email to lowercase in `updateEmployee`**

In `convex/employees.ts`, in the `updateEmployee` handler, normalize email before the uniqueness check:
```typescript
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
```

- [ ] **Step 4: Verify Convex compiles**

```bash
npx convex dev
```

Should see no errors.

- [ ] **Step 5: Commit**

```bash
git add convex/auth.ts convex/employees.ts
git commit -m "feat: add auth helper, employee linking, downward tree, email normalization"
```

---

## Task 4: Clerk Provider + Middleware + Sign-In Page

**Files:**
- Modify: `src/components/providers/ConvexProvider.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/middleware.ts`
- Create: `src/app/sign-in/[[...sign-in]]/page.tsx`

- [ ] **Step 1: Rewrite `ConvexProvider.tsx` to use Clerk**

Replace `src/components/providers/ConvexProvider.tsx` with:
```typescript
"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return null;
    return new ConvexReactClient(url);
  }, []);

  if (!convex) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#c0392b" }}>
        <h2>Convex not configured</h2>
        <p>
          Run <code>npx convex dev</code> and set{" "}
          <code>NEXT_PUBLIC_CONVEX_URL</code> in <code>.env.local</code>
        </p>
      </div>
    );
  }

  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Remove ClerkProvider from layout.tsx (it's now in ConvexProvider)**

No change needed to `layout.tsx` — `ClerkProvider` is inside `ConvexClientProvider`. The layout already wraps children with `<ConvexClientProvider>`.

- [ ] **Step 3: Create Next.js middleware**

Create `src/middleware.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 4: Create sign-in page**

Create `src/app/sign-in/[[...sign-in]]/page.tsx`:
```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <SignIn />
    </div>
  );
}
```

- [ ] **Step 5: Verify the app loads — run dev server**

```bash
npm run dev
```

Open `http://localhost:3000` — should redirect to `/sign-in` with Clerk's sign-in form. If the Clerk publishable key is not yet set, you'll see a Clerk config error — that's expected until the user adds the key.

- [ ] **Step 6: Commit**

```bash
git add src/components/providers/ConvexProvider.tsx src/middleware.ts src/app/sign-in/
git commit -m "feat: add Clerk provider, middleware, and sign-in page"
```

---

## Task 5: AuthGate + useCurrentEmployee Hook

**Files:**
- Create: `src/components/auth/AuthGate.tsx`
- Create: `src/hooks/useCurrentEmployee.ts`

- [ ] **Step 1: Create `useCurrentEmployee` hook**

Create `src/hooks/useCurrentEmployee.ts`:
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

export function useCurrentEmployee() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const linkClerkUser = useMutation(api.auth.linkClerkUser);
  const hasLinked = useRef(false);

  useEffect(() => {
    if (authStatus?.status === "needs_linking" && !hasLinked.current) {
      hasLinked.current = true;
      linkClerkUser().catch(console.error);
    }
  }, [authStatus?.status, linkClerkUser]);

  return authStatus;
}
```

- [ ] **Step 2: Create `AuthGate` component**

Create `src/components/auth/AuthGate.tsx`:
```typescript
"use client";

import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { SignOutButton } from "@clerk/nextjs";
import { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const authStatus = useCurrentEmployee();

  if (!authStatus || authStatus.status === "needs_linking") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (authStatus.status === "not_activated") {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif" }}>Account Not Activated</h2>
        <p style={{ color: "var(--ink-muted)", maxWidth: 400, textAlign: "center" }}>
          Your account has not been set up yet. Please contact your administrator to get access.
        </p>
        <SignOutButton>
          <button className="btn btn-secondary">Sign Out</button>
        </SignOutButton>
      </div>
    );
  }

  if (authStatus.status === "unauthenticated") {
    return null; // Middleware will redirect to sign-in
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Wrap app content with `AuthGate` in layout**

In `src/app/layout.tsx`, update the body content:
```typescript
import { AuthGate } from "@/components/auth/AuthGate";
```

Then wrap the content inside `<ConvexClientProvider>`:
```tsx
<ConvexClientProvider>
  <AuthGate>
    <Navigation />
    {children}
  </AuthGate>
</ConvexClientProvider>
```

- [ ] **Step 4: Verify — sign in and see loading/not-activated state**

```bash
npm run dev
```

Sign in with a Clerk account. If no matching employee exists, should see "Account Not Activated" screen with sign-out button.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCurrentEmployee.ts src/components/auth/AuthGate.tsx src/app/layout.tsx
git commit -m "feat: add AuthGate with employee linking and not-activated screen"
```

---

## Task 6: Role-Based Navigation

**Files:**
- Create: `src/components/auth/RoleGate.tsx`
- Modify: `src/components/layout/Navigation.tsx`

- [ ] **Step 1: Create `RoleGate` component**

Create `src/components/auth/RoleGate.tsx`:
```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ReactNode } from "react";
import type { AdminRole } from "@/lib/types";

export function RoleGate({
  allowed,
  children,
  fallbackUrl = "/",
}: {
  allowed: AdminRole[];
  children: ReactNode;
  fallbackUrl?: string;
}) {
  const router = useRouter();
  const authStatus = useQuery(api.auth.getAuthStatus);

  useEffect(() => {
    if (
      authStatus?.status === "authenticated" &&
      !allowed.includes(authStatus.employee.adminRole as AdminRole)
    ) {
      router.replace(fallbackUrl);
    }
  }, [authStatus, allowed, fallbackUrl, router]);

  if (!authStatus || authStatus.status !== "authenticated") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)" }}>
        Loading...
      </div>
    );
  }

  if (!allowed.includes(authStatus.employee.adminRole as AdminRole)) {
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Update Navigation to show role-based links + UserButton**

Replace `src/components/layout/Navigation.tsx`:
```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function Navigation() {
  const [adminOpen, setAdminOpen] = useState(false);
  const authStatus = useQuery(api.auth.getAuthStatus);

  const role = authStatus?.status === "authenticated"
    ? authStatus.employee.adminRole
    : null;

  const isAdmin = role === "super_admin" || role === "hr_admin";
  const isManagerOrAbove = isAdmin || role === "manager";

  return (
    <nav className="top-nav no-print">
      <Link href="/">
        <Image
          src="/scopos-icon.png"
          alt="SCOPOS"
          width={32}
          height={32}
          className="nav-logo"
        />
      </Link>
      <Link href="/">Home</Link>
      <Link href="/evaluations">Evaluations</Link>
      {isManagerOrAbove && <Link href="/my-team">My Team</Link>}
      <div className="nav-spacer" />
      {isAdmin && (
        <div className="nav-dropdown">
          <button onClick={() => setAdminOpen(!adminOpen)}>
            Admin ▾
          </button>
          {adminOpen && (
            <div className="nav-dropdown-menu">
              <Link href="/admin/employees" onClick={() => setAdminOpen(false)}>
                Employees
              </Link>
              <Link href="/admin/org-chart" onClick={() => setAdminOpen(false)}>
                Org Chart
              </Link>
              <Link href="/admin/review-cycles" onClick={() => setAdminOpen(false)}>
                Review Cycles
              </Link>
            </div>
          )}
        </div>
      )}
      <UserButton />
    </nav>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/RoleGate.tsx src/components/layout/Navigation.tsx
git commit -m "feat: add RoleGate component and role-based navigation"
```

---

## Task 7: Guard Admin Routes

**Files:**
- Modify: `src/app/admin/employees/page.tsx`
- Modify: `src/app/admin/employees/[id]/page.tsx`
- Modify: `src/app/admin/employees/new/page.tsx`
- Modify: `src/app/admin/org-chart/page.tsx`
- Modify: `src/app/admin/review-cycles/page.tsx`
- Modify: `src/app/admin/review-cycles/new/page.tsx`
- Modify: `src/app/admin/review-cycles/[id]/page.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Create admin layout with RoleGate**

Create `src/app/admin/layout.tsx`:
```typescript
import { RoleGate } from "@/components/auth/RoleGate";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowed={["super_admin", "hr_admin"]}>
      {children}
    </RoleGate>
  );
}
```

This protects ALL admin routes at once — no need to modify each page individually.

- [ ] **Step 2: Guard my-team route**

Create `src/app/my-team/layout.tsx`:
```typescript
import { RoleGate } from "@/components/auth/RoleGate";
import { ReactNode } from "react";

export default function MyTeamLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowed={["super_admin", "hr_admin", "manager"]}>
      {children}
    </RoleGate>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx src/app/my-team/layout.tsx
git commit -m "feat: add RoleGate layouts for admin and my-team routes"
```

---

## Task 8: Rewrite My Team Page — Remove Acting As Picker

**Files:**
- Modify: `src/app/my-team/page.tsx`

- [ ] **Step 1: Replace the Acting As picker with authenticated employee**

In `src/app/my-team/page.tsx`, replace the component. Key changes:
1. Remove `useState` for `managerId` — derive from auth
2. Remove `EmployeePicker` import and the "Acting As" card
3. Use `useQuery(api.auth.getAuthStatus)` to get current employee
4. Pass current employee's `_id` to `getDirectReports` and `getEvaluationsForReviewer`

Replace the top of the component:
```typescript
export default function MyTeamPage() {
  const router = useRouter();
  const authStatus = useQuery(api.auth.getAuthStatus);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [roleSelectFor, setRoleSelectFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("");

  const managerId = authStatus?.status === "authenticated"
    ? authStatus.employee._id
    : undefined;

  const reports = useQuery(
    api.employees.getDirectReports,
    managerId ? { managerId } : "skip"
  );
  const evals = useQuery(
    api.evaluations.getEvaluationsForReviewer,
    managerId ? { reviewerId: managerId } : "skip"
  );
```

Remove the `allEmployees` query and the entire "Acting As" card block (lines 105-127 in current file).

Update `handleStartReview` to use `managerId` from auth instead of state:
```typescript
async function handleStartReview(empId: string, roleType?: string) {
  if (!managerId) return;
  // ... rest stays the same, but managerId is now from auth
```

Remove the `useState` import for `managerId` and the `EmployeePicker` import.

Add the `api` import for auth:
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
```

- [ ] **Step 2: Verify the page loads with authenticated user**

```bash
npm run dev
```

Navigate to `/my-team`. Should show direct reports for the authenticated user (if they are a manager).

- [ ] **Step 3: Commit**

```bash
git add src/app/my-team/page.tsx
git commit -m "feat: replace Acting As picker with authenticated employee on my-team"
```

---

## Task 9: Auth Guards on Convex Functions

**Files:**
- Modify: `convex/employees.ts`
- Modify: `convex/evaluations.ts`
- Modify: `convex/reviewCycles.ts`

- [ ] **Step 1: Guard employee mutations (admin-only) + add `inviteStatus` arg**

In `convex/employees.ts`, add auth guards to `createEmployee`, `updateEmployee`, `deactivateEmployee`:

At the top of the file, add:
```typescript
import { requireRole } from "./auth";
```

In `createEmployee` handler, add at the start:
```typescript
await requireRole(ctx, ["super_admin", "hr_admin"]);
```

In `updateEmployee`, add `inviteStatus` to the args object:
```typescript
inviteStatus: v.optional(v.string()),
```

In `updateEmployee` handler, add at the start:
```typescript
await requireRole(ctx, ["super_admin", "hr_admin"]);
```

In `deactivateEmployee` handler, add at the start:
```typescript
await requireRole(ctx, ["super_admin", "hr_admin"]);
```

Add a `getEmployeeByClerkUser` query:
```typescript
export const getEmployeeByClerkUser = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    return await ctx.db
      .query("employees")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .first();
  },
});
```

- [ ] **Step 2: Guard ALL evaluation mutations**

In `convex/evaluations.ts`, add auth to ALL mutations. At the top:
```typescript
import { requireEmployee, requireRole, getDownwardTree } from "./auth";
```

Guard every mutation — add `await requireEmployee(ctx);` at the start of each handler:
- `createEvaluation`
- `updateEmployeeInfo`
- `updateSkillRating`
- `updateValueRating`
- `updateMetric`
- `updateAuthorityLevel`
- `updateDeficiencyPlan`
- `updateStatus` — additionally verify caller is the assigned reviewer or admin:
  ```typescript
  const employee = await requireEmployee(ctx);
  const doc = await ctx.db.get(id);
  if (!doc) throw new Error("Evaluation not found");
  const isAdmin = ["super_admin", "hr_admin"].includes(employee.adminRole);
  const isReviewer = doc.reviewerId && doc.reviewerId === employee._id;
  if (!isAdmin && !isReviewer) throw new Error("Insufficient permissions");
  ```
- `deleteEvaluation`:
  ```typescript
  await requireRole(ctx, ["super_admin", "hr_admin"]);
  ```

In `createEvaluationForEmployee` — derive `reviewerId` from auth:
Remove `reviewerId` from args. In the handler:
```typescript
const currentEmployee = await requireEmployee(ctx);
// currentEmployee is the reviewer
const reviewerId = currentEmployee._id;
```
Update the insert to use `reviewerId` from auth instead of args.

- [ ] **Step 3: Guard review cycle mutations**

In `convex/reviewCycles.ts`, at the top:
```typescript
import { requireRole, requireEmployee } from "./auth";
```

In `createReviewCycle` handler — derive `createdBy` from auth:
```typescript
const employee = await requireRole(ctx, ["super_admin", "hr_admin"]);
// Remove createdBy from args, use employee._id instead
```

Update the `createReviewCycle` args to remove `createdBy`:
```typescript
args: {
  name: v.string(),
  period: v.string(),
  startDate: v.string(),
  dueDate: v.string(),
  selectedEmployeeIds: v.array(v.id("employees")),
},
```

And in the handler:
```typescript
handler: async (ctx, args) => {
  const employee = await requireRole(ctx, ["super_admin", "hr_admin"]);
  const now = Date.now();
  return await ctx.db.insert("reviewCycles", {
    ...args,
    createdBy: employee._id,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
},
```

In `updateReviewCycle`, `closeReviewCycle`, `activateReviewCycle`:
```typescript
await requireRole(ctx, ["super_admin", "hr_admin"]);
```

- [ ] **Step 4: Update frontend to stop passing `createdBy`**

Find all places where `createReviewCycle` is called from the frontend and remove the `createdBy` argument. Check:
- `src/app/admin/review-cycles/new/page.tsx`

- [ ] **Step 5: Verify Convex compiles**

```bash
npx convex dev
```

- [ ] **Step 6: Commit**

```bash
git add convex/employees.ts convex/evaluations.ts convex/reviewCycles.ts src/app/admin/review-cycles/
git commit -m "feat: add auth guards to all Convex mutations with role-based access"
```

---

## Task 10: Invite Flow — Backend

**Files:**
- Create: `convex/invites.ts`

- [ ] **Step 1: Set CLERK_SECRET_KEY in Convex environment**

```bash
npx convex env set CLERK_SECRET_KEY <secret-key-from-clerk-dashboard>
```

The user must provide this value from Clerk Dashboard → Configure → API Keys.

- [ ] **Step 2: Create invite actions**

Create `convex/invites.ts`:
```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const sendInvite = action({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, { employeeId }) => {
    // Verify caller is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const employee = await ctx.runQuery(api.employees.getEmployee, { id: employeeId });
    if (!employee) throw new Error("Employee not found");
    if (!employee.email) throw new Error("Employee has no email");
    if (employee.inviteStatus === "accepted") throw new Error("Employee already has an account");

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY not configured");

    // Call Clerk Invitations API
    const response = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: employee.email,
        redirect_url: process.env.SITE_URL ? `${process.env.SITE_URL}/sign-in` : undefined,
        notify: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send invite: ${error.errors?.[0]?.message || response.statusText}`);
    }

    // Update invite status
    await ctx.runMutation(api.employees.updateEmployee, {
      id: employeeId,
      inviteStatus: "pending" as any,
    });

    return { success: true };
  },
});
```

**Important:** `updateEmployee` must already accept `inviteStatus` as an arg — this was added in Task 9 Step 1.

- [ ] **Step 3: Set SITE_URL in Convex environment**

```bash
npx convex env set SITE_URL https://scopos-performance-system.vercel.app
```

This is used by the invite action to build the redirect URL. Update for your deployment domain.

- [ ] **Step 4: Verify Convex compiles**

```bash
npx convex dev
```

- [ ] **Step 5: Commit**

```bash
git add convex/invites.ts
git commit -m "feat: add Clerk invite actions for admin-triggered invitations"
```

---

## Task 11: Invite Flow — Frontend

**Files:**
- Modify: `src/app/admin/employees/[id]/page.tsx`
- Modify: `src/app/admin/employees/page.tsx`

- [ ] **Step 1: Add invite buttons to employee detail page**

In `src/app/admin/employees/[id]/page.tsx`, add invite functionality.

Add imports:
```typescript
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
```

Add state and action inside the component:
```typescript
const sendInvite = useAction(api.invites.sendInvite);
const [inviting, setInviting] = useState(false);
```

Add invite button in the actions bar (before the Cancel button):
```typescript
{employee.email && employee.inviteStatus !== "accepted" && (
  <button
    type="button"
    className="btn btn-primary"
    style={{ marginRight: "auto" }}
    disabled={inviting}
    onClick={async () => {
      setInviting(true);
      try {
        await sendInvite({ employeeId: id as Id<"employees"> });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send invite.";
        setError(message);
      } finally {
        setInviting(false);
      }
    }}
  >
    {inviting
      ? "Sending..."
      : employee.inviteStatus === "pending"
        ? "Resend Invite"
        : "Send Invite"}
  </button>
)}
```

Also add an invite status badge next to the active/inactive badge at the top:
```typescript
{employee.inviteStatus && employee.inviteStatus !== "none" && (
  <span
    className={`status-badge ${employee.inviteStatus === "accepted" ? "active" : "draft"}`}
    style={{ marginLeft: 8 }}
  >
    {employee.inviteStatus === "accepted" ? "Account Linked" : "Invite Pending"}
  </span>
)}
```

- [ ] **Step 2: Add invite status column to employee list**

In `src/app/admin/employees/page.tsx`, add an "Invite" column to the table.

In the `<thead>`:
```typescript
<th>Invite</th>
```

In the `<tbody>` row, add after the Status `<td>`:
```typescript
<td>
  <span
    className={`status-badge ${
      emp.inviteStatus === "accepted"
        ? "active"
        : emp.inviteStatus === "pending"
          ? "draft"
          : "inactive"
    }`}
  >
    {emp.inviteStatus === "accepted"
      ? "Linked"
      : emp.inviteStatus === "pending"
        ? "Pending"
        : "Not Invited"}
  </span>
</td>
```

Note: The `inviteStatus` field may be `undefined` for existing records. Treat `undefined` the same as `"none"` (show "Not Invited").

- [ ] **Step 3: Verify invite flow works end-to-end**

```bash
npm run dev
```

1. Sign in as an admin
2. Go to `/admin/employees/<id>`
3. Click "Send Invite"
4. Check Clerk dashboard — invitation should appear
5. Check employee list — invite status should show "Pending"

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/employees/
git commit -m "feat: add invite buttons and status badges to employee admin pages"
```

---

## Task 12: Deactivation — Ban Clerk User

**Files:**
- Modify: `convex/employees.ts` (deactivateEmployee)

- [ ] **Step 1: Update deactivateEmployee to ban Clerk user**

Convert `deactivateEmployee` from a mutation to an action (since it needs to make HTTP calls), or add a separate action. Simpler approach: add a Convex action that wraps the mutation + Clerk API call.

Add to `convex/invites.ts`:
```typescript
export const deactivateWithClerk = action({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, { employeeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const employee = await ctx.runQuery(api.employees.getEmployee, { id: employeeId });
    if (!employee) throw new Error("Employee not found");

    // Deactivate in Convex first
    await ctx.runMutation(api.employees.deactivateEmployee, { id: employeeId });

    // Ban in Clerk if they have a linked account
    if (employee.clerkUserId) {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (clerkSecretKey) {
        await fetch(`https://api.clerk.com/v1/users/${employee.clerkUserId}/ban`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${clerkSecretKey}`,
          },
        });
      }
    }

    return { success: true };
  },
});
```

- [ ] **Step 2: Update employee detail page to use `deactivateWithClerk`**

In `src/app/admin/employees/[id]/page.tsx`, replace the `deactivateEmployee` mutation call with the new action when deactivating:
```typescript
const deactivateWithClerk = useAction(api.invites.deactivateWithClerk);
```

Update `handleToggleActive`:
```typescript
async function handleToggleActive() {
  setError("");
  try {
    if (employee?.isActive) {
      await deactivateWithClerk({ employeeId: id as Id<"employees"> });
    } else {
      await updateEmployee({ id: id as Id<"employees">, isActive: true });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Operation failed.";
    setError(message);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add convex/invites.ts src/app/admin/employees/
git commit -m "feat: ban Clerk user on employee deactivation"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Fix any TypeScript errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: End-to-end manual verification**

Test these flows:
1. Unauthenticated user → redirected to `/sign-in`
2. Sign in with invited account → lands on home page
3. Sign in with uninvited account → sees "Account Not Activated"
4. Admin can see Admin menu, manager cannot
5. Manager sees `/my-team` with their direct reports (no "Acting As" picker)
6. Employee role cannot access `/admin/*` or `/my-team`
7. Admin can send invite from employee detail page
8. Admin can deactivate employee (Clerk ban)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve build and lint issues from Clerk auth integration"
```
