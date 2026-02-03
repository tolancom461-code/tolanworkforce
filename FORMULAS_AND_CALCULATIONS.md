# معادلات الحساب والارتباط بالورديات الديناميكية
# Formulas and Dynamic Shift Integration

## 📋 نظرة عامة
هذا الملف يوثق جميع معادلات الحساب المستخدمة في نظام إدارة القوى العاملة (TolanWorkforce) وكيفية ارتباطها بالورديات الديناميكية.

---

## 🔗 الارتباط بالورديات الديناميكية

### المشكلة السابقة
- كانت معادلات الحساب تستخدم أوقات ثابتة من جدول `groups` فقط
- التعديلات على الورديات الديناميكية في جدول `groupSchedules` لم تؤثر على حساب الرواتب
- حقل `effectiveDate` موجود لكن لم يُستخدم

### الحل الجديد
تم إنشاء ملف `server/dynamic-shift-calculation.ts` يحتوي على:

#### 1. دالة `getExpectedShiftTimes(workerId, workDate)`
```typescript
// تحصل على أوقات العمل المتوقعة لعامل في يوم معين
// الأولوية:
// 1. الورديات الديناميكية (groupSchedules) مع التحقق من effectiveDate
// 2. الأوقات الثابتة من جدول groups
// 3. القيم الافتراضية (08:00 - 17:00)

const shiftInfo = await getExpectedShiftTimes(workerId, workDate);
// Returns: { startTime, endTime, requiredHours, source: 'dynamic' | 'static' | 'default' }
```

#### 2. دالة `getDynamicShiftForDate(groupId, workDate)`
```typescript
// تحصل على وردية ديناميكية محددة لمجموعة في يوم معين
// تأخذ في الاعتبار:
// - يوم الأسبوع (dayOfWeek)
// - تاريخ البداية (effectiveDate)
// - حالة النشاط (isActive)

const shift = await getDynamicShiftForDate(groupId, workDate);
// Returns: { startTime, endTime, requiredHours, effectiveDate, dayOfWeek } | null
```

#### 3. دالة `calculateLateMintuesFromDynamicShift(workerId, workDate, checkInTime)`
```typescript
// تحسب دقائق التأخير بناءً على الوردية الديناميكية
// تستخدم getExpectedShiftTimes للحصول على وقت البداية المتوقع

const lateMinutes = await calculateLateMintuesFromDynamicShift(
  workerId,
  workDate,
  checkInTime
);
```

#### 4. دالة `calculateEarlyLeaveMinutesFromDynamicShift(workerId, workDate, checkOutTime)`
```typescript
// تحسب دقائق المغادرة المبكرة بناءً على الوردية الديناميكية
// تستخدم getExpectedShiftTimes للحصول على وقت النهاية المتوقع

const earlyLeaveMinutes = await calculateEarlyLeaveMinutesFromDynamicShift(
  workerId,
  workDate,
  checkOutTime
);
```

---

## 📐 المعادلات الرياضية

### 1. معادلة تكلفة الدقيقة الواحدة
```
minuteCost = dailyWage ÷ workMinutes

مثال:
- الراتب اليومي: 150
- دقائق العمل: 480 (8 ساعات)
- تكلفة الدقيقة = 150 ÷ 480 = 0.3125
```

**الملف:** `server/db.ts` - دالة `calculateMinuteCost()`
**الاستخدام:** حساب الغرامات والخصومات

---

### 2. معادلة غرامة التأخير
```
latePenalty = minuteCost × lateMinutes × latePenaltyRate

مثال:
- تكلفة الدقيقة: 0.3125
- دقائق التأخير: 30
- معدل الغرامة: 0.5 (50%)
- الغرامة = 0.3125 × 30 × 0.5 = 4.69
```

**الملف:** `server/db.ts` - دالة `calculateLatePenalty()`
**الصيغة الصحيحة:** `penalty = minuteCost × minutes × penaltyRate`
**ملاحظة:** تم إصلاح الصيغة من `(1 + penaltyRate)` إلى `penaltyRate`

---

### 3. معادلة غرامة المغادرة المبكرة
```
earlyLeavePenalty = minuteCost × earlyLeaveMinutes × earlyLeavePenaltyRate

مثال:
- تكلفة الدقيقة: 0.3125
- دقائق المغادرة المبكرة: 30
- معدل الغرامة: 0.5 (50%)
- الغرامة = 0.3125 × 30 × 0.5 = 4.69
```

