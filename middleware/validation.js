const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
}

// Common validation rules
const commonRules = {
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    
    password: body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    
    name: body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
    organization: body('organizationName')
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage('Organization name must be between 2 and 150 characters'),
    
    phone: body('phone')
        .optional()
        .trim()
        .matches(/^[\+]?[1-9][\d\s\-\(\)]{8,20}$/)
        .withMessage('Please provide a valid phone number'),
    
    studentId: body('studentId')
        .optional()
        .trim()
        .matches(/^[0-9]{8}$/)
        .withMessage('Student ID must be 8 digits'),
    
    projectTitle: body('title')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Project title must be between 5 and 200 characters'),
    
    projectDescription: body('description')
        .trim()
        .isLength({ min: 50, max: 5000 })
        .withMessage('Project description must be between 50 and 5000 characters'),
    
    requiredSkills: body('required_skills')
        .trim()
        .isLength({ min: 5, max: 1000 })
        .withMessage('Required skills must be between 5 and 1000 characters'),
    
    semester: body('semester_availability')
        .optional()
        .isIn(['semester1', 'semester2', 'both'])
        .withMessage('Semester availability must be semester1, semester2, or both'),
    
    projectId: param('id')
        .isInt({ min: 1 })
        .withMessage('Project ID must be a positive integer'),
    
    searchQuery: query('q')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Search query must be less than 200 characters'),
    
    message: body('message')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Message must be less than 1000 characters')
};

// Validation rule sets for different endpoints
const validationRules = {
    // Student registration
    studentRegister: [
        commonRules.email,
        commonRules.password,
        commonRules.name,
        commonRules.studentId,
        handleValidationErrors
    ],

    // Client registration - streamlined with minimal required fields
    clientRegister: [
        // Essential fields (required)
        commonRules.email,
        commonRules.password,
        commonRules.organization,
        body('contactName')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Contact name must be between 2 and 100 characters'),
        
        // Optional organization details
        body('contactTitle')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Contact title must be less than 100 characters'),
        body('industry')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Industry must be between 2 and 100 characters if provided'),
        body('orgDescription')
            .optional()
            .trim()
            .isLength({ min: 10, max: 1000 })
            .withMessage('Organization description must be between 10 and 1000 characters if provided'),
        commonRules.phone,
        body('website')
            .optional()
            .trim()
            .isURL()
            .withMessage('Please enter a valid website URL'),
        body('address')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Address must be less than 500 characters'),
        body('discussFirst')
            .optional()
            .isBoolean()
            .withMessage('Discuss first preference must be true or false'),
        
        // Project validation (entirely optional nested object)
        body('project.title')
            .optional()
            .trim()
            .isLength({ min: 5, max: 200 })
            .withMessage('Project title must be between 5 and 200 characters'),
        body('project.description')
            .optional()
            .trim()
            .isLength({ min: 20, max: 2000 })
            .withMessage('Project description must be between 20 and 2000 characters'),
        body('project.required_skills')
            .optional()
            .trim()
            .isLength({ min: 5, max: 1000 })
            .withMessage('Required skills must be between 5 and 1000 characters'),
        body('project.tools_technologies')
            .optional()
            .trim()
            .isLength({ min: 3, max: 1000 })
            .withMessage('Tools and technologies must be between 3 and 1000 characters'),
        body('project.deliverables')
            .optional()
            .trim()
            .isLength({ min: 10, max: 1000 })
            .withMessage('Deliverables must be between 10 and 1000 characters'),
        body('project.semester_availability')
            .optional()
            .isIn(['semester1', 'semester2', 'both'])
            .withMessage('Semester availability must be semester1, semester2, or both'),
        body('project.duration_weeks')
            .optional()
            .isInt({ min: 1, max: 52 })
            .withMessage('Duration must be between 1 and 52 weeks'),
        body('project.max_students')
            .optional()
            .isInt({ min: 1, max: 10 })
            .withMessage('Maximum students must be between 1 and 10'),
        body('project.project_type')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Project type must be less than 50 characters'),
        body('project.prerequisites')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('Prerequisites must be less than 1000 characters'),
        body('project.additional_info')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('Additional info must be less than 1000 characters'),
        handleValidationErrors
    ],

    // Login validation
    login: [
        commonRules.email,
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
        handleValidationErrors
    ],

    // Project creation
    createProject: [
        commonRules.projectTitle,
        commonRules.projectDescription,
        commonRules.requiredSkills,
        body('tools_technologies')
            .trim()
            .isLength({ min: 5, max: 1000 })
            .withMessage('Tools and technologies must be between 5 and 1000 characters'),
        body('deliverables')
            .trim()
            .isLength({ min: 10, max: 2000 })
            .withMessage('Deliverables must be between 10 and 2000 characters'),
        commonRules.semester,
        handleValidationErrors
    ],

    // Project update
    updateProject: [
        commonRules.projectId,
        commonRules.projectTitle,
        commonRules.projectDescription,
        commonRules.requiredSkills,
        body('tools_technologies')
            .trim()
            .isLength({ min: 5, max: 1000 })
            .withMessage('Tools and technologies must be between 5 and 1000 characters'),
        body('deliverables')
            .trim()
            .isLength({ min: 10, max: 2000 })
            .withMessage('Deliverables must be between 10 and 2000 characters'),
        commonRules.semester,
        handleValidationErrors
    ],

    // Express interest
    expressInterest: [
        commonRules.projectId,
        commonRules.message,
        handleValidationErrors
    ],

    // Project approval
    approveProject: [
        commonRules.projectId,
        body('status')
            .isIn(['approved', 'rejected'])
            .withMessage('Status must be approved or rejected'),
        body('feedback')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('Feedback must be less than 1000 characters'),
        handleValidationErrors
    ],

    // Search validation
    search: [
        commonRules.searchQuery,
        query('semester')
            .optional()
            .isIn(['semester1', 'semester2', 'both'])
            .withMessage('Semester filter must be semester1, semester2, or both'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Offset must be a non-negative integer'),
        handleValidationErrors
    ],

    // Gallery item creation
    createGalleryItem: [
        body('title')
            .trim()
            .isLength({ min: 5, max: 200 })
            .withMessage('Gallery title must be between 5 and 200 characters'),
        body('description')
            .trim()
            .isLength({ min: 20, max: 2000 })
            .withMessage('Gallery description must be between 20 and 2000 characters'),
        body('year')
            .isInt({ min: 2000, max: new Date().getFullYear() })
            .withMessage('Year must be between 2000 and current year'),
        body('category')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Category must be between 2 and 100 characters'),
        body('clientName')
            .trim()
            .isLength({ min: 2, max: 150 })
            .withMessage('Client name must be between 2 and 150 characters'),
        body('teamMembers')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Team members must be less than 500 characters'),
        body('outcomes')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('Outcomes must be less than 1000 characters'),
        handleValidationErrors
    ],

    // Generic ID validation
    validateId: [
        commonRules.projectId,
        handleValidationErrors
    ]
};

// Sanitization helpers
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove basic HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, ''); // Remove event handlers
}

