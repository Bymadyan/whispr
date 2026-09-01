// دعم عدة لغات لمحادثة واتساب. واتساب/Twilio ما يعطينا لغة جهاز المستخدم مباشرة، فنكتشفها من نص
// رسالته نفسها:
//   - ما فيه أي حرف بنطاق الحروف العربية (يشمل الأوردو، لأن الأوردو مكتوب بخط عربي مطوّر) => إنجليزي.
//   - فيه حروف عربية، وفيها حروف مختصة بالأوردو (پ چ ڈ ڑ ژ گ ں ھ ے) => أوردو.
//   - غير كذا => عربي.
// إضافة لغة جديدة لاحقاً = تضيف مفتاح جديد بـ BOT_MESSAGES و PAGE_TEXT وتوسّع detectLanguage.

const ARABIC_SCRIPT = /[؀-ۿ]/;
const URDU_MARKERS = /[پچڈڑژگںھے]/;

function detectLanguage(text) {
  if (!text) return "ar";
  if (!ARABIC_SCRIPT.test(text)) return "en";
  return URDU_MARKERS.test(text) ? "ur" : "ar";
}

const BOT_MESSAGES = {
  ar: {
    welcome: (connectUrl) => {
      const lines = [
        "أهلاً فيك! 👋 هذا بوت *سند* — يحوّل رسالتك الصوتية أو النصية لفاتورة جاهزة فوراً، برابط دفع لزبونك.",
        "",
        "الاستخدام مجاني بالكامل، بدون اشتراك ولا تسجيل — بس عمولة 5% لما زبونك يدفع فعلاً عبر الرابط (0% لو ما فيه دفع).",
        "",
        'جرّب الحين: ابعت رسالة صوتية أو اكتب مثلاً "سويت صيانة مكيف عند أحمد بمبلغ 250 ريال".',
      ];
      if (connectUrl) {
        lines.push(
          "",
          "💳 عشان فلوس فواتيرك تروح لحسابك البنكي مباشرة أول ما يدفع زبونك، اربطه من هنا (٣ دقايق، مرة وحدة بس، اختياري):",
          connectUrl
        );
      }
      return lines.join("\n");
    },
    invoice: (invoice, pageUrl) => {
      const amountLine = invoice.amount != null ? `💰 المبلغ: ${invoice.amount} ${invoice.currency || ""}`.trim() : "💰 المبلغ: (لم يُذكر بوضوح، عدّله من لوحة التحكم)";
      const customerLine = invoice.customer_name ? `👤 الزبون: ${invoice.customer_name}` : "👤 الزبون: (غير مذكور)";
      const lines = [
        "✅ سويت لك الفاتورة:",
        "",
        customerLine,
        `📝 الوصف: ${invoice.description || "-"}`,
        amountLine,
        "",
        `🧾 فاتورة ورابط دفع لزبونك: ${pageUrl}`,
        "",
        "انسخ هذي الرسالة وابعتها لزبونك، أو راجعها من لوحة التحكم.",
      ];
      return lines.join("\n");
    },
    dashboardLine: (url) => `📊 لوحة تحكمك (بدون تسجيل دخول): ${url}`,
    linkSuccess: "تم ربط رقمك بنجاح ✅\n\nالحين ابعت رسالة صوتية أو نصية توصف فيها الشغلة اللي سويتها، اسم الزبون (اختياري)، والمبلغ.",
    voiceNoOpenAI: "الرسائل الصوتية تحتاج تفعيل خدمة التحويل الصوتي على حسابنا. لحد ذاك، اكتب تفاصيل الشغلة نصياً: اسم الزبون، الوصف، والمبلغ.",
    voiceFailed: "ما قدرت أفهم الرسالة الصوتية. جرب ترسلها مرة ثانية أو اكتب التفاصيل نصياً.",
    emptyPrompt: "ابعت رسالة صوتية أو نصية فيها تفاصيل الشغلة (اسم الزبون، الوصف، والمبلغ).",
    unexpectedError: "صار خطأ غير متوقع، جرب مرة ثانية بعد شوي.",
    paymentReceived: (who, amount, currency) => `💰 استلمت دفعة! ${who} دفع فاتورة بمبلغ ${amount} ${currency}`.trim(),
    payoutArrived: (amount, currency) => `✅ التحويل البنكي وصل حسابك! المبلغ: ${amount} ${currency}`.trim(),
    payoutFailed: (amount, currency) => `⚠️ فشل تحويل بنكي بمبلغ ${amount} ${currency} لحسابك. راجع بيانات حسابك البنكي بإعدادات Stripe أو تواصل مع الدعم.`.trim(),
    reminder: (who, amount, days) => `⏰ تذكير: فاتورة "${who}" بمبلغ ${amount} لسه ما انسددت من أكثر من ${days} أيام. تحب تتابعها؟`,
    connectBankAccount: (connectUrl) => {
      if (!connectUrl) return "";
      return `\n\n💳 عشان فلوس فواتيرك تروح لحسابك البنكي مباشرة، اربطه من هنا (٣ دقايق، مرة وحدة بس):\n${connectUrl}`;
    },
  },

  en: {
    welcome: (connectUrl) => {
      const lines = [
        "Hey! 👋 This is *Sanad* — it turns your voice note or text into a ready invoice instantly, with a payment link for your customer.",
        "",
        "It's completely free to use, no subscription and no sign-up — we just take a 5% fee when your customer actually pays through the link (0% if there's no payment).",
        "",
        'Try it now: send a voice note or type something like "Fixed the AC at Ahmad\'s place for 250 SAR".',
      ];
      if (connectUrl) {
        lines.push(
          "",
          "💳 So your invoice money lands straight in your bank account once your customer pays, connect it here (3 minutes, one-time, optional):",
          connectUrl
        );
      }
      return lines.join("\n");
    },
    invoice: (invoice, pageUrl) => {
      const amountLine = invoice.amount != null ? `💰 Amount: ${invoice.amount} ${invoice.currency || ""}`.trim() : "💰 Amount: (unclear, edit it from your dashboard)";
      const customerLine = invoice.customer_name ? `👤 Customer: ${invoice.customer_name}` : "👤 Customer: (not mentioned)";
      const lines = [
        "✅ Your invoice is ready:",
        "",
        customerLine,
        `📝 Description: ${invoice.description || "-"}`,
        amountLine,
        "",
        `🧾 Invoice + payment link for your customer: ${pageUrl}`,
        "",
        "Copy this and send it to your customer, or review it from your dashboard.",
      ];
      return lines.join("\n");
    },
    dashboardLine: (url) => `📊 Your dashboard (no login needed): ${url}`,
    linkSuccess: "Your number is linked ✅\n\nNow send a voice note or text describing the job you did, the customer's name (optional), and the amount.",
    voiceNoOpenAI: "Voice messages need voice transcription enabled on our end. Until then, please type the job details: customer name, description, and amount.",
    voiceFailed: "I couldn't understand that voice message. Try sending it again or type the details instead.",
    emptyPrompt: "Send a voice note or text with the job details (customer name, description, and amount).",
    unexpectedError: "Something went wrong. Please try again in a moment.",
    paymentReceived: (who, amount, currency) => `💰 Payment received! ${who} paid an invoice for ${amount} ${currency}`.trim(),
    payoutArrived: (amount, currency) => `✅ Your bank transfer arrived! Amount: ${amount} ${currency}`.trim(),
    payoutFailed: (amount, currency) => `⚠️ A bank transfer of ${amount} ${currency} to your account failed. Check your bank details in Stripe or contact support.`.trim(),
    reminder: (who, amount, days) => `⏰ Reminder: invoice "${who}" for ${amount} is still unpaid after more than ${days} days. Want to follow up?`,
    connectBankAccount: (connectUrl) => {
      if (!connectUrl) return "";
      return `\n\n💳 So your invoice money lands straight in your bank account, connect it here (3 minutes, one-time):\n${connectUrl}`;
    },
  },

  ur: {
    welcome: (connectUrl) => {
      const lines = [
        "ہیلو! 👋 یہ ہے *سند* بوٹ — آپ کا وائس نوٹ یا ٹیکسٹ فوری طور پر ایک تیار انوائس میں بدل دیتا ہے، کسٹمر کے لیے پیمنٹ لنک کے ساتھ۔",
        "",
        "استعمال بالکل مفت ہے، کوئی سبسکرپشن یا رجسٹریشن نہیں — بس جب کسٹمر لنک سے ادائیگی کرے تو 5% فیس (اگر ادائیگی نہ ہو تو 0%)۔",
        "",
        'ابھی آزمائیں: ایک وائس میسج بھیجیں یا لکھیں مثلاً "احمد کے گھر AC ٹھیک کیا 250 ریال میں"۔',
      ];
      if (connectUrl) {
        lines.push(
          "",
          "💳 تاکہ آپ کے انوائس کی رقم سیدھا آپ کے بینک اکاؤنٹ میں جائے جیسے ہی کسٹمر ادائیگی کرے، اسے یہاں سے جوڑیں (3 منٹ، ایک بار، اختیاری):",
          connectUrl
        );
      }
      return lines.join("\n");
    },
    invoice: (invoice, pageUrl) => {
      const amountLine = invoice.amount != null ? `💰 رقم: ${invoice.amount} ${invoice.currency || ""}`.trim() : "💰 رقم: (واضح نہیں، ڈیش بورڈ سے درست کریں)";
      const customerLine = invoice.customer_name ? `👤 کسٹمر: ${invoice.customer_name}` : "👤 کسٹمر: (نامعلوم)";
      const lines = [
        "✅ آپ کا انوائس تیار ہے:",
        "",
        customerLine,
        `📝 تفصیل: ${invoice.description || "-"}`,
        amountLine,
        "",
        `🧾 آپ کے کسٹمر کے لیے انوائس اور پیمنٹ لنک: ${pageUrl}`,
        "",
        "یہ کاپی کریں اور اپنے کسٹمر کو بھیجیں، یا ڈیش بورڈ سے دیکھیں۔",
      ];
      return lines.join("\n");
    },
    dashboardLine: (url) => `📊 آپ کا ڈیش بورڈ (لاگ ان کی ضرورت نہیں): ${url}`,
    linkSuccess: "آپ کا نمبر کامیابی سے جڑ گیا ✅\n\nاب کام کی تفصیل، کسٹمر کا نام (اختیاری)، اور رقم کے ساتھ ایک وائس میسج یا ٹیکسٹ بھیجیں۔",
    voiceNoOpenAI: "وائس میسجز کے لیے ہمارے سسٹم پر ٹرانسکرپشن فعال ہونا ضروری ہے۔ تب تک براہ کرم تفصیلات لکھیں: کسٹمر کا نام، تفصیل، اور رقم۔",
    voiceFailed: "یہ وائس میسج سمجھ نہیں آیا۔ دوبارہ بھیجیں یا تفصیلات لکھیں۔",
    emptyPrompt: "کام کی تفصیلات کے ساتھ ایک وائس میسج یا ٹیکسٹ بھیجیں (کسٹمر کا نام، تفصیل، اور رقم)۔",
    unexpectedError: "کچھ غلط ہو گیا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔",
    paymentReceived: (who, amount, currency) => `💰 ادائیگی موصول ہوئی! ${who} نے ${amount} ${currency} کا انوائس ادا کیا`.trim(),
    payoutArrived: (amount, currency) => `✅ آپ کا بینک ٹرانسفر پہنچ گیا! رقم: ${amount} ${currency}`.trim(),
    payoutFailed: (amount, currency) => `⚠️ ${amount} ${currency} کا بینک ٹرانسفر ناکام ہو گیا۔ Stripe میں اپنی بینک تفصیلات چیک کریں یا سپورٹ سے رابطہ کریں۔`.trim(),
    reminder: (who, amount, days) => `⏰ یاد دہانی: انوائس "${who}" بمبلغ ${amount} ${days} دن سے زیادہ سے ادا نہیں ہوا۔ پیروی کرنا چاہیں گے؟`,
    connectBankAccount: (connectUrl) => {
      if (!connectUrl) return "";
      return `\n\n💳 تاکہ آپ کے انوائس کی رقم سیدھا بینک اکاؤنٹ میں جائے، یہاں سے جوڑیں (3 منٹ، ایک بار):\n${connectUrl}`;
    },
  },
};

