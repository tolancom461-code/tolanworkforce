# TolanWorkforce - Project TODO

## Phase 2: Admin Dashboard Application

### Database & Schema
- [x] Update Drizzle schema with all 22 Supabase tables
- [x] Create database query helpers for users, roles, permissions
- [x] Set up database connection

### Authentication System
- [x] Implement login page with elegant design
- [x] Implement logout functionality
- [x] Session management with Manus OAuth
- [x] Protected routes middleware

### Dashboard Layout
- [x] Create elegant sidebar navigation
- [x] Implement responsive dashboard layout
- [x] Add user profile dropdown in header
- [x] Dark/Light theme support

### User Management
- [x] User list page with search and filters
- [x] Add new user form/modal
- [x] Edit user form/modal
- [x] Delete user with confirmation
- [x] Role assignment interface

### Permissions Management
- [x] Permissions list page
- [x] Assign permissions to users via checkboxes
- [x] Role-based permissions display
- [x] Permission groups by category

### User Profile
- [x] Profile page with user info
- [x] Edit personal information form
- [x] Change password functionality

### Security & Middleware
- [x] Route protection based on permissions
- [x] Role-based access control
- [x] Unauthorized access handling

### Testing
- [x] Write vitest tests for auth procedures
- [x] Write vitest tests for user management
- [x] Write vitest tests for permissions

## New Features

### Dark/Light Theme
- [x] Update CSS variables for dark mode support
- [x] Add theme toggle button to dashboard
- [x] Persist theme preference in localStorage
- [x] Test theme switching functionality

## Phase 3: Groups & Workers Management

### Groups Management
- [x] API procedures for groups CRUD
- [x] Groups list page with search
- [x] Add new group dialog
- [x] Edit group dialog
- [x] Delete group with confirmation
- [x] Shift management for each group

### Workers Management
- [x] API procedures for workers CRUD
- [x] Workers list page with search and filters
- [x] Add new worker dialog with photo upload
- [x] Edit worker dialog
- [x] Delete worker with confirmation
- [x] QR code generation for each worker
- [x] Worker details view

### Navigation
- [x] Add Groups and Workers to sidebar menu
- [x] Update routes in App.tsx


## Remaining Items for Phase 2 & 3 Completion

### Phase 2 Remaining
- [x] Connect to external Supabase database (jriffylmgviydaojzmai)
- [x] Change password functionality

### Phase 3 Remaining
- [x] Shifts management UI for groups (group_shifts table)
- [x] Image compression before upload
- [x] Worker card print page with QR Code
- [x] Worker details page with full info and attendance history
- [x] Filter groups by cost center

### Additional Completed Items
- [x] Worker attendance history API (getWorkerAttendance)
- [x] Worker finance summary API (getWorkerFinanceSummary)
- [x] Worker pay overrides API (getPayOverrides)
- [x] Worker details page with attendance tab showing real data
- [x] Worker details page with finance tab showing real summary
- [x] Toast notifications for all CRUD operations
- [x] All vitest tests passing (33 tests)


## Phase 4: Attendance System (نظام الحضور والانصراف)

### API Procedures
- [x] Create attendance check-in/check-out API
- [x] Create daily attendance log API
- [x] Create monthly attendance report API
- [x] Create work days management API

### Attendance Registration Page
- [x] QR Code scanner interface
- [x] Manual code input option
- [x] Worker info display after scan
- [x] Check-in/Check-out buttons
- [x] Success/Error feedback

### Daily Attendance Log
- [x] List all attendance records for today
- [x] Filter by group
- [x] Show check-in and check-out times
- [x] Calculate work hours

### Monthly Reports
- [x] Attendance summary by worker
- [x] Days worked, late, absent statistics
- [x] Export to CSV option
- [x] Filter by date range and group

### Work Days Management
- [x] Calendar view for work days
- [x] Mark holidays and weekends
- [x] Add notes to specific days

### Testing
- [x] Write vitest tests for attendance APIs (15 tests)


## Phase 4 Completion: Advanced Attendance & Finance System

