# دليل نشر Edge Functions على Supabase

## المتطلبات

- Supabase CLI مثبت
- حساب Supabase مع مشروع نشط
- الوصول إلى مفاتيح API

## الخطوة 1: تثبيت Supabase CLI

```bash
# على macOS/Linux
brew install supabase/tap/supabase

# على Windows (باستخدام npm)
npm install -g supabase
```

## الخطوة 2: تسجيل الدخول إلى Supabase

```bash
supabase login
```

سيطلب منك إدخال رمز الوصول (Access Token):
1. اذهب إلى https://app.supabase.com/account/tokens
2. انسخ رمز الوصول الشخصي
3. الصقه في الـ CLI

## الخطوة 3: ربط المشروع المحلي

```bash
cd /home/ubuntu/tolanworkforce

# تهيئة Supabase
supabase init

# ربط المشروع الموجود
supabase link --project-ref your-project-id
```

استبدل `your-project-id` برقم مشروعك (يمكنك الحصول عليه من رابط Supabase)

## الخطوة 4: نشر Edge Functions

### نشر notify-missing-punches

```bash
supabase functions deploy notify-missing-punches
```

### نشر approve-punch

```bash
supabase functions deploy approve-punch
```

### نشر جميع الـ Functions في وقت واحد

```bash
supabase functions deploy
```

## الخطوة 5: اختبار Edge Functions

### اختبر notify-missing-punches

```bash
curl -X POST https://your-project-id.supabase.co/functions/v1/notify-missing-punches \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workDate": "2026-01-31"
  }'
```

**الاستجابة المتوقعة:**
```json
{
  "success": true,
  "notified": 5,
  "missingPunches": 3,
  "message": "تم إنشاء 5 إشعار للمديرين"
}
```

### اختبر approve-punch

```bash
curl -X POST https://your-project-id.supabase.co/functions/v1/approve-punch \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "punch_id": 1,
    "user_id": "user-uuid-here",
    "note": "تم المراجعة والموافقة"
  }'
```

**الاستجابة المتوقعة:**
```json
{
  "success": true,
  "message": "تم الموافقة على البصمة بنجاح",
  "punch": {
    "id": 1,
    "status": "APPROVED",
    "reviewed_at": "2026-02-01T08:30:00Z"
  }
}
```

## الخطوة 6: عرض السجلات (Logs)

```bash
# عرض سجلات notify-missing-punches
supabase functions logs notify-missing-punches

# عرض سجلات approve-punch
supabase functions logs approve-punch

# عرض جميع السجلات
supabase functions logs
```

## الخطوة 7: تحديث Edge Functions

إذا قمت بتعديل الـ Functions:

```bash
# تحديث notify-missing-punches
supabase functions deploy notify-missing-punches

# تحديث approve-punch
supabase functions deploy approve-punch
```

## استكشاف الأخطاء

### الخطأ: "Project not linked"

```bash
supabase link --project-ref your-project-id
```

### الخطأ: "Unauthorized"

تأكد من أن `YOUR_ANON_KEY` صحيح:
1. اذهب إلى https://app.supabase.com/project/your-project-id/settings/api
2. انسخ `anon public` key
3. استخدمه في الطلب

### الخطأ: "Function not found"

تأكد من أن الـ Function تم نشرها بنجاح:
```bash
supabase functions list
```

## الخطوة 8: دمج Edge Functions مع التطبيق

### في الـ Frontend (React)

```typescript
// client/src/lib/edgeFunctions.ts
export async function notifyMissingPunches(workDate: Date) {
  const response = await fetch(
    `${process.env.VITE_SUPABASE_URL}/functions/v1/notify-missing-punches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workDate: workDate.toISOString().split('T')[0],
      }),
    }
  );
  
  return await response.json();
}

export async function approvePunch(punchId: number, userId: string, note?: string) {
  const response = await fetch(
    `${process.env.VITE_SUPABASE_URL}/functions/v1/approve-punch`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        punch_id: punchId,
        user_id: userId,
        note,
      }),
    }
  );
  
  return await response.json();
}
```

### استخدام في المكونات

```typescript
// في PunchesReviewCenter.tsx
import { approvePunch } from '@/lib/edgeFunctions';

const handleApprove = async (record: PunchRecord) => {
  try {
    const result = await approvePunch(record.id, ctx.user?.id, editingNote);
    if (result.success) {
      toast.success('تم الموافقة على البصمة');
      await refetchEvents();
    }
  } catch (error) {
    toast.error('حدث خطأ');
  }
};
```

## جدول الإشعارات المقترح

```typescript
// تشغيل الإشعارات يومياً في الساعة 6 مساءً
// استخدم Supabase Cron Jobs أو جدول مهام خارجي

// مثال: استخدام node-cron
import cron from 'node-cron';

// كل يوم في الساعة 6 مساءً
cron.schedule('0 18 * * *', async () => {
  const today = new Date();
  await notifyMissingPunches(today);
  console.log('تم إرسال الإشعارات');
});
```

## ملاحظات مهمة

⚠️ **الأمان:**
- لا تضع مفاتيح سرية في الـ Frontend
- استخدم متغيرات البيئة فقط
- تأكد من تفعيل RLS على جميع الجداول

✅ **أفضل الممارسات:**
- اختبر الـ Functions محلياً قبل النشر
- استخدم السجلات لتتبع الأخطاء
- قم بتحديث الـ Functions بانتظام
- راقب استهلاك الموارد

## الدعم

للمزيد من المعلومات:
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
