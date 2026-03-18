# Clerk Authentication Integration Design

## Overview

Add Clerk authentication to SCOPOS performance system. Clerk handles identity and invite-only signup; Convex owns roles, hierarchy, and authorization. Single org per deployment.

## Authentication Layer

### Clerk Setup
- `@clerk/nextjs` with `<ClerkProvider>` wrapping the app
- Invite-only mode — public signup disabled in Clerk dashboard
- Next.js middleware (`middleware.ts`) protects all routes except `/sign-in`
- Sign-in page at `/sign-in` using Clerk's `<SignIn>` component

### Clerk Project Details
- Project: PIP-project
- JWT Issuer: `https://brave-gull-23.clerk.accounts.dev`

### Convex Integration
- `<ConvexProviderWithClerk>` replaces `<ConvexProvider>`, passes Clerk auth tokens to Convex
- `convex/auth.config.ts` configured with Clerk JWT issuer domain
- All Convex mutations/queries access `ctx.auth.getUserIdentity()` for Clerk user identity (email, name, Clerk user ID)

### Employee Linking
- New field on `employees` table: `clerkUserId?: string` (indexed)
- **First-login linking is a two-step process** (queries cannot write in Convex):
  1. `getAuthenticatedEmployee(ctx)` looks up by `clerkUserId` first, then falls back to email (case-insensitive, `.toLowerCase()` both sides). If found by email but `clerkUserId` is not set, returns `{ status: "needs_linking", employee }` to the client
  2. Client calls a dedicated `linkClerkUser` mutation that writes `clerkUserId` and sets `inviteStatus: "accepted"`
  3. `linkClerkUser` verifies no other employee already has the same `clerkUserId` (uniqueness enforcement)
- Subsequent logins use `clerkUserId` for fast lookup
- If no matching employee exists, user sees "account not activated" screen with a sign-out button (`<SignOutButton>`) so they can switch accounts
- All email comparisons are case-insensitive; emails normalized to lowercase on employee creation/update

## Authorization & Route Protection

### Next.js Middleware
- All routes require authentication except `/sign-in`
- Clerk middleware redirects unauthenticated users to `/sign-in`

### Convex-Level Authorization
- Helper function `getAuthenticatedEmployee(ctx)`:
  1. Calls `ctx.auth.getUserIdentity()`
  2. Looks up employee by `clerkUserId`, falls back to email (case-insensitive)
  3. Checks `isActive` — rejects inactive employees with authorization error
  4. Throws if no linked employee (not activated)
  5. Returns the employee record (including `adminRole`)
- `createdBy` and `reviewedBy` fields on evaluations/cycles are populated server-side from the authenticated employee — removed from client-facing mutation arguments

### Role-Based Access Rules

| Resource | super_admin | hr_admin | manager | employee |
|----------|:-----------:|:--------:|:-------:|:--------:|
| Admin portal (employees, org chart, cycles) | Yes | Yes | No | No |
| Create/edit employees | Yes | Yes | No | No |
| Send invites | Yes | Yes | No | No |
| All evaluations | Yes | Yes | No | No |
| Downward-tree evaluations | Yes | Yes | Yes | No |
| Own evaluations (read-only) | Yes | Yes | Yes | Yes |

### Frontend Route Guards
- `/admin/*` — `super_admin` or `hr_admin`, redirects otherwise
- `/my-team` — `manager` or above
- `/evaluations` — all authenticated users, scoped by role in queries

### Downward Tree Query
- `getDownwardTree(employeeId)` recursively collects all reports beneath a manager
- Max recursion depth of 20 levels with visited-set cycle protection
- Manager evaluation queries filter to employees in their downward tree

### Write Permissions
- Evaluation status transitions are role-gated: only the assigned reviewer or admin can advance status
- Employees cannot finalize their own evaluations
- Managers can only write evaluations for employees in their downward tree

## Invite Flow & Employee Lifecycle

### Flow
1. Admin creates employee in portal — record exists with email, title, role, managerId
2. Admin clicks "Send Invite" on employee detail page
3. Backend calls Clerk `invitations.createInvitation({ emailAddress })` API
4. Employee record `inviteStatus` set to `"pending"`
5. User receives email, clicks link, completes Clerk signup at `/sign-in`
6. On first authenticated Convex request, `getAuthenticatedEmployee` matches by email, writes `clerkUserId`, sets `inviteStatus: "accepted"`

### Admin Portal Changes
- Employee list shows invite status badge (not invited / pending / accepted)
- Employee detail page gets "Send Invite" and "Resend Invite" buttons
- Invite only available for employees with a valid email

### Edge Cases
- **Email changed after invite:** Admin must resend invite to new email
- **Employee deactivated:** Clerk account revoked via `users.banUser()` or `users.deleteUser()`
- **Invite expired:** Admin can resend from portal

### Clerk API Key
- `CLERK_SECRET_KEY` stored as Convex environment variable
- Invite creation happens in a Convex action (HTTP call to Clerk API)

### Deactivation
- On employee deactivation, Clerk account banned via API
- `getAuthenticatedEmployee` checks `isActive` — rejects deactivated users even if JWT is still valid (covers the session window before Clerk JWT expires)

## Environment Variables

### Next.js (`.env.local`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — from Clerk dashboard
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CONVEX_URL` — already exists

### Convex (dashboard environment variables)
- `CLERK_SECRET_KEY` — for server-side invite creation and user management

## Data Model Changes

### `employees` table additions
```
clerkUserId?: string        // Set on first login, indexed, uniqueness enforced in linking mutation
inviteStatus?: string       // "none" | "pending" | "accepted" — optional for backward compat
```

- `inviteStatus` is `v.optional(v.string())` in schema so existing records don't break
- `createEmployee` defaults `inviteStatus` to `"none"`
- All employee email fields normalized to lowercase on create/update

### New index
```
.index("by_clerk_user", ["clerkUserId"])
```

No new tables needed. Existing `adminRole` and `managerId` cover roles and hierarchy.

### `evaluations` table
No schema changes. `createdBy` and `reviewedBy` populated with authenticated employee ID instead of optional/manual.

## Component Changes

| Component/File | Change |
|---|---|
| `ConvexProvider.tsx` | Replace with `ConvexProviderWithClerk` using Clerk's `useAuth` |
| `layout.tsx` | Wrap with `<ClerkProvider>` |
| New: `middleware.ts` | Clerk auth middleware, protect all routes |
| New: `/sign-in/page.tsx` | Clerk `<SignIn>` component |
| `Navigation.tsx` | Add `<UserButton>` (Clerk avatar/logout), remove mock identity UI |
| `/my-team/page.tsx` | Remove "Acting As" picker, use authenticated employee record |
| Employee detail page | Add "Send Invite" / "Resend Invite" buttons |
| Employee list | Add invite status badge column |
| All Convex functions | Add `getAuthenticatedEmployee(ctx)` guard |
| New: `convex/auth.config.ts` | Clerk JWT issuer configuration |
