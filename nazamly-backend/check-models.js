// check-models.js
require('dotenv').config();

async function checkMyModels() {
    console.log("🔍 Fetching available models from Google...");
    
    // تأكد إن اسم المتغير هنا هو نفس اللي إنت كاتبه في الـ .env عندك
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; 
    
    if (!apiKey) {
        console.error("❌ API Key is missing in .env!");
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.error("❌ Google API Error:", data.error.message);
            return;
        }

        console.log("✅ Models you have access to:");
        // هنفلتر عشان نجيب عيلة Gemini بس اللي بتدعم الـ generateContent
        const geminiModels = data.models
            .filter(m => m.name.includes("gemini"))
            .map(m => m.name.replace('models/', '')); // بنشيل كلمة models/ عشان تاخد الاسم نضيف
            
        console.log(geminiModels);
    } catch (error) {
        console.error("❌ Network Error:", error);
    }
}

checkMyModels();