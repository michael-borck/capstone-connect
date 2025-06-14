const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const database = require('../../database/db');
const { authenticate, authorize } = require('../../middleware/auth');
const { logger } = require('../../utils/logger');

// Archive a single user
router.post('/:userType/:userId/archive', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { userType, userId } = req.params;
        const validTypes = ['student', 'client', 'admin'];
        
        if (!validTypes.includes(userType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user type',
                code: 'INVALID_USER_TYPE'
            });
        }

        // Map user type to table name
        const tableMap = {
            'student': 'students',
            'client': 'clients', 
            'admin': 'admin_users'
        };
        
        const tableName = tableMap[userType];
        
        // Check if user exists and is not already archived
        const user = await database.get(
            `SELECT id, email, is_archived FROM ${tableName} WHERE id = ?`,
            [userId]
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        if (user.is_archived) {
            return res.status(400).json({
                success: false,
                error: 'User is already archived',
                code: 'USER_ALREADY_ARCHIVED'
            });
        }
        
        // Archive the user
        await database.run(
            `UPDATE ${tableName} 
             SET is_archived = 1, archived_at = datetime('now') 
             WHERE id = ?`,
            [userId]
        );
        
        await logger.logUserAction('archived_user', req.user, {
            requestId: req.id,
            userType,
            userId,
            userEmail: user.email
        });
        
        res.json({
            success: true,
            message: 'User archived successfully'
        });
        
    } catch (error) {
        await req.logError(error, { action: 'archive_user' });
        res.status(500).json({
            success: false,
            error: 'Failed to archive user',
            code: 'ARCHIVE_USER_ERROR'
        });
    }
});

// Restore an archived user
router.post('/:userType/:userId/restore', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { userType, userId } = req.params;
        const validTypes = ['student', 'client', 'admin'];
        
        if (!validTypes.includes(userType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user type',
                code: 'INVALID_USER_TYPE'
            });
        }

        const tableMap = {
            'student': 'students',
            'client': 'clients',
            'admin': 'admin_users'
        };
        
        const tableName = tableMap[userType];
        
        // Check if user exists and is archived
        const user = await database.get(
            `SELECT id, email, is_archived FROM ${tableName} WHERE id = ?`,
            [userId]
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        if (!user.is_archived) {
            return res.status(400).json({
                success: false,
                error: 'User is not archived',
                code: 'USER_NOT_ARCHIVED'
            });
        }
        
        // Restore the user
        await database.run(
            `UPDATE ${tableName} 
             SET is_archived = 0, archived_at = NULL 
             WHERE id = ?`,
            [userId]
        );
        
        await logger.logUserAction('restored_user', req.user, {
            requestId: req.id,
            userType,
            userId,
            userEmail: user.email
        });
        
        res.json({
            success: true,
            message: 'User restored successfully'
        });
        
    } catch (error) {
        await req.logError(error, { action: 'restore_user' });
        res.status(500).json({
            success: false,
            error: 'Failed to restore user',
            code: 'RESTORE_USER_ERROR'
        });
    }
});

// Bulk archive users
router.post('/bulk-archive', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { users } = req.body;
        
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Users array is required',
                code: 'INVALID_USERS_ARRAY'
            });
        }
        
        const results = {
            archived: 0,
            failed: [],
            alreadyArchived: []
        };
        
        // Process each user
        for (const userInfo of users) {
            const { type, id } = userInfo;
            
            if (!['student', 'client', 'admin'].includes(type)) {
                results.failed.push({ id, type, reason: 'Invalid user type' });
                continue;
            }
            
            const tableMap = {
                'student': 'students',
                'client': 'clients',
                'admin': 'admin_users'
            };
            
            const tableName = tableMap[type];
            
            try {
                // Check current status
                const user = await database.get(
                    `SELECT id, email, is_archived FROM ${tableName} WHERE id = ?`,
                    [id]
                );
                
                if (!user) {
                    results.failed.push({ id, type, reason: 'User not found' });
                    continue;
                }
                
                if (user.is_archived) {
                    results.alreadyArchived.push({ id, type, email: user.email });
                    continue;
                }
                
                // Archive the user
                await database.run(
                    `UPDATE ${tableName} 
                     SET is_archived = 1, archived_at = datetime('now') 
                     WHERE id = ?`,
                    [id]
                );
                
                results.archived++;
                
            } catch (err) {
                results.failed.push({ id, type, reason: err.message });
            }
        }
        
        await logger.logUserAction('bulk_archived_users', req.user, {
            requestId: req.id,
            totalRequested: users.length,
            results
        });
        
        res.json({
            success: true,
            message: `Successfully archived ${results.archived} users`,
            results
        });
        
    } catch (error) {
        await req.logError(error, { action: 'bulk_archive_users' });
        res.status(500).json({
            success: false,
            error: 'Failed to bulk archive users',
            code: 'BULK_ARCHIVE_ERROR'
        });
    }
});

