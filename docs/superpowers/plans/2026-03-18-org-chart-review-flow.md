# Org Chart & Review Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add employee management, org chart, admin portal, review cycles, and manager team view so evaluations flow downhill based on reporting structure.

**Architecture:** Extends the existing Convex backend with `employees` and `reviewCycles` tables. Adds `employeeId`, `reviewerId`, `cycleId` to evaluations. New admin pages under `/admin/*` and manager view at `/my-team`. Org chart built as a recursive React component with `react-zoom-pan-pinch` for zoom/pan. Navigation component added to layout.

**Tech Stack:** Next.js 16 (App Router), Convex, TypeScript, react-zoom-pan-pinch

**Spec:** `docs/superpowers/specs/2026-03-18-org-chart-review-flow-design.md`

---

## File Map

### Convex Backend
- Modify: `convex/schema.ts` — add `employees` and `reviewCycles` tables, add fields to `evaluations`
- Create: `convex/employees.ts` — employee CRUD mutations and queries
- Create: `convex/reviewCycles.ts` — cycle mutations (create, activate, close) and queries
- Modify: `convex/evaluations.ts` — add `createEvaluationForEmployee`, employee/reviewer/cycle queries

### Shared Library
- Modify: `src/lib/types.ts` — add Employee, ReviewCycle, AdminRole types

### Navigation
- Create: `src/components/layout/Navigation.tsx` — top nav with role-based links
- Modify: `src/app/layout.tsx` — include Navigation component

### Admin Pages
- Create: `src/app/admin/page.tsx` — admin dashboard
- Create: `src/app/admin/employees/page.tsx` — employee list with filters
- Create: `src/app/admin/employees/new/page.tsx` — add employee form
- Create: `src/app/admin/employees/[id]/page.tsx` — edit employee
- Create: `src/app/admin/org-chart/page.tsx` — visual org chart
- Create: `src/components/admin/OrgTreeNode.tsx` — recursive tree node component
- Create: `src/app/admin/review-cycles/page.tsx` — cycle list
- Create: `src/app/admin/review-cycles/new/page.tsx` — create cycle with employee selection
- Create: `src/app/admin/review-cycles/[id]/page.tsx` — cycle detail/progress

### Manager Pages
- Create: `src/app/my-team/page.tsx` — direct reports with review actions

### Shared UI Components
- Create: `src/components/ui/EmployeePicker.tsx` — reusable searchable employee dropdown (used in admin forms, evaluation creation, My Team, review cycles)

### Existing Page Enhancements
- Modify: `src/app/evaluations/new/page.tsx` — employee picker, auto-fill from employee record
- Modify: `src/app/evaluations/page.tsx` — add employee picker filter to evaluation list
- Modify: `src/app/page.tsx` — update landing page links
- Modify: `src/app/globals.css` — add admin table, employee picker, org chart, and nav CSS

---

## Task 1: Schema Updates

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add employees table to schema**

Add the `employees` table definition after the existing `evaluations` table in `convex/schema.ts`:

```typescript
employees: defineTable({
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
  createdAt: v.float64(),
  updatedAt: v.float64(),
})
  .index("by_email", ["email"])
  .index("by_manager", ["managerId"])
  .index("by_department", ["department"])
  .index("by_role", ["roleType"])
  .index("by_active", ["isActive"]),
```

- [ ] **Step 2: Add reviewCycles table to schema**

```typescript
reviewCycles: defineTable({
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
  .index("by_status", ["status"])
  .index("by_created", ["createdAt"]),
```

- [ ] **Step 3: Add new fields to existing evaluations table**

Add these three fields to the existing `evaluations` table definition:

```typescript
employeeId: v.optional(v.id("employees")),
reviewerId: v.optional(v.id("employees")),
cycleId: v.optional(v.id("reviewCycles")),
```

Add these indexes:

