# Debug Findings - Payroll Calculation Issues

## Group Settings
- مجموعة النظافة: daily_wage=200, work_minutes=60, minute_cost=3.3333, late_penalty_rate=100, early_leave_penalty_rate=50
- مجموعة كاشيرات المطاعم: daily_wage=300, work_minutes=120, minute_cost=2.5, late_penalty_rate=100, early_leave_penalty_rate=150

## Group Schedules (exist!)
- مجموعة النظافة: has schedules for all 7 days (e.g., Sunday 13:00-14:00)
- مجموعة كاشيرات المطاعم: has schedules for all 7 days (e.g., Sunday 13:00-14:30)

## Problem Analysis
The group_schedules DO exist! But the old data was calculated with wrong logic:
1. baseAmount was calculated as (actualMinutes / groupWorkMinutes) * dailyWage instead of fixed dailyWage
2. Deductions were massive because penalty rates are 100x and 50x multipliers on minuteCost

## Penalty Rate Issue
- late_penalty_rate = 100 means: lateMinutes * minuteCost * 100 = HUGE deduction
- For 1 minute late: 1 * 3.3333 * 100 = 333.33 SAR deduction!
- This is clearly wrong. The penalty rate should be 1 (normal rate) or a small multiplier

## Action Items
1. Fix baseAmount to be fixed dailyWage ✅ (done)
2. Fix penalty rate interpretation - should these be percentages? (100% = 1x multiplier?)
3. Recalculate all worker_daily_finance records
