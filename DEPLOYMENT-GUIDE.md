# 🚀 Deployment Guide - Three Projects to Railway

**Status**: Ready for deployment  
**Updated**: 2026-09-05

---

## Prerequisites

✅ All completed:
- Environment files configured
- Stripe Test Mode credentials ready
- Twilio WhatsApp Sandbox configured
- GitHub repository organized with three projects

---

## 🎯 Deployment Overview

Each project deploys independently to Railway:

| Project | Root Dir | Port | Time |
|---------|----------|------|------|
| **SanadPay** | `sanadpay/` | 3000 | ~5 min |
| **Sanad Review** | `sanad-review/` | 3001 | ~5 min |
| **Ghiyath Agent** | `ghiyath-agent/` | 3002 | ~5 min |

---

## 📋 Step-by-Step Deployment

### Step 1: Deploy SanadPay

1. **Open** Railway: https://railway.app/dashboard
2. **Click** "Create" → "Deploy from GitHub repo"
3. **Select** `Bymadyan/whispr`
4. **Configure**:
   - **Root Directory**: `sanadpay/`
   - **Node.js** runtime (auto-detected)
5. **Add Environment Variables** (from your local `.env` file):
   ```
   PORT=3000
   APP_BASE_URL=[will_update_after_deployment]
   SESSION_SECRET=[from_sanadpay/.env]
   TWILIO_ACCOUNT_SID=[from_sanadpay/.env]
   TWILIO_AUTH_TOKEN=[from_sanadpay/.env]
   TWILIO_WHATSAPP_FROM=[from_sanadpay/.env]
   STRIPE_SECRET_KEY=[from_sanadpay/.env]
   STRIPE_WEBHOOK_SECRET=[from_sanadpay/.env]
   STRIPE_CONNECT_WEBHOOK_SECRET=[from_sanadpay/.env]
   STRIPE_CONNECT_COUNTRY=SA
   ```
   📝 **Note**: Copy all values from your local `sanadpay/.env` file - never paste real credentials in documentation.
6. **Click** "Deploy"
7. **Wait** for build (~2 minutes)
8. **Get Domain**: `sanadpay-xxxx.up.railway.app`
9. **Store Domain** for webhook configuration

---

### Step 2: Configure SanadPay Webhooks

After deployment, update webhook URLs:

#### Twilio WhatsApp
1. Go: https://console.twilio.com
2. Messaging → Sandbox Settings
3. **"When a message comes in"**:
   - URL: `https://sanadpay-xxxx.up.railway.app/whatsapp/webhook`
   - Method: `POST`
4. **Save** ✅

#### Stripe Billing Webhook
1. Go: https://dashboard.stripe.com/webhooks
2. Edit `/billing/webhook`:
   - URL: `https://sanadpay-xxxx.up.railway.app/billing/webhook`
3. **Save** ✅

#### Stripe Connect Webhook
1. Dashboard → Developers → Webhooks
2. Edit `/billing/webhook/connect`:
   - URL: `https://sanadpay-xxxx.up.railway.app/billing/webhook/connect`
3. **Save** ✅

#### Add Volume
1. Railway Project → Storage tab
2. "Add Volume"
3. Mount Path: `/app/data`
4. Size: 1 GB
5. **Save** ✅

---

### Step 3: Deploy Sanad Review

1. **Open** Railway: https://railway.app/dashboard
2. **Click** "Create" → "Deploy from GitHub repo"
3. **Select** `Bymadyan/whispr`
4. **Configure**:
   - **Root Directory**: `sanad-review/`
   - **Node.js** runtime
5. **Add Environment Variables** (from your local `.env` file):
   ```
   PORT=3001
   APP_BASE_URL=[will_update_after_deployment]
   SESSION_SECRET=[generate_new: openssl rand -base64 32]
   STRIPE_SECRET_KEY=[from_sanad-review/.env]
   STRIPE_WEBHOOK_SECRET=[from_sanad-review/.env]
   GOOGLE_CLIENT_ID=[from_sanad-review/.env]
   GOOGLE_CLIENT_SECRET=[from_sanad-review/.env]
   GOOGLE_REDIRECT_URI=https://sanad-review-xxxx.up.railway.app/auth/google/callback
   ```
   📝 **Note**: Copy all values from your local `sanad-review/.env` file - never paste real credentials in documentation.
