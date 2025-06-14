---
layout: default
title: Architecture
nav_order: 3
---

# System Architecture

This document provides a comprehensive overview of the Curtin Capstone Connect system architecture, design patterns, and technical implementation details.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Web Browser   │  │   Mobile App    │  │   API Client    │ │
│  │   (Vanilla JS)  │  │   (Future)      │  │   (Future)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                               HTTPS
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Express.js Server                       │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │ │
│  │  │  Middleware   │  │    Routes     │  │   Services    │  │ │
│  │  │  • Auth       │  │  • API        │  │  • Business   │  │ │
│  │  │  • Security   │  │  • Static     │  │  • Logic      │  │ │
│  │  │  • Logging    │  │  • Error      │  │  • Utils      │  │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                          Database Layer
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    SQLite3      │  │   File System   │  │     Logs        │ │
│  │   Database      │  │   (Static)      │  │   (Rotating)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Design Patterns

### MVC Architecture
The application follows the Model-View-Controller pattern:

- **Models** (`database/db.js`) - Data access layer
- **Views** (`public/index.html`) - Single Page Application
- **Controllers** (`routes/*.js`) - Business logic and API endpoints

### Repository Pattern
Database interactions are centralized through a repository pattern:

```javascript
class Database {
    // User management
    async getStudentByEmail(email) { ... }
    async getClientByEmail(email) { ... }
    async getAdminByEmail(email) { ... }
    
    // Unified authentication
    async getUserByEmail(email) { ... }
    
    // Project management
    async createProject(data) { ... }
    async getProjectById(id) { ... }
    
    // Settings management
    async getSettings(category) { ... }
    async updateSetting(key, value, adminId) { ... }
}
```

### Middleware Chain Pattern
Express middleware provides cross-cutting concerns:

```javascript
app.use(helmet());              // Security headers
app.use(compression());         // Response compression
app.use(rateLimitGeneral);      // Rate limiting
app.use(requestLogger);         // Request logging
app.use(express.json());        // JSON parsing
app.use(authenticate);          // JWT authentication
app.use(authorize('role'));     // Role-based authorization
```

## 📂 Directory Structure

```
capstone-connect/
├── config/                     # Configuration files
│   └── config.js              # Application configuration
├── database/                   # Database layer
│   ├── db.js                  # Database class and methods
│   ├── schema.sql             # Database schema
│   ├── seedData.js            # Sample data
│   └── migrations/            # Database migrations
├── middleware/                 # Express middleware
│   ├── auth.js                # Authentication & authorization
│   ├── validation.js          # Input validation
│   ├── security.js            # Security middleware
│   └── requestLogger.js       # Request logging
├── routes/                     # API routes
│   ├── auth.js                # Authentication endpoints
│   ├── projects.js            # Project management
│   ├── students.js            # Student operations
│   ├── clients.js             # Client operations
│   ├── admin.js               # Admin operations
│   └── admin/                 # Admin sub-routes
│       ├── users.js           # User management
│       └── settings.js        # Settings management
├── public/                     # Frontend assets
│   ├── index.html             # Single Page Application
│   ├── css/styles.css         # Styling
│   └── js/                    # Client-side JavaScript
│       ├── app.js             # Main application
│       ├── auth.js            # Authentication manager
│       └── *.js               # Feature modules
├── utils/                      # Utility functions
│   ├── logger.js              # Logging utilities
│   ├── backup.js              # Backup utilities
│   └── settings.js            # Settings manager
└── server.js                  # Application entry point
```

## 🗄️ Database Schema

### Core Tables

```sql
-- Users
students (id, email, password_hash, full_name, student_id, ...)
clients (id, email, password_hash, organization_name, ...)
admin_users (id, email, password_hash, full_name, ...)

-- Projects
projects (id, title, description, client_id, status, ...)
project_phases (id, project_id, phase_number, title, ...)

-- Interactions
student_interests (id, student_id, project_id, message, ...)
student_favorites (id, student_id, project_id, ...)

-- Gallery
gallery_submissions (id, project_id, title, description, ...)

-- System
config_settings (id, setting_key, setting_value, category, ...)
audit_log (id, user_type, user_id, action, timestamp, ...)
```

### Relationships

```
clients (1) ──── (N) projects
projects (1) ──── (N) student_interests
projects (1) ──── (N) student_favorites
projects (1) ──── (1) gallery_submissions
students (1) ──── (N) student_interests
students (1) ──── (N) student_favorites
```

## 🔐 Authentication Architecture

### JWT Token Flow

```
1. User Login
   ├── POST /api/auth/login
   ├── Validate credentials
   ├── Generate JWT token
   └── Return token + user data

2. Authenticated Request
   ├── Include Authorization: Bearer <token>
   ├── Validate token signature
   ├── Extract user info
   └── Authorize based on role

3. Token Refresh
   ├── Check token expiration
   ├── Generate new token
   └── Update client storage
```

### Role-Based Access Control