function t(lang) {
  return BOT_MESSAGES[lang] || BOT_MESSAGES.ar;
}

// نصوص صفحة الفاتورة العامة (يشوفها الزبون النهائي بالمتصفح، مو الحرفي بواتساب)
const PAGE_TEXT = {
  ar: {
    dir: "rtl",
    htmlLang: "ar",
    pageTitle: "فاتورة",
    fromLabel: "من",
    toLabel: "إلى",
    invoiceLabel: "فاتورة خدمة",
    descriptionHeader: "الوصف",
    amountHeader: "المبلغ",
    totalLabel: "الإجمالي",
    paidStatus: "مدفوعة",
    unpaidStatus: "غير مدفوعة",
    unknownCustomer: "زبون",
    defaultService: "خدمة",
    serviceProvider: "مزوّد الخدمة",
    voiceTag: "🎙️ سُجّلت من رسالة صوتية",
    payNow: "ادفع الآن",
    paidNote: "✅ تم استلام الدفع، شكراً لك",
    payHint: "دفع آمن عبر بطاقة فيزا / ماستركارد",
    noPaymentLink: (name) => `رابط الدفع غير متوفر لهذي الفاتورة حالياً. تواصل مباشرة مع ${name}.`,
    footer: "صادرة عبر سند",
    unknownAmount: "؟",
  },
  en: {
    dir: "ltr",
    htmlLang: "en",
    pageTitle: "Invoice",
    fromLabel: "From",
    toLabel: "To",
    invoiceLabel: "Service Invoice",
    descriptionHeader: "Description",
    amountHeader: "Amount",
    totalLabel: "Total",
    paidStatus: "Paid",
    unpaidStatus: "Unpaid",
    unknownCustomer: "Customer",
    defaultService: "Service",
    serviceProvider: "Service Provider",
    voiceTag: "🎙️ Recorded from a voice message",
    payNow: "Pay Now",
    paidNote: "✅ Payment received, thank you",
    payHint: "Secure payment via Visa / Mastercard",
    noPaymentLink: (name) => `A payment link isn't available for this invoice yet. Please contact ${name} directly.`,
    footer: "Issued via Sanad",
    unknownAmount: "?",
  },
  ur: {
    dir: "rtl",
    htmlLang: "ur",
    pageTitle: "انوائس",
    fromLabel: "کی طرف سے",
    toLabel: "بنام",
    invoiceLabel: "سروس انوائس",
    descriptionHeader: "تفصیل",
    amountHeader: "رقم",
    totalLabel: "کل رقم",
    paidStatus: "ادا شدہ",
    unpaidStatus: "غیر ادا شدہ",
    unknownCustomer: "کسٹمر",
    defaultService: "سروس",
    serviceProvider: "سروس فراہم کنندہ",
    voiceTag: "🎙️ وائس میسج سے ریکارڈ کیا گیا",
    payNow: "ابھی ادائیگی کریں",
    paidNote: "✅ ادائیگی موصول ہو گئی، شکریہ",
    payHint: "ویزا / ماسٹرکارڈ کے ذریعے محفوظ ادائیگی",
    noPaymentLink: (name) => `اس انوائس کے لیے ابھی پیمنٹ لنک دستیاب نہیں۔ براہ راست ${name} سے رابطہ کریں۔`,
    footer: "سند کے ذریعے جاری کیا گیا",
    unknownAmount: "؟",
  },
};

// يقرأ ترويسة Accept-Language اللي يرسلها المتصفح تلقائياً (تعكس لغة الجهاز غالباً) ويرجع أقرب لغة مدعومة
function detectPageLanguage(acceptLanguageHeader) {
  if (!acceptLanguageHeader) return "ar";
  const primary = acceptLanguageHeader.split(",")[0].trim().toLowerCase();
  if (primary.startsWith("en")) return "en";
  if (primary.startsWith("ur")) return "ur";
  return "ar";
}

function pageText(lang) {
  return PAGE_TEXT[lang] || PAGE_TEXT.ar;
}

module.exports = { detectLanguage, t, detectPageLanguage, pageText };
