export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text: userInput, situation, forbiddenWords } = req.body;
    
    let apiKey = process.env.GOOGLE_API_KEY || "";
    apiKey = apiKey.replace(/['"]/g, '').trim(); 

    if (!apiKey) return res.status(500).json({ error: "ไม่พบ API Key ในระบบหลังบ้าน" });
    if (!userInput) return res.status(400).json({ error: "กรุณากรอกข้อความ" });

    const FORBIDDEN = Array.isArray(forbiddenWords) && forbiddenWords.length > 0 
        ? forbiddenWords 
        : ['ขี้เกียจ', 'ภาระ'];

    const currentSituation = situation || "สถานการณ์ทั่วไป";

    try {
        const prompt = `คุณคือ AI ผู้เชี่ยวชาญด้านการสื่อสารในภาวะวิกฤต (Crisis Communication)
สถานการณ์: "${currentSituation}"
คำพูดผู้ใช้งาน: "${userInput}"
ลิสต์เจตนาต้องห้าม: [${FORBIDDEN.join(', ')}]

งานของคุณ:
1. วิเคราะห์คำพูด หากพบเจตนาต้องห้าม ให้หักคะแนนเป็น 0
2. หากปลอดภัย ประเมินความเป็นมืออาชีพ (0-100)
3. ส่งข้อมูลกลับมาเป็น JSON FORMAT ตามโครงสร้างด้านล่างนี้เท่านั้น ห้ามพิมพ์อย่างอื่นนอกกรอบ JSON

{
  "score": (ตัวเลขคะแนน 0-100),
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
                    response_mime_type: "application/json" // ล็อกให้ AI ส่งกลับมาเป็น JSON ชัวร์ๆ
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Google API Error");
        }

        const rawText = data.candidates[0].content.parts[0].text;
        
        let resultJson;
        try {
            resultJson = JSON.parse(rawText);
        } catch (parseError) {
            // ระบบช่วยซ่อม JSON อัตโนมัติ
            const match = rawText.match(/\{[\s\S]*\}/);
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

        // กันเหนียว กรณี AI ไม่ยอมเจนบางช่องมาให้
        resultJson.score = resultJson.score || 0;
        resultJson.tone = resultJson.tone || "Neutral";
        resultJson.summary = resultJson.summary || "ไม่มีบทสรุปเพิ่มเติม";
        resultJson.pros = Array.isArray(resultJson.pros) ? resultJson.pros : [];
        resultJson.cons = Array.isArray(resultJson.cons) ? resultJson.cons : [];
        resultJson.comparison_table = Array.isArray(resultJson.comparison_table) ? resultJson.comparison_table : [];

        return res.status(200).json(resultJson);

    } catch (error) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes("high demand") || errMsg.includes("overloaded") || errMsg.includes("quota")) {
            return res.status(429).json({ error: "เซิร์ฟเวอร์ AI ทำงานหนักชั่วคราว retry in 15" });
        }
        return res.status(500).json({ error: `เกิดข้อผิดพลาด: ${error.message}` });
    }
}