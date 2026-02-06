# دليل نشر Edge Functions
## نظام الإشعارات الفورية للبصمات الناقصة

**التاريخ:** 2 فبراير 2026
**الحالة:** جاهز للنشر

---

## 🚀 الخطوة 1: تثبيت Supabase CLI

```bash
# على نظام macOS أو Linux
brew install supabase/tap/supabase

# أو استخدم npm
npm install -g supabase
```

---

## 🔐 الخطوة 2: تسجيل الدخول إلى Supabase

```bash
supabase login
```

سيطلب منك إدخال Supabase Access Token:
1. توجه إلى: https://app.supabase.com/account/tokens
2. انقر على **Create new token**
3. أعط اسم: `tolanworkforce-deployment`
4. انسخ الـ Token
5. الصقه في Terminal

---

## 📁 الخطوة 3: ربط المشروع المحلي

```bash
cd /home/ubuntu/tolanworkforce

# ربط المشروع بـ Supabase
supabase link --project-ref YOUR_PROJECT_REF

# استبدل YOUR_PROJECT_REF برقم مشروعك من URL:
# https://app.supabase.com/project/YOUR_PROJECT_REF
```

---

## 🔔 الخطوة 4: نشر Edge Function الأولى (notify-missing-punches)

### الملف موجود بالفعل في:
```
supabase/functions/notify-missing-punches/index.ts
```

### لنشره:

```bash
supabase functions deploy notify-missing-punches
```

**المخرجات المتوقعة:**
```
✓ Function deployed successfully
  Function URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-missing-punches
```

---

## ✅ الخطوة 5: نشر Edge Function الثانية (approve-punch)

### الملف موجود بالفعل في:
```
supabase/functions/approve-punch/index.ts
```

### لنشره:

```bash
supabase functions deploy approve-punch
```

**المخرجات المتوقعة:**
```
✓ Function deployed successfully
  Function URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/approve-punch
```

---

## 🧪 الخطوة 6: اختبار Edge Functions

### اختبار notify-missing-punches:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-missing-punches \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": 1,
    "work_date": "2026-02-02",
    "missing_punch_type": "check_out"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "message": "Notification sent to manager",
  "notification_id": "notif_123456"
}
```

### اختبار approve-punch:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/approve-punch \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "punch_id": 1,
    "approved_by": "admin_user_id",
    "note": "Approved by manager"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "message": "Punch approved successfully",
  "updated_punch": { ... }
}
```

---

## 📊 الخطوة 7: ربط Edge Functions بـ Database Triggers

### في Supabase SQL Editor، أضف:

```sql
-- Trigger to call notify-missing-punches function
CREATE OR REPLACE FUNCTION call_notify_missing_punches()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via HTTP
  PERFORM http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-missing-punches',
    jsonb_build_object(
      'worker_id', NEW.worker_id,
      'work_date', DATE(NEW.event_time),
      'missing_punch_type', 
      CASE 
        WHEN NEW.event_type = 'check_in' THEN 'check_out'
        ELSE 'check_in'
      END
    )::text,
    'application/json',
    'Bearer YOUR_ANON_KEY'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to attendance_events
DROP TRIGGER IF EXISTS trg_call_notify_missing_punches ON attendance_events;
CREATE TRIGGER trg_call_notify_missing_punches
AFTER INSERT ON attendance_events
FOR EACH ROW
WHEN (NEW.is_automatic = true OR NEW.needs_review = true)
EXECUTE FUNCTION call_notify_missing_punches();
```

---

## 🔑 الخطوات الإضافية:

### الحصول على YOUR_PROJECT_REF:
1. افتح: https://app.supabase.com
2. اختر مشروعك
3. انسخ الـ Project ID من URL

### الحصول على YOUR_ANON_KEY:
1. في لوحة تحكم Supabase
2. انقر على **Settings** → **API**
3. انسخ **anon public** key

---

## ✅ التحقق من النشر:

```bash
# عرض جميع Edge Functions المنشورة
supabase functions list

# عرض logs الـ Function
supabase functions logs notify-missing-punches --tail
```

---

## 🎯 الخطوة التالية:

بعد نشر Edge Functions بنجاح:
1. حقن البيانات الحقيقية (106 سجل)
2. اختبار النظام بالكامل
3. إجراء أول اعتماد رواتب حقيقي

**الوقت المتوقع:** 5 دقائق فقط! ⚡
