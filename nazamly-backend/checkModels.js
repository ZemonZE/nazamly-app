// checkModels.js
require('dotenv').config();

// Function to fetch and list all available Gemini models for this specific API Key
async function listAvailableModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.log("❌ API Key is missing in .env file!");
            return;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        
        console.log("📡 Contacting Google Servers...\n");
        const response = await fetch(url);
        const data = await response.json();
        
        console.log("🔍 Models available for your API Key:");
        console.log("-------------------------------------------------");
        
        // Filter and print models that support generating content
        data.models.forEach(model => {
            if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
                console.log(`✅ ${model.name.replace('models/', '')}`);
            }
        });
        
        console.log("-------------------------------------------------");
        
    } catch (error) {
        console.error("❌ Error fetching models:", error);
    }
}

listAvailableModels();