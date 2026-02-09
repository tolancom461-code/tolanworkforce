# Attendance Log - Feb 02, 2026

| Worker | Code | Check-in | Check-out | Method | Minutes |
|--------|------|----------|-----------|--------|---------|
| علي صالح | R01 | 08:18 | 09:30 | QR | 72 |
| كمال خالد | R02 | 08:00 | 09:49 | QR | 64 (should be ~109?) |
| فرحان مصطفى | R03 | 08:38 | 09:00 | QR | 72 (should be ~22?) |
| مشرف خالد | R04 | 08:00 | 11:07 | QR | 176 |
| احمد هارون | R05 | 08:00 | 05:00 PM | يدوي | 484 |
| هادي عمر | R06 | 08:20 | 11:00 | QR | 160 |

## Group Schedules for Feb 02 (Monday = day 1)
- مجموعة النظافة (R01-R03): 13:00-14:00 (60 min)
- مجموعة كاشيرات المطاعم (R04-R06): 13:30-14:30 (60 min)

## Problem
Workers checked in at 08:00 but shift starts at 13:00!
The attendance times (08:00) are before the shift start (13:00).
This means earlyLeaveMinutes would be calculated based on shift end time.
