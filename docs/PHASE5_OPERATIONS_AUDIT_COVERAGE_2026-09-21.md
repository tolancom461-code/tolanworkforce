# Phase 5 — Operations Audit Coverage Patch

**Date:** 2026-09-21  
**Status:** Implemented  
**Scope:** Audit coverage only for:

- `/operations/staffing`
- `/operations/restaurants`
- `/operations/cost-report`

## Purpose

Complete the legacy `audit_log` trail for sensitive operational actions without changing the audit schema, payroll logic, operational-day rules, or report calculations.

## Changes

### 1. `/operations/staffing`

File: `server/db/daily-work-assignments.ts`

The following actions now write to `audit_log`:

- `CREATE_OPERATIONAL_ASSIGNMENT`
- `UPDATE_OPERATIONAL_ASSIGNMENT`
- `DELETE_OPERATIONAL_ASSIGNMENT`

Each entry records the acting user, target `daily_work_assignments` record when available, work date, worker ID, site ID, source group ID, and operational group ID. Update/delete records include old/new values as applicable.

Existing behavior remains unchanged:

- operational-day access checks remain in place;
- reopened-day revision tracking remains in `operational_day_events`;
- daily-finance recalculation behavior from the previous patch remains intact.

### 2. `/operations/restaurants`

File: `server/routers/restaurants.ts`

The following actions now write to `audit_log`:

- `CREATE_OPERATIONAL_DEPARTMENT`
- `UPDATE_OPERATIONAL_DEPARTMENT`
- `DELETE_OPERATIONAL_DEPARTMENT`
- `CREATE_OPERATIONAL_SITE`
- `UPDATE_OPERATIONAL_SITE`
- `DEACTIVATE_OPERATIONAL_SITE`
- `DELETE_OPERATIONAL_SITE`

Update/delete operations capture before/after snapshots when available.

### 3. `/operations/cost-report`

File: `server/routers/restaurants.ts`

Successful report access now writes:

- `VIEW_OPERATIONAL_COST_REPORT`

The audit entry stores only the request filters:

- start date
- end date
- cost center filter
- source group filter
- site filter
- worker filter

The report contents and financial totals are **not** copied into `audit_log`.

The backend RBAC protection applied previously remains intact: the report is still limited to `admin_affairs`, `accountant`, and `super_admin` (super-admin bypass via the existing role middleware).

## Files Changed

- `server/db/daily-work-assignments.ts`
- `server/routers/restaurants.ts`
- `server/__tests__/daily-work-assignment-finance-recalc.test.ts`
- `server/__tests__/restaurant-cost-report-rbac.test.ts`
- `docs/PHASE5_OPERATIONS_AUDIT_COVERAGE_2026-09-21.md`

## Not Changed

- No database schema or migration.
- No changes to `server/db/audit.ts` or `server/db/audit-v2.ts`.
- No changes to payroll calculations.
- No changes to attendance/day-boundary logic.
- No changes to report financial calculations.
- No changes to historical data.

## Verification

The modified TypeScript files were syntax-transpiled successfully with TypeScript 5.9. Full Vitest execution was not run in the supplied project copy because `node_modules` is not present.

Recommended functional checks after applying the patch:

1. Save or change one worker assignment in `/operations/staffing` and verify an assignment audit entry.
2. Modify one operational site or department in `/operations/restaurants` and verify the audit entry.
3. Open `/operations/cost-report` with an authorized user and verify `VIEW_OPERATIONAL_COST_REPORT` with the selected filters.
