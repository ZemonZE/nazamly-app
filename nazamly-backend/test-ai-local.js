// test-ai-local.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// بنعمل Import للدوال اللي Integrafy لسه كاتبها في الخطوات اللي فاتت
const { extractLectureConcepts, extractQuestionsFromExam } = require('./src/services/ai.service');

async function runLocalTest() {
    console.log("🚀 Starting Local AI Pipeline Test...");

    try {
        // 1. قراءة ملف الـ PDF من الجهاز مباشرة
        const pdfPath = path.join(__dirname, 'test.pdf');
        
        if (!fs.existsSync(pdfPath)) {
            console.error("❌ Error: Could not find 'test.pdf' in the root directory.");
            return;
        }

        const pdfBuffer = fs.readFileSync(pdfPath);
        console.log("📁 PDF loaded successfully from local machine. Size:", pdfBuffer.length, "bytes");

        // 2. اختبار استخراج مفاهيم المحاضرة
        console.log("\n⏳ [1/2] Testing Lecture Concept Extraction...");
        const lectureResult = await extractLectureConcepts(pdfBuffer);
        console.log("🟢 Success! Lecture Concepts JSON:");
        console.dir(lectureResult, { depth: null, colors: true });

        console.log("\n--------------------------------------------------\n");

        // 3. اختبار استخراج أسئلة الامتحان
        console.log("⏳ [2/2] Testing Exam Questions Extraction...");
        const examResult = await extractQuestionsFromExam(pdfBuffer);
        console.log("🟢 Success! Exam Questions Array:");
        console.dir(examResult, { depth: null, colors: true });

    } catch (error) {
        console.error("\n❌ Test Failed! Error details:");
        console.error(error.message || error);
    }
}

// تشغيل التيست
runLocalTest();