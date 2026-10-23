# 🌐 NJADDER v6.2

> **Premium Telegram Tool — Web Interface**
> محوّل من سكربت بايثون `Njadder.py` إلى تطبيق ويب Next.js احترافي يعمل على VPS.

---

## ✨ المميزات

### 🎯 13 قائمة كاملة
| القائمة | الوظائف |
|---------|---------|
| **Accounts** | إدارة، فحص (Heartbeat)، تفعيل، حذف |
| **Scrapers** | استخراج أعضاء، مجموعات، قنوات |
| **Filters** | فلترة حسب: آخر ظهور، نشاط، نوع الحساب |
| **Adders** | إضافة أعضاء، Via Contact (3 خطوات) |
| **Ramex** | أدوات رامكس المتقدمة |
| **Nearby** | استخراج الأعضاء القريبين جغرافياً |
| **Messaging** | TG Sender (text / forward / copy) |
| **Reports** | تقارير شاملة للنشاط |
| **Account Tools** | 2FA، Cloner، Anon Chat |
| **Group Tools** | Chat Clone، إدارة المجموعات |
| **Engagement** | تفاعل تلقائي (reactions, views) |
| **Privacy** | Random Username، Remove Limit (SpamBot) |
| **Utilities** | أدوات مساعدة متنوعة |

### 🔥 مميزات متقدمة
- ✅ **تعدد الحسابات** في كل الصفحات الرئيسية
- ✅ **نظام البروكسي** + توزيع تلقائي (Round-Robin)
- ✅ **فحص الحسابات** (Heartbeat) الدوري
- ✅ **نظام Fatigue** + Resume + Scrape Shield
- ✅ **API Rotation** + **Device Rotation** (Sequential)
- ✅ **Via Contact** — 3 خطوات (إضافة → قروب → حذف)
- ✅ **إزالة كل قيود الاشتراك** (غير محدود)
- ✅ **Language Switcher** (عربي / English)
- ✅ **Group Clone** + **TG Sender** (text/forward/copy)
- ✅ **Privacy**: Random Username + Remove Limit

---

## 🛠️ Tech Stack

