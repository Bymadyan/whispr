// دعم لغتين لمحادثة واتساب: نكتشف اللغة من نص رسالة المستخدم نفسها (واتساب/Twilio ما يعطينا لغة
// الجهاز مباشرة). أي نص فيه حرف عربي واحد على الأقل يُعتبر عربي، غير كذا إنجليزي.
// إضافة لغة جديدة لاحقاً = تضيف مفتاح جديد بـ BOT_MESSAGES وتوسّع detectLanguage.

function detectLanguage(text) {
  return /[؀-ۿ]/.test(text || "") ? "ar" : "en";
}

const BOT_MESSAGES = {
  ar: {
    welcome: (limit, connectUrl) => {
      const lines = [
        "أهلاً فيك! 👋 هذا بوت *سند* — يحوّل رسالتك الصوتية أو النصية لفاتورة جاهزة فوراً.",
        "",
        `أول ${limit} فواتير (ورابط الدفع فيها) مجانية بالكامل، بدون أي تسجيل.`,
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
    invoice: (invoice, remainingFree, pageUrl) => {
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
      if (remainingFree != null) {
        lines.push(remainingFree > 0 ? `\n🎁 باقي لك ${remainingFree} فاتورة مجانية.` : "\n🎁 هذي كانت آخر فاتورة من تجربتك المجانية.");
      }
      return lines.join("\n");
    },
    dashboardLine: (url) => `📊 لوحة تحكمك (بدون تسجيل دخول): ${url}`,
    paywall: (limit, checkoutLine) => `🎉 خلصت أول ${limit} فواتير مجانية!\n\nعشان تكمل تسوي فواتير غير محدودة وتستقبل تذكيرات التحصيل، ${checkoutLine}`,
    checkoutLineFallback: "تواصل معنا لتفعيل اشتراكك.",
    checkoutLineWithUrl: (url) => `اشترك بضغطة واحدة من هنا:\n${url}`,
    linkSuccess: "تم ربط رقمك بنجاح ✅\n\nالحين ابعت رسالة صوتية أو نصية توصف فيها الشغلة اللي سويتها، اسم الزبون (اختياري)، والمبلغ.",
    voiceNoOpenAI: "الرسائل الصوتية تحتاج تفعيل خدمة التحويل الصوتي على حسابنا. لحد ذاك، اكتب تفاصيل الشغلة نصياً: اسم الزبون، الوصف، والمبلغ.",
    voiceFailed: "ما قدرت أفهم الرسالة الصوتية. جرب ترسلها مرة ثانية أو اكتب التفاصيل نصياً.",
    emptyPrompt: "ابعت رسالة صوتية أو نصية فيها تفاصيل الشغلة (اسم الزبون، الوصف، والمبلغ).",
    unexpectedError: "صار خطأ غير متوقع، جرب مرة ثانية بعد شوي.",
  },

  en: {
    welcome: (limit, connectUrl) => {
      const lines = [
        "Hey! 👋 This is *Sanad* — it turns your voice note or text into a ready invoice instantly.",
        "",
        `Your first ${limit} invoices (with a payment link) are completely free, no sign-up needed.`,
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
    invoice: (invoice, remainingFree, pageUrl) => {
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
      if (remainingFree != null) {
        lines.push(remainingFree > 0 ? `\n🎁 ${remainingFree} free invoice(s) left.` : "\n🎁 That was your last free invoice.");
      }
      return lines.join("\n");
    },
    dashboardLine: (url) => `📊 Your dashboard (no login needed): ${url}`,
    paywall: (limit, checkoutLine) => `🎉 You've used your first ${limit} free invoices!\n\nTo keep creating unlimited invoices and get payment reminders, ${checkoutLine}`,
    checkoutLineFallback: "contact us to activate your subscription.",
    checkoutLineWithUrl: (url) => `subscribe with one click here:\n${url}`,
    linkSuccess: "Your number is linked ✅\n\nNow send a voice note or text describing the job you did, the customer's name (optional), and the amount.",
    voiceNoOpenAI: "Voice messages need voice transcription enabled on our end. Until then, please type the job details: customer name, description, and amount.",
    voiceFailed: "I couldn't understand that voice message. Try sending it again or type the details instead.",
    emptyPrompt: "Send a voice note or text with the job details (customer name, description, and amount).",
    unexpectedError: "Something went wrong. Please try again in a moment.",
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
};

// يقرأ ترويسة Accept-Language اللي يرسلها المتصفح تلقائياً (تعكس لغة الجهاز غالباً) ويرجع أقرب لغة مدعومة
function detectPageLanguage(acceptLanguageHeader) {
  if (!acceptLanguageHeader) return "ar";
  return /^en/i.test(acceptLanguageHeader.split(",")[0].trim()) ? "en" : "ar";
}

function pageText(lang) {
  return PAGE_TEXT[lang] || PAGE_TEXT.ar;
}

module.exports = { detectLanguage, t, detectPageLanguage, pageText };
