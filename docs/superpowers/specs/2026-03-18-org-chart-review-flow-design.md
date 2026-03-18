# Org Chart & Review Flow Design

## Context

The SCOPOS Performance System currently has a flat evaluation model — evaluations are created manually with reviewer/employee names as free-text fields. There is no concept of employees as entities, reporting relationships, or structured review cycles.

This design adds an org chart, employee management, admin portal, and review cycle flow so that evaluations flow downhill based on reporting structure.

## Assumptions & Scale

- Expected org size: under 500 employees. No pagination needed — full employee list fits in one query.
- Date convention: display dates (hireDate, startDate, dueDate) stored as ISO strings (`"2026-03-18"`). Timestamps (createdAt, updatedAt) stored as `float64` (epoch ms).
- Default `adminRole` for new employees: `"employee"`.

## Data Model

### `employees` table

| Field | Type | Notes |
|-------|------|-------|
| `name` | `v.string()` | Full name |
| `email` | `v.string()` | Unique identifier (auth-ready). Enforced unique by mutation logic. |
| `title` | `v.string()` | Job title (e.g., "Senior CA", "Designer II") |
| `department` | `v.optional(v.string())` | Grouping ("Design", "Construction", "Operations") |
| `roleType` | `v.optional(v.string())` | Default evaluation form ("ca", "id", future roles) |
| `managerId` | `v.optional(v.id("employees"))` | Self-reference. Null = top of tree |
| `adminRole` | `v.string()` | `"super_admin"`, `"hr_admin"`, `"manager"`, `"employee"`. Defaults to `"employee"`. |
| `isActive` | `v.boolean()` | Soft delete / deactivation |
| `hireDate` | `v.optional(v.string())` | ISO date string for tenure context |
| `tags` | `v.optional(v.array(v.string()))` | Arbitrary categorization (teams, certs, licenses) |
| `metadata` | `v.optional(v.any())` | Extensible catch-all for future fields |
| `createdAt` | `v.float64()` | Epoch ms timestamp |
| `updatedAt` | `v.float64()` | Epoch ms timestamp |

**Indexes:** `by_email` (email), `by_manager` (managerId), `by_department` (department), `by_role` (roleType), `by_active` (isActive)

**Email uniqueness:** The `createEmployee` mutation must query `by_email` and reject duplicates before inserting. The index accelerates this check but does not enforce uniqueness on its own.

**Extensibility:** New fields start in `metadata`. If queried often, promote to top-level with an index. `roleType`, `adminRole`, and `department` are all free-text strings — no unions — so new values require no schema change.

### `reviewCycles` table

| Field | Type | Notes |
|-------|------|-------|
| `name` | `v.string()` | e.g., "Q1 2026 Performance Review" |
| `period` | `v.string()` | e.g., "Q1 2026" |
| `startDate` | `v.string()` | ISO date — when managers can begin |
| `dueDate` | `v.string()` | ISO date — deadline |
| `status` | `v.string()` | `"draft"`, `"active"`, `"closed"` |
| `selectedEmployeeIds` | `v.array(v.id("employees"))` | Employees included in this cycle |
| `createdBy` | `v.id("employees")` | Admin who created it |
| `metadata` | `v.optional(v.any())` | Extensible |
| `createdAt` | `v.float64()` | |
| `updatedAt` | `v.float64()` | |

**Indexes:** `by_status` (status), `by_created` (createdAt)

### Changes to existing `evaluations` table

Add three fields:

| Field | Type | Notes |
|-------|------|-------|
| `employeeId` | `v.optional(v.id("employees"))` | Employee being reviewed |
| `reviewerId` | `v.optional(v.id("employees"))` | Manager doing the review |
| `cycleId` | `v.optional(v.id("reviewCycles"))` | Null for ad-hoc reviews |

Optional so existing evaluations (created before this feature) continue to work. New evaluations will always have `employeeId` and `reviewerId` set.

