// src/middlewares/gpa.validator.js
const Joi = require('joi');

// 1. Schema for setting up the student's historical GPA profile
const profileSetupSchema = Joi.object({
    oldCGPA: Joi.number().min(0).max(5.0).required(),
    oldHours: Joi.number().integer().min(0).max(146).required()
});

// 2. Schema for a single course in the current term
const courseGradeSchema = Joi.object({
    courseCode: Joi.string().trim().required(),
    creditHours: Joi.number().integer().min(1).max(10).required(),
    mark: Joi.number().min(0).max(100).optional(), // Optional because for Target Strategy, marks aren't known yet
    isRetake: Joi.boolean().default(false).optional()
});

// 3. Schema for the standard term calculation payload
const termCalculationSchema = Joi.object({
    courses: Joi.array().items(courseGradeSchema).min(1).required().messages({
        'array.min': 'You must provide at least one course to calculate the GPA.'
    })
});

// 4. NEW: Schema specifically for the Smart Target Strategy payload
const targetStrategySchema = Joi.object({
    targetCGPA: Joi.number().min(0.1).max(5.0).required().messages({
        'number.min': 'Target CGPA must be greater than 0.',
        'number.max': 'Target CGPA cannot exceed the faculty limit of 5.0.'
    }),
    courses: Joi.array().items(courseGradeSchema).min(1).required().messages({
        'array.min': 'You must provide current courses to generate a study plan.'
    })
});

// --- Middleware Interceptors ---

const validateProfileSetup = (req, res, next) => {
    const { error } = profileSetupSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation Error: Invalid profile data.',
            errors: error.details.map(err => err.message)
        });
    }
    next();
};

const validateTermCalculation = (req, res, next) => {
    const { error } = termCalculationSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation Error: Invalid course data.',
            errors: error.details.map(err => err.message)
        });
    }
    next();
};

// NEW: Middleware interceptor for the Target Strategy route
const validateTargetStrategy = (req, res, next) => {
    const { error } = targetStrategySchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation Error: Invalid target strategy data.',
            errors: error.details.map(err => err.message)
        });
    }
    next();
};

module.exports = { 
    validateProfileSetup, 
    validateTermCalculation,
    validateTargetStrategy // Export the new middleware
};