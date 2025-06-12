# Capstone Connect - Architecture Documentation

## Overview
Capstone Connect is a **Single Page Application (SPA)** built with vanilla JavaScript, Node.js/Express backend, and SQLite database.

## Critical Architecture Decisions

### 1. Single Page Application (SPA)
- All content is loaded once; sections are shown/hidden via JavaScript
- Navigation uses hash-based routing (e.g., `#home`, `#projects`)
- Sections are toggled using the `showSection()` function
- No page reloads during navigation

### 2. Event Handling Patterns

#### IMPORTANT: Use Consistent Patterns
The codebase uses **direct function calls** for onclick handlers:

```html
<!-- ✅ CORRECT - Use this pattern -->
<button onclick="showSection('projects')">Browse Projects</button>
<button onclick="showCreateProject()">Create Project</button>

<!-- ❌ WRONG - Do not use these patterns -->
<button onclick="window.capstoneApp.showSection('projects')">Browse Projects</button>
<button onclick="window.app.showCreateProject()">Create Project</button>
```

#### Why This Pattern?
1. All functions are exposed globally in `app.js` initialization
2. Simpler and more consistent
3. Easier to maintain and debug

### 3. Application Structure

```
/public
  /js
    - app.js              # Main application class and initialization
    - auth.js             # Authentication manager
    - clientRegistration.js
    - studentRegistration.js
    - search.js
  /css
    - styles.css          # All styles in one file
  - index.html           # Single HTML file with all sections

/routes
  - auth.js              # Authentication endpoints
  - projects.js          # Project CRUD operations
  - students.js          # Student-specific endpoints
  - clients.js           # Client-specific endpoints
  - admin.js             # Admin portal endpoints
  - gallery.js           # Gallery management endpoints

/database
  - schema.sql           # Initial database schema
  - migrations/          # Database migrations
```

### 4. Authentication Flow
- JWT tokens stored in localStorage
- Three user types: student, client, admin
- Auth state managed by `AuthManager` class
- Protected routes use `authenticate` and `authorize` middleware

### 5. State Management
- Application state centralized in `CapstoneApp` class
- Current user stored in `app.currentUser`
- Projects cached in `app.projects`
- Gallery items cached in `app.galleryItems`

### 6. CSS Architecture
- Single CSS file with CSS variables for theming
- BEM-like naming convention (block__element--modifier)
- Mobile-first responsive design
- No CSS frameworks - pure CSS

## Key Implementation Patterns

### 1. Global Function Exposure
All onclick handlers must be exposed globally in app initialization:

```javascript
// In app.js initialization
window.showSection = (section) => app.showSection(section);
window.showCreateProject = () => app.showCreateProjectModal();
// ... etc
```

### 2. API Calls
Standard pattern for API calls:

```javascript
const headers = {
    'Content-Type': 'application/json'
};
if (window.authManager && window.authManager.isAuthenticated()) {
    headers['Authorization'] = `Bearer ${window.authManager.getToken()}`;
}

const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
});
```

### 3. Error Handling
- API errors shown via toast notifications
- Console errors for debugging
- User-friendly error messages

### 4. Loading States
- Show loading spinner/text during async operations
- Disable buttons during submission
- Clear loading state on completion or error

## Database Schema

### Core Tables
- `students` - Student users
- `clients` - Industry partner users  
- `admin_users` - UC staff/admin users
- `projects` - All project submissions
- `student_interests` - Interest tracking (max 5 per student)
- `student_favorites` - Saved projects
- `gallery_items` - Showcase projects

### Key Relationships
- Projects belong to clients
- Students can express interest in up to 5 projects
- Projects can have parent projects (multi-phase)
- Gallery items reference completed projects

## Development Guidelines

### Before Making Changes
1. Check existing patterns in similar features
2. Use the test file (`test-navigation.html`) to verify navigation
3. Follow the established onclick pattern
4. Don't introduce new patterns without strong justification

### Adding New Features
1. Add backend route in appropriate file
2. Add frontend method in `CapstoneApp` class
3. If using onclick, expose function globally
4. Follow existing UI patterns
5. Test navigation still works

### Common Pitfalls to Avoid
1. **Don't use `window.capstoneApp.method()`** in onclick handlers
2. **Don't forget to expose new functions** globally
3. **Don't create new files** unless absolutely necessary
4. **Don't change patterns** without updating all instances

## Testing Checklist
- [ ] Navigation between sections works
- [ ] Authentication flow works
- [ ] Admin features accessible only to admins
- [ ] No console errors
- [ ] Mobile responsive
- [ ] All onclick handlers use consistent pattern