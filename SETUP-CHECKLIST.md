# 📋 قائمة Setup الشاملة - Whispr + Sanad

**الحالة الحالية**: `2026-09-05`  
**الحساب**: Noblevest investment llc (Stripe Test Mode)  
**الفرع**: `claude/profitable-projects-ideas-vk26ab`

---

## ✅ ما تم إنجازه

### Stripe
- ✅ **Whispr Product & Price**: `prod_V7r0DTcKUMGLGL` + `price_1U7bIZ36eIjaofwxDn5WwGAl` ($35/month)
- ✅ **Whispr Webhook**: `/billing/webhook` (Checkout session events)
  - URL: `https://whispr-production-e08d.up.railway.app/billing/webhook`
  - Status: Enabled ✅

### Railway
- ✅ **Whispr Deployment**: `whispr-production-e08d.up.railway.app` (الموجود)

### Environment Files
- ✅ **`.env` files created** مع التعليقات والـ placeholders
  - `/home/user/whispr/.env` (Whispr)
  - `/home/user/whispr/sanad/.env` (Sanad)

---

## ❌ ما الناقص (بالأولوية)

### ✅ Priority 1: Stripe Connect Webhook (Sanad) — تمّ! ✨

**الحالة**: تم الإنشاء بنجاح عبر Stripe API

**التفاصيل**:
- ✅ **ID**: `we_1UCKSU36eIjaofwxX6WfqGNm`
- ✅ **URL**: `https://sanad-prod.up.railway.app/billing/webhook/connect`
  - ملاحظة: URL مؤقتة — بعد deployment على Railway، حدّثها بـ domain الحقيقي
- ✅ **Scope**: "Connected accounts" ✅
- ✅ **Events**: `account.updated`, `payout.paid`, `payout.failed` ✅
- ✅ **Signing Secret**: `whsec_mZYDO0Uvko5hcDxUZXU6KSyroyUkgR5Q` ✅
- ✅ **Status**: Enabled ✅

**ما يجب فعله**:
1. استخدم الـ secret أعلاه في `sanad/.env` ✅ (تم بالفعل)
2. بعد deployment على Railway، حدّث URL في Stripe dashboard من:
   - `https://sanad-prod.up.railway.app/...`
   - إلى: `https://sanad-xxxx.up.railway.app/...` (domain الحقيقي)

---

### 🔴 Priority 2: Twilio WhatsApp Setup

**المشكلة**: لا توجد بيانات Twilio تماماً.

**الحل**:

1. اذهب: https://console.twilio.com
2. اختر "Messaging" > "Try WhatsApp"
3. فعّل الـ Sandbox (يعطيك رقم + كود تفعيل)
4. من Settings: اضبط **"When a message comes in"**:
   - URL: `https://<sanad-domain>/whatsapp/webhook`
   - Method: `HTTP POST`
5. انسخ البيانات:
   - Account SID
   - Auth Token
   - WhatsApp Number (مثل: `whatsapp:+14155238886`)
6. ضعها في `sanad/.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

---

### 🔴 Priority 3: Railway Deployment (Sanad)

**المشكلة**: Sanad لم تُنشر على Railway بعد.

**الحل**:

1. اذهب: https://railway.app/dashboard
2. اضغط "Create" > "Deploy from GitHub repo"
3. اختر: `Bymadyan/whispr`
4. اضبط:
   - **Root Directory**: `sanad/`
   - **Node.js** runtime
5. **أضف Environment Variables**:
   ```
   TWILIO_ACCOUNT_SID=...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_FROM=...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
   STRIPE_CONNECT_COUNTRY=SA
   SESSION_SECRET=... (استخدم: openssl rand -base64 32)
   APP_BASE_URL=https://sanad.up.railway.app (بعد deployment)
   ANTHROPIC_API_KEY=... (اختياري لكن موصى به)
   OPENAI_API_KEY=... (اختياري لكن موصى به)
   ```
6. **أضف Volume**:
   - Path: `/app/data`
   - Mount: حفظ بيانات العملاء والفواتير (مهم!)
7. Deploy!

---

### 🟡 Priority 4: API Keys (اختياري لكن موصى به)

#### Anthropic (Claude) - للاستخراج الذكي لبيانات الفاتورة
```
- مهم لـ: Sanad (بدونه التجربة ضعيفة جداً)
- اذهب: https://console.anthropic.com/account/keys
- انسخ API Key
- ضعه في `sanad/.env`: ANTHROPIC_API_KEY=...
```

#### OpenAI (Whisper) - لتحويل الرسائل الصوتية
```
- مهم لـ: Sanad (بدونه بلا رسائل صوتية)
- اذهب: https://platform.openai.com/account/api-keys
- انسخ API Key
- ضعه في `sanad/.env`: OPENAI_API_KEY=...
```

#### Google OAuth - لـ Whispr (تسجيل الدخول)
```
- اذهب: https://console.cloud.google.com
- اختر or Create Project
- APIs & Services > Credentials > Create OAuth 2.0 credentials (Desktop)
- اضبط Authorized redirect URI: http://localhost:3000/auth/google/callback
- انسخ Client ID + Secret
- ضعهم في `whispr/.env`
```

---

## 📊 جدول الحالة

| المكون | الحالة | التفاصيل |
|--------|--------|----------|
| **Stripe - Whispr** | 100% ✅ | Product + Price + Webhook #1 موجودة |
| **Stripe - Sanad** | 100% ✅ | Webhook #1 + Webhook #2 (Connect) موجودة! |
| **Twilio** | 0% ❌ | محتاج Account SID + Auth Token + Sandbox setup |
| **Railway - Whispr** | 100% ✅ | مشتغلة |
| **Railway - Sanad** | 0% ❌ | محتاج نشر مشروع جديد + Volume |
| **Environment** | 0% ❌ | .env files موجودة (فارغة) |
| **API Keys** | 0% ❌ | Anthropic + OpenAI + Google OAuth |

---

## 🚀 الخطوات التالية (بالترتيب)

```
1. أضف Stripe Connect Webhook (#2)
   ↓
2. أنشئ Twilio WhatsApp Sandbox
   ↓
3. ملأ .env files بالبيانات
   ↓
4. Deploy Sanad على Railway
   ↓
5. حدّث Webhook URLs بعد deployment
   ↓
6. اختبر رحلة العميل كاملة
```

---

## 📝 ملاحظات مهمة

### لـ Whispr:
- Stripe subscription $35/month مستعد بالكامل
- محتاج Google OAuth credentials فقط
- Whispr مشتغلة على Railway بالفعل

### لـ Sanad:
- ⚠️ **Stripe Connect Webhook إجباري**: بدونه، الفلوس تضل عندك بدل الحرفي
- ⚠️ **Twilio Webhook يحتاج تفعيل**: كل رسالة واتساب محتاجة webhook validation
- ⚠️ **Volume في Railway ضروري**: لحفظ بيانات العملاء (الفواتير، الحسابات)
- تذكير 24 ساعة محتاج Message Template معتمد من Twilio (بعد الـ Sandbox)

---

## 🔗 روابط مهمة

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Twilio Console**: https://console.twilio.com
- **Railway Dashboard**: https://railway.app/dashboard
- **Anthropic Console**: https://console.anthropic.com
- **OpenAI Platform**: https://platform.openai.com
- **Google Cloud Console**: https://console.cloud.google.com

---

**آخر تحديث**: 2026-09-05
