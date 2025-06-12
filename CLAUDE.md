# Instructions for AI Assistants (Claude, etc.)

## CRITICAL: Read ARCHITECTURE.md First
Before making ANY changes, read the `ARCHITECTURE.md` file to understand the application structure and patterns.

## Code Consistency Rules

### 1. Event Handlers - CRITICAL
**ALWAYS use direct function calls in onclick handlers:**
```html
<!-- ✅ CORRECT -->
<button onclick="showSection('home')">Home</button>
<button onclick="bulkApproveProjects()">Approve</button>

<!-- ❌ NEVER DO THIS -->
<button onclick="window.capstoneApp.showSection('home')">Home</button>
<button onclick="window.app.bulkApproveProjects()">Approve</button>
```

### 2. Before Making UI Changes
1. Check how similar features are implemented
2. Look for existing patterns in nearby code
3. If adding onclick handlers, ensure the function is exposed globally in app.js
4. Run the test file at `/test-navigation.html` after changes

### 3. File Structure
- **DO NOT create new JavaScript files** - add to existing files
- **DO NOT create new CSS files** - use `/public/css/styles.css`
- **DO NOT split index.html** - it's a Single Page Application

### 4. Adding New Features
When adding a new feature:
1. Add backend route to appropriate `/routes/*.js` file
2. Add method to `CapstoneApp` class in `/public/js/app.js`
3. If using onclick, add to global function exposures (around line 4356)
4. Follow existing UI patterns and class names

### 5. Database Changes
- Add migrations to `/database/migrations/`
- Number them sequentially (e.g., `003_feature_name.sql`)
- Include both structure changes and data updates

### 6. Common Patterns to Follow

#### API Calls:
```javascript
const headers = {
    'Content-Type': 'application/json'
};
if (window.authManager && window.authManager.isAuthenticated()) {
    headers['Authorization'] = `Bearer ${window.authManager.getToken()}`;
}
```

#### Toast Notifications:
```javascript
window.showToast('Success message', 'success');
window.showToast('Error message', 'error');
```

#### Loading States:
```javascript
showLoading('elementId');
hideLoading('elementId');
```

## Testing Commands
After making changes, verify:
```bash
# Check for console errors
npm start
# Open browser to http://localhost:1077
# Open /test-navigation.html to run tests
```

## Red Flags - Stop and Think
If you find yourself:
- Creating new patterns different from existing ones
- Adding `window.capstoneApp.` or `window.app.` in HTML
- Creating new files when similar code exists
- Changing fundamental architecture

**STOP** and explain why the change is necessary.

## Quick Reference
- Main app class: `/public/js/app.js` - `CapstoneApp`
- Auth manager: `/public/js/auth.js` - `AuthManager`  
- All sections in: `/public/index.html`
- All styles in: `/public/css/styles.css`
- Backend routes: `/routes/*.js`

## Remember
This is a working application. Preserve existing functionality while adding new features. When in doubt, follow the existing patterns.