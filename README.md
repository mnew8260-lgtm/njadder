# 🌐 NJADDER PRO v7.0

> **Premium Telegram Tool — Web Interface**
> 118 أمر في 14 فئة — جاهز للإنتاج والعمل الفعلي

---

## 📋 Table of Contents
- [نظرة عامة](#نظرة-عامة)
- [الميزات](#الميزات)
- [الـ Tech Stack](#ال-tech-stack)
- [النشر السريع على VPS](#النشر-السريع-على-vps)
- [الإدارة اليومية](#الإدارة-اليومية)
- [النسخ الاحتياطي](#النسخ-الاحتياطي)
- [المراقبة](#المراقبة)
- [الأمان](#الأمان)
- [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## نظرة عامة

**NJADDER PRO v7.0** أداة تيليجرام احترافية تعمل في المتصفح، محوّلة من سكربت بايثون إلى تطبيق **Next.js 16** كامل. تعمل على VPS بنظام Ubuntu 24+ مع PostgreSQL (Neon) و Nginx و PM2.

### المميزات الرئيسية
- ✅ **118 أمر** في 14 فئة (تسجيل دخول، سحب، فلاتر، إضافة، رسائل، تقارير...)
- ✅ **نظام موافقة المطور** — لا يدخل أحد إلا بعد موافقتك
- ✅ **القائمة السوداء** — تخطّي تلقائي للمحظورين في عمليات الإضافة
- ✅ **استيراد جلسات تيليجرام** من ملفات (.json / .txt / .session)
- ✅ **3 خطط اشتراك** (مجاني / احترافي / بريميوم) مع حدود يومية
- ✅ **تسجيل دخول تيليجرام** برقم الهاتف + كود + 2FA
- ✅ **لوحة أدمن** كاملة (موافقة / رفض / حذف / تعيين خطط)
- ✅ **Rate limiting** لمنع brute force والإساءة
- ✅ **Health check endpoint** + مراقبة تلقائية
- ✅ **Backup تلقائي** يومي للـ DB
- ✅ **ثيم ذهبي احترافي** + responsive + PWA

---

## الميزات

### 📂 الفئات الـ 14
| # | الفئة | الأوامر | الوصف |
|---|---|---|---|
| 1 | الحسابات وتسجيل الدخول | 22 | تسجيل دخول فردي/جماعي، 2FA، استنساخ، إخفاء الخصوصية |
| 2 | أدوات الاستخراج | 7 | سحب أعضاء القروبات، سحب بالفلتر |
| 3 | الفلاتر | 11 | فلترة حسب الظهور، النوع، النشاط |
| 4 | إضافة الأعضاء | 18 | إضافة فردية/جماعية، إضافة بالـ API rotation |
| 5 | جهات الاتصال | 4 | إضافة/حذف جهات الاتصال |
| 6 | الرسائل والإرسال | 18 | رسائل جماعية، إعادة توجيه، محادثة مجهولة |
| 7 | عمليات المجموعات | 4 | انضمام/مغادرة/إنشاء/استنساخ |
| 8 | زيادة التفاعل | 4 | تفاعلات + مشاهدات + مشاركات |
| 9 | البلاغات | 13 | 10 أنواع بلاغات |
| 10 | المستخدمون القريبون | 2 | البحث الجغرافي |
| 11 | عمليات VCF | 2 | استخراج/فحص أرقام |
| 12 | خاصة | 1 | SpamBot tag |
| 13 | النسخة الذهبية | 6 | أوامر متقدمة |
| 14 | الأغلفة والأمان | 6 | حماية وأمان |

---

## الـ Tech Stack

| الطبقة | التقنية |
|---|---|
| Frontend | Next.js 16.1 + React 19 + TypeScript + Tailwind CSS 3.4 |
| Backend | Next.js API Routes (Node.js runtime) |
| Database | PostgreSQL (Neon Serverless Postgres) |
| Auth | JWT (jose) + bcryptjs + HTTP-only cookies |
| Telegram | GramJS 2.26 (telegram package) |
| Process | PM2 (production process manager) |
| Reverse Proxy | Nginx (IPv4 + IPv6 + HTTPS via Let's Encrypt) |
| Monitoring | Health endpoint + cron watchdog |
| Backups | Daily cron job → gzipped SQL dumps |

---

## النشر السريع على VPS

### المتطلبات
- VPS Ubuntu 24+ بـ 1GB RAM على الأقل
- Node.js 20+
- Nginx + Certbot
- قاعدة بيانات Neon Postgres (مجانية: https://neon.tech)
- نطاق يربط بـ IP الـ VPS

### خطوات النشر (10 دقائق)

```bash
# 1) استنساخ الريبو
git clone https://github.com/mnew8260-lgtm/njadder.git ~/njadder
cd ~/njadder

# 2) تثبيت الحزم
npm install --legacy-peer-deps

# 3) إعداد البيئة
cp .env.example .env
nano .env  # املأ DATABASE_URL و JWT_SECRET (openssl rand -hex 48)

# 4) البناء الأول
NODE_OPTIONS="--max-old-space-size=2048" npx next build

# 5) تثبيت PM2 عالمياً (لو مش مثبت)
npm install -g pm2

# 6) تشغيل التطبيق بـ PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup  # تفعيل التشغيل التلقائي عند إعادة تشغيل VPS

# 7) إعداد Nginx (انظر nginx.conf أسفل)
sudo nano /etc/nginx/sites-available/njadder
sudo ln -sf /etc/nginx/sites-available/njadder /etc/nginx/sites-enabled/njadder
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 8) الحصول على شهادة SSL مجانية
sudo certbot --nginx -d njadder-app.tech -d www.njadder-app.tech \
  --non-interactive --agree-tos -m your@email.com --redirect

# 9) إعداد cron jobs (backup + health check)
bash setup-cron.sh

# 10) اختبار
curl https://njadder-app.tech/api/health
```

### إعداد Nginx الكامل

```nginx
# /etc/nginx/sites-available/njadder
server {
    listen 80;
    listen [::]:80;
    server_name njadder-app.tech www.njadder-app.tech;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name njadder-app.tech www.njadder-app.tech;

    # Certbot سيضيف ssl_certificate و ssl_certificate_key تلقائياً
    ssl_certificate /etc/letsencrypt/live/njadder-app.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/njadder-app.tech/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## الإدارة اليومية

### التحديثات (آمنة مع rollback تلقائي)

```bash
cd ~/njadder
bash deploy.sh
```

السكربت يقوم بـ:
1. ✅ حفظ النسخة الحالية (للـ rollback)
2. ✅ `git pull` من GitHub
3. ✅ `npm install` (فقط لو `package.json` تغيّر)
4. ✅ `next build` (مع fallback عند الفشل)
5. ✅ `pm2 restart njadder`
6. ✅ Health check تلقائي
7. ✅ تثبيت كل المستخدمين الحاليين كـ approved

### أوامر PM2 المفيدة

```bash
pm2 status                    # حالة كل العمليات
pm2 logs njadder              # متابعة logs مباشرة
pm2 logs njadder --lines 100  # آخر 100 سطر
pm2 restart njadder           # إعادة تشغيل
pm2 reload njadder            # reload بدون توقف (zero-downtime)
pm2 stop njadder              # إيقاف
pm2 delete njadder            # حذف من PM2
pm2 monit                     # مراقبة CPU/RAM مباشرة
```

---

## النسخ الاحتياطي

### تلقائي (يومياً 03:00 AM)
- ✅ يحفظ: `users`, `telegram_accounts`, `blacklist`, `usage_log`, `activity_log`, `proxies`, `api_pool`
- ✅ يحتفظ بآخر 7 نسخ
- ✅ مضغوط (gzip)

### يدوي
```bash
cd ~/njadder
bash backup.sh
```

### استعادة من نسخة احتياطية
```bash
# فك الضغط
gunzip -k ~/njadder-backups/db/njadder-YYYYMMDD-HHMMSS.sql.gz

# تنفيذ الـ SQL (يحتاج psql CLI أو تنفيذ يدوي عبر Neon dashboard)
# أو استخدام node script يحول الـ INSERTs
```

---

## المراقبة

### Health Check Endpoint
```bash
curl https://njadder-app.tech/api/health
```

**Response**:
```json
{
  "ok": true,
  "status": "healthy",
  "version": "7.0.0",
  "checks": {
    "database": { "ok": true, "latency_ms": 12 },
    "env": { "ok": true, "node_env": "production" },
    "process": { "ok": true, "uptime_seconds": 3600, "memory_mb": 145 },
    "counts": { "ok": true, "users": 5, "telegram_accounts": 12 }
  }
}
```

### المراقبة التلقائية (cron)
كل 5 دقائق يفحص cron:
- لو `/login` لا يستجيب → `pm2 restart njadder` تلقائياً
- لو `/api/health` يرجع `degraded` → ينبه في logs

### Logs
- **PM2**: `/tmp/njadder-out.log` + `/tmp/njadder-error.log`
- **Builds**: `/tmp/njadder-build-*.log`
- **Backups**: `/tmp/njadder-backup.log`
- **Health**: `/tmp/njadder-health.log`

---

## الأمان

### ✅ ما هو مفعّل
- **JWT session cookies** (httpOnly + sameSite:lax + secure في production)
- **Bcrypt** password hashing (10 rounds)
- **SQL injection protection** (postgres.js tagged templates)
- **XSS protection** (لا يوجد dangerouslySetInnerHTML)
- **Rate limiting**:
  - `/api/auth/login`: 10 محاولات/دقيقة لكل IP
  - `/api/auth/register`: 10/دقيقة لكل IP
  - `/api/execute`: 5/دقيقة لكل مستخدم
- **Developer approval system** — لا يدخل أحد بدون موافقتك
- **Server-side authorization** على كل APIs الحساسة

### ⚠️ يجب تعيينه يدوياً
- `JWT_SECRET` في `.env` (96 hex chars — `openssl rand -hex 48`)
- `TELEGRAM_API_ID` و `TELEGRAM_API_HASH` من https://my.telegram.org (لو تريد API خاص بك)
- **Firewall**: `ufw allow 22,80,443/tcp`

### 🔒 جدول الحسابات
| المستخدم | الحالة | الصلاحيات |
|---|---|---|
| أول مستخدم (أنت) | `admin` + `approved` | كل شيء + لوحة /admin |
| مستخدمون جدد | `pending` | لا شيء حتى تُوافق |
| موافق عليهم | `approved` | يستخدم الأداة حسب خطتهم |
| مرفوضون | `rejected` | يرون صفحة "تم رفض حسابك" |

---

## استكشاف الأخطاء

### المشكلة: الموقع لا يفتح
```bash
# 1) فحص PM2
pm2 status

# 2) فحص logs
pm2 logs njadder --lines 50

# 3) فحص Nginx
sudo nginx -t
sudo systemctl status nginx

# 4) فحص Health
curl http://localhost:3000/api/health
curl https://njadder-app.tech/api/health
```

### المشكلة: "Only StringSession and StoreSessions are supported"
هذا الخطأ حُلّ نهائياً — تأكد أن `next.config.mjs` **لا يحتوي** على `"telegram"` في `serverExternalPackages`. لو ظهر، نفّذ:
```bash
cd ~/njadder && rm -rf .next && npx next build && pm2 restart njadder
```

### المشكلة: "حسابك بانتظار موافقة المطور"
كل المستخدمين الجدد يبدؤون كـ `pending`. لو تريد تثبيت كل المستخدمين الحاليين كـ approved:
```bash
cd ~/njadder
node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'prefer', prepare: false });
(async () => {
  const r = await sql\`UPDATE users SET status = 'approved' WHERE status IS NULL OR status = '' OR status = 'pending'\`;
  console.log('Approved:', r.count);
  await sql.end();
})();
"
```

### المشكلة: Build يفشل بـ "JavaScript heap out of memory"
```bash
NODE_OPTIONS="--max-old-space-size=4096" npx next build
```

### المشكلة: قاعدة البيانات لا تتصل
```bash
# تحقق من DATABASE_URL في .env
cat .env | grep DATABASE_URL

# اختبر الاتصال
node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'prefer' });
sql\`SELECT NOW()\`.then(r => { console.log('OK:', r); return sql.end(); }).catch(e => console.error('FAIL:', e));
"
```

---

## 📞 الدعم

- **Repo**: https://github.com/mnew8260-lgtm/njadder
- **Domain**: https://njadder-app.tech
- **Health**: https://njadder-app.tech/api/health

---

## 📜 License

Private — All rights reserved.
