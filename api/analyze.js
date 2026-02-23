export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { text: userInput, situation, forbiddenWords } = req.body;
    const apiKey = (process.env.GOOGLE_API_KEY || "").replace(/['"]/g, '').trim();

    if (!apiKey) return res.status(500).json({ error: "API Key missing in environment variables." });
    if (!userInput) return res.status(400).json({ error: "กรุณาใส่ข้อความที่ต้องการวิเคราะห์" });

    const forbidden = Array.isArray(forbiddenWords) ? forbiddenWords.join(', ') : 'ขี้เกียจ, ภาระ';

    try {
        const prompt = `คุณคือผู้เชี่ยวชาญด้านจิตวิทยาการสื่อสารและการจัดการวิกฤต (Crisis Management Expert)
        วิเคราะห์ข้อความต่อไปนี้ภายใต้สถานการณ์: "${situation || 'ทั่วไป'}"
        ข้อความ: "${userInput}"
        เจตนาที่ต้องระวัง/คำต้องห้าม: [${forbidden}]

        เกณฑ์การวิเคราะห์:
        1. ให้คะแนน (score) 0-100 ตามความเหมาะสมและความเป็นมืออาชีพ
        2. หากพบเจตนาที่ตรงกับคำต้องห้าม ให้คะแนนเป็น 0 ทันที
        3. ตอบกลับในรูปแบบ JSON เท่านั้น:
        {
          "score": number,
          "tone": "Aggressive" | "Professional" | "Passive" | "Neutral",
          "summary": "บทวิเคราะห์เชิงลึก (ใช้ ** เพื่อเน้นคำ)",
          "pros": ["จุดแข็งที่พบ 1", "จุดแข็งที่พบ 2"],
          "cons": ["จุดที่ควรปรับปรุง 1", "จุดที่ควรปรับปรุง 2"],
          "comparison_table": [
            {"aspect": "หัวข้อ", "original": "สิ่งที่คุณพูด", "better": "คำแนะนำที่ควรพูด"}
          ]
        }`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Gemini Error");

        return res.status(200).json(JSON.parse(data.candidates[0].content.parts[0].text));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}