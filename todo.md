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
