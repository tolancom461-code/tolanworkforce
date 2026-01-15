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
