export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ─── [FIX] Server-side Rate Limiting via IP ───
    // Stores: { [ip]: lastRequestTimestamp }
    if (!global._rateLimitMap) global._rateLimitMap = {};
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const SERVER_RATE_LIMIT_MS = 8000; // 8 วินาที ต่อ IP

    if (global._rateLimitMap[ip] && now - global._rateLimitMap[ip] < SERVER_RATE_LIMIT_MS) {
        const retryAfter = Math.ceil((SERVER_RATE_LIMIT_MS - (now - global._rateLimitMap[ip])) / 1000);
        return res.status(429).json({ error: `⏱️ กรุณารอ ${retryAfter} วินาทีก่อนส่งคำขอใหม่ครับ` });
    }
    global._rateLimitMap[ip] = now;

    // Clean up old entries every 100 requests to prevent memory leak
    if (Object.keys(global._rateLimitMap).length > 100) {
        const cutoff = now - SERVER_RATE_LIMIT_MS * 2;
        for (const key in global._rateLimitMap) {
            if (global._rateLimitMap[key] < cutoff) delete global._rateLimitMap[key];
        }
    }

    // ─── [FIX] Input Sanitization to prevent Prompt Injection ───
    const rawText = req.body?.text;
    const rawSituation = req.body?.situation;
    const rawForbidden = req.body?.forbiddenWords;

    // Enforce length limits
    const userInput = typeof rawText === 'string' ? rawText.slice(0, 500).replace(/[`"\\]/g, '') : '';
    const situation = typeof rawSituation === 'string' ? rawSituation.slice(0, 200).replace(/[`"\\]/g, '') : 'สถานการณ์ทั่วไป';

    // Sanitize forbidden words array
    const FORBIDDEN = Array.isArray(rawForbidden)
        ? rawForbidden.slice(0, 20).map(w => String(w).slice(0, 50).replace(/[`"\\]/g, '')).filter(w => w !== '')
        : ['ขี้เกียจ', 'ภาระ'];

    let apiKey = process.env.GOOGLE_API_KEY || "";
    apiKey = apiKey.replace(/['"]/g, '').trim();

    if (!apiKey) return res.status(500).json({ error: "ไม่พบ API Key ในระบบหลังบ้าน" });
    if (!userInput) return res.status(400).json({ error: "กรุณากรอกข้อความ" });

    try {
        const prompt = `คุณคือ AI ผู้เชี่ยวชาญด้านการสื่อสารในภาวะวิกฤต (Crisis Communication)
สถานการณ์: "${situation}"
คำพูดผู้ใช้งาน: "${userInput}"
ลิสต์เจตนาต้องห้าม: [${FORBIDDEN.join(', ')}]

งานของคุณ:
1. วิเคราะห์คำพูด หากพบเจตนาต้องห้าม ให้หักคะแนนเป็น 0
2. หากปลอดภัย ประเมินความเป็นมืออาชีพ (0-100)
3. ส่งข้อมูลกลับมาเป็น JSON FORMAT ตามโครงสร้างด้านล่างนี้เท่านั้น ห้ามพิมพ์อย่างอื่นนอกกรอบ JSON

{
  "score": (ตัวเลขจำนวนเต็ม, บังคับเป็น 0 ทันทีถ้าพบเจตนาต้องห้าม),
  "tone": "เลือกคำเดียว: Aggressive, Professional, Passive, Neutral",
  "summary": "สรุปผลการวิเคราะห์สั้นๆ (ใช้ ** เพื่อทำตัวหนาได้)",
  "pros": [
    "ข้อดีข้อที่ 1 (ถ้ามี)",
    "ข้อดีข้อที่ 2"
  ],
  "cons": [
    "ข้อเสียข้อที่ 1 หรือจุดที่ควรปรับปรุง",
    "ข้อเสียข้อที่ 2"
  ],
  "comparison_table": [
    {
      "aspect": "ประเด็นที่วิเคราะห์ (เช่น การแสดงความรับผิดชอบ)",
      "original": "คำพูดเดิมของผู้ใช้",
      "better": "คำพูดที่แนะนำ ควรพูดอย่างไรให้ดีขึ้น"
    },
    {
      "aspect": "ประเด็นที่ 2",
      "original": "...",
      "better": "..."
    }
  ]
}
`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Google API Error");
        }

        const rawResultText = data.candidates[0].content.parts[0].text;

        let resultJson;
        try {
            resultJson = JSON.parse(rawResultText);
        } catch (parseError) {
            const match = rawResultText.match(/\{[\s\S]*\}/);
            if (match) {
                resultJson = JSON.parse(match[0]);
            } else {
                return res.status(200).json({
                    score: 50,
                    tone: "Neutral",
                    summary: "⚠️ ไม่สามารถประมวลผลรูปแบบข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
                    pros: [], cons: [], comparison_table: []
                });
            }
        }

        // Normalize output
        resultJson.score = typeof resultJson.score === 'number' ? Math.max(0, Math.min(100, Math.round(resultJson.score))) : 0;
        resultJson.tone = resultJson.tone || "Neutral";
        resultJson.summary = resultJson.summary || "ไม่มีบทสรุปเพิ่มเติม";
        resultJson.pros = Array.isArray(resultJson.pros) ? resultJson.pros : [];
        resultJson.cons = Array.isArray(resultJson.cons) ? resultJson.cons : [];
        resultJson.comparison_table = Array.isArray(resultJson.comparison_table) ? resultJson.comparison_table : [];

        return res.status(200).json(resultJson);

    } catch (error) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes("high demand") || errMsg.includes("overloaded") || errMsg.includes("quota") || errMsg.includes("429")) {
            return res.status(429).json({ error: "เซิร์ฟเวอร์ AI มีผู้ใช้งานจำนวนมากชั่วคราว กรุณารอสักครู่แล้วกดลองใหม่อีกครั้งครับ" });
        }
        return res.status(500).json({ error: `เกิดข้อผิดพลาด: ${error.message}` });
    }
}