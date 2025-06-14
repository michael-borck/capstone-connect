---
layout: default
title: Technology Stack
nav_order: 4
---

# Technology Stack

Complete breakdown of technologies, frameworks, and dependencies used in Curtin Capstone Connect.

## 🎯 Technology Philosophy

**Pure Vanilla JavaScript Frontend** - No heavy frameworks, fast loading, easy to maintain  
**Node.js Backend** - Modern, efficient, and scalable server-side JavaScript  
**SQLite Database** - Lightweight, reliable, and perfect for medium-scale applications  
**Security First** - Multiple layers of protection and best practices  

## 🏗️ Core Technologies

### Backend Stack

| Technology | Version | Purpose | Why We Chose It |
|------------|---------|---------|-----------------|
| **Node.js** | ≥16.0.0 | Runtime Environment | Fast, scalable, JavaScript everywhere |
| **Express.js** | ^4.18.2 | Web Framework | Minimal, flexible, proven reliability |
| **SQLite3** | ^5.1.6 | Database | Lightweight, serverless, zero-config |

### Frontend Stack

| Technology | Version | Purpose | Why We Chose It |
|------------|---------|---------|-----------------|
| **Vanilla JavaScript** | ES6+ | Client Logic | No framework overhead, maximum performance |
| **HTML5** | Latest | Structure | Semantic, accessible, modern |
| **CSS3** | Latest | Styling | Custom properties, flexbox, grid |

### Security & Authentication

| Package | Version | Purpose | Security Benefit |
|---------|---------|---------|------------------|
| **jsonwebtoken** | ^9.0.2 | JWT Tokens | Stateless authentication |
| **bcrypt** | ^5.1.1 | Password Hashing | Secure password storage |
| **helmet** | ^7.1.0 | Security Headers | XSS, CSRF, clickjacking protection |
| **cors** | ^2.8.5 | Cross-Origin Requests | Controlled resource sharing |
| **express-rate-limit** | ^7.1.5 | Rate Limiting | DoS attack prevention |
| **express-validator** | ^7.2.1 | Input Validation | Data sanitization |

### Development & Testing

| Package | Version | Purpose | Development Benefit |
|---------|---------|---------|---------------------|
| **nodemon** | ^3.0.2 | Development Server | Hot reload, faster development |
| **jest** | ^29.7.0 | Testing Framework | Unit and integration testing |
| **supertest** | ^6.3.3 | API Testing | HTTP assertion testing |

### Utilities & Middleware

| Package | Version | Purpose | Functionality |
|---------|---------|---------|---------------|
| **morgan** | ^1.10.0 | HTTP Logging | Request/response logging |
| **compression** | ^1.7.4 | Response Compression | Faster page loads |
| **cookie-parser** | ^1.4.6 | Cookie Handling | Session management |
| **node-fetch** | ^3.3.2 | HTTP Client | External API calls |

## 📊 Dependency Analysis

### Production Dependencies (9 packages)

```json
{
  "bcrypt": "^5.1.1",           // Password hashing - CRITICAL
  "compression": "^1.7.4",      // Performance optimization
  "cookie-parser": "^1.4.6",    // Cookie management
  "cors": "^2.8.5",            // Cross-origin security
  "express": "^4.18.2",        // Core web framework - CRITICAL
  "express-rate-limit": "^7.1.5", // Security rate limiting
  "express-validator": "^7.2.1", // Input validation - CRITICAL
  "helmet": "^7.1.0",          // Security headers - CRITICAL
  "jsonwebtoken": "^9.0.2",    // Authentication - CRITICAL
  "morgan": "^1.10.0",         // HTTP logging
  "node-fetch": "^3.3.2",      // HTTP client
  "sqlite3": "^5.1.6"          // Database - CRITICAL
}
```

### Development Dependencies (3 packages)

```json
{
  "jest": "^29.7.0",           // Testing framework
  "nodemon": "^3.0.2",        // Development server
  "supertest": "^6.3.3"       // API testing
}
```

## 🏛️ Architecture Decisions

### Why Vanilla JavaScript?

**Benefits:**
- ✅ **Zero Dependencies** - No framework lock-in
- ✅ **Fast Loading** - Minimal JavaScript bundle
- ✅ **Easy Debugging** - Standard browser tools work perfectly
- ✅ **Long-term Stability** - No framework upgrade cycles
- ✅ **Team Learning** - Pure web fundamentals

**Trade-offs:**
- ⚠️ More boilerplate code for complex interactions
- ⚠️ Manual state management
- ⚠️ No built-in component system

### Why SQLite3?

**Benefits:**
- ✅ **Zero Configuration** - No database server setup
- ✅ **File-based** - Easy backups and deployment
- ✅ **ACID Compliant** - Full transaction support
- ✅ **Performance** - Fast for read-heavy workloads
- ✅ **Portable** - Works anywhere Node.js runs

**Trade-offs:**
- ⚠️ Single writer limitation
- ⚠️ Not ideal for high-concurrency writes
- ⚠️ Limited to single server deployment

### Why Express.js?

**Benefits:**
- ✅ **Minimal** - Only what you need
- ✅ **Flexible** - Middleware-based architecture
- ✅ **Mature** - Battle-tested in production
- ✅ **Large Ecosystem** - Extensive middleware options
- ✅ **Performance** - Fast and lightweight

## 🔒 Security Stack Deep Dive