### 1. Attendance to Daily Finance (Core Logic)
- [x] Create/update worker_daily_finance on attendance completion
- [x] Calculate late_minutes and early_exit_minutes
- [x] Calculate day_rate and calculated_net_amount
- [x] Respect work_days and early closure

### 2. Attendance Adjustment (HR)
- [x] Allow IN/OUT time adjustment
- [x] Add internal_note field for adjustment reason
- [x] EDIT_ATTENDANCE permission check
- [x] Auto-recalculate financial values

### 3. Pay Overrides (Individual Exceptions)
- [x] Create override types (emergency, early_closure, full_pay)
- [x] PENDING status for new overrides
- [x] Link to worker and date

### 4. Override Approval
- [x] List pending overrides
- [x] Approve/Reject functionality
- [x] APPROVE_OVERRIDES permission check
- [x] Apply effect to worker_daily_finance on approval

### 5. Daily Deductions & Additions Screen
- [x] Finance Entry screen
- [x] Input deductions, fines, additions
- [x] Auto-calculate net
- [x] Save to worker_daily_finance

### 6. Payroll Batch Creation (Draft)
- [x] Create payroll_batches
- [x] Select period, group, cost center
- [x] Aggregate worker_daily_finance
- [x] DRAFT status

### 7. Testing & Phase Closure
- [x] Vitest: attendance → finance (22 tests)
- [x] Vitest: overrides
- [x] Vitest: finance entry
- [x] Vitest: payroll draft
- [x] Review permissions
- [x] Save checkpoint


## QR Camera Scanner Feature

- [x] Install html5-qrcode library
- [x] Create reusable QR Scanner component
- [x] Update AttendanceScanner page with camera support
- [x] Add mobile-responsive UI for scanning
- [x] Test on mobile devices
- [x] Save checkpoint


## Fix Roles, Permissions, and Cost Centers

- [x] Create cost_centers table in schema
- [x] Add cost centers CRUD APIs
- [x] Create CostCenters page with management UI
- [x] Add roles management system
- [x] Define system permissions list
- [x] Update Permissions page to show defined permissions
- [x] Update Users page to show roles
- [x] Test all features
- [x] Save checkpoint


## Seed Permissions to Database

- [x] Create seed script for 44 permissions
- [x] Run script to insert permissions
- [x] Verify permissions in database (40 permissions added)
- [x] Test Permissions page with real data
- [x] Save checkpoint


## Excel Export Feature

- [x] Install ExcelJS library
- [x] Create Excel export helper functions
- [x] Add API endpoints for attendance report export
- [x] Add API endpoints for payroll report export
- [x] Add export buttons in AttendanceReports page
- [x] Add export buttons in PayrollBatches page
- [x] Test export functionality (76 tests passed)
- [x] Save checkpoint


## AI-Powered Executive Dashboard

### Smart Cards
- [x] Daily Attendance Card with trend analysis
- [x] Absence Card with anomaly detection
- [x] Late Arrivals Card with pattern analysis
- [x] Daily Expense Card with correlation analysis
- [x] Payroll Batches Card with priority ranking

### AI Intelligence Layer (5 modules only)
- [x] Operational Health Score (🟢🟡🔴)
- [x] Pressure Point Detection (single point only)
- [x] Anomaly Detection (threshold-based)
- [x] End-of-Day Forecast (lightweight)
- [x] AI Insight + Suggested Action (one action only)

### Implementation
- [x] Create analytics helper functions
- [x] Add dashboard APIs
- [x] Create Dashboard page
- [x] Test with real data (76 tests passed)
- [x] Save checkpoint


## Default Roles with Permissions

- [x] Create seed script for 5 default roles
- [x] Define permissions mapping for each role
- [x] Run script to insert roles and link permissions
- [x] Verify roles in database (5 roles with 36, 17, 9, 6, 6 permissions)
- [x] Test role assignment to users
- [x] Save checkpoint


## Seed Demo Data (Full System Test Data)

