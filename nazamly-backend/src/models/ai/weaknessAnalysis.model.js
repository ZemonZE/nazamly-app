const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * WeaknessAnalysis Schema
 * Represents the AI-generated feedback and analysis after a student completes a quiz.
 * Forms the core of the 'Smart Feedback Layer'.
 */
const weaknessAnalysisSchema = new Schema({
  // 🔥 CRITICAL: 'unique: true' enforces a strict 1:1 relationship. 
  // Prevents generating multiple expensive AI analyses for the exact same quiz attempt.
  attemptId: { 
    type: Schema.Types.ObjectId, 
    ref: 'QuizAttempt', 
    required: true, 
    unique: true // حارس بوابة التكاليف
  },
  
  // Storing flexible JSON structures directly from the AI output
  // Example: { "Chapter 1": "Needs review", "Chapter 3": "Mastered" }
  weakChapters: { type: Schema.Types.Mixed }, 
  weakConcepts: { type: Schema.Types.Mixed }, 
  
  // The personalized, human-readable advice generated for the student
  generatedTextFeedback: { type: String, required: true, trim: true },
  
  // 🌟 NoSQL Optimization: Replaced the junction table with an embedded array.
  // Directly links to the PDF/Slides the student needs to review.
  recommendedMaterials: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'MaterialFile' 
  }]
}, { timestamps: true });

module.exports = model('WeaknessAnalysis', weaknessAnalysisSchema);