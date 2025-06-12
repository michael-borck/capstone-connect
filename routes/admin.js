const express = require('express');
const router = express.Router();

const database = require('../database/db');
const { authenticate, authorize, auditAuth } = require('../middleware/auth');
const { validationRules } = require('../middleware/validation');
const { logger } = require('../utils/logger');

// Import sub-routers
const usersRouter = require('./admin/users');

// Get system health and statistics
router.get('/health', authenticate, authorize('admin'), async (req, res) => {
    try {
        const healthData = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        };

        // Get database statistics
        const dbStats = await Promise.all([
            database.query('SELECT COUNT(*) as count FROM projects'),
            database.query('SELECT COUNT(*) as count FROM students'),
            database.query('SELECT COUNT(*) as count FROM clients'),
            database.query('SELECT COUNT(*) as count FROM student_interests WHERE is_active = 1'),
            database.query('SELECT COUNT(*) as count FROM error_logs WHERE created_at > datetime("now", "-24 hours")'),
            database.query('SELECT COUNT(*) as count FROM audit_log WHERE created_at > datetime("now", "-24 hours")')
        ]);

        healthData.database = {
            totalProjects: dbStats[0][0].count,
            totalStudents: dbStats[1][0].count,
            totalClients: dbStats[2][0].count,
            activeInterests: dbStats[3][0].count,
            errorsLast24h: dbStats[4][0].count,
            auditLogsLast24h: dbStats[5][0].count
        };

        // Log admin access
        await logger.logUserAction('viewed_system_health', req.user, {
            requestId: req.id
        });

        res.json({
            success: true,
            health: healthData
        });

    } catch (error) {
        await req.logError(error, { action: 'get_system_health' });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve system health',
            code: 'HEALTH_CHECK_ERROR'
        });
    }
});

// Get recent error logs
router.get('/logs/errors', authenticate, authorize('admin'), validationRules.search, async (req, res) => {
    try {
        const { limit = 50, offset = 0, level } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        if (level && ['error', 'warn', 'info'].includes(level)) {
            whereClause += ' AND level = ?';
            params.push(level);
        }
        
        const query = `
            SELECT * FROM error_logs 
            WHERE ${whereClause}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        
        const logs = await database.query(query, params);
        
        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM error_logs WHERE ${whereClause}`;
        const countParams = level ? [level] : [];
        const totalResult = await database.query(countQuery, countParams);
        const total = totalResult[0].total;

        // Log admin access
        await logger.logUserAction('viewed_error_logs', req.user, {
            requestId: req.id,
            filters: { level, limit, offset }
        });

        res.json({
            success: true,
            logs: logs.map(log => ({
                ...log,
                additional_data: log.additional_data ? JSON.parse(log.additional_data) : null
            })),
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });

    } catch (error) {
        await req.logError(error, { action: 'get_error_logs' });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve error logs',
            code: 'ERROR_LOGS_FETCH_ERROR'
        });
    }
});

// Get log statistics
router.get('/logs/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        // Get error statistics by day and level
        const dailyStats = await database.query(`
            SELECT 
                DATE(created_at) as date,
                level,
                COUNT(*) as count
            FROM error_logs 
            WHERE created_at >= ?
            GROUP BY DATE(created_at), level
            ORDER BY date DESC, level
        `, [cutoffDate.toISOString()]);

        // Get top error codes
        const topErrors = await database.query(`
            SELECT 
                error_code,
                COUNT(*) as count,
                MAX(created_at) as last_occurrence
            FROM error_logs 
            WHERE created_at >= ? AND error_code IS NOT NULL
            GROUP BY error_code
            ORDER BY count DESC
            LIMIT 10
        `, [cutoffDate.toISOString()]);

        // Get hourly distribution for the last 24 hours
        const hourlyStats = await database.query(`
            SELECT 
                strftime('%H', created_at) as hour,
                level,
                COUNT(*) as count
            FROM error_logs 
            WHERE created_at >= datetime('now', '-24 hours')
            GROUP BY strftime('%H', created_at), level
            ORDER BY hour, level
        `);

        await logger.logUserAction('viewed_log_statistics', req.user, {
            requestId: req.id,
            days: parseInt(days)
        });

        res.json({
            success: true,
            statistics: {
                dailyStats,
                topErrors,
                hourlyStats,
                period: {
                    days: parseInt(days),
                    from: cutoffDate.toISOString(),
                    to: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        await req.logError(error, { action: 'get_log_statistics' });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve log statistics',
            code: 'LOG_STATS_ERROR'
        });
    }
});

