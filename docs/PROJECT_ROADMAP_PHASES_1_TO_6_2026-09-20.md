# PROJECT ROADMAP — PHASES 1 TO 6

**Date:** 2026-09-20  
**Purpose:** Official working roadmap for closing the current implementation/testing stream and organizing the remaining work.

> Note: Phase 1 and Phase 2 are based on the existing project handoff documents. Phases 3–6 are a newly proposed structure to organize the remaining work after Phase 2 is closed.

---

## Phase 1 — Operations Foundation
**Status:** Completed / Functionally closed

### Scope
- `operations/staffing`
- `operations/restaurants`
- `operations/cost-report`
- Supporting backend/schema for operational structure

### Rule
Do not reopen or redesign Phase 1 unless there is a direct defect or an explicit request.

---

## Phase 2 — Operational Transfers → Daily Finance → Payroll
**Status:** In final functional testing

### Already proven
- Cost-center scoped operations users.
- Operational day close/reopen workflow.
- Revision/audit review before re-closing.
- Draft payroll lock on the source operational day, including cross-cost-center transfer cases.
- Daily finance based on effective group, not “last group in period”.
- Worker split correctly across two cost centers in a multi-day payroll period.
- Payroll detail display corrected to use the effective payroll item group.
- Site display and late/early statistics scoped to the actual days represented by the payroll item.
- Dynamic CEO report signatures implemented and functionally tested as a completed side task.
- Transition logic patch applied:
  - before 2026-09-17 → 05:00 boundary
  - from 2026-09-17 onward → 04:40 boundary
  - no historical backfill

### Remaining closure tests
1. Re-test the operational-day boundary after the latest patch:
   - 04:39:59 → previous operational day
   - 04:40:00 → new operational day
2. Fix and test editing an existing attendance event so `work_date` is recalculated when the edited event crosses the day boundary, including correct recalculation of old/new financial days.
3. Resolve the “Add Full Session” date/timezone behavior only if the issue is reproduced and proven.
4. Transfer between two groups inside the same cost center.
5. Multiple transfers for one worker inside one payroll period.
6. Worker with no operational transfer/assignment record should remain on base group/cost center.
7. Administrative deduction on a due date where the worker is transferred: deduction must follow the effective group/cost center for that due date.
8. Verify old `approved` / `paid` payroll batches remain unaffected.
9. Approve a controlled test payroll batch and compare with `operations/cost-report`.
10. Verify `restaurant-costs` total equals approved `payroll_batch_items.netAmount` exactly to the halala.

### Exit criteria
Phase 2 can be closed only after the above tests pass and no unresolved defect remains in the operational-day → daily-finance → payroll → cost-report chain.

---

## Phase 3 — Payroll Approval Lifecycle End-to-End
**Status:** Planned

### Scope
- Draft creation
- Admin Affairs submission/preparation
- Optional accountant first review
- Auditor approval
- Finance manager approval
- Final approval/payment transition
- Reject / return-for-edit / resubmit workflow
- New approval cycle after modification
- Verify the current-cycle approver identities and audit trail

### Existing completed component
Dynamic signatures in `finance/ceo-reports` are already implemented:
- إعداد → current Admin Affairs sender/preparer
- مراجعة أولى → accountant if actually approved; otherwise blank
- المراجع المالي → actual auditor
- رئيس الحسابات → actual finance manager
- last two executive signatures remain fixed

### Exit criteria
Every allowed approval path, skip path, rejection path, rework path, and final state is reproducible with correct audit history and permissions.

---

## Phase 4 — Financial Reports & Cost Accounting
**Status:** Planned

### Scope
- Final validation of cost-center reports.
- Site/restaurant cost reports.
- Approved/Paid reconciliation.
- CEO/management report consistency.
- Verify no financial report recomputes payroll differently from the approved payroll source.
- Period totals, center totals, worker totals, and site allocation reconciliation.
- Halala-level reconciliation controls.

### Exit criteria
All financial reports reconcile to approved/paid source amounts with no unexplained variance.

---

## Phase 5 — RBAC, Audit & Administrative Controls
**Status:** Planned

### Scope
Review and test roles such as:
- `admin_affairs`
- `accountant`
- `auditor`
- `finance_manager`
- `restaurant_operations`
- `super_admin`

Verify:
- page access
- action permissions
- cost-center scope
- server-side enforcement, not UI-only enforcement
- reopen/close permissions
- payroll approval permissions
- report permissions
- audit-log completeness for sensitive actions

### Exit criteria
Each role can perform only its intended actions, all sensitive actions are auditable, and no cross-center or privilege leakage remains.

---

## Phase 6 — UAT, Production Readiness & Stabilization
**Status:** Planned

### Scope
Run full real-world scenarios end-to-end:
attendance → operational assignment → day close → daily finance → payroll → approvals → reports

Also validate:
- historical data safety
- approved/paid immutability
- error handling
- timezone/date boundaries
- backup/restore procedure
- deployment checklist
- environment/configuration review
- smoke tests after deployment
- operational documentation and handoff

### Exit criteria
A controlled UAT cycle passes without blocking defects and the production deployment/recovery checklist is complete.

---

# Current execution order

**Now:** Finish Phase 2 only.  
**Immediate next test:** 04:39:59 / 04:40:00 on `W12210`.

After Phase 2 closes:
1. Phase 3 — Payroll approval lifecycle
2. Phase 4 — Financial reports and reconciliation
3. Phase 5 — RBAC and audit
4. Phase 6 — UAT and production readiness

---

# Change-control rule

For all remaining phases:
- inspect code first,
- explain cause and impact before modifying,
- modify the minimum necessary files,
- deliver each code change as a small ZIP with the original folder structure,
- include patch documentation under `docs/`,
- do not change historical or approved/paid data unless explicitly authorized.
