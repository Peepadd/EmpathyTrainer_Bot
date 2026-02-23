import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'กรุณาส่งข้อความที่ต้องการวิเคราะห์ครับ' });
        }

        // 🔑 ใส่ API Key ของคุณที่นี่ (ถ้าตั้งใน Vercel แล้วใช้ process.env ได้เลย หรือจะใส่แบบ Hardcode ก็ได้ครับ)
        const apiKey = process.env.GEMINI_API_KEY; 
        
        const genAI = new GoogleGenerativeAI(apiKey);
        // ใช้ 1.5 Flash เพราะตอบโจทย์สายฟรีที่สุดและเร็วมาก
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `คุณคือระบบ AI วิเคราะห์การสื่อสารในภาวะวิกฤต
        สถานการณ์: เพื่อนหายตอนใกล้ส่งงานกลุ่ม พรุ่งนี้พรีเซนต์
        
        ⚠️ กฎการตอบ:
        1. ให้คะแนนความมืออาชีพ 0-100 (ระบุ SCORE: [ตัวเลข])
        2. ระบุอารมณ์เด่นเพียง 1 อย่าง (ระบุ TONE: [Aggressive/Professional/Passive/Neutral])
        3. สรุปวิเคราะห์และตารางเปรียบเทียบสั้นๆ

        ข้อความที่ต้องการวิเคราะห์: "${text}"
        
        ตัวอย่างการขึ้นต้น:
        SCORE: 85
        TONE: Professional
        ### 📊 ผลการวิเคราะห์...`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({ text: responseText });

    } catch (error) {
        console.error("🚨 Backend Error:", error);
        const errMsg = error.message || String(error);
        const status = (errMsg.includes('429') || errMsg.includes('quota')) ? 429 : 500;
        
        return res.status(status).json({ error: errMsg });
    }
}