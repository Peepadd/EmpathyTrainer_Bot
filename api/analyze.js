export const config = {
    runtime: 'edge', // รันบน Edge เพื่อเอาเวลา 25 วินาที
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        const body = await req.json();
        const { text, audio, mimeType } = body;
        
        if (!text && !audio) {
            return new Response(JSON.stringify({ error: 'ไม่พบข้อความหรือไฟล์เสียง' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const prompt = `คุณคือระบบ AI วิเคราะห์การสื่อสารในภาวะวิกฤต
        สถานการณ์: เพื่อนหายตอนใกล้ส่งงานกลุ่ม พรุ่งนี้พรีเซนต์
        
        ⚠️ กฎการตอบ:
        1. ให้คะแนนความมืออาชีพ 0-100 (ระบุ SCORE: [ตัวเลข])
        2. ระบุอารมณ์เด่นเพียง 1 อย่าง (ระบุ TONE: [Aggressive/Professional/Passive/Neutral])
        3. สรุปวิเคราะห์และตารางเปรียบเทียบสั้นๆ
        
        * หากได้รับไฟล์เสียง: ให้ถอดความ (Transcript) สิ่งที่ผู้ใช้พูดออกมา และวิเคราะห์ระดับความเป็นมืออาชีพจาก "น้ำเสียง (Tone of voice)" ประกอบด้วย

        ตัวอย่างการขึ้นต้น:
        SCORE: 85
        TONE: Professional
        ### 📊 ผลการวิเคราะห์...`;

        // จัดเตรียมรูปแบบข้อมูลเพื่อส่งไปหา Google โดยตรง (ไม่ผ่าน SDK)
        let parts = [{ "text": prompt }];

        if (audio) {
            let cleanMimeType = "audio/webm"; 
            if (mimeType && mimeType.includes('/')) {
                cleanMimeType = mimeType.split(';')[0].trim().toLowerCase();
            }

            parts.push({
                "inline_data": {
                    "mime_type": cleanMimeType,
                    "data": audio
                }
            });
            parts.push({ "text": "กรุณาวิเคราะห์ไฟล์เสียงและน้ำเสียงนี้อย่างละเอียด" });
        } else {
            parts.push({ "text": `ข้อความที่ต้องการวิเคราะห์: "${text}"` });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // 🚀 ใช้ fetch พื้นฐานคุยกับ Google API โดยตรง (Edge รองรับ 100%)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: parts }]
            })
        });

        const data = await response.json();

        // จัดการกรณี Google ส่ง Error กลับมา
        if (!response.ok) {
            console.error("Gemini API Error:", data);
            const errMsg = data.error?.message || "เกิดข้อผิดพลาดจากฝั่ง Google API";
            const status = (errMsg.includes('429') || response.status === 429) ? 429 : 500;
            return new Response(JSON.stringify({ error: errMsg }), { 
                status: status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ดึงข้อความตอบกลับจากโครงสร้าง JSON ของ Google
        const responseText = data.candidates[0].content.parts[0].text;

        return new Response(JSON.stringify({ text: responseText }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("🚨 Edge Fetch Error:", error);
        return new Response(JSON.stringify({ error: error.message || "ระบบขัดข้อง กรุณาลองใหม่" }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}