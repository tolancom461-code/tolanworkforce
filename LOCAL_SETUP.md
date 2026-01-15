# TolanWorkforce - دليل التشغيل المحلي

هذا الدليل يشرح كيفية تشغيل مشروع TolanWorkforce على جهازك المحلي بعد تحميله من منصة Manus.

---

## 📋 المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:

- **Node.js** v18 أو أحدث ([تحميل](https://nodejs.org/))
- **pnpm** ([تثبيت](https://pnpm.io/installation)): `npm install -g pnpm`
- **MySQL** أو **PostgreSQL** لقاعدة البيانات
- **Git** (اختياري)

---

## 🚀 خطوات التشغيل

### 1. تحميل المشروع

من واجهة إدارة Manus:
1. اضغط على أيقونة الإعدادات (⚙️) في الأعلى
2. اختر "Code" من القائمة الجانبية
3. اضغط على "Download All Files"
4. فك ضغط الملف المحمل

```bash
unzip tolanworkforce.zip
cd tolanworkforce
```

### 2. تثبيت Dependencies

```bash
pnpm install
```

### 3. إعداد قاعدة البيانات

#### الخيار أ: استخدام Supabase (موصى به)

1. أنشئ حساب مجاني على [Supabase](https://supabase.com)
2. أنشئ مشروع جديد
3. احصل على Connection String من Settings → Database
4. استخدم الصيغة التالية:
```
mysql://[user]:[password]@[host]:3306/[database]?ssl={"rejectUnauthorized":true}
```

#### الخيار ب: MySQL محلي

```bash
# تثبيت MySQL
# macOS
brew install mysql
brew services start mysql

# Ubuntu/Debian
sudo apt install mysql-server
sudo systemctl start mysql

# إنشاء قاعدة بيانات
mysql -u root -p
CREATE DATABASE tolanworkforce;
CREATE USER 'tolanuser'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tolanworkforce.* TO 'tolanuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. إعداد المتغيرات البيئية

أنشئ ملف `.env` في جذر المشروع:

```env
# ============================================
# Database Configuration
# ============================================
DATABASE_URL="mysql://tolanuser:your_password@localhost:3306/tolanworkforce"

# أو إذا كنت تستخدم Supabase:
# DATABASE_URL="mysql://[user]:[password]@[host]:3306/[database]?ssl={\"rejectUnauthorized\":true}"

# ============================================
# JWT & Authentication
# ============================================
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# ============================================
# OAuth Configuration (اختياري - للمصادقة عبر Manus)
# ============================================
# إذا كنت تريد استخدام Manus OAuth، احتفظ بهذه القيم
# وإلا يمكنك تعطيلها واستخدام المصادقة المحلية فقط
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
VITE_APP_ID="your-app-id"

# ============================================
# Owner Information
# ============================================
OWNER_OPEN_ID="your-open-id"
OWNER_NAME="Your Name"

# ============================================
# Manus Built-in Services (اختياري)
# ============================================
# هذه الخدمات متاحة فقط على منصة Manus
# يمكنك تعطيلها للتشغيل المحلي
# BUILT_IN_FORGE_API_URL="https://forge.manus.im"
# BUILT_IN_FORGE_API_KEY="your-api-key"
# VITE_FRONTEND_FORGE_API_KEY="your-frontend-api-key"
# VITE_FRONTEND_FORGE_API_URL="https://forge.manus.im"

# ============================================
# Application Settings
# ============================================
VITE_APP_TITLE="TolanWorkforce - نظام إدارة القوى العاملة"
VITE_APP_LOGO="/logo.png"

# ============================================
# Analytics (اختياري)
# ============================================
# VITE_ANALYTICS_ENDPOINT="your-analytics-endpoint"
# VITE_ANALYTICS_WEBSITE_ID="your-website-id"
```

### 5. إنشاء جداول قاعدة البيانات

```bash
# تطبيق Schema على قاعدة البيانات
pnpm db:push
```

### 6. إضافة البيانات الأساسية (Seed Data)

```bash
# إضافة الصلاحيات الـ 40
npx tsx seed-permissions.mjs

# إضافة الأدوار الافتراضية الـ 5
npx tsx seed-roles.mjs
```

### 7. تشغيل المشروع

```bash
# وضع التطوير (Development)
pnpm dev

# سيعمل على:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
```

### 8. بناء للإنتاج (Production Build)

```bash
# بناء المشروع
pnpm build

# تشغيل النسخة المبنية
pnpm start
```

---

## 📁 هيكل المشروع

```
tolanworkforce/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/            # صفحات التطبيق
│   │   ├── components/       # مكونات قابلة لإعادة الاستخدام
│   │   ├── lib/              # مكتبات ومساعدات
│   │   └── App.tsx           # التوجيهات الرئيسية
│   ├── public/               # ملفات ثابتة
│   └── index.html
├── server/                    # Backend (Express + tRPC)
│   ├── routers.ts            # API endpoints
│   ├── db.ts                 # دوال قاعدة البيانات
│   ├── analytics.ts          # تحليلات ذكية
│   ├── excelExport.ts        # تصدير Excel
│   ├── _core/                # ⚠️ ملفات Manus (اختيارية)
│   └── *.test.ts             # اختبارات Vitest
├── drizzle/                   # Database Schema
│   └── schema.ts             # تعريف الجداول
├── shared/                    # ملفات مشتركة
│   └── systemPermissions.ts  # قائمة الصلاحيات
├── storage/                   # S3 helpers (⚠️ يحتاج Manus)
├── seed-permissions.mjs       # Script إضافة الصلاحيات
├── seed-roles.mjs            # Script إضافة الأدوار
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite config
└── drizzle.config.ts         # Drizzle ORM config
```

### ⚠️ ملفات مرتبطة بـ Manus فقط

هذه الملفات/المجلدات تعمل فقط على منصة Manus ويمكن تجاهلها للتشغيل المحلي:

- `server/_core/` - البنية التحتية لـ Manus (OAuth, LLM, Storage, etc.)
- `storage/` - S3 helpers (تحتاج Manus API)
- `.manus/` - إعدادات المنصة (إن وجدت)

**البدائل المحلية:**
- **OAuth**: استخدم المصادقة المحلية أو Auth0/Firebase
- **LLM**: استخدم OpenAI API مباشرة
- **Storage**: استخدم AWS S3 أو Cloudinary
- **Maps**: استخدم Google Maps API مباشرة

---

## 🔧 إعدادات إضافية

### تعطيل ميزات Manus

إذا كنت تريد تشغيل المشروع بدون خدمات Manus:

1. **تعطيل OAuth**:
   - احذف أو علّق على `OAUTH_SERVER_URL` في `.env`
   - استخدم المصادقة المحلية فقط

2. **تعطيل LLM (Dashboard الذكية)**:
   - الـ Dashboard ستعمل بدون AI insights
   - أو استبدل `invokeLLM` باستدعاء OpenAI API

3. **تعطيل Storage**:
   - استبدل `storagePut/storageGet` بـ AWS S3 SDK
   - أو استخدم Cloudinary/Uploadcare

### استخدام PostgreSQL بدلاً من MySQL

1. عدّل `drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql', // بدلاً من mysql
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
```

2. عدّل `DATABASE_URL` في `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tolanworkforce"
```

3. أعد تثبيت driver:
```bash
pnpm remove mysql2
pnpm add postgres
```

---

## 🧪 تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
pnpm test

# تشغيل اختبار محدد
pnpm test server/users.test.ts

# وضع المراقبة
pnpm test --watch
```

---

## 🐛 حل المشاكل الشائعة

### مشكلة: `DATABASE_URL is not defined`

**الحل**: تأكد من إنشاء ملف `.env` في جذر المشروع مع `DATABASE_URL` صحيح.

### مشكلة: `Failed to connect to database`

**الحل**:
1. تأكد من تشغيل MySQL/PostgreSQL
2. تحقق من صحة بيانات الاتصال في `.env`
3. جرّب الاتصال يدوياً: `mysql -u user -p`

### مشكلة: `Port 3000 already in use`

**الحل**: غيّر المنفذ في `server/index.ts` أو أوقف التطبيق الآخر.

### مشكلة: `Module not found: @/../shared/systemPermissions`

**الحل**: أعد تشغيل dev server: `pnpm dev`

### مشكلة: `OAuth callback failed`

**الحل**: إذا كنت لا تستخدم Manus OAuth، عطّل المصادقة الخارجية واستخدم المحلية فقط.

---

## 📦 نشر المشروع (Deployment)

### الخيار 1: Manus (موصى به)

- أسهل طريقة: اضغط "Publish" في واجهة الإدارة
- دومين مجاني + SSL + قاعدة بيانات مدمجة

### الخيار 2: VPS (Digital Ocean, Linode, AWS EC2)

```bash
# على السيرفر
git clone your-repo
cd tolanworkforce
pnpm install
pnpm build
pm2 start pnpm --name tolanworkforce -- start
```

### الخيار 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع قسم "حل المشاكل الشائعة" أعلاه
2. تحقق من logs في terminal
3. تواصل مع فريق Manus على [help.manus.im](https://help.manus.im)

---

## 📝 ملاحظات مهمة

1. **الأمان**: غيّر `JWT_SECRET` في الإنتاج إلى قيمة عشوائية قوية
2. **قاعدة البيانات**: احتفظ بنسخة احتياطية دورية
3. **المتغيرات البيئية**: لا ترفع ملف `.env` إلى Git
4. **الأداء**: استخدم `pnpm build` للإنتاج، ليس `pnpm dev`

---

## 🎉 انتهى!

الآن يمكنك تشغيل المشروع محلياً والتطوير عليه بحرية.

**روابط مفيدة:**
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [tRPC Docs](https://trpc.io/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
