# Operations Daily Reports - Role Visibility

Date: 2026-09-26

## Requested change
Hide `/operations/daily-reports` from the operational roles:

- `supervisor_tolan`
- `supervisor_malqa`
- `restaurant_operations`

## Implementation

- Removed `/operations/daily-reports` from the sidebar/path allow-list for the three roles.
- Restricted the page route to `admin_affairs`; `super_admin` continues to pass through the existing global override.
- Restricted the `operationalRecordsReport` backend procedure to `admin_affairs`; `super_admin` continues to pass through the existing `requireRole` override.
- No operational records, attendance, payroll, or database data were changed.
- No SQL migration is required.

## Files changed

- `client/src/App.tsx`
- `client/src/components/DashboardLayout.tsx`
- `server/routers/restaurants.ts`
