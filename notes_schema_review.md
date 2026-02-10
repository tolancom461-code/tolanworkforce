# Schema Review Notes

## Current State:
- users.role: mysqlEnum ["user", "admin"] - needs to change to 8 roles
- payrollBatches.status: already has multi-stage statuses (draft, under_accountant_review, etc.)
- No user_cost_centers table exists yet
- Need to add: accountantApprovedBy, accountantApprovedAt, auditorApprovedBy, auditorApprovedAt, financeApprovedBy, financeApprovedAt, rejectedBy, rejectionReason to payrollBatches

## Changes needed:
1. ALTER users.role enum to add new roles
2. CREATE user_cost_centers table
3. ALTER payroll_batches to add approval tracking fields
4. Update type exports
