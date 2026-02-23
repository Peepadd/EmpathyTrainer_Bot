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
ลิสต์ความหมาย/เจตนาต้องห้าม: [${FORBIDDEN.join(', ')}]

งานของคุณ:
1. **สแกนเจตนาแอบแฝง:** ตรวจสอบว่าคำพูดของผู้ใช้มีความหมายเข้าข่ายเจตนาต้องห้ามหรือไม่ รวมถึง "การใช้สำนวนเลี่ยงความหมาย"
   - หากพบเจตนาดังกล่าว ให้ปรับคะแนนเป็น 0, Tone เป็น Aggressive พร้อมระบุคำที่พบในรายงาน
2. **หากปลอดภัย:** ประเมินการสื่อสารนี้ (0-100)
3. **บังคับส่งออกเป็น JSON เท่านั้น โครงสร้างดังนี้:**
{
  "score": ตัวเลข,
  "tone": "เลือก 1 อารมณ์ (Aggressive, Professional, Passive, Neutral)",
  "report": "ข้อความวิเคราะห์แบบ Markdown"
}

⚠️ กฎการเขียน report (สำคัญมาก):
- ต้องมีหัวข้อ ### 📊 รายงานผลการวิเคราะห์เชิงลึก
- **บังคับต้องสร้างตารางเปรียบเทียบด้วย Markdown ที่สมบูรณ์ 100%**
(ห้ามลืมบรรทัดขีดเส้นใต้ตาราง |---|---|---| เด็ดขาด มิฉะนั้นตารางหน้าเว็บจะพัง)

ตัวอย่างโครงสร้างที่ถูกต้อง:
| ประเด็น | คำพูดเดิม | คำพูดที่แนะนำ (Best Practice) |
|---|---|---|
| (เนื้อหา) | (เนื้อหา) | **(เนื้อหาตัวหนา)** |
| (เนื้อหา) | (เนื้อหา) | **(เนื้อหาตัวหนา)** |`;

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

        const rawText = data.candidates[0].content.parts[0].text;
        
        // ---------------------------------------------------------
        // ระบบ Self-Healing Code ป้องกัน AI พ่น JSON ผิดรูปแบบ
        // ---------------------------------------------------------
        let resultJson;
        try {
            resultJson = JSON.parse(rawText);
        } catch (parseError) {
            console.log("JSON Parse Failed, attempting self-healing...");
            try {
                const match = rawText.match(/\{[\s\S]*\}/);
                if (match) {
                    resultJson = JSON.parse(match[0]);
                } else {
                    throw new Error("No valid JSON structure found in AI response.");
                }
            } catch (regexError) {
                console.error("Self-healing failed:", regexError);
                return res.status(200).json({
                    score: 50,
                    tone: "Neutral",
                    report: "### ⚠️ ระบบพบข้อผิดพลาดชั่วคราว\n\nระบบ AI ตอบกลับมาในรูปแบบที่ไม่สามารถอ่านได้ (JSON Formatting Error) แต่เราได้บันทึกข้อมูลของคุณไว้แล้ว กรุณาลองวิเคราะห์ใหม่อีกครั้ง\n\n| สถานะ | สาเหตุ | การแก้ไข |\n|---|---|---|\n| ข้อผิดพลาด | AI Generate ผิดรูปแบบ | กดเริ่มวิเคราะห์ใหม่อีกครั้ง |"
                });
            }
        }

        if (resultJson.score === undefined || !resultJson.tone || !resultJson.report) {
            resultJson.score = resultJson.score || 0;
            resultJson.tone = resultJson.tone || "Neutral";
            resultJson.report = resultJson.report || "### ⚠️ เกิดข้อผิดพลาดในการดึงข้อมูลบางส่วน";
        }

        return res.status(200).json(resultJson);

    } catch (error) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes("high demand") || errMsg.includes("overloaded") || errMsg.includes("quota")) {
            return res.status(429).json({ error: "เซิร์ฟเวอร์ AI ทำงานหนักชั่วคราว retry in 15" });
        }
        return res.status(500).json({ error: `เกิดข้อผิดพลาด: ${error.message}` });
    }
}