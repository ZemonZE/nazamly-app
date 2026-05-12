const Joi = require('joi');

const entrySchema = Joi.object({
  timeTableId: Joi.string().hex().length(24).optional().allow('', null),

  courseId: Joi.string().hex().length(24).required().messages({
    'any.required': 'courseId is required',
    'string.length': 'courseId must be a valid MongoDB ObjectId',
  }),

  dayOfWeek: Joi.number().integer().min(0).max(6).required().messages({
    'any.required': 'dayOfWeek is required (0=Sunday … 6=Saturday)',
    'number.min': 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)',
    'number.max': 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)',
  }),

  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
    'any.required': 'startTime is required',
    'string.pattern.base': 'startTime must be in HH:MM 24-hour format (e.g. 08:30)',
  }),

  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
    'any.required': 'endTime is required',
    'string.pattern.base': 'endTime must be in HH:MM 24-hour format (e.g. 10:00)',
  }),

  sessionType: Joi.string().valid('Lecture', 'Section', 'Lab').required().messages({
    'any.required': 'sessionType is required',
    'any.only': 'sessionType must be one of: Lecture, Section, Lab',
  }),

  location: Joi.string().trim().max(100).optional().allow('', null),
  groupNumber: Joi.string().trim().optional().allow('', null),
});

const validateEntry = (req, res, next) => {
  const { error } = entrySchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error: Invalid schedule entry data.',
      errors: error.details.map(e => e.message),
    });
  }
  next();
};

module.exports = { validateEntry };