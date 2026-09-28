# Phase 5 — Cost Report Frontend RBAC Fix

**Date:** 2026-09-21  
**Scope:** Minimal frontend route authorization for `operations/cost-report`  
**Status:** Patch prepared

## Background

The backend endpoint for `operations/cost-report` was already hardened in the previous Phase 5 patch so that only:

- `admin_affairs`
- `accountant`
- `super_admin` (through the existing global override)

can retrieve report data.

Manual verification with the operations user `qq1` confirmed that the backend protection works: the user could open the page shell directly by URL, but report data did not load.

## Problem

The frontend route in `client/src/App.tsx` used `ProtectedRoute` without `allowedRoles`:

```tsx
<Route path="/operations/cost-report">
  <ProtectedRoute>
    <RestaurantCostReport />
  </ProtectedRoute>
</Route>
```

That checks authentication only. Therefore, a logged-in disallowed role such as `restaurant_operations` could open the page shell by typing the URL directly, even though the backend correctly blocked the data.

## Change

A dedicated frontend role list was added:

```ts
const OPERATIONS_COST_REPORT_ROLES = [
  "admin_affairs",
  "accountant",
] as const;
```

The route now uses:

```tsx
<ProtectedRoute allowedRoles={OPERATIONS_COST_REPORT_ROLES}>
```

`ProtectedRoute` already treats `super_admin` as a global override, so effective access is:

- `admin_affairs`
- `accountant`
- `super_admin`

## Before

- Disallowed logged-in user could open `/operations/cost-report` directly.
- Backend data was blocked by the previous backend RBAC patch.
- Result: no data leak, but the unauthorized page shell was visible.

## After

- Disallowed logged-in user is stopped by the frontend route and sees the existing “غير مصرح” screen.
- Backend remains independently protected by the previous patch.
- Allowed roles continue to access the page normally.

## Files Modified

- `client/src/App.tsx`
- `docs/PHASE5_COST_REPORT_FRONTEND_RBAC_FIX_2026-09-21.md`

## Not Changed

- No backend logic change.
- No database/schema change.
- No report calculation change.
- No Payroll change.
- No role expansion.
- No changes to any other page or route.

## Manual Regression Test

After applying the patch and restarting/rebuilding the application:

1. Log in as `qq1` (`restaurant_operations`).
2. Navigate directly to `/operations/cost-report`.
3. Expected: the existing unauthorized-access screen is shown; the cost report page does not open.
4. Log in as an allowed role such as `accountant` or `admin_affairs`.
5. Expected: the cost report page opens and data loads normally.
