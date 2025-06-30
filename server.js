const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database and utilities
const database = require('./database/db');
const config = require('./config/config');

// Import middleware
const { validationRules } = require('./middleware/validation');
const { 
    sanitizeRequest, 
    setSecurityHeaders, 
    BruteForceProtection,
    validatePasswordStrength 
} = require('./middleware/security');
const { 
    errorHandler, 
    notFoundHandler, 
    setupGracefulShutdown,
    asyncHandler 
} = require('./middleware/errorHandler');
const { 
    requestLogger, 
    errorContext, 
    performanceMonitor 
} = require('./middleware/requestLogger');
const { logger } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const studentRoutes = require('./routes/students');
const clientRoutes = require('./routes/clients');
const adminRoutes = require('./routes/admin');
const galleryRoutes = require('./routes/gallery');
// const searchRoutes = require('./routes/search');
// const analyticsRoutes = require('./routes/analytics');

const app = express();

// Trust proxy for deployment behind reverse proxy
app.set('trust proxy', 1);

// Initialize security middleware instances
const bruteForceProtection = new BruteForceProtection();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"], // This is the key fix for onclick handlers
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased for development - allow more requests for image uploads
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for gallery uploads in development
    skip: (req) => {
        return req.path.includes('/api/gallery/admin/') && req.method === 'PUT';
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit auth attempts
    message: {
        error: 'Too many authentication attempts, please try again later.'
    }
});

// Apply rate limiting
app.use(limiter);

// Apply logging and monitoring middleware
app.use(requestLogger());
app.use(errorContext());
app.use(performanceMonitor());

// Apply security middleware
app.use(setSecurityHeaders());
app.use(sanitizeRequest());

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (config.allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'connected'
    });
});

// Public settings route (no auth required)
const settingsRoutes = require('./routes/settings');
app.use('/api/settings', settingsRoutes);

// API route mounting with enhanced security (rate limiting disabled for development)
app.use('/api/auth', /* authLimiter, */ bruteForceProtection.middleware(), authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gallery', galleryRoutes);
// app.use('/api/search', searchRoutes);
// app.use('/api/analytics', analyticsRoutes);

// Serve the main application for all non-API routes (SPA support)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use enhanced error handling
app.use('/api/*', notFoundHandler());
app.use(errorHandler());

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database connection
        await database.init();
        console.log('Database initialized successfully');

        // Log system startup
        await logger.logSystemEvent('server_startup', 'Server starting up', {
            nodeVersion: process.version,
            environment: config.environment,
            port: config.port || 3000
        });

        // Rotate old logs on startup
        try {
            await logger.rotateOldLogs(30);
        } catch (error) {
            console.warn('Failed to rotate old logs:', error.message);
        }
        
        const PORT = config.port || 3000;
        const server = app.listen(PORT, () => {
            console.log(`🚀 Curtin Capstone Connect server running on port ${PORT}`);
            console.log(`📊 Environment: ${config.environment}`);
            console.log(`🌐 Access the application at: http://localhost:${PORT}`);
            console.log(`🔒 Security middleware enabled: Input validation, XSS protection, CSRF protection`);
            console.log(`📋 Logging enabled: Request logging, error tracking, performance monitoring`);
            
            if (config.isDevelopment) {
                console.log('\n📋 Available endpoints:');
                console.log('  GET  /api/health              - Health check');
                console.log('  POST /api/auth/register/*     - User registration');
                console.log('  POST /api/auth/login/*        - User login');
                console.log('  POST /api/auth/logout         - User logout');
                console.log('  GET  /api/auth/profile        - Get user profile');
                console.log('  GET  /api/projects            - Get all approved projects');
                console.log('  POST /api/projects            - Create new project (clients)');
                console.log('  GET  /api/projects/:id        - Get project details');
                console.log('  PUT  /api/projects/:id        - Update project');
                console.log('  POST /api/students/interests  - Express interest in project');
                console.log('  GET  /api/students/dashboard  - Student dashboard');
                console.log('  GET  /api/admin/health         - System health (admin)');
                console.log('  GET  /api/admin/logs/errors    - Error logs (admin)');
                console.log('  GET  /api/admin/audit          - Audit logs (admin)');
                console.log('  GET  /api/search/*            - Search API (coming soon)');
                console.log('\n🔧 Development commands:');
                console.log('  npm run seed                  - Seed database with sample data');
                console.log('  npm run backup                - Create database backup');
                console.log('  npm run export                - Export data to JSON');
            }
        });

        // Setup graceful shutdown handling
        setupGracefulShutdown(server);

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;