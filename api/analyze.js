/**
 * Refactored Gemini Analysis API
 * Clean Code: Early returns, explicit types, and structured prompting.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { text: userInput, situation, forbiddenWords } = req.body;
    
    // 1. Backend Security Check
    const apiKey = (process.env.GOOGLE_API_KEY || "").replace(/['"]/g, '').trim();
    if (!apiKey) return res.status(500).json({ error: "System Configuration Error: Missing API Key" });
    if (!userInput) return res.status(400).json({ error: "Input text is required" });

    // 2. Prepare Context
    const forbiddenList = (forbiddenWords || []).filter(w => w).join(', ');
    const prompt = `
        Role: Specialist in Crisis Communication.
        Task: Analyze user's text based on the provided situation.
        
        Context:
        - Situation: "${situation || "General"}"
        - User's Message: "${userInput}"
        - Forbidden Keywords/Intent: [${forbiddenList}]
        
        Rules:
        1. If forbidden keywords are found, set score to 0.
        2. Evaluate "Professionalism", "Empathy", and "Clarity" (Score 0-100).
        3. Determine tone: Aggressive, Professional, Passive, or Neutral.
        4. Output strictly in JSON format.
        
        JSON Structure:
        {
          "score": number,
          "tone": "string",
          "summary": "markdown_string",
          "pros": ["string"],
          "cons": ["string"],
          "comparison_table": [{"aspect": "string", "original": "string", "better": "string"}]
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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Gemini API failure");
        }

        const data = await response.json();
        const result = JSON.parse(data.candidates[0].content.parts[0].text);

        // Sanitize and return
        return res.status(200).json({
            score: result.score ?? 0,
            tone: result.tone ?? "Neutral",
            summary: result.summary ?? "วิเคราะห์เสร็จสิ้น",
            pros: result.pros || [],
            cons: result.cons || [],
            comparison_table: result.comparison_table || []
        });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ 
            error: error.message.includes("quota") ? "AI Limit reached. Please try again later." : "Analysis failed." 
        });
    }
}