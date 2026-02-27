const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * GeneratedQuestion Schema
 * Polished, AI-generated questions ready to be used in student quizzes.
 * Updated to support long essay questions and automated AI grading.
 */
const generatedQuestionSchema = new Schema({
  courseInstanceId: { type: Schema.Types.ObjectId, ref: 'CourseInstance', required: true, index: true },
  basedOnExtractedQuestionId: { type: Schema.Types.ObjectId, ref: 'ExtractedQuestion', default: null },
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
  
  // Array of references linking the question back to its source materials
  sourceMaterialIds: [{ type: Schema.Types.ObjectId, ref: 'MaterialFile' }],
  
  // The actual question text (cleaned of extra spaces)
  text: { type: String, required: true, trim: true },
  
  // Added 'essay' to support long-form written answers
  type: { type: String, enum: ['mcq', 'tf', 'short', 'essay'], required: true },
  
  // Array of choices (Used primarily for MCQ format)
  options: [{ type: String, trim: true }], 
  
  // The model answer (Exact match for MCQ/TF/Short, or a sample answer for Essay)
  correctAnswer: { type: String, required: true, trim: true },
  
  // 🔥 Crucial for AI Grading: The key points the student must mention in an essay to get full marks
  gradingRubric: [{ type: String, trim: true }],
  
  // AI rationale detailing why the answer is correct (useful for student feedback)
  explanation: { type: String, required: true, trim: true }, 
  
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true }
}, { timestamps: true });

module.exports = model('GeneratedQuestion', generatedQuestionSchema);