// Clear old logs (admin maintenance)
router.delete('/logs/cleanup', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { days = 90 } = req.body;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        const result = await database.run(
            'DELETE FROM error_logs WHERE created_at < ?',
            [cutoffDate.toISOString()]
        );

        await logger.logUserAction('cleaned_old_logs', req.user, {
            requestId: req.id,
            daysKept: parseInt(days),
            deletedCount: result.changes
        });

        // Log the cleanup action
        await auditAuth('logs_cleanup', req, req.user, true, null, {
            daysKept: parseInt(days),
            deletedCount: result.changes
        });

        res.json({
            success: true,
            message: `Cleaned up ${result.changes} old log entries`,
            deletedCount: result.changes,
            cutoffDate: cutoffDate.toISOString()
        });

    } catch (error) {
        await req.logError(error, { action: 'cleanup_logs' });
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup old logs',
            code: 'LOG_CLEANUP_ERROR'
        });
    }
});

// Get audit logs
router.get('/audit', authenticate, authorize('admin'), validationRules.search, async (req, res) => {
    try {
        const { limit = 50, offset = 0, action, userType } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        if (action) {
            whereClause += ' AND action LIKE ?';
            params.push(`%${action}%`);
        }
        
        if (userType && ['student', 'client', 'admin'].includes(userType)) {
            whereClause += ' AND user_type = ?';
            params.push(userType);
        }
        
        const query = `
            SELECT * FROM audit_log 
            WHERE ${whereClause}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        
        const logs = await database.query(query, params);
        
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM audit_log WHERE ${whereClause}`;
        const countParams = params.slice(0, -2); // Remove limit and offset
        const totalResult = await database.query(countQuery, countParams);
        const total = totalResult[0].total;

        await logger.logUserAction('viewed_audit_logs', req.user, {
            requestId: req.id,
            filters: { action, userType, limit, offset }
        });

        res.json({
            success: true,
            logs: logs.map(log => ({
                ...log,
                old_value: log.old_value ? JSON.parse(log.old_value) : null,
                new_value: log.new_value ? JSON.parse(log.new_value) : null
            })),
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });

    } catch (error) {
        await req.logError(error, { action: 'get_audit_logs' });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve audit logs',
            code: 'AUDIT_LOGS_ERROR'
        });
    }
});

// Get pending projects for approval
router.get('/projects/pending', authenticate, authorize('admin'), async (req, res) => {
    try {
        const projects = await database.query(`
            SELECT 
                p.*,
                c.organization_name,
                c.contact_name,
                c.email as client_email
            FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.status = 'pending'
            ORDER BY p.created_at ASC
        `);

        await logger.logUserAction('viewed_pending_projects', req.user, {
            requestId: req.id,
            pendingCount: projects.length
        });

        res.json({
            success: true,
            projects
        });

    } catch (error) {
        await req.logError(error, { action: 'get_pending_projects' });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve pending projects',
            code: 'PENDING_PROJECTS_ERROR'
        });
    }
});

// Export error logs as CSV
router.get('/logs/export', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { days = 30, level } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        let whereClause = 'created_at >= ?';
        const params = [cutoffDate.toISOString()];

        if (level && ['error', 'warn', 'info'].includes(level)) {
            whereClause += ' AND level = ?';
            params.push(level);
        }

        const logs = await database.query(`
            SELECT 
                created_at,
                level,
                message,
                error_code,
                request_method,
                request_url,
                user_id,
                ip_address
            FROM error_logs 
            WHERE ${whereClause}
            ORDER BY created_at DESC
        `, params);

        // Convert to CSV
        const csvHeader = 'Date,Level,Message,Error Code,Method,URL,User ID,IP Address\n';
        const csvData = logs.map(log => 
            `"${log.created_at}","${log.level}","${log.message?.replace(/"/g, '""') || ''}","${log.error_code || ''}","${log.request_method || ''}","${log.request_url || ''}","${log.user_id || ''}","${log.ip_address || ''}"`
        ).join('\n');

        const csv = csvHeader + csvData;

        await logger.logUserAction('exported_error_logs', req.user, {
            requestId: req.id,
            exportParams: { days: parseInt(days), level },
            recordCount: logs.length
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="error_logs_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);

    } catch (error) {
        await req.logError(error, { action: 'export_error_logs' });
        res.status(500).json({
            success: false,
            error: 'Failed to export error logs',
            code: 'LOG_EXPORT_ERROR'
        });
    }
});

