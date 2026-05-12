const { execSync } = require('child_process');

console.log("=== Transcript Extraction Environment Checker ===\n");

function checkPython() {
    console.log("1. Checking Python...");
    const commands = ['python', 'python3', 'py'];
    let pythonFound = false;
    for (const cmd of commands) {
        try {
            const version = execSync(`${cmd} --version`).toString().trim();
            console.log(`   ✅ Found: ${cmd} (${version})`);
            pythonFound = true;
            return cmd;
        } catch (e) {
        }
    }
    console.log("   ❌ Python not found in system PATH.");
    return null;
}

function checkPythonLibs(pythonCmd) {
    if (!pythonCmd) return;
    console.log("\n2. Checking Python Libraries...");
    const libs = ['cv2', 'numpy', 'pytesseract', 'pdf2image', 'PIL'];
    for (const lib of libs) {
        try {
            const importName = lib === 'PIL' ? 'PIL' : lib;
            execSync(`${pythonCmd} -c "import ${importName}"`);
            console.log(`   ✅ Library '${lib}' is installed.`);
        } catch (e) {
            console.log(`   ❌ Library '${lib}' is MISSING.`);
        }
    }
    console.log("   💡 Run: pip install -r src/services/requirements.txt");
}

function checkSystemBinaries() {
    console.log("\n3. Checking System Binaries...");
    
    try {
        const tesserVersion = execSync('tesseract --version').toString().split('\n')[0];
        console.log(`   ✅ Tesseract-OCR is installed: ${tesserVersion}`);
    } catch (e) {
        console.log("   ❌ Tesseract-OCR not found in PATH.");
        console.log("      Please install it from: https://github.com/UB-Mannheim/tesseract/wiki");
    }

    try {
        execSync('pdftocairo -v');
        console.log("   ✅ Poppler (pdftocairo) is installed.");
    } catch (e) {
        try {
            execSync('pdftoppm -v');
            console.log("   ✅ Poppler (pdftoppm) is installed.");
        } catch (e2) {
            console.log("   ❌ Poppler not found in PATH.");
            console.log("      Required for PDF processing. On Windows, download via: https://github.com/oschwartz10612/poppler-windows/releases/tag/v24.02.0-0");
        }
    }
}

const pythonCmd = checkPython();
checkPythonLibs(pythonCmd);
checkSystemBinaries();

console.log("\n=== Diagnosis Complete ===");
console.log("If all checks are green, run 'node test-transcript.js' to verify.");
