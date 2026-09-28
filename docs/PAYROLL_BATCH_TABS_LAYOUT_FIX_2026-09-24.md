# Payroll Batch Tabs Layout Fix — 2026-09-24

## Scope
واجهة `/payroll/batches` فقط.

## Problem
بعد إضافة خمسة تبويبات لمسار دفعات الرواتب ظهر تبويب **الكل** فقط في شريط التبويبات.

## Cause
تم فرض تخطيط Grid على `TabsList` عبر:

```tsx
<TabsList className="grid w-full grid-cols-5">
```

بينما مكوّن `TabsList` الأساسي في المشروع مبني على `inline-flex`، و`TabsTrigger` يحتوي أصلًا على `flex-1` لتوزيع التبويبات بالتساوي.

## Fix
تمت إزالة فرض الـGrid والإبقاء على العرض الكامل:

```tsx
<TabsList className="w-full">
```

وبذلك يستخدم المكوّن تخطيطه الأصلي وتوزّع التبويبات الخمسة بالتساوي.

## Changed files
- `client/src/pages/payroll/PayrollBatchList.tsx`
- `docs/PAYROLL_BATCH_TABS_LAYOUT_FIX_2026-09-24.md`

## Impact
تعديل واجهة فقط. لا تغيير على قاعدة البيانات أو حالات Payroll أو سير الاعتماد أو الحسابات أو التقارير.
