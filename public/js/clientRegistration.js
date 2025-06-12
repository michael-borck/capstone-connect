// Client Registration Modal JavaScript

class ClientRegistrationManager {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 3;
        this.orgData = {};
        this.projectData = {};
        this.isSubmitting = false;
        this.skippedProject = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Real-time form validation
        this.setupFormValidation();
        
        // Password confirmation
        const passwordField = document.getElementById('password');
        const confirmPasswordField = document.getElementById('confirmPassword');
        
        if (passwordField && confirmPasswordField) {
            confirmPasswordField.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
            
            passwordField.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }

    setupFormValidation() {
        // Add real-time validation for required fields
        const requiredFields = document.querySelectorAll('#clientRegistrationForm [required], #projectSubmissionForm [required]');
        
        requiredFields.forEach(field => {
            field.addEventListener('blur', () => {
                this.validateField(field);
            });
            
            field.addEventListener('input', () => {
                // Clear error state when user starts typing
                this.clearFieldError(field);
            });
        });
    }

    validateField(field) {
        const formGroup = field.closest('.form-group');
        let isValid = field.checkValidity() && field.value.trim() !== '';
        let errorMessage = '';
        
        // Custom password validation
        if (field.name === 'password' && field.value.trim() !== '') {
            const passwordErrors = this.validatePasswordStrength(field.value);
            if (passwordErrors.length > 0) {
                isValid = false;
                errorMessage = passwordErrors.join('. ');
            }
        }
        
        if (!isValid) {
            this.showFieldError(formGroup, errorMessage || this.getFieldErrorMessage(field));
            return false;
        } else {
            this.clearFieldError(field);
            return true;
        }
    }

    getFieldErrorMessage(field) {
        if (field.validity.valueMissing) {
            return `${this.getFieldLabel(field)} is required`;
        }
        if (field.validity.typeMismatch) {
            if (field.type === 'email') {
                return 'Please enter a valid email address';
            }
            if (field.type === 'url') {
                return 'Please enter a valid URL';
            }
        }
        if (field.validity.tooShort) {
            return `${this.getFieldLabel(field)} must be at least ${field.minLength} characters`;
        }
        if (field.validity.patternMismatch) {
            return 'Please enter a valid format';
        }
        return 'Please check this field';
    }

    getFieldLabel(field) {
        const label = field.closest('.form-group')?.querySelector('label');
        return label ? label.textContent.replace('*', '').trim() : 'This field';
    }

    showFieldError(formGroup, message) {
        formGroup.classList.add('error');
        
        // Remove existing error message
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
    }

    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        formGroup.classList.remove('error');
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    validatePasswordStrength(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (!/[@$!%*?&]/.test(password)) {
            errors.push('Password must contain at least one special character (@$!%*?&)');
        }
        
        return errors;
    }

    validatePasswordMatch() {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        const formGroup = confirmPassword.closest('.form-group');
        
        if (confirmPassword.value && password.value !== confirmPassword.value) {
            this.showFieldError(formGroup, 'Passwords do not match');
            return false;
        } else {
            this.clearFieldError(confirmPassword);
            return true;
        }
    }

