// Student Registration Manager
class StudentRegistrationManager {
    constructor() {
        this.form = null;
        this.submitButton = null;
        this.isSubmitting = false;
        
        this.init();
    }
    
    init() {
        console.log('Initializing StudentRegistrationManager...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupForm());
        } else {
            this.setupForm();
        }
    }
    
    setupForm() {
        this.form = document.getElementById('studentRegistrationForm');
        this.submitButton = document.getElementById('studentRegisterBtn');
        
        if (this.form) {
            console.log('Setting up student registration form...');
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            
            // Add real-time password validation
            const passwordField = document.getElementById('studentPassword');
            const confirmField = document.getElementById('studentPasswordConfirm');
            
            if (passwordField && confirmField) {
                confirmField.addEventListener('input', () => this.validatePasswordMatch());
                passwordField.addEventListener('input', () => this.validatePasswordMatch());
            }
        } else {
            console.log('Student registration form not found, will try again later...');
        }
    }
    
    validatePasswordMatch() {
        const password = document.getElementById('studentPassword');
        const confirm = document.getElementById('studentPasswordConfirm');
        
        if (password && confirm && confirm.value) {
            if (password.value !== confirm.value) {
                confirm.setCustomValidity('Passwords do not match');
            } else {
                confirm.setCustomValidity('');
            }
        }
    }
    
    validateForm() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        const errors = [];
        
        // Validate required fields
        if (!data.fullName?.trim()) {
            errors.push('Full name is required');
        }
        
        if (!data.email?.trim()) {
            errors.push('Email is required');
        } else if (!this.isValidCurtinEmail(data.email)) {
            errors.push('Please use your Curtin University email address');
        }
        
        if (!data.password) {
            errors.push('Password is required');
        } else if (!this.isValidPassword(data.password)) {
            errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
        }
        
        if (data.password !== data.passwordConfirm) {
            errors.push('Passwords do not match');
        }
        
        if (data.studentId && !this.isValidStudentId(data.studentId)) {
            errors.push('Student ID must be 8 digits');
        }
        
        if (!data.termsAccepted) {
            errors.push('You must accept the terms and conditions');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    isValidCurtinEmail(email) {
        const curtinEmailPattern = /^[a-zA-Z0-9._%+-]+@(student\.)?curtin\.edu\.au$/;
        return curtinEmailPattern.test(email);
    }
    
    isValidPassword(password) {
        // At least 8 characters, uppercase, lowercase, number, special character
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordPattern.test(password);
    }
    
    isValidStudentId(studentId) {
        return /^[0-9]{8}$/.test(studentId);
    }
    
    showError(message) {
        // Remove existing error messages
        const existingErrors = this.form.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Create new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = 'var(--error-color)';
        errorDiv.style.marginBottom = '1rem';
        errorDiv.style.padding = '0.5rem';
        errorDiv.style.border = '1px solid var(--error-color)';
        errorDiv.style.borderRadius = 'var(--border-radius)';
        errorDiv.style.backgroundColor = '#fee2e2';
        errorDiv.innerHTML = Array.isArray(message) ? 
            '<strong>Please fix the following errors:</strong><ul>' + message.map(err => `<li>${err}</li>`).join('') + '</ul>' :
            message;
        
        this.form.insertBefore(errorDiv, this.form.firstChild);
    }
    
    showSuccess(message) {
        // Remove existing messages
        const existingMessages = this.form.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.color = 'var(--success-color)';
        successDiv.style.marginBottom = '1rem';
        successDiv.style.padding = '0.5rem';
        successDiv.style.border = '1px solid var(--success-color)';
        successDiv.style.borderRadius = 'var(--border-radius)';
        successDiv.style.backgroundColor = '#d1fae5';
        successDiv.innerHTML = message;
        
        this.form.insertBefore(successDiv, this.form.firstChild);
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        console.log('Student registration form submitted');
        
        if (this.isSubmitting) {
            console.log('Already submitting, ignoring...');
            return;
        }
        
        // Validate form
        const validation = this.validateForm();
        if (!validation.isValid) {
            this.showError(validation.errors);
            return;
        }
        
        this.isSubmitting = true;
        this.submitButton.disabled = true;
        this.submitButton.innerHTML = '<span class="loading-spinner-small"></span>Creating Account...';
        
        try {
            const formData = new FormData(this.form);
            const studentData = {
                fullName: formData.get('fullName').trim(),
                email: formData.get('email').trim().toLowerCase(),
                password: formData.get('password'),
                studentId: formData.get('studentId')?.trim() || null
            };
            
            console.log('Submitting student registration:', { ...studentData, password: '[HIDDEN]' });
            
            const response = await fetch('/api/auth/register/student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(studentData)
            });
            
            const data = await response.json();
            console.log('Registration response:', data);
            
            if (response.ok) {
                this.showSuccess('Account created successfully! You are now logged in.');
                
                // Store authentication data
                if (window.authManager) {
                    window.authManager.setToken(data.token);
                    window.authManager.setUser(data.user);
                    
                    // Update app current user
                    if (window.capstoneApp) {
                        window.capstoneApp.currentUser = data.user;
                        window.capstoneApp.updateUIForAuthenticatedUser();
                    }
                }
                
                // Close modal and redirect to projects after a short delay
                setTimeout(() => {
                    closeStudentRegistrationModal();
                    
                    // Redirect to projects section
                    if (window.capstoneApp) {
                        window.capstoneApp.showSection('projects');
                    }
                }, 2000);
                
            } else {
                let errorMessage = 'Registration failed. Please try again.';
                
                if (data.details && Array.isArray(data.details)) {
                    errorMessage = data.details.map(detail => detail.message);
                } else if (data.error) {
                    errorMessage = data.error;
                }
                
                this.showError(errorMessage);
                console.error('Registration failed:', data);
            }
            
        } catch (error) {
            console.error('Network error during registration:', error);
            this.showError('Network error. Please check your connection and try again.');
        } finally {
            this.isSubmitting = false;
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = 'Create Student Account';
        }
    }
    
    reset() {
        console.log('Resetting student registration form...');
        
        if (this.form) {
            this.form.reset();
            
            // Remove any error/success messages
            const messages = this.form.querySelectorAll('.error-message, .success-message');
            messages.forEach(msg => msg.remove());
            
            // Reset custom validity
            const confirmField = document.getElementById('studentPasswordConfirm');
            if (confirmField) {
                confirmField.setCustomValidity('');
            }
        }
        
        this.isSubmitting = false;
        if (this.submitButton) {
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = 'Create Student Account';
        }
    }
}