**الملف:** `server/db.ts` - دالة `calculateEarlyLeavePenalty()`
**الصيغة الصحيحة:** `penalty = minuteCost × minutes × penaltyRate`

---

### 4. معادلة الخصومات اليومية
```
deductions = latePenalty + earlyLeavePenalty

مثال:
- غرامة التأخير: 4.69
- غرامة المغادرة المبكرة: 4.69
- إجمالي الخصومات = 4.69 + 4.69 = 9.38
```

**الملف:** `server/db.ts` - دالة `calculateDailyFinanceFromAttendance()`

---

### 5. معادلة الراتب الصافي اليومي
```
netAmount = baseAmount - deductions + bonuses

مثال:
- الراتب الأساسي: 150
- الخصومات: 9.38
- المكافآت: 0
- الراتب الصافي = 150 - 9.38 + 0 = 140.62
```

**الملف:** `server/db.ts` - دالة `calculateDailyFinanceFromAttendance()`

---

### 6. معادلة إجمالي الراتب الشهري
```
totalNetAmount = Σ(baseAmount) - Σ(deductions) + Σ(bonuses) + bonusesFromOverrides - deductionsFromOverrides

مثال:
- إجمالي الراتب الأساسي: 4500
- إجمالي الخصومات: 200
- إجمالي المكافآت: 100
- المكافآت الإضافية: 50
- الخصومات الإضافية: 25
- الراتب الصافي = 4500 - 200 + 100 + 50 - 25 = 4425
```

**الملف:** `server/db.ts` - دالة `calculateWorkerPayroll()`

---

## 🔄 تدفق حساب الراتب اليومي

```
1. الحصول على معلومات العامل والمجموعة
   ↓
2. محاولة الحصول على الوردية الديناميكية (NEW)
   ├─ إذا وجدت: استخدم أوقاتها مع التحقق من effectiveDate
   ├─ إذا لم توجد: استخدم الأوقات الثابتة من جدول groups
   └─ إذا لم توجد: استخدم القيم الافتراضية
   ↓
3. الحصول على سجلات الحضور للعامل في اليوم
   ↓
4. حساب دقائق التأخير والمغادرة المبكرة
   ├─ باستخدام أوقات الوردية من الخطوة 2
   └─ مقارنة مع وقت الحضور والمغادرة الفعلي
   ↓
5. حساب الخصومات
   ├─ غرامة التأخير = minuteCost × lateMinutes × latePenaltyRate
   ├─ غرامة المغادرة المبكرة = minuteCost × earlyLeaveMinutes × earlyLeavePenaltyRate
   └─ إجمالي الخصومات = غرامة التأخير + غرامة المغادرة المبكرة
   ↓
6. حساب الراتب الصافي
   └─ netAmount = baseAmount - deductions + bonuses
```

---

## 📊 مثال عملي شامل

### السيناريو
- **العامل:** أحمد محمد (ID: 1)
- **المجموعة:** صباحي - الفريق الأول (ID: 1)
- **التاريخ:** 2026-02-03 (الثلاثاء)
- **الراتب اليومي:** 150
- **دقائق العمل:** 480 (8 ساعات)
- **معدل غرامة التأخير:** 0.5 (50%)
- **معدل غرامة المغادرة المبكرة:** 0.5 (50%)

### الوردية الديناميكية (groupSchedules)
```
dayOfWeek: 2 (الثلاثاء)
startTime: "09:00"
endTime: "18:00"
requiredHours: 9
effectiveDate: "2026-02-01"
```

### سجلات الحضور
```
Check-in: 09:15 (15 دقيقة متأخر)
Check-out: 17:45 (15 دقيقة مبكر)
```

### الحسابات

#### 1. تكلفة الدقيقة
```
minuteCost = 150 ÷ 480 = 0.3125
```

#### 2. غرامة التأخير
```
latePenalty = 0.3125 × 15 × 0.5 = 2.34
```

#### 3. غرامة المغادرة المبكرة
```
earlyLeavePenalty = 0.3125 × 15 × 0.5 = 2.34
```

#### 4. إجمالي الخصومات
```
deductions = 2.34 + 2.34 = 4.68
```

#### 5. الراتب الصافي
```
netAmount = 150 - 4.68 + 0 = 145.32
```

---

## ✅ التحقق من صحة المعادلات

### اختبارات الوحدة
تم إنشاء ملف `server/dynamic-shift-integration.test.ts` يحتوي على:

