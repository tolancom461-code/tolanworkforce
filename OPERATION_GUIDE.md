# دليل التشغيل - نظام إدارة القوى العاملة TolanWorkforce

## 📋 جدول المحتويات
1. [متطلبات النظام](#متطلبات-النظام)
2. [التثبيت والإعداد](#التثبيت-والإعداد)
3. [بدء التشغيل](#بدء-التشغيل)
4. [صيانة النظام](#صيانة-النظام)
5. [استكشاف الأخطاء](#استكشاف-الأخطاء)
6. [النسخ الاحتياطي](#النسخ-الاحتياطي)
7. [الأمان](#الأمان)

---

## متطلبات النظام

### متطلبات الخادم:
- **نظام التشغيل:** Linux / Windows / macOS
- **Node.js:** إصدار 22.13.0 أو أحدث
- **قاعدة البيانات:** MySQL 8.0 أو TiDB
- **المتصفح:** Chrome / Firefox / Safari / Edge (آخر إصدار)

### متطلبات الأجهزة:
- **المعالج:** 2 GHz أو أسرع
- **الذاكرة:** 4 GB RAM أو أكثر
- **التخزين:** 10 GB مساحة حرة
- **الاتصال:** اتصال إنترنت مستقر

### متطلبات الشبكة:
- ✅ اتصال HTTPS آمن
- ✅ فتح المنافذ: 3000 (التطوير)، 443 (الإنتاج)
- ✅ دعم WebSocket (للميزات المتقدمة)

---

## التثبيت والإعداد

### 1️⃣ تثبيت المتطلبات الأساسية

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# التحقق من الإصدار
node --version  # v22.13.0 أو أحدث
npm --version   # 10.x أو أحدث
```

### 2️⃣ تثبيت قاعدة البيانات

```bash
# تثبيت MySQL
sudo apt install -y mysql-server

# بدء خدمة MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# إنشاء قاعدة بيانات
mysql -u root -p
CREATE DATABASE tolanworkforce;
CREATE USER 'tolanuser'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON tolanworkforce.* TO 'tolanuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3️⃣ إعداد البيئة

```bash
# استنساخ المشروع
git clone https://github.com/yourusername/tolanworkforce.git
cd tolanworkforce

# تثبيت المكتبات
pnpm install

# إنشاء ملف .env
cp .env.example .env

# تحديث بيانات قاعدة البيانات في .env
DATABASE_URL="mysql://tolanuser:secure_password@localhost:3306/tolanworkforce"
JWT_SECRET="your-secret-key-here"
```

### 4️⃣ إعداد قاعدة البيانات

```bash
# تشغيل الهجرات
pnpm db:push

# ملء البيانات الأولية (اختياري)
pnpm db:seed
```

---

## بدء التشغيل

### بيئة التطوير

```bash
# بدء خادم التطوير
pnpm dev

# سيظهر:
# Server running on http://localhost:3000
# Client running on http://localhost:5173
```

### بيئة الإنتاج

```bash
# بناء المشروع
pnpm build

# بدء الخادم
pnpm start

# أو استخدام PM2 للإدارة المتقدمة
npm install -g pm2
pm2 start "pnpm start" --name "tolanworkforce"
pm2 save
pm2 startup
```

### الوصول إلى النظام

- **عنوان الموقع:** https://tolanwork.sbs
- **عنوان التطوير:** http://localhost:3000
- **اسم المستخدم الافتراضي:** ADMIN
- **كلمة المرور الافتراضية:** ADMIN1

---

## صيانة النظام

### 1️⃣ تحديث المكتبات

```bash
# التحقق من التحديثات المتاحة
pnpm outdated

# تحديث المكتبات
pnpm update

# تحديث مكتبة معينة
pnpm update package-name@latest
```

### 2️⃣ تنظيف النظام

```bash
# حذف ملفات التخزين المؤقت
pnpm cache clean

# حذف المجلدات المؤقتة
rm -rf node_modules
rm -rf .next
rm -rf dist

# إعادة التثبيت
pnpm install
```

### 3️⃣ مراقبة الأداء

```bash
# عرض استهلاك الموارد
top

# عرض استخدام القرص
df -h

# عرض استخدام الذاكرة
free -h

# عرض سجلات الخادم
tail -f logs/server.log
```

### 4️⃣ نسخ احتياطي من قاعدة البيانات

```bash
# نسخ احتياطي يدوي
mysqldump -u tolanuser -p tolanworkforce > backup_$(date +%Y%m%d_%H%M%S).sql

# استعادة من نسخة احتياطية
mysql -u tolanuser -p tolanworkforce < backup_20260128_120000.sql

# نسخ احتياطي مجدول (Cron)
# أضف إلى crontab:
# 0 2 * * * mysqldump -u tolanuser -p tolanworkforce > /backups/backup_$(date +\%Y\%m\%d).sql
```

---

## استكشاف الأخطاء

### مشكلة: "Connection refused" عند الاتصال بقاعدة البيانات

**الحل:**
```bash
# تحقق من حالة MySQL
sudo systemctl status mysql

# أعد تشغيل MySQL
sudo systemctl restart mysql

# تحقق من بيانات الاتصال في .env
cat .env | grep DATABASE_URL
```

### مشكلة: "Port 3000 already in use"

**الحل:**
```bash
# ابحث عن العملية التي تستخدم المنفذ
lsof -i :3000

# اقتل العملية
kill -9 <PID>

# أو استخدم منفذ مختلف
PORT=3001 pnpm dev
```

### مشكلة: "npm ERR! code ERESOLVE"

**الحل:**
```bash
# استخدم --legacy-peer-deps
pnpm install --legacy-peer-deps

# أو حدّث npm
npm install -g npm@latest
```

### مشكلة: "Module not found"

**الحل:**
```bash
# أعد تثبيت المكتبات
rm -rf node_modules
pnpm install

# امسح ذاكرة التخزين المؤقت
pnpm cache clean --force
```

### مشكلة: "QRScanner لا يعمل على الجوال"

**الحل:**
1. تأكد من السماح بالوصول للكاميرا
2. استخدم HTTPS (ليس HTTP)
3. جرّب متصفح مختلف
4. تحقق من الإضاءة الجيدة

---

## النسخ الاحتياطي

### استراتيجية النسخ الاحتياطي الموصى بها:

| النوع | التكرار | الاحتفاظ |
|--------|---------|---------|
| **يومي** | كل يوم في الساعة 2 صباحاً | 30 يوم |
| **أسبوعي** | كل يوم جمعة | 12 أسبوع |
| **شهري** | آخر يوم من الشهر | 12 شهر |

### إعداد النسخ الاحتياطي التلقائية:

```bash
# إنشاء سكريبت النسخ الاحتياطي
cat > /home/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u tolanuser -p$MYSQL_PASSWORD tolanworkforce > $BACKUP_DIR/backup_$DATE.sql
# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
EOF

# جعل السكريبت قابل للتنفيذ
chmod +x /home/backup.sh

# إضافة إلى crontab
crontab -e
# أضف السطر:
# 0 2 * * * /home/backup.sh
```

---

## الأمان

### 1️⃣ تأمين الاتصال

```bash
# استخدم HTTPS فقط
# تحديث ملف الإعدادات:
FORCE_HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### 2️⃣ تأمين قاعدة البيانات

```bash
# تغيير كلمة المرور الافتراضية
mysql -u root -p
ALTER USER 'tolanuser'@'localhost' IDENTIFIED BY 'new_secure_password';

# تعطيل الوصول البعيد
GRANT ALL PRIVILEGES ON tolanworkforce.* TO 'tolanuser'@'localhost' ONLY;
```

### 3️⃣ تأمين المفاتيح السرية

```bash
# إنشاء مفتاح JWT قوي
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# تحديث .env
JWT_SECRET="your-generated-secret-here"
```

### 4️⃣ تحديثات الأمان

```bash
# فحص الثغرات الأمنية
pnpm audit

# إصلاح الثغرات التلقائية
pnpm audit fix

# تحديث المكتبات الحساسة
pnpm update
```

### 5️⃣ سياسات كلمات المرور

- ✅ طول أدنى: 8 أحرف
- ✅ يجب أن تحتوي على: أحرف كبيرة وصغيرة وأرقام
- ✅ تغيير دوري: كل 90 يوم
- ✅ عدم إعادة استخدام: آخر 5 كلمات مرور

---

## 📞 الدعم الفني

### ساعات الدعم:
- 🕐 السبت - الخميس: 8:00 صباحاً - 6:00 مساءً
- 🕐 الجمعة: مغلق
- 🕐 الطوارئ: 24/7

### قنوات التواصل:
- 📧 البريد الإلكتروني: support@tolanworkforce.com
- 📱 الهاتف: +966-XX-XXXX-XXXX
- 💬 الدعم الحي: https://tolanwork.sbs/support

---

## 📝 ملاحظات مهمة

⚠️ **قبل الإنتاج:**
- [ ] اختبر جميع الميزات بالكامل
- [ ] قم بنسخة احتياطية من البيانات
- [ ] تحقق من الأداء تحت الحمل
- [ ] راجع إعدادات الأمان

⚠️ **أثناء التشغيل:**
- [ ] راقب استهلاك الموارد
- [ ] احتفظ بسجلات النشاط
- [ ] قم بتحديثات أمان منتظمة
- [ ] اختبر النسخ الاحتياطية

---

**آخر تحديث:** 28 يناير 2026
**الإصدار:** 1.0.0
