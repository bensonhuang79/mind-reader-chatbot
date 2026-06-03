// ============================================================
//  後端：藏金鑰、呼叫 Gemini、算 cosine 相似度
//  部署到 Vercel 後，前端用 fetch("/api/chat") 呼叫它
//  金鑰只存在伺服器的環境變數 GEMINI_API_KEY，不會外洩
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    return res.status(500).json({ error: "伺服器尚未設定 GEMINI_API_KEY 環境變數" });
  }

  // Vercel 通常會自動 parse JSON，但保險起見處理字串情況
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { message, history = [], prevPrediction = "" } = body || {};
  if (!message) return res.status(400).json({ error: "缺少 message" });

  try {
    const convo = history
      .map((m) => `${m.role === "user" ? "使用者" : "機器人"}：${m.content}`)
      .join("\n");

    // 1) 產生「回覆」與「對下一句的預判」（要求 Gemini 只回 JSON）
    const genPrompt =
      `你是一個中文聊天機器人。只輸出一個 JSON 物件，不要任何說明或 markdown 圍欄：\n` +
      `{"reply":"用朋友聊天的輕鬆口吻、繁體中文、1~2 句回覆使用者最新這句話",` +
      `"next_prediction":"預測使用者下一句最可能說的一句口語化繁體中文，不要解釋"}\n\n` +
      `===對話紀錄===\n${convo}\n\n` +
      `請針對使用者最新這句「${message}」輸出 JSON。`;

    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: genPrompt }] }],
          generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
        }),
      }
    );
    const genData = await genRes.json();
    const rawText = genData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const m = rawText.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { reply: rawText || "（沒有回覆）", next_prediction: "" };
    }

    // 2) 若有「上一回合的預判」，用 embedding 算真正的 cosine 相似度
    let similarity = null;
    if (prevPrediction) {
      const [e1, e2] = await Promise.all([embed(prevPrediction, KEY), embed(message, KEY)]);
      if (e1 && e2) similarity = Math.round(Math.max(0, cosine(e1, e2)) * 100);
    }

    return res.status(200).json({
      reply: parsed.reply || "（沒有回覆）",
      next_prediction: parsed.next_prediction || "",
      similarity,
    });
  } catch (e) {
    return res.status(500).json({ error: "伺服器錯誤：" + (e?.message || String(e)) });
  }
}

// 取得一句話的語意向量
async function embed(text, key) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "models/gemini-embedding-001", content: { parts: [{ text }] } }),
    }
  );
  const d = await r.json();
  return d?.embedding?.values || null;
}

// 餘弦相似度
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
