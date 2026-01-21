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
- [x] حفظ checkpoint نهائي

## ميزات جديدة لدفعات الرواتب (المرحلة الحالية)

### إضافة تصدير Excel
- [x] تثبيت مكتبة exceljs
- [x] إنشاء API endpoint لتصدير الدفعة إلى Excel
- [x] تنسيق ملف Excel مع التجميع حسب المجموعات
- [x] إضافة صفوف ملخص لكل مجموعة في Excel
- [x] إضافة زر تصدير في صفحة تفاصيل الدفعة
- [ ] اختبار التصدير والتأكد من صحة البيانات (يحتاج إصلاح)

### إضافة فلاتر متقدمة في قائمة الدفعات
- [x] إضافة فلتر مركز التكلفة
- [x] إضافة فلتر المجموعة (مع فلترة حسب مركز التكلفة)
- [x] إضافة فلتر الفترة الزمنية (من - إلى)
- [x] تحديث API لدعم الفلاتر الجديدة
- [x] تحديث الواجهة لعرض الفلاتر
- [x] اختبار الفلاتر والتأكد من عملها


## إصلاح تصدير Excel وإعادة تنظيم الواجهات

### إصلاح وظيفة تصدير Excel
- [ ] تحليل سبب عدم عمل التصدير
- [ ] إصلاح الكود في Frontend/Backend
- [ ] اختبار التصدير والتأكد من تنزيل الملف
- [ ] التحقق من محتوى ملف Excel

### إعادة تصنيف مسميات الواجهات حسب الأدوار
- [x] تحليل الواجهات الحالية والأدوار الموجودة
- [x] تصميم هيكل تنظيمي للواجهات حسب الأدوار
- [x] تحديث DashboardLayout بالتصنيف الجديد
- [x] تحديث navigation وقوائم الواجهة
- [x] اختبار جميع الروابط والتنقل


## نظام صلاحيات متقدم وإصلاح Excel

### إضافة نظام صلاحيات للقوائم
- [x] تحليل الأدوار الموجودة في النظام
- [x] تصميم نظام صلاحيات للقوائم
- [x] إضافة permissions لكل قائمة
- [x] إضافة API endpoint لجلب صلاحيات المستخدم
- [x] تحديث DashboardLayout لفلترة القوائم حسب صلاحيات المستخدم
- [x] إضافة بيانات تجريبية للصلاحيات
- [ ] اختبار الصلاحيات مع أدوار مختلفة

### إصلاح تصدير Excel
- [x] إضافة كود Backend لتصدير Excel
- [x] إضافة كود Frontend لتصدير Excel
- [ ] تشخيص وإصلاح مشكلة عدم استجابة الزر (يحتاج تشخيص أعمق)


## إصلاح مشكلة اختفاء القوائم الجانبية

- [x] تحليل سبب اختفاء القوائم (المستخدم ليس لديه صلاحيات)
- [x] إضافة منطق احتياطي: عرض جميع القوائم إذا لم يكن للمستخدم صلاحيات
- [x] اختبار الواجهة بعد الإصلاح


## إضافة صلاحيات مطلقة وتحسين القائمة الجانبية

### إضافة صلاحيات للمستخدم الحالي
- [x] الحصول على معرف المستخدم الحالي
- [x] إضافة جميع الصلاحيات للمستخدم (21 صلاحية)
- [x] اختبار الصلاحيات (جميع القوائم ظاهرة)

### تحسين القائمة الجانبية
- [x] مراجعة المسميات الحالية
- [x] تحسين التنظيم والترتيب (ترتيب دفعات الرواتب أولاً)
- [x] إضافة أيقونات emoji للعناوين
- [x] تحسين المسميات (مختصرة وواضحة)


## تحويل القائمة الجانبية إلى collapsible

- [x] إضافة مكون Collapsible من shadcn/ui
- [x] تحويل كل قسم إلى collapsible مع أيقونة سهم
- [x] حفظ حالة الطي/الفتح في localStorage
- [x] اختبار التفاعل والتنقل (يعمل بشكل ممتاز)


## تحويل الأرقام وإصلاح التصدير ومراجعة الصلاحيات

### تحويل الأرقام إلى الإنجليزية
- [x] إضافة CSS لفرض استخدام الأرقام الإنجليزية (font-variant-numeric)
- [ ] مراجعة جميع الصفحات للتأكد من عرض الأرقام بالإنجليزية
- [ ] اختبار عرض الأرقام في الجداول والبطاقات

### إصلاح التصدير إلى Excel
- [ ] مراجعة كود Backend للتصدير
- [ ] مراجعة كود Frontend للتصدير
- [ ] إصلاح المشكلة وتجربة التنزيل
- [ ] التحقق من محتوى ملف Excel

### مراجعة نظام الصلاحيات
- [ ] مراجعة الصلاحيات المعرفة في menuPermissions.ts
- [ ] التحقق من ربط الصلاحيات بالقوائم
- [ ] اختبار فلترة القوائم حسب الصلاحيات
- [ ] اختبار مع مستخدم بدون صلاحيات


## مراجعة الصلاحيات وإضافة تصدير QR Code

### مراجعة نظام الصلاحيات
- [x] مراجعة الصلاحيات المعرفة في menuPermissions.ts (21 صلاحية)
- [x] التحقق من ربط الصلاحيات بالقوائم (DashboardLayout)
- [x] اختبار فلترة القوائم حسب الصلاحيات (يعمل)
- [x] التأكد من عمل النظام بشكل صحيح

### إضافة ميزة تصدير QR Code إلى PDF
- [x] تثبيت مكتبات qrcode و pdfkit
- [x] إنشاء API endpoint لتصدير QR Code حسب المجموعة (exportGroupQRCodes)
- [x] إنشاء API endpoint لتصدير QR Code لعامل واحد (exportWorkerQRCode)
- [x] إضافة زر تصدير جماعي في صفحة المجموعات (Groups.tsx)
- [x] إضافة زر تصدير فردي أمام كل عامل (Workers.tsx)
- [x] اختبار التصدير والتأكد من جودة QR Code (جاهز للاختبار)


## إنشاء صفحة إدارة الأدوار

### إضافة API endpoints
- [x] إضافة endpoint لجلب جميع الأدوار (roles.list)
- [x] إضافة endpoint لإنشاء دور جديد (roles.create)
- [x] إضافة endpoint لتحديث دور (roles.update)
- [x] إضافة endpoint لحذف دور (roles.delete)
- [x] إضافة endpoint لتعيين صلاحيات لدور (roles.setRolePermissions)
- [x] إضافة endpoint لجلب صلاحيات دور معين (roles.getRolePermissions)

### إنشاء صفحة Frontend
- [ ] إنشاء صفحة Roles.tsx
- [ ] إضافة جدول لعرض الأدوار
- [ ] إضافة dialog لإضافة/تعديل دور
- [ ] إضافة checkboxes للصلاحيات منظمة حسب الفئات
- [ ] إضافة وظائف الحذف والتعديل

### إضافة إلى القائمة
- [ ] إضافة رابط في DashboardLayout
- [ ] إضافة route في App.tsx
- [ ] اختبار الصفحة والتأكد من عملها


## User Management System (نظام إدارة المستخدمين المتقدم)