6. **Click** "Deploy"
7. **Wait** for build
8. **Get Domain**: `sanad-review-xxxx.up.railway.app`

#### Configure Stripe Webhook
1. Dashboard → Developers → Webhooks
2. Edit webhook for `/billing/webhook`:
   - URL: `https://sanad-review-xxxx.up.railway.app/billing/webhook`
3. **Save** ✅

#### Add Volume
1. Railway Project → Storage tab
2. "Add Volume"
3. Mount Path: `/app/data`
4. Size: 1 GB
5. **Save** ✅

---

### Step 4: Deploy Ghiyath Agent

1. **Open** Railway: https://railway.app/dashboard
2. **Click** "Create" → "Deploy from GitHub repo"
3. **Select** `Bymadyan/whispr`
4. **Configure**:
   - **Root Directory**: `ghiyath-agent/`
   - **Node.js** runtime
5. **Add Environment Variables** (TBD - project specific)
6. **Click** "Deploy"

---

## 🧪 Test After Deployment

### Test SanadPay
1. Go to: `https://sanadpay-xxxx.up.railway.app`
2. See landing page ✓
3. From Twilio console, send test message:
   ```
   صيانة مكيف، 250 ريال
   ```
4. Expect: Invoice created + payment link in WhatsApp

### Test Sanad Review
1. Go to: `https://sanad-review-xxxx.up.railway.app`
2. See landing page ✓
3. Try Google OAuth login
4. Subscribe to $35/month plan

### Test Ghiyath Agent
1. Test application-specific functionality

---

## 📊 Deployment Checklist

### SanadPay
- [ ] Deployed to Railway
- [ ] Domain configured
- [ ] Twilio webhook added
- [ ] Stripe webhooks added
- [ ] Volume created (`/app/data`)
- [ ] Tested with WhatsApp message

### Sanad Review
- [ ] Deployed to Railway
- [ ] Domain configured
- [ ] Google OAuth configured
- [ ] Stripe webhook added
- [ ] Volume created (`/app/data`)
- [ ] Tested login flow

### Ghiyath Agent
- [ ] Deployed to Railway
- [ ] Tested application

---

## ⚠️ Important Notes

1. **Test Mode**: All Stripe keys are in Test Mode — safe for development
2. **Domains**: Replace `xxxx` with actual Railway-assigned domain
3. **Environment Variables**: Keep `.env` files locally, never commit to Git
4. **Volumes**: Persist data between deployments at `/app/data`
5. **Auto-rebuild**: Railway auto-rebuilds when you push to GitHub

---

## 🔗 Useful Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Stripe Test Dashboard**: https://dashboard.stripe.com/test/dashboard
- **Twilio Console**: https://console.twilio.com
- **GitHub Branch**: `claude/profitable-projects-ideas-vk26ab`

---

## 📝 Environment Variables Reference

### SanadPay (sanadpay/.env)
```env
# Copy from your local sanadpay/.env file
# Do not paste actual credentials in documentation
PORT=3000
APP_BASE_URL=https://sanadpay-xxxx.up.railway.app
SESSION_SECRET=[your_secret_key]
TWILIO_ACCOUNT_SID=[your_account_sid]
TWILIO_AUTH_TOKEN=[your_auth_token]
TWILIO_WHATSAPP_FROM=whatsapp:+[number]
STRIPE_SECRET_KEY=[your_stripe_key]
STRIPE_WEBHOOK_SECRET=[your_webhook_secret]
STRIPE_CONNECT_WEBHOOK_SECRET=[your_connect_secret]
STRIPE_CONNECT_COUNTRY=SA
```

### Sanad Review (sanad-review/.env)
```env
# Copy from your local sanad-review/.env file
# Do not paste actual credentials in documentation
PORT=3001
APP_BASE_URL=https://sanad-review-xxxx.up.railway.app
SESSION_SECRET=[your_secret_key]
STRIPE_SECRET_KEY=[your_stripe_key]
STRIPE_WEBHOOK_SECRET=[your_webhook_secret]
GOOGLE_CLIENT_ID=[your_client_id]
GOOGLE_CLIENT_SECRET=[your_client_secret]
GOOGLE_REDIRECT_URI=https://sanad-review-xxxx.up.railway.app/auth/google/callback
```

---

**Ready to deploy! Follow the steps above for each project. 🚀**
