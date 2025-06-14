---
layout: default
title: Contributing
nav_order: 7
---

# Contributing to Curtin Capstone Connect

Thank you for your interest in contributing to Curtin Capstone Connect! This document provides guidelines and instructions for contributing to the project.

## 🎯 How You Can Contribute

### Code Contributions
- **Bug fixes** - Help identify and fix issues
- **Feature enhancements** - Improve existing functionality
- **New features** - Add capabilities that benefit users
- **Performance improvements** - Optimize speed and efficiency
- **Security enhancements** - Strengthen platform security

### Documentation Contributions
- **User guides** - Improve workflow documentation
- **Technical documentation** - Enhance API and architecture docs
- **Tutorials** - Create helpful learning materials
- **FAQ updates** - Add common questions and answers
- **Translation** - Help internationalize the platform

### Testing and Quality Assurance
- **Bug reporting** - Identify and document issues
- **Feature testing** - Test new functionality thoroughly
- **Usability testing** - Provide user experience feedback
- **Accessibility testing** - Ensure platform accessibility
- **Security testing** - Help identify security vulnerabilities

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

```bash
# Required software
Node.js (version 16.0.0 or higher)
npm (version 7.0.0 or higher)
Git
A code editor (VS Code recommended)
```

### Setting Up Your Development Environment

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/capstone-connect.git
   cd capstone-connect
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up the Database**
   ```bash
   npm run setup-db
   npm run seed
   ```

4. **Create Environment File**
   ```bash
   # Copy example environment file
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Verify Setup**
   - Open browser to `http://localhost:1077`
   - Test login with default admin credentials
   - Verify all functionality works

### Understanding the Codebase

**Important**: Before making any changes, read [`CLAUDE.md`](../CLAUDE.md) for critical coding guidelines and patterns.

**Key Files and Directories:**
```
capstone-connect/
├── config/config.js          # Application configuration
├── database/                 # Database layer and migrations
├── middleware/               # Express middleware
├── routes/                   # API endpoints
├── public/                   # Frontend assets (HTML, CSS, JS)
├── utils/                    # Utility functions
├── docs/                     # Documentation
└── tests/                    # Test files
```

## 📝 Contribution Workflow

### 1. Choose Your Contribution

**Finding Issues:**
- Check [GitHub Issues](https://github.com/michael-borck/capstone-connect/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Review project roadmap for upcoming features

**Creating New Issues:**
- Search existing issues first
- Use issue templates when available
- Provide detailed description and steps to reproduce
- Include screenshots or examples when helpful

### 2. Development Process

**Branch Naming Convention:**
```bash
# Feature branches
feature/user-authentication-improvement
feature/project-search-filters

# Bug fix branches
bugfix/login-error-handling
bugfix/database-connection-timeout

# Documentation branches
docs/api-documentation-update
docs/contributing-guidelines
```

**Making Changes:**

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow Coding Standards**
   ```javascript
   // Use consistent formatting
   // Follow existing patterns
   // Add comments for complex logic
   // Use meaningful variable names
   ```

3. **Write Tests**
   ```bash
   # Run existing tests
   npm test
   
   # Add tests for new functionality
   # Tests should be in __tests__ directories
   ```

4. **Test Your Changes**
   ```bash
   # Test functionality manually
   npm run dev
   
   # Run automated tests
   npm test
   
   # Check for linting issues
   npm run lint  # (if available)
   ```

### 3. Submitting Changes

**Before Submitting:**
- [ ] Code follows project conventions (see `CLAUDE.md`)
- [ ] Tests pass (`npm test`)
- [ ] Documentation updated if needed
- [ ] No console errors in browser
- [ ] Changes tested in multiple browsers
- [ ] Commit messages are clear and descriptive

**Creating Pull Request:**

1. **Push Your Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Use the pull request template
   - Provide clear title and description
   - Reference related issues
   - Include screenshots if UI changes
   - Add reviewers if known

3. **Pull Request Template**
   ```markdown
   ## Summary
   Brief description of changes
   
   ## Changes Made
   - List of specific changes
   - Include any breaking changes
   
   ## Testing
   - How the changes were tested
   - Include test cases if applicable
   
   ## Screenshots
   (If UI changes)
   
   ## Related Issues
   Fixes #123
   Related to #456
   ```

## 🎨 Coding Standards

### JavaScript Guidelines

**Code Style:**
```javascript
// Use modern ES6+ features
const fetchProjects = async () => {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        return projects;
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        throw error;
    }
};

// Use meaningful variable names
const authenticatedUser = getAuthenticatedUser();
const projectSubmissionForm = document.getElementById('projectForm');

// Add comments for complex logic
// Calculate project completion percentage based on milestones
const completionPercentage = (completedMilestones / totalMilestones) * 100;
```

**Critical Pattern Requirements (from CLAUDE.md):**
```html
<!-- ✅ CORRECT: Direct function calls -->
<button onclick="showSection('home')">Home</button>
<button onclick="bulkApproveProjects()">Approve</button>

<!-- ❌ NEVER DO THIS -->
<button onclick="window.capstoneApp.showSection('home')">Home</button>
```

### CSS Guidelines

**CSS Organization:**
```css
/* Use CSS custom properties */
:root {
    --primary-color: #e31837;
    --secondary-color: #1a1a1a;
    --spacing-md: 1.5rem;
}

/* Follow BEM naming convention */
.project-card {
    /* Component styles */
}

.project-card__title {
    /* Element styles */
}

.project-card--featured {
    /* Modifier styles */
}

/* Mobile-first responsive design */
.container {
    width: 100%;
}

@media (min-width: 768px) {
    .container {
        max-width: 1200px;
    }
}
```

### Database Guidelines

**Migration Files:**
```sql
-- migrations/006_add_feature.sql
-- Always include both up and down migrations
-- Use descriptive naming
-- Include appropriate indexes

CREATE TABLE new_feature (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_new_feature_name ON new_feature(name);
```

### API Guidelines

**RESTful Endpoints:**
```javascript
// Consistent response format
app.get('/api/projects', (req, res) => {
    res.json({
        success: true,
        data: projects,
        message: 'Projects retrieved successfully'
    });
});

// Error handling
app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
        success: false,
        error: error.message,
        code: error.code || 'INTERNAL_ERROR'
    });
});
```

## 🧪 Testing Guidelines

### Writing Tests

**Unit Tests:**
```javascript
// __tests__/database.test.js
describe('Database', () => {
    test('should create new project', async () => {
        const projectData = {
            title: 'Test Project',
            description: 'Test Description',
            client_id: 1
        };
        
        const project = await database.createProject(projectData);
        expect(project.id).toBeDefined();
        expect(project.title).toBe('Test Project');
    });
});
```

**Integration Tests:**
```javascript
// __tests__/api.test.js
describe('API Endpoints', () => {
    test('POST /api/projects should create project', async () => {
        const response = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send(projectData)
            .expect(201);
            
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(projectData.title);
    });
});
```

### Testing Checklist

**Before Submitting:**
- [ ] All existing tests pass
- [ ] New functionality has tests
- [ ] Edge cases are covered
- [ ] Error conditions are tested
- [ ] API endpoints are tested
- [ ] Database operations are tested

## 📚 Documentation Standards

### Code Documentation

**Function Documentation:**
```javascript
/**
 * Creates a new project in the database
 * @param {Object} projectData - Project information
 * @param {string} projectData.title - Project title
 * @param {string} projectData.description - Project description
 * @param {number} projectData.client_id - Client organization ID
 * @returns {Promise<Object>} Created project object
 * @throws {Error} If project creation fails
 */
async function createProject(projectData) {
    // Implementation
}
```

### User Documentation

**Documentation Structure:**
```markdown
# Feature Name

Brief description of the feature.

## Purpose
Why this feature exists and what problem it solves.

## How to Use
Step-by-step instructions with examples.

## Examples
Code examples or screenshots.

## Troubleshooting
Common issues and solutions.
```

## 🐛 Bug Reporting

### Bug Report Template

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 10, macOS Big Sur]
- Browser: [e.g., Chrome 95, Firefox 94]
- Node.js version: [e.g., 16.14.0]

