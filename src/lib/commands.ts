// Auto-generated from golden_telegram_v2/core/commands_data.py
// 118 commands in 14 categories

export interface CommandField {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  required: boolean;
  default?: any;
  helper?: string;
  options?: { value: string; label: string }[];
}

export interface Command {
  id: number;
  key: string;
  nameAr: string;
  nameEn: string;
  category: string;
  icon: string;
  description: string;
  fields: CommandField[];
  pyFn: string;
  risk: string;
}

export interface Category {
  key: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  accent: string;
  range: string;
  order: number;
}

export const CATEGORIES: Category[] = [
  {
    "key": "login",
    "nameAr": "الحسابات وتسجيل الدخول",
    "nameEn": "Account & Login",
    "icon": "UserRoundCog",
    "accent": "#f59e0b",
    "range": "1-22",
    "order": 1
  },
  {
    "key": "scrapers",
    "nameAr": "أدوات الاستخراج",
    "nameEn": "Scrapers",
    "icon": "Users",
    "accent": "#fb923c",
    "range": "23-29",
    "order": 2
  },
  {
    "key": "filters",
    "nameAr": "الفلاتر",
    "nameEn": "Filters",
    "icon": "Filter",
    "accent": "#eab308",
    "range": "30-40",
    "order": 3
  },
  {
    "key": "adders",
    "nameAr": "إضافة الأعضاء",
    "nameEn": "Member Adders",
    "icon": "UserPlus",
    "accent": "#84cc16",
    "range": "41-58",
    "order": 4
  },
  {
    "key": "contacts",
    "nameAr": "عمليات جهات الاتصال",
    "nameEn": "Contact Operations",
    "icon": "Contact",
    "accent": "#10b981",
    "range": "59-62",
    "order": 5
  },
  {
    "key": "messaging",
    "nameAr": "الرسائل والإرسال",
    "nameEn": "Messaging & Senders",
    "icon": "Send",
    "accent": "#14b8a6",
    "range": "63-80",
    "order": 6
  },
  {
    "key": "groups",
    "nameAr": "عمليات المجموعات والقنوات",
    "nameEn": "Group/Channel Ops",
    "icon": "UsersRound",
    "accent": "#06b6d4",
    "range": "81-84",
    "order": 7
  },
  {
    "key": "increasers",
    "nameAr": "أدوات الزيادة",
    "nameEn": "Increasers",
    "icon": "TrendingUp",
    "accent": "#0ea5e9",
    "range": "85-88",
    "order": 8
  },
  {
    "key": "reports",
    "nameAr": "البلاغات",
    "nameEn": "Reports",
    "icon": "Flag",
    "accent": "#f43f5e",
    "range": "89-101",
    "order": 9
  },
  {
    "key": "nearby",
    "nameAr": "الإضافة حسب الموقع (دول)",
    "nameEn": "Nearby Adders",
    "icon": "MapPin",
    "accent": "#ef4444",
    "range": "102-123",
    "order": 10
  },
  {
    "key": "vcf",
    "nameAr": "عمليات VCF",
    "nameEn": "VCF Operations",
    "icon": "FileText",
    "accent": "#ec4899",
    "range": "124-125",
    "order": 11
  },
  {
    "key": "special",
    "nameAr": "خاصة",
    "nameEn": "Special",
    "icon": "Sparkles",
    "accent": "#d946ef",
    "range": "126",
    "order": 12
  },
  {
    "key": "golden",
    "nameAr": "النسخة الذهبية v6.0",
    "nameEn": "Golden Build v6.0",
    "icon": "Crown",
    "accent": "#f59e0b",
    "range": "127-132",
    "order": 13
  },
  {
    "key": "wrappers",
    "nameAr": "الأغلفة والأمان",
    "nameEn": "Wrappers & Security",
    "icon": "ShieldCheck",
    "accent": "#10b981",
    "range": "133-138",
    "order": 14
  }
];

