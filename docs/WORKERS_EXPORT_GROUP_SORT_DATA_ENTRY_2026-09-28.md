# Workers Excel export update — 2026-09-28

## Scope
- Add the worker's group name to the workers Excel export while keeping the group ID.
- Sort exported rows by group name ascending.
- Within each group, sort workers by the numeric part of the worker code descending (for example W32, W31, W30).
- The main "Export Excel" button now uses the full server export instead of only the currently paginated rows.
- `data_entry` can use worker export, but the import/export dialog is hidden for that role.
- Backend worker import explicitly excludes `data_entry`; existing import access remains for Admin Affairs, Accountant, and Super Admin.

## Database
No SQL or migration is required.