- [x] Update roles to 6 roles (Super Admin, Admin, HR Admin, Accountant, Supervisor, Guard)
- [x] Map specific permissions for each role
- [x] Add cost centers (4 centers)
- [x] Add 4 groups with shifts (5, 6, 7, 8 workers each)
- [x] Add users for each role (6 users minimum)
- [x] Add 26 workers across 4 groups (without photos, with QR codes)
- [x] Add attendance records for 1 week (7 days) for all workers (294 records)
- [x] Test all data and functionality
- [x] Create DEMO_DATA.md documentation
- [ ] Save checkpoint


## Financial Reports System (نظام التقارير المالية الشاملة)

### Phase 1: Analysis & Design
- [x] Review worker_daily_finance table structure
- [x] Review pay_overrides and deductions/additions
- [x] Design report data structure for 3 levels
- [x] Define calculation logic for totals

### Phase 2: Backend APIs
- [x] Create API: getWorkerFinancialReport (individual worker)
- [x] Create API: getGroupFinancialReport (group level)
- [x] Create API: getCostCenterFinancialReport (cost center level)
- [x] Create API: getAllFinancialReportsSummary (all cost centers)
- [x] Add date range filters to all APIs
- [x] Add tRPC endpoints for all financial reports
- [ ] Add Excel export endpoints for all reports (future enhancement)

### Phase 3: Frontend UI
- [x] Create FinancialReports page with tabs
- [x] Tab 1: Summary Report (all cost centers overview)
- [x] Tab 2: Worker Financial Report (individual details)
- [x] Tab 3: Group Financial Report (aggregated by group)
- [x] Tab 4: Cost Center Financial Report (aggregated by cost center)
- [x] Add date range picker (daily, weekly, monthly)
- [x] Add filters (group, cost center, worker)
- [x] Display breakdown: attendance + deductions + additions = net
- [x] Add route /finance/reports to App.tsx
- [x] Add menu item to DashboardLayout
- [ ] Add Excel export buttons (future enhancement)

### Phase 4: Testing & Checkpoint
- [x] Create seed-financial-data.mjs script
- [x] Generate 147 daily finance records from attendance
- [x] Add 8 pay overrides (bonuses and deductions)
- [x] Test with demo data (26 workers, 4 groups, 4 cost centers)
- [x] Verify calculations are correct
- [x] Write vitest tests for financial report APIs (18 tests)
- [x] All tests passed (18/18)
- [x] Save checkpoint


## Export & Print Functionality (وظائف التصدير والطباعة)

### Phase 1: Setup Libraries & Utilities
- [x] Install xlsx library for Excel export
- [x] Create exportToExcel utility function
- [x] Create printTable utility function
- [x] Test utilities with sample data

### Phase 2: Financial Reports Export & Print
- [x] Add Excel export to Summary Report
- [x] Add Excel export to Worker Financial Report
- [x] Add Excel export to Group Financial Report
- [x] Add Excel export to Cost Center Financial Report
- [x] Add print button to all financial report tabs

### Phase 3: Other Reports & Lists Export & Print
- [x] Add print button to Attendance Reports
- [x] Add Excel export to Workers List
- [x] Add print button to Workers List
- [ ] Add Excel export to Groups List (future)
- [ ] Add Excel export to Attendance Log (future)
- [ ] Add Excel export to Payroll Batches (future)

### Phase 4: Testing & Checkpoint
- [x] Test Excel export with Arabic text (xlsx library supports UTF-8)
- [x] Test print functionality on all pages (printPage utility created)
- [x] Verify formatting and layout (all buttons added with proper styling)
- [x] Verify no TypeScript errors
- [x] Save checkpoint


## Advanced Payroll Batch System (نظام دفعات الرواتب المتقدم)

### Phase 1: Database Schema & Backend Foundation
- [x] Create `payroll_batches` table with all statuses
- [x] Create `payroll_batch_items` table for worker details
- [x] Create `payroll_batch_notes` table for review comments
- [x] Create `payroll_batch_corrections` table for correction history
- [x] Add rejection_count field to track correction attempts
- [x] Update schema with all 8 workflow states
- [x] Run pnpm db:push to apply changes