// Get system statistics for admin dashboard
router.get('/statistics', authenticate, authorize('admin'), async (req, res) => {
    try {
        // Get comprehensive system statistics
        const [
            projectsStats,
            usersStats,
            interestsStats,
            organizationsStats,
            monthlyProjectsStats,
            monthlyUsersStats
        ] = await Promise.all([
            // Projects statistics
            database.query(`
                SELECT 
                    COUNT(*) as total_projects,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_projects,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as active_projects,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects
                FROM projects
            `),
            
            // Users statistics
            database.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN type = 'student' THEN 1 END) as total_students,
                    COUNT(CASE WHEN type = 'client' THEN 1 END) as total_clients,
                    COUNT(CASE WHEN type = 'admin' THEN 1 END) as total_admins
                FROM (
                    SELECT 'student' as type FROM students
                    UNION ALL
                    SELECT 'client' as type FROM clients
                    UNION ALL
                    SELECT 'admin' as type FROM admin_users
                ) as all_users
            `),
            
            // Interest statistics
            database.query(`
                SELECT 
                    COUNT(*) as total_interests,
                    COUNT(DISTINCT student_id) as students_with_interests,
                    ROUND(CAST(COUNT(*) AS FLOAT) / NULLIF(COUNT(DISTINCT project_id), 0), 2) as avg_interest_per_project
                FROM student_interests 
                WHERE is_active = 1
            `),
            
            // Organizations statistics
            database.query(`
                SELECT 
                    COUNT(DISTINCT organization_name) as total_organizations,
                    COUNT(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 END) as new_organizations
                FROM clients
                WHERE organization_name IS NOT NULL
            `),
            
            // Monthly projects trend
            database.query(`
                SELECT COUNT(*) as projects_this_month
                FROM projects 
                WHERE created_at > datetime('now', '-30 days')
            `),
            
            // Monthly users trend
            database.query(`
                SELECT COUNT(*) as users_this_month
                FROM (
                    SELECT created_at FROM students WHERE created_at > datetime('now', '-30 days')
                    UNION ALL
                    SELECT created_at FROM clients WHERE created_at > datetime('now', '-30 days')
                ) as new_users
            `)
        ]);

        // Calculate engagement rate
        const totalStudents = usersStats[0].total_students || 1;
        const studentsWithInterests = interestsStats[0].students_with_interests || 0;
        const engagementRate = Math.round((studentsWithInterests / totalStudents) * 100);

        const statistics = {
            total_projects: projectsStats[0].total_projects || 0,
            pending_projects: projectsStats[0].pending_projects || 0,
            active_projects: projectsStats[0].active_projects || 0,
            completed_projects: projectsStats[0].completed_projects || 0,
            total_users: usersStats[0].total_users || 0,
            total_students: usersStats[0].total_students || 0,
            total_clients: usersStats[0].total_clients || 0,
            total_admins: usersStats[0].total_admins || 0,
            total_interests: interestsStats[0].total_interests || 0,
            avg_interest_per_project: Math.round(interestsStats[0].avg_interest_per_project || 0),
            engagement_rate: engagementRate,
            total_organizations: organizationsStats[0].total_organizations || 0,
            new_organizations: organizationsStats[0].new_organizations || 0,
            projects_this_month: monthlyProjectsStats[0].projects_this_month || 0,
            users_this_month: monthlyUsersStats[0].users_this_month || 0
        };

        await logger.logUserAction('viewed_admin_statistics', req.user, {
            requestId: req.id
        });

        res.json({
            success: true,
            ...statistics
        });

    } catch (error) {
        await req.logError(error, { action: 'get_admin_statistics' });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve system statistics',
            code: 'ADMIN_STATS_ERROR'
        });
    }
});

// Get all projects for admin management
router.get('/projects/all', authenticate, authorize('admin'), async (req, res) => {
    try {
        const projects = await database.query(`
            SELECT 
                p.*,
                c.organization_name,
                c.contact_name,
                c.email as client_email,
                COUNT(DISTINCT si.student_id) as interest_count,
                COUNT(DISTINCT sf.student_id) as favorites_count
            FROM projects p
            JOIN clients c ON p.client_id = c.id
            LEFT JOIN student_interests si ON p.id = si.project_id AND si.is_active = 1
            LEFT JOIN student_favorites sf ON p.id = sf.project_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);

        await logger.logUserAction('viewed_all_projects', req.user, {
            requestId: req.id,
            projectCount: projects.length
        });

        res.json({
            success: true,
            projects
        });

    } catch (error) {
        await req.logError(error, { action: 'get_all_projects' });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve all projects',
            code: 'ALL_PROJECTS_ERROR'
        });
    }
});

