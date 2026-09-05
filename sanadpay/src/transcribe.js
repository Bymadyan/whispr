// يحوّل ملف صوتي (Buffer) إلى نص عربي عبر Whisper API من OpenAI.
// لو ما فيه OPENAI_API_KEY، يرمي خطأ واضح يتم التعامل معه في الراوت (نطلب من المستخدم يكتب نصياً).

async function transcribeAudio(buffer, contentType) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY غير مضبوط");
  }

  const extension = (contentType || "").includes("mpeg") ? "mp3" : "ogg";
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: contentType || "audio/ogg" }), `voice.${extension}`);
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`فشل تحويل الصوت إلى نص (${res.status}): ${text}`);
  }

  const data = await res.json();
  const text = (data.text || "").trim();
  if (!text) throw new Error("Whisper رجّع نص فاضي");
  return text;
}

module.exports = { transcribeAudio };
