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

    const currentSituation = situation || "เพื่อนในกลุ่มหายตัวไป ไม่อ่านไลน์ พรุ่งนี้มีพรีเซนต์";

    try {
        const prompt = `คุณคือระบบ AI วิเคราะห์ทักษะการสื่อสารในภาวะวิกฤต 
สถานการณ์: [${currentSituation}]
คำพูดผู้เล่น: "${userInput}"
คำต้องห้าม หรือ เจตนาที่ห้ามสื่อสาร: [${FORBIDDEN.join(', ')}]

งานของคุณ:
1. ตรวจสอบว่าคำพูดผู้เล่นมี "คำต้องห้าม" หรือ "มีบริบทความหมายเชิงลบเหมือนคำต้องห้าม" หรือไม่ ถ้ามีให้ประเมินเป็นล้มเหลวทันที (score=0, tone=Aggressive)
2. หากไม่มีเจตนาต้องห้าม ให้ประเมินความเป็นมืออาชีพ (0-100)
3. วิเคราะห์ข้อดีและข้อเสีย และสร้างตารางเปรียบเทียบระหว่าง "คำพูดเดิม" กับ "คำพูดที่แนะนำ (Best Practice)"
4. ระบุอารมณ์เด่นของประโยคเป็นภาษาอังกฤษ (Aggressive/Professional/Passive/Neutral)

บังคับตอบกลับเป็นรูปแบบ JSON (ไม่ต้องมี Markdown ครอบ JSON) โครงสร้างดังนี้:
{
  "score": ตัวเลข (0-100),
  "tone": "Aggressive หรือ Professional หรือ Passive หรือ Neutral",
  "report": "ข้อความอธิบายผลการวิเคราะห์ จัดรูปแบบด้วย Markdown (ใช้ Emoji ได้)"
}`;

        // เปลี่ยนเป็นเวอร์ชัน 1.5-flash ที่มีความเสถียรสำหรับ JSON Structure
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

        // Parse JSON ที่ AI ส่งกลับมา
        const resultText = data.candidates[0].content.parts[0].text;
        const resultJson = JSON.parse(resultText);

        return res.status(200).json(resultJson);

    } catch (error) {
        return res.status(500).json({ error: `AI Error: ${error.message}` });
    }
}