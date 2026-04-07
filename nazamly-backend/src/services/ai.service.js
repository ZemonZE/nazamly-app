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
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
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

/**
 * Extracts key academic concepts from a PDF lecture using Gemini's multimodal capabilities.
 * The PDF buffer is sent directly as base64 inline data — no OCR library required.
 *
 * @param {Buffer} pdfBuffer - The raw PDF file content as a Node.js Buffer.
 * @returns {{ extractedTextSummary: string, keywords: string[], keyConcepts: string[] }}
 */
const extractLectureConcepts = async (pdfBuffer) => {
    const prompt = `Analyze this academic lecture PDF. Extract the core academic concepts. Return ONLY a valid JSON object strictly matching this structure: { "extractedTextSummary": "A brief 3-sentence summary of the lecture", "keywords": ["keyword1", "keyword2"], "keyConcepts": ["concept1", "concept2"] }. Do not include markdown formatting like \`\`\`json.`;

    try {
        console.log('[AI Service] Sending PDF to Gemini for concept extraction...');
        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const pdfPart = {
            inlineData: {
                data: pdfBuffer.toString('base64'),
                mimeType: 'application/pdf',
            },
        };

        const MAX_RETRIES = 5;
        let result = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                result = await geminiModel.generateContent([prompt, pdfPart]);
                break; // Exit retry loop on success
            } catch (err) {
                if (attempt === MAX_RETRIES) throw err;
                console.warn(`[AI Service] Attempt ${attempt} failed: ${err.message}, retrying in 5s...`);
                await new Promise(res => setTimeout(res, 5000));
            }
        }

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Gemini did not return a valid JSON object for concept extraction.');
        }

        const parsed = JSON.parse(jsonMatch[0].trim());
        console.log('[AI Service] Concept extraction completed successfully.');
        return parsed;

    } catch (error) {
        console.error(`[AI Service] Concept extraction failed: ${error.message}`);
        if (error.message.includes('429') || error.message.includes('503')) {
            throw new Error('AI Service is currently overloaded (Rate Limit / Unavailable). Please try again later.');
        }
        throw new Error(`AI Concept Extraction Failed: ${error.message}`);
    }
};

/**
 * Extracts individual questions from an academic exam PDF and performs Zero-Shot
 * Semantic Classification to link each question to the most relevant LectureConcept.
 *
 * @param {Buffer} pdfBuffer - The raw exam PDF file content as a Node.js Buffer.
 * @param {string} examDetails - Metadata about the exam (year, type).
 * @param {Array} lectureConcepts - Array of object { materialFileId: ObjectId, extractedTextSummary: String }
 * @returns {Array<{ questionText: string, options: string[], correctAnswer: string, linkedLectureId: string|null }>}
 */
const parseExamAndLinkToLectures = async (pdfBuffer, examDetails = '', lectureConcepts = []) => {
    // Inject the available concepts into the prompt so Gemini can map them
    const conceptsPayload = JSON.stringify(lectureConcepts.map(c => ({
        materialFileId: c.materialFileId,
        summary: c.extractedTextSummary
    })));

    const prompt = `Analyze this academic exam PDF. ${examDetails} Extract all questions. 
    You are also provided with a list of available lecture concepts for this course: ${conceptsPayload}
    
    For each extracted question, determine which lecture concept it most likely belongs to based on semantic similarity.
    Return ONLY a valid JSON array of objects. Do NOT include markdown formatting.
    Each object MUST strictly match this structure: 
    { 
      "questionText": "The exact text of the question", 
      "options": ["Option A", "Option B", "Option C", "Option D"] (leave empty array if not multiple choice), 
      "correctAnswer": "The correct answer if identifiable from the document, otherwise an empty string",
      "linkedLectureId": "The exact materialFileId from the provided list that best matches the question, or null if no match is found."
    }`;

    try {
        console.log('[AI Service] Sending exam PDF to Gemini for smart extraction and linking...');

        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Encode the PDF buffer as base64 and pass it as inline multimodal data
        const pdfPart = {
            inlineData: {
                data: pdfBuffer.toString('base64'),
                mimeType: 'application/pdf',
            },
        };

        const generationConfig = {
            responseMimeType: "application/json"
        };

        const MAX_RETRIES = 3;
        let result = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                result = await geminiModel.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }, pdfPart] }],
                    generationConfig
                });
                break; // Exit retry loop on success
            } catch (err) {
                if (attempt === MAX_RETRIES) throw err;
                console.warn(`[AI Service] Attempt ${attempt} failed: ${err.message}, retrying in 5s...`);
                await new Promise(res => setTimeout(res, 5000));
            }
        }

        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);

        console.log(`[AI Service] Smart Question extraction completed successfully. Found ${parsed.length} questions.`);

        return parsed;
    } catch (error) {
        console.error(`[AI Service] Smart Question extraction failed: ${error.message}`);
        
        if (error.message.includes('429') || error.message.includes('503')) {
            throw new Error('AI Service is currently overloaded (Rate Limit / Unavailable). Please try again later.');
        }

        throw new Error(`AI Smart Extraction Failed: ${error.message}`);
    }
};