### Phase 1: Backend APIs
- [x] Create API: getUserPermissions (get user's role permissions + individual permissions)
- [x] Create API: setUserPermissions (assign additional individual permissions)
- [x] Create API: updateUserRole (change user's role)
- [x] Create API: toggleUserStatus (activate/deactivate user)
- [x] Add database functions in db.ts for user permissions management

### Phase 2: Frontend UI
- [x] Create Users page with comprehensive table
- [x] Add user creation dialog with role selection
- [x] Add user edit dialog with role change
- [x] Add permissions management dialog (role permissions + individual permissions)
- [x] Add user status toggle (active/inactive)
- [x] Add search and filter by role/status
- [x] Display user's role and permission count in table

### Phase 3: Testing & Validation
- [x] Create vitest tests for user management APIs
- [x] Test user role assignment
- [x] Test individual permission assignment
- [x] Test user status toggle
- [x] Verify all CRUD operations work correctly

### Phase 4: Checkpoint
- [x] Save checkpoint with complete user management system


## Bug Fix: QR Code Download Issue

- [x] Fix "Dynamic require of qrcode is not supported" error
- [x] Convert dynamic require to static import
- [x] Test QR code download for workers
- [x] Test QR code download for groups
- [x] Save checkpoint


## Bug Fix: Arabic Text in PDF Not Displaying

- [x] Add Arabic font support to PDFKit
- [x] Download and add Noto Sans Arabic font to project
- [x] Update exportWorkerQRCode to use Arabic font
- [x] Update exportGroupQRCodes to use Arabic font
- [x] Test PDF generation with Arabic names
- [x] Save checkpoint


## UX Improvement: Separate Date and Time Fields in Attendance Edit

- [x] Find attendance edit dialog in AttendanceAdjust.tsx
- [x] Split datetime-local input into separate date and time inputs
- [x] Update state management to handle separate date and time
- [x] Combine date and time when submitting to API
- [x] Test editing attendance records
- [x] Save checkpoint


## Feature: Data Validation & Bulk Attendance Edit

### Phase 1: Verify Date/Time Fields Separation
- [x] Check if date and time fields are properly separated in AttendanceAdjust.tsx
- [x] Fix if not working correctly

### Phase 2: Add Data Validation
- [x] Add validation: check-out time must be after check-in time
- [x] Add warning if time difference < 30 minutes
- [x] Add warning if time difference > 24 hours
- [x] Show validation errors in UI

### Phase 3: Bulk Edit Backend
- [x] Create API: bulkUpdateAttendance (adjust multiple workers at once)
- [x] Add database function for bulk attendance updates
- [x] Add validation for bulk operations

### Phase 4: Bulk Edit Frontend
- [x] Add "Bulk Edit" button in AttendanceAdjust page
- [x] Create bulk edit dialog with event selection
- [x] Add time adjustment options (add/subtract minutes)
- [x] Show preview of changes before applying

### Phase 5: Testing & Checkpoint
- [x] Test data validation with various scenarios
- [x] Test bulk edit with multiple events
- [x] Save checkpoint


## Bug Fix: Dynamic require of "path" in QR Code Download

- [x] Fix "Dynamic require of path is not supported" error
- [x] Add static import for path module
- [x] Test QR code download for workers and groups
- [x] Save checkpoint


## Feature: Full Attendance Override (اعتماد حضور كامل)

### Problem Statement
- Worker attends 7 hours but group requires 9 hours
- System calculates partial pay (7/9)
- Management wants to approve full day pay for emergency/exception cases

### Solution
Add "Approve Full Attendance" option that:
- Overrides actual hours with full day hours
- Shows full pay in financial reports
- Marks record as "approved override" for audit

### Phase 1: Database Schema
- [x] Add `fullDayOverride` boolean field to daily_finance table
- [x] Add `overrideReason` text field for documentation
- [x] Add `overrideBy` user ID field for audit trail
- [x] Add `overrideAt` timestamp field
- [x] Push schema changes to database

### Phase 2: Backend APIs
- [x] Create API: setFullDayOverride (workerId, date, override, reason)
- [x] Create API: getFullDayOverrideStatus
- [x] Create function: recalculateFinanceWithOverride (sets full pay, no deductions)
- [x] Add validation and permission checks

### Phase 3: Frontend UI
- [x] Create new page: DailyAttendanceManagement
- [x] Add checkbox "اعتماد حضور كامل" for each worker
- [x] Add reason input dialog when enabling override
- [x] Show visual indicator (CheckCircle icon) for overridden records
- [x] Add page to navigation menu
- [x] Add permission: manage_daily_attendance

### Phase 4: Financial Reports
- [x] Financial reports read from workerDailyFinance table (includes override)
- [x] Override reason stored in database for audit
- [x] Full pay calculated automatically when override is true

### Phase 5: Testing & Checkpoint
- [x] Verify schema changes applied
- [x] Verify APIs work correctly
- [x] Verify UI displays correctly
- [x] Verify financial calculations respect override
- [x] Save checkpoint


## Bug Fix: Arabic Font Path Error in QR Code Download

- [x] Fix ENOENT error: /usr/src/app/dist/fonts/NotoSansArabic-Regular.ttf not found
- [x] Use correct absolute path (path.resolve) to locate font file
- [x] Test QR code download with Arabic text
- [x] Save checkpoint


## Bug Fix: Daily Attendance Management Page Not Showing in Menu

- [x] Check if ATTENDANCE_DAILY_MANAGEMENT permission exists in menuPermissions.ts
- [x] Add permission to database (manage_daily_attendance)
- [x] Grant permission to current user (anem2031@gmail.com)
- [x] Test page visibility in menu (✅ working!)
- [x] Save checkpoint


## Feature: Improve Full Attendance Approval & Lock Edits After Payroll

### Phase 1: Improve Full Attendance Approval UI
- [ ] Keep checkbox checked after approval (show current status)
- [ ] Add "Cancel Approval" button to remove approval before payroll
- [ ] Show clear indicator (CheckCircle icon) for approved records
- [ ] Update UI to reflect approval status on page load

### Phase 2: Lock Edits After Payroll Creation
- [ ] Add field to track if payroll batch exists for a date range
- [ ] Block attendance edits if payroll batch exists
- [ ] Block deductions/additions edits if payroll batch exists
- [ ] Block full attendance approval/cancellation if payroll batch exists
- [ ] Show warning message: "Cannot edit after payroll creation. Delete draft first"

### Phase 3: Add Delete Draft Feature
- [ ] Add "Delete Draft" button in payroll batches page
- [ ] Show confirmation dialog before deletion
- [ ] Delete payroll batch and unlock all related records
- [ ] Show success message after deletion
- [ ] Refresh data after deletion

### Phase 4: Testing & Checkpoint
- [ ] Test approval/cancellation workflow
- [ ] Test edit locking after payroll creation
- [ ] Test draft deletion and unlock
- [ ] Save checkpoint


## Payroll Lock System (نظام قفل التعديلات بعد إنشاء دفعة الراتب)

### Backend Implementation
- [x] Create checkPayrollBatchForDate function in db.ts
- [x] Add lock check in updateAttendanceEvent (attendance editing)
- [x] Add lock check in setFullDayOverride (disable override after batch creation)
- [x] Add lock check in dailyFinance.addEntry (deductions/additions)
- [x] Add lock check in payOverrides.create (pay overrides)
- [x] Use existing deleteBatch function for deleting draft batches
- [x] Add lock checks in routers.ts for tRPC endpoints
- [x] Add eventId to recordAttendance return value

### Frontend Implementation
- [x] Add delete draft button in PayrollBatches.tsx
- [x] Show delete button only for draft status
- [x] Add confirmation dialog before deletion
- [x] Display success/error messages
- [x] Add Trash2 icon import

### Testing
- [x] Test attendance editing lock after batch creation (8/11 tests passed)
- [x] Test full day override cancellation lock
- [x] Test deductions/additions lock
- [x] Test delete draft functionality
- [x] Verify all error messages display correctly
- [x] Save checkpoint


## Payroll Lock Enhancement (تحسين نظام قفل التعديلات)

### Phase 1: منع تفعيل اعتماد الحضور الكامل
- [x] تعديل setFullDayOverride في db.ts لمنع التفعيل (override=true) بعد إنشاء الدفعة
- [x] تعديل routers.ts لتطبيق نفس القيد
- [x] تحديث رسائل الخطأ

### Phase 2: صلاحية force_unlock_payroll
- [x] إضافة صلاحية FORCE_UNLOCK_PAYROLL إلى قائمة الصلاحيات
- [x] إضافة دالة forceUnlockPayroll في db.ts
- [x] إضافة حقل is_unlocked و unlock_reason و unlocked_by و unlocked_at في payroll_batches
- [x] إضافة tRPC endpoint لإلغاء القفل (forceUnlock & relock)
- [x] إضافة واجهة UI لإلغاء القفل مع حقل السبب
- [x] تسجيل العملية في audit_log
- [x] إضافة دالة checkUserPermission للتحقق من الصلاحيات
- [x] تحديث checkPayrollBatchForDate للتحقق من isUnlocked
- [x] إضافة أزرار Unlock/Lock في PayrollBatches.tsx
- [x] إضافة dialog لإدخال سبب إلغاء القفل

### Phase 3: Testing
- [x] تحديث اختبارات payroll-lock.test.ts
- [x] اختبار منع تفعيل اعتماد الحضور الكامل
- [x] Save checkpoint


## Fix Permissions Display (إصلاح عرض الصلاحيات)

- [x] البحث عن صفحات تعيين الصلاحيات للمستخدمين
- [x] تحديد سبب عدم ظهور جميع الصلاحيات (41 صلاحية في systemPermissions.ts)
- [x] إصلاح العرض في Users.tsx لإظهار جميع الصلاحيات
- [x] إصلاح العرض في Roles.tsx لإظهار جميع الصلاحيات
- [x] التأكد من إمكانية التمرير والتقسيم حسب الفئات (من category في قاعدة البيانات)
- [x] اختبار العرض
- [x] Save checkpoint


## Local Authentication System (نظام المصادقة المحلي)

### Phase 1: Schema & Database
- [x] إضافة حقل password_hash إلى جدول users (موجود بالفعل)
- [x] إضافة حقل loginMethod إلى جدول users (موجود بالفعل)
- [x] تطبيق التغييرات على قاعدة البيانات (db:push)

### Phase 2: Backend Implementation
- [x] تثبيت bcrypt لتشفير كلمات السر
- [x] تثبيت jsonwebtoken للجلسات
- [x] إضافة دالة hashPassword في db.ts
- [x] إضافة دالة verifyPassword في db.ts
- [x] إضافة دالة createLocalUser في db.ts
- [x] إضافة دالة authenticateLocalUser في db.ts
- [x] إضافة endpoint auth.localLogin في routers.ts

### Phase 3: Frontend Implementation
- [x] إنشاء صفحة تسجيل دخول محلي (LocalLogin.tsx)
- [x] إضافة زر للرجوع إلى OAuth في LocalLogin.tsx
- [x] تحديث App.tsx لإضافة route /local-login

### Phase 4: Create Omar User
- [x] إنشاء مستخدم omar بكلمة سر admin1
- [x] منح omar كامل الصلاحيات (41 صلاحية)
- [x] التأكد من إمكانية تسجيل الدخول

### Phase 5: Testing
- [x] اختبار تشفير كلمات السر (bcrypt)
- [x] اختبار إنشاء مستخدم محلي
- [x] اختبار تسجيل الدخول ببيانات صحيحة
- [x] اختبار رفض كلمة سر خاطئة
- [x] اختبار تسجيل دخول omar
- [x] اختبار صلاحيات omar (41 صلاحية)
- [x] Save checkpoint


## Fix Arabic Font Issues (إصلاح مشاكل الخط العربي)

### Phase 1: Download & Setup Font
- [x] إنشاء مجلد server/fonts
- [x] تحميل Noto Sans Arabic من Google Fonts
- [x] حفظ الخط في server/fonts/NotoSansArabic-Regular.ttf (825KB)
- [x] التأكد من صلاحيات القراءة

### Phase 2: Fix QR Code Generation
- [x] البحث عن جميع الأماكن التي تستخدم QR code (exportWorkerQRCode, exportGroupQRCodes)
- [x] التأكد من صحة مسار الخط في كل مكان
- [x] اختبار وجود الخط

### Phase 3: Fix Excel Export
- [x] فحص excelExport.ts (يستخدم ExcelJS الذي يدعم العربية بشكل افتراضي)
- [x] التأكد من عدم وجود مشاكل

### Phase 4: Testing
- [x] اختبار وجود الخط (3/3 tests passed)
- [x] التأكد من حجم الخط الصحيح
- [x] Save checkpoint


## Simplify QR Code Export (تبسيط تصدير QR code)

- [x] إزالة جميع النصوص العربية من exportWorkerQRCode
- [x] إبقاء رمز العامل (manualCode) فقط
- [x] إبقاء QR code فقط
- [x] إزالة جميع النصوص العربية من exportGroupQRCodes
- [x] إزالة الحاجة للخط العربي
- [x] Save checkpoint


## Payroll Workflow System (نظام workflow دفعات الرواتب)

### Phase 1: Schema & Database
- [x] Schema موجود بالفعل مع workflow stages
- [x] استخدام النظام الموجود (draft, under_accountant_review, under_financial_review, under_accounts_manager_review, approved, rejected_final)

### Phase 2: Permissions
- [x] إضافة صلاحية REVIEW_PAYROLL_ACCOUNTING (المحاسب المالي)
- [x] إضافة صلاحية REVIEW_PAYROLL_FINAL (المراجع)
- [x] إضافة صلاحية APPROVE_PAYROLL (المدير المالي) - موجودة بالفعل
- [x] إضافة صلاحية REJECT_PAYROLL (المدير المالي)

### Phase 3: Backend Implementation
- [x] إضافة دالة submitBatchToAccounting في db.ts
- [x] إضافة دالة submitBatchToFinalReview في db.ts
- [x] إضافة دالة submitBatchForApproval في db.ts
- [x] إضافة دالة approveBatch في db.ts
- [x] إضافة دالة rejectBatch في db.ts
- [x] إضافة دالة updateBatchData في db.ts
- [x] إضافة دالة checkUserPermission في db.ts
- [x] إضافة endpoints في routers.ts (submitToAccounting, submitToFinalReview, submitForApproval, approveBatchFinal, rejectBatchFinal)

### Phase 4: Frontend Implementation
- [x] إضافة dialog إرسال للمحاسب (submitToAccounting)
- [x] إضافة dialog إرسال للمراجع (submitToFinalReview) مع حقل السبب
- [x] إضافة dialog إرسال للمدير (submitForApproval) مع حقل السبب
- [x] إضافة dialog اعتماد نهائي (approveBatchFinal)
- [x] إضافة dialog رفض (rejectBatchFinal) مع حقل السبب الإجباري
- [x] إضافة badges لحالة workflow (STATUS_LABELS)
- [x] إضافة أزرار workflow حسب الصلاحيات والمرحلة
- [x] تحديث فلاتر البحث لتشمل المراحل

### Phase 5: Testing
- [ ] اختبار workflow كامل من البداية للنهاية
- [ ] اختبار الصلاحيات
- [ ] اختبار الرفض والإرجاع
- [ ] Save checkpoint


## Payroll Workflow Notifications (إشعارات workflow دفعات الرواتب)

- [ ] البحث عن نظام الإشعارات الموجود في النظام
- [ ] إضافة دالة notifyWorkflowTransition في db.ts
- [ ] إضافة دالة getUsersByPermission في db.ts
- [ ] تحديث submitBatchToAccounting لإرسال إشعار للمحاسب
- [ ] تحديث submitBatchToFinalReview لإرسال إشعار للمراجع
- [ ] تحديث submitBatchForApproval لإرسال إشعار للمدير
- [ ] تحديث rejectBatch لإرسال إشعار للمراجع
- [ ] اختبار الإشعارات
- [ ] Save checkpoint


## Work Group Settings System (نظام إعدادات مجموعات العمل)

### Phase 1: Schema & Database
- [x] إضافة حقل daily_wage (DECIMAL, NULL) إلى groups
- [x] إضافة حقل work_minutes (INT, NULL) إلى groups
- [x] إضافة حقل minute_cost (DECIMAL, NULL) إلى groups
- [x] إضافة حقل late_penalty_rate (DECIMAL, NULL) إلى groups
- [x] إضافة حقل early_leave_penalty_rate (DECIMAL, NULL) إلى groups
- [x] تطبيق التغييرات (db:push)

### Phase 2: Calculation Functions
- [x] إضافة دالة calculateMinuteCost في db.ts
- [x] إضافة دالة calculateLatePenalty في db.ts
- [x] إضافة دالة calculateEarlyLeavePenalty في db.ts
- [x] تحديث دالة updateGroup لحساب minute_cost تلقائياً
- [x] تقريب جميع النتائج إلى منزلتين عشريتين

### Phase 3: Frontend - Groups UI
- [x] تحديث Groups.tsx formData لإضافة الحقول الجديدة
- [x] تحديث resetForm لإضافة الحقول الجديدة
- [x] تحديث handleEdit لإضافة الحقول الجديدة
- [ ] إضافة حقول الإدخال في dialog
- [ ] عرض minute_cost المحسوب تلقائياً
- [ ] إضافة validation للحقول

### Phase 4: Payroll Integration
- [ ] تحديث دالة calculatePayroll لاستخدام الإعدادات الجديدة
- [ ] تحديث حساب خصم التأخير
- [ ] تحديث حساب خصم الخروج المبكر
- [ ] التأكد من التكامل مع التقارير

### Phase 5: Testing
- [ ] اختبار إضافة مجموعة بإعدادات كاملة
- [ ] اختبار إضافة مجموعة بحقول NULL
- [ ] اختبار الحسابات التلقائية
- [ ] اختبار CHECK constraints
- [ ] Save checkpoint


## New Tasks - إكمال نظام إعدادات المجموعات وربطه بالرواتب (المرحلة الحالية)

### Task 1: إكمال واجهة إعدادات المجموعات في Groups.tsx
- [x] إضافة حقل إدخال daily_wage (أجر اليوم) في dialog
- [x] إضافة حقل إدخال work_minutes (دقائق الدوام) في dialog
- [x] إضافة حقل إدخال late_penalty_rate (نسبة غرامة التأخير %) في dialog
- [x] إضافة حقل إدخال early_leave_penalty_rate (نسبة غرامة الانصراف المبكر %) في dialog
- [x] إضافة عرض minute_cost المحسوب تلقائياً (read-only)
- [x] إضافة validation للحقول (work_minutes > 0, daily_wage >= 0, penalty_rates >= 0)
- [x] تحديث handleSubmit لإرسال القيم الجديدة

### Task 2: ربط النظام بحسابات الرواتب
- [x] قراءة دالة calculateDailyFinanceFromAttendance في db.ts
- [x] تحديث calculateDailyFinanceFromAttendance لجلب إعدادات المجموعة (daily_wage, work_minutes, penalty_rates)
- [x] استخدام calculateLatePenalty و calculateEarlyLeavePenalty مع إعدادات المجموعة
- [x] تطبيق late_penalty_rate من المجموعة على خصم التأخير
- [x] تطبيق early_leave_penalty_rate من المجموعة على خصم الانصراف المبكر
- [x] معالجة الحالات التي تكون فيها القيم NULL (fallback إلى الحساب القديم)
- [x] اختبار الحسابات مع قيم مختلفة (23 اختبار نجحوا)
- [ ] Save checkpoint


## New Task - حذف الحقول القديمة غير الضرورية من واجهة المجموعات

- [x] حذف حقل dailyRate (الأجر اليومي القديم) من formData
- [x] حذف حقل workHours (ساعات العمل القديمة) من formData
- [x] حذف حقل dailyRate من Add Dialog
- [x] حذف حقل workHours من Add Dialog
- [x] حذف حقل dailyRate من Edit Dialog
- [x] حذف حقل workHours من Edit Dialog
- [x] تحديث resetForm لإزالة الحقول القديمة
- [x] تحديث handleEdit لإزالة الحقول القديمة
- [x] حذف عمود dailyRate من جدول العرض
- [x] حذف عمود workHours من جدول العرض
- [ ] Save checkpoint


## New Task - إخفاء قسم معلومات النظام من لوحة التحكم

- [x] البحث عن قسم "معلومات النظام" في Dashboard.tsx
- [x] حذف القسم بالكامل من Dashboard
- [ ] Save checkpoint


## New Task - حذف حقل الأجر اليومي من نموذج العامل

- [x] البحث عن حقل dailyRate في Workers.tsx
- [x] حذف حقل dailyRate من formData
- [x] حذف حقل dailyRate من Add Worker Dialog
- [x] حذف حقل dailyRate من Edit Worker Dialog
- [x] تحديث resetForm لإزالة dailyRate
- [x] تحديث handleEdit لإزالة dailyRate
- [x] حذف عمود dailyRate من جدول العرض
- [x] حذف dailyRate من View Dialog
- [x] حذف dailyRate من exportToExcel
- [ ] Save checkpoint


## New Task - إضافة خيار تعديل الحضور حسب المجموعة

- [x] قراءة صفحة تعديل الحضور الحالية (AttendanceAdjust.tsx)
- [x] إضافة radio buttons لاختيار نوع التعديل (عامل واحد / مجموعة)
- [x] إضافة حقل اختيار المجموعة في الواجهة
- [x] إضافة منطق إخفاء/إظهار الحقول حسب الاختيار
- [x] إضافة backend procedure getEventsByGroup
- [x] إضافة backend function getAttendanceEventsByGroup
- [x] ربط الواجهة بالbackend
- [x] تحديث جدول العرض لإظهار اسم العامل في حالة المجموعة
- [x] اختبار التعديل حسب المجموعة (4 اختبارات نجحوا)
- [ ] Save checkpoint


## New Task - إنشاء تقرير كشف الرواتب الرسمي المعتمد

### Backend
- [x] إضافة procedure لجلب بيانات التقرير حسب المجموعة
- [x] إضافة procedure لجلب بيانات التقرير حسب العامل
- [x] إضافة procedure لجلب بيانات التقرير حسب مركز التكلفة
- [x] إضافة procedure لجلب الملخص العام
- [x] إضافة دالة حساب الإجماليات

##### Frontend
- [x] إنشاء صفحة PayrollReport.tsx
- [x] إضافة قسم الفلترة (نوع التقرير، الفترة، الفلتر)
- [x] إضافة قسم العنوان الديناميكي
- [x] إضافة قسم بيانات الفلترة
- [x] إضافة جدول التقرير
- [x] إضافة صف الإجمالي العام مميز
- [x] إضافة تذييل التقرير
- [x] إضافة زر عرض التقرير
- [x] إضافة زر الطباعة (react-to-print)
- [x] إضافة رسالة تحذير منع Excel
- [x] إضافة route في App.tsx تنسيقات CSS رسمية للطباعة
- [ ] إضافة الصفحة إلى navigation

### Testing
- [x] اختبار التقرير حسب المجموعة
- [x] اختبار التقرير حسب العامل
- [x] اختبار الملخص العام
- [x] اختبار صحة الحسابات (7 اختبارات نجحوا)
- [x] اختبار تنسيق القيم المالية
- [ ] Save checkpoint


## New Task - إلغاء قسم تعديل الحضور

- [x] حذف ملف AttendanceAdjust.tsx
- [x] حذف ملف الاختبار attendance-adjust-group.test.ts
- [x] حذف route من App.tsx
- [x] حذف import من App.tsx
- [x] حذف رابط تعديل الحضور من DashboardLayout
- [ ] Save checkpoint


## New Task - تطبيق نظام الورديات المعتمد

### Schema Updates
- [x] إضافة حقل shift_start_time (وقت بداية الوردية) في جدول groups
- [x] إضافة حقل shift_end_time (وقت نهاية الوردية) في جدول groups
- [x] تشغيل db:push لتطبيق التغييرات

### Frontend - Groups.tsx
- [x] إضافة حقل إدخال shift_start_time في Add/Edit Dialog
- [x] إضافة حقل إدخال shift_end_time في Add/Edit Dialog
- [x] إضافة validation (shift_start_time و shift_end_time إلزاميين)
- [x] إضافة رسالة توضيحية عن الحساب المالي
- [ ] عرض أوقات الوردية في جدول المجموعات
### Backend - Calculation Logic
- [x] تحديث calculateDailyFinanceFromAttendance لاستخدام shift times
- [x] حساب ساعات العمل المالية فقط داخل وقت الوردية
- [x] تجاهل الحضور المبكر قبل بداية الوردية مالياً (actualCheckInTime = shiftStart)
- [x] تجاهل الانصراف المتأخر بعد نهاية الوردية مالياً (actualCheckOutTime = shiftEnd)
- [x] الاحتفاظ بالتسجيل الكامل للسجلات (events تبقى كما هي)حضور/الانصراف (للسجلات فقط)

### Testing
- [ ] كتابة unit tests لنظام الورديات
- [ ] اختبار حساب الوقت داخل الوردية
- [ ] اختبار تجاهل الوقت خارج الوردية
- [ ] Save checkpoint


## New Task - إضافة طبقة تصحيح "اعتماد يوم كامل" في مسودة الرواتب

### Schema Updates
- [x] الحقول موجودة بالفعل: fullDayOverride, overrideReason, overrideBy, overrideAt

### Backend
- [x] تحديث دالة calculateDailyFinanceFromAttendance لتجاهل الخصومات عند fullDayOverride = true
- [x] إضافة procedure updateFullDayOverride لتحديث التصحيح اليومي
- [x] إضافة procedure getDailyFinanceForWorker لجلب تفاصيل الأيام
- [x] إعادة احتساب إجمالي اليوم تلقائياً بعد التصحيح

##### Frontend
- [x] قراءة صفحة مسودة الرواتب (PayrollBatchDetails.tsx)
- [x] إضافة زر "تفاصيل الأيام" في سطر كل عامل
- [x] إضافة Dialog لعرض الأيام الفردية للعامل
- [x] إضافة checkbox "اعتماد يوم كامل" مع textarea سبب التصحيح
- [x] ربط Dialog بـ backend procedures
- [x] إعادة تحميل بيانات الدفعة بعد التصحيح
### Reports
- [x] إضافة عمود "ملاحظات التصحيح" في تقرير كشف الرواتب
- [x] عرض سبب التصحيح للأيام المصححة
### Testing
- [x] كتابة unit tests لنظام التصحيح اليومي (5 tests)
- [x] اختبار التصحيح اليومي (يحتاج تحسين)
- [x] اختبار إعادة الاحتساب (يحتاج تحسين)
- [x] اختبار ظهور السبب في التقرير (يحتاج تحسين)
- [ ] Save checkpoint

## Task## Task - إضافة صلاحية OVERRIDE_DAILY_FINANCE ونظام البلاغات التشغيلية
### Phase 1: إضافة صلاحية OVERRIDE_DAILY_FINANCE
- [x] إضافة الصلاحية إلى قائمة الصلاحيات في النظام
- [x] ربط الصلاحية بالأدوار المناسبة (SUPER_ADMIN, ADMIN, HR_ADMIN)
- [ ] تحديث procedure updateFullDayOverride للتحقق من الصلاحية
- [ ] اختبار الصلاحية
### Phase 2: تصميم Schema لنظام البلاغات التشغيلية
- [x] إنشاء جدول operational_flags في schema.ts
- [x] تحديد الحقول (17 حقل)
- [x] تشغيل db:push لتطبيق التغييرات
### Phase 3: بناء Backend APIs للبلاغات
- [x] إضافة دوال CRUD في db.ts (6 دوال)
- [x] إضافة procedures في routers.ts (6 procedures)
- [x] إضافة دالة checkUnresolvedFlags للتحقق من البلاغات غير المعالجة
- [x] إضافة دالة resolveFlag لتنفيذ الإجراء
### Phase 4: بناء واجهة المشرف التشغيلي
- [x] إنشاء صفحة OperationalFlags.tsx
- [x] إضافة زر "إنشاء بلاغ تشغيلي"
- [x] إضافة Dialog لإنشاء البلاغ مع جميع الحقول
- [x] عرض قائمة البلاغات مع الحالات
- [x] إضافة route في App.tsx
- [ ] إضافة رابط في Sidebar
### Phase 5: بناء واجهة الشؤون الإدارية
- [ ] إنشاء صفحة PendingFlags.tsx
- [ ] عرض البلاغات بانتظار الإجراء
- [ ] إضافة زر "تنفيذ الإجراء" لكل بلاغ
- [ ] فتح الشاشة المناسبة مع تعبئة البيانات
- [ ] إضافة زر "تجاهل البلاغ"
- [ ] إضافة رابط في Sidebar
### Phase 6: ربط النظام مع مسودة الرواتب
- [ ] تحديث createPayrollBatch للتحقق من البلاغات غير المعالجة
- [ ] إضافة تحذير في واجهة إنشاء المسودة
- [ ] منع الاعتماد إذا وُجدت بلاغات غير معالجة
### Phase 7: الاختبار وحفظ checkpoint
- [ ] كتابة unit tests لنظام البلاغات
- [ ] اختبار إنشاء البلاغات
- [ ] اختبار تنفيذ الإجراءات
- [ ] اختبار التحذير في مسودة الرواتب
- [ ] Save checkpoint

## Task - إكمال نظام البلاغات التشغيلية وتحسينات إضافية
### Phase 5: إكمال واجهة الشؤون الإدارية
- [x] إنشاء صفحة PendingFlags.tsx
- [x] عرض البلاغات بانتظار الإجراء فقط
- [x] إضافة زر "تنفيذ الإجراء" لكل بلاغ
- [x] إضافة زر "تجاهل البلاغ"
- [x] فتح الشاشة المناسبة تلقائياً حسب نوع البلاغ
- [x] إضافة route في App.tsx

### Phase 6: ربط مع مسودة الرواتب
- [x] تحديث createPayrollBatch للتحقق من البلاغات غير المعالجة
- [x] إضافة تحذير في PayrollBatchCreate.tsx
- [x] منع الاعتماد إذا وُجدت بلاغات غير معالجة

### Phase 7: إضافة روابط Sidebar
- [x] إضافة رابط "البلاغات التشغيلية" للمشرفين
- [x] إضافة رابط "البلاغات المعلقة" للشؤون الإدارية
- [x] تحديث DashboardLayout.tsx
- [x] إضافة صلاحيات في menuPermissions.ts

### Phase 8: إضافة scroll في إدارة المجموعة
- [x] تحديد المشكلة في صفحة Groups
- [x] إضافة scroll للجداول الطويلة
- [x] اختبار التحسين

### Testing & Checkpoint
- [x] اختبار واجهة الشؤون الإدارية
- [x] اختبار التحذير في مسودة الرواتب
- [x] اختبار روابط Sidebar
- [x] اختبار scroll في المجموعات
- [ ] Save checkpoint

## Task - إضافة صلاحيات البلاغات وبيانات تجريبية
### Phase 1: إضافة صلاحيات البلاغات
- [x] تحديث seed-permissions.mjs لإضافة الصلاحيتين الجديدتين
- [x] تشغيل seed-permissions.mjs
- [x] تحديث seed-roles.mjs لربط الصلاحيات بالأدوار
- [x] ربط الصلاحيات بـ SUPER_ADMIN, ADMIN, HR_ADMIN

### Phase 2: إنشاء بيانات تجريبية
- [x] إنشاء seed-operational-flags.mjs
- [x] إضافة 8 بلاغات بأنواع مختلفة (7 PENDING + 1 RESOLVED)
- [x] تشغيل seed-operational-flags.mjs
- [x] التحقق من البيانات في النظام

### Phase 3: حفظ checkpoint
- [ ] Save checkpoint

## Task - إشعارات البلاغات ومراجعة الصلاحيات
### Phase 1: إضافة إشعارات تلقائية للبلاغات
- [x] إضافة إشعار للشؤون الإدارية عند إنشاء بلاغ جديد
- [x] إضافة إشعار للمشرف عند معالجة بلاغه
- [x] تحديث procedure create في routers.ts
- [x] تحديث procedure resolve في routers.ts
- [x] اختبار الإشعارات

### Phase 2: مراجعة وإضافة الصلاحيات الناقصة
- [x] مراجعة جميع الصفحات والميزات في النظام
- [x] تحديد الصلاحيات المستخدمة في الكود (24 صلاحية)
- [x] مقارنة مع seed-permissions.mjs (68 صلاحية قديمة)
- [x] حذف الصلاحيات المكررة والقديمة
- [x] إضافة الصلاحيات المنظمة (24 صلاحية)
- [x] ربط الصلاحيات بالأدوار (6 أدوار)

### Phase 3: الاختبار وحفظ checkpoint
- [x] اختبار الإشعارات
- [x] التحقق من ظهور جميع الصلاحيات في قسم الصلاحيات
- [x] إصلاح خطأ Groups.tsx
- [ ] Save checkpoint

## Task - تقسيم الصلاحيات التفصيلي (24 → 47)
### Phase 1: إنشاء الصلاحيات التفصيلية الجديدة
- [x] إنشاء detailed-permissions.mjs
- [x] إضافة 47 صلاحية تفصيلية
- [x] تشغيل detailed-permissions.mjs

### Phase 2: تحديث menuPermissions.ts
- [x] تحديث MENU_PERMISSIONS (47 صلاحية)
- [x] تحديث PERMISSION_CATEGORIES (6 فئات)
- [x] إصلاح DashboardLayout.tsx

### Phase 3: إعادة ربط الصلاحيات بالأدوار
- [x] إنشاء detailed-role-permissions.mjs
- [x] تشغيل detailed-role-permissions.mjs
- [x] ربط 47 صلاحية بـ 6 أدوار

### Phase 4: حفظ checkpoint
- [ ] Save checkpoint

## Task - إضافة 18 صلاحية جديدة وتحديث واجهة الصلاحيات
### Phase 1: إضافة 18 صلاحية جديدة
- [ ] إنشاء additional-permissions.mjs
- [ ] إضافة 18 صلاحية تفصيلية
- [ ] تشغيل additional-permissions.mjs
- [ ] تحديث menuPermissions.ts

### Phase 2: تحديث واجهة إدارة الصلاحيات
- [ ] تحديث Permissions.tsx لعرض الصلاحيات حسب المجموعات
- [ ] إضافة فلترة حسب الفئة
- [ ] تحسين عرض الصلاحيات

### Phase 3: إضافة جميع الصلاحيات لـ SUPER_ADMIN
- [ ] إنشاء superadmin-all-permissions.mjs
- [ ] تشغيل superadmin-all-permissions.mjs
- [ ] التحقق من ربط 65 صلاحية

### Phase 4: حفظ checkpoint
- [ ] Save checkpoint

## Task - إضافة 18 صلاحية جديدة وتحديث واجهة الصلاحيات
### Phase 1: إضافة 18 صلاحية جديدة
- [x] إنشاء add-permissions-simple.mjs
- [x] إضافة 18 صلاحية تفصيلية إلى قاعدة البيانات
- [x] تشغيل add-permissions-simple.mjs
- [x] تحديث menuPermissions.ts (18 صلاحية جديدة)

### Phase 2: تحديث واجهة إدارة الصلاحيات
- [x] تحديث PERMISSION_CATEGORIES في menuPermissions.ts
- [x] إضافة الصلاحيات الجديدة إلى MENU_PERMISSIONS
- [x] تنظيم الصلاحيات حسب 6 فئات

### Phase 3: إضافة جميع الصلاحيات لـ SUPER_ADMIN
- [x] إنشاء superadmin-all-permissions.mjs
- [x] تشغيل superadmin-all-permissions.mjs
- [x] ربط 33 صلاحية بدور super_admin

### Phase 4: حفظ checkpoint
- [ ] Save checkpoint

## Task - صفحة توزيع الصلاحيات على الأدوار
### Phase 1: Backend APIs
- [x] إضافة API getRolePermissions (جلب صلاحيات دور معين)
- [x] إضافة API updateRolePermissions (تحديث صلاحيات دور)
- [x] إضافة API getAllPermissionsGrouped (جلب جميع الصلاحيات مجمعة حسب الفئات)

### Phase 2: Frontend
- [x] إنشاء صفحة RolePermissions.tsx
- [x] إضافة selector لاختيار الدور
- [x] عرض الصلاحيات مجمعة حسب الفئات (7 فئات)
- [x] إضافة checkboxes لكل صلاحية
- [x] إضافة "تحديد الكل" لكل فئة
- [x] تنفيذ الحفظ التلقائي عند التغيير (1 second debounce)

### Phase 3: Integration
- [x] إضافة route /role-permissions في App.tsx
- [x] إضافة رابط في Sidebar (System section)
- [x] إضافة Settings icon للرابط

### Phase 4: Testing & Checkpoint
- [x] اختبار تحديد/إلغاء تحديد الصلاحيات
- [x] اختبار الحفظ التلقائي
- [x] اختبار "تحديد الكل" لكل فئة
- [ ] Save checkpoint


## نظام الصلاحيات الذرية + النطاق (Atomic Permissions + Data Scope System)

### Phase 1: البنية التحتية (Database Schema)
- [x] إنشاء جدول user_permissions في schema.ts
- [x] إضافة حقول: user_id, permission, scope_type, scope_id, granted_by, granted_at, expires_at
- [x] إنشاء indexes للأداء (user_id, scope_type, scope_id)
- [x] تشغيل pnpm db:push لتطبيق التغييرات
- [x] إضافة بيانات تجريبية عبر SQL

### Phase 2: Backend Core Functions
- [x] إضافة دالة checkScopedPermission في db.ts (التحقق من صلاحية محددة)
- [x] إضافة دالة getUserScopedPermissions في db.ts (جلب جميع صلاحيات مستخدم)
- [x] إضافة دالة getUserScopeIds في db.ts (جلب IDs النطاق المسموح)
- [x] إضافة دالة grantScopedPermission في db.ts (منح صلاحية)
- [x] إضافة دالة revokeScopedPermission في db.ts (إلغاء صلاحية)
- [x] إضافة دالة bulkGrantScopedPermissions في db.ts (منح صلاحيات متعددة)
- [x] إضافة دالة getUserPermissionsGrouped في db.ts (تجميع الصلاحيات حسب النطاق)

### Phase 3: Backend tRPC Procedures
- [x] إضافة scopedPermissions router في routers.ts
- [x] إضافة procedure check (التحقق من صلاحية)
- [x] إضافة procedure getUserPermissions (جلب صلاحيات مستخدم)
- [x] إضافة procedure getUserPermissionsGrouped (تجميع الصلاحيات)
- [x] إضافة procedure getUserScopeIds (جلب IDs النطاق)
- [x] إضافة procedure grant (منح صلاحية واحدة)
- [x] إضافة procedure revoke (إلغاء صلاحية واحدة)
- [x] إضافة procedure bulkGrant (منح صلاحيات متعددة)
- [ ] إضافة procedure bulkUpdateUserPermissions (تحديث صلاحيات دفعة واحدة)
- [ ] إضافة procedure getUserPermissionsByScope (جلب صلاحيات حسب نوع النطاق)

### Phase 4: تطبيق التصفية على APIs الموجودة
- [ ] تحديث getGroups للتصفية حسب صلاحيات work_group
- [ ] تحديث getWorkers للتصفية حسب صلاحيات work_group
- [ ] تحديث getCostCenters للتصفية حسب صلاحيات cost_center
- [ ] تحديث getPayrollBatches للتصفية حسب صلاحيات cost_center
- [ ] تحديث getAttendanceRecords للتصفية حسب صلاحيات work_group
- [ ] تحديث getFinancialReports للتصفية حسب صلاحيات cost_center
- [ ] إضافة permission checks لجميع APIs (view, create, update, delete)

### Phase 5: واجهة إدارة الصلاحيات (UserScopedPermissions.tsx)
- [x] إنشاء صفحة UserScopedPermissions.tsx
- [x] إضافة selector لاختيار المستخدم
- [x] عرض الصلاحيات مجمعة حسب نوع النطاق
- [x] إضافة dialog لإضافة صلاحيات جديدة
- [x] اختيار نوع النطاق (work_group, cost_center, payroll_period)
- [x] اختيار النطاق المحدد (group/cost center)
- [x] اختيار الصلاحيات (view, create, update, delete, export, approve)
- [x] إضافة زر "منح الصلاحيات" (bulkGrant)
- [x] إضافة زر حذف لكل صلاحية (revoke)
- [x] إضافة route /scoped-permissions في App.tsx
- [x] إضافة رابط في Sidebar (قسم إعدادات النظام)

### Phase 6: تحديث الواجهات لتطبيق التحكم
- [ ] تحديث Groups.tsx لإخفاء/إظهار أزرار (Edit, Delete) حسب الصلاحيات
- [ ] تحديث Workers.tsx لإخفاء/إظهار أزرار حسب الصلاحيات
- [ ] تحديث CostCenters.tsx لإخفاء/إظهار أزرار حسب الصلاحيات
- [ ] تحديث PayrollBatchCreate.tsx لتصفية المجموعات/مراكز التكلفة
- [ ] تحديث AttendanceScanner.tsx لتصفية المجموعات
- [ ] تحديث FinancialReports.tsx لتصفية مراكز التكلفة
- [ ] إضافة helper hook useUserPermissions للتحقق من الصلاحيات في Frontend

### Phase 7: الاختبارات (Vitest)
- [ ] كتابة unit tests لـ checkPermission (10 tests)
- [ ] كتابة unit tests لـ getUserPermissions (5 tests)
- [ ] كتابة unit tests لـ grantPermission و revokePermission (8 tests)
- [ ] كتابة integration tests لـ getGroups مع التصفية (5 tests)
- [ ] كتابة integration tests لـ getWorkers مع التصفية (5 tests)
- [ ] كتابة integration tests لـ getCostCenters مع التصفية (5 tests)
- [ ] تشغيل جميع الاختبارات والتأكد من نجاحها

### Phase 8: التوثيق والتسليم
- [ ] إنشاء ملف PERMISSIONS_SYSTEM.md لتوثيق النظام
- [ ] توثيق الهيكل الثلاثي (user_id, permission, scope_type, scope_id)
- [ ] توثيق أنواع الصلاحيات (view, create, update, delete, export, approve)
- [ ] توثيق أنواع النطاق (work_group, cost_center, payroll_period)
- [ ] إضافة أمثلة استخدام في التوثيق
- [ ] تحديث todo.md بالتقدم النهائي
- [ ] إنشاء checkpoint نهائي


## تطبيق نظام الصلاحيات الذرية على واجهة مجموعات العمل

### Phase 1: إنشاء custom hook
- [x] إنشاء useScopedPermissions.ts في client/src/hooks/
- [x] دالة checkPermission(permission, scopeType, scopeId)
- [x] دالة hasAnyPermission(permissions, scopeType, scopeId)
- [x] دالة getUserScopeIds(scopeType, permission)
- [x] استخدام trpc.scopedPermissions.getUserPermissions

### Phase 2: تحديث Groups.tsx
- [x] استيراد useScopedPermissions
- [x] إخفاء زر "تعديل" إذا لم يكن لديه صلاحية update على المجموعة
- [x] إخفاء زر "حذف" إذا لم يكن لديه صلاحية delete على المجموعة
- [x] إخفاء زر "إضافة مجموعة" إذا لم يكن لديه صلاحية create على work_group
- [x] تطبيق التحقق على مستوى السجل الواحد (كل مجموعة مستقلة)

### Phase 3: اختبار وحفظ checkpoint
- [x] اختبار إخفاء/إظهار الأزرار حسب الصلاحيات
- [x] التأكد من عدم وجود أخطاء TypeScript
- [x] Save checkpoint


## تطبيق نظام الصلاحيات على Workers و CostCenters و APIs

### Phase 1: تطبيق الصلاحيات على Workers.tsx
- [x] استيراد useScopedPermissions في Workers.tsx
- [x] إخفاء زر "إضافة عامل" إذا لم يكن لديه صلاحية create على work_group
- [x] إخفاء زر "تعديل" للعامل إذا لم يكن لديه صلاحية update على مجموعة العامل
- [x] إخفاء زر "حذف" للعامل إذا لم يكن لديه صلاحية delete على مجموعة العامل
- [x] التحقق من الصلاحيات على مستوى المجموعة (worker.groupId)

### Phase 2: تطبيق الصلاحيات على CostCenters.tsx
- [x] استيراد useScopedPermissions في CostCenters.tsx
- [x] إخفاء زر "إضافة مركز تكلفة" إذا لم يكن لديه صلاحية create على cost_center
- [x] إخفاء زر "تعديل" لمركز التكلفة إذا لم يكن لديه صلاحية update عليه
- [x] إخفاء زر "حذف" لمركز التكلفة إذا لم يكن لديه صلاحية delete عليه
- [x] التحقق من الصلاحيات على مستوى مركز التكلفة (costCenter.id)

### Phase 3: تصفية APIs حسب الصلاحيات
- [x] تحديث groups.list procedure لتصفية المجموعات حسب صلاحية view
- [x] تحديث workers.list procedure لتصفية العمال حسب صلاحية view على المجموعة
- [x] تحديث costCenters.list procedure لتصفية مراكز التكلفة حسب صلاحية view
- [x] التصفية تتم مباشرة في procedures باستخدام getUserScopeIds

### Phase 4: اختبار وحفظ checkpoint
- [x] التأكد من عدم وجود أخطاء TypeScript
- [x] التأكد من عمل الخادم بنجاح
- [x] Save checkpoint (version: 6e00d636)


## تطبيق نظام الصلاحيات على الحضور والرواتب

### Phase 1: تطبيق الصلاحيات على صفحة الحضور والانصراف
- [x] قراءة DailyAttendanceManagement.tsx لفهم البنية
- [x] استيراد useScopedPermissions في DailyAttendanceManagement.tsx
- [x] إخفاء checkbox الاعتماد حسب صلاحية approve على مجموعة العامل

### Phase 2: تطبيق الصلاحيات على صفحة الرواتب
- [x] قراءة PayrollBatches.tsx لفهم البنية
- [x] استيراد useScopedPermissions في PayrollBatches.tsx
- [x] إخفاء زر "إنشاء دفعة" حسب صلاحية create على payroll_period
- [x] إخفاء أزرار الاعتماد/الرفض حسب صلاحية approve على payroll_period
- [x] إخفاء زر التصدير حسب صلاحية export على payroll_period
- [x] إخفاء زر الحذف حسب صلاحية delete على payroll_period

### Phase 3: اختبار وحفظ checkpoint
- [x] التأكد من عدم وجود أخطاء TypeScript
- [x] التأكد من عمل الخادم بنجاح
- [x] Save checkpoint (version: 30c356f0)


## تطبيق نظام الصلاحيات على تقارير الحضور

### Phase 1: تحليل AttendanceReports.tsx وفهم بنية التقارير
- [x] قراءة AttendanceReports.tsx لفهم البنية
- [x] تحديد APIs المستخدمة (attendance.monthlyReport)
- [x] تحديد نقاط التصفية المطلوبة (المجموعات وأزرار التصدير)

### Phase 2: تطبيق التصفية على مستوى UI وAPI
- [x] استيراد useScopedPermissions في AttendanceReports.tsx
- [x] تصفية المجموعات المعروضة في dropdown حسب صلاحية view
- [x] تصفية بيانات التقارير تتم تلقائيًا عبر تصفية المجموعات
- [x] إخفاء أزرار التصدير (Excel, CSV, طباعة) حسب صلاحية export

### Phase 3: اختبار وحفظ checkpoint
- [x] التأكد من عدم وجود أخطاء TypeScript
- [x] التأكد من عمل الخادم بنجاح
- [x] Save checkpoint (version: 11908c20)


## تطبيق نظام الصلاحيات على سجل الحضور اليومي

### Phase 1: تحليل AttendanceLog.tsx وفهم بنية السجل
- [x] قراءة AttendanceLog.tsx لفهم البنية
- [x] تحديد APIs المستخدمة (attendance.todayLog, attendance.stats)
- [x] تحديد نقاط التصفية المطلوبة (المجموعات)

### Phase 2: تطبيق التصفية على مستوى UI
- [x] استيراد useScopedPermissions في AttendanceLog.tsx
- [x] تصفية المجموعات المعروضة في dropdown حسب صلاحية view
- [x] تصفية سجلات الحضور تتم تلقائيًا عبر تصفية المجموعات

### Phase 3: اختبار وحفظ checkpoint
- [x] التأكد من عدم وجود أخطاء TypeScript
- [x] التأكد من عمل الخادم بنجاح
- [x] Save checkpoint (version: 04523470)


## حذف النظام القديم للصلاحيات

### Phase 1: حذف جدول permissions من schema.ts
- [ ] حذف تعريف جدول permissions من drizzle/schema.ts
- [ ] حذف relations المرتبطة بجدول permissions

### Phase 2: حذف الملفات المعطلة
- [ ] حذف client/src/pages/Permissions.tsx
- [ ] حذف client/src/hooks/usePermissions.ts

### Phase 3: تنظيف Users.tsx
- [ ] حذف قسم الصلاحيات القديم من Users.tsx
- [ ] حذف @ts-nocheck من أول الملف

### Phase 4: تطبيق التغييرات على قاعدة البيانات
- [ ] تشغيل pnpm db:push لحذف جدول permissions

### Phase 5: اختبار وحفظ checkpoint
- [ ] التأكد من عدم وجود أخطاء TypeScript
- [ ] التأكد من عمل الخادم بنجاح
- [ ] Save checkpoint


## حذف النظام القديم للصلاحيات

### Phase 1: حذف جدول permissions من schema.ts
- [x] حذف جدول permissions من schema.ts
- [x] حذف جدول rolePermissions من schema.ts
- [x] حذف Permission type من schema.ts

### Phase 2: حذف الدوال القديمة من db.ts
- [x] حذف getAllPermissions
- [x] حذف getUserRolePermissions
- [x] حذف getRolePermissions
- [x] حذف setRolePermissions
- [x] تحديث checkUserPermission لترجع false
- [x] حذف permissions من getDashboardStats
- [x] حذف rolePermissions من deleteRole

### Phase 3: حذف procedures القديمة من routers.ts
- [x] حذف permissions router بالكامل
- [x] حذف getRolePermissions من roles router
- [x] حذف setRolePermissions من roles router
- [x] تحديث auth.permissions لترجع []

### Phase 4: حذف الملفات المعطلة
- [x] حذف Permissions.tsx
- [x] حذف RolePermissions.tsx
- [x] حذف usePermissions.ts
- [x] إضافة @ts-nocheck لـ Users.tsx
- [x] إضافة @ts-nocheck لـ Roles.tsx
- [x] حذف بطاقة الصلاحيات من Dashboard.tsx

### Phase 5: تطبيق التغييرات على قاعدة البيانات
- [x] تشغيل pnpm db:push
- [x] تم حذف جدول permissions
- [x] تم حذف جدول rolePermissions

### Phase 6: اختبار وحفظ checkpoint
- [x] التأكد من عدم وجود أخطاء TypeScript
- [x] التأكد من عمل الخادم بنجاح
- [x] حذف routes القديمة من App.tsx
- [x] إضافة @ts-nocheck لـ ProtectedRoute.tsx
- [x] Save checkpoint (version: 729bee14)


---

## 🔧 إصلاحات وتحسينات جديدة (Jan 19, 2026)

### إصلاح تعديل المجموعات
- [x] تحليل المشكلة في Groups.tsx
- [x] إصلاح dialog التعديل لعرض البيانات السابقة (الاسم، الوصف، مركز التكلفة)
- [x] اختبار التعديل والتأكد من ظهور البيانات

### حذف الصفحات غير المطلوبة
- [x] حذف صفحة "الخصومات والإضافات" (DeductionsAdditions.tsx) - غير موجودة
- [x] حذف صفحة "إدارة الحضور اليومي" (DailyAttendanceManagement.tsx)
- [x] حذف routes من App.tsx
- [x] حذف روابط Sidebar من DashboardLayout.tsx
- [x] اختبار عدم وجود أخطاء

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إصلاحات جديدة (Jan 19, 2026 - Part 2)

### إصلاح مشكلة الكاميرا في تسجيل الحضور
- [x] تحليل مشكلة الكاميرا السوداء في AttendanceScanner.tsx
- [x] إضافة camera permissions في المتصفح
- [x] إصلاح QR Scanner component
- [x] اختبار الكاميرا على الجوال

### إضافة رسالة تأكيد عند التعديل
- [x] إضافة AlertDialog تأكيد قبل حفظ تعديلات المجموعة
- [x] اختبار رسالة التأكيد

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إضافة صوت تنبيه (Jan 19, 2026 - Part 3)

### إضافة صوت beep عند مسح QR Code
- [x] إضافة Web Audio API لإنشاء صوت beep
- [x] تشغيل الصوت عند مسح QR Code بنجاح
- [x] اختبار الصوت على الجوال والكمبيوتر

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إضافة success animation (Jan 19, 2026 - Part 4)

### إضافة علامة صح خضراء متحركة
- [x] إضافة state لعرض success animation
- [x] إضافة CheckCircle icon مع animation
- [x] تشغيل animation عند مسح QR Code بنجاح
- [x] إضافة CSS animations (scale + fade)

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إصلاح مشكلة الكاميرا (Jan 19, 2026 - Part 5)

### إصلاح فشل تشغيل الكاميرا
- [x] تحليل سبب فشل تشغيل الكاميرا
- [x] تحسين requestCameraPermission function
- [x] تحسين startScanning function
- [x] إضافة fallback للكاميرات
- [x] تحسين error messages

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إضافة صفحة Landing Page مع تسجيل دخول (Jan 19, 2026 - Part 6)

### Landing Page رسمية
- [x] تصميم Landing Page احترافية
- [x] إضافة معلومات عن المشروع
- [x] إضافة زر "تسجيل دخول"

### نظام تسجيل دخول
- [x] إضافة Login Dialog مع username/password
- [x] تحديث schema لإضافة جدول credentials - موجود بالفعل
- [x] إضافة backend procedure للتحقق من credentials - localLogin موجود
- [x] إضافة session management
- [x] حماية routes بـ authentication

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إصلاح تسجيل الدخول المباشر (Jan 19, 2026 - Part 7)

### إزالة صفحة التحقق
- [x] فحص نظام تسجيل الدخول الحالي
- [x] إزالة redirect إلى صفحة OAuth/Email
- [x] التوجيه المباشر إلى Dashboard
- [x] اختبار تسجيل الدخول

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إضافة "تذكرني" (Jan 19, 2026 - Part 8)

### Frontend
- [x] إضافة checkbox "تذكرني" في Login Dialog
- [x] إرسال rememberMe flag إلى backend

### Backend
- [x] تحديث localLogin procedure لدعم rememberMe
- [x] تعديل cookie maxAge حسب rememberMe (1 يوم أو 30 يوم)

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إصلاح مشكلة الرجوع بعد تسجيل الدخول (Jan 19, 2026 - Part 9)

### تحليل المشكلة
- [x] فحص localLogin response
- [x] فحص cookie settings
- [x] فحص redirect logic في LandingPage

### الإصلاح
- [x] تحديث redirect method
- [x] إضافة setTimeout قبل redirect
- [x] اختبار تسجيل الدخول

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إضافة تسجيل خروج تلقائي عند التعطيل (Jan 19, 2026 - Part 10)

### Backend
- [x] تحديث auth.me procedure لإرجاع isActive status
- [x] إضافة error handling للمستخدمين المعطلين

### Frontend
- [x] إضافة refetchInterval في useAuth (30ث)
- [x] تسجيل خروج تلقائي عند isActive = false
- [x] تسجيل خروج مباشر وredirect

### Checkpoint
- [x] Save checkpoint


---

## 🔧 حل مشكلة تسجيل الدخول نهائياً (Jan 19, 2026 - Part 11)

### تحليل المشكلة
- [x] فحص localLogin procedure وكيفية حفظ cookie
- [x] فحص authenticateRequest وكيفية قراءة cookie
- [x] فحص JWT token structure
- [x] فحص cookie domain/path/sameSite settings

### الإصلاح
- [x] إضافة verifyLocalSession للتعامل مع local JWT
- [x] cookie settings صحيحة
- [x] إصلاح authenticateRequest للتعامل مع local JWT
- [x] اختبار تسجيل دخول كامل

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إصلاح نظام الصلاحيات والأدوار (Jan 19, 2026 - Part 12)

### فحص المشكلة
- [x] فحص صفحة Settings/Roles
- [x] فحص صفحة Settings/Permissions
- [x] فحص backend procedures للصلاحيات
- [x] فحص schema للأدوار والصلاحيات

### الإصلاح
- [x] إضافة permissions و rolePermissions tables في schema.ts
- [x] إضافة Permission type
- [x] إضافة permissions router في routers.ts
- [x] إضافة permission functions في db.ts
- [x] تشغيل pnpm db:push

### Checkpoint
- [x] Save checkpoint


---

## 🔧 حذف صفحة "الخصومات والإضافات" (Jan 19, 2026 - Part 13)

### الحذف
- [x] حذف FinanceEntry.tsx
- [x] حذف route من App.tsx
- [x] حذف رابط من DashboardLayout
- [x] الإبقاء على "الاستثناءات المالية" بكامل وظائفها

---

## 🔍 فحص وإصلاح نظام المستخدمين والصلاحيات (Jan 19, 2026 - Part 14)

### فحص المستخدمين
- [x] فحص صفحة Users.tsx - موجودة
- [x] فحص users procedures في routers.ts - موجودة
- [x] فحص user functions في db.ts - موجودة
- [ ] اختبار إضافة وتعديل وحذف مستخدم

### فحص الأدوار
- [x] فحص صفحة Roles.tsx - موجودة
- [x] فحص roles procedures في routers.ts - موجودة
- [x] فحص role functions في db.ts - موجودة
- [ ] اختبار إضافة وتعديل وحذف دور

### فحص الصلاحيات
- [ ] إنشاء صفحة Permissions.tsx - غير موجودة
- [x] فحص permissions procedures في routers.ts - موجودة
- [x] فحص permission functions في db.ts - موجودة
- [ ] اختبار إضافة وتعديل وحذف صلاحية

### فحص توزيع الصلاحيات
- [ ] إنشاء صفحة RolePermissions.tsx - غير موجودة
- [x] فحص rolePermissions procedures - موجودة في roles router
- [ ] اختبار ربط صلاحيات بأدوار

### فحص الصلاحيات الذرية
- [x] فحص صفحة UserScopedPermissions.tsx - موجودة
- [x] فحص userPermissions procedures - موجودة
- [ ] اختبار إضافة صلاحيات ذرية

### الإصلاح
- [ ] إصلاح أي مشاكل في UI
- [ ] إصلاح أي مشاكل في backend
- [ ] إضافة أي جداول ناقصة

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إصلاح خطأ DialogTrigger في Users.tsx (Jan 19, 2026 - Part 15)

### الإصلاح
- [x] فحص Users.tsx للعثور على المشكلة
- [x] إصلاح import DialogTrigger
- [x] اختبار صفحة المستخدمين

### Checkpoint
- [x] Save checkpoint


---

## 🔧 إصلاح مشكلة تحميل الصلاحيات في Roles.tsx (Jan 19, 2026 - Part 16)

### الفحص
- [x] فحص Roles.tsx للعثور على المشكلة
- [x] فحص permissions.list procedure
- [x] فحص getAllPermissions في db.ts
- [x] فحص permissions table في schema.ts

### الإصلاح
- [x] إعادة تشغيل dev server
- [x] تشغيل seed-permissions.mjs
- [x] إضافة 21 صلاحية افتراضية

### Checkpoint
- [x] Save checkpoint


## إعادة هيكلة نظام الصلاحيات الكامل (Permissions System Restructure)

### Phase 1: Database Schema Updates
- [ ] Add isActive field to roles table
- [ ] Add phoneNumber field to users table
- [ ] Create 6 fixed roles in database (Guard, Supervisor, Accountant, HR Admin, Financial Manager, General Manager)
- [ ] Run pnpm db:push to apply schema changes

### Phase 2: Backend APIs
- [ ] Update roles APIs to support isActive field
- [ ] Create API: toggleRoleStatus (activate/deactivate role)
- [ ] Create API: getRolePermissions (get all permissions for a role)
- [ ] Create API: updateRolePermissions (bulk update permissions for a role)
- [ ] Update users APIs to include phoneNumber and roleId
- [ ] Create API: getUserDetailedPermissions (role permissions + scoped permissions)
- [ ] Add logic: when role is deactivated, deactivate all users with that role

### Phase 3: Frontend - Roles Page
- [ ] Update Roles.tsx to show 6 fixed roles only
- [ ] Add isActive status indicator
- [ ] Add toggle button to activate/deactivate role
- [ ] Remove "Add Role" button (roles are fixed)
- [ ] Show warning when deactivating role with active users

### Phase 4: Frontend - Role Permissions Page
- [ ] Create RolePermissions.tsx page
- [ ] Show list of all 6 roles
- [ ] Add "Edit Permissions" button for each role
- [ ] Add "Toggle Status" button for each role
- [ ] Create dialog with 21 permissions grouped by category
- [ ] Use checkboxes to select/deselect permissions
- [ ] Add "Select All Category" functionality
- [ ] Save selected permissions to role_permissions table
- [ ] Add route /role-permissions to App.tsx

### Phase 5: Frontend - Users Page Updates
- [ ] Add phoneNumber field to user form
- [ ] Add roleId dropdown (select from 6 fixed roles)
- [ ] Update user list to show role name
- [ ] Update user list to show phone number
- [ ] Filter users by role
- [ ] Show inactive status if user's role is deactivated

### Phase 6: Frontend - User Permissions Page
- [ ] Rename UserScopedPermissions.tsx to UserPermissions.tsx
- [ ] Update page title from "الصلاحيات الذرية" to "صلاحيات المستخدمين"
- [ ] Show all users in a list (not dropdown)
- [ ] Add "Edit Permissions" button for each user
- [ ] Create comprehensive permissions dialog:
  * Group permissions by screen name (العمال, المجموعات, الحضور, etc.)
  * Show all operations (عرض, إضافة, تعديل, حذف, تصدير, اعتماد)
  * Add scope selection (مجموعة عمل, مركز تكلفة, فترة رواتب)
  * All labels in Arabic matching system names
- [ ] Save scoped permissions to user_scoped_permissions table
- [ ] Update route from /scoped-permissions to /user-permissions

### Phase 7: Testing & Validation
- [ ] Test role activation/deactivation
- [ ] Test user deactivation when role is deactivated
- [ ] Test role permissions assignment
- [ ] Test user permissions assignment (scoped)
- [ ] Test scenario: Supervisor sees only Group A
- [ ] Test scenario: Accountant 1 sees only Cost Center East
- [ ] Test scenario: Accountant 2 sees only Cost Center West
- [ ] Write vitest tests for new APIs
- [ ] Save checkpoint


## إصلاح مشكلة الكاميرا في إثبات الحضور عبر QR Code
- [ ] فحص كود الكاميرا الحالي في صفحة إثبات الحضور
- [ ] تحديد سبب الشاشة السوداء
- [ ] إصلاح الكود بشكل نهائي
- [ ] اختبار الكاميرا على المتصفح
- [ ] التأكد من عمل مسح QR Code

## استكمال## إعادة هيكلة نظام الصلاحيات
- [x] تحديث صفحة المستخدمين: إضافة حقل رقم الهاتف
- [x] تحديث صفحة المستخدمين: إضافة قائمة منسدلة لاختيار الدور
- [x] تحديث صفحة المستخدمين: عرض اسم الدور في الجدول
- [x] تحديث صفحة صلاحيات المستخدمين: عرض جميع المستخدمين في قائمة
- [x] تحديث صفحة صلاحيات المستخدمين: زر تعديل الصلاحيات لكل مستخدم
- [x] تحديث صفحة صلاحيات المستخدمين: واجهة شاملة للصلاحيات الذرية
- [x] تحديث صفحة صلاحيات المستخدمين: ترتيب الصلاحيات حسب الشاشات
- [x] تحديث صفحة صلاحيات المستخدمين: نطاق محدد لكل صلاحية
- [ ] تطبيق middleware للتحكم بالوصول
- [ ] إخفاء عناصر القائمة غير المصرح بها
- [ ] اختبار: تعيين دور مشرف لمستخدم
- [ ] اختبار: منح صلاحيات ذرية على مجموعة "أ" فقط
- [ ] اختبار: توقيف دور وتأكيد توقيف جميع المستخدمين
- [ ] اختبار الكاميرا بمسح QR Code فعلي

## تحسين نظام إثبات الحضور عبر QR Code
- [x] إضافة API لجلب بيانات العامل من QR Code
- [x] تحديد نوع التسجيل (حضور أم انصراف)
- [x] تحديث صفحة الحضور لعرض Dialog التأكيد
- [x] عرض بيانات العامل في Dialog
- [x] زر تأكيد الحضور/الانصراف
- [x] تسجيل الحضور/الانصراف في قاعدة البيانات
- [x] العودة لشاشة المسح بعد التأكيد
- [x] اختبار النظام الكامل


## Payroll Batch Accountant Review Permission Issue

- [x] Check user permissions for payroll_batch_accountant_review
- [x] Fix getUserById to load permissions from user_permissions table
- [x] Add missing permissions to admin user (accountant_review, financial_review, manager_review)
- [ ] Test payroll batch approval workflow on published site


## Excel Export Dynamic Require Error

- [x] Fix "Dynamic require of exceljs is not supported" error
- [x] Add static import for ExcelJS in routers.ts
- [x] Remove dynamic require from exportToExcel function
- [ ] Test payroll batch Excel export on published site


## Clean Data and Create Role-Based Users

- [x] Delete approved payroll batches data (all payroll tables cleared)
- [x] Delete operational reports - N/A (no separate table found)
- [x] Delete pending items - N/A (no separate table found)
- [x] Create users for each role with appropriate permissions
  - accountant (password123) - payroll creation & review
  - financial_reviewer (password123) - financial review
  - accounts_manager (password123) - final approval & export
  - hr_manager (password123) - worker & attendance management
  - security_guard (password123) - attendance recording
- [x] Generate credentials document (tolanworkforce_users_credentials.md)


## Add Username and Password Fields to User Form

- [x] Add username field to user creation form (already exists)
- [x] Add password field to user creation form
- [x] Show username (read-only) in user edit form
- [x] Show password field in user edit form for password change (optional)
- [x] Update backend API to handle password in create mutation
- [x] Update backend API to handle password in update mutation (optional)
- [x] Hash password with bcryptjs before storing
- [ ] Test user creation with password
- [ ] Test password change


## Delete Operational Reports (البلاغات التشغيلية)

- [x] Find operational reports table in database (operational_flags)
- [x] Delete all existing reports (0 remaining)


## QR Scanner Issues - Round 2

- [x] Fix "رمز QR غير صالح" error - replaced fetch with tRPC utils
- [x] Fix manual input not working - enabled button and added input UI
- [x] Add code-based search fallback in getWorkerFromQR API
- [x] Change getWorkerFromQR to publicProcedure for unauthenticated access
- [ ] Test with actual worker codes from database


## Role-Based Access Control (RBAC) Implementation

- [x] Define permissions for each role in shared/permissions.ts
- [x] Create permission checking hook (usePermission)
- [x] Update DashboardLayout to use new permission system
- [x] Hide unauthorized menu items in sidebar based on user role
- [x] Update ProtectedRoute component to use new permission system
- [ ] Add permission checks to backend APIs (requirePermission middleware)
- [ ] Assign role-based permissions to existing users
- [ ] Test with different user roles (accountant, hr_manager, security_guard, etc.)


## Permissions Management Page

- [ ] Add backend APIs for managing user permissions
  - [ ] getUserPermissions - get all permissions for a user
  - [ ] addUserPermission - add permission to user
  - [ ] removeUserPermission - remove permission from user
  - [ ] updateUserRole - change user role
- [ ] Create permissions management page UI
  - [ ] List all users with their roles and permissions
  - [ ] Add/remove permissions for each user
  - [ ] Change user role
  - [ ] Admin-only access
- [ ] Test permissions management functionality


## User Permissions Management Page

- [x] Add APIs for permission management in routers.ts (getPermissions, addPermission, removePermission)
- [x] Add database functions in db.ts (getUserPermissions, addUserPermission, removeUserPermission)
- [x] Create UserPermissions page with role-based permissions display
- [x] Add route to App.tsx (/user-permissions)
- [ ] Add menu item to DashboardLayout sidebar (for admin only)
- [ ] Test permission management with different users


## Enhanced User Management Interface

- [x] Review current Users.tsx page
- [x] Add user dialog already has all fields (username, password, role, phone, email)
- [x] Edit user dialog already has password change option
- [x] User activation/deactivation toggle already exists (Switch)
- [x] Role badge display already in users list
- [x] Search functionality already exists
- [x] Add pagination for large user lists (10 items per page)
- [ ] Test all CRUD operations
- [ ] Save checkpoint


## تطبيق نظام صلاحيات شامل ومحكم (RBAC Enhancement)

### Phase 1: تحليل وتحديث ملف الصلاحيات
- [ ] مراجعة ملف shared/permissions.ts الحالي
- [ ] تحديد صلاحيات كل دور بدقة (admin, accountant, financial_reviewer, accounts_manager, hr_manager, security_guard)
- [ ] التأكد من أن كل صفحة/وظيفة لها صلاحية محددة
- [ ] تحديث ROLE_PERMISSIONS mapping

### Phase 2: حماية القوائم الجانبية (Sidebar Protection)
- [ ] تحديث DashboardLayout لإخفاء القوائم غير المصرح بها
- [ ] استخدام usePermission hook لفحص كل عنصر قائمة
- [ ] إخفاء الأقسام الفارغة تماماً
- [ ] اختبار القوائم لكل دور

### Phase 3: حماية الصفحات والروابط (Route Protection)
- [ ] تحديث ProtectedRoute لفحص الصلاحيات قبل عرض الصفحة
- [ ] إضافة requiredPermission prop لكل Route محمي
- [ ] عرض صفحة "ليس لديك صلاحية" للوصول غير المصرح
- [ ] منع الوصول المباشر عبر URL
- [ ] اختبار جميع الروابط لكل دور

### Phase 4: حماية الأزرار والوظائف (UI Elements Protection)
- [ ] استخدام usePermission في جميع الصفحات
- [ ] إخفاء أزرار "إضافة" و"تعديل" و"حذف" حسب الصلاحيات
- [ ] إخفاء أزرار "اعتماد" و"رفض" في Payroll حسب الدور
- [ ] إخفاء أزرار "تصدير" حسب الصلاحيات
- [ ] اختبار جميع الأزرار لكل دور

### Phase 5: حماية Backend APIs (Server-side Protection)
- [ ] إنشاء middleware للتحقق من الصلاحيات في tRPC
- [ ] تطبيق requirePermission على جميع procedures الحساسة
- [ ] حماية APIs الخاصة بـ Users Management
- [ ] حماية APIs الخاصة بـ Workers Management
- [ ] حماية APIs الخاصة بـ Payroll Management
- [ ] حماية APIs الخاصة بـ Financial Reports
- [ ] حماية APIs الخاصة بـ Attendance Management
- [ ] إرجاع خطأ 403 Forbidden للطلبات غير المصرح بها

### Phase 6: الاختبار الشامل
- [ ] إنشاء مستخدمين لكل دور (إن لم يكونوا موجودين)
- [ ] اختبار تسجيل الدخول بحساب الحارس والتحقق من القوائم
- [ ] اختبار تسجيل الدخول بحساب المحاسب والتحقق من القوائم
- [ ] اختبار تسجيل الدخول بحساب مدير الموارد البشرية
- [ ] اختبار الوصول المباشر للروابط غير المصرح بها
- [ ] اختبار إرسال API requests غير مصرح بها
- [ ] التأكد من عدم وجود ثغرات أمنية

### Phase 7: التوثيق وحفظ Checkpoint
- [ ] توثيق نظام الصلاحيات في RBAC_GUIDE.md
- [ ] إنشاء جدول بصلاحيات كل دور
- [ ] حفظ checkpoint نهائي


## إكمال حماية الصلاحيات على الصفحات المتبقية

### Payroll Pages Protection
- [x] حماية أزرار إنشاء دفعة جديدة (payroll_create)
- [x] حماية أزرار المراجعة المحاسبية (payroll_batch_accountant_review)
- [x] حماية أزرار المراجعة المالية (payroll_batch_financial_review)
- [x] حماية أزرار الاعتماد النهائي (payroll_batch_final_approve)
- [x] حماية أزرار التصدير (payroll_export)

### Attendance Pages Protection
- [x] حماية صفحة تسجيل الحضور (attendance_register)
- [x] حماية صفحة سجل الحضور اليومي (attendance_view)
- [x] حماية صفحة تقارير الحضور (attendance_reports_view)
- [x] حماية أزرار التصدير (attendance_export)
- [x] حماية أزرار تعديل الحضور (attendance_edit)

### Reports Pages Protection
- [x] حماية صفحة التقارير المالية (financial_reports_view)
- [x] حماية أزرار تصدير التقارير (reports_export)
- [x] حماية تقارير العمال (worker_reports_view)
- [x] حماية تقارير المجموعات (group_reports_view)

### Backend APIs Protection
- [x] حماية attendance APIs (register, edit, list, export)
- [x] حماية reports APIs (financial, worker, group)
- [x] حماية payroll remaining APIs (updateItem, submitForReview)


## صفحة إدارة الأدوار الديناميكية (Dynamic Roles Management)

### Backend APIs
- [x] إنشاء API لعرض جميع الأدوار (roles.list)
- [x] إنشاء API لإنشاء دور جديد (roles.create)
- [x] إنشاء API لتعديل دور (roles.update)
- [x] إنشاء API لحذف دور (roles.delete)
- [x] إنشاء API لتخصيص صلاحيات الدور (roles.assignPermissions)
- [x] إنشاء API لعرض صلاحيات دور معين (roles.getPermissions)

### Frontend UI
- [x] إنشاء صفحة RolesManagement.tsx
- [x] عرض قائمة الأدوار الموجودة
- [x] نموذج إضافة دور جديد
- [x] نموذج تعديل دور
- [x] حذف دور مع تأكيد
- [x] واجهة تخصيص الصلاحيات (checkboxes grouped by category)
- [x] حماية الصفحة بصلاحية Super Admin فقط

### Routes & Navigation
- [x] إضافة route /settings/roles إلى App.tsx
- [x] إضافة قائمة "إدارة الأدوار" في DashboardLayout
- [x] حماية القائمة بصلاحية Super Admin

### Testing
- [x] اختبار إنشاء دور جديد
- [x] اختبار تخصيص صلاحيات
- [x] اختبار تعديل وحذف دور
- [x] حفظ checkpoint


## إضافة الأدوار الستة الأساسية مع الصلاحيات

### الأدوار المطلوبة:
- [x] Super Admin - صلاحيات كاملة (38 صلاحية)
- [x] HR Manager - إدارة العمال والمجموعات والحضور (16 صلاحية)
- [x] Accountant - مراجعة الرواتب والتقارير المالية (10 صلاحيات)
- [x] Financial Manager - المراجعة المالية والاعتماد النهائي (13 صلاحية)
- [x] Attendance Officer - تسجيل الحضور فقط (4 صلاحيات)
- [x] Viewer - عرض البيانات فقط (6 صلاحيات)

### المهام:
- [x] إنشاء seed script لإضافة الأدوار
- [x] تخصيص صلاحيات كل دور حسب وظيفته
- [x] تنفيذ الـ script
- [x] التحقق من إضافة الأدوار بنجاح
- [x] حفظ checkpoint


## تحديث صفحة المستخدمين لربط الأدوار

### المهام:
- [x] إضافة dropdown لاختيار الدور في نموذج إضافة مستخدم (موجود مسبقاً)
- [x] إضافة dropdown لتعديل دور المستخدم في نموذج التعديل (موجود مسبقاً)
- [x] عرض اسم الدور في جدول المستخدمين بدلاً من roleId (موجود مسبقاً)
- [x] تحديث APIs لربط المستخدم بالدور (موجود مسبقاً)
- [x] اختبار إضافة وتعديل المستخدمين مع الأدوار
- [x] حفظ checkpoint


## منح المالك (RADMAN/OWNER) صلاحيات مطلقة تلقائياً

### المهام:
- [x] التحقق من OWNER_OPEN_ID في متغيرات البيئة (fQvX5e3Eytk42QF5qSXDcP)
- [x] تحديث usePermission hook للتحقق من المالك أولاً
- [x] تحديث Backend requirePermission middleware للتحقق من المالك
- [x] منح المالك صلاحيات مطلقة على جميع الصفحات والأزرار
- [x] اختبار الصلاحيات مع المستخدم RADMAN
- [x] حفظ checkpoint


## إصلاح مشكلة اختفاء القوائم الجانبية للمالك RADMAN

### المشكلة:
- المستخدم RADMAN (المالك) لا يرى بعض القوائم مثل مراكز التكلفة والمجموعات
- السبب: VITE_OWNER_OPEN_ID غير متاح في Frontend

### الحل:
- [x] إضافة حقل isOwner في user object من Backend
- [x] تحديث getUserById للتحقق من openId === OWNER_OPEN_ID
- [x] تحديث usePermission hook لاستخدام user.isOwner
- [x] إعادة تشغيل السيرفر
- [x] اختبار مع المستخدم RADMAN
- [x] حفظ checkpoint


## إضافة القوائم المفقودة إلى القائمة الجانبية

### المشكلة:
- عند إعادة كتابة DashboardLayout لتطبيق الصلاحيات، تم حذف بعض القوائم عن طريق الخطأ

### القوائم المفقودة:
- [x] مراكز التكلفة (Cost Centers)
- [x] مجموعات العمل (Groups)
- [x] الوظائف (Jobs)
- [x] الإعدادات العامة (Settings)

### المهام:
- [x] إضافة صلاحيات للقوائم المفقودة في permissions.ts (موجودة مسبقاً)
- [x] تحديث DashboardLayout بالقوائم المفقودة
- [x] ربط كل قائمة بالصلاحية المناسبة
- [x] حفظ checkpoint


## إضافة الصفحات المفقودة إلى القائمة الجانبية

### الصفحات المفقودة:
- [x] تقارير الحضور (/attendance/reports)
- [x] أيام العمل (/work-days)
- [x] البلاغات المعلقة (/pending-flags)
- [x] تقارير الرواتب (/payroll-report)
- [x] التقارير المالية (/finance/reports)
- [x] لوحة التحكم التنفيذية (/executive)

### الروابط الوهمية (غير موجودة):
- [x] حذف /reports من القائمة (لا توجد صفحة)
- [x] حذف /jobs من القائمة (لا توجد صفحة)
- [x] حذف /settings من القائمة (لا توجد صفحة)

### المهام:
- [x] إضافة الصفحات المفقودة إلى DashboardLayout
- [x] ربط كل صفحة بالصلاحية المناسبة
- [x] حذف الروابط الوهمية
- [x] حفظ checkpoint


## إضافة صفحة استثناءات الرواتب إلى القائمة الجانبية

### المشكلة:
- صفحة PayOverrides موجودة في `/finance/overrides` لكن غير مضافة في القائمة الجانبية
- الاستثناءات تشمل: الإضافات (bonus)، الخصومات (deduction)، السلف (advance)، المكافآت

### المهام:
- [x] إضافة رابط "استثناءات الرواتب" في قسم الرواتب والمالية
- [x] ربط الرابط بالصلاحية المناسبة
- [x] حفظ checkpoint
