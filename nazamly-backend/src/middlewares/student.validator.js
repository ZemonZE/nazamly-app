// src/validations/student.validation.js
const Joi = require('joi');

// Joi schema for student registration payload
const registerStudentSchema = Joi.object({
  fullName: Joi.string().trim().optional().messages({
    'string.empty': 'fullName cannot be empty'
  }),

  studentCode: Joi.string().trim().required().messages({
    'any.required': 'studentCode is required',
    'string.empty': 'studentCode cannot be empty'
  }),

  completedHours: Joi.number().integer().min(0).required().messages({
    'any.required': 'completedHours is required',
    'number.min': 'completedHours cannot be negative'
  }),

  cgpa: Joi.number().min(0).max(5.0).required().messages({
    'any.required': 'cgpa is required',
    'number.min': 'cgpa cannot be negative',
    'number.max': 'cgpa cannot exceed 5.0'
  }),

  academicYear: Joi.number().integer().min(1).max(5).optional().messages({
    'number.min': 'academicYear must be between 1 and 5',
    'number.max': 'academicYear must be between 1 and 5'
  }),

  department: Joi.string().trim().optional().messages({
    'string.empty': 'department cannot be empty'
  }),

  registeredCourses: Joi.array()
    .items(Joi.string().hex().length(24).messages({
      'string.hex': 'Each registeredCourse must be a valid MongoDB ObjectId',
      'string.length': 'Each registeredCourse must be a valid MongoDB ObjectId'
    }))
    .optional()
    .default([])
});

module.exports = { registerStudentSchema };