/**
 * Analyzes an array of exam questions to determine a professor's testing style.
 * Uses Gemini to identify patterns in question types, difficulty, and trick phrases.
 *
 * @param {Array} questionsArray - Array of question objects to analyze.
 * @returns {{ preferredQuestionTypes: string[], difficultyDistribution: object, trickPhrases: string[], averageQuestionLength: string }}
 */
const analyzeProfessorStyle = async (questionsArray) => {
    const prompt = `Analyze this array of exam questions to determine the professor's testing style. Return ONLY a valid JSON object matching this structure: { "preferredQuestionTypes": ["MCQ", "True/False", etc.], "difficultyDistribution": { "easy": 20, "medium": 50, "hard": 30 }, "trickPhrases": ["not true except", "all of the above", etc.], "averageQuestionLength": "short/medium/long" }. Do not include markdown formatting like \`\`\`json.`;

    try {
        console.log(`[AI Service] Analyzing professor style from ${questionsArray.length} questions...`);

        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Pass the questions array as a stringified text payload alongside the prompt
        const questionsPayload = JSON.stringify(questionsArray);

        const result = await geminiModel.generateContent([prompt, questionsPayload]);
        const responseText = result.response.text();

        // Extract the JSON object from the response, stripping any surrounding text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Gemini did not return a valid JSON object for style analysis.');
        }

        const parsed = JSON.parse(jsonMatch[0].trim());

        console.log('[AI Service] Professor style analysis completed successfully.');

        return parsed;
    } catch (error) {
        console.error(`[AI Service] Professor style analysis failed: ${error.message}`);

        if (error.message.includes('429')) {
            throw new Error('AI Service is currently overloaded (Rate Limit). Please try again in a few seconds.');
        }

        throw new Error(`AI Style Analysis Failed: ${error.message}`);
    }
};

/**
 * Generates a custom exam using RAG (Retrieval-Augmented Generation).
 * Combines aggregated lecture concepts with a professor's style profile
 * to produce questions that match the professor's testing patterns.
 *
 * @param {Array} aggregatedConcepts - Summarized concepts from selected LectureConcept documents.
 * @param {Object} professorProfile - The professor's style profile (question types, difficulty, trick phrases).
 * @param {String} examType - Type of exam to generate (e.g., 'Quiz', 'Midterm', 'Final').
 * @param {Number} questionCount - Exact number of questions to generate.
 * @returns {Array<{ questionText: string, options: string[], correctAnswer: string, difficulty: number, aiConfidenceScore: number, derivedFromConcept: string }>}
 */
const generateCustomExamWithRAG = async (aggregatedConcepts, professorProfile, examType, questionCount) => {
    const prompt = `You are an expert exam creator. Generate a "${examType}" exam with exactly ${questionCount} questions. Distribute the questions comprehensively across these aggregated course concepts: ${JSON.stringify(aggregatedConcepts)}. CRITICAL: You must strictly emulate this professor's testing style and exam structure: ${JSON.stringify(professorProfile)}. Ensure the ratio of question types (MCQ, True/False, etc.) and difficulties matches the profile. Return ONLY a valid JSON array of objects. Each object MUST strictly match: { "questionText": "...", "options": ["..."], "correctAnswer": "...", "difficulty": (1-5), "aiConfidenceScore": (0-100), "derivedFromConcept": "brief concept reference" }. Do not include markdown formatting.`;

    try {
        console.log(`[AI Service] Generating ${examType} exam with ${questionCount} questions using RAG...`);

        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await geminiModel.generateContent(prompt);
        const responseText = result.response.text();

        // Extract the JSON array from the response, stripping any surrounding text
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            throw new Error('Gemini did not return a valid JSON array for exam generation.');
        }

        const parsed = JSON.parse(jsonMatch[0].trim());

        console.log(`[AI Service] Custom exam generation completed. Generated ${parsed.length} questions.`);

        return parsed;
    } catch (error) {
        console.error(`[AI Service] Custom exam generation failed: ${error.message}`);

        if (error.message.includes('429')) {
            throw new Error('AI Service is currently overloaded (Rate Limit). Please try again in a few seconds.');
        }

        throw new Error(`AI Exam Generation Failed: ${error.message}`);
    }
};

module.exports = { extractScheduleFromImages, extractLectureConcepts, parseExamAndLinkToLectures, analyzeProfessorStyle, generateCustomExamWithRAG };