    validateCurrentStep() {
        let isValid = true;
        let form;
        
        if (this.currentStep === 1) {
            form = document.getElementById('clientRegistrationForm');
            
            // Validate essential fields only
            const essentialFields = ['organizationName', 'contactName', 'email', 'password', 'confirmPassword'];
            
            essentialFields.forEach(fieldName => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (field && !this.validateField(field)) {
                    isValid = false;
                }
            });
            
            // Special validation for password confirmation
            if (!this.validatePasswordMatch()) {
                isValid = false;
            }
            
            // Validate at least one contact method (email is already required, so we're good)
            // But provide helpful messaging if they want to skip phone
            
        } else if (this.currentStep === 2) {
            // Project step is now optional - no validation needed unless they've filled out required project fields
            form = document.getElementById('projectSubmissionForm');
            
            // Only validate if they've started filling out the project
            const projectTitle = form.querySelector('[name="title"]');
            const projectDescription = form.querySelector('[name="description"]');
            const projectSkills = form.querySelector('[name="required_skills"]');
            
            if (projectTitle?.value || projectDescription?.value || projectSkills?.value) {
                // If they've started a project, validate minimum required fields
                const minRequiredProjectFields = ['title', 'description', 'required_skills'];
                
                minRequiredProjectFields.forEach(fieldName => {
                    const field = form.querySelector(`[name="${fieldName}"]`);
                    if (field && !field.value.trim()) {
                        this.showFieldError(field.closest('.form-group'), 
                            `${this.getFieldLabel(field)} is required if submitting a project`);
                        isValid = false;
                    }
                });
            }
            
        } else if (this.currentStep === 3) {
            // Validate terms acceptance
            const termsCheckbox = document.getElementById('termsAccepted');
            if (!termsCheckbox.checked) {
                console.log('Please accept the terms and conditions to continue');
                return false;
            }
            return true;
        }
        
        if (!isValid) {
            // Scroll to first error
            const firstError = document.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        return isValid;
    }

    collectStepData() {
        if (this.currentStep === 1) {
            const form = document.getElementById('clientRegistrationForm');
            const formData = new FormData(form);
            
            this.orgData = {};
            for (let [key, value] of formData.entries()) {
                this.orgData[key] = value;
            }
        } else if (this.currentStep === 2) {
            const form = document.getElementById('projectSubmissionForm');
            const formData = new FormData(form);
            
            this.projectData = {};
            for (let [key, value] of formData.entries()) {
                this.projectData[key] = value;
            }
        }
    }