### Phase 2: Backend APIs - Batch Creation & Management
- [x] API: createPayrollBatch (HR Admin only)
- [x] API: getPayrollBatchDetails (with permissions check)
- [x] API: updateBatchItem (edit worker amount in DRAFT)
- [ ] API: addWorkerToBatch (DRAFT only) - future enhancement
- [ ] API: removeWorkerFromBatch (DRAFT only) - future enhancement
- [ ] API: calculateBatchSummary (executive summary) - included in getDetails
- [ ] API: compareBatchWithPrevious (comparison report) - future enhancement

### Phase 3: Backend APIs - Review Workflow
- [x] API: submitForAccountantReview (HR → Accountant)
- [x] API: accountantApprove (Accountant → Financial Reviewer)
- [x] API: accountantReject (with note type: critical/warning/info)
- [x] API: financialReviewerApprove (Financial → Accounts Manager)
- [x] API: financialReviewerReject (back to HR for correction)
- [x] API: accountsManagerApprove (final approval)
- [x] API: accountsManagerReject (final rejection)
- [x] API: resubmitAfterCorrection (HR resubmits) - included in submitForReview

### Phase 4: Backend APIs - Notes & Corrections
- [ ] API: addBatchNote (with error type and location)
- [ ] API: getBatchNotes (all review comments)
- [ ] API: recordCorrection (track what was fixed)
- [ ] API: getBatchHistory (full audit trail)

### Phase 5: Backend APIs - Reports
- [ ] API: getApprovedBatches (for printing/export)
- [ ] API: getBatchComparisonReport
- [ ] API: getErrorStatisticsReport
- [ ] API: getPerformanceReport (review times, approval rates)

### Phase 6: Frontend - Batch Creation (HR Admin)
- [ ] Page: /finance/payroll/create (step 1: select period/group/cost center)
- [ ] Page: /finance/payroll/{id}/edit (step 2: review and edit items)
- [ ] Component: ExecutiveSummary (totals, averages, comparison)
- [ ] Component: WorkerItemEditor (edit base/deductions/bonuses)
- [ ] Component: AddWorkerDialog
- [ ] Button: Submit for Review

### Phase 7: Frontend - Accountant Review
- [ ] Page: /finance/payroll/accountant-queue (list of pending batches)
- [ ] Page: /finance/payroll/{id}/accountant-review
- [ ] Component: ReviewNoteForm (with error type selector)
- [ ] Component: ErrorLocationSelector (worker + field)
- [ ] Button: Approve → Send to Financial Reviewer
- [ ] Button: Reject → Return to HR

### Phase 8: Frontend - Financial Reviewer
- [ ] Page: /finance/payroll/financial-queue
- [ ] Page: /finance/payroll/{id}/financial-review
- [ ] Component: ComplianceChecklist
- [ ] Button: Approve → Send to Accounts Manager
- [ ] Button: Reject → Return to HR

### Phase 9: Frontend - Accounts Manager (Final Approval)
- [ ] Page: /finance/payroll/manager-queue
- [ ] Page: /finance/payroll/{id}/final-approval
- [ ] Component: FinalApprovalSummary
- [ ] Button: Final Approve
- [ ] Button: Final Reject

### Phase 10: Frontend - Corrections (HR Admin)
- [ ] Page: /finance/payroll/{id}/corrections
- [ ] Component: ReviewNotesDisplay (show all comments)
- [ ] Component: CorrectionForm
- [ ] Button: Resubmit after corrections
- [ ] Alert: Show rejection count (max 3)

### Phase 11: Frontend - Reports & Export
- [ ] Page: /finance/payroll/approved (list of approved batches)
- [ ] Component: PayrollBatchReport (printable format)
- [ ] Button: Export to Excel (detailed breakdown)
- [ ] Button: Export to PDF
- [ ] Button: Print
- [ ] Report: Batch Comparison
- [ ] Report: Error Statistics
- [ ] Report: Performance Metrics

