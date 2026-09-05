# 📁 Project Structure - Three Independent Applications

**Date**: 2026-09-05  
**Status**: ✅ Organized and Separated

---

## 🎯 Overview

The `/home/user/whispr` repository now contains **three completely separate projects**, each with its own:
- Node.js Express application
- Database configuration
- Environment variables (`.env`)
- Deployment setup
- Dependencies

---

## 📦 Projects

### 1️⃣ **SanadPay** (`/sanadpay/`)
**WhatsApp-First Invoice Platform for Tradespeople**

- **Tech Stack**: Node.js + Express + SQLite + Stripe + Twilio
- **Features**:
  - WhatsApp message parsing for invoice creation
  - Stripe payment processing (Test Mode)
  - Merchant bank account linking (Stripe Connect)
  - Automated invoice delivery via WhatsApp
  - Multi-language support (Arabic/English/Urdu)
  - Admin dashboard for tracking payments

- **Key Files**:
  - `src/server.js` - Main Express server
  - `src/whatsapp.js` - Twilio WhatsApp integration
  - `src/routes/billing.js` - Stripe payment handling
  - `src/routes/whatsappWebhook.js` - Incoming message processing

- **Environment Variables** (`.env`):
  ```
  PORT=3000
  TWILIO_ACCOUNT_SID=...
  TWILIO_AUTH_TOKEN=...
  STRIPE_SECRET_KEY=sk_test_...
  SESSION_SECRET=...
  ```

- **Status**: 
  - ✅ Development complete
  - ⏳ Awaiting Railway deployment
  - ⏳ Twilio webhook configuration needed

- **Learn More**: See `sanadpay/README.md` and `sanadpay/LAUNCH-PLAN.md`

---

### 2️⃣ **Sanad Review** (`/sanad-review/`)
**Google Business Profile Automated Response Tool**

- **Tech Stack**: Node.js + Express + SQLite + Stripe
- **Features**:
  - Auto-generates AI-powered responses to Google Business reviews
  - Human review & approval workflow before posting
  - Stripe subscription billing ($35/month)
  - Multi-location support
  - Dashboard for review management

- **Key Files**:
  - `src/server.js` - Main Express server
  - `src/replyGenerator.js` - AI response generation
  - `src/googleClient.js` - Google OAuth & API integration
  - `src/routes/reviews.js` - Review management endpoints

- **Environment Variables** (`.env`):
  ```
  PORT=3001
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=...
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  SESSION_SECRET=...
  ```

- **Status**:
  - ✅ Development complete
  - ⏳ Awaiting Railway deployment
  - ⏳ Google OAuth verification needed

- **Learn More**: See `sanad-review/README.md`

---

### 3️⃣ **Ghiyath Agent** (`/ghiyath-agent/`)
**AI Agent Project**

- **Tech Stack**: Node.js (Framework TBD)
- **Features**: TBD
- **Status**:
  - 🔵 Project skeleton created
  - 📝 Ready for implementation

- **Learn More**: See `ghiyath-agent/README.md`

---

## 🚀 Running Each Project

### Local Development

```bash
# SanadPay
cd sanadpay
npm install
npm run dev

# Sanad Review
cd sanad-review
npm install
npm run dev

# Ghiyath Agent
cd ghiyath-agent
npm install
npm run dev
```

---

## 🔑 Environment Configuration

Each project has its own `.env` file (not tracked by git for security):

```
whispr/
├── sanadpay/
│   └── .env              ← Sanad Pay credentials
├── sanad-review/
│   └── .env              ← Sanad Review credentials
└── ghiyath-agent/
    └── .env              ← Ghiyath Agent credentials
```

---

## 📊 Deployment Status

| Project | Status | Environment | URL |
|---------|--------|-------------|-----|
| **SanadPay** | 🔵 Ready | Railway (pending) | TBD |
| **Sanad Review** | 🔵 Ready | Railway (pending) | TBD |
| **Ghiyath Agent** | 🟡 Developing | TBD | TBD |

---

## ✅ Completed Tasks

- ✅ Removed old Whispr from root directory
- ✅ Renamed `/sanad/` → `/sanadpay/` for clarity
- ✅ Added `/sanad-review/` from Google Reviews branch
- ✅ Created `/ghiyath-agent/` placeholder
- ✅ Each project has separate configuration
- ✅ All pushed to branch: `claude/profitable-projects-ideas-vk26ab`

---

## 📝 Next Steps

### For SanadPay
1. Deploy to Railway with root directory: `sanadpay/`
2. Configure Twilio webhook after deployment
3. Configure Stripe webhooks
4. Test end-to-end with real WhatsApp messages

### For Sanad Review
1. Deploy to Railway with root directory: `sanad-review/`
2. Set up Google OAuth verification
3. Configure Stripe billing
4. Test with Google Business Profile API

### For Ghiyath Agent
1. Define project requirements
2. Set up technology stack
3. Begin implementation

---

## 🔗 Important Links

- **GitHub Branch**: `claude/profitable-projects-ideas-vk26ab`
- **Railway Dashboard**: https://railway.app/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Twilio Console**: https://console.twilio.com
- **Google Cloud Console**: https://console.cloud.google.com

---

**All three projects are now completely independent and ready for deployment! 🎉**
