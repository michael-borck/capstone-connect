// Application configuration settings
const config = {
    // Environment
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
    isProduction: (process.env.NODE_ENV || 'development') === 'production',

    // Server configuration
    port: process.env.PORT || 1077,
    host: process.env.HOST || 'localhost',

    // CORS settings
    allowedOrigins: [
        'http://localhost:1077',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:1077',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        // Add your proxy domains here
        process.env.PROXY_DOMAIN || 'https://your-domain.com',
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
    ],

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },

    // Database configuration
    database: {
        path: process.env.DB_PATH || './database/capstone.db',
        backupRetention: parseInt(process.env.BACKUP_RETENTION) || 10
    },

    // Security settings
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000 // 24 hours
    },

    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5
    },

    // File upload settings
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        uploadDir: process.env.UPLOAD_DIR || './uploads'
    },

    // Analytics settings
    analytics: {
        enabled: process.env.ANALYTICS_ENABLED !== 'false',
        retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 365
    },

    // Email settings (for future use)
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER,
            password: process.env.SMTP_PASSWORD
        },
        from: process.env.EMAIL_FROM || 'noreply@curtin.edu.au'
    },

    // Application-specific settings
    app: {
        name: 'Curtin Capstone Connect',
        version: '1.0.0',
        description: 'Capstone Project Management System',
        maxProjectInterests: parseInt(process.env.MAX_PROJECT_INTERESTS) || 5,
        maxFavorites: parseInt(process.env.MAX_FAVORITES) || 20,
        defaultSemester: process.env.DEFAULT_SEMESTER || 'both'
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        auditEnabled: process.env.AUDIT_LOGGING !== 'false'
    },

    // Backup settings
    backup: {
        enabled: process.env.BACKUP_ENABLED !== 'false',
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
        retention: parseInt(process.env.BACKUP_RETENTION) || 10
    }
};

// Validation for production environment
if (config.isProduction) {
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('Missing required environment variables for production:', missingVars);
        process.exit(1);
    }
    
    // Warn about default JWT secret
    if (config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
        console.error('WARNING: Using default JWT secret in production! Set JWT_SECRET environment variable.');
        process.exit(1);
    }
}

// Development-specific warnings
if (config.isDevelopment) {
    if (config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
        console.warn('⚠️  Using default JWT secret for development. Set JWT_SECRET for production.');
    }
}

module.exports = config;