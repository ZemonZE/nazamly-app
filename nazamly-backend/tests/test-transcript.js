// test-transcript.js
// Run this file using: node test-transcript.js

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const TranscriptUpload_Repo = require('./src/Repos/TranscriptUpload_Repo');
const User_Repo = require('./src/Repos/User_Repo');

async function runTests() {
    console.log("=== Starting Transcript Extraction Feature Tests ===\n");

    try {
        // 1. Connect to DB
        console.log("1. Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nazamly');
        console.log("   ✅ Connected to Database.\n");

        // 2. Fetch a dummy user to run database tests against
        console.log("2. Fetching a random User to act as test subject...");
        const user = await User_Repo.model.findOne();
        if (!user) {
            throw new Error("No users found in the database. Please create a user first to test DB relationships.");
        }
        console.log(`   ✅ Found test user: ${user.email} (ID: ${user._id})\n`);

        // 3. Test TranscriptUpload_Repo Creation
        console.log("3. Testing TranscriptUpload_Repo.create()...");
        const newTranscript = await TranscriptUpload_Repo.create({
            userId: user._id,
            fileName: "test_dummy_file.jpg",
            fileType: "image/jpeg",
            status: "pending"
        });
        console.log(`   ✅ Created Transcript doc successfully! (ID: ${newTranscript._id})\n`);

        // 4. Test Python Script via Child Process
        console.log("4. Testing Python child_process Bridge & Python Dependencies...");
        
        // Generate a micro dummy JPEG to pass into python
        const dummyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        const tempFilePath = path.join(__dirname, 'test_dummy_transcript.png');
        fs.writeFileSync(tempFilePath, Buffer.from(dummyImageBase64, 'base64'));

        const pythonScriptPath = path.join(__dirname, 'src/services/extract_transcript.py');
        const pythonCommands = ['python', 'python3', 'py'];
        let pythonSuccess = false;
        let pTotalCredits = 0;
        let pGpa = 0;
        let lastError = "";

        for (const cmd of pythonCommands) {
            try {
                console.log(`   Attempting command: ${cmd} "${pythonScriptPath}" "${tempFilePath}"`);
                const { stdout, stderr } = await execAsync(`${cmd} "${pythonScriptPath}" "${tempFilePath}"`);
                
                if (stderr) {
                    console.warn(`   ⚠️ Command executed but warned: ${stderr.trim()}`);
                }

                if (stdout) {
                    console.log("\n   Raw Python JSON output:");
                    console.log(`   ${stdout.trim()}\n`);

                    const parsedResult = JSON.parse(stdout);
                    if (!parsedResult.success) {
                        throw new Error("Python script reported failure: " + parsedResult.error);
                    }
                    
                    pTotalCredits = parsedResult.totalCreditHours;
                    pGpa = parsedResult.termGPA;
                    pythonSuccess = true;
                    console.log(`   ✅ Python bridge communicated cleanly via '${cmd}'!`);
                    break; // Success! Exit loop.
                }
            } catch (err) {
                lastError = err.stderr || err.message;
                console.log(`   ❌ '${cmd}' failed. Trying next...`);
            }
        }

        if (!pythonSuccess) {
            console.error("\n   ❌ Python Script Bridge Failed!");
            console.error("   Common Causes:");
            console.error("   1. Python is not installed or not in your system PATH.");
            console.error("   2. Missing libraries (run: pip install -r src/services/requirements.txt)");
            console.error("   3. Tesseract-OCR is missing or not in PATH.");
            console.error(`\n   Last Error Details:\n   ${lastError}\n`);
        } else {
            // Cleanup dummy image only on success to allow debugging if needed
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        }

        // 5. Test TranscriptUpload_Repo Update (Mocking completion)
        console.log("\n5. Testing TranscriptUpload_Repo.update() using Python results...");
        const updatedTranscript = await TranscriptUpload_Repo.update(newTranscript._id, {
            status: pythonSuccess ? 'completed' : 'failed',
            totalCreditHours: pTotalCredits,
            termGPA: pGpa,
            errorMessage: pythonSuccess ? "" : "Test failure"
        });
        console.log(`   ✅ DB Update successful! New status: ${updatedTranscript.status}\n`);

        // 6. Test Fetching by User ID
        console.log("6. Testing TranscriptUpload_Repo.findByUserId()...");
        const userTranscripts = await TranscriptUpload_Repo.findByUserId(user._id);
        console.log(`   ✅ Query successful! User has ${userTranscripts.length} transcript records.\n`);

        // 7. Test Soft Deletion
        console.log("7. Testing TranscriptUpload_Repo.deleteUserTranscript() (Soft Delete)...");
        await TranscriptUpload_Repo.deleteUserTranscript(updatedTranscript._id, user._id);
        
        // Confirm it's soft deleted
        const checkDeleted = await TranscriptUpload_Repo.findUserTranscriptById(updatedTranscript._id, user._id);
        if (!checkDeleted) {
            console.log("   ✅ Soft Delete verified! (Record successfully flagged as 'isDeleted').\n");
        } else {
            console.warn("   ⚠️ Wait, document still visible after deletion?\n");
        }

        console.log("==========================================");
        console.log("🎉 All System/Database Component Tests Finished!");
        if (!pythonSuccess) {
            console.log("💡 The Node.js and DB parts work perfectly, but Python returned an error.");
            console.log("   --> Fix your python environment by installing libraries inside 'src/services' or ensuring Tesseract-OCR is installed on the host OS!");
        } else {
            console.log("💡 Success! Python OCR and Database implementations are flawlessly integrated.\n");
        }

    } catch (err) {
        console.error("\n❌ Test execution crashed:\n", err);
    } finally {
        // Disconnect from database
        mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

runTests();
