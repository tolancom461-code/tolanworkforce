# Phase 5 — Cost Report Backend RBAC Fix

**Date:** 2026-09-21  
**Scope:** Minimal backend authorization hardening for `operations/cost-report`  
**Status:** Patch prepared

## Problem

The UI currently exposes `/operations/cost-report` to Admin Affairs and Accountant users (with Super Admin having global access), while operations-only and other roles do not have that route in their allowed paths.

The backend procedure `restaurants.costReport` was protected only by authentication (`protectedProcedure`). Therefore, a logged-in user whose UI did not expose the report could still attempt to call the tRPC endpoint directly.

This is a Phase 5 RBAC issue because authorization must be enforced server-side, not only through UI visibility.

## Change

In:

`server/routers/restaurants.ts`

The existing cost-report procedure now applies:

```ts
.use(requireRole('admin_affairs', 'accountant'))
```

`requireRole()` already permits `super_admin` globally, so the effective allowed roles are:

- `admin_affairs`
- `accountant`
- `super_admin`

No additional roles are granted access by this patch.

## Before

- Unauthenticated user: blocked.
- Any authenticated role: backend procedure could be called.
- UI hid the page from roles such as `restaurant_operations`, but that was not sufficient backend enforcement.

## After

- `admin_affairs`: allowed.
- `accountant`: allowed.
- `super_admin`: allowed through the existing Super Admin bypass in `requireRole()`.
- Other roles: backend returns `FORBIDDEN` before cost-report data is queried.

## Regression Test

Added:

`server/__tests__/restaurant-cost-report-rbac.test.ts`

The test verifies that disallowed roles are rejected before `getRestaurantCostReport()` is called, and that the currently allowed roles can reach the report procedure.

## Files Modified

- `server/routers/restaurants.ts`
- `server/__tests__/restaurant-cost-report-rbac.test.ts`
- `docs/PHASE5_COST_REPORT_BACKEND_RBAC_FIX_2026-09-21.md`

## Not Changed

- No database schema change.
- No migration.
- No historical data change.
- No Payroll calculation change.
- No report calculation change.
- No UI role expansion.
- Auditor and Finance Manager access was not expanded; that is a separate policy decision if desired later.
