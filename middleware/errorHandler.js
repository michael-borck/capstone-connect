const config = require('../config/config');
const database = require('../database/db');
const { logger } = require('../utils/logger');

// Custom error classes
class ValidationError extends Error {
    constructor(message, details = []) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.code = 'VALIDATION_ERROR';
        this.details = details;
    }
}

class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
        this.code = 'AUTHENTICATION_ERROR';
    }
}

class AuthorizationError extends Error {
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.name = 'AuthorizationError';
        this.statusCode = 403;
        this.code = 'AUTHORIZATION_ERROR';
    }
}

class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
        this.code = 'NOT_FOUND_ERROR';
    }
}

class ConflictError extends Error {
    constructor(message = 'Resource conflict') {
        super(message);
        this.name = 'ConflictError';
        this.statusCode = 409;
        this.code = 'CONFLICT_ERROR';
    }
}

class RateLimitError extends Error {
    constructor(message = 'Too many requests') {
        super(message);
        this.name = 'RateLimitError';
        this.statusCode = 429;
        this.code = 'RATE_LIMIT_ERROR';
    }
}

class DatabaseError extends Error {
    constructor(message = 'Database operation failed') {
        super(message);
        this.name = 'DatabaseError';
        this.statusCode = 500;
        this.code = 'DATABASE_ERROR';
    }
}

// Error logging utility
async function logError(error, req, user = null) {
    try {
        // Use the centralized logger
        await logger.error('api', error.message, {
            requestId: req.id,
            errorName: error.name,
            errorCode: error.code || 'UNKNOWN_ERROR',
            statusCode: error.statusCode,
            stackTrace: error.stack,
            details: error.details,
            requestMethod: req.method,
            requestUrl: req.url,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            userId: user?.id || null,
            userType: user?.type || null
        });
    } catch (loggerError) {
        console.error('Failed to log error:', loggerError);
        
        // Fallback to direct database logging
        try {
            await database.logError({
                level: error.statusCode >= 500 ? 'error' : 'warn',
                message: error.message,
                error_code: error.code || 'UNKNOWN_ERROR',
                request_method: req.method,
                request_url: req.url,
                user_id: user?.id || null,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                stack_trace: config.isDevelopment ? error.stack : null,
                additional_data: JSON.stringify({
                    statusCode: error.statusCode,
                    details: error.details,
                    requestId: req.id
                })
            });
        } catch (dbError) {
            console.error('Failed to log error to database:', dbError);
        }
    }
}

// Main error handler middleware
function errorHandler() {
    return async (error, req, res, next) => {
        // Skip if response already sent
        if (res.headersSent) {
            return next(error);
        }

        const user = req.user || null;
        
        // Log the error
        await logError(error, req, user);

        // Handle specific error types
        let statusCode = 500;
        let message = 'Internal server error';
        let code = 'INTERNAL_SERVER_ERROR';
        let details = null;

        if (error.statusCode) {
            statusCode = error.statusCode;
            message = error.message;
            code = error.code || 'CUSTOM_ERROR';
            details = error.details;
        } else if (error.name === 'ValidationError') {
            statusCode = 400;
            message = 'Validation failed';
            code = 'VALIDATION_ERROR';
            details = error.errors || [];
        } else if (error.name === 'CastError') {
            statusCode = 400;
            message = 'Invalid ID format';
            code = 'INVALID_ID';
        } else if (error.code === 'SQLITE_CONSTRAINT') {
            statusCode = 409;
            message = 'Database constraint violation';
            code = 'CONSTRAINT_ERROR';
        } else if (error.code === 'ENOTFOUND') {
            statusCode = 503;
            message = 'External service unavailable';
            code = 'SERVICE_UNAVAILABLE';
        } else if (error.name === 'JsonWebTokenError') {
            statusCode = 401;
            message = 'Invalid token';
            code = 'INVALID_TOKEN';
        } else if (error.name === 'TokenExpiredError') {
            statusCode = 401;
            message = 'Token expired';
            code = 'TOKEN_EXPIRED';
        } else if (error.name === 'SyntaxError' && error.status === 400) {
            statusCode = 400;
            message = 'Invalid JSON format';
            code = 'INVALID_JSON';
        }

        // Prepare response object
        const response = {
            success: false,
            error: message,
            code,
            timestamp: new Date().toISOString()
        };

        // Add details in development or for client errors
        if (config.isDevelopment || statusCode < 500) {
            if (details) {
                response.details = details;
            }
            
            if (config.isDevelopment && error.stack) {
                response.stack = error.stack;
            }
        }

        // Add request ID for tracking
        if (req.id) {
            response.requestId = req.id;
        }

        // Security headers for error responses
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.status(statusCode).json(response);
    };
}

// 404 handler
function notFoundHandler() {
    return (req, res) => {
        const response = {
            success: false,
            error: 'Endpoint not found',
            code: 'ENDPOINT_NOT_FOUND',
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        };

        res.status(404).json(response);
    };
}

// Async wrapper to catch async errors
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Error boundary for critical sections
function createErrorBoundary(fallbackHandler) {
    return (error, req, res, next) => {
        try {
            fallbackHandler(error, req, res, next);
        } catch (boundaryError) {
            console.error('Error boundary caught exception:', boundaryError);
            res.status(500).json({
                success: false,
                error: 'Critical system error',
                code: 'SYSTEM_ERROR',
                timestamp: new Date().toISOString()
            });
        }
    };
}

// Graceful shutdown handler
function setupGracefulShutdown(server) {
    const gracefulShutdown = async (signal) => {
        console.log(`Received ${signal}. Graceful shutdown initiated.`);
        
        // Stop accepting new connections
        server.close(async () => {
            console.log('HTTP server closed.');
            
            try {
                // Close database connections
                await database.close();
                console.log('Database connections closed.');
                
                // Perform any other cleanup
                console.log('Cleanup completed. Exiting process.');
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });
        
        // Force close after timeout
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        gracefulShutdown('UNHANDLED_REJECTION');
    });
}

module.exports = {
    // Error classes
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    
    // Middleware
    errorHandler,
    notFoundHandler,
    asyncHandler,
    createErrorBoundary,
    
    // Utilities
    logError,
    setupGracefulShutdown
};