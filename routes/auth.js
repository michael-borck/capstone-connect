const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const database = require('../database/db');
const config = require('../config/config');
const { 
    generateTokens, 
    rateLimitAuth, 
    clearRateLimit, 
    auditAuth,
    createSession,
    authenticate,
    optionalAuth
} = require('../middleware/auth');
const { validationRules } = require('../middleware/validation');

// Student registration
router.post('/register/student', validationRules.studentRegister, async (req, res) => {
    const { email, password, fullName, studentId } = req.body;

    try {
        // Check if student already exists
        const existingStudent = await database.getStudentByEmail(email);
        if (existingStudent) {
            await auditAuth('register_failed', req, null, false, new Error('Email already exists'));
            return res.status(409).json({ 
                error: 'Email already registered',
                code: 'EMAIL_EXISTS'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

        // Create student
        const result = await database.createStudent(email, passwordHash, fullName, studentId);
        
        // Get the created student
        const student = await database.getStudentById(result.id);
        
        // Generate tokens
        const tokens = generateTokens(student, 'student');
        
        // Create session
        const session = createSession(student, 'student');

        // Set HTTP-only cookie for refresh token
        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        await auditAuth('register_success', req, student, true);

        res.status(201).json({
            message: 'Student registered successfully',
            user: {
                id: student.id,
                email: student.email,
                fullName: student.full_name,
                studentId: student.student_id,
                type: 'student'
            },
            token: tokens.accessToken,
            session
        });

    } catch (error) {
        console.error('Student registration error:', error);
        await auditAuth('register_failed', req, null, false, error);
        res.status(500).json({ 
            error: 'Internal server error during registration',
            code: 'REGISTRATION_ERROR'
        });
    }
});

// Client registration with optional project submission
router.post('/register/client', validationRules.clientRegister, async (req, res) => {
    const { 
        email, password, organizationName, contactName, contactTitle, phone, 
        website, address, orgDescription, industry, project, discussFirst
    } = req.body;

    try {
        // Check if client already exists
        const existingClient = await database.getClientByEmail(email);
        if (existingClient) {
            await auditAuth('register_failed', req, null, false, new Error('Email already exists'));
            return res.status(409).json({ 
                error: 'Email already registered',
                code: 'EMAIL_EXISTS'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

        // Start transaction for atomic registration
        await database.run('BEGIN TRANSACTION');

        try {
            // Create client with enhanced data (all optional fields except essentials)
            const clientResult = await database.createClient(
                email, passwordHash, organizationName, contactName, 
                phone || null, address || null, contactTitle || null, 
                website || null, orgDescription || null, industry || null
            );

            const clientId = clientResult.id;
            
            // Create initial project if provided (only if not "discuss first" and has project data)
            let projectId = null;
            const hasProjectData = project && (project.title || project.description);
            
            if (!discussFirst && hasProjectData) {
                // Only create project if they have provided some project information
                const projectResult = await database.run(`
                    INSERT INTO projects (
                        client_id, title, description, required_skills, tools_technologies,
                        deliverables, semester_availability, duration_weeks, max_students,
                        project_type, prerequisites, additional_info, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `, [
                    clientId, 
                    project.title || 'Untitled Project', 
                    project.description || null, 
                    project.required_skills || null,
                    project.tools_technologies || null, 
                    project.deliverables || null, 
                    project.semester_availability || null,
                    project.duration_weeks || null, 
                    project.max_students || null,
                    project.project_type || null, 
                    project.prerequisites || null,
                    project.additional_info || null, 
                    'pending'
                ]);
                
                projectId = projectResult.id;
            }

            // Commit transaction
            await database.run('COMMIT');

            // Get the created client with full details
            const client = await database.get(`
                SELECT 
                    id, email, organization_name, contact_name, contact_title,
                    phone, website, industry, description, created_at
                FROM clients WHERE id = ?
            `, [clientId]);

            // Log successful registration
            await auditAuth('register_success', req, client, true, null, {
                hasInitialProject: !!projectId,
                projectId: projectId,
                organizationName: organizationName,
                industry: industry || 'not_specified',
                discussFirst: !!discussFirst
            });

            // Determine next steps message
            let nextStepsMessage = 'Registration submitted successfully.';
            if (discussFirst) {
                nextStepsMessage = 'Registration submitted successfully. Our team will contact you to discuss project opportunities.';
            } else if (projectId) {
                nextStepsMessage = 'Registration and project submitted successfully. Your project is pending review.';
            } else {
                nextStepsMessage = 'Registration submitted successfully. You can add project details later from your dashboard.';
            }

            // Note: We don't automatically log them in for security
            // They need to verify their email and login manually
            res.status(201).json({
                success: true,
                message: nextStepsMessage,
                data: {
                    organizationName: client.organization_name,
                    contactName: client.contact_name,
                    email: client.email,
                    hasProject: !!projectId,
                    discussFirst: !!discussFirst,
                    status: 'pending_review',
                    nextSteps: discussFirst ? 'UC staff will contact you' : 'Login to access your dashboard'
                }
            });

        } catch (dbError) {
            // Rollback transaction on error
            await database.run('ROLLBACK');
            console.error('Database error during client registration:', dbError);
            throw dbError;
        }

    } catch (error) {
        console.error('Client registration error:', error);
        console.error('Request body:', req.body);
        await auditAuth('register_failed', req, null, false, error);
        
        // Return user-friendly error message
        let errorMessage = 'Registration failed. Please try again.';
        if (error.message.includes('UNIQUE constraint failed')) {
            errorMessage = 'Email address is already registered.';
        }
        
        res.status(500).json({ 
            success: false,
            error: errorMessage,
            code: 'REGISTRATION_ERROR'
        });
    }
});

// Student login
router.post('/login/student', rateLimitAuth, validationRules.login, async (req, res) => {
    const { email, password } = req.body;

    try {
        // Get student by email
        const student = await database.getStudentByEmail(email);
        if (!student) {
            await auditAuth('login_failed', req, null, false, new Error('Student not found'));
            return res.status(401).json({ 
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, student.password_hash);
        if (!isValidPassword) {
            await auditAuth('login_failed', req, student, false, new Error('Invalid password'));
            return res.status(401).json({ 
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Update last login
        await database.updateStudentLogin(student.id);

        // Generate tokens
        const tokens = generateTokens(student, 'student');
        
        // Create session
        const session = createSession(student, 'student');

        // Set HTTP-only cookie for refresh token
        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Clear rate limiting on successful login
        clearRateLimit(req);

        await auditAuth('login_success', req, student, true);

        res.json({
            message: 'Login successful',
            user: {
                id: student.id,
                email: student.email,
                fullName: student.full_name,
                studentId: student.student_id,
                type: 'student'
            },
            token: tokens.accessToken,
            session
        });

    } catch (error) {
        console.error('Student login error:', error);
        await auditAuth('login_failed', req, null, false, error);
        res.status(500).json({ 
            error: 'Internal server error during login',
            code: 'LOGIN_ERROR'
        });
    }
});

// Client login
router.post('/login/client', rateLimitAuth, validationRules.login, async (req, res) => {
    const { email, password } = req.body;

    try {
        // Get client by email
        const client = await database.getClientByEmail(email);
        if (!client) {
            await auditAuth('login_failed', req, null, false, new Error('Client not found'));
            return res.status(401).json({ 
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, client.password_hash);
        if (!isValidPassword) {
            await auditAuth('login_failed', req, client, false, new Error('Invalid password'));
            return res.status(401).json({ 
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Update last login
        await database.updateClientLogin(client.id);

        // Generate tokens
        const tokens = generateTokens(client, 'client');
        
        // Create session
        const session = createSession(client, 'client');

        // Set HTTP-only cookie for refresh token
        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Clear rate limiting on successful login
        clearRateLimit(req);

        await auditAuth('login_success', req, client, true);

        res.json({
            message: 'Login successful',
            user: {
                id: client.id,
                email: client.email,
                organizationName: client.organization_name,
                contactName: client.contact_name,
                type: 'client'
            },
            token: tokens.accessToken,
            session
        });

    } catch (error) {
        console.error('Client login error:', error);
        await auditAuth('login_failed', req, null, false, error);
        res.status(500).json({ 
            error: 'Internal server error during login',
            code: 'LOGIN_ERROR'
        });
    }
});

// Admin login
router.post('/login/admin', rateLimitAuth, validationRules.login, async (req, res) => {
    const { email, password } = req.body;

    try {
        // Get admin by email
        const admin = await database.getAdminByEmail(email);
        if (!admin) {
            await auditAuth('login_failed', req, null, false, new Error('Admin not found'));
            return res.status(401).json({ 
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            await auditAuth('login_failed', req, admin, false, new Error('Invalid password'));
            return res.status(401).json({ 
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Update last login
        await database.updateAdminLogin(admin.id);

        // Generate tokens
        const tokens = generateTokens(admin, 'admin');
        
        // Create session
        const session = createSession(admin, 'admin');

        // Set HTTP-only cookie for refresh token
        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Clear rate limiting on successful login
        clearRateLimit(req);

        await auditAuth('login_success', req, admin, true);

        res.json({
            message: 'Login successful',
            user: {
                id: admin.id,
                email: admin.email,
                fullName: admin.full_name,
                type: 'admin'
            },
            token: tokens.accessToken,
            session
        });

    } catch (error) {
        console.error('Admin login error:', error);
        await auditAuth('login_failed', req, null, false, error);
        res.status(500).json({ 
            error: 'Internal server error during login',
            code: 'LOGIN_ERROR'
        });
    }
});

// Logout
router.post('/logout', optionalAuth, async (req, res) => {
    try {
        // Clear refresh token cookie
        res.clearCookie('refresh_token');

        if (req.user) {
            await auditAuth('logout', req, req.user, true);
        }

        res.json({ 
            message: 'Logout successful' 
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            error: 'Internal server error during logout',
            code: 'LOGOUT_ERROR'
        });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refresh_token;
        
        if (!refreshToken) {
            return res.status(401).json({ 
                error: 'Refresh token not provided',
                code: 'NO_REFRESH_TOKEN'
            });
        }

        // Verify refresh token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, config.jwt.secret);

        // Get user data
        let user;
        switch (decoded.type) {
            case 'admin':
                user = await database.getAdminByEmail(decoded.email);
                break;
            case 'client':
                user = await database.getClientByEmail(decoded.email);
                break;
            case 'student':
                user = await database.getStudentByEmail(decoded.email);
                break;
            default:
                throw new Error('Invalid user type');
        }

        if (!user) {
            return res.status(401).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Generate new tokens
        const tokens = generateTokens(user, decoded.type);

        // Set new refresh token cookie
        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: 'Token refreshed successfully',
            token: tokens.accessToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.clearCookie('refresh_token');
        res.status(401).json({ 
            error: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
        });
    }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
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
                return res.status(400).json({ 
                    error: 'Invalid user type',
                    code: 'INVALID_USER_TYPE'
                });
        }

        if (!user) {
            return res.status(404).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Return user profile without sensitive data
        const profile = {
            id: user.id,
            email: user.email,
            type: req.user.type,
            createdAt: user.created_at,
            lastLogin: user.last_login
        };

        // Add type-specific fields
        switch (req.user.type) {
            case 'admin':
                profile.fullName = user.full_name;
                break;
            case 'client':
                profile.organizationName = user.organization_name;
                profile.contactName = user.contact_name;
                profile.phone = user.phone;
                profile.address = user.address;
                break;
            case 'student':
                profile.fullName = user.full_name;
                profile.studentId = user.student_id;
                break;
        }

        res.json({
            user: profile
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROFILE_ERROR'
        });
    }
});

// Verify token endpoint
router.get('/verify', authenticate, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            type: req.user.type
        }
    });
});

// Helper function to get client IP safely (proxy-aware)
function getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           'unknown';
}

// Unified login endpoint - determines user type automatically
router.post('/login', async (req, res) => {
    const clientIP = getClientIP(req);
    
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Find user across all user types
        const userResult = await database.getUserByEmail(normalizedEmail);
        
        if (!userResult) {
            // Log failed attempt with safe error handling
            try {
                await database.logAudit(
                    'unknown',
                    0,
                    'login_failed',
                    'auth',
                    null,
                    null,
                    JSON.stringify({ 
                        email: normalizedEmail, 
                        reason: 'user_not_found',
                        timestamp: new Date().toISOString()
                    }),
                    clientIP
                );
            } catch (auditError) {
                console.warn('Audit logging failed:', auditError.message);
            }

            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const { user, type } = userResult;

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            // Log failed attempt with safe error handling
            try {
                await database.logAudit(
                    type,
                    user.id,
                    'login_failed',
                    'auth',
                    null,
                    null,
                    JSON.stringify({ 
                        email: normalizedEmail, 
                        reason: 'invalid_password',
                        timestamp: new Date().toISOString()
                    }),
                    clientIP
                );
            } catch (auditError) {
                console.warn('Audit logging failed:', auditError.message);
            }

            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Update last login timestamp
        try {
            switch (type) {
                case 'student':
                    await database.updateStudentLogin(user.id);
                    break;
                case 'client':
                    await database.updateClientLogin(user.id);
                    break;
                case 'admin':
                    await database.updateAdminLogin(user.id);
                    break;
            }
        } catch (updateError) {
            console.warn('Failed to update last login:', updateError.message);
            // Continue with login - this is not critical
        }

        // Generate JWT token
        const tokenPayload = {
            id: user.id,
            email: user.email,
            type: type
        };

        // Add type-specific fields to token
        switch (type) {
            case 'student':
                tokenPayload.fullName = user.full_name;
                tokenPayload.studentId = user.student_id;
                break;
            case 'client':
                tokenPayload.organizationName = user.organization_name;
                tokenPayload.contactName = user.contact_name;
                break;
            case 'admin':
                tokenPayload.fullName = user.full_name;
                break;
        }

        const token = jwt.sign(tokenPayload, config.jwt.secret, { expiresIn: '24h' });

        // Log successful login with safe error handling
        try {
            await database.logAudit(
                type,
                user.id,
                'login_successful',
                'auth',
                null,
                null,
                JSON.stringify({ 
                    email: normalizedEmail,
                    userType: type,
                    timestamp: new Date().toISOString()
                }),
                clientIP
            );
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }

        res.json({
            success: true,
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} login successful`,
            token,
            user: {
                id: user.id,
                email: user.email,
                type: type,
                ...(type === 'student' && { 
                    fullName: user.full_name, 
                    studentId: user.student_id 
                }),
                ...(type === 'client' && { 
                    organizationName: user.organization_name, 
                    contactName: user.contact_name 
                }),
                ...(type === 'admin' && { 
                    fullName: user.full_name 
                })
            }
        });

    } catch (error) {
        console.error('Unified login error:', error);
        
        // Log system error with safe error handling
        try {
            await database.logAudit(
                'system',
                0,
                'login_error',
                'auth',
                null,
                null,
                JSON.stringify({ 
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                }),
                clientIP
            );
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;