**Screenshots**
Add screenshots if applicable

**Additional Context**
Any other relevant information
```

### Critical Bugs

For security vulnerabilities or critical issues:
1. **Do not create public issues**
2. Email directly to security contact
3. Provide detailed reproduction steps
4. Allow time for responsible disclosure

## 🔄 Release Process

### Version Numbering

We use semantic versioning (SemVer):
- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Patch** (1.1.1): Bug fixes, backward compatible

### Release Checklist

**Before Release:**
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Migration scripts tested
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Backup procedures verified

## 👥 Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment:

**Our Standards:**
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

**Unacceptable Behavior:**
- Harassment or discriminatory language
- Trolling or deliberately disruptive behavior
- Publishing private information without permission
- Other conduct inappropriate in a professional setting

### Communication Channels

**For Contributors:**
- GitHub Issues for bug reports and features
- Pull Request comments for code review
- GitHub Discussions for general questions
- Email for security issues

**Response Times:**
- Issues: Within 48 hours
- Pull Requests: Within 72 hours
- Security Issues: Within 24 hours

## 🎓 Learning Resources

### Getting Familiar with the Tech Stack

**JavaScript and Node.js:**
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)
- [Modern JavaScript Tutorial](https://javascript.info/)

**Database and SQL:**
- [SQLite Documentation](https://sqlite.org/docs.html)
- [SQL Tutorial](https://www.w3schools.com/sql/)

**Web Development:**
- [MDN Web Docs](https://developer.mozilla.org/)
- [Web.dev](https://web.dev/)

### Understanding the Project

**Start Here:**
1. Read the main [README.md](README.md)
2. Review [ARCHITECTURE.md](architecture.md)
3. Check [CLAUDE.md](../CLAUDE.md) for coding guidelines
4. Explore the codebase structure
5. Run the application locally

## 🏆 Recognition

### Contributor Recognition

We value all contributions and recognize contributors through:

**GitHub Recognition:**
- Contributor listings in repository
- Credit in release notes
- Acknowledgment in documentation

**Special Recognition:**
- Major contributors listed in [ACKNOWLEDGMENTS.md](../ACKNOWLEDGMENTS.md)
- Outstanding contributions highlighted in releases
- Community showcase for exceptional work

### Types of Contributions We Value

**All contributions matter:**
- First-time contributors
- Documentation improvements
- Bug reports and testing
- Feature suggestions
- Code reviews
- Community support

## 📞 Getting Help

### For New Contributors

**First Steps:**
1. Join our community discussions
2. Look for "good first issue" labels
3. Ask questions in pull request comments
4. Don't hesitate to ask for help

**Mentorship:**
- Experienced contributors available for guidance
- Code review process includes learning feedback
- Documentation contributions welcomed
- Pair programming opportunities available

### Contact Information

**Project Maintainers:**
- Michael Borck - [@michael-borck](https://github.com/michael-borck)

**Support Channels:**
- GitHub Issues for technical questions
- GitHub Discussions for general questions
- Email: support@curtin.edu.au for other inquiries

---

**Thank you for contributing to Curtin Capstone Connect!** Your contributions help create better opportunities for students and industry partners to collaborate on meaningful capstone projects.

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same MIT License that covers the project. See [LICENSE.md](../LICENSE.md) for details.