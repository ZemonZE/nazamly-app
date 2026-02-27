const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * ExtractedQuestion Schema
 * Stores raw questions exactly as extracted from the ExamSource by the AI.
 */
const extractedQuestionSchema = new Schema({
  // Reference to the original exam source (indexed for faster querying)
  examSourceId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ExamSource', 
    required: true, 
    index: true 
  },

  // Reference to the related chapter (nullable at the initial extraction stage)
  chapterId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Chapter', 
    default: null 
  },
  
  // The extracted question text (trim removes extra whitespace from PDF extraction)
  text: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // Question type:
  // mcq = Multiple Choice
  // tf = True/False
  // short = Short Answer
  // essay = Essay Question
  type: { 
    type: String, 
    enum: ['mcq', 'tf', 'short', 'essay'], 
    required: true 
  },
  
  // MCQ options (only applicable when type = 'mcq')
  options: [{ 
    type: String, 
    trim: true 
  }], 
  
  // Model answer:
  // - Exact answer for MCQ/TF
  // - Reference answer for short/essay questions
  correctAnswer: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // Grading rubric:
  // Essential for AI-based evaluation of essay/short answers
  // Contains key points required for full marks
  gradingRubric: [{ 
    type: String, 
    trim: true 
  }], 
  
  // Estimated difficulty level (optional classification)
  estimatedDifficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'] 
  }

}, { timestamps: true });

// Export the ExtractedQuestion model
module.exports = model('ExtractedQuestion', extractedQuestionSchema);