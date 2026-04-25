/**
 * Thin re-export wrapper for backward compatibility.
 * All transcript logic now lives in gpa.controller.js.
 */
const {
    uploadTranscript,
    getAllTranscripts,
    getTranscriptById,
    updateTranscript,
    deleteTranscript,
    getGPAHistory
} = require('./gpa.controller');

module.exports = {
    uploadTranscript,
    getTranscripts: getAllTranscripts,
    getTranscriptById,
    updateTranscript,
    deleteTranscript,
    getGPAHistory
};