```javascript
// Middleware implementation
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        if (!roles.includes(req.user.type)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        next();
    };
};

// Usage
router.get('/admin/users', authenticate, authorize(['admin']), ...);
router.post('/projects', authenticate, authorize(['client']), ...);
router.get('/dashboard', authenticate, authorize(['student', 'client', 'admin']), ...);
```

## 🔧 Settings Management

### Hierarchical Configuration

```
Configuration Sources (Priority Order):
1. Environment Variables (.env)
2. Database Settings (config_settings table)
3. Application Defaults (config/config.js)
```

### Settings Categories

```javascript
const settingsCategories = {
    branding: ['site_title', 'primary_color', 'footer_text'],
    auth: ['student_domain_whitelist', 'client_registration_mode'],
    features: ['enable_gallery', 'enable_analytics'],
    rules: ['max_student_interests', 'project_types'],
    privacy: ['data_retention_years', 'public_visibility']
};
```

### Caching Strategy

```javascript
class SettingsManager {
    constructor() {
        this.cache = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    async get(key, defaultValue) {
        if (this.isCacheExpired()) {
            await this.loadSettings();
        }
        return this.cache[key] || defaultValue;
    }
}
```

## 🔍 API Design

### RESTful Endpoints

```
Authentication:
POST   /api/auth/login           # Unified login
POST   /api/auth/register/*      # Role-specific registration
POST   /api/auth/logout          # Logout
GET    /api/auth/profile         # Current user profile

Projects:
GET    /api/projects             # List projects (public)
POST   /api/projects             # Create project (clients)
GET    /api/projects/:id         # Project details
PUT    /api/projects/:id         # Update project
DELETE /api/projects/:id         # Delete project

Students:
POST   /api/students/interests   # Express interest
GET    /api/students/dashboard   # Student dashboard
POST   /api/students/favorites   # Add favorite
DELETE /api/students/favorites   # Remove favorite

Admin:
GET    /api/admin/users          # User management
PUT    /api/admin/projects/:id   # Approve/reject projects
GET    /api/admin/analytics      # System analytics
GET    /api/admin/settings/*     # Settings management
```

### Response Format

```javascript
// Success Response
{
    "success": true,
    "data": { ... },
    "message": "Operation completed successfully"
}

// Error Response
{
    "success": false,
    "error": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
}
```

## 📊 Frontend Architecture

### Single Page Application (SPA)

```javascript
// Main application class
class CapstoneApp {
    constructor() {
        this.currentSection = 'home';
        this.currentUser = null;
        this.authManager = new AuthManager();
    }
    
    // Section management
    showSection(sectionId) { ... }
    
    // User management
    async checkAuthStatus() { ... }
    updateUIForAuthenticatedUser() { ... }
    
    // Feature modules
    async loadProjects() { ... }
    async loadDashboard() { ... }
}
```

### State Management

```javascript
// Application state
const appState = {
    currentUser: null,
    currentSection: 'home',
    projects: [],
    dashboardData: null,
    settings: {}
};

// State updates trigger UI re-renders
function updateState(newState) {
    Object.assign(appState, newState);
    renderUI();
}
```

## 🔄 Data Flow

### User Authentication Flow

```
1. User submits login form
2. Frontend sends POST to /api/auth/login
3. Backend validates credentials across all user types
4. JWT token generated and returned
5. Frontend stores token and user data
6. Subsequent requests include Authorization header
7. Backend validates token on each request
```

### Project Submission Flow

```
1. Client fills project form
2. Frontend validates input
3. POST to /api/projects with project data
4. Backend validates and stores project
5. Email notification sent to admins (future)
6. Admin reviews in dashboard
7. Admin approves/rejects project
8. Project becomes visible to students
```

## 🛡️ Security Architecture

### Input Validation

```javascript
// Multi-layer validation
1. Frontend validation (immediate feedback)
2. Express-validator middleware (data sanitization)
3. Database constraints (data integrity)
4. Business logic validation (rules enforcement)
```

### Security Headers

```javascript
// Helmet.js configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));
```

### Rate Limiting

```javascript
// Tiered rate limiting
const rateLimitGeneral = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100                   // 100 requests per window
});

const rateLimitAuth = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5                     // 5 auth attempts per window
});
```

## 📈 Performance Considerations

### Database Optimization

- **Indexes** on frequently queried columns
- **Connection pooling** for concurrent requests
- **Query optimization** with prepared statements
- **Pagination** for large result sets

### Caching Strategy

- **Settings caching** in memory (5-minute TTL)
- **Static file caching** with proper headers
- **Database query caching** for expensive operations

### Frontend Optimization

- **Minified CSS/JS** for production
- **Lazy loading** for dashboard components
- **Efficient DOM manipulation** with vanilla JS
- **Responsive images** and assets

---

This architecture provides a solid foundation for a scalable, maintainable, and secure capstone project management system. The modular design allows for easy extension and modification as requirements evolve.