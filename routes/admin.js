const express = require('express');
const router = express.Router();

const database = require('../database/db');
const { authenticate, authorize, auditAuth } = require('../middleware/auth');
const { validationRules } = require('../middleware/validation');
const { logger } = require('../utils/logger');

// Get system health and statistics
router.get('/health', authenticate, authorize(['admin']), async (req, res) => {
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
router.get('/logs/errors', authenticate, authorize(['admin']), validationRules.search, async (req, res) => {
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
router.get('/logs/stats', authenticate, authorize(['admin']), async (req, res) => {
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
router.delete('/logs/cleanup', authenticate, authorize(['admin']), async (req, res) => {
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
router.get('/audit', authenticate, authorize(['admin']), validationRules.search, async (req, res) => {
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
router.get('/projects/pending', authenticate, authorize(['admin']), async (req, res) => {
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
router.get('/logs/export', authenticate, authorize(['admin']), async (req, res) => {
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

module.exports = router;