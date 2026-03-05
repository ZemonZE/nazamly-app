// src/middlewares/schedule.validator.js
const Joi = require('joi');

// 1. Define the validation schema for a single schedule session
const sessionSchema = Joi.object({
    courseName: Joi.string().trim().required(),
    courseCode: Joi.string().trim().required(),
    creditHours: Joi.number().min(0).max(10).required(),
    
    // Ensure the day is exactly one of the allowed academic days
    dayOfWeek: Joi.string().valid('Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday').required(),
    
    // Strict Regex for 24-hour format (e.g., 09:00, 14:30)
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
        'string.pattern.base': '"startTime" must be in valid 24-hour format (HH:MM)'
    }),
    
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
        'string.pattern.base': '"endTime" must be in valid 24-hour format (HH:MM)'
    }),
    
    groupNumber: Joi.string().allow('', null).optional(),
    sessionType: Joi.string().valid('Lecture', 'Section', 'Lab').required(),
    location: Joi.string().trim().required()
});

// 2. Define the schema for the incoming request payload
const schedulePayloadSchema = Joi.object({
    sessions: Joi.array().items(sessionSchema).min(1).required().messages({
        'array.min': 'You must provide at least one session to save.'
    })
});

// 3. The actual middleware function to intercept the request
const validateScheduleInput = (req, res, next) => {
    // Validate the request body against our schema
    // abortEarly: false ensures we return ALL errors, not just the first one
    const { error } = schedulePayloadSchema.validate(req.body, { abortEarly: false });

    if (error) {
        // Map Joi's detailed error array into a clean list of string messages
        const errorMessages = error.details.map(err => err.message);
        
        return res.status(400).json({
            success: false,
            message: 'Validation Error: Invalid input data.',
            errors: errorMessages
        });
    }

    // Pass control to the next middleware if validation succeeds
    next();
};

module.exports = { validateScheduleInput };