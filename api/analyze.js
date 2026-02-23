export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'ห้ามเข้า' });

    const { text: userInput, situation, forbiddenWords } = req.body;
    const apiKey = (process.env.GOOGLE_API_KEY || "").replace(/['"]/g, '').trim();
    
    if (!apiKey) return res.status(500).json({ error: "ไม่พบ API Key ในระบบ" });
    if (!userInput) return res.status(400).json({ error: "ลืมพิมพ์ข้อความหรือเปล่าครับ?" });

    const forbiddenList = (forbiddenWords || []).filter(w => w).join(', ');

    // สั่ง AI ให้ใส่ "อิโมจิ" และเขียนให้น่าอ่าน (Scannable)
    const prompt = `
        คุณคือ AI ผู้เชี่ยวชาญด้านการสื่อสารและการเจรจาต่อรอง (Communication Guru 🚀)
        
        สถานการณ์วิกฤต: "${situation || "ทั่วไป"}"
        สิ่งที่ผู้ใช้อยากสื่อสาร: "${userInput}"
        คำต้องห้าม/เจตนาลบ: [${forbiddenList}]
        
        กติกาการวิเคราะห์:
        1. หากเจอคำต้องห้าม ให้คะแนน 0 ทันที
        2. วิเคราะห์ด้วยความละเมียดละไม ใส่ "อิโมจิ" ที่เหมาะสมในบทสรุปและจุดเด่น/จุดด้อย
        3. สรุปผลให้อ่านง่าย กระชับ แต่มีพลัง (High Scannability)
        4. ตอบกลับเป็น JSON เท่านั้น
        
        โครงสร้าง JSON:
        {
          "score": (ตัวเลข 0-100),
          "tone": "Professional | Aggressive | Passive | Neutral",
          "summary": "บทสรุปสั้นๆ ประมาณ 2-3 ประโยค พร้อมอิโมจิ (ใช้ ** เพื่อทำตัวหนา)",
          "pros": ["ข้อดีที่ 1 พร้อมอิโมจิ", "ข้อดีที่ 2..."],
          "cons": ["จุดที่ควรปรับปรุง พร้อมอิโมจิ", "..."],
          "comparison_table": [
            {
              "aspect": "หัวข้อวิเคราะห์",
              "original": "ข้อความเดิม",
              "better": "ข้อความแนะนำที่มืออาชีพกว่า (พร้อมอิโมจิประกอบ ✨)"
            }
          ]
        }
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!response.ok) throw new Error("AI ขัดข้อง ลองใหม่อีกครั้ง");

        const data = await response.json();
        const result = JSON.parse(data.candidates[0].content.parts[0].text);

        return res.status(200).json({
            score: result.score ?? 0,
            tone: result.tone ?? "Neutral",
            summary: result.summary ?? "วิเคราะห์เรียบร้อยครับ 👌",
            pros: result.pros || [],
            cons: result.cons || [],
            comparison_table: result.comparison_table || []
        });

    } catch (error) {
        return res.status(500).json({ error: "เกิดข้อผิดพลาดในการประมวลผล AI" });
    }
}