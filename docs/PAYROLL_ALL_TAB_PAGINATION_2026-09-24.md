# Payroll All Tab Pagination — 2026-09-24

## Scope
This patch changes pagination only for the **All** tab in `/payroll/batches`.

## Behavior
- The **All** tab loads 20 payroll batches per page.
- Adds **Previous / Next** controls and displays the current page out of total pages.
- Existing filters continue to apply and reset the All tab to page 1 when changed.
- Other workflow tabs are unchanged and continue using their existing queries/counts.

## Files changed
- `client/src/pages/payroll/PayrollBatchList.tsx`

## Backend / database impact
- No backend changes.
- No schema changes.
- No SQL or migrations.
- No payroll calculation or approval-workflow changes.

The existing `payroll.listBatches` endpoint already supports `page`, `limit`, `total`, and `totalPages`; this patch reuses it with a page size of 20 only for the All tab.
