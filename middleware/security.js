const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// CSRF Protection
class CSRFProtection {
    static generateToken(req) {
        return crypto.randomBytes(32).toString('hex');
    }
    
    static middleware() {
        return (req, res, next) => {
            // Skip CSRF for GET requests and API auth endpoints
            if (req.method === 'GET' || req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
                return next();
            }
            
            const token = req.headers['x-csrf-token'] || req.body._csrf;
            const sessionToken = req.session?.csrfToken;
            
            if (!token || !sessionToken || token !== sessionToken) {
                return res.status(403).json({
                    error: 'CSRF token validation failed',
                    code: 'CSRF_INVALID'
                });
            }
            
            next();
        };
    }
}

// SQL Injection Protection
function sanitizeSQLInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove or escape potentially dangerous SQL characters
    return input
        .replace(/['";\\]/g, '') // Remove quotes and backslashes
        .replace(/--/g, '') // Remove SQL comments
        .replace(/\/\*/g, '') // Remove block comment start
        .replace(/\*\//g, '') // Remove block comment end
        .replace(/xp_/gi, '') // Remove extended procedures
        .replace(/sp_/gi, '') // Remove stored procedures
        .trim();
}

// XSS Protection
function sanitizeXSSInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '');
}

// Input sanitization middleware
function sanitizeRequest() {
    return (req, res, next) => {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }
        
        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }
        
        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }
        
        next();
    };
}

function sanitizeObject(obj) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeXSSInput(sanitizeSQLInput(value));
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

// Content Security Policy headers
function setSecurityHeaders() {
    return (req, res, next) => {
        // Remove server information
        res.removeHeader('X-Powered-By');
        
        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Enable XSS protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Ensure HTTPS in production
        if (config.environment === 'production') {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        
        // Referrer policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Feature policy
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        next();
    };
}

// File upload security
function validateFileUpload(allowedTypes = [], maxSize = 5 * 1024 * 1024) {
    return (req, res, next) => {
        if (!req.files || Object.keys(req.files).length === 0) {
            return next();
        }
        
        for (const [fieldName, file] of Object.entries(req.files)) {
            // Check file size
            if (file.size > maxSize) {
                return res.status(400).json({
                    error: `File ${fieldName} exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
                    code: 'FILE_TOO_LARGE'
                });
            }
            
            // Check file type
            if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    error: `File ${fieldName} type ${file.mimetype} not allowed`,
                    code: 'FILE_TYPE_NOT_ALLOWED',
                    allowedTypes
                });
            }
            
            // Check for executable extensions
            const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs', '.php', '.asp'];
            const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            
            if (dangerousExtensions.includes(fileExtension)) {
                return res.status(400).json({
                    error: `File ${fieldName} has dangerous extension ${fileExtension}`,
                    code: 'DANGEROUS_FILE_EXTENSION'
                });
            }
        }
        
        next();
    };
}

// Request size limiting
function limitRequestSize(maxSize = '10mb') {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'], 10);
        const maxBytes = typeof maxSize === 'string' 
            ? parseInt(maxSize) * 1024 * 1024 
            : maxSize;
        
        if (contentLength > maxBytes) {
            return res.status(413).json({
                error: 'Request entity too large',
                code: 'REQUEST_TOO_LARGE',
                maxSize: maxBytes
            });
        }
        
        next();
    };
}

// API key validation
function validateApiKey() {
    return (req, res, next) => {
        // Skip for public endpoints
        const publicEndpoints = ['/api/health', '/api/auth/login', '/api/projects'];
        if (publicEndpoints.some(endpoint => req.path.startsWith(endpoint)) && req.method === 'GET') {
            return next();
        }
        
        const apiKey = req.headers['x-api-key'];
        const validApiKeys = config.apiKeys || [];
        
        if (validApiKeys.length > 0 && (!apiKey || !validApiKeys.includes(apiKey))) {
            return res.status(401).json({
                error: 'Valid API key required',
                code: 'API_KEY_REQUIRED'
            });
        }
        
        next();
    };
}

// Session security
function secureSession() {
    return (req, res, next) => {
        if (req.session) {
            // Regenerate session ID for authenticated users
            if (req.user && !req.session.regenerated) {
                req.session.regenerate((err) => {
                    if (err) {
                        console.error('Session regeneration error:', err);
                    }
                    req.session.regenerated = true;
                    next();
                });
                return;
            }
            
            // Set secure session flags
            req.session.cookie.secure = config.environment === 'production';
            req.session.cookie.httpOnly = true;
            req.session.cookie.sameSite = 'strict';
        }
        
        next();
    };
}

// Brute force protection
class BruteForceProtection {
    constructor() {
        this.attempts = new Map();
        this.maxAttempts = 5;
        this.windowMs = 15 * 60 * 1000; // 15 minutes
        this.blockDurationMs = 60 * 60 * 1000; // 1 hour
    }
    
    middleware() {
        return (req, res, next) => {
            const key = this.getKey(req);
            const now = Date.now();
            const userAttempts = this.attempts.get(key) || { count: 0, firstAttempt: now, blocked: false };
            
            // Reset if window has passed
            if (now - userAttempts.firstAttempt > this.windowMs) {
                userAttempts.count = 0;
                userAttempts.firstAttempt = now;
                userAttempts.blocked = false;
            }
            
            // Check if blocked
            if (userAttempts.blocked && now - userAttempts.firstAttempt < this.blockDurationMs) {
                return res.status(429).json({
                    error: 'Too many failed attempts. Please try again later.',
                    code: 'RATE_LIMITED',
                    retryAfter: Math.ceil((this.blockDurationMs - (now - userAttempts.firstAttempt)) / 1000)
                });
            }
            
            // Track this request
            req.bruteForce = {
                key,
                recordFailure: () => {
                    userAttempts.count++;
                    if (userAttempts.count >= this.maxAttempts) {
                        userAttempts.blocked = true;
                    }
                    this.attempts.set(key, userAttempts);
                },
                recordSuccess: () => {
                    this.attempts.delete(key);
                }
            };
            
            next();
        };
    }
    
    getKey(req) {
        return `${req.ip}_${req.body.email || 'unknown'}`;
    }
}

// Password strength validation
function validatePasswordStrength() {
    return (req, res, next) => {
        const { password } = req.body;
        
        if (!password) {
            return next();
        }
        
        const minLength = 8;
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasNoCommonPatterns = !/^(password|123456|qwerty|admin|user)/i.test(password);
        
        const errors = [];
        
        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }
        
        if (!hasLowercase) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!hasUppercase) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!hasNumbers) {
            errors.push('Password must contain at least one number');
        }
        
        if (!hasSpecialChar) {
            errors.push('Password must contain at least one special character');
        }
        
        if (!hasNoCommonPatterns) {
            errors.push('Password contains common patterns and is not secure');
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                code: 'WEAK_PASSWORD',
                details: errors
            });
        }
        
        next();
    };
}

module.exports = {
    CSRFProtection,
    sanitizeRequest,
    setSecurityHeaders,
    validateFileUpload,
    limitRequestSize,
    validateApiKey,
    secureSession,
    BruteForceProtection,
    validatePasswordStrength,
    sanitizeSQLInput,
    sanitizeXSSInput
};