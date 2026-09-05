# 🚀 Railway Deployment - 5 دقائق

**Copy-Paste جاهز - لا تحتاج تفكير!**

---

## الخطوة 1: افتح Railway Dashboard (1 دقيقة)

1. اذهب: https://railway.app/dashboard
2. اضغط: **"Create"** → **"Deploy from GitHub repo"**

---

## الخطوة 2: اختر Repository (1 دقيقة)

1. اختر: **`Bymadyan/whispr`**
2. اختر branch: **`claude/profitable-projects-ideas-vk26ab`**
3. اضغط: **"Create project"**

---

## الخطوة 3: Deploy SanadPay (2 دقائق)

في Railway:

1. **Configure**:
   - Root Directory: `sanadpay/`
   - Node.js (auto-detected)

2. **Add Variables** (من `sanadpay/.env`):
   ```
   PORT=3000
   APP_BASE_URL=https://sanadpay-XXXX.up.railway.app
   SESSION_SECRET=[paste من sanadpay/.env]
   TWILIO_ACCOUNT_SID=[paste من sanadpay/.env]
   TWILIO_AUTH_TOKEN=[paste من sanadpay/.env]
   TWILIO_WHATSAPP_FROM=[paste من sanadpay/.env]
   STRIPE_SECRET_KEY=[paste من sanadpay/.env]
   STRIPE_WEBHOOK_SECRET=[paste من sanadpay/.env]
   STRIPE_CONNECT_WEBHOOK_SECRET=[paste من sanadpay/.env]
   STRIPE_CONNECT_COUNTRY=SA
   ```

3. **Deploy** ✅

---

## الخطوة 4: انتظر Build (2-3 دقائق)

Railway سيبني الـ Docker image ويشغل الـ app

جرب: `https://sanadpay-XXXX.up.railway.app`

---

## الخطوة 5: Repeat للـ 2 Projects الثاني (اختياري)

**Sanad Review:**
- Root Directory: `sanad-review/`
- PORT: 3001
- البيانات من `sanad-review/.env`

**Ghiyath Agent:**
- Root Directory: `ghiyath-agent/`
- PORT: 3002
- البيانات من `ghiyath-agent/.env`

---

## ✅ التحقق

بعد Deploy:
- [ ] SanadPay تشتغل
- [ ] Sanad Review تشتغل (لو ديبلويت)
- [ ] Ghiyath Agent تشتغل (لو ديبلويت)

---

## 📝 ملاحظات مهمة

1. **لا تحط credentials في صيغة plain text في الملفات**
2. **استخدم Railway Environment Variables دائماً**
3. **APP_BASE_URL ستتغير** - حدث بعد ما تعرف الـ domain الفعلي

---

## 🎯 بعد Deploy

1. اختبر الـ app من الـ URL
2. شغّل Webhooks:
   - Twilio: https://sanadpay-XXXX.up.railway.app/whatsapp/webhook
   - Stripe: https://sanadpay-XXXX.up.railway.app/billing/webhook

3. أرسل رسالة تجريبية من Twilio لـ اختبر!

---

**يلا! شغّل الآن من Railway Dashboard! 🚀**
