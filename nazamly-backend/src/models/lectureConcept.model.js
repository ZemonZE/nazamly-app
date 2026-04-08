const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * LectureConcept Schema
 * Stores the extracted key concepts and AI-generated vector embeddings for a specific lecture (MaterialFile).
 * The vectorEmbeddings field is critical for Cosine Similarity mapping during question generation.
 */
const lectureConceptSchema = new Schema({
  // Links this concept record to a specific uploaded PDF / lecture file
  materialFileId: {
    type: Schema.Types.ObjectId,
    ref: 'MaterialFile',
    required: true,
    index: true
  },

  // Optional reference for easier grouping by chapter
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter',
    index: true
  },

  // Key terms and topics extracted from the lecture content
  keywords: [{
    type: String,
    trim: true
  }],

  // AI-generated vector embeddings for semantic similarity search (Cosine Similarity)
  vectorEmbeddings: [{
    type: Number
  }],

  // Condensed AI-generated summary of the lecture's extracted text
  extractedTextSummary: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = model('LectureConcept', lectureConceptSchema);
