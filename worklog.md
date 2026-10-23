---
Task ID: 1
Agent: main (Z.ai)
Task: إضافة ميزة استيراد جلسة تيليجرام من ملف (رفع من ذاكرة الجهاز) في صفحة /accounts

Work Log:
- قرأت البنية الحالية للمشروع: /home/z/my-project/src/{lib,app}
- قرأت src/lib/telegram.ts و src/app/api/accounts/route.ts و src/app/accounts/page.tsx
- أضفت دالة importSession(sessionString, apiId?, apiHash?) في src/lib/telegram.ts:
  · تنشئ TelegramClient من الجلسة
  · تتصل وتتحقق من isUserAuthorized()
  · تستدعي getMe() لجلب بيانات الحساب (id, firstName, lastName, username, phone)
  · تُعيد sessionString المعاد حفظها + بيانات المستخدم
- أضفت action="import_session" في /api/accounts (POST):
  · يقبل { action, session, phone?, apiId?, apiHash? }
  · يستدعي importSession
  · عند النجاح يخزن في telegram_accounts (مع ON CONFLICT update)
- أعادت كتابة src/app/accounts/page.tsx بالكامل لإضافة:
  · تبويبين: "📱 رقم الهاتف" (الطريقة القديمة) و "📁 استيراد من ملف" (الجديدة)
  · منطقة drag & drop + click لرفع ملفات .json / .txt / .session
  · parser ذكي يقرأ من:
    - JSON: {session, phone, api_id, api_hash}
    - TXT: نص خام | JSON | أسطر key=value
    - .session: GramJS StringSession (نص فقط — Telethon SQLite ثنائي غير مدعوم)
  · textarea للصق الجلسة يدوياً (يُملأ تلقائياً من الملف)
  · حقول اختيارية: phone / apiId / apiHash
  · زر "📥 استيراد الجلسة" يستدعي /api/accounts بـ action=import_session
  · عرض رسالة نجاح تحتوي على firstName/lastName/username/phone
- أصلحت خطأ TypeScript في verify_2fa (نوع user بدون phone) باستخدام cast إلى any
- نجح next build بالكامل (8 صفحات، 6 APIs، صفر أخطاء)

Stage Summary:
- ✅ الميزة تعمل: المستخدم يمكنه الآن:
  1. رفع ملف .json/.txt/.session يحتوي على StringSession من جهازه (الذاكرة)
  2. أو لصق الجلسة يدوياً في textarea
  3. النظام يتحقق من الجلسة، يجلب بيانات الحساب، ويخزنه في DB
- الملفات المعدّلة:
  · /home/z/my-project/src/lib/telegram.ts (+39 سطر: importSession)
  · /home/z/my-project/src/app/api/accounts/route.ts (+17 سطر: action=import_session + إصلاح cast)
  · /home/z/my-project/src/app/accounts/page.tsx (إعادة كتابة كاملة + تبويبات + رفع ملف)
- لا توجد تغييرات على DB schema (الحقول الحالية كافية)
- الثيم الذهبي محفوظ، التصميم طبقي، responsive (mobile bottom nav)

---
Task ID: 2
Agent: main (Z.ai)
Task: إضافة ميزة القائمة السوداء (Blacklist) الكاملة في NJADDER PRO

Work Log:
- فحصت بنية المشروع: لا يوجد أي reference سابق لـ blacklist
- أضفت جدول blacklist في src/lib/db.ts (مع ensureSchema + index):
  · id, owner_id, telegram_id, reason, added_by, full_name, username, created_at
  · UNIQUE(owner_id, telegram_id) — يمنع التكرار
- أضفت BlacklistService في src/lib/db.ts مع 6 دوال:
  · list(userId) — قائمة كل المحظورين
  · idSet(userId) — Set<string> للاستخدام السريع أثناء الفلترة
  · add(userId, telegramId, opts) — إضافة واحدة
  · addBulk(userId, text, reason) — إضافة جماعية مع parser ذكي يدعم صيغ:
    "12345" / "12345,الاسم" / "12345;@username" / CSV "id","name"
  · remove(userId, id) — حذف واحد
  · clear(userId) — حذف الكل
  · count(userId) — عدّ العناصر
- أنشأت src/app/api/blacklist/route.ts (GET/POST/DELETE):
  · GET: قائمة + count
  · POST: 3 actions (add / bulk / clear)
  · DELETE: حذف عنصر واحد بالـ id
- أنشأت src/app/blacklist/page.tsx (صفحة كاملة بثيم ذهبي):
  · بطاقة إضافة واحدة (4 حقول: tid, reason, fullName, username)
  · بطاقة إضافة جماعية قابلة للطي (textarea + رفع ملف .txt/.csv)
  · قائمة المحظورين مع بحث حي + scroll
  · زر تصدير CSV
  · زر حذف الكل (مع تأكيد)
  · شريط تنقل سفلي للموبايل (5 عناصر)
- أضفت رابط 🚫 في:
  · header الرئيسية (/) — أيقونة بجانب 📱
  · mobile bottom nav في الرئيسية — عنصر "سوداء" جديد
  · mobile bottom nav في /accounts — عنصر "سوداء" جديد
- ربطت القائمة السوداء بأوامر الإضافة في src/app/api/execute/route.ts:
  · في cmd.category === "adders": تحميل blacklistSet قبل البدء، فلترة users قبل الإضافة، طباعة عدد المتخطّين
  · في cmd.key === "contactadder": نفس الفلترة على قائمة جهات الاتصال
- البناء نجح بالكامل (next build) — صفر أخطاء TypeScript
- أعدت تشغيل الخادم: /blacklist → 200, /api/blacklist → 401 (صحيح)

Stage Summary:
- ✅ ميزة القائمة السوداء كاملة وتعمل:
  1. المستخدم يضيف معرّفات (واحدة أو جماعية من ملف) في /blacklist
  2. النظام يتخطّى تلقائياً أي معرّف محظور عند تنفيذ أوامر الإضافة (adders + contactadder)
  3. يمكن البحث، التصدير CSV، الحذف الفردي/الجماعي
- الملفات المعدّلة:
  · src/lib/db.ts (+95 سطر: جدول + BlacklistService)
  · src/app/api/blacklist/route.ts (ملف جديد، 70 سطر)
  · src/app/blacklist/page.tsx (ملف جديد، 245 سطر)
  · src/app/page.tsx (إضافة 🚫 في header + bottom nav)
  · src/app/accounts/page.tsx (إضافة 🚫 في bottom nav)
  · src/app/api/execute/route.ts (فلترتا blacklist في adders + contactadder)
- الثيم الذهبي محفوظ، التصميم طبقي، responsive بالكامل