1. **اختبارات حساب تكلفة الدقيقة**
   - التحقق من الحساب الصحيح
   - حالات مختلفة من الرواتب والدقائق

2. **اختبارات حساب غرامات التأخير**
   - معدلات غرامة مختلفة (0.5، 1.0، 1.5، 2.0)
   - حالات خاصة (صفر دقائق، صفر معدل)

3. **اختبارات حساب غرامات المغادرة المبكرة**
   - معدلات غرامة مختلفة
   - حالات خاصة

4. **اختبارات الخصومات اليومية**
   - جمع الغرامات
   - حالات مختلفة

5. **اختبارات الراتب الصافي اليومي**
   - مع وبدون مكافآت
   - حالات مختلفة من الخصومات

6. **اختبارات الراتب الشهري**
   - مع وبدون استثناءات
   - حالات مختلفة

7. **اختبارات السيناريوهات المعقدة**
   - يوم عمل كامل مع تأخير ومغادرة مبكرة
   - حضور مثالي
   - غرامات شديدة
   - حسابات شهرية مختلطة

8. **اختبارات الحالات الحدية**
   - رواتب صغيرة جداً
   - رواتب كبيرة جداً
   - غرامات صغيرة جداً
   - اتساق التقريب

---

## 🔐 الحماية من الأخطاء

### 1. التحقق من صحة البيانات
```typescript
// استخدام دوال آمنة للتحويل
export function safeParseDecimal(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

export function safeParseInt(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? 0 : parsed;
}
```

### 2. التحقق من القيم الحدية
```typescript
// التحقق من أن workMinutes > 0 قبل القسمة
if (!dailyWage || !workMinutes || workMinutes <= 0 || !latePenaltyRate) return 0;

// التحقق من أن الدقائق >= 0
if (checkInTime > shiftStart) {
  lateMinutes = Math.round((checkInTime.getTime() - shiftStart.getTime()) / (1000 * 60));
}
```

### 3. التقريب الصحيح
```typescript
// تقريب لمنزلتين عشريتين (للعملات)
return Math.round(penalty * 100) / 100;

// تقريب لأربع منازل عشرية (لتكلفة الدقيقة)
return Math.round((dailyWage / workMinutes) * 10000) / 10000;
```

---

## 📝 ملاحظات مهمة

### 1. الورديات الديناميكية والتاريخ الفعال
- عند تعديل وردية ديناميكية، يمكن تحديد `effectiveDate`
- إذا كان `effectiveDate` محدداً، يتم تطبيق الوردية من هذا التاريخ فقط
- إذا كان `effectiveDate` NULL، يتم تطبيق الوردية فوراً

### 2. أولوية الأوقات
1. **الورديات الديناميكية** (groupSchedules) - الأولوية الأولى
2. **الأوقات الثابتة** (groups) - الأولوية الثانية
3. **القيم الافتراضية** (08:00 - 17:00) - الأولوية الثالثة

### 3. الخصومات والمكافآت
- الخصومات تشمل: غرامات التأخير والمغادرة المبكرة
- المكافآت تشمل: مكافآت الحضور والعمل الإضافي
- يتم جمعها مع الخصومات والمكافآت من استثناءات الرواتب (payOverrides)

### 4. قفل دفعات الراتب
- عند اعتماد دفعة راتب، يتم قفل جميع السجلات المالية اليومية
- لا يمكن تعديل الورديات الديناميكية للأسابيع المقفولة
- يتم التحقق من `isPayrollBatchLockedForDate()` قبل السماح بالتعديل

---

## 🚀 التحديثات المستقبلية

### مخطط التطوير
1. ✅ ربط معادلات الحساب بالورديات الديناميكية
2. ✅ استخدام `effectiveDate` في الحسابات
3. ✅ إنشاء اختبارات شاملة
4. ⏳ إضافة دعم للورديات المرنة (flexible shifts)
5. ⏳ إضافة دعم للعمل الإضافي (overtime)
6. ⏳ إضافة دعم للإجازات والعطل الرسمية

---

## 📞 الدعم والمساعدة

للأسئلة أو الاستفسارات حول المعادلات والحسابات، يرجى مراجعة:
- `server/db.ts` - دوال الحساب الرئيسية
- `server/dynamic-shift-calculation.ts` - دوال الورديات الديناميكية
- `server/dynamic-shift-integration.test.ts` - الاختبارات الشاملة

---

**آخر تحديث:** 2026-02-03
**الإصدار:** 1.0.0
