export default async function handler(req, res) {
    // รับเฉพาะคำสั่ง POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const userInput = req.body.text;
    const apiKey = process.env.GOOGLE_API_KEY; // กุญแจซ่อนอยู่ที่ Vercel

    if (!apiKey) return res.status(500).json({ error: "ไม่พบ API Key ในระบบหลังบ้าน" });
    if (!userInput) return res.status(400).json({ error: "กรุณากรอกข้อความ" });

    // 1. ตรวจคำต้องห้าม
    const FORBIDDEN = ['ขี้เกียจ', 'ภาระ'];
    for (let word of FORBIDDEN) {
        if (userInput.includes(word)) {
            return res.status(200).json({ 
                text: `🚨 ผิดกฎ\n\nพบคำต้องห้าม: [${word}]\nการสื่อสารล้มเหลว\n\n[จบการวิเคราะห์]` 
            });
        }
    }

    // 2. เรียกหา Gemini AI
    try {
        const prompt = `คุณคือระบบ AI วิเคราะห์ทักษะการสื่อสารในภาวะวิกฤต 
สถานการณ์: [เพื่อนในกลุ่มหายตัวไป ไม่อ่านไลน์ พรุ่งนี้มีพรีเซนต์]
คำพูดผู้เล่น: "${userInput}"
งานของคุณ: ประเมินความเป็นมืออาชีพ ให้คะแนน 0-100% พร้อมคำแนะนำ ตอบเป็นภาษาไทย ปิดท้ายด้วย [จบการวิเคราะห์] ห้ามชวนคุย`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Google API Error");
        }

        const report = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text: report });

    } catch (error) {
        return res.status(500).json({ error: `AI Error: ${error.message}` });
    }
}
