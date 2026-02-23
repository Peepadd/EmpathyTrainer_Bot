/**
 * ระบบวิเคราะห์คำพูดด้วย AI (Refactored)
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'ห้ามเข้าถึงโดยตรง' });

    const { text: userInput, situation, forbiddenWords } = req.body;
    
    // ดึงและทำความสะอาด API Key
    const apiKey = (process.env.GOOGLE_API_KEY || "").replace(/['"]/g, '').trim();
    if (!apiKey) return res.status(500).json({ error: "การตั้งค่าระบบไม่สมบูรณ์: ไม่พบ API Key" });
    if (!userInput) return res.status(400).json({ error: "กรุณากรอกข้อความที่ต้องการวิเคราะห์" });

    const forbiddenList = (forbiddenWords || []).filter(w => w).join(', ');

    // สั่ง AI เป็นภาษาไทยเพื่อให้ได้ผลลัพธ์ที่เป็นธรรมชาติตามบริบทสังคมไทย
    const prompt = `
        คุณคือ AI ผู้เชี่ยวชาญด้านการสื่อสารและการแก้ไขความขัดแย้ง (Crisis Communication Specialist)
        
        สถานการณ์ที่เกิดขึ้น: "${situation || "สถานการณ์ทั่วไป"}"
        ข้อความที่ผู้ใช้ตอบโต้: "${userInput}"
        คำต้องห้าม/เจตนาต้องห้าม: [${forbiddenList}]
        
        กติกาการวิเคราะห์:
        1. หากพบคำต้องห้าม หรือมีเจตนาตามลิสต์ ให้คะแนน score เป็น 0 ทันที
        2. ประเมินคะแนนความเป็นมืออาชีพ ความเห็นอกเห็นใจ และความชัดเจน (0-100)
        3. ระบุโทนเสียง (Tone): Professional, Aggressive, Passive, หรือ Neutral
        4. ตอบกลับเป็นรูปแบบ JSON เท่านั้น ห้ามพิมพ์ข้อความอื่นนอกเหนือจาก JSON
        
        รูปแบบ JSON ที่ต้องตอบกลับ:
        {
          "score": (ตัวเลข),
          "tone": "ชื่อโทนเสียงภาษาอังกฤษ",
          "summary": "บทสรุปสั้นๆ (ใช้ ** เพื่อทำตัวหนา)",
          "pros": ["ข้อดีที่ 1", "ข้อดีที่ 2"],
          "cons": ["จุดที่ควรแก้ที่ 1", "จุดที่ควรแก้ที่ 2"],
          "comparison_table": [
            {
              "aspect": "ประเด็นที่วิเคราะห์",
              "original": "ข้อความเดิมของผู้ใช้",
              "better": "ข้อความแนะนำที่ดูดีกว่า"
            }
          ]
        }
    `;

    try {
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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Gemini API Error");
        }

        const data = await response.json();
        const result = JSON.parse(data.candidates[0].content.parts[0].text);

        // ส่งผลลัพธ์กลับไปยังหน้าเว็บ
        return res.status(200).json({
            score: result.score ?? 0,
            tone: result.tone ?? "Neutral",
            summary: result.summary ?? "วิเคราะห์ข้อมูลเรียบร้อย",
            pros: result.pros || [],
            cons: result.cons || [],
            comparison_table: result.comparison_table || []
        });

    } catch (error) {
        console.error("API Error:", error);
        const isQuotaError = error.message.includes("quota") || error.message.includes("429");
        return res.status(500).json({ 
            error: isQuotaError ? "AI กำลังทำงานหนักเกินไป กรุณารอสัก 15 วินาทีแล้วลองใหม่ครับ" : "เกิดข้อผิดพลาดในการวิเคราะห์: " + error.message 
        });
    }
}