### Authentication Flow

```javascript
// JWT Token Generation
const token = jwt.sign({
    id: user.id,
    email: user.email,
    type: user.type
}, config.jwt.secret, {
    expiresIn: '24h'
});
```

### Password Security

```javascript
// bcrypt Configuration
const saltRounds = 12; // Configurable, secure default
const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);
```

### Security Headers (Helmet.js)

```javascript
// Applied Security Headers
Content-Security-Policy    // XSS protection
X-Frame-Options           // Clickjacking protection
X-Content-Type-Options    // MIME sniffing protection
Referrer-Policy          // Information leakage protection
X-XSS-Protection         // Browser XSS filter
```

### Input Validation

```javascript
// express-validator Example
body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
```

## 📱 Frontend Technologies

### CSS Architecture

```css
/* CSS Custom Properties (Variables) */
:root {
    --primary-color: #e31837;
    --secondary-color: #1a1a1a;
    --spacing-sm: 1rem;
    --border-radius: 8px;
}

/* Modern Layout Techniques */
.grid-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
}

.flex-layout {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}
```

### JavaScript Architecture

```javascript
// ES6+ Features Used
class CapstoneApp {
    constructor() {
        this.currentUser = null;
    }
    
    // Async/await for API calls
    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            const projects = await response.json();
            return projects;
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }
    
    // Arrow functions for cleaner code
    updateUI = (data) => {
        // Template literals for dynamic HTML
        const html = `
            <div class="project-card">
                <h3>${data.title}</h3>
                <p>${data.description}</p>
            </div>
        `;
        document.getElementById('container').innerHTML = html;
    }
}
```

## 🗄️ Database Technology

### SQLite3 Features Used

```sql
-- Modern SQL Features
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);

-- Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- JSON Support (SQLite 3.38+)
SELECT json_extract(metadata, '$.skills') FROM projects;
```

### Migration System

```javascript
// Database Migration Example
const migrations = [
    {
        version: '001',
        up: `CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL
        )`,
        down: `DROP TABLE users`
    }
];
```

## 🚀 Performance Optimizations

### Backend Optimizations

```javascript
// Compression Middleware
app.use(compression({
    threshold: 1024,  // Only compress if > 1KB
    level: 6,         // Balanced compression level
    filter: (req, res) => {
        return compression.filter(req, res);
    }
}));

// Static File Serving with Caching
app.use(express.static('public', {
    maxAge: '1d',     // Cache for 1 day
    etag: true,       // Enable ETags
    lastModified: true
}));
```

### Frontend Optimizations

```javascript
// Efficient DOM Manipulation
const fragment = document.createDocumentFragment();
projects.forEach(project => {
    const element = createProjectElement(project);
    fragment.appendChild(element);
});
container.appendChild(fragment); // Single DOM update

// Debounced Search
const debouncedSearch = debounce((query) => {
    performSearch(query);
}, 300);
```

## 🔧 Development Tools

### NPM Scripts

```json
{
  "scripts": {
    "start": "node server.js",              // Production server
    "dev": "nodemon server.js",             // Development server
    "test": "jest",                         // Run tests
    "setup-db": "node database/setup.js",   // Initialize database
    "seed": "node database/seedData.js",    // Add sample data
    "backup": "node utils/backup.js backup", // Backup database
    "reset-db": "rm -f database/capstone.db && npm run setup-db && npm run seed"
  }
}
```

### Testing Configuration

```javascript
// Jest Configuration
module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: [
        'routes/**/*.js',
        'middleware/**/*.js',
        'utils/**/*.js'
    ],
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: ['**/__tests__/**/*.js', '**/*.test.js']
};
```

## 📦 Bundle Analysis

### Production Bundle Size

```
Frontend Assets:
├── index.html         ~15KB (compressed: ~5KB)
├── styles.css         ~45KB (compressed: ~8KB)
├── app.js            ~35KB (compressed: ~12KB)
├── auth.js           ~8KB  (compressed: ~3KB)
└── Other JS files    ~15KB (compressed: ~6KB)

Total Frontend: ~118KB (compressed: ~34KB)
```

### Backend Dependencies

```
Node.js Dependencies:
├── express           ~200KB
├── sqlite3          ~5.2MB (includes native binaries)
├── bcrypt           ~1.1MB (includes native binaries)
├── helmet           ~50KB
├── jsonwebtoken     ~120KB
└── Other packages   ~300KB

Total Backend: ~7MB (typical for Node.js apps)
```

## 🔄 Version Requirements

### Minimum Requirements

```json
{
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=7.0.0"
  }
}
```

### Recommended Environment

```
Node.js: 18.x LTS (latest stable)
npm: 9.x
OS: Linux, macOS, Windows
RAM: 512MB minimum, 1GB recommended
Storage: 100MB for application, additional for database
```

## 🎯 Technology Roadmap

### Current Focus
- ✅ Core functionality complete
- ✅ Security implementation
- ✅ Performance optimization

### Future Considerations
- 🔄 **Email Integration** - NodeMailer for notifications
- 🔄 **File Upload** - Multer for document/image handling
- 🔄 **Real-time Features** - Socket.io for live updates
- 🔄 **API Documentation** - Swagger/OpenAPI integration
- 🔄 **Monitoring** - Application performance monitoring

---

This technology stack provides a solid foundation for a modern, secure, and maintainable web application while keeping complexity manageable and performance optimal.