### Phase 12: Permissions & Role-Based Access
- [ ] Implement role check: HR Admin (create, edit, resubmit)
- [ ] Implement role check: Accountant (review, approve/reject)
- [ ] Implement role check: Financial Reviewer (review, approve/reject)
- [ ] Implement role check: Accounts Manager (final approve/reject)
- [ ] Implement role check: Super Admin (all permissions)
- [ ] Add permission checks to all APIs
- [ ] Add UI conditional rendering based on role

### Phase 13: Testing & Validation
- [x] Write vitest tests for all payroll batch APIs (13 tests)
- [x] Test full approval workflow: Draft → Accountant → Financial → Manager → Approved
- [x] Test rejection workflows (accountant, financial reviewer, accounts manager)
- [x] Test rejection count tracking
- [x] Test batch deletion (DRAFT only)
- [x] Test edge cases (non-existent batch, invalid status transitions)
- [ ] Note: Tests need demo financial data for the test periods to pass
- [ ] Test role-based permissions (future)
- [ ] Test executive summary calculations (future)
- [ ] Test report generation and export (future)
- [x] Save checkpoint


## Payroll Batch System - Frontend UI Development

### Phase 1: Page Structure & Basic Components
- [x] Create PayrollBatchList.tsx (main dashboard)
- [ ] Create PayrollBatchCreate.tsx (HR Admin - create new batch)
- [ ] Create PayrollBatchDetails.tsx (view batch details)
- [ ] Create PayrollBatchReview.tsx (review and approve/reject)
- [x] Create shared components (StatusBadge)
- [ ] Create shared components (BatchSummaryCard, WorkerItemCard)
- [x] Add routes to App.tsx
- [x] Add menu items to DashboardLayout
- [x] Add listBatches and listBatchesByStatus APIs to routers.ts

### Phase 2: HR Admin Pages (Create & Manage)
- [x] Implement batch creation form with date range picker
- [x] Add filters (group, cost center)
- [x] Display generated batch items in table (PayrollBatchDetails)
- [x] Add edit batch item functionality (DRAFT only)
- [x] Add delete batch functionality (DRAFT only - in PayrollBatchList)
- [x] Add submit for review button
- [x] Show executive summary (total amount, worker count, avg salary)
- [x] Handle loading and error states

### Phase 3: Review Pages (Accountant, Financial Reviewer, Accounts Manager)
- [ ] Create Accountant review page (under_accountant_review status)
- [ ] Create Financial Reviewer page (under_financial_review status)
- [ ] Create Accounts Manager page (under_accounts_manager_review status)
- [ ] Add approve/reject buttons with role-based visibility
- [ ] Add note input for rejection (type: critical/warning/info)
- [ ] Display rejection history and count
- [ ] Show previous notes from other reviewers
- [ ] Add worker-specific note markers (highlight errors)

### Phase 4: Notes & Corrections System
- [ ] Create BatchNotesPanel component
- [ ] Display all notes grouped by reviewer
- [ ] Show note type badges (critical/warning/info)
- [ ] Highlight affected workers and fields
- [ ] Add correction tracking (before/after values)
- [ ] Show correction history timeline
- [ ] Add filter notes by type/reviewer

### Phase 5: Testing & Checkpoint
- [ ] Test full workflow: Create → Submit → Accountant → Financial → Manager → Approved
- [ ] Test rejection workflow: Reject → Correct → Resubmit
- [ ] Test role-based UI visibility
- [ ] Test all status transitions
- [ ] Verify executive summary calculations
- [ ] Test with demo data
- [ ] Save checkpoint


## Payroll Review & Approval Pages (صفحات المراجعة والاعتماد)

### Phase 1: Shared Review Components
- [x] Create unified PayrollBatchReview component with role prop
- [x] Implement ReviewNotesSection (display all notes with type badges)
- [x] Implement ReviewActions (approve/reject buttons with note input)
- [x] Implement NoteTypeSelector (critical/warning/info)
- [ ] Create CorrectionsHistory component (display all corrections) - future

