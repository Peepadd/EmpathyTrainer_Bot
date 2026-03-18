# 🚀 CommCraft
**AI-Powered Crisis Communication Analysis System**

เครื่องมือวิเคราะห์ประสิทธิภาพการสื่อสารในภาวะวิกฤตโดยใช้ AI เพื่อประเมินทักษะการแก้ปัญหา น้ำเสียง และความเป็นมืออาชีพ พร้อมให้คำแนะนำเพื่อการพัฒนาทักษะ Soft Skills

---

## ✨ คุณสมบัติเด่น (Key Features)

* **📊 Interactive Dashboard**: แสดงผลคะแนนความเป็นมืออาชีพผ่าน Gauge Chart ที่ลื่นไหล
* **🔴 Emotional Tone Detection**: ระบบตรวจจับอารมณ์และน้ำเสียง (Aggressive, Professional, Passive) พร้อมเปลี่ยนธีมสีตามอารมณ์ที่ตรวจพบ
* **📝 Smart Analysis Table**: ตารางเปรียบเทียบคำพูดเดิมกับคำแนะนำ (Best Practice) เพื่อการเรียนรู้ที่ชัดเจน
* **📜 History Tracking**: บันทึกประวัติการวิเคราะห์ล่าสุด 5 รายการไว้ในเครื่อง (Local Storage) เรียกดูย้อนหลังได้ทันที
* **📸 Export to Image**: ฟังก์ชันบันทึกผลการวิเคราะห์เป็นรูปภาพ PNG คุณภาพสูงสำหรับแชร์หรือเก็บเป็นผลงาน
* **📱 Fully Responsive**: ออกแบบมาให้รองรับการใช้งานบนมือถือ และ iPad (Safari Optimized) อย่างสมบูรณ์

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend**: HTML5, Tailwind CSS (Styling), JavaScript (ES6+)
* **AI Engine**: Google Gemini API (via Vercel Serverless Functions)
* **Libraries**: 
    * [Marked.js](https://marked.js.org/) (Markdown Parsing)
    * [html2canvas](https://html2canvas.hertzen.com/) (Screenshot/Export Image)
    * [Google Fonts](https://fonts.google.com/) (Prompt Font)

---

## 📖 วิธีการใช้งาน

1.  อ่านสถานการณ์วิกฤตที่ได้รับใน **Mission Briefing**
2.  พิมพ์ข้อความที่คุณต้องการจะสื่อสารลงในช่อง **Data Input**
3.  กดปุ่ม **"วิเคราะห์ประสิทธิภาพการสื่อสาร"** และรอ AI ประมวลผล
4.  ศึกษาผลคะแนน คำแนะนำ และลองเปรียบเทียบกับคำพูดในตาราง
5.  กดบันทึกเป็นรูปภาพเพื่อเก็บไว้ดูพัฒนาการของตนเอง

---

## 🛡️ ความปลอดภัย (Privacy & Security)

* ระบบมีการจัดการ API Key ผ่าน Server-side (Vercel Functions) เพื่อความปลอดภัย
* ประวัติการวิเคราะห์จะถูกเก็บไว้ที่เครื่องของผู้ใช้ (Local Storage) เท่านั้น ไม่มีการบันทึกข้อมูลส่วนตัวลงบนเซิร์ฟเวอร์

---

**Developed by [Peepadd] "Developed with the assistance of AI"** *Project for Empathy & Professional Communication Training*