**Snapshot semantics:** `empName`, `reviewer`, and `empPosition` are snapshot values captured at evaluation creation time from the employee records. They are not kept in sync if the employee's name or title changes later. This preserves the historical accuracy of the evaluation.

Add indexes: `by_employee_id` (employeeId), `by_reviewer_id` (reviewerId), `by_cycle` (cycleId)

## Admin Roles

| Role | Capabilities |
|------|-------------|
| `super_admin` | Everything: manage employees, org chart, review cycles, view all evaluations, manage other admins |
| `hr_admin` | Manage employees, org chart, review cycles, view all evaluations. Cannot change admin roles. |
| `manager` | View direct reports, start/continue reviews for reports, view own reports' evaluations |
| `employee` | View own completed evaluations (future, with auth) |

**Auth is deferred.** All admin pages are open for now. The `adminRole` field exists on employees so permissions can be enforced when auth is added.

## Page Routing

### Admin pages (`/admin/*`)

| Route | Purpose | Access |
|-------|---------|--------|
| `/admin` | Dashboard — employee count, active cycles, pending reviews | super_admin, hr_admin |
| `/admin/employees` | Employee list — searchable, filterable table | super_admin, hr_admin |
| `/admin/employees/new` | Add employee form | super_admin, hr_admin |
| `/admin/employees/[id]` | Edit employee — profile, role, manager, deactivate | super_admin, hr_admin |
| `/admin/org-chart` | Visual tree view of org hierarchy | super_admin, hr_admin |
| `/admin/review-cycles` | List review cycles, create new | super_admin, hr_admin |
| `/admin/review-cycles/new` | Create cycle — name, dates, select employees | super_admin, hr_admin |
| `/admin/review-cycles/[id]` | Cycle detail — progress tracking, completion stats | super_admin, hr_admin |

### Manager pages

| Route | Purpose | Access |
|-------|---------|--------|
| `/my-team` | Direct reports list, start review, pending/past reviews | manager+ |

### Existing pages (enhanced)

| Route | Changes |
|-------|---------|
| `/evaluations` | Add employee picker filter (from employees table) |
| `/evaluations/new` | Show employee selection (filtered to reports for managers, all for admins), auto-fill role type |
| `/` | Add nav links based on role |

### Navigation

Top-level nav shows links based on admin role:

- **Everyone:** Home, Evaluations
- **Manager+:** + My Team
- **HR Admin+:** + Admin (Employees, Org Chart, Review Cycles)

Completed evaluations are viewed at `/evaluations/[id]` — linked from My Team, cycle detail, and evaluations list pages.

## Org Chart Views

### Table/List View (`/admin/employees`)

- Sortable columns: Name, Title, Department, Role Type, Manager, Status
- Filters: department dropdown, role type, active/inactive toggle
- Search by name or email (client-side filter over full employee list — appropriate for expected org size < 500)
- Click row to edit employee

### Visual Tree View (`/admin/org-chart`)

- Recursive React component rendering CSS flexbox/grid tree
- Each node: name, title, department badge, direct report count
- Color-coded by department
- Click to expand/collapse subtrees
- Click "Edit" to go to employee edit page
- Zoom/pan: use `react-zoom-pan-pinch` lightweight library (pure CSS transforms are insufficient for smooth zoom/pan)
- No drag-and-drop — manager reassignment is done via employee edit page (simpler, less error-prone)

### My Team View (`/my-team`)

- Card per direct report: name, title, role type, last review date, last composite score
- "Start Review" button — creates evaluation pre-filled with employee info and default role type (manager can override)
- In-progress section: draft evaluations with "Continue" link to `/evaluations/[id]`
- Completed section: past reviews with date and score, linked to `/evaluations/[id]`

## Review Cycle Flow

### Cycle creation (admin)

1. Admin navigates to `/admin/review-cycles/new`
2. Fills in: name, period, start date, due date
3. Sees checklist of all active employees grouped by department, with "Select All" / "Deselect All" and department-level select toggles
4. Checks employees to include
5. Saves as `draft` status

