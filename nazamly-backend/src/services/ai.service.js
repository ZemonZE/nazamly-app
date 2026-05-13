// src/services/ai.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// In-Memory Model Cache for zero-latency hot-swapping
let activeGeminiModelCache = null;

const updateActiveGeminiModel = (model) => {
    activeGeminiModelCache = model;
    console.log(`[AI Cache] Active Gemini model hot-swapped to: ${model}`);
};

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
        const modelName = activeGeminiModelCache || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiModel = genAI.getGenerativeModel({ model: modelName });
        
        const fs = require('fs');
        const geminiImageParts = await Promise.all(files.map(async file => {
            const buffer = file.buffer || await fs.promises.readFile(file.path);
            return {
                inlineData: { data: buffer.toString("base64"), mimeType: file.mimetype }
            };
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
        const modelName = activeGeminiModelCache || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiModel = genAI.getGenerativeModel({ model: modelName });
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
                const delayMs = Math.pow(2, attempt) * 1000;
                console.warn(`[AI Service] Attempt ${attempt} failed: ${err.message}, retrying in ${delayMs / 1000}s...`);
                await new Promise(res => setTimeout(res, delayMs));
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

        const modelName = activeGeminiModelCache || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiModel = genAI.getGenerativeModel({ model: modelName });

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
                const delayMs = Math.pow(2, attempt) * 1000;
                console.warn(`[AI Service] Attempt ${attempt} failed: ${err.message}, retrying in ${delayMs / 1000}s...`);
                await new Promise(res => setTimeout(res, delayMs));
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

        const modelName = activeGeminiModelCache || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiModel = genAI.getGenerativeModel({ model: modelName });

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
 * Extracts timetable entries from a schedule image using Gemini.
 * Returns a JSON array of entries with normalized fields (raw output only).
 */
const extractScheduleTableFromImages = async (files) => {
    const prompt = `
    Analyze this Arabic university timetable or registration list image and extract ALL rows.
    The table is RTL (right-to-left). Column order can vary.
    Match columns by HEADER LABELS, not by position.

    Use these headers when present:
    - "كود المقرر" (Course Code)
    - "اسم المقرر" (Course Name) (optional)
    - "نوع المقرر" or "ن الدراسة" (Type) -> Lecture | Section | Lab
    - "المجموعة" (Group)
    - "اليوم" (Day) -> return as English day name (Saturday..Thursday)
    - "من" (Start Time)
    - "الى" or "إلى" (End Time)
    - "المكان" (Location)

    Ignore columns like:
    - "الترم", "عدد الساعات المعتمدة", "سعر الكتاب", "تاريخ التسجيل", "حذف"

    RULES:
    - Extract EVERY visible row. Do not summarize.
    - Return ONLY valid JSON (no markdown).
    - Times must be 24h HH:MM.
    - If course name is missing, leave it empty.

    Schema:
    [{"courseCode":"","courseName":"","sessionType":"Lecture","dayOfWeek":"Saturday","startTime":"08:00","endTime":"10:00","groupNumber":"1","location":""}]
    `;

    try {
        console.log('[AI Service] Dispatching timetable extraction request...');
        const modelName = activeGeminiModelCache || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiModel = genAI.getGenerativeModel({ model: modelName });

        const fs = require('fs');
        const geminiImageParts = await Promise.all(files.map(async file => {
            const buffer = file.buffer || await fs.promises.readFile(file.path);
            return {
                inlineData: { data: buffer.toString('base64'), mimeType: file.mimetype }
            };
        }));

        const result = await geminiModel.generateContent([prompt, ...geminiImageParts]);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('Model did not return a valid JSON array structure.');
        }

        const cleanedText = jsonMatch[0].trim();
        return {
            extractedData: JSON.parse(cleanedText),
            usedModel: modelName,
        };
    } catch (error) {
        console.error(`[AI Service] Timetable extraction failed: ${error.message}`);
        if (error.message.includes('429') || error.message.includes('503')) {
            throw new Error('AI Service is currently overloaded. Please try again later.');
        }
        throw new Error(`AI Timetable Extraction Failed: ${error.message}`);
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
const generateCustomExamWithRAG = async (aggregatedConcepts, professorProfile, examType, questionCount, questionDistribution = null) => {
    // Build distribution instructions if provided
    let distributionInstructions = '';
    if (questionDistribution) {
        const parts = [];
        if (questionDistribution.mcq > 0) parts.push(`${questionDistribution.mcq} MCQ questions (with 4 options each)`);
        if (questionDistribution.tf > 0) parts.push(`${questionDistribution.tf} True/False questions (with options ["True", "False"])`);
        if (questionDistribution.essay > 0) parts.push(`${questionDistribution.essay} Short-Answer/Essay questions (with EMPTY options array [])`);
        distributionInstructions = ' EXACT DISTRIBUTION REQUIRED: Generate exactly ' + parts.join(', ') + '.';
    }

    const prompt = 'You are an expert exam creator. Generate a "' + examType + '" exam with exactly ' + questionCount + ' questions.' + distributionInstructions + ' Distribute the questions comprehensively across these aggregated course concepts: ' + JSON.stringify(aggregatedConcepts) + '. CRITICAL: You must strictly emulate this professor\'s testing style and exam structure: ' + JSON.stringify(professorProfile) + '. Ensure the ratio of question types and difficulties matches the profile. IMPORTANT RULES FOR QUESTION TYPES: 1) For MCQ questions: "type" must be "mcq" and "options" must be an array of 4 strings. 2) For True/False questions: "type" must be "tf" and "options" must be ["True", "False"]. 3) For Essay/Short-Answer questions: "type" must be "essay", "options" MUST be an empty array [], and "correctAnswer" should contain the key concepts expected in the answer. Return ONLY a valid JSON array of objects. Each object MUST strictly match: { "type": "mcq|tf|essay", "questionText": "...", "options": ["..."] or [], "correctAnswer": "...", "difficulty": (1-5), "aiConfidenceScore": (0-100), "derivedFromConcept": "brief concept reference" }. Do not include markdown formatting.';

    try {
        console.log(`[AI Service] Generating ${examType} exam with ${questionCount} questions using RAG...`);

        const modelName = activeGeminiModelCache || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiModel = genAI.getGenerativeModel({ model: modelName });

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

/**
 * Evaluates a batch of essay questions and answers using Gemini.
 * Returns strict binary validation and explanation.
 * @param {Array<{id: string, questionText: string, correctAnswer: string, studentAnswer: string}>} essayBatch
 */
const evaluateEssayAnswers = async (essayBatch) => {
    if (!essayBatch || essayBatch.length === 0) return [];

    const prompt = `
You are an intelligent, fair, and flexible academic Teaching Assistant. Your job is to grade a student's short-answer/essay response.
You will be provided with: 1. The Question, 2. The Model Answer / Required Concepts, 3. The Student's Answer.

CRITICAL GRADING RULES:
- Evaluate SEMANTIC MEANING, not exact wording. If the student's answer captures the core idea and demonstrates understanding, you MUST mark isCorrect: true.
- Accept synonyms, different phrasing, and bullet points. Do not penalize for spelling or grammatical errors.
- Only mark isCorrect: false if the answer is fundamentally wrong, hallucinates completely unrelated info, or misses the absolute core technical concept entirely.
- Provide brief, encouraging feedback in the explanation field. If they got it right but missed a tiny detail, mark it true but mention the detail in the explanation.

Output ONLY a valid JSON array matching this exact schema: [{"questionId": "string", "isCorrect": boolean, "explanation": "string"}]

Input Batch:
${JSON.stringify(essayBatch, null, 2)}
`;

    const MAX_RETRIES = 4;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            if (attempt > 0) {
                const delayMs = Math.pow(2, attempt) * 3000; // 6s, 12s, 24s
                console.log(`[AI Service] Essay eval retry #${attempt + 1} after ${delayMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            console.log(`[AI Service] Evaluating ${essayBatch.length} essay answers (attempt ${attempt + 1}/${MAX_RETRIES})...`);
            const modelName = activeGeminiModelCache || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
            const geminiModel = genAI.getGenerativeModel({ model: modelName });
            
            const result = await geminiModel.generateContent(prompt);
            const responseText = result.response.text();
            
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("Gemini did not return a valid JSON array.");
            }

            const parsed = JSON.parse(jsonMatch[0].trim());
            console.log(`[AI Service] Essay evaluation completed gracefully.`);
            return parsed;

        } catch (error) {
            lastError = error;
            console.error(`[AI Service] Essay eval attempt ${attempt + 1} failed: ${error.message}`);
            
            // Only retry on rate limits (429) or transient server errors (500/503)
            const isRetryable = error.message.includes('429') || 
                                error.message.includes('503') || 
                                error.message.includes('500') ||
                                error.message.includes('RESOURCE_EXHAUSTED') ||
                                error.message.includes('overloaded') ||
                                error.message.includes('Too Many Requests');
            
            if (!isRetryable || attempt === MAX_RETRIES - 1) {
                break;
            }
        }
    }

    throw new Error(`AI Grader Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
};

/**
 * Dynamically fetches available Gemini models from Google REST API.
 * Filters for models supporting 'generateContent'.
 */
const fetchAvailableGeminiModels = async () => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        
        console.log('[AI Service] Fetching available Gemini models from Google REST API...');
        const response = await axios.get(url);
        
        if (!response.data || !Array.isArray(response.data.models)) {
            throw new Error('Invalid response structure from Google API');
        }

        const models = response.data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

        console.log(`[AI Service] Successfully discovered ${models.length} dynamic models.`);
        return models;

    } catch (error) {
        console.error(`[AI Service] Dynamic model discovery failed: ${error.message}. Falling back to defaults.`);
        // Production fallback to ensure zero downtime
        return ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
    }
};

/**
 * Extracts course data from a transcript image or PDF using Gemini vision.
 * Replaces the old Python OCR microservice with a pure Node.js/Gemini approach.
 *
 * @param {string} filePath - Absolute path to the uploaded transcript file
 * @returns {Promise<{ courses: Array, semester: string|null, student_id: string|null, confidence: number, source: string }>}
 */
const extractTranscriptFromFile = async (filePath) => {
    const fs = require('fs');
    const path = require('path');

    const prompt = `Analyze this Arabic university transcript document (image or PDF).
    Extract ALL courses visible in the transcript.

    For each course, extract:
    - courseCode: The course code (e.g., "CS411", "س411"). Normalize Arabic codes to Latin if possible.
    - courseName: The full course name if visible.
    - mark: The numeric grade/mark (e.g., 85, 92). Use null if not visible.
    - gradePoints: The GPA grade points (e.g., 4.0, 3.67, 3.0). Use null if not visible.
    - symbol: The letter grade symbol (e.g., "A+", "B", "C"). Use null if not visible.
    - creditHours: The credit hours for the course. Use null if not visible.
    - semester: The semester this course belongs to if visible. Use null if not visible.

    Also extract:
    - semester: The overall semester/term shown in the transcript (e.g., "الفصل الأول 2024-2025")
    - student_id: The student ID number if visible

    RULES:
    - Extract EVERY course row. Do not summarize.
    - Return ONLY valid JSON (no markdown formatting).
    - Be as accurate as possible with numbers.

    Return a JSON object matching this schema:
    {
      "courses": [{"courseCode": "", "courseName": "", "mark": null, "gradePoints": null, "symbol": "", "creditHours": null, "semester": ""}],
      "semester": "",
      "student_id": "",
      "confidence": 0.95
    }

    Set confidence between 0.0 and 1.0 based on how clearly you could read the document.`;

    try {
        console.log('[AI Service] Sending transcript to Gemini for extraction...');
        const modelName = activeGeminiModelCache || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiModel = genAI.getGenerativeModel({ model: modelName });

        const fileBuffer = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === '.pdf' ? 'application/pdf'
            : ext === '.png' ? 'image/png'
            : ext === '.webp' ? 'image/webp'
            : 'image/jpeg';

        const filePart = {
            inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType,
            },
        };

        const MAX_RETRIES = 3;
        let result = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                result = await geminiModel.generateContent([prompt, filePart]);
                break;
            } catch (err) {
                if (attempt === MAX_RETRIES) throw err;
                const delayMs = Math.pow(2, attempt) * 1000;
                console.warn(`[AI Service] Transcript attempt ${attempt} failed: ${err.message}, retrying in ${delayMs / 1000}s...`);
                await new Promise(res => setTimeout(res, delayMs));
            }
        }

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Gemini did not return a valid JSON object for transcript extraction.');
        }

        const parsed = JSON.parse(jsonMatch[0].trim());
        parsed.source = modelName;
        parsed.confidence = parsed.confidence || 0.85;

        console.log(`[AI Service] Transcript extraction completed. Found ${(parsed.courses || []).length} courses.`);
        return parsed;

    } catch (error) {
        console.error(`[AI Service] Transcript extraction failed: ${error.message}`);
        if (error.message.includes('429') || error.message.includes('503')) {
            throw new Error('AI Service is currently overloaded. Please try again later.');
        }
        throw new Error(`AI Transcript Extraction Failed: ${error.message}`);
    }
};

module.exports = { 
    extractScheduleFromImages,
    extractScheduleTableFromImages,
    extractLectureConcepts, 
    parseExamAndLinkToLectures, 
    analyzeProfessorStyle, 
    generateCustomExamWithRAG, 
    evaluateEssayAnswers, 
    updateActiveGeminiModel,
    fetchAvailableGeminiModels,
    extractTranscriptFromFile
};
