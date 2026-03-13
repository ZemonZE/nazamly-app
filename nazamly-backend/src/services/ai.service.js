// src/services/ai.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize AI (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extracts schedule data strictly using Google Gemini.
 * Includes robust JSON extraction and RTL table mapping.
 */
const extractScheduleFromImages = async (files) => {
    // 1. Upgraded Prompt: RTL Column Anchoring to prevent misalignment
    const prompt = `
     Analyze this Arabic university schedule image.  
     CRITICAL INSTRUCTIONS FOR RTL TABLE READING:
     The table is in Arabic and reads from RIGHT TO LEFT. Map the columns EXACTLY as follows, starting from the FAR RIGHT:
     - Column 1 (Far Right): "الترم" (Term) -> IGNORE
     - Column 2: "اليوم" (Day Number) -> STRICTLY MAP: 1=Saturday, 2=Sunday, 3=Monday, 4=Tuesday, 5=Wednesday, 6=Thursday.
     - Column 3: "من" (Start Time) -> 24h format (HH:MM)
     - Column 4: "الي" (End Time) -> 24h format (HH:MM)
     - Column 5: "المكان" (Location) -> Extract exactly as written (e.g. "مدرج أ", "معمل 1")
     - Column 6: "ك المقرر" (Course Code) -> e.g., "س407", "س402"
     - Column 7: "المجموعة" (Group) -> Extract exactly as written (e.g. "مجموعة 1", "G1")
     - Column 8: "ن الدراسة" (Type) -> "ن/ان" = "Lecture", "ع/ت/ات" = "Section"
    
     RULES:
     - DO NOT SUMMARIZE. Extract EVERY SINGLE course session visible.
     - Ensure you specifically look for course 402.
     - Return ONLY a valid JSON array of objects. NO conversational text.
     Schema: [{"courseCode": "", "type": "", "dayOfWeek": "", "startTime": "", "endTime": "", "location": "", "group": ""}]
  `;

    try {
        console.log(`📤 Dispatching request to Gemini Flash...`);
        
        // Recommended to use explicit model version
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); 
        
        const geminiImageParts = files.map(file => ({
            inlineData: { data: file.buffer.toString("base64"), mimeType: file.mimetype }
        }));

        const result = await geminiModel.generateContent([prompt, ...geminiImageParts]);
        const responseText = result.response.text();
        
        // 2. Bulletproof JSON Extraction (Ignores outside text)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
            throw new Error("Model did not return a valid JSON array structure.");
        }

        const cleanedText = jsonMatch[0].trim();
        
        console.log(`🤖 SUCCESS! Data extracted and parsed safely.`);
        
        return {
            extractedData: JSON.parse(cleanedText),
            usedModel: "Google Gemini 1.5 Flash"
        };

    } catch (error) {
        console.error(`❌ Gemini failed to process the images: ${error.message}`);
        
        // Basic error translation for the controller
        if (error.message.includes('429')) {
            throw new Error('AI Service is currently overloaded (Rate Limit). Please try again in a few seconds.');
        }
        
        throw new Error(`AI Extraction Failed: ${error.message}`);
    }
};

module.exports = { extractScheduleFromImages };