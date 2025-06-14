// Authentication handling (placeholder for now)
// This will be fully implemented when the auth API is ready

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.init();
    }

    init() {
        this.setupFormHandlers();
        this.checkExistingAuth();
    }

    setupFormHandlers() {
        // Unified login form (new)
        const unifiedForm = document.getElementById('unifiedLoginForm');
        if (unifiedForm) {
            unifiedForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUnifiedLogin(e);
            });
        }

        // Legacy forms (keeping for backward compatibility)
        // Student login form
        const studentForm = document.getElementById('studentLoginForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleStudentLogin(e.target);
            });
        }

        // Client login form
        const clientForm = document.getElementById('clientLoginForm');
        if (clientForm) {
            clientForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleClientLogin(e.target);
            });
        }

        // Admin login form
        const adminForm = document.getElementById('adminLoginForm');
        if (adminForm) {
            adminForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin(e.target);
            });
        }
    }

    // Unified login handler
    async handleUnifiedLogin(e) {
        try {
            const formData = new FormData(e.target);
            const email = formData.get('email');
            const password = formData.get('password');

            // Validate input
            if (!email || !password) {
                throw new Error('Please enter both email and password');
            }

            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Store token and user data
                    this.setToken(data.token);
                    this.user = data.user;
                    
                    // Store user in localStorage for persistence
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    console.log(`${data.user.type} login successful:`, data.user);
                    
                    // Clear form
                    e.target.reset();
                    
                    // Navigate to appropriate dashboard
                    if (window.app && typeof window.app.checkAuthStatus === 'function') {
                        await window.app.checkAuthStatus();
                    }
                    
                    // Success message will be shown by the app
                } else {
                    throw new Error(data.error || 'Login failed');
                }
            } finally {
                // Reset button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }

        } catch (error) {
            console.error('Unified login error:', error);
            
            // Show user-friendly error message
            if (window.app && typeof window.app.showErrorToast === 'function') {
                window.app.showErrorToast('Login Failed', error.message);
            } else {
                alert(`Login failed: ${error.message}`);
            }
        }
    }

    async handleStudentLogin(form) {
        const formData = new FormData(form);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            this.showLoginLoading(form);
            
            const response = await fetch('/api/auth/login/student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user info
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_info', JSON.stringify(data.user));

                // Update app state
                if (window.capstoneApp && typeof window.capstoneApp.updateUIForAuthenticatedUser === 'function') {
                    window.capstoneApp.currentUser = data.user;
                    window.capstoneApp.updateUIForAuthenticatedUser();
                } else if (window.capstoneApp) {
                    window.capstoneApp.currentUser = data.user;
                }

                console.log('Login successful! Welcome back, ' + data.user.fullName);
                
                // Redirect to projects or dashboard
                if (window.capstoneApp && typeof window.capstoneApp.showSection === 'function') {
                    window.capstoneApp.showSection('projects');
                }
            } else {
                this.showLoginError(form, data.error || 'Login failed');
            }
            
        } catch (error) {
            console.error('Student login error:', error);
            this.showLoginError(form, 'Network error. Please try again.');
        } finally {
            this.hideLoginLoading(form);
        }
    }

    async handleClientLogin(form) {
        const formData = new FormData(form);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            this.showLoginLoading(form);
            
            const response = await fetch('/api/auth/login/client', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user info
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_info', JSON.stringify(data.user));

                console.log('Client login successful, user data:', data.user);
                
                // Close login modal if it exists
                const modal = document.getElementById('modal');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
                
                // Update app state FIRST
                if (window.capstoneApp && typeof window.capstoneApp.updateUIForAuthenticatedUser === 'function') {
                    window.capstoneApp.currentUser = data.user;
                    window.capstoneApp.updateUIForAuthenticatedUser();
                } else if (window.capstoneApp) {
                    window.capstoneApp.currentUser = data.user;
                }
                
                // Also update capstoneApp state
                if (window.capstoneApp) {
                    window.capstoneApp.currentUser = data.user;
                }
                
                // Force redirect to client dashboard immediately
                console.log('Attempting redirect to client dashboard...');
                console.log('window.capstoneApp currentUser:', window.capstoneApp?.currentUser);
                if (window.capstoneApp && typeof window.capstoneApp.showClientDashboard === 'function') {
                    console.log('Calling showClientDashboard via window.capstoneApp...');
                    setTimeout(() => {
                        window.capstoneApp.showClientDashboard();
                    }, 50);
                } else {
                    console.log('Fallback: using postMessage to trigger dashboard');
                    setTimeout(() => {
                        window.postMessage({type: 'SHOW_CLIENT_DASHBOARD'}, '*');
                    }, 50);
                }
                
                // Show success message after redirect
                setTimeout(() => {
                    console.log('Login completed for: ' + data.user.organizationName);
                }, 100);
            } else {
                this.showLoginError(form, data.error || 'Login failed');
            }
            
        } catch (error) {
            console.error('Client login error:', error);
            this.showLoginError(form, 'Network error. Please try again.');
        } finally {
            this.hideLoginLoading(form);
        }
    }

    async handleAdminLogin(form) {
        const formData = new FormData(form);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            this.showLoginLoading(form);
            
            const response = await fetch('/api/auth/login/admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user info
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_info', JSON.stringify(data.user));

                // Update app state
                if (window.capstoneApp && typeof window.capstoneApp.updateUIForAuthenticatedUser === 'function') {
                    window.capstoneApp.currentUser = data.user;
                    window.capstoneApp.updateUIForAuthenticatedUser();
                } else if (window.capstoneApp) {
                    window.capstoneApp.currentUser = data.user;
                }

                console.log('Admin login successful! Welcome, ' + data.user.fullName);
                
                // Redirect to admin dashboard  
                if (window.capstoneApp && typeof window.capstoneApp.showAdminDashboard === 'function') {
                    window.capstoneApp.showAdminDashboard();
                } else if (window.capstoneApp && typeof window.capstoneApp.showSection === 'function') {
                    window.capstoneApp.showSection('projects');
                }
            } else {
                this.showLoginError(form, data.error || 'Login failed');
            }
            
        } catch (error) {
            console.error('Admin login error:', error);
            this.showLoginError(form, 'Network error. Please try again.');
        } finally {
            this.hideLoginLoading(form);
        }
    }

    showLoginLoading(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
        }
    }

    hideLoginLoading(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    }

    showLoginError(form, message) {
        this.hideLoginLoading(form);
        
        // Remove existing error messages
        const existingError = form.querySelector('.login-error');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'login-error';
        errorDiv.style.color = 'var(--error-color)';
        errorDiv.style.marginTop = '1rem';
        errorDiv.style.textAlign = 'center';
        errorDiv.textContent = message;
        
        form.appendChild(errorDiv);

        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    async simulateApiCall() {
        // Simulate network delay
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    checkExistingAuth() {
        // Check for existing JWT token in localStorage
        const token = localStorage.getItem('auth_token');
        const userInfo = localStorage.getItem('user_info');
        
        if (token && userInfo) {
            try {
                this.token = token;
                this.user = JSON.parse(userInfo);
                
                // Update app state
                if (window.capstoneApp && typeof window.capstoneApp.updateUIForAuthenticatedUser === 'function') {
                    window.capstoneApp.currentUser = this.user;
                    window.capstoneApp.updateUIForAuthenticatedUser();
                } else if (window.capstoneApp) {
                    window.capstoneApp.currentUser = this.user;
                }
                
                // Verify token is still valid
                this.verifyToken();
            } catch (error) {
                console.error('Error parsing stored user info:', error);
                this.clearAuth();
            }
        }
    }

    async verifyToken() {
        if (!this.token) return false;
        
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                this.clearAuth();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Token verification error:', error);
            this.clearAuth();
            return false;
        }
    }

    async logout() {
        try {
            // Call logout endpoint
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } catch (error) {
            console.error('Logout API error:', error);
        }
        
        this.clearAuth();
        
        // Redirect to home page
        if (window.capstoneApp && typeof window.capstoneApp.showSection === 'function') {
            window.capstoneApp.showSection('home');
        }
        
        console.log('Logged out successfully');
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        
        // Update app state
        if (window.capstoneApp && typeof window.capstoneApp.updateUIForUnauthenticatedUser === 'function') {
            window.capstoneApp.currentUser = null;
            window.capstoneApp.updateUIForUnauthenticatedUser();
        } else if (window.capstoneApp) {
            window.capstoneApp.currentUser = null;
        }
    }

    isAuthenticated() {
        return !!this.token;
    }

    getUserType() {
        return this.user?.type || null;
    }

    getToken() {
        return this.token;
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    setUser(user) {
        this.user = user;
        if (user) {
            localStorage.setItem('user_info', JSON.stringify(user));
        } else {
            localStorage.removeItem('user_info');
        }
    }
}

// Initialize auth manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing AuthManager...');
    
    if (!window.authManager) {
        window.authManager = new AuthManager();
        console.log('AuthManager initialized:', window.authManager);
    }
    
    // Re-check app authentication status if app is already loaded
    if (window.capstoneApp && typeof window.capstoneApp.checkAuthStatus === 'function') {
        setTimeout(() => {
            console.log('Re-checking auth status after AuthManager init');
            window.capstoneApp.checkAuthStatus();
        }, 100);
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM not ready yet, wait for DOMContentLoaded
} else {
    // DOM is ready
    console.log('DOM already loaded, initializing AuthManager immediately...');
    
    if (!window.authManager) {
        window.authManager = new AuthManager();
        console.log('AuthManager initialized:', window.authManager);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}