import { GoogleGenerativeAI } from "@google/generative-ai";

// 🌟 กุญแจสำคัญ: เปลี่ยนมารันบน Edge (ได้เวลา 25 วินาที แทน 10 วินาที)
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // 1. ตรวจสอบ Method
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        // อ่านข้อมูลที่ส่งมาจากหน้าเว็บ
        const body = await req.json();
        const { text, audio, mimeType } = body;
        
        if (!text && !audio) {
            return new Response(JSON.stringify({ error: 'ไม่พบข้อความหรือไฟล์เสียง' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // 2. เรียกใช้งาน Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

        const parts = [{ text: prompt }];

        if (audio) {
            let cleanMimeType = "audio/webm"; 
            if (mimeType && mimeType.includes('/')) {
                cleanMimeType = mimeType.split(';')[0].trim().toLowerCase();
            }

            parts.push({
                inlineData: {
                    mimeType: cleanMimeType,
                    data: audio
                }
            });
            parts.push({ text: "กรุณาวิเคราะห์ไฟล์เสียงและน้ำเสียงนี้อย่างละเอียด" });
        } else {
            parts.push({ text: `ข้อความที่ต้องการวิเคราะห์: "${text}"` });
        }

        // 3. ส่งข้อมูลให้ AI ประมวลผล (ตอนนี้มีเวลา 25 วินาทีแล้ว!)
        const result = await model.generateContent(parts);
        const responseText = result.response.text();

        // 4. ส่งผลลัพธ์กลับไปให้หน้าเว็บ
        return new Response(JSON.stringify({ text: responseText }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("🚨 Edge Backend Error:", error);
        const errMsg = error.message || String(error) || "Unknown Error";
        const status = (errMsg.includes('429') || errMsg.includes('quota')) ? 429 : 500;
        
        return new Response(JSON.stringify({ error: errMsg }), { 
            status: status, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}