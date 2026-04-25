// test-exam-local.js
require('dotenv').config();

// Import the specific function from your AI service
const { generateCustomExamWithRAG } = require('./src/services/ai.service');

async function runExamTest() {
    console.log("🚀 Starting Dynamic Exam Engine Test...");

    // 1. Mocking Lecture Concepts (Simulating data fetched from DB for 2 lectures)
    const mockAggregatedConcepts = [
        {
            extractedTextSummary: "Introduction to Operating Systems, covering the basic elements like CPU, Main Memory, and I/O modules.",
            keyConcepts: ["CPU functions", "Main Memory volatility", "System Bus communication"]
        },
        {
            extractedTextSummary: "Deep dive into Process Management, Process Control Blocks (PCB), and Context Switching.",
            keyConcepts: ["Process states", "PCB structure", "Context Switch overhead"]
        }
    ];

    // 2. Mocking Professor Profile (Simulating the 'Ghost' of the professor)
    const mockProfessorProfile = {
        preferredQuestionTypes: ["MCQ"],
        difficultyDistribution: { easy: 20, medium: 40, hard: 40 }, // Professor likes hard questions
        trickPhrases: ["none of the above", "all of the statements are correct except"], // Tricky options
        averageQuestionLength: "medium"
    };

    try {
        console.log("\n⏳ Requesting a 5-question 'Midterm' from Gemini (matching professor's style)...");
        
        // Call the AI generator with our mocked data
        const examQuestions = await generateCustomExamWithRAG(
            mockAggregatedConcepts,
            mockProfessorProfile,
            "Midterm", 
            5 // Requesting exactly 5 questions
        );

        console.log("🟢 Success! Generated Exam Questions:");
        console.dir(examQuestions, { depth: null, colors: true });

    } catch (error) {
        console.error("\n❌ Test Failed! Error details:");
        console.error(error.message || error);
    }
}

// Execute the test
runExamTest();