export const COMMANDS: Command[] = [
  {
    "id": 1,
    "key": "login",
    "nameAr": "تسجيل دخول جديد",
    "nameEn": "Login",
    "category": "login",
    "icon": "LogIn",
    "description": "إضافة حساب تيليجرام جديد عبر إدخال رقم الهاتف وكود التحقق.",
    "fields": [],
    "pyFn": "login()",
    "risk": "low"
  },
  {
    "id": 2,
    "key": "loginbycsv",
    "nameAr": "تسجيل دخول بملف CSV",
    "nameEn": "Login by CSV",
    "category": "login",
    "icon": "FileSpreadsheet",
    "description": "تسجيل دخول جماعي لأرقام متعددة من ملف phone.csv.",
    "fields": [
      {
        "name": "phonesList",
        "label": "قائمة الأرقام (رقم في كل سطر)",
        "type": "textarea",
        "placeholder": "phone.csv",
        "required": true
      },
      {
        "name": "delayBetween",
        "label": "التأخير بين الحسابات",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "loginbycsv()",
    "risk": "low"
  },
  {
    "id": 3,
    "key": "logintypeone",
    "nameAr": "تسجيل دخول نوع 1 (API Spoof)",
    "nameEn": "Login Type 1",
    "category": "login",
    "icon": "Fingerprint",
    "description": "تسجيل دخول مع تمويه بصمة الـ API لتفادي الكشف.",
    "fields": [],
    "pyFn": "logintypeone()",
    "risk": "medium"
  },
  {
    "id": 4,
    "key": "logintypetwo",
    "nameAr": "تسجيل دخول نوع 2 (CSV Multi-API)",
    "nameEn": "Login Type 2",
    "category": "login",
    "icon": "Layers",
    "description": "تسجيل دخول جماعي مع ملف API متعدد لكل حساب.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الأرقام",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "apiCsvPath",
        "label": "ملف APIs",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "logintypetwo()",
    "risk": "medium"
  },
  {
    "id": 5,
    "key": "twostepverification",
    "nameAr": "تفعيل التحقق بخطوتين",
    "nameEn": "2-Step Verification",
    "category": "login",
    "icon": "ShieldCheck",
    "description": "تفعيل التحقق بخطوتين (2FA) لحساب أو عدة حسابات.",
    "fields": [
      {
        "name": "password",
        "label": "كلمة مرور الاسترداد",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "twostepverification()",
    "risk": "low"
  },
  {
    "id": 6,
    "key": "accountinfogetter",
    "nameAr": "فاحص معلومات الحساب",
    "nameEn": "Account Info",
    "category": "login",
    "icon": "Info",
    "description": "استخراج وعرض معلومات الحساب: الاسم، اليوزر، الـ ID...",
    "fields": [],
    "pyFn": "accountinfogetter()",
    "risk": "low"
  },
  {
    "id": 7,
    "key": "autoidcloner",
    "nameAr": "مستنسخ الحسابات (Auto ID)",
    "nameEn": "Account Cloner",
    "category": "login",
    "icon": "Copy",
    "description": "استنساخ بيانات حساب تيليجرام آخر تلقائيًا.",
    "fields": [
      {
        "name": "targetId",
        "label": "ID الحساب المستهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "autoidcloner()",
    "risk": "medium"
  },
  {
    "id": 8,
    "key": "changeraccount",
    "nameAr": "تغيير الاسم والبايو",
    "nameEn": "Change Name & Bio",
    "category": "login",
    "icon": "UserCog",
    "description": "تعديل الاسم الأول والأخير والنبذة (Bio).",
    "fields": [
      {
        "name": "firstName",
        "label": "الاسم الأول",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "changeraccount()",
    "risk": "low"
  },
  {
    "id": 9,
    "key": "changerusername",
    "nameAr": "تعيين اليوزر",
    "nameEn": "Set Username",
    "category": "login",
    "icon": "AtSign",
    "description": "تغيير اسم المستخدم (Username) للحساب.",
    "fields": [
      {
        "name": "username",
        "label": "اليوزر الجديد",
        "type": "text",
        "placeholder": "myname",
        "required": true
      }
    ],
    "pyFn": "changerusername()",
    "risk": "low"
  },
  {
    "id": 10,
    "key": "setprofilepic",
    "nameAr": "تعيين صورة الحساب",
    "nameEn": "Set Profile Pic",
    "category": "login",
    "icon": "ImagePlus",
    "description": "رفع صورة بروفايل للحساب من ملف محلي.",
    "fields": [
      {
        "name": "imagePath",
        "label": "مسار الصورة",
        "type": "textarea",
        "placeholder": "photo.jpg",
        "required": true
      }
    ],
    "pyFn": "setprofilepic()",
    "risk": "low"
  },
  {
    "id": 11,
    "key": "removeprofilepic",
    "nameAr": "حذف صورة الحساب",
    "nameEn": "Remove Profile Pic",
    "category": "login",
    "icon": "ImageMinus",
    "description": "إزالة صورة البروفايل الحالية.",
    "fields": [],
    "pyFn": "removeprofilepic()",
    "risk": "low"
  },
  {
    "id": 12,
    "key": "hidelastseen",
    "nameAr": "إخفاء آخر ظهور",
    "nameEn": "Hide Last Seen",
    "category": "login",
    "icon": "EyeOff",
    "description": "تعيين خصوصية آخر ظهور إلى 'لا أحد'.",
    "fields": [],
    "pyFn": "hidelastseen()",
    "risk": "low"
  },
  {
    "id": 13,
    "key": "hidenumbersp",
    "nameAr": "إخفاء رقم الهاتف",
    "nameEn": "Hide Phone",
    "category": "login",
    "icon": "PhoneOff",
    "description": "تعيين خصوصية رقم الهاتف إلى 'لا أحد'.",
    "fields": [],
    "pyFn": "hidenumbersp()",
    "risk": "low"
  },
  {
    "id": 14,
    "key": "hidenmbandphone",
    "nameAr": "إخفاء الظهور والرقم",
    "nameEn": "Hide Last Seen & Phone",
    "category": "login",
    "icon": "EyeOff",
    "description": "إخفاء آخر ظهور ورقم الهاتف معًا.",
    "fields": [],
    "pyFn": "hidenmbandphone()",
    "risk": "low"
  },
  {
    "id": 15,
    "key": "randomusernameh",
    "nameAr": "يوزر عشوائي",
    "nameEn": "Random Username",
    "category": "login",
    "icon": "Shuffle",
    "description": "توليد وتعيين اسم مستخدم عشوائي تلقائيًا.",
    "fields": [
      {
        "name": "count",
        "label": "عدد المحاولات",
        "type": "number",
        "placeholder": "5",
        "required": true,
        "default": 5
      }
    ],
    "pyFn": "randomusernameh()",
    "risk": "low"
  },
  {
    "id": 16,
    "key": "csvblankremover",
    "nameAr": "إزالة الأسطر الفارغة",
    "nameEn": "CSV Line Remover",
    "category": "login",
    "icon": "Eraser",
    "description": "تنظيف ملف CSV من الأسطر الفارغة والزائدة.",
    "fields": [
      {
        "name": "phonesList",
        "label": "مسار الملف",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "csvblankremover()",
    "risk": "low"
  },
  {
    "id": 17,
    "key": "banfilter",
    "nameAr": "فلتر الحسابات المحظورة",
    "nameEn": "Filter Banned Accounts",
    "category": "login",
    "icon": "Ban",
    "description": "فحص وفصل الحسابات المحظورة في ملف phone.csv.",
    "fields": [
      {
        "name": "phonesList",
        "label": "مسار ملف الأرقام",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "BanFilter()",
    "risk": "low"
  },
  {
    "id": 18,
    "key": "specificaccremove",
    "nameAr": "حذف حسابات محددة",
    "nameEn": "Remove Specific Accounts",
    "category": "login",
    "icon": "Trash2",
    "description": "إزالة حسابات معينة من قائمة phone.csv.",
    "fields": [
      {
        "name": "phonesList",
        "label": "مسار الملف",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "specificaccremove()",
    "risk": "low"
  },
  {
    "id": 19,
    "key": "permanentlimitremover",
    "nameAr": "إزالة الحظر الدائم v1",
    "nameEn": "Limit Remover v1",
    "category": "login",
    "icon": "Unlock",
    "description": "محاولة رفع قيود الحظر الدائم (نسخة 1).",
    "fields": [],
    "pyFn": "permanentlimitremover()",
    "risk": "high"
  },
  {
    "id": 20,
    "key": "permanentlimitremover2",
    "nameAr": "إزالة الحظر الدائم v2",
    "nameEn": "Limit Remover v2",
    "category": "login",
    "icon": "Unlock",
    "description": "إجراء بديل لرفع قيود الحظر (نسخة 2).",
    "fields": [],
    "pyFn": "permanentlimitremover2()",
    "risk": "high"
  },
  {
    "id": 21,
    "key": "otpviewer",
    "nameAr": "عارض OTP",
    "nameEn": "OTP Viewer",
    "category": "login",
    "icon": "KeyRound",
    "description": "استعراض أكواد OTP المستلمة على الحساب.",
    "fields": [],
    "pyFn": "otpviewer()",
    "risk": "low"
  },
  {
    "id": 22,
    "key": "limicheckandrem",
    "nameAr": "فاحص/رافع القيود v3",
    "nameEn": "Limit Checker v3",
    "category": "login",
    "icon": "ShieldCheck",
    "description": "فحص حالة القيود ومحاولة إزالتها (نسخة 3).",
    "fields": [],
    "pyFn": "limicheckandrem()",
    "risk": "medium"
  },
  {
    "id": 23,
    "key": "scraper",
    "nameAr": "استخراج أعضاء عام",
    "nameEn": "Public Scraper",
    "category": "scrapers",
    "icon": "Users",
    "description": "استخراج قائمة أعضاء من مجموعة عامة وحفظها في CSV.",
    "fields": [
      {
        "name": "outputFile",
        "label": "ملف الإخراج",
        "type": "text",
        "placeholder": "scraped.csv",
        "required": false,
        "default": "\"scraped.csv\""
      }
    ],
    "pyFn": "scraper()",
    "risk": "low"
  },
  {
    "id": 24,
    "key": "pvtscraper",
    "nameAr": "استخراج أعضاء خاص",
    "nameEn": "Private Scraper",
    "category": "scrapers",
    "icon": "Users",
    "description": "استخراج قائمة أعضاء من مجموعة خاصة عبر رابط الدعوة.",
    "fields": [
      {
        "name": "targetGroup",
        "label": "رابط المجموعة الخاصة",
        "type": "text",
        "placeholder": "https://t.me/+abc",
        "required": true
      }
    ],
    "pyFn": "pvtscraper()",
    "risk": "low"
  },
  {
    "id": 25,
    "key": "hiddenscraper",
    "nameAr": "استخراج الأعضاء المخفيين",
    "nameEn": "Hidden Members Scraper",
    "category": "scrapers",
    "icon": "UserSearch",
    "description": "استخراج الأعضاء الذين أخفوا ظهورهم في المجموعات العامة.",
    "fields": [],
    "pyFn": "hiddenscraper()",
    "risk": "medium"
  },
  {
    "id": 26,
    "key": "pvthiddenscraper",
    "nameAr": "استخراج مخفيين خاص",
    "nameEn": "Private Hidden Scraper",
    "category": "scrapers",
    "icon": "UserSearch",
    "description": "استخراج الأعضاء المخفيين من مجموعة خاصة.",
    "fields": [
      {
        "name": "targetGroup",
        "label": "رابط المجموعة الخاصة",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "pvthiddenscraper()",
    "risk": "medium"
  },
  {
    "id": 27,
    "key": "multi_ccraper",
    "nameAr": "استخراج متعدد",
    "nameEn": "Multi-CScraper",
    "category": "scrapers",
    "icon": "Layers",
    "description": "استخراج أعضاء من عدة مجموعوعات في دورة واحدة.",
    "fields": [
      {
        "name": "groups",
        "label": "قائمة المجموعات",
        "type": "textarea",
        "placeholder": "",
        "required": true,
        "helper": "سطر لكل رابط"
      }
    ],
    "pyFn": "multi_ccraper()",
    "risk": "low"
  },
  {
    "id": 28,
    "key": "fullscraper",
    "nameAr": "استخراج شامل",
    "nameEn": "Full Scraper",
    "category": "scrapers",
    "icon": "ScanLine",
    "description": "استخراج كامل: أعضاء، إدمنين، بوتات، معلومات تفصيلية.",
    "fields": [],
    "pyFn": "fullscraper()",
    "risk": "low"
  },
  {
    "id": 29,
    "key": "premiumscraper",
    "nameAr": "استخراج الأعضاء المميزين",
    "nameEn": "Premium Members Scraper",
    "category": "scrapers",
    "icon": "Crown",
    "description": "استخراج الأعضاء المشتركين في تيليجرام بريميوم فقط.",
    "fields": [],
    "pyFn": "premiumscraper()",
    "risk": "low"
  },
  {
    "id": 30,
    "key": "dailyfilter",
    "nameAr": "فلتر يومي",
    "nameEn": "Daily Filter",
    "category": "filters",
    "icon": "CalendarDays",
    "description": "تصفية الأعضاء النشطين خلال آخر 24 ساعة.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "dailyfilter()",
    "risk": "low"
  },
  {
    "id": 31,
    "key": "pvtdailyfilter",
    "nameAr": "فلتر يومي خاص",
    "nameEn": "Private Daily Filter",
    "category": "filters",
    "icon": "CalendarDays",
    "description": "فلتر النشاط اليومي للمجموعات الخاصة.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "pvtdailyfilter()",
    "risk": "low"
  },
  {
    "id": 32,
    "key": "weeklyfilter",
    "nameAr": "فلتر أسبوعي",
    "nameEn": "Weekly Filter",
    "category": "filters",
    "icon": "CalendarRange",
    "description": "تصفية الأعضاء النشطين خلال آخر 7 أيام.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "weeklyfilter()",
    "risk": "low"
  },
  {
    "id": 33,
    "key": "pvtweeklyfilter",
    "nameAr": "فلتر أسبوعي خاص",
    "nameEn": "Private Weekly Filter",
    "category": "filters",
    "icon": "CalendarRange",
    "description": "فلتر أسبوعي للمجموعات الخاصة.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "pvtweeklyfilter()",
    "risk": "low"
  },
  {
    "id": 34,
    "key": "monthlyfilter",
    "nameAr": "فلتر شهري",
    "nameEn": "Monthly Filter",
    "category": "filters",
    "icon": "Calendar",
    "description": "تصفية الأعضاء النشطين خلال آخر 30 يومًا.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "monthlyfilter()",
    "risk": "low"
  },
  {
    "id": 35,
    "key": "pvtmonthlyfilter",
    "nameAr": "فلتر شهري خاص",
    "nameEn": "Private Monthly Filter",
    "category": "filters",
    "icon": "Calendar",
    "description": "فلتر شهري للمجموعات الخاصة.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "pvtmonthlyfilter()",
    "risk": "low"
  },
  {
    "id": 36,
    "key": "inactivefilter",
    "nameAr": "فلتر غير النشطين",
    "nameEn": "Inactive Filter",
    "category": "filters",
    "icon": "UserX",
    "description": "تصفية الأعضاء غير النشطين خلال آخر شهر.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "inactivefilter()",
    "risk": "low"
  },
  {
    "id": 37,
    "key": "pvtinactivefilter",
    "nameAr": "فلتر غير النشطين خاص",
    "nameEn": "Private Inactive Filter",
    "category": "filters",
    "icon": "UserX",
    "description": "فلتر غير النشطين للمجموعات الخاصة.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "pvtinactivefilter()",
    "risk": "low"
  },
  {
    "id": 38,
    "key": "onlinefilter",
    "nameAr": "فلتر المتصلين",
    "nameEn": "Online Filter",
    "category": "filters",
    "icon": "UserCheck",
    "description": "تصفية الأعضاء المتصلين حاليًا.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "onlinefilter()",
    "risk": "low"
  },
  {
    "id": 39,
    "key": "pvtonlinefilter",
    "nameAr": "فلتر المتصلين خاص",
    "nameEn": "Private Online Filter",
    "category": "filters",
    "icon": "UserCheck",
    "description": "فلتر المتصلين للمجموعات الخاصة.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "pvtonlinefilter()",
    "risk": "low"
  },
  {
    "id": 40,
    "key": "deletealreadyfilter",
    "nameAr": "حذف الموجودين مسبقًا",
    "nameEn": "Delete Already Filter",
    "category": "filters",
    "icon": "FilterX",
    "description": "إزالة الأعضاء الموجودين مسبقًا في مجموعة الهدف من قائمة المصدر.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "targetGroup",
        "label": "رابط مجموعة الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "deletealreadyfilter()",
    "risk": "low"
  },
  {
    "id": 41,
    "key": "directadder",
    "nameAr": "إضافة مباشرة",
    "nameEn": "Direct Adder",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة أعضاء مباشرة من ملف CSV إلى مجموعة مستهدفة.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "directadder()",
    "risk": "high"
  },
  {
    "id": 42,
    "key": "adder",
    "nameAr": "إضافة عامة",
    "nameEn": "Public Adder",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة أعضاء من مجموعة عامة إلى مجموعة أخرى.",
    "fields": [],
    "pyFn": "adder()",
    "risk": "high"
  },
  {
    "id": 43,
    "key": "pvtadder",
    "nameAr": "إضافة خاصة",
    "nameEn": "Private Adder",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة أعضاء من مجموعة خاصة إلى أخرى.",
    "fields": [
      {
        "name": "sourceGroup",
        "label": "رابط المصدر الخاص",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "targetGroup",
        "label": "رابط الهدف الخاص",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "pvtadder()",
    "risk": "high"
  },
  {
    "id": 44,
    "key": "adderrr",
    "nameAr": "إضافة بحساب واحد",
    "nameEn": "Single Account Adder",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة الأعضاء باستخدام حساب واحد فقط.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "adderrr()",
    "risk": "high"
  },
  {
    "id": 45,
    "key": "sunguleadder",
    "nameAr": "إضافة حساب واحد v2",
    "nameEn": "Single Account Adder v2",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة بحساب واحد محدد مع خيارات متقدمة.",
    "fields": [
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "sunguleadder()",
    "risk": "high"
  },
  {
    "id": 46,
    "key": "singlefilteradderrr",
    "nameAr": "إضافة بفلتر واحد",
    "nameEn": "Single Filter Adder",
    "category": "adders",
    "icon": "Filter",
    "description": "إضافة بعد تطبيق فلتر واحد (يومي/أسبوعي/شهري).",
    "fields": [],
    "pyFn": "singlefilteradderrr()",
    "risk": "high"
  },
  {
    "id": 47,
    "key": "filterwalaadder",
    "nameAr": "الإضافة بالفلاتر",
    "nameEn": "Filter-Wala Adder",
    "category": "adders",
    "icon": "Filter",
    "description": "إضافة مع تطبيق فلتر النشاط قبل الإضافة.",
    "fields": [],
    "pyFn": "filterwalaadder()",
    "risk": "high"
  },
  {
    "id": 48,
    "key": "ramexadder",
    "nameAr": "إضافة Ramex",
    "nameEn": "Ramex Adder",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة متقدمة بنظام Ramex (دورات متعددة بحسابات متعددة).",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "ramexadder()",
    "risk": "high"
  },
  {
    "id": 49,
    "key": "hiddenadder",
    "nameAr": "إضافة الأعضاء المخفيين",
    "nameEn": "Hidden Adder",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة الأعضاء المخفيين من مجموعة المصدر.",
    "fields": [],
    "pyFn": "hiddenadder()",
    "risk": "high"
  },
  {
    "id": 50,
    "key": "ramexdaily",
    "nameAr": "Ramex يومي",
    "nameEn": "Ramex Daily",
    "category": "adders",
    "icon": "CalendarDays",
    "description": "إضافة Ramex مع فلتر النشاط اليومي.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "ramexdaily()",
    "risk": "high"
  },
  {
    "id": 51,
    "key": "ramexweekly",
    "nameAr": "Ramex أسبوعي",
    "nameEn": "Ramex Weekly",
    "category": "adders",
    "icon": "CalendarRange",
    "description": "إضافة Ramex مع فلتر النشاط الأسبوعي.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "ramexweekly()",
    "risk": "high"
  },
  {
    "id": 52,
    "key": "ramexmonthly",
    "nameAr": "Ramex شهري",
    "nameEn": "Ramex Monthly",
    "category": "adders",
    "icon": "Calendar",
    "description": "إضافة Ramex مع فلتر النشاط الشهري.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "ramexmonthly()",
    "risk": "high"
  },
  {
    "id": 53,
    "key": "ramexonline",
    "nameAr": "Ramex المتصلين",
    "nameEn": "Ramex Online",
    "category": "adders",
    "icon": "UserCheck",
    "description": "إضافة Ramex للأعضاء المتصلين حاليًا.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "ramexonline()",
    "risk": "high"
  },
  {
    "id": 54,
    "key": "ramexnonactive",
    "nameAr": "Ramex غير النشطين",
    "nameEn": "Ramex Non-Active",
    "category": "adders",
    "icon": "UserX",
    "description": "إضافة Ramex للأعضاء غير النشطين.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "ramexnonactive()",
    "risk": "high"
  },
  {
    "id": 55,
    "key": "maleadderh",
    "nameAr": "إضافة ذكور",
    "nameEn": "Male Adder",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة الأعضاء الذكور فقط (يعتمد على تحليل الاسم).",
    "fields": [],
    "pyFn": "maleadderh()",
    "risk": "medium"
  },
  {
    "id": 56,
    "key": "femaleadderh",
    "nameAr": "إضافة إناث",
    "nameEn": "Female Adder",
    "category": "adders",
    "icon": "UserPlus",
    "description": "إضافة الأعضاء الإناث فقط (يعتمد على تحليل الاسم).",
    "fields": [],
    "pyFn": "femaleadderh()",
    "risk": "medium"
  },
  {
    "id": 57,
    "key": "bulkadder",
    "nameAr": "إضافة جماعية",
    "nameEn": "Bulk Adder",
    "category": "adders",
    "icon": "Users",
    "description": "إضافة جماعية متعددة الحسابات لمجموعة واحدة.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "bulkadder()",
    "risk": "high"
  },
  {
    "id": 58,
    "key": "bulkaddermulti",
    "nameAr": "إضافة متعددة الخيوط",
    "nameEn": "Multi-Thread Bulk Adder",
    "category": "adders",
    "icon": "Users",
    "description": "إضافة جماعية متعددة الخيوط (Threads) لسرعة أعلى.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "inputFile",
        "label": "ملف الأعضاء",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "threads",
        "label": "عدد الخيوط",
        "type": "number",
        "placeholder": "3",
        "required": true,
        "default": 3
      }
    ],
    "pyFn": "bulkaddermulti()",
    "risk": "high"
  },
  {
    "id": 59,
    "key": "contactadder",
    "nameAr": "إضافة جهة اتصال",
    "nameEn": "Contact Adder",
    "category": "contacts",
    "icon": "Contact",
    "description": "إضافة جهة اتصال واحدة برقم هاتف واسم.",
    "fields": [
      {
        "name": "contactPhone",
        "label": "رقم جهة الاتصال",
        "type": "tel",
        "placeholder": "",
        "required": true
      },
      {
        "name": "firstName",
        "label": "الاسم الأول",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "contactadder()",
    "risk": "low"
  },
  {
    "id": 60,
    "key": "contactdeleter",
    "nameAr": "حذف جهة اتصال",
    "nameEn": "Contact Deleter",
    "category": "contacts",
    "icon": "UserMinus",
    "description": "حذف جهة اتصال من قائمة جهات الاتصال.",
    "fields": [
      {
        "name": "contactPhone",
        "label": "رقم جهة الاتصال",
        "type": "tel",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "contactdeleter()",
    "risk": "low"
  },
  {
    "id": 61,
    "key": "addtocontactbyimp",
    "nameAr": "إضافة بالاستيراد",
    "nameEn": "Add by Import",
    "category": "contacts",
    "icon": "FileUp",
    "description": "استيراد جهات اتصال متعددة من ملف CSV.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف جهات الاتصال",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "addtocontactbyimp()",
    "risk": "low"
  },
  {
    "id": 62,
    "key": "addtocontactbygroup",
    "nameAr": "إضافة من مجموعة",
    "nameEn": "Add from Group",
    "category": "contacts",
    "icon": "Users",
    "description": "إضافة أعضاء مجموعة كجهات اتصال في حسابك.",
    "fields": [],
    "pyFn": "addtocontactbygroup()",
    "risk": "medium"
  },
  {
    "id": 63,
    "key": "messagesendergroup",
    "nameAr": "مرسل جماعي متعدد الحسابات",
    "nameEn": "Multi-Acct Group Sender",
    "category": "messaging",
    "icon": "Send",
    "description": "إرسال رسالة إلى مجموعة عبر حسابات متعددة بالتناوب.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "message",
        "label": "نص الرسالة",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "عدد الرسائل",
        "type": "number",
        "placeholder": "50",
        "required": true,
        "default": 50
      },
      {
        "name": "delaySeconds",
        "label": "التأخير (ثانية)",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendergroup()",
    "risk": "medium"
  },
  {
    "id": 64,
    "key": "messagesendergrouppic",
    "nameAr": "مرسل صور متعدد الحسابات",
    "nameEn": "Multi-Acct Pic Sender",
    "category": "messaging",
    "icon": "ImagePlus",
    "description": "إرسال رسالة + صورة إلى مجموعة بعدة حسابات.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "imagePath",
        "label": "مسار الصورة",
        "type": "textarea",
        "placeholder": "pic.jpg",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "عدد الإرساليات",
        "type": "number",
        "placeholder": "50",
        "required": true,
        "default": 50
      },
      {
        "name": "delaySeconds",
        "label": "التأخير (ثانية)",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendergrouppic()",
    "risk": "medium"
  },
  {
    "id": 65,
    "key": "messagesendergrouppicsingle",
    "nameAr": "مرسل صورة لحساب واحد",
    "nameEn": "Single Acct Pic Sender",
    "category": "messaging",
    "icon": "ImagePlus",
    "description": "إرسال رسالة + صورة إلى مجموعة بحساب واحد.",
    "fields": [
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "imagePath",
        "label": "مسار الصورة",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "عدد الإرساليات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      },
      {
        "name": "delaySeconds",
        "label": "التأخير (ثانية)",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendergrouppicsingle()",
    "risk": "low"
  },
  {
    "id": 66,
    "key": "messagesendergroupsingle",
    "nameAr": "مرسل نص لحساب واحد",
    "nameEn": "Single Acct Msg Sender",
    "category": "messaging",
    "icon": "Send",
    "description": "إرسال رسالة نصية فقط إلى مجموعة بحساب واحد.",
    "fields": [
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "عدد الإرساليات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      },
      {
        "name": "delaySeconds",
        "label": "التأخير (ثانية)",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendergroupsingle()",
    "risk": "low"
  },
  {
    "id": 67,
    "key": "messagesendergroupmultimsg",
    "nameAr": "مرسل متعدد الرسائل",
    "nameEn": "Multi-Msg Sender",
    "category": "messaging",
    "icon": "List",
    "description": "إرسال عدة رسائل بالتناوب إلى مجموعة.",
    "fields": [
      {
        "name": "messages",
        "label": "الرسائل (سطر لكل رسالة)",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "عدد الإرساليات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      },
      {
        "name": "delaySeconds",
        "label": "التأخير (ثانية)",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendergroupmultimsg()",
    "risk": "medium"
  },
  {
    "id": 68,
    "key": "messagesendergroupmultimsgpic",
    "nameAr": "مرسل متعدد الرسائل مع صور",
    "nameEn": "Multi-Msg+Pic Sender",
    "category": "messaging",
    "icon": "ListPlus",
    "description": "إرسال عدة رسائل مع صور متعددة إلى مجموعة.",
    "fields": [
      {
        "name": "messages",
        "label": "الرسائل",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "imagesPath",
        "label": "مجلد الصور",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "عدد الإرساليات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      },
      {
        "name": "delaySeconds",
        "label": "التأخير",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendergroupmultimsgpic()",
    "risk": "medium"
  },
  {
    "id": 69,
    "key": "messagesendergroupmultimsgpicmultigroups",
    "nameAr": "مرسل متعدد متعدد المجموعات",
    "nameEn": "Multi-Group Multi-Msg+Pic",
    "category": "messaging",
    "icon": "LayoutGrid",
    "description": "إرسال عدة رسائل وصور إلى عدة مجموعوعات في دورة واحدة.",
    "fields": [
      {
        "name": "groups",
        "label": "قائمة المجموعات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "messages",
        "label": "الرسائل",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "العدد",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      },
      {
        "name": "delaySeconds",
        "label": "التأخير",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendergroupmultimsgpicmultigroups()",
    "risk": "high"
  },
  {
    "id": 70,
    "key": "messagesendergroupmultimsgmultigroups",
    "nameAr": "مرسل نصوص متعدد المجموعات",
    "nameEn": "Multi-Group Multi-Msg",
    "category": "messaging",
    "icon": "LayoutGrid",
    "description": "إرسال عدة رسائل نصية إلى عدة مجموعوعات.",
    "fields": [
      {
        "name": "groups",
        "label": "قائمة المجموعات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "messages",
        "label": "الرسائل",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "العدد",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      },
      {
        "name": "delaySeconds",
        "label": "التأخير",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendergroupmultimsgmultigroups()",
    "risk": "high"
  },
  {
    "id": 71,
    "key": "messagesendermultigroupsinglepic",
    "nameAr": "مرسل صورة متعدد المجموعات",
    "nameEn": "Multi-Group Pic+Msg",
    "category": "messaging",
    "icon": "ImagePlus",
    "description": "إرسال صورة ورسالة واحدة إلى عدة مجموعوعات.",
    "fields": [
      {
        "name": "groups",
        "label": "قائمة المجموعات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "imagePath",
        "label": "مسار الصورة",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "العدد",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      },
      {
        "name": "delaySeconds",
        "label": "التأخير",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendermultigroupsinglepic()",
    "risk": "low"
  },
  {
    "id": 72,
    "key": "messagesendermultigroupsingle",
    "nameAr": "مرسل نص متعدد المجموعات",
    "nameEn": "Multi-Group Only Msg",
    "category": "messaging",
    "icon": "Send",
    "description": "إرسال رسالة نصية واحدة إلى عدة مجموعوعات.",
    "fields": [
      {
        "name": "groups",
        "label": "قائمة المجموعات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "numMessages",
        "label": "العدد",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      },
      {
        "name": "delaySeconds",
        "label": "التأخير",
        "type": "number",
        "placeholder": "10",
        "required": true,
        "default": 10
      }
    ],
    "pyFn": "messagesendermultigroupsingle()",
    "risk": "low"
  },
  {
    "id": 73,
    "key": "forward_to_channels",
    "nameAr": "إعادة توجيه تلقائية",
    "nameEn": "Auto Forwarder",
    "category": "messaging",
    "icon": "Forward",
    "description": "إعادة توجيه رسائل قناة مصدر إلى قناة هدف تلقائيًا.",
    "fields": [
      {
        "name": "sourceChannel",
        "label": "قناة المصدر",
        "type": "text",
        "placeholder": "@source",
        "required": true
      },
      {
        "name": "targetChannel",
        "label": "قناة الهدف",
        "type": "text",
        "placeholder": "@target",
        "required": true
      },
      {
        "name": "limit",
        "label": "عدد الرسائل",
        "type": "number",
        "placeholder": "50",
        "required": true,
        "default": 50
      }
    ],
    "pyFn": "forward_to_channels()",
    "risk": "low"
  },
  {
    "id": 74,
    "key": "forward_to_channelsnotag",
    "nameAr": "إعادة توجيه بدون وسم",
    "nameEn": "Auto Forwarder No Tag",
    "category": "messaging",
    "icon": "Forward",
    "description": "إعادة توجيه الرسائل بدون وسم 'معاد توجيهها'.",
    "fields": [
      {
        "name": "sourceChannel",
        "label": "قناة المصدر",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "targetChannel",
        "label": "قناة الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "limit",
        "label": "عدد الرسائل",
        "type": "number",
        "placeholder": "50",
        "required": true,
        "default": 50
      }
    ],
    "pyFn": "forward_to_channelsnotag()",
    "risk": "medium"
  },
  {
    "id": 75,
    "key": "messagesendering",
    "nameAr": "مرسل خاص (PM)",
    "nameEn": "Inbox Sender",
    "category": "messaging",
    "icon": "MessageSquare",
    "description": "إرسال رسالة خاصة (PM) لقائمة أرقام.",
    "fields": [
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "phonesList",
        "label": "ملف الأرقام",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "messagesendering()",
    "risk": "high"
  },
  {
    "id": 76,
    "key": "messagesenderingpic",
    "nameAr": "مرسل خاص مع صورة",
    "nameEn": "Inbox Pic Sender",
    "category": "messaging",
    "icon": "MessageSquare",
    "description": "إرسال رسالة + صورة كـ PM لقائمة أرقام.",
    "fields": [
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "imagePath",
        "label": "مسار الصورة",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "phonesList",
        "label": "ملف الأرقام",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "messagesenderingpic()",
    "risk": "high"
  },
  {
    "id": 77,
    "key": "massdm",
    "nameAr": "DM جماعي",
    "nameEn": "Mass DM",
    "category": "messaging",
    "icon": "Mail",
    "description": "إرسال رسائل خاصة جماعية عبر عدة حسابات.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "targetsCsvPath",
        "label": "ملف الأهداف",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "massdm()",
    "risk": "high"
  },
  {
    "id": 78,
    "key": "ramexsender",
    "nameAr": "مرسل Ramex جماعي",
    "nameEn": "Ramex Sender Bulk",
    "category": "messaging",
    "icon": "Send",
    "description": "إرسال جماعي بنظام Ramex المتقدم.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "targetsCsvPath",
        "label": "ملف الأهداف",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "ramexsenderbulk()",
    "risk": "high"
  },
  {
    "id": 79,
    "key": "pmspamdm",
    "nameAr": "DM سبام PM",
    "nameEn": "PM Spam DM",
    "category": "messaging",
    "icon": "MailWarning",
    "description": "إرسال رسائل PM بشكل متكرر لقائمة محددة.",
    "fields": [
      {
        "name": "message",
        "label": "النص",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "phonesList",
        "label": "ملف الأهداف",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "repeat",
        "label": "عدد التكرار لكل هدف",
        "type": "number",
        "placeholder": "3",
        "required": true,
        "default": 3
      }
    ],
    "pyFn": "pmspamdm()",
    "risk": "high"
  },
  {
    "id": 80,
    "key": "anonychatter",
    "nameAr": "محادث مجهول",
    "nameEn": "Anony Chatter",
    "category": "messaging",
    "icon": "MessagesSquare",
    "description": "محادثة عشوائية مع مستخدمي تيليجرام المجهولين.",
    "fields": [
      {
        "name": "messages",
        "label": "قائمة الرسائل",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "delaySeconds",
        "label": "التأخير (ثانية)",
        "type": "number",
        "placeholder": "15",
        "required": true,
        "default": 15
      }
    ],
    "pyFn": "anonychatter()",
    "risk": "medium"
  },
  {
    "id": 81,
    "key": "groupjoiner",
    "nameAr": "الانضمام لمجموعة/قناة",
    "nameEn": "Join Channel/Group",
    "category": "groups",
    "icon": "LogIn",
    "description": "الانضمام إلى قناة أو مجموعة برابط أو يوزر.",
    "fields": [
      {
        "name": "target",
        "label": "الرابط أو اليوزر",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "groupjoiner()",
    "risk": "low"
  },
  {
    "id": 82,
    "key": "grouplefter",
    "nameAr": "مغادرة مجموعة/قناة",
    "nameEn": "Leave Channel/Group",
    "category": "groups",
    "icon": "LogOut",
    "description": "مغادرة قناة أو مجموعة محددة.",
    "fields": [
      {
        "name": "target",
        "label": "الرابط أو اليوزر",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "grouplefter()",
    "risk": "low"
  },
  {
    "id": 83,
    "key": "autogroupcreator",
    "nameAr": "منشئ المجموعات التلقائي",
    "nameEn": "Auto Group Creator",
    "category": "groups",
    "icon": "Plus",
    "description": "إنشاء مجموعة جديدة تلقائيًا باسم ووصف محددين.",
    "fields": [
      {
        "name": "title",
        "label": "اسم المجموعة",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "autogroupcreator()",
    "risk": "low"
  },
  {
    "id": 84,
    "key": "groupchatcloner",
    "nameAr": "مستنسخ المجموعات",
    "nameEn": "Group Chat Cloner",
    "category": "groups",
    "icon": "Copy",
    "description": "استنساخ محتوى مجموعة كاملة (اسم، وصف، صورة، أعضاء).",
    "fields": [
      {
        "name": "newTitle",
        "label": "اسم المجموعة الجديدة",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "groupchatcloner()",
    "risk": "high"
  },
  {
    "id": 85,
    "key": "reactionincreaser",
    "nameAr": "زيادة التفاعلات",
    "nameEn": "Reaction Increaser",
    "category": "increasers",
    "icon": "Heart",
    "description": "زيادة التفاعلات (Reactions) على رسالة محددة.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "messageLink",
        "label": "رابط الرسالة",
        "type": "url",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد التفاعلات",
        "type": "number",
        "placeholder": "50",
        "required": true,
        "default": 50
      }
    ],
    "pyFn": "reactionincreaser()",
    "risk": "medium"
  },
  {
    "id": 86,
    "key": "sharesincreaser",
    "nameAr": "زيادة المشاركات",
    "nameEn": "Shares Increaser",
    "category": "increasers",
    "icon": "Share2",
    "description": "زيادة عدد مشاركات منشور عبر إعادة التوجيه.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "messageLink",
        "label": "رابط الرسالة",
        "type": "url",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد المشاركات",
        "type": "number",
        "placeholder": "50",
        "required": true,
        "default": 50
      }
    ],
    "pyFn": "sharesincreaser()",
    "risk": "medium"
  },
  {
    "id": 87,
    "key": "viewsincreaser",
    "nameAr": "زيادة المشاهدات",
    "nameEn": "Views Increaser",
    "category": "increasers",
    "icon": "Eye",
    "description": "زيادة عدد مشاهدات منشور في قناة.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "channelLink",
        "label": "رابط القناة",
        "type": "url",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد المشاهدات",
        "type": "number",
        "placeholder": "100",
        "required": true,
        "default": 100
      }
    ],
    "pyFn": "viewsincreaser()",
    "risk": "medium"
  },
  {
    "id": 88,
    "key": "viewsincrementor",
    "nameAr": "مضيف المشاهدات",
    "nameEn": "Views Incrementor",
    "category": "increasers",
    "icon": "Eye",
    "description": "إضافة تدريجية للمشاهدات على مدار فترة زمنية.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "channelLink",
        "label": "رابط القناة",
        "type": "url",
        "placeholder": "",
        "required": true
      },
      {
        "name": "totalViews",
        "label": "إجمالي المشاهدات",
        "type": "number",
        "placeholder": "1000",
        "required": true,
        "default": 1000
      },
      {
        "name": "intervalMinutes",
        "label": "الفاصل (دقيقة)",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "viewsincrementor()",
    "risk": "medium"
  },
  {
    "id": 89,
    "key": "reportfake",
    "nameAr": "بلاغ حساب وهمي",
    "nameEn": "Report Fake",
    "category": "reports",
    "icon": "Flag",
    "description": "إرسال بلاغ 'حساب وهمي' على مستخدم محدد.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "المستخدم المستهدف",
        "type": "text",
        "placeholder": "@username أو ID",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportfake()",
    "risk": "high"
  },
  {
    "id": 90,
    "key": "reportspam",
    "nameAr": "بلاغ سبام",
    "nameEn": "Report Spam",
    "category": "reports",
    "icon": "Flag",
    "description": "إرسال بلاغ 'سبام' على مستخدم.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportspam()",
    "risk": "high"
  },
  {
    "id": 91,
    "key": "reportviolence",
    "nameAr": "بلاغ عنف",
    "nameEn": "Report Violence",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'عنف' على مستخدم.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportviolence()",
    "risk": "high"
  },
  {
    "id": 92,
    "key": "reportchildabuse",
    "nameAr": "بلاغ إساءة للأطفال",
    "nameEn": "Report Child Abuse",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'إساءة للأطفال' - خطير جدا.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportchildabuse()",
    "risk": "high"
  },
  {
    "id": 93,
    "key": "reportcopyright",
    "nameAr": "بلاغ حقوق نشر",
    "nameEn": "Report Copyright",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'حقوق نشر' على محتوى.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportcopyright()",
    "risk": "high"
  },
  {
    "id": 94,
    "key": "reportgeoirrelevant",
    "nameAr": "بلاغ غير ذي صلة جغرافية",
    "nameEn": "Report GeoIrrelevant",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'محتوى غير ذي صلة بالموقع'.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportgeoirrelevant()",
    "risk": "high"
  },
  {
    "id": 95,
    "key": "reportpersonaldetails",
    "nameAr": "بلاغ تفاصيل شخصية",
    "nameEn": "Report Personal Details",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'نشر تفاصيل شخصية'.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportpersonaldetails()",
    "risk": "high"
  },
  {
    "id": 96,
    "key": "reportillegaldrugs",
    "nameAr": "بلاغ مخدرات",
    "nameEn": "Report Illegal Drugs",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'مخدرات غير قانونية'.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportillegaldrugs()",
    "risk": "high"
  },
  {
    "id": 97,
    "key": "reportpornography",
    "nameAr": "بلاغ إباحية",
    "nameEn": "Report Pornography",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'محتوى إباحي'.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportpornography()",
    "risk": "high"
  },
  {
    "id": 98,
    "key": "reportothers",
    "nameAr": "بلاغ أخرى",
    "nameEn": "Report Others",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'سبب آخر' مع شرح اختياري.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportothers()",
    "risk": "high"
  },
  {
    "id": 99,
    "key": "sendreportscam",
    "nameAr": "بلاغ احتيال",
    "nameEn": "Send Scam Report",
    "category": "reports",
    "icon": "Flag",
    "description": "إرسال بلاغ 'احتيال'.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "sendreportscam()",
    "risk": "high"
  },
  {
    "id": 100,
    "key": "reportspamuser",
    "nameAr": "بلاغ مستخدم سبام",
    "nameEn": "Report Spam User",
    "category": "reports",
    "icon": "Flag",
    "description": "بلاغ 'مستخدم يرسل سبام' عبر @SpamBot.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportspamuser()",
    "risk": "high"
  },
  {
    "id": 101,
    "key": "reportermenu",
    "nameAr": "قائمة البلاغات",
    "nameEn": "Reporter Menu",
    "category": "reports",
    "icon": "Flag",
    "description": "قائمة شاملة لجميع أنواع البلاغات على تيليجرام.",
    "fields": [
      {
        "name": "phonesList",
        "label": "ملف الحسابات",
        "type": "textarea",
        "placeholder": "",
        "required": true
      },
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      },
      {
        "name": "count",
        "label": "عدد البلاغات",
        "type": "number",
        "placeholder": "30",
        "required": true,
        "default": 30
      }
    ],
    "pyFn": "reportermenu()",
    "risk": "high"
  },
  {
    "id": 102,
    "key": "nearbylatlng",
    "nameAr": "إضافة حسب الإحداثيات",
    "nameEn": "By Lat/Lng",
    "category": "nearby",
    "icon": "MapPin",
    "description": "إضافة الأعضاء القريبين من إحداثيات جغرافية محددة.",
    "fields": [
      {
        "name": "lat",
        "label": "خط العرض",
        "type": "text",
        "placeholder": "24.7136",
        "required": true
      },
      {
        "name": "lng",
        "label": "خط الطول",
        "type": "text",
        "placeholder": "46.6753",
        "required": true
      },
      {
        "name": "radius",
        "label": "نصف القطر (م)",
        "type": "number",
        "placeholder": "1000",
        "required": true,
        "default": 1000
      }
    ],
    "pyFn": "nearbylatlngadder()",
    "risk": "medium"
  },
  {
    "id": 103,
    "key": "nearbycity",
    "nameAr": "إضافة حسب المدينة",
    "nameEn": "By City Name",
    "category": "nearby",
    "icon": "MapPin",
    "description": "إضافة الأعضاء القريبين من مدينة محددة بالاسم.",
    "fields": [
      {
        "name": "city",
        "label": "اسم المدينة",
        "type": "text",
        "placeholder": "دمشق",
        "required": true
      },
      {
        "name": "radius",
        "label": "نصف القطر (م)",
        "type": "number",
        "placeholder": "1000",
        "required": true,
        "default": 1000
      }
    ],
    "pyFn": "nearbycityadder()",
    "risk": "medium"
  },
  {
    "id": 124,
    "key": "vcfextract",
    "nameAr": "استخراج أرقام من VCF",
    "nameEn": "VCF Extract",
    "category": "vcf",
    "icon": "FileText",
    "description": "استخراج أرقام الهواتف من ملف جهات اتصال VCF.",
    "fields": [
      {
        "name": "vcfPath",
        "label": "ملف VCF",
        "type": "textarea",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "vcfextract()",
    "risk": "low"
  },
  {
    "id": 125,
    "key": "checknumber",
    "nameAr": "فحص رقم",
    "nameEn": "Check Number",
    "category": "vcf",
    "icon": "Phone",
    "description": "فحص حالة رقم على تيليجرام (مسجل/غير مسجل).",
    "fields": [
      {
        "name": "checkPhone",
        "label": "الرقم المراد فحصه",
        "type": "tel",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "checknumber()",
    "risk": "low"
  },
  {
    "id": 126,
    "key": "scamtag",
    "nameAr": "وسم احتيالي",
    "nameEn": "Scam Tag",
    "category": "special",
    "icon": "Sparkles",
    "description": "إضافة وسم 'احتيالي' للحساب (خاص).",
    "fields": [
      {
        "name": "target",
        "label": "الهدف",
        "type": "text",
        "placeholder": "",
        "required": true
      }
    ],
    "pyFn": "scamtag()",
    "risk": "high"
  },
  {
    "id": 127,
    "key": "goldenbuildmenu",
    "nameAr": "قائمة Golden Build",
    "nameEn": "Golden Build Menu",
    "category": "golden",
    "icon": "Crown",
    "description": "القائمة الفرعية للنسخة الذهبية - تجميع لأدوات الصيانة المتقدمة.",
    "fields": [],
    "pyFn": "gb_menu()",
    "risk": "low"
  },
  {
    "id": 128,
    "key": "webdashboardquickstart",
    "nameAr": "بدء لوحة الويب السريع",
    "nameEn": "Web Dashboard Quick Start",
    "category": "golden",
    "icon": "LayoutDashboard",
    "description": "تشغيل لوحة تحكم ويب سريعة على المنفذ المحلي.",
    "fields": [
      {
        "name": "port",
        "label": "المنفذ",
        "type": "number",
        "placeholder": "8080",
        "required": true,
        "default": 8080
      }
    ],
    "pyFn": "gb_dashboard_runner()",
    "risk": "low"
  },
  {
    "id": 129,
    "key": "shadowban Canarytest",
    "nameAr": "اختبار شادوبان الكناري",
    "nameEn": "Shadowban Canary Test",
    "category": "golden",
    "icon": "AlertTriangle",
    "description": "فحص حالة الشادوبان لجميع الحسابات في phone.csv.",
    "fields": [],
    "pyFn": "gb_canary_test_runner()",
    "risk": "medium"
  },
  {
    "id": 130,
    "key": "autopurgecheck",
    "nameAr": "فحص الطهير التلقائي",
    "nameEn": "Auto-Purge Check",
    "category": "golden",
    "icon": "Trash2",
    "description": "التحقق من الحاجة لطهير الحسابات تلقائيًا عند امتلاء التخزين.",
    "fields": [],
    "pyFn": "gb_purge_menu()",
    "risk": "low"
  },
  {
    "id": 131,
    "key": "spambotstatus",
    "nameAr": "فحص حالة @SpamBot",
    "nameEn": "@SpamBot Status Check",
    "category": "golden",
    "icon": "Bot",
    "description": "فتح محادثة مع @SpamBot لفحص حالة كل حساب.",
    "fields": [],
    "pyFn": "gb_spambot_runner()",
    "risk": "low"
  },
  {
    "id": 132,
    "key": "accountclassification",
    "nameAr": "عارض تصنيف الحسابات",
    "nameEn": "Account Classification Viewer",
    "category": "golden",
    "icon": "ListTree",
    "description": "عرض تصنيف الحسابات (نشطة/معلقة/محذوفة).",
    "fields": [],
    "pyFn": "gb_purge_menu()",
    "risk": "low"
  },
  {
    "id": 133,
    "key": "nearbyaddermenu",
    "nameAr": "قائمة الإضافة حسب الموقع",
    "nameEn": "Nearby Adder Menu",
    "category": "wrappers",
    "icon": "MapPin",
    "description": "القائمة الشاملة لجميع أدوات الإضافة حسب الموقع الجغرافي.",
    "fields": [],
    "pyFn": "nearbyaddermenu()",
    "risk": "low"
  },
  {
    "id": 134,
    "key": "vcffileadermenu",
    "nameAr": "قائمة ملفات VCF",
    "nameEn": "VCF File Adder Menu",
    "category": "wrappers",
    "icon": "FileText",
    "description": "قائمة عمليات استيراد وإدارة ملفات VCF.",
    "fields": [],
    "pyFn": "vcffileadermenu()",
    "risk": "low"
  },
  {
    "id": 135,
    "key": "loginusingsecurity",
    "nameAr": "تسجيل دخول آمن",
    "nameEn": "Login Using Security",
    "category": "wrappers",
    "icon": "ShieldCheck",
    "description": "تسجيل دخول مع تفعيل طبقة الأمان الكاملة (بروكسي + تأخير + فحص).",
    "fields": [
      {
        "name": "useProxy",
        "label": "تفعيل البروكسي",
        "type": "switch",
        "placeholder": "",
        "required": false,
        "default": "True"
      },
      {
        "name": "humanDelay",
        "label": "تأخير بشري (ثانية)",
        "type": "number",
        "placeholder": "5",
        "required": true,
        "default": 5
      }
    ],
    "pyFn": "loginusingsecurity()",
    "risk": "low"
  },
  {
    "id": 136,
    "key": "telegramsendermenu",
    "nameAr": "قائمة المرسل",
    "nameEn": "Telegram Sender Menu",
    "category": "wrappers",
    "icon": "Send",
    "description": "القائمة الشاملة لجميع أدوات الإرسال على تيليجرام.",
    "fields": [],
    "pyFn": "telegramsendermenu()",
    "risk": "low"
  },
  {
    "id": 137,
    "key": "addbygendermenu",
    "nameAr": "قائمة الإضافة حسب الجنس",
    "nameEn": "Add by Gender Menu",
    "category": "wrappers",
    "icon": "Users",
    "description": "القائمة الشاملة لإضافة الأعضاء حسب الجنس.",
    "fields": [],
    "pyFn": "addbygendermenu()",
    "risk": "low"
  },
  {
    "id": 138,
    "key": "proxymanager",
    "nameAr": "مدير البروكسي",
    "nameEn": "Proxy Manager",
    "category": "wrappers",
    "icon": "ShieldCheck",
    "description": "إدارة شاملة لإعدادات البروكسي والتحقق من حالتها.",
    "fields": [],
    "pyFn": "proxymanager()",
    "risk": "low"
  }
];

export function getCommandsByCategory(catKey: string): Command[] {
  return COMMANDS.filter(c => c.category === catKey);
}

export function getCategoryByKey(key: string): Category | undefined {
  return CATEGORIES.find(c => c.key === key);
}

export function getCommandById(id: number): Command | undefined {
  return COMMANDS.find(c => c.id === id);
}

export function getCommandByKey(key: string): Command | undefined {
  return COMMANDS.find(c => c.key === key);
}