// Permanently delete a user (hard delete - use with caution)
router.delete('/:userType/:userId', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { userType, userId } = req.params;
        const { confirmDelete } = req.body;
        
        if (!confirmDelete) {
            return res.status(400).json({
                success: false,
                error: 'Deletion must be confirmed',
                code: 'DELETION_NOT_CONFIRMED'
            });
        }
        
        const validTypes = ['student', 'client'];
        if (!validTypes.includes(userType)) {
            return res.status(400).json({
                success: false,
                error: 'Only students and clients can be deleted',
                code: 'INVALID_USER_TYPE'
            });
        }
        
        const tableMap = {
            'student': 'students',
            'client': 'clients'
        };
        
        const tableName = tableMap[userType];
        
        // Get user info before deletion
        const user = await database.get(
            `SELECT id, email, full_name, contact_name FROM ${tableName} WHERE id = ?`,
            [userId]
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Check if user has active data
        if (userType === 'student') {
            const activeInterests = await database.get(
                'SELECT COUNT(*) as count FROM student_interests WHERE student_id = ? AND is_active = 1',
                [userId]
            );
            
            if (activeInterests.count > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete student with active project interests',
                    code: 'HAS_ACTIVE_INTERESTS'
                });
            }
        } else if (userType === 'client') {
            const activeProjects = await database.get(
                'SELECT COUNT(*) as count FROM projects WHERE client_id = ? AND status NOT IN ("completed", "rejected")',
                [userId]
            );
            
            if (activeProjects.count > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete client with active projects',
                    code: 'HAS_ACTIVE_PROJECTS'
                });
            }
        }
        
        // Perform the deletion
        await database.run(`DELETE FROM ${tableName} WHERE id = ?`, [userId]);
        
        await logger.logUserAction('deleted_user', req.user, {
            requestId: req.id,
            userType,
            userId,
            userEmail: user.email,
            userName: user.full_name || user.contact_name
        });
        
        res.json({
            success: true,
            message: 'User permanently deleted'
        });
        
    } catch (error) {
        await req.logError(error, { action: 'delete_user' });
        res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            code: 'DELETE_USER_ERROR'
        });
    }
});

// Create new user endpoint
router.post('/create', authenticate, authorize('admin'), async (req, res) => {
    const bcrypt = require('bcrypt');
    
    try {
        const { type, email, password, fullName, studentId, course, yearLevel, organizationName, contactName, website } = req.body;
        
        // Validate required fields
        if (!type || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'User type, email, and password are required'
            });
        }
        
        // Validate password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }
        
        // Check if email already exists across all user types
        const existingStudent = await database.getStudentByEmail(email);
        const existingClient = await database.getClientByEmail(email);
        const existingAdmin = await database.getAdminByEmail(email);
        
        if (existingStudent || existingClient || existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }
        
        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user based on type
        let newUser;
        if (type === 'student') {
            if (!fullName || !studentId || !course || !yearLevel) {
                return res.status(400).json({
                    success: false,
                    message: 'All student fields are required'
                });
            }
            
            // Store additional student fields in the database
            newUser = await database.createStudent(email, passwordHash, fullName, studentId);
            
            // Update student with additional fields
            await database.run(
                'UPDATE students SET course = ?, year_level = ? WHERE id = ?',
                [course, parseInt(yearLevel), newUser.lastID]
            );
            
            newUser.id = newUser.lastID;
            
        } else if (type === 'client') {
            if (!organizationName || !contactName) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization name and contact name are required'
                });
            }
            
            newUser = await database.createClient(
                email, 
                passwordHash, 
                organizationName, 
                contactName,
                '', // phone
                '', // address
                '', // contact title
                website || '', // website
                '', // description
                '' // industry
            );
            
            newUser.id = newUser.lastID;
            
        } else if (type === 'admin') {
            if (!fullName) {
                return res.status(400).json({
                    success: false,
                    message: 'Admin name is required'
                });
            }
            
            newUser = await database.createAdmin(email, passwordHash, fullName);
            newUser.id = newUser.lastID;
            
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid user type'
            });
        }
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'user_created',
            type,
            newUser.id,
            null,
            JSON.stringify({ email, type }),
            req.ip
        );
        
        res.status(201).json({
            success: true,
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} user created successfully`,
            user: {
                id: newUser.id,
                email: email,
                type
            }
        });
        
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create user'
        });
    }
});

module.exports = router;