// Get all users for admin management
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        // Get all users from different tables
        const [students, clients, admins] = await Promise.all([
            database.query(`
                SELECT 
                    s.id,
                    s.full_name,
                    s.email,
                    s.created_at,
                    'student' as type,
                    NULL as organization_name,
                    COUNT(DISTINCT si.project_id) as interests_count,
                    COUNT(DISTINCT sf.project_id) as favorites_count
                FROM students s
                LEFT JOIN student_interests si ON s.id = si.student_id AND si.is_active = 1
                LEFT JOIN student_favorites sf ON s.id = sf.student_id
                GROUP BY s.id
            `),
            
            database.query(`
                SELECT 
                    c.id,
                    c.contact_name as full_name,
                    c.email,
                    c.created_at,
                    'client' as type,
                    c.organization_name,
                    COUNT(DISTINCT p.id) as projects_count,
                    0 as interests_count,
                    0 as favorites_count
                FROM clients c
                LEFT JOIN projects p ON c.id = p.client_id
                GROUP BY c.id
            `),
            
            database.query(`
                SELECT 
                    a.id,
                    a.full_name,
                    a.email,
                    a.created_at,
                    'admin' as type,
                    NULL as organization_name,
                    0 as projects_count,
                    0 as interests_count,
                    0 as favorites_count
                FROM admin_users a
            `)
        ]);

        // Combine all users
        const allUsers = [
            ...students.map(s => ({
                ...s,
                projects_count: 0
            })),
            ...clients.map(c => ({
                ...c,
                favorites_count: 0
            })),
            ...admins
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        await logger.logUserAction('viewed_user_management', req.user, {
            requestId: req.id,
            userCount: allUsers.length
        });

        res.json({
            success: true,
            users: allUsers
        });

    } catch (error) {
        await req.logError(error, { action: 'get_all_users' });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve users',
            code: 'ALL_USERS_ERROR'
        });
    }
});

// Bulk approve projects
router.post('/projects/bulk-approve', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { projectIds } = req.body;
        
        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Project IDs array is required',
                code: 'INVALID_PROJECT_IDS'
            });
        }

        // Validate all project IDs exist and are pending
        const placeholders = projectIds.map(() => '?').join(',');
        const projects = await database.query(
            `SELECT id, title, status FROM projects WHERE id IN (${placeholders})`,
            projectIds
        );

        if (projects.length !== projectIds.length) {
            return res.status(400).json({
                success: false,
                error: 'Some project IDs are invalid',
                code: 'INVALID_PROJECT_IDS'
            });
        }

        const nonPendingProjects = projects.filter(p => p.status !== 'pending');
        if (nonPendingProjects.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Some projects are not in pending status: ${nonPendingProjects.map(p => p.title).join(', ')}`,
                code: 'INVALID_PROJECT_STATUS'
            });
        }

        // Update all projects to approved status
        const updateQuery = `UPDATE projects SET status = 'approved', updated_at = datetime('now') WHERE id IN (${placeholders})`;
        const result = await database.run(updateQuery, projectIds);

        await logger.logUserAction('bulk_approved_projects', req.user, {
            requestId: req.id,
            projectIds,
            approvedCount: result.changes
        });

        res.json({
            success: true,
            message: `Successfully approved ${result.changes} projects`,
            approved: result.changes
        });

    } catch (error) {
        await req.logError(error, { action: 'bulk_approve_projects' });
        res.status(500).json({
            success: false,
            error: 'Failed to bulk approve projects',
            code: 'BULK_APPROVE_ERROR'
        });
    }
});

// Bulk reject projects
router.post('/projects/bulk-reject', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { projectIds, feedback } = req.body;
        
        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Project IDs array is required',
                code: 'INVALID_PROJECT_IDS'
            });
        }

        // Validate all project IDs exist and are pending
        const placeholders = projectIds.map(() => '?').join(',');
        const projects = await database.query(
            `SELECT id, title, status FROM projects WHERE id IN (${placeholders})`,
            projectIds
        );

        if (projects.length !== projectIds.length) {
            return res.status(400).json({
                success: false,
                error: 'Some project IDs are invalid',
                code: 'INVALID_PROJECT_IDS'
            });
        }

        const nonPendingProjects = projects.filter(p => p.status !== 'pending');
        if (nonPendingProjects.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Some projects are not in pending status: ${nonPendingProjects.map(p => p.title).join(', ')}`,
                code: 'INVALID_PROJECT_STATUS'
            });
        }

        // Update all projects to rejected status with feedback
        const updateQuery = `
            UPDATE projects 
            SET status = 'rejected', 
                admin_feedback = ?, 
                updated_at = datetime('now') 
            WHERE id IN (${placeholders})
        `;
        const result = await database.run(updateQuery, [feedback || null, ...projectIds]);

        await logger.logUserAction('bulk_rejected_projects', req.user, {
            requestId: req.id,
            projectIds,
            rejectedCount: result.changes,
            feedback: feedback || null
        });

        res.json({
            success: true,
            message: `Successfully rejected ${result.changes} projects`,
            rejected: result.changes
        });

    } catch (error) {
        await req.logError(error, { action: 'bulk_reject_projects' });
        res.status(500).json({
            success: false,
            error: 'Failed to bulk reject projects',
            code: 'BULK_REJECT_ERROR'
        });
    }
});

// Mount sub-routers
router.use('/users', usersRouter);

module.exports = router;