    nextStep() {
        if (!this.validateCurrentStep()) {
            return;
        }
        
        this.collectStepData();
        
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.updateStepDisplay();
            
            // If moving to review step, populate review
            if (this.currentStep === 3) {
                this.populateReview();
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    skipToReview() {
        // Collect current step data first
        this.collectStepData();
        
        // Mark project as skipped
        this.skippedProject = true;
        this.projectData = {};
        
        // Jump to review step
        this.currentStep = 3;
        this.updateStepDisplay();
        this.populateReview();
    }

    updateStepDisplay() {
        // Update step indicators
        for (let i = 1; i <= this.maxSteps; i++) {
            const indicator = document.getElementById(`step${i}-indicator`);
            const step = document.getElementById(`step${i}`);
            
            if (i === this.currentStep) {
                indicator.classList.add('active');
                step.classList.add('active');
            } else {
                indicator.classList.remove('active');
                step.classList.remove('active');
            }
        }
        
        // Update step connector lines
        for (let i = 1; i < this.currentStep; i++) {
            const indicator = document.getElementById(`step${i}-indicator`);
            indicator.classList.add('completed');
        }
    }

    populateReview() {
        const reviewContainer = document.getElementById('registrationReview');
        
        // Check if "discuss first" was selected or project was skipped
        const discussFirst = this.orgData.discussFirst || this.skippedProject;
        
        const orgSection = `
            <div class="review-section">
                <h4>Organization Information</h4>
                <div class="review-item">
                    <span class="review-label">Organization Name:</span>
                    <span class="review-value">${this.orgData.organizationName || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <span class="review-label">Contact Name:</span>
                    <span class="review-value">${this.orgData.contactName || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <span class="review-label">Email:</span>
                    <span class="review-value">${this.orgData.email || 'Not provided'}</span>
                </div>
                ${this.orgData.phone ? `
                <div class="review-item">
                    <span class="review-label">Phone:</span>
                    <span class="review-value">${this.orgData.phone}</span>
                </div>
                ` : ''}
                ${this.orgData.contactTitle ? `
                <div class="review-item">
                    <span class="review-label">Job Title:</span>
                    <span class="review-value">${this.orgData.contactTitle}</span>
                </div>
                ` : ''}
                ${this.orgData.industry ? `
                <div class="review-item">
                    <span class="review-label">Industry:</span>
                    <span class="review-value">${this.getIndustryDisplayName(this.orgData.industry)}</span>
                </div>
                ` : ''}
                ${this.orgData.website ? `
                <div class="review-item">
                    <span class="review-label">Website:</span>
                    <span class="review-value">${this.orgData.website}</span>
                </div>
                ` : ''}
                ${this.orgData.orgDescription ? `
                <div class="review-item">
                    <span class="review-label">Description:</span>
                    <span class="review-value">${this.truncateText(this.orgData.orgDescription, 150)}</span>
                </div>
                ` : ''}
            </div>
        `;
        
        let projectSection = '';
        
        if (discussFirst) {
            projectSection = `
                <div class="review-section">
                    <h4>Project Preferences</h4>
                    <div class="review-item preference-note">
                        <span class="review-value" style="color: var(--primary-color); font-weight: 500;">
                            ✓ Prefer to discuss project ideas with UC staff first
                        </span>
                        <p style="margin-top: 0.5rem; color: var(--text-light); font-size: 0.9rem;">
                            Our team will contact you to discuss potential project opportunities and requirements.
                        </p>
                    </div>
                </div>
            `;
        } else if (this.projectData.title) {
            projectSection = `
                <div class="review-section">
                    <h4>Project Details</h4>
                    <div class="review-item">
                        <span class="review-label">Project Title:</span>
                        <span class="review-value">${this.projectData.title}</span>
                    </div>
                    ${this.projectData.description ? `
                    <div class="review-item">
                        <span class="review-label">Description:</span>
                        <span class="review-value">${this.truncateText(this.projectData.description, 150)}</span>
                    </div>
                    ` : ''}
                    ${this.projectData.required_skills ? `
                    <div class="review-item">
                        <span class="review-label">Required Skills:</span>
                        <span class="review-value">${this.projectData.required_skills}</span>
                    </div>
                    ` : ''}
                    ${this.projectData.tools_technologies ? `
                    <div class="review-item">
                        <span class="review-label">Tools & Technologies:</span>
                        <span class="review-value">${this.projectData.tools_technologies}</span>
                    </div>
                    ` : ''}
                    ${this.projectData.semester_availability ? `
                    <div class="review-item">
                        <span class="review-label">Semester:</span>
                        <span class="review-value">${this.getSemesterDisplayName(this.projectData.semester_availability)}</span>
                    </div>
                    ` : ''}
                    ${this.projectData.duration_weeks ? `
                    <div class="review-item">
                        <span class="review-label">Duration:</span>
                        <span class="review-value">${this.projectData.duration_weeks} weeks</span>
                    </div>
                    ` : ''}
                    ${this.projectData.max_students ? `
                    <div class="review-item">
                        <span class="review-label">Team Size:</span>
                        <span class="review-value">${this.projectData.max_students} students</span>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            projectSection = `
                <div class="review-section">
                    <h4>Project Details</h4>
                    <div class="review-item preference-note">
                        <span class="review-value" style="color: var(--text-light);">
                            No project details provided - can be added later
                        </span>
                    </div>
                </div>
            `;
        }
        
        reviewContainer.innerHTML = orgSection + projectSection;
    }

    getIndustryDisplayName(industry) {
        const industries = {
            'technology': 'Technology',
            'healthcare': 'Healthcare',
            'finance': 'Finance & Banking',
            'manufacturing': 'Manufacturing',
            'energy': 'Energy & Resources',
            'retail': 'Retail & E-commerce',
            'construction': 'Construction',
            'education': 'Education',
            'government': 'Government',
            'nonprofit': 'Non-profit',
            'other': 'Other'
        };
        return industries[industry] || industry;
    }

    getSemesterDisplayName(semester) {
        const semesters = {
            'semester1': 'Semester 1 (Feb - Jun)',
            'semester2': 'Semester 2 (Jul - Nov)',
            'both': 'Both Semesters'
        };
        return semesters[semester] || semester;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    async submitRegistration() {
        if (this.isSubmitting) return;
        
        if (!this.validateCurrentStep()) {
            return;
        }
        
        this.isSubmitting = true;
        const submitButton = document.getElementById('submitBtn');
        const originalText = submitButton.textContent;
        
        try {
            // Show loading state
            submitButton.innerHTML = '<span class="loading-spinner-small"></span>Submitting...';
            submitButton.disabled = true;
            
            // Combine organization and project data
            const registrationData = {
                ...this.orgData,
                project: this.projectData
            };
            
            console.log('Sending registration data:', registrationData);
            
            const response = await fetch('/api/auth/register/client', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(registrationData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccessState();
            } else {
                console.error('Registration failed:', data);
                let errorMessage = data.error || 'Registration failed';
                
                // Show specific validation errors if available
                if (data.details && Array.isArray(data.details)) {
                    const errorList = data.details.map(detail => `${detail.field}: ${detail.message}`).join('\n');
                    errorMessage = `Validation errors:\n${errorList}`;
                }
                
                throw new Error(errorMessage);
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            console.log('Registration failed: ' + error.message);
            
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        } finally {
            this.isSubmitting = false;
        }
    }

    showSuccessState() {
        // Hide the registration steps
        document.querySelector('.registration-steps').style.display = 'none';
        
        // Show success message
        document.getElementById('registrationSuccess').style.display = 'block';
    }

    reset() {
        this.currentStep = 1;
        this.orgData = {};
        this.projectData = {};
        this.isSubmitting = false;
        
        // Reset forms
        document.getElementById('clientRegistrationForm').reset();
        document.getElementById('projectSubmissionForm').reset();
        document.getElementById('termsAccepted').checked = false;
        
        // Clear all errors
        document.querySelectorAll('.form-group.error').forEach(group => {
            group.classList.remove('error');
            const errorMsg = group.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
        
        // Reset step display
        this.updateStepDisplay();
        
        // Show registration steps and hide success
        document.querySelector('.registration-steps').style.display = 'block';
        document.getElementById('registrationSuccess').style.display = 'none';
    }
}

// Initialize the registration manager
let clientRegistrationManager;

// Global functions for onclick handlers (showClientRegistration is defined in app.js)

function closeClientRegistrationModal() {
    const modal = document.getElementById('clientRegistrationModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function nextStep() {
    if (window.clientRegistrationManager) {
        window.clientRegistrationManager.nextStep();
    } else {
        console.error('ClientRegistrationManager not initialized');
        console.log('Registration system not initialized. Please close and reopen the form.');
    }
}

function previousStep() {
    if (window.clientRegistrationManager) {
        window.clientRegistrationManager.previousStep();
    } else {
        console.error('ClientRegistrationManager not initialized');
    }
}

function skipToReview() {
    if (window.clientRegistrationManager) {
        // Validate current step first
        if (!window.clientRegistrationManager.validateCurrentStep()) {
            return;
        }
        window.clientRegistrationManager.skipToReview();
    } else {
        console.error('ClientRegistrationManager not initialized');
    }
}

function submitRegistration() {
    if (window.clientRegistrationManager) {
        window.clientRegistrationManager.submitRegistration();
    } else {
        console.error('ClientRegistrationManager not initialized');
        console.log('Registration system not initialized. Please close and reopen the form.');
    }
}

function showTermsModal() {
    console.log('Terms and Conditions modal would open here. This will be implemented with full legal terms.');
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('clientRegistrationModal');
    if (e.target === modal) {
        closeClientRegistrationModal();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClientRegistrationManager };
}