// Custom validation middleware
function customValidation(validationFunction) {
    return (req, res, next) => {
        try {
            const result = validationFunction(req.body, req.params, req.query);
            if (result.isValid) {
                next();
            } else {
                return res.status(400).json({
                    error: 'Custom validation failed',
                    code: 'CUSTOM_VALIDATION_ERROR',
                    details: result.errors
                });
            }
        } catch (error) {
            console.error('Custom validation error:', error);
            return res.status(500).json({
                error: 'Internal validation error',
                code: 'VALIDATION_INTERNAL_ERROR'
            });
        }
    };
}

// Validate project interest limit
async function validateInterestLimit(req, res, next) {
    if (!req.user || req.user.type !== 'student') {
        return next();
    }

    try {
        const database = require('../database/db');
        const interestCount = await database.getActiveInterestCount(req.user.id);
        
        if (interestCount >= 5) {
            return res.status(400).json({
                error: 'Maximum of 5 project interests allowed',
                code: 'INTEREST_LIMIT_EXCEEDED',
                currentCount: interestCount,
                maxAllowed: 5
            });
        }

        next();
    } catch (error) {
        console.error('Interest limit validation error:', error);
        return res.status(500).json({
            error: 'Error validating interest limit',
            code: 'INTEREST_VALIDATION_ERROR'
        });
    }
}

module.exports = {
    validationRules,
    handleValidationErrors,
    sanitizeInput,
    customValidation,
    validateInterestLimit,
    commonRules
};