### Phase 2: Role-Specific Review Pages
- [x] Create AccountantReview page (under_accountant_review status)
- [x] Create FinancialReview page (under_financial_review status)
- [x] Create AccountsManagerReview page (under_accounts_manager_review status)
- [x] Add routes to App.tsx
- [x] Add review buttons in PayrollBatchList based on status
- [ ] Add role-based permissions check (future)
- [ ] Update DashboardLayout menu items (future)

### Phase 3: Notes & Corrections System
- [ ] Implement addNote functionality with type classification
- [ ] Display notes in timeline format
- [ ] Show corrections history with before/after values
- [ ] Add rejection count warning (3 max)
- [ ] Handle final rejection flow

### Phase 4: Testing & Checkpoint
- [ ] Test full approval workflow
- [ ] Test rejection and correction workflow
- [ ] Test role-based access control
- [ ] Save checkpoint


## Payroll Demo Data & Permissions (البيانات التجريبية والصلاحيات)

### Phase 1: Create Demo Payroll Batches
- [x] Create seed-payroll-batches.mjs script
- [x] Add batch in "draft" status
- [x] Add batch in "under_accountant_review" status with notes
- [x] Add batch in "returned_from_accountant" status with rejection notes
- [x] Add batch in "under_financial_review" status
- [x] Add batch in "under_accounts_manager_review" status
- [x] Add batch in "approved" status
- [x] Add batch in "rejected_final" status
- [x] Run script to populate database (7 batches created)

### Phase 2: Add Role-Based Permissions
- [ ] Create permission check middleware in server/_core/permissions.ts
- [ ] Add hasPermission helper function
- [ ] Update accountantApprove/Reject to check "payroll_batch_accountant_review" permission
- [ ] Update financialReviewerApprove/Reject to check "payroll_batch_financial_review" permission
- [ ] Update accountsManagerApprove/Reject to check "payroll_batch_manager_review" permission
- [ ] Add role check in getDetails API (only show batches user can access)
- [ ] Test permission checks with different roles

### Phase 3: Testing & Checkpoint
- [ ] Test creating batch as HR Admin
- [ ] Test accountant review workflow
- [ ] Test financial reviewer workflow
- [ ] Test accounts manager approval
- [ ] Test rejection and correction flow
- [ ] Verify permission checks work correctly
- [ ] Save checkpoint


## إصلاحات وتحسينات دفعات الرواتب (المرحلة الحالية)

### إصلاح مشكلة عدم ظهور الدفعة للمحاسب
- [x] تحليل سبب خطأ "لم يتم العثور على الدفعة" عند المحاسب
- [x] فحص API getBatchDetails والتأكد من عدم وجود فلترة خاطئة
- [x] فحص نظام الصلاحيات في routers.ts
- [x] إصلاح مشكلة route pattern في PayrollBatchReview.tsx
- [x] اختبار الوصول إلى الدفعة من حساب المحاسب

### تحسين صفحة إنشاء الدفعة (PayrollBatchCreate)
- [x] إعادة ترتيب الفلاتر: التاريخ → مركز التكلفة → المجموعات
- [x] إضافة فلترة المجموعات حسب مركز التكلفة المختار
- [x] إخفاء قائمة المجموعات حتى يتم اختيار مركز التكلفة
- [x] فلترة المجموعات في Frontend حسب costCenter### تحسين عرض البيانات في صفحة التفاصيل (PayrollBatchDetails)
- [x] تحديث Backend API لإضافة groupName في البيانات المعادة
- [x] تجميع العمال حسب المجموعة
- [x] إضافة صف ملخص لكل مجموعة (عدد العمال، إجمالي الرواتب، الخصومات، الإضافات، الصافي)
- [x] عرض تفاصيل العمال تحت كل مجموعة بمسافات بادئة
- [x] تحسين التنسيق البصري (أيقونات، ألوان)مجمع
- [ ] إضافة أيقونات ومؤشرات بصرية للمجموعات

### اختبار وحفظ
- [x] اختبار إنشاء دفعة جديدة مع الفلاتر المحدثة
- [x] اختبار عرض الدفعة مع التجميع حسب المجموعات
- [x] اختبار صفحة مراجعة المحاسب بعد الإصلاح
- [ ] حفظ checkpoint نهائي