const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * QuizTemplate Schema
 * Fixed quizzes or mock exams.
 * Note: 'QuizTemplateQuestion' M:N relationship is handled via the embedded 'questions' array.
 */
const quizTemplateSchema = new Schema({
  courseInstanceId: { type: Schema.Types.ObjectId, ref: 'CourseInstance', required: true, index: true },
  title: { type: String, required: true, trim: true },
  
  isMockExam: { type: Boolean, default: false },
  
  //  Essential for enforcing exam durations and frontend timers.
  timeLimitMinutes: { type: Number, required: true, min: 1 },
  
  // NoSQL Optimization: Embedding question references directly
  questions: [{
    generatedQuestionId: { type: Schema.Types.ObjectId, ref: 'GeneratedQuestion', required: true },
    points: { type: Number, default: 1 } // Added for scoring logic
  }]
}, { timestamps: true });

module.exports = model('QuizTemplate', quizTemplateSchema);