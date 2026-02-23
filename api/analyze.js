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

    // 1. ตรวจสอบคำต้องห้ามแบบตรงๆ ก่อน ถ้าเจอให้คะแนน 0 ทันที ไม่ต้องเรียก AI
    const foundForbiddenWord = FORBIDDEN.find(word => userInput.includes(word));
    if (foundForbiddenWord) {
        return res.status(200).json({
            score: 0,
            tone: "Aggressive",
            summary: `**ตรวจพบคำต้องห้าม:** การใช้คำว่า "${foundForbiddenWord}" จะสร้างผลกระทบเชิงลบอย่างรุนแรงต่อความรู้สึกของผู้ฟัง และทำให้สถานการณ์วิกฤตแย่ลง`,
            pros: [],
            cons: [
                `หลีกเลี่ยงการสื่อสารที่สื่อถึง "${foundForbiddenWord}" เด็ดขาด`,
                "ขาดความเห็นอกเห็นใจ (Empathy) และสร้างแรงกดดันโดยไม่จำเป็น"
            ],
            comparison_table: [
                {
                    aspect: "การจัดการอารมณ์และเจตนา",
                    original: userInput,
                    better: "ควรเน้นการแสดงความเข้าใจ มุ่งหาทางออกร่วมกัน และให้ความสำคัญกับความปลอดภัย/ความรู้สึกของอีกฝ่ายเป็นหลัก"
                }
            ]
        });
    }

    // 2. ถ้าไม่เจอคำตรงๆ ให้ AI วิเคราะห์เชิงลึกตามหลักจิตวิทยา
    try {
        const prompt = `คุณคือ AI ที่ปรึกษาอาวุโสด้าน Crisis Communication และนักจิตวิทยาองค์กร
สถานการณ์: "${currentSituation}"
คำพูดผู้ใช้งาน: "${userInput}"
คำที่ต้องระวังเป็นพิเศษ: [${FORBIDDEN.join(', ')}]

งานของคุณคือวิเคราะห์ข้อความนี้ตามหลักจิตวิทยาการสื่อสาร:
1. ประเมินความเห็นอกเห็นใจ (Empathy) และ ความสามารถในการแก้ปัญหา (Solution-Oriented)
2. **การให้คะแนน (0-100)**: ประเมินอย่างยุติธรรม ไม่กดคะแนนจนต่ำเกินไป หากผู้ใช้มีความตั้งใจที่ดีแต่ใช้คำพูดไม่สละสลวย ให้หักคะแนนเพียงเล็กน้อย
3. หากพบเจตนาที่สื่อความหมายอ้อมๆ ไปในทางคำที่ต้องระวัง ให้หักคะแนนตามสัดส่วนความรุนแรง (ไม่จำเป็นต้องให้ 0 ทันที)
4. ประเมิน Tone (เลือก 1 อย่าง): Aggressive, Professional, Passive, Neutral

ส่งข้อมูลกลับมาเป็น JSON FORMAT ตามโครงสร้างด้านล่างนี้เท่านั้น ห้ามพิมพ์อารัมภบท:
{
  "score": (ตัวเลขคะแนน 0-100),
  "tone": "เลือกคำเดียว: Aggressive, Professional, Passive, Neutral",
  "summary": "สรุปผลกระทบเชิงจิตวิทยาต่อผู้ฟัง (ใช้ ** เพื่อทำตัวหนาได้)",
  "pros": [
    "ข้อดีที่ 1 (เช่น การแสดงความเป็นห่วง)",
    "ข้อดีที่ 2"
  ],
  "cons": [
    "ข้อเสีย หรือจุดที่อาจทำให้ผู้ฟังรู้สึกไม่ดี",
    "จุดที่ควรปรับปรุง"
  ],
  "comparison_table": [
    {
      "aspect": "มิติที่วิเคราะห์ (เช่น ความเห็นอกเห็นใจ หรือ ความชัดเจน)",
      "original": "คำพูดเดิมของผู้ใช้",
      "better": "คำพูดที่แนะนำ ควรพูดอย่างไรให้ดีขึ้นและรักษาน้ำใจ"
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
                    temperature: 0.5, // ปรับให้ AI มีความยืดหยุ่นในการประเมิน ไม่ตึงเกินไป
                    response_mime_type: "application/json"
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