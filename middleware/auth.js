const jwt = require('jsonwebtoken');
const config = require('../config/config');
const database = require('../database/db');

// JWT token generation
function generateTokens(user, userType) {
    const payload = {
        id: user.id,
        email: user.email,
        type: userType,
        iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    });

    const refreshToken = jwt.sign(
        { id: user.id, type: userType },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (error) {
        throw new Error('Invalid token');
    }
}

// Extract token from request
function extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check cookies
    if (req.cookies && req.cookies.auth_token) {
        return req.cookies.auth_token;
    }

    return null;
}

// Authentication middleware
function authenticate(req, res, next) {
    const token = extractToken(req);
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access denied. No token provided.',
            code: 'NO_TOKEN'
        });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            error: 'Invalid token.',
            code: 'INVALID_TOKEN'
        });
    }
}

// Authorization middleware for specific user types
function authorize(...allowedTypes) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedTypes.includes(req.user.type)) {
            return res.status(403).json({ 
                error: 'Access denied. Insufficient permissions.',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: allowedTypes,
                current: req.user.type
            });
        }

        next();
    };
}

// Optional authentication (doesn't fail if no token)
function optionalAuth(req, res, next) {
    const token = extractToken(req);
    
    if (token) {
        try {
            const decoded = verifyToken(token);
            req.user = decoded;
        } catch (error) {
            // Token is invalid, but we don't fail the request
            req.user = null;
        }
    } else {
        req.user = null;
    }

    next();
}

// Validate user exists in database
async function validateUser(req, res, next) {
    if (!req.user) {
        return next();
    }

    try {
        let user;
        switch (req.user.type) {
            case 'admin':
                user = await database.getAdminByEmail(req.user.email);
                break;
            case 'client':
                user = await database.getClientByEmail(req.user.email);
                break;
            case 'student':
                user = await database.getStudentByEmail(req.user.email);
                break;
            default:
                return res.status(401).json({ 
                    error: 'Invalid user type.',
                    code: 'INVALID_USER_TYPE'
                });
        }

        if (!user) {
            return res.status(401).json({ 
                error: 'User not found.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Add full user data to request
        req.userInfo = user;
        next();
    } catch (error) {
        console.error('User validation error:', error);
        return res.status(500).json({ 
            error: 'Internal server error during user validation.',
            code: 'VALIDATION_ERROR'
        });
    }
}

// Rate limiting for authentication attempts
const authAttempts = new Map();

function rateLimitAuth(req, res, next) {
    const clientId = req.ip + ':' + (req.body.email || 'unknown');
    const now = Date.now();
    const windowMs = config.security.lockoutDuration;
    
    if (!authAttempts.has(clientId)) {
        authAttempts.set(clientId, { count: 0, firstAttempt: now });
    }

    const attempts = authAttempts.get(clientId);
    
    // Reset if window has passed
    if (now - attempts.firstAttempt > windowMs) {
        attempts.count = 0;
        attempts.firstAttempt = now;
    }

    // Check if too many attempts
    if (attempts.count >= config.security.maxLoginAttempts) {
        const timeLeft = Math.ceil((windowMs - (now - attempts.firstAttempt)) / 1000);
        return res.status(429).json({ 
            error: `Too many login attempts. Try again in ${timeLeft} seconds.`,
            code: 'RATE_LIMITED',
            retryAfter: timeLeft
        });
    }

    // Increment counter
    attempts.count++;
    authAttempts.set(clientId, attempts);

    next();
}

// Clear rate limit on successful auth
function clearRateLimit(req) {
    const clientId = req.ip + ':' + (req.body.email || 'unknown');
    authAttempts.delete(clientId);
}

// Audit logging middleware
async function auditAuth(action, req, user = null, success = true, error = null) {
    try {
        const userType = user?.type || 'system'; // Use 'system' instead of 'unknown'
        await database.logAudit(
            userType,
            user?.id || null,
            action,
            'authentication',
            null,
            null,
            JSON.stringify({
                success,
                email: req.body?.email,
                userAgent: req.headers['user-agent'],
                error: error?.message
            }),
            req.ip
        );
    } catch (auditError) {
        console.error('Audit logging error:', auditError);
    }
}

// Session management
function createSession(user, userType) {
    return {
        id: user.id,
        email: user.email,
        type: userType,
        fullName: user.full_name || user.organization_name,
        createdAt: new Date().toISOString()
    };
}

// Password validation
function validatePassword(password) {
    const errors = [];
    
    if (!password) {
        errors.push('Password is required');
    } else {
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

module.exports = {
    generateTokens,
    verifyToken,
    extractToken,
    authenticate,
    authorize,
    optionalAuth,
    validateUser,
    rateLimitAuth,
    clearRateLimit,
    auditAuth,
    createSession,
    validatePassword,
    validateEmail
};