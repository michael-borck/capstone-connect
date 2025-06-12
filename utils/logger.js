const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const database = require('../database/db');

// Log levels
const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn', 
    INFO: 'info',
    DEBUG: 'debug'
};

// Log categories
const LOG_CATEGORIES = {
    AUTH: 'auth',
    DATABASE: 'database',
    API: 'api',
    SECURITY: 'security',
    SYSTEM: 'system',
    USER_ACTION: 'user_action'
};

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    async ensureLogDirectory() {
        try {
            await fs.access(this.logsDir);
        } catch (error) {
            await fs.mkdir(this.logsDir, { recursive: true });
        }
    }

    // Format log entry
    formatLogEntry(level, category, message, metadata = {}) {
        return {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            category: category.toUpperCase(),
            message,
            ...metadata,
            environment: config.environment,
            nodeVersion: process.version,
            pid: process.pid
        };
    }

    // Write to file
    async writeToFile(logEntry) {
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `${logEntry.category.toLowerCase()}-${dateStr}.log`;
            const filepath = path.join(this.logsDir, filename);
            
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(filepath, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    // Write to database
    async writeToDatabase(logEntry) {
        try {
            await database.logError({
                level: logEntry.level.toLowerCase(),
                message: logEntry.message,
                error_code: logEntry.errorCode || null,
                request_method: logEntry.requestMethod || null,
                request_url: logEntry.requestUrl || null,
                user_id: logEntry.userId || null,
                ip_address: logEntry.ipAddress || null,
                user_agent: logEntry.userAgent || null,
                stack_trace: logEntry.stackTrace || null,
                additional_data: JSON.stringify({
                    category: logEntry.category,
                    metadata: logEntry.metadata || {},
                    environment: logEntry.environment,
                    pid: logEntry.pid
                })
            });
        } catch (error) {
            console.error('Failed to write to database log:', error);
        }
    }

    // Core logging method
    async log(level, category, message, metadata = {}) {
        const logEntry = this.formatLogEntry(level, category, message, metadata);
        
        // Always log to console
        const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : 
                            level === LOG_LEVELS.WARN ? 'warn' : 'log';
        console[consoleMethod](`[${logEntry.timestamp}] ${logEntry.level}:${logEntry.category} - ${message}`, 
                               metadata);

        // Write to file in development or if configured
        if (config.isDevelopment || config.logToFile) {
            await this.writeToFile(logEntry);
        }

        // Write to database for errors and warnings
        if (level === LOG_LEVELS.ERROR || level === LOG_LEVELS.WARN) {
            await this.writeToDatabase(logEntry);
        }
    }

    // Convenience methods
    async error(category, message, metadata = {}) {
        return this.log(LOG_LEVELS.ERROR, category, message, metadata);
    }

    async warn(category, message, metadata = {}) {
        return this.log(LOG_LEVELS.WARN, category, message, metadata);
    }

    async info(category, message, metadata = {}) {
        return this.log(LOG_LEVELS.INFO, category, message, metadata);
    }

    async debug(category, message, metadata = {}) {
        if (config.isDevelopment) {
            return this.log(LOG_LEVELS.DEBUG, category, message, metadata);
        }
    }

    // Specialized logging methods
    async logAuthentication(action, success, user, request, error = null) {
        const metadata = {
            action,
            success,
            userId: user?.id,
            userType: user?.type,
            email: user?.email,
            ipAddress: request.ip,
            userAgent: request.get('User-Agent'),
            requestUrl: request.url,
            requestMethod: request.method
        };

        if (error) {
            metadata.error = error.message;
            metadata.stackTrace = error.stack;
        }

        const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.WARN;
        const message = `Authentication ${action} ${success ? 'succeeded' : 'failed'}`;
        
        return this.log(level, LOG_CATEGORIES.AUTH, message, metadata);
    }

    async logDatabaseOperation(operation, table, success, metadata = {}, error = null) {
        const logMetadata = {
            operation,
            table,
            success,
            ...metadata
        };

        if (error) {
            logMetadata.error = error.message;
            logMetadata.stackTrace = error.stack;
        }

        const level = success ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
        const message = `Database ${operation} on ${table} ${success ? 'succeeded' : 'failed'}`;
        
        return this.log(level, LOG_CATEGORIES.DATABASE, message, logMetadata);
    }

    async logAPIRequest(request, response, duration, error = null) {
        const metadata = {
            method: request.method,
            url: request.url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            userAgent: request.get('User-Agent'),
            ipAddress: request.ip,
            userId: request.user?.id,
            userType: request.user?.type
        };

        if (error) {
            metadata.error = error.message;
            metadata.stackTrace = error.stack;
        }

        const level = response.statusCode >= 500 ? LOG_LEVELS.ERROR :
                     response.statusCode >= 400 ? LOG_LEVELS.WARN :
                     LOG_LEVELS.INFO;

        const message = `${request.method} ${request.url} - ${response.statusCode} (${duration}ms)`;
        
        return this.log(level, LOG_CATEGORIES.API, message, metadata);
    }

    async logSecurityEvent(eventType, severity, description, request, metadata = {}) {
        const logMetadata = {
            eventType,
            severity,
            ipAddress: request.ip,
            userAgent: request.get('User-Agent'),
            url: request.url,
            method: request.method,
            userId: request.user?.id,
            ...metadata
        };

        const level = severity === 'high' ? LOG_LEVELS.ERROR : 
                     severity === 'medium' ? LOG_LEVELS.WARN : 
                     LOG_LEVELS.INFO;

        return this.log(level, LOG_CATEGORIES.SECURITY, description, logMetadata);
    }

    async logUserAction(action, user, metadata = {}) {
        const logMetadata = {
            action,
            userId: user?.id,
            userType: user?.type,
            email: user?.email,
            ...metadata
        };

        return this.log(LOG_LEVELS.INFO, LOG_CATEGORIES.USER_ACTION, `User ${action}`, logMetadata);
    }

    async logSystemEvent(event, description, metadata = {}) {
        return this.log(LOG_LEVELS.INFO, LOG_CATEGORIES.SYSTEM, description, {
            event,
            ...metadata
        });
    }

    // Log rotation and cleanup
    async rotateOldLogs(daysToKeep = 30) {
        try {
            const files = await fs.readdir(this.logsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            for (const file of files) {
                if (file.endsWith('.log')) {
                    const filePath = path.join(this.logsDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        await fs.unlink(filePath);
                        console.log(`Rotated old log file: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error during log rotation:', error);
        }
    }

    // Get recent logs for admin dashboard
    async getRecentLogs(category = null, limit = 100) {
        try {
            const whereClause = category ? 'WHERE level IN (?, ?)' : 'WHERE 1=1';
            const params = category ? ['error', 'warn'] : [];
            
            const query = `
                SELECT * FROM error_logs 
                ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            
            params.push(limit);
            return await database.query(query, params);
        } catch (error) {
            console.error('Error fetching recent logs:', error);
            return [];
        }
    }

    // Get log statistics
    async getLogStats(days = 7) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const stats = await database.query(`
                SELECT 
                    level,
                    COUNT(*) as count,
                    DATE(created_at) as date
                FROM error_logs 
                WHERE created_at >= ?
                GROUP BY level, DATE(created_at)
                ORDER BY date DESC, level
            `, [cutoffDate.toISOString()]);

            return stats;
        } catch (error) {
            console.error('Error fetching log statistics:', error);
            return [];
        }
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = {
    logger,
    LOG_LEVELS,
    LOG_CATEGORIES
};