```typescript
.index("by_employee_id", ["employeeId"])
.index("by_reviewer_id", ["reviewerId"])
.index("by_cycle", ["cycleId"])
```

- [ ] **Step 4: Deploy schema to Convex**

Run: `npx convex dev --once`
Expected: Schema deploys successfully with new tables and indexes.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add employees and reviewCycles tables, extend evaluations schema"
```

---

## Task 2: Employee Convex Functions

**Files:**
- Create: `convex/employees.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add Employee types to types.ts**

Add to `src/lib/types.ts`:

```typescript
export type AdminRole = "super_admin" | "hr_admin" | "manager" | "employee";

export interface Employee {
  _id: string;
  name: string;
  email: string;
  title: string;
  department?: string;
  roleType?: string;
  managerId?: string;
  adminRole: AdminRole;
  isActive: boolean;
  hireDate?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewCycle {
  _id: string;
  name: string;
  period: string;
  startDate: string;
  dueDate: string;
  status: "draft" | "active" | "closed";
  selectedEmployeeIds: string[];
  createdBy: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 2: Create convex/employees.ts with createEmployee mutation**

Create `convex/employees.ts`:

```typescript
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
    // Enforce email uniqueness
    const existing = await ctx.db
      .query("employees")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) {
      throw new Error(`An employee with email "${args.email}" already exists.`);
    }
    const now = Date.now();
    return await ctx.db.insert("employees", {
      ...args,
      adminRole: args.adminRole ?? "employee",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

- [ ] **Step 3: Add updateEmployee mutation**

```typescript
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
    // If email is changing, enforce uniqueness
    if (fields.email !== undefined) {
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
```

- [ ] **Step 4: Add deactivateEmployee mutation**

```typescript
export const deactivateEmployee = mutation({
  args: { id: v.id("employees") },
  handler: async (ctx, { id }) => {
    const emp = await ctx.db.get(id);
    if (!emp) throw new Error("Employee not found");

    // Check for active direct reports
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
```

- [ ] **Step 5: Add employee queries**

```typescript
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
    } else if (roleType) {
      results = await ctx.db
        .query("employees")
        .withIndex("by_role", (q) => q.eq("roleType", roleType))
        .collect();
    } else if (isActive !== undefined) {
      results = await ctx.db
        .query("employees")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    } else {
      results = await ctx.db.query("employees").collect();
    }

    // Apply remaining filters
    if (department && roleType !== undefined) {
      results = results.filter((e) => e.roleType === roleType);
    }
    if (isActive !== undefined && (department || roleType)) {
      results = results.filter((e) => e.isActive === isActive);
    }

    return results;
  },
});
```

- [ ] **Step 6: Deploy and verify**

Run: `npx convex dev --once`
Expected: All employee functions deploy successfully.

- [ ] **Step 7: Commit**

```bash
git add convex/employees.ts src/lib/types.ts
git commit -m "feat: add employee CRUD mutations and queries"
```

---

## Task 3: Review Cycle Convex Functions

**Files:**
- Create: `convex/reviewCycles.ts`
- Modify: `convex/evaluations.ts`

- [ ] **Step 1: Create convex/reviewCycles.ts with create/update/close mutations**

Create `convex/reviewCycles.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createReviewCycle = mutation({
  args: {
    name: v.string(),
    period: v.string(),
    startDate: v.string(),
    dueDate: v.string(),
    selectedEmployeeIds: v.array(v.id("employees")),
    createdBy: v.id("employees"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("reviewCycles", {
      ...args,
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
    await ctx.db.patch(id, { status: "closed", updatedAt: Date.now() });
  },
});

export const getReviewCycle = query({
  args: { id: v.id("reviewCycles") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const listReviewCycles = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    if (status) {
      return await ctx.db
        .query("reviewCycles")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    }
    return await ctx.db
      .query("reviewCycles")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});
```

Note: `createdBy` requires a valid employee ID. Since auth is deferred, the review cycle creation UI should include a temporary "Acting as" employee picker (same pattern as the My Team page) so the admin can select themselves. This picker will be replaced with auth-derived identity later.

- [ ] **Step 2: Add activateReviewCycle mutation**

Add to `convex/reviewCycles.ts`:

```typescript
export const activateReviewCycle = mutation({
  args: { id: v.id("reviewCycles") },
  handler: async (ctx, { id }) => {
    const cycle = await ctx.db.get(id);
    if (!cycle) throw new Error("Review cycle not found");
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
```

- [ ] **Step 3: Add createEvaluationForEmployee to convex/evaluations.ts**

Add to `convex/evaluations.ts`:

```typescript
export const createEvaluationForEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    reviewerId: v.id("employees"),
    roleType: v.string(),
    cycleId: v.optional(v.id("reviewCycles")),
  },
  handler: async (ctx, { employeeId, reviewerId, roleType, cycleId }) => {
    const emp = await ctx.db.get(employeeId);
    if (!emp) throw new Error("Employee not found");
    const reviewer = await ctx.db.get(reviewerId);
    if (!reviewer) throw new Error("Reviewer not found");

    const now = Date.now();
    return await ctx.db.insert("evaluations", {
      roleType,
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
```

Note: `reviewDate`, `reviewPeriod`, and `empProject` are initialized to empty strings (matching existing `createEvaluation` pattern). The manager fills these in on the form.

- [ ] **Step 4: Add evaluation queries for employee/reviewer/cycle lookups**

Add to `convex/evaluations.ts`:
- `getEvaluationsForEmployee(employeeId)` — using `by_employee_id` index
- `getEvaluationsForReviewer(reviewerId)` — using `by_reviewer_id` index
- `getEvaluationsForCycle(cycleId)` — using `by_cycle` index

- [ ] **Step 5: Add getCycleProgress query to reviewCycles.ts**

Query all evaluations for a cycle, aggregate:
- total count
- completed count (status = "submitted" | "finalized")
- pending count (status = "draft")
- group by reviewer for per-manager breakdown

- [ ] **Step 6: Deploy and verify**

Run: `npx convex dev --once`
Expected: All functions deploy successfully.

- [ ] **Step 7: Commit**

```bash
git add convex/reviewCycles.ts convex/evaluations.ts
git commit -m "feat: add review cycle mutations with activation flow and evaluation queries"
```

---

## Task 4: Navigation Component

**Files:**
- Create: `src/components/layout/Navigation.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create Navigation component**

Create `src/components/layout/Navigation.tsx` — a "use client" component that renders a top nav bar with:
- SCOPOS logo (linked to `/`)
- Links: Home, Evaluations (always visible)
- My Team link (visible for now — will be role-gated with auth later)
- Admin dropdown (click-to-toggle, not hover): Employees, Org Chart, Review Cycles (visible for now). Uses a simple `useState` boolean to toggle open/closed. Dropdown is a positioned `div` below the Admin link.
- Uses the existing CSS design system (navy/teal colors, DM Sans font)
- Hidden in print via `no-print` class

- [ ] **Step 2: Add nav CSS to globals.css**

Add navigation styles to `src/app/globals.css`:
- `.top-nav` — flex container, navy background, white text
- `.nav-link` — individual links with hover state
- `.nav-logo` — small logo display
- Print media query to hide nav

- [ ] **Step 3: Update layout.tsx to include Navigation**

Modify `src/app/layout.tsx` to render `<Navigation />` above `{children}` inside the ConvexClientProvider.

- [ ] **Step 4: Verify build**

Run: `npx next build`
Expected: Build succeeds, all pages render.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Navigation.tsx src/app/globals.css src/app/layout.tsx
git commit -m "feat: add top navigation bar with role-based links"
```

---

## Task 5: Admin Employee Pages

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/employees/page.tsx`
- Create: `src/app/admin/employees/new/page.tsx`
- Create: `src/app/admin/employees/[id]/page.tsx`

- [ ] **Step 1: Create admin dashboard page**

Create `src/app/admin/page.tsx` — "use client" page showing:
- Total employee count (active) via `useQuery(api.employees.getAllEmployees)`
- Active review cycles count via `useQuery(api.reviewCycles.listReviewCycles, { status: "active" })`
- Pending reviews count (draft evaluations across all active cycles)
- Quick action links: "Add Employee", "New Review Cycle", "View Org Chart"
- Uses existing card/dashboard CSS classes

- [ ] **Step 2: Create employee list page**

Create `src/app/admin/employees/page.tsx` — "use client" page with:
- `useQuery(api.employees.getAllEmployees, { includeInactive: true })` to load all employees (including inactive for the toggle)
- Client-side search (filter by name or email)
- Department filter dropdown (populated from unique departments in data)
- Role type filter dropdown
- Active/inactive toggle
- Table displaying: Name, Title, Department, Role, Manager name, Status badge
- Click row navigates to `/admin/employees/[id]`
- "Add Employee" button links to `/admin/employees/new`

- [ ] **Step 3: Create add employee form page**

Create `src/app/admin/employees/new/page.tsx` — "use client" form with:
- Fields: name, email, title, department, roleType (dropdown from ROLE_CONFIGS), managerId (searchable employee picker), adminRole (dropdown), hireDate
- On submit: calls `createEmployee` mutation, redirects to `/admin/employees`
- Error handling for duplicate email

- [ ] **Step 4: Create edit employee page**

Create `src/app/admin/employees/[id]/page.tsx` — "use client" page with:
- `useQuery(api.employees.getEmployee, { id })` to load employee
- Same form fields as the create page, pre-filled with current values
- "Save" button calls `updateEmployee` mutation
- "Deactivate" button (if active) calls `deactivateEmployee` with confirmation dialog. Shows error if employee has reports.
- "Activate" button (if inactive) calls `updateEmployee({ isActive: true })`

- [ ] **Step 5: Verify build**

Run: `npx next build`
Expected: All 4 admin pages build successfully.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/
git commit -m "feat: add admin dashboard and employee management pages"
```

---

## Task 6: Org Chart Visual Tree

**Files:**
- Create: `src/app/admin/org-chart/page.tsx`
- Create: `src/components/admin/OrgTreeNode.tsx`

- [ ] **Step 1: Install react-zoom-pan-pinch**

Run: `npm install react-zoom-pan-pinch`

- [ ] **Step 2: Create OrgTreeNode component**

Create `src/components/admin/OrgTreeNode.tsx` — a recursive "use client" component:
- Props: `employee`, `allEmployees` (full list), `level` (depth)
- Renders a node box: name, title, department badge (color-coded), report count
- "Edit" link to `/admin/employees/[id]`
- Expand/collapse toggle if has children
- Recursively renders children (employees where managerId = this employee's id)
- CSS: tree lines connecting parent to children using borders/pseudo-elements

- [ ] **Step 3: Add org chart CSS to globals.css**

Add tree layout styles:
- `.org-tree` — container
- `.org-node` — individual node card
- `.org-children` — flex container for child nodes with connecting lines
- `.dept-badge` — small colored badge for department
- Department color mapping via CSS classes

- [ ] **Step 4: Create org chart page**

Create `src/app/admin/org-chart/page.tsx` — "use client" page:
- Loads all employees with `useQuery(api.employees.getAllEmployees)`
- Finds root nodes (employees where managerId is null/undefined)
- Wraps tree in `TransformWrapper` / `TransformComponent` from react-zoom-pan-pinch
- Renders `OrgTreeNode` for each root node
- Zoom controls (buttons for zoom in, zoom out, reset)

- [ ] **Step 5: Verify build**

Run: `npx next build`
Expected: Org chart page builds successfully.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/org-chart/ src/components/admin/ src/app/globals.css package.json package-lock.json
git commit -m "feat: add visual org chart with recursive tree and zoom/pan"
```

---

## Task 7: Review Cycle Admin Pages

**Files:**
- Create: `src/app/admin/review-cycles/page.tsx`
- Create: `src/app/admin/review-cycles/new/page.tsx`
- Create: `src/app/admin/review-cycles/[id]/page.tsx`

- [ ] **Step 1: Create review cycles list page**

Create `src/app/admin/review-cycles/page.tsx`:
- Lists all cycles with: name, period, status badge, start/due dates, employee count
- "New Review Cycle" button
- Click row navigates to detail page

- [ ] **Step 2: Create new review cycle page**

Create `src/app/admin/review-cycles/new/page.tsx`:
- Form fields: name, period, start date, due date
- Employee selection checklist:
  - Group employees by department
  - "Select All" / "Deselect All" at top
  - Per-department toggle
  - Checkbox per employee showing name, title, role type
  - Only show active employees
- "Save as Draft" button calls `createReviewCycle` mutation, redirects to cycle detail

- [ ] **Step 3: Create review cycle detail page**

Create `src/app/admin/review-cycles/[id]/page.tsx`:
- Loads cycle with `useQuery(api.reviewCycles.getReviewCycle, { id })`
- Loads progress with `useQuery(api.reviewCycles.getCycleProgress, { cycleId })`
- Shows: cycle info, status, selected employee count
- Progress section: total/completed/pending counts
- Per-manager breakdown table: manager name, assigned count, completed count
- Individual evaluations table: employee name, status badge, reviewer — each row links to `/evaluations/[evalId]`
- Action buttons:
  - If `draft`: "Activate" button with confirmation dialog. Shows results (created/skipped counts and warnings) after activation.
  - If `active`: "Close Cycle" button
  - If `closed`: read-only view

- [ ] **Step 4: Verify build**

Run: `npx next build`
Expected: All review cycle pages build successfully.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/review-cycles/
git commit -m "feat: add review cycle management with activation flow"
```

---

## Task 8: My Team Manager Page

**Files:**
- Create: `src/app/my-team/page.tsx`

- [ ] **Step 1: Create My Team page**

Create `src/app/my-team/page.tsx` — "use client" page.

For now (without auth), show a temporary employee picker at the top so any user can "act as" a manager. This will be replaced with auth-based identity later.

Once a manager is selected:
- Load direct reports with `useQuery(api.employees.getDirectReports, { managerId })`
- Load evaluations for this reviewer with `useQuery(api.evaluations.getEvaluationsForReviewer, { reviewerId })`
- **Direct Reports section:** Card per report showing name, title, role type, last review date (from most recent evaluation), last composite score (computed via `computeCompositeScore` from `convex/calculations.ts`), and "Start Review" button. To get last review data: filter the reviewer's evaluations by each employee's ID, find the most recent finalized/submitted one, compute its composite score.
- **In-Progress section:** Draft evaluations with employee name, role type, "Continue" link to `/evaluations/[id]`
- **Completed section:** Submitted/finalized evaluations with employee name, date, and composite score, linked to `/evaluations/[id]`
- "Start Review" button:
  - If employee has `roleType`: creates evaluation directly via `createEvaluationForEmployee`
  - If no `roleType`: shows role type picker modal (dropdown from ROLE_CONFIGS) before creating

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: My Team page builds successfully.

- [ ] **Step 3: Commit**

```bash
git add src/app/my-team/
git commit -m "feat: add My Team manager page with review actions"
```

---

## Task 9: EmployeePicker Component & Enhance Existing Pages

**Files:**
- Create: `src/components/ui/EmployeePicker.tsx`
- Modify: `src/app/evaluations/new/page.tsx`
- Modify: `src/app/evaluations/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create reusable EmployeePicker component**

Create `src/components/ui/EmployeePicker.tsx` — a "use client" component used across admin forms, evaluation creation, My Team, and review cycles:

Props: `{ employees: Employee[], selected: string | null, onSelect: (id: string | null) => void, placeholder?: string }`

Implementation:
- Text input that filters the employee list by name or email as you type
- Dropdown list below the input showing matching employees (name + title + department)
- Click an employee to select them. Selected employee shown as a chip with an X to clear.
- Uses existing CSS classes (`.metric-input` for the input styling, card-like dropdown)
- Max height on dropdown with scroll for long lists

This component is used in:
- Admin employee forms (manager picker)
- Evaluation creation (employee picker)
- My Team (temporary "acting as" picker)
- Review cycle creation (createdBy picker)

- [ ] **Step 2: Update evaluations/new to use employee picker**

Modify `src/app/evaluations/new/page.tsx`:
- Keep existing role picker cards as fallback
- Add an "Employee" section above the role cards:
  - Searchable dropdown of all active employees
  - When an employee is selected, auto-fill their role type
  - If employee has a `roleType`, the role picker auto-selects it (manager can still override)
  - On create, use `createEvaluationForEmployee` instead of plain `createEvaluation`
- Maintain backward compatibility: if no employee is selected, fall through to the existing manual role picker

- [ ] **Step 3: Update evaluations list page with employee filter**

Modify `src/app/evaluations/page.tsx`:
- Add `useQuery(api.employees.getAllEmployees)` to load employees
- Add an EmployeePicker filter above the existing filters
- When an employee is selected, filter the evaluations list to show only that employee's evaluations (match by `employeeId` if present, or fall back to `empName` string match for legacy evaluations)
- Keep existing role/status filters working alongside the new employee filter

- [ ] **Step 4: Update landing page**

Modify `src/app/page.tsx`:
- Add "My Team" and "Admin" links in the quick actions section
- Keep existing links working

- [ ] **Step 5: Verify build**

Run: `npx next build`
Expected: Build succeeds, all pages render.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/EmployeePicker.tsx src/app/evaluations/new/page.tsx src/app/evaluations/page.tsx src/app/page.tsx
git commit -m "feat: add EmployeePicker, enhance evaluation pages with employee filter"
```

---

## Task 10: Deploy and Verify

**Files:**
- None (deployment only)

- [ ] **Step 1: Deploy Convex**

Run: `npx convex dev --once`
Expected: All schema changes and new functions deploy. Output shows new tables and indexes.

- [ ] **Step 2: Build Next.js**

Run: `npx next build`
Expected: Clean build with all new routes:
```
/admin
/admin/employees
/admin/employees/new
/admin/employees/[id]
/admin/org-chart
/admin/review-cycles
/admin/review-cycles/new
/admin/review-cycles/[id]
/my-team
```

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

- [ ] **Step 4: Deploy to Vercel**

Run: `vercel --prod`
Expected: Production deployment succeeds.

- [ ] **Step 5: End-to-end verification**

Follow the full verification checklist from the spec:
1. Create employees with manager relationships in admin
2. Verify org chart renders correct tree structure
3. Attempt to create employee with duplicate email — verify rejection
4. Create a review cycle, select employees, activate
5. Verify employees without managers or role types are skipped with warnings
6. Verify evaluations auto-generated for valid employees with correct reviewer/role
7. As a manager, view My Team — verify direct reports and pending reviews appear
8. Navigate from My Team to evaluation detail and back
9. Complete an evaluation — verify cycle progress updates
10. Create ad-hoc review — verify it works without a cycle
11. Edit an employee's manager — verify org chart updates
12. Attempt to deactivate a manager with reports — verify rejection
13. Reassign reports, then deactivate — verify success
14. Deactivate an employee — verify they're excluded from new cycles

- [ ] **Step 6: Final commit and push**

```bash
git add -A
git commit -m "feat: deploy org chart, admin portal, and review cycle system"
git push
```