### Cycle activation

1. Admin clicks "Activate" on a draft cycle. Confirmation dialog warns: "This will create X draft evaluations. This cannot be undone."
2. System validates selected employees:
   - **Employees without a manager** (`managerId` is null): skipped. A warning is shown listing these employees: "The following employees have no manager assigned and were skipped: [names]. Assign managers and re-activate to include them."
   - **Employees without a `roleType`**: skipped with warning: "The following employees have no role type and were skipped: [names]. Assign a role type to include them."
3. For each valid employee, generates one draft evaluation:
   - `employeeId` = the selected employee
   - `reviewerId` = that employee's `managerId`
   - `roleType` = the employee's default `roleType`
   - `cycleId` = this cycle
   - `empName`, `reviewer`, `empPosition` = snapshot from employee records at creation time
   - `status` = `"draft"`
4. Evaluations appear on each manager's `/my-team` page
5. The `activateReviewCycle` mutation returns `{ created: number, skipped: { noManager: string[], noRoleType: string[] } }` so the UI can show results

### Ad-hoc reviews (outside a cycle)

1. Manager goes to `/my-team`, clicks "Start Review" on a direct report
2. Picks role type (defaults to employee's `roleType`, can override). If employee has no `roleType`, the manager must select one.
3. Creates evaluation with `cycleId: null`

### Cycle progress tracking (`/admin/review-cycles/[id]`)

- Total reviews in cycle, completed count, pending count
- List of managers with their completion status (X of Y done)
- List of individual evaluations with employee name, status, reviewer — each linked to `/evaluations/[id]`

## Manager Deactivation Rules

When deactivating an employee who is a manager (has direct reports):

1. The `deactivateEmployee` mutation checks if the employee has active direct reports
2. If yes, the mutation **rejects** the deactivation with an error: "Cannot deactivate [name] — they have X direct reports. Reassign their reports first."
3. The admin must go to each direct report's profile and assign a new manager before the deactivation can proceed
4. This prevents orphaned subtrees in the org chart and broken review assignments

## Migration of Existing Evaluations

Existing evaluations (created before employees table exists) will continue to work as-is. The `employeeId`, `reviewerId`, and `cycleId` fields are optional, and the UI already handles null values for these fields.

Retroactive linking of old evaluations to employee records is **explicitly deferred** — it can be done as a future admin tool if needed, but is not in scope for this phase.

## Convex Functions

### Employee mutations

- `createEmployee(fields)` → Id. Enforces email uniqueness. Defaults `adminRole` to `"employee"`, `isActive` to `true`.
- `updateEmployee(id, fields)` — partial update. If email changes, enforces uniqueness.
- `deactivateEmployee(id)` — sets `isActive: false`. Rejects if employee has active direct reports.

### Employee queries

- `getEmployee(id)`
- `listEmployees(filters?)` — by department, role, active status
- `getDirectReports(managerId)` — employees where managerId matches
- `getAllEmployees()` — returns all active employees for org tree (client-side filtering/search)

### Review cycle mutations

- `createReviewCycle(fields)` → Id
- `updateReviewCycle(id, fields)`
- `activateReviewCycle(id)` — validates employees, generates evaluations, returns created/skipped counts
- `closeReviewCycle(id)`

### Review cycle queries

- `getReviewCycle(id)`
- `listReviewCycles(status?)`
- `getCycleProgress(cycleId)` — aggregated stats (total, completed, pending, by-manager breakdown)

### Evaluation enhancements

- `createEvaluationForEmployee(employeeId, reviewerId, roleType, cycleId?)` — creates evaluation with snapshots from employee data
- `getEvaluationsForEmployee(employeeId)` — review history
- `getEvaluationsForReviewer(reviewerId)` — manager's pending/completed
- `getEvaluationsForCycle(cycleId)` — all evaluations in a cycle

## Verification

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
