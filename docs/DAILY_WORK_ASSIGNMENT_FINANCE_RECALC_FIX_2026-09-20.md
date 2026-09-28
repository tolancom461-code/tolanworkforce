# Daily Work Assignment Finance Recalculation Fix

**Date:** 2026-09-20  
**Scope:** Phase 2 — Operational Transfers → Daily Finance → Payroll  
**Status:** Implemented for testing

## Problem reproduced

During the 2026-09-19 test, worker `W12203` was transferred operationally inside the same cost center from `GPR18` to `GPR20`.

The operational assignment was saved correctly in `daily_work_assignments`, but the already-existing `worker_daily_finance` row still had the old effective group (`GPR18`).

Observed state before the patch:

- `source_group = GPR18`
- `operational_group = GPR20`
- `worker_daily_finance.effective_group_id = GPR18` (stale)

Expected state:

- `worker_daily_finance.effective_group_id = GPR20`

## Root cause

`server/db/daily-work-assignments.ts` saved or removed daily operational assignments without triggering the existing daily-finance recalculation flow.

The finance calculation itself already resolves the effective group in the correct priority order:

1. daily operational transfer,
2. temporary assignment,
3. worker base group.

The missing step was invoking that calculation after the effective operational group changed.

## Change

File changed:

- `server/db/daily-work-assignments.ts`

The file now calls the existing `processAttendanceToFinance(workerId, workDate)` only when the effective operational group decision changes:

- a transfer is added,
- a transfer changes from one operational group to another,
- a transfer is cancelled/removed.

A site-only change that leaves `operationalGroupId` unchanged does **not** trigger an unnecessary financial recalculation.

No payroll calculation logic, schema, UI, historical data, or administrative-day boundary logic was changed.

## Regression tests

Added:

- `server/__tests__/daily-work-assignment-finance-recalc.test.ts`

Covered cases:

1. changing the operational group triggers daily-finance recalculation;
2. a site-only change does not trigger recalculation;
3. removing an operational transfer through the assignment-save path triggers recalculation;
4. removing an operational transfer through the direct remove path also triggers recalculation.

## Expected verification after applying the patch

The patch intentionally does not backfill an already-stale finance row merely by saving an identical assignment again. To verify the fix, perform a new operational-group change after applying the patch (for example on a clean test worker/date), then query the daily finance row.

Expected after that new change:

- `daily_work_assignments.operational_group_id` points to the newly selected operational group;
- `worker_daily_finance.effective_group_id` points to the same effective group;
- the daily financial values are recalculated using that effective group configuration.

## Data safety

- No migration.
- No backfill.
- No automatic changes to historical records.
- No modification to approved/paid payroll batches.
- The patch only recalculates the affected worker/date when an operational group assignment changes through this path.