| الطبقة | التقنية |
|--------|---------|
| **Frontend** | Next.js 14 (App Router) + React + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Database** | Neon Postgres (AWS) |
| **Runtime** | Node.js 20 + PM2 |
| **Reverse Proxy** | Nginx + HTTPS (Let's Encrypt) |
| **Hosting** | Hostinger KVM VPS |

---

## 🚀 التشغيل المحلي

```bash
# 1. استنساخ المستودع
git clone https://github.com/mnew8260-lgtm/njadder.git
cd njadder

# 2. تثبيت الحزم
npm install

# 3. إعداد متغيرات البيئة
cp .env.example .env.local
# عدّل .env.local وضيف:
# - DATABASE_URL (Neon Postgres)
# - TELEGRAM_API_ID
# - TELEGRAM_API_HASH
# - NEXTAUTH_SECRET

# 4. تشغيل وضع التطوير
npm run dev

# 5. افتح المتصفح
# http://localhost:3000
```

---

## 🌐 النشر على VPS

### المتطلبات
- VPS بـ 2+ CPU و 4+ GB RAM (يُفضّل)
- Node.js 20+
- Nginx
- PM2
- شهادة SSL (Let's Encrypt)

### خطوات النشر

```bash
# 1. استنساخ على الـ VPS
cd /var/www
git clone https://github.com/mnew8260-lgtm/njadder.git
cd njadder

# 2. تثبيت الحزم
npm ci --production=false

# 3. بناء المشروع (مهم: أضف swap file لو VPS صغير)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

npm run build

# 4. تشغيل بـ PM2
pm2 start npm --name "njadder" -- start
pm2 save
pm2 startup

# 5. إعداد Nginx
sudo nano /etc/nginx/sites-available/njadder
# أضف:
# server {
#     listen 80;
#     server_name njadder-app.tech www.njadder-app.tech;
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }

sudo ln -s /etc/nginx/sites-available/njadder /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. شهادة SSL
sudo certbot --nginx -d njadder-app.tech -d www.njadder-app.tech
```

---

## 📁 بنية المشروع

```
njadder/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (dashboard)/     # الصفحات الرئيسية
│   │   ├── api/             # API Routes
│   │   │   ├── account/     # 2FA, cloner, anon chat
│   │   │   ├── add/         # add members (multi-account)
│   │   │   ├── message/     # tg_sender
│   │   │   ├── group/       # clone
│   │   │   ├── privacy/     # remove_limit, random_username
│   │   │   ├── scrape/      # multi
│   │   │   ├── fatigue/     # fatigue management
│   │   │   └── accounts/    # account CRUD + heartbeat
│   │   └── layout.tsx
│   ├── components/          # مكونات React
│   │   ├── ui/              # shadcn/ui primitives
│   │   └── ...
│   ├── lib/                 # أدوات مساعدة
│   │   ├── db/              # Prisma + queries (sql.unsafe)
│   │   ├── services/        # FatigueService, ProxyService, ...
│   │   └── telegram/        # Telegram client
│   ├── hooks/               # React hooks
│   └── types/               # TypeScript types
├── public/                  # ملفات ثابتة
├── scripts/                 # سكربتات صيانة
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🔐 متغيرات البيئة

```env
# Database
DATABASE_URL=postgres://user:pass@host/db?sslmode=require

# Telegram
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Auth
NEXTAUTH_SECRET=your_random_64_char_secret
NEXTAUTH_URL=https://njadder-app.tech

# Optional
PROXY_POOL_URL=https://your-proxy-pool.com/api
```

---

## 🔄 التحديثات الأخيرة

| التاريخ | الإصدار | التغييرات |
|---------|---------|-----------|
| 2025-10-23 | v6.2.1 | 🧹 تنظيف المستودع: إزالة api-server/, tool-results/, upload/, skills/ من git tracking |
| 2025-10-22 | v6.2 | إصلاح `FatigueService.filterActive` (استبدال `ANY()` بـ `IN`) |
| 2025-10-22 | v6.1 | إصلاح `malformed array literal` في 5 routes |
| 2025-10-21 | v6.0 | Language switcher (عربي/English) |
| 2025-10-21 | v5.9 | تفعيل Account Tools + Privacy + Group Tools + Messaging |
| 2025-10-20 | v5.8 | Multi-account selector + 'use N accounts' mode |
| 2025-10-20 | v5.7 | Per-account proxy system |

---

## 🗄️ ملاحظات تقنية مهمة

### استبدال `ANY()` بـ `IN` parameterized
كل الـ queries في Prisma التي كانت تستخدم `ANY()` مع `sql.unsafe` تم استبدالها بـ:
```typescript
sql.unsafe(`WHERE account_id IN (${placeholders})`, ids)
```
السبب: `ANY()` يسبب خطأ `malformed array literal` في Postgres عند تمرير array فارغ أو NULL.

### نظام Fatigue
- `FatigueService.filterActive()` يفلتر الحسابات النشطة فقط
- يتعامل مع 3 حالات: tired, sleeping, active
- يراعي `cooldown_minutes` و `max_actions_per_day`

### نظام البروكسي
- بروكسي لكل حساب (per-account)
- Round-Robin distribution
- Fallback للبروكسي الافتراضي لو مفيش

---

## ⚠️ تنبيه قانوني

هذه الأداة مخصصة للاستخدام التعليمي والإداري الشرعي لمجموعاتك الخاصة. المستخدم مسؤول وحده عن أي استخدام مخالف لشروط خدمة تيليجرام أو قوانين بلده.

---

## 👤 المالك

**GitHub**: [@mnew8260-lgtm](https://github.com/mnew8260-lgtm)
**Domain**: [njadder-app.tech](https://njadder-app.tech)

---

## 📜 الترخيص

خاص — جميع الحقوق محفوظة © 2025
