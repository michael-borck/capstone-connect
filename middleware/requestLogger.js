const { logger } = require('../utils/logger');

// Request logging middleware
function requestLogger() {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Add unique request ID for tracing
        req.id = generateRequestId();
        res.setHeader('X-Request-ID', req.id);
        
        // Store original response methods
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Track response data
        let responseData = null;
        
        // Override res.send to capture response
        res.send = function(data) {
            responseData = data;
            return originalSend.call(this, data);
        };
        
        // Override res.json to capture response
        res.json = function(data) {
            responseData = data;
            return originalJson.call(this, data);
        };
        
        // Log request completion
        res.on('finish', async () => {
            const duration = Date.now() - startTime;
            
            // Skip logging for static assets and health checks
            if (shouldSkipLogging(req)) {
                return;
            }
            
            try {
                // Determine if this was an error
                const isError = res.statusCode >= 400;
                let error = null;
                
                if (isError && responseData) {
                    try {
                        const parsedData = typeof responseData === 'string' 
                            ? JSON.parse(responseData) 
                            : responseData;
                        
                        if (parsedData.error) {
                            error = new Error(parsedData.error);
                            error.code = parsedData.code;
                        }
                    } catch (parseError) {
                        // Ignore JSON parse errors
                    }
                }
                
                await logger.logAPIRequest(req, res, duration, error);
                
                // Log slow requests
                if (duration > 1000) {
                    await logger.warn('api', 'Slow request detected', {
                        requestId: req.id,
                        method: req.method,
                        url: req.url,
                        duration: `${duration}ms`,
                        userAgent: req.get('User-Agent'),
                        ipAddress: req.ip
                    });
                }
                
            } catch (logError) {
                console.error('Error logging request:', logError);
            }
        });
        
        // Log request start in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Request ID: ${req.id}`);
        }
        
        next();
    };
}

// Generate unique request ID
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Determine if request should be skipped from logging
function shouldSkipLogging(req) {
    const skipPatterns = [
        /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i,
        /^\/health$/,
        /^\/favicon\.ico$/
    ];
    
    return skipPatterns.some(pattern => pattern.test(req.url));
}

// Error context middleware - adds context to errors
function errorContext() {
    return (req, res, next) => {
        // Add error logging context to request
        req.logError = async (error, additionalContext = {}) => {
            try {
                await logger.error('api', error.message, {
                    requestId: req.id,
                    method: req.method,
                    url: req.url,
                    userAgent: req.get('User-Agent'),
                    ipAddress: req.ip,
                    userId: req.user?.id,
                    userType: req.user?.type,
                    stackTrace: error.stack,
                    errorCode: error.code,
                    ...additionalContext
                });
            } catch (logError) {
                console.error('Failed to log error:', logError);
            }
        };
        
        // Add warning logging context to request
        req.logWarning = async (message, context = {}) => {
            try {
                await logger.warn('api', message, {
                    requestId: req.id,
                    method: req.method,
                    url: req.url,
                    userAgent: req.get('User-Agent'),
                    ipAddress: req.ip,
                    userId: req.user?.id,
                    userType: req.user?.type,
                    ...context
                });
            } catch (logError) {
                console.error('Failed to log warning:', logError);
            }
        };
        
        // Add info logging context to request
        req.logInfo = async (message, context = {}) => {
            try {
                await logger.info('api', message, {
                    requestId: req.id,
                    method: req.method,
                    url: req.url,
                    userAgent: req.get('User-Agent'),
                    ipAddress: req.ip,
                    userId: req.user?.id,
                    userType: req.user?.type,
                    ...context
                });
            } catch (logError) {
                console.error('Failed to log info:', logError);
            }
        };
        
        next();
    };
}

// Performance monitoring middleware
function performanceMonitor() {
    return (req, res, next) => {
        const startMemory = process.memoryUsage();
        const startCpuUsage = process.cpuUsage();
        
        res.on('finish', async () => {
            const endMemory = process.memoryUsage();
            const endCpuUsage = process.cpuUsage(startCpuUsage);
            
            const memoryDelta = {
                rss: endMemory.rss - startMemory.rss,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal
            };
            
            // Log if significant memory or CPU usage
            if (memoryDelta.heapUsed > 10 * 1024 * 1024 || endCpuUsage.user > 100000) {
                await logger.warn('system', 'High resource usage detected', {
                    requestId: req.id,
                    method: req.method,
                    url: req.url,
                    memoryDelta: {
                        rss: `${Math.round(memoryDelta.rss / 1024 / 1024)}MB`,
                        heapUsed: `${Math.round(memoryDelta.heapUsed / 1024 / 1024)}MB`
                    },
                    cpuUsage: {
                        user: `${Math.round(endCpuUsage.user / 1000)}ms`,
                        system: `${Math.round(endCpuUsage.system / 1000)}ms`
                    }
                });
            }
        });
        
        next();
    };
}

module.exports = {
    requestLogger,
    errorContext,
    performanceMonitor
};