// Main application JavaScript
class CapstoneApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'home';
        this.projects = [];
        this.galleryItems = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });

        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabType = e.target.getAttribute('data-tab');
                this.showAuthTab(tabType);
            });
        });

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                document.getElementById('mainNav').classList.toggle('active');
            });
        }

        // Search and filters
        const searchInput = document.getElementById('searchInput');
        const semesterFilter = document.getElementById('semesterFilter');
        const projectTypeFilter = document.getElementById('projectTypeFilter');
        const popularityFilter = document.getElementById('popularityFilter');
        
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterProjects());
        }
        
        if (semesterFilter) {
            semesterFilter.addEventListener('change', () => this.filterProjects());
        }
        
        if (projectTypeFilter) {
            projectTypeFilter.addEventListener('change', () => this.filterProjects());
        }
        
        if (popularityFilter) {
            popularityFilter.addEventListener('change', () => this.filterProjects());
        }

        // Modal close
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadProjects(),
                this.loadGallery()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async loadProjects() {
        try {
            this.showLoading('projectsList');
            
            // Get authentication headers
            const headers = {};
            if (window.authManager && window.authManager.isAuthenticated()) {
                headers['Authorization'] = `Bearer ${window.authManager.getToken()}`;
            }
            
            const response = await fetch('/api/projects', {
                headers,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.projects = data.projects || [];
            this.renderProjects(this.projects);
            
        } catch (error) {
            console.error('Error loading projects:', error);
            this.showError('projectsList', 'Failed to load projects. Please try again.');
        }
    }

    async loadGallery() {
        try {
            this.showLoading('galleryList');
            
            // Mock gallery data
            const mockGallery = [
                {
                    id: 1,
                    title: 'Smart Campus Navigation App',
                    description: 'AR-enabled mobile app for campus navigation...',
                    year: 2023,
                    category: 'Mobile Development',
                    client_name: 'Curtin University'
                },
                {
                    id: 2,
                    title: 'Predictive Maintenance System',
                    description: 'IoT-based system for predicting equipment failures...',
                    year: 2023,
                    category: 'IoT & Machine Learning',
                    client_name: 'Industrial Solutions Ltd'
                }
            ];

            this.galleryItems = mockGallery;
            this.renderGallery(this.galleryItems);
            
        } catch (error) {
            console.error('Error loading gallery:', error);
            this.showError('galleryList', 'Failed to load gallery');
        }
    }

    renderProjects(projects) {
        const container = document.getElementById('projectsList');
        
        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="no-projects">
                    <h3>No projects found</h3>
                    <p>Try adjusting your search filters or check back later for new opportunities.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => {
            const popularityLevel = this.getPopularityLevel(project.interest_count);
            const isAuthenticated = window.authManager && window.authManager.isAuthenticated();
            const userType = isAuthenticated ? window.authManager.getUserType() : null;
            
            return `
                <div class="project-card ${popularityLevel.className}" onclick="window.capstoneApp.showProjectDetails(${project.id})">
                    <div class="project-header">
                        <div class="project-status-badge">
                            <span class="status-indicator status-${project.status}">${this.formatStatus(project.status)}</span>
                        </div>
                        <div class="popularity-indicator ${popularityLevel.className}">
                            <span class="popularity-icon">${popularityLevel.icon}</span>
                            <span class="popularity-text">${popularityLevel.text}</span>
                        </div>
                    </div>
                    
                    <h3 class="project-title">${this.escapeHtml(project.title)}</h3>
                    <div class="project-client">
                        <span class="client-icon">🏢</span>
                        ${this.escapeHtml(project.organization_name)}
                    </div>
                    
                    <p class="project-description">${this.truncateDescription(project.description, 120)}</p>
                    
                    <div class="project-tags">
                        <span class="project-semester-tag">${this.formatSemester(project.semester_availability)}</span>
                        ${project.project_type ? `<span class="project-type-tag">${this.escapeHtml(project.project_type)}</span>` : ''}
                        ${project.duration_weeks ? `<span class="duration-tag">${project.duration_weeks}w</span>` : ''}
                    </div>
                    
                    <div class="project-skills">
                        <span class="skills-icon">🛠️</span>
                        <span class="skills-text">${this.truncateSkills(project.required_skills, 60)}</span>
                    </div>
                    
                    <div class="project-footer">
                        <div class="interest-count-display">
                            <span class="interest-icon">👥</span>
                            <span class="interest-number">${project.interest_count}</span>
                            <span class="interest-label">${project.interest_count === 1 ? 'student' : 'students'} interested</span>
                        </div>
                        
                        ${isAuthenticated && userType === 'student' ? `
                            <div class="quick-actions">
                                <button class="btn-quick-action ${project.isFavorite ? 'favorited' : ''}" 
                                        onclick="event.stopPropagation(); window.capstoneApp.toggleFavorite(${project.id})" 
                                        title="${project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                                    ${project.isFavorite ? '⭐' : '☆'}
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    getPopularityLevel(interestCount) {
        if (interestCount >= 5) {
            return { className: 'high-popularity', icon: '🔥', text: 'High Interest' };
        } else if (interestCount >= 3) {
            return { className: 'medium-popularity', icon: '⭐', text: 'Popular' };
        } else if (interestCount >= 1) {
            return { className: 'low-popularity', icon: '👀', text: 'Getting Interest' };
        } else {
            return { className: 'no-popularity', icon: '💡', text: 'New Opportunity' };
        }
    }

    truncateDescription(description, maxLength) {
        if (description.length <= maxLength) return this.escapeHtml(description);
        return this.escapeHtml(description.substring(0, maxLength).trim()) + '...';
    }

    truncateSkills(skills, maxLength) {
        if (skills.length <= maxLength) return this.escapeHtml(skills);
        return this.escapeHtml(skills.substring(0, maxLength).trim()) + '...';
    }

    renderGallery(items) {
        const container = document.getElementById('galleryList');
        
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="loading">No gallery items found</div>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="gallery-card" onclick="app.showGalleryDetails(${item.id})">
                <div class="gallery-image">
                    📷 Project Image
                </div>
                <div class="gallery-content">
                    <h3 class="gallery-title">${this.escapeHtml(item.title)}</h3>
                    <div class="gallery-year">${item.year} • ${this.escapeHtml(item.category)}</div>
                    <p class="gallery-description">${this.escapeHtml(item.description)}</p>
                    <div class="gallery-client">${this.escapeHtml(item.client_name)}</div>
                </div>
            </div>
        `).join('');
    }

    filterProjects() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const semesterFilter = document.getElementById('semesterFilter')?.value || '';
        const projectTypeFilter = document.getElementById('projectTypeFilter')?.value || '';
        const popularityFilter = document.getElementById('popularityFilter')?.value || '';

        let filtered = this.projects.filter(project => {
            // Search filter
            const matchesSearch = searchTerm === '' || 
                project.title.toLowerCase().includes(searchTerm) ||
                project.description.toLowerCase().includes(searchTerm) ||
                project.organization_name.toLowerCase().includes(searchTerm) ||
                project.required_skills.toLowerCase().includes(searchTerm) ||
                (project.tools_technologies && project.tools_technologies.toLowerCase().includes(searchTerm));

            // Semester filter
            const matchesSemester = semesterFilter === '' ||
                project.semester_availability === semesterFilter ||
                project.semester_availability === 'both';

            // Project type filter
            const matchesProjectType = projectTypeFilter === '' ||
                project.project_type === projectTypeFilter;

            // Popularity filter
            const matchesPopularity = popularityFilter === '' || this.matchesPopularityFilter(project.interest_count, popularityFilter);

            return matchesSearch && matchesSemester && matchesProjectType && matchesPopularity;
        });

        this.renderProjects(filtered);
    }

    matchesPopularityFilter(interestCount, filter) {
        switch (filter) {
            case 'high':
                return interestCount >= 5;
            case 'medium':
                return interestCount >= 3 && interestCount <= 4;
            case 'low':
                return interestCount >= 1 && interestCount <= 2;
            case 'new':
                return interestCount === 0;
            default:
                return true;
        }
    }

    showSection(sectionId) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });

        // Update sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }

        // Load section-specific data if needed
        if (sectionId === 'projects' && this.projects.length === 0) {
            this.loadProjects();
        } else if (sectionId === 'gallery' && this.galleryItems.length === 0) {
            this.loadGallery();
        } else if (sectionId === 'studentDashboard') {
            this.loadStudentDashboard();
        }
    }

    showAuthTab(tabType) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabType) {
                tab.classList.add('active');
            }
        });

        // Update panels
        document.querySelectorAll('.auth-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const targetPanel = document.getElementById(`${tabType}Auth`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }

    async showProjectDetails(projectId) {
        try {
            // Get authentication headers
            const headers = {};
            if (window.authManager && window.authManager.isAuthenticated()) {
                headers['Authorization'] = `Bearer ${window.authManager.getToken()}`;
            }
            
            const response = await fetch(`/api/projects/${projectId}`, {
                headers,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const project = data.project;
            
            if (!project) return;

            const modalBody = document.getElementById('modalBody');
            
            // Build action buttons based on user authentication and project state
            let actionButtons = '';
            if (window.authManager && window.authManager.isAuthenticated()) {
                const user = window.authManager.user;
                
                if (user.type === 'student') {
                    const hasExpressed = project.hasExpressedInterest;
                    const isFavorite = project.isFavorite;
                    
                    actionButtons = `
                        <div style="text-align: center;">
                            <button class="btn ${hasExpressed ? 'btn-secondary' : 'btn-primary'}" 
                                    onclick="app.${hasExpressed ? 'withdrawInterest' : 'expressInterest'}(${project.id})">
                                ${hasExpressed ? 'Withdraw Interest' : 'Express Interest'}
                            </button>
                            <button class="btn ${isFavorite ? 'btn-secondary' : 'btn-outline'}" 
                                    onclick="app.${isFavorite ? 'removeFromFavorites' : 'addToFavorites'}(${project.id})" 
                                    style="margin-left: 1rem;">
                                ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            </button>
                        </div>
                    `;
                } else if (user.type === 'client' && project.client_id === user.id) {
                    actionButtons = `
                        <div style="text-align: center;">
                            <button class="btn btn-outline" onclick="app.editProject(${project.id})">
                                Edit Project
                            </button>
                            ${project.interestedStudents && project.interestedStudents.length > 0 ? `
                                <button class="btn btn-secondary" onclick="app.viewInterestedStudents(${project.id})" style="margin-left: 1rem;">
                                    View Interested Students (${project.interestedStudents.length})
                                </button>
                            ` : ''}
                        </div>
                    `;
                }
            } else {
                actionButtons = `
                    <div style="text-align: center;">
                        <button class="btn btn-primary" onclick="app.showSection('login'); app.showAuthTab('student');">
                            Login to Express Interest
                        </button>
                    </div>
                `;
            }
            
            modalBody.innerHTML = `
                <div class="project-detail-modal">
                    <!-- Header Section -->
                    <div class="project-detail-header">
                        <div class="project-detail-title-section">
                            <h2 class="project-detail-title">${this.escapeHtml(project.title)}</h2>
                            <div class="project-detail-organization">
                                <span class="organization-icon">🏢</span>
                                <span class="organization-name">${this.escapeHtml(project.organization_name)}</span>
                            </div>
                        </div>
                        <div class="project-detail-badges">
                            <span class="project-status-badge status-${project.status}">${this.formatStatus(project.status)}</span>
                            ${this.getProjectDetailPopularityBadge(project.interest_count)}
                        </div>
                    </div>

                    <!-- Quick Info Grid -->
                    <div class="project-detail-quick-info">
                        <div class="quick-info-item">
                            <span class="quick-info-icon">📅</span>
                            <div class="quick-info-content">
                                <span class="quick-info-label">Semester</span>
                                <span class="quick-info-value">${this.formatSemester(project.semester_availability)}</span>
                            </div>
                        </div>
                        <div class="quick-info-item">
                            <span class="quick-info-icon">👥</span>
                            <div class="quick-info-content">
                                <span class="quick-info-label">Interest Level</span>
                                <span class="quick-info-value">${project.interest_count} student${project.interest_count !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                        ${project.duration_weeks ? `
                        <div class="quick-info-item">
                            <span class="quick-info-icon">⏱️</span>
                            <div class="quick-info-content">
                                <span class="quick-info-label">Duration</span>
                                <span class="quick-info-value">${project.duration_weeks} weeks</span>
                            </div>
                        </div>
                        ` : ''}
                        ${project.max_students ? `
                        <div class="quick-info-item">
                            <span class="quick-info-icon">👨‍👩‍👧‍👦</span>
                            <div class="quick-info-content">
                                <span class="quick-info-label">Team Size</span>
                                <span class="quick-info-value">Max ${project.max_students} student${project.max_students !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                        ` : ''}
                        ${project.project_type ? `
                        <div class="quick-info-item">
                            <span class="quick-info-icon">📋</span>
                            <div class="quick-info-content">
                                <span class="quick-info-label">Project Type</span>
                                <span class="quick-info-value">${this.formatProjectType(project.project_type)}</span>
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Description Section -->
                    <div class="project-detail-section">
                        <h3 class="section-title">
                            <span class="section-icon">📝</span>
                            Project Description
                        </h3>
                        <div class="section-content">
                            <p class="project-description-text">${this.escapeHtml(project.description)}</p>
                        </div>
                    </div>

                    <!-- Skills & Technologies Section -->
                    <div class="project-detail-section">
                        <h3 class="section-title">
                            <span class="section-icon">🛠️</span>
                            Skills & Technologies
                        </h3>
                        <div class="section-content">
                            <div class="skills-technologies-grid">
                                <div class="skills-column">
                                    <h4 class="skills-subtitle">Required Skills</h4>
                                    <div class="skills-tags">
                                        ${this.formatSkillsTags(project.required_skills)}
                                    </div>
                                </div>
                                <div class="skills-column">
                                    <h4 class="skills-subtitle">Tools & Technologies</h4>
                                    <div class="skills-tags">
                                        ${this.formatSkillsTags(project.tools_technologies)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Deliverables Section -->
                    <div class="project-detail-section">
                        <h3 class="section-title">
                            <span class="section-icon">🎯</span>
                            Project Deliverables
                        </h3>
                        <div class="section-content">
                            <p class="deliverables-text">${this.escapeHtml(project.deliverables)}</p>
                        </div>
                    </div>

                    ${project.prerequisites ? `
                    <!-- Prerequisites Section -->
                    <div class="project-detail-section">
                        <h3 class="section-title">
                            <span class="section-icon">📚</span>
                            Prerequisites & Requirements
                        </h3>
                        <div class="section-content">
                            <p class="prerequisites-text">${this.escapeHtml(project.prerequisites)}</p>
                        </div>
                    </div>
                    ` : ''}

                    ${project.additional_info ? `
                    <!-- Additional Information Section -->
                    <div class="project-detail-section">
                        <h3 class="section-title">
                            <span class="section-icon">ℹ️</span>
                            Additional Information
                        </h3>
                        <div class="section-content">
                            <p class="additional-info-text">${this.escapeHtml(project.additional_info)}</p>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Action Buttons -->
                    <div class="project-detail-actions">
                        ${actionButtons}
                    </div>
                </div>
            `;

            this.showModal();
            
        } catch (error) {
            console.error('Error loading project details:', error);
            console.log('Failed to load project details. Please try again.');
        }
    }

    showGalleryDetails(itemId) {
        const item = this.galleryItems.find(i => i.id === itemId);
        if (!item) return;

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <h2>${this.escapeHtml(item.title)}</h2>
            <div style="margin-bottom: 1rem; color: var(--primary-color); font-weight: bold;">
                ${item.year} • ${this.escapeHtml(item.category)}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Client:</strong> ${this.escapeHtml(item.client_name)}
            </div>
            <div style="margin-bottom: 2rem;">
                <p style="line-height: 1.6;">${this.escapeHtml(item.description)}</p>
            </div>
        `;

        this.showModal();
    }

    async expressInterest(projectId) {
        if (!this.currentUser) {
            console.log('Please log in as a student to express interest in projects.');
            this.showSection('login');
            this.showAuthTab('student');
            return;
        }

        if (this.currentUser.type !== 'student') {
            console.log('Only students can express interest in projects.');
            return;
        }

        try {
            // First check current interest count
            const statsResponse = await fetch('/api/students/stats', {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                const remaining = stats.interests.remaining;
                
                if (remaining <= 0) {
                    console.log(`You have reached the maximum limit of 5 project interests. You currently have ${stats.interests.current} active interests.`);
                    return;
                }
                
                // Show confirmation with remaining count
                const confirmMessage = `You have ${remaining} interest${remaining !== 1 ? 's' : ''} remaining out of 5 maximum. Would you like to express interest in this project?`;
                if (!confirm(confirmMessage)) {
                    return;
                }
            }

            const message = prompt('Optional: Add a message to your interest expression:') || '';
            
            const response = await fetch('/api/students/interests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    projectId: parseInt(projectId),
                    message
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Find the project for better notification
                const project = this.projects.find(p => p.id === projectId) || { title: 'the project' };
                
                this.showSuccessToast(
                    'Interest Expressed',
                    `Your interest in "${project.title}" has been recorded. The project client will be notified.`
                );
                
                this.closeModal();
                // Refresh project data
                await this.loadProjects();
            } else {
                let errorMessage = 'Failed to express interest in this project.';
                
                if (data.code === 'INTEREST_LIMIT_EXCEEDED') {
                    errorMessage = `You have reached the maximum limit of ${data.maxAllowed} project interests. You currently have ${data.currentCount} active interests.`;
                } else if (data.code === 'INTEREST_ALREADY_EXISTS') {
                    errorMessage = 'You have already expressed interest in this project.';
                } else if (data.code === 'PROJECT_NOT_AVAILABLE') {
                    errorMessage = 'This project is not currently available for interest expression.';
                } else if (data.error) {
                    errorMessage = data.error;
                }
                
                this.showErrorToast('Interest Expression Failed', errorMessage);
            }

        } catch (error) {
            console.error('Error expressing interest:', error);
            this.showErrorToast(
                'Network Error',
                'Unable to connect to the server. Please try again.'
            );
        }
    }

    async withdrawInterest(projectId, buttonElement = null) {
        if (!this.currentUser || this.currentUser.type !== 'student') {
            return;
        }

        try {
            // Find the project for better confirmation message
            const project = this.projects.find(p => p.id === projectId) || 
                           { title: 'this project', organization_name: 'Unknown' };

            // Enhanced confirmation dialog
            const confirmMessage = `Are you sure you want to withdraw your interest in "${project.title}"?\n\nThis action will:\n• Remove you from the interested students list\n• Free up one of your 5 interest slots\n• Notify the project client of your withdrawal\n\nThis action cannot be undone.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }

            // Add loading state to button if provided
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.classList.add('btn-loading');
                buttonElement.setAttribute('data-original-text', buttonElement.textContent);
                buttonElement.textContent = 'Withdrawing...';
            }

            const response = await fetch(`/api/students/interests/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccessToast(
                    'Interest Withdrawn',
                    `You have successfully withdrawn your interest in "${project.title}". You now have one more interest slot available.`
                );
                
                this.closeModal();
                
                // Refresh project data
                await this.loadProjects();
                
                // If we're on the student dashboard, refresh it too
                if (this.currentSection === 'studentDashboard') {
                    await this.loadStudentDashboard();
                }
            } else {
                // Handle specific error cases
                let errorMessage = 'An unexpected error occurred. Please try again.';
                
                if (data.code === 'INTEREST_NOT_FOUND') {
                    errorMessage = 'You have not expressed interest in this project, or it has already been withdrawn.';
                } else if (data.code === 'PROJECT_NOT_FOUND') {
                    errorMessage = 'This project no longer exists or is not available.';
                } else if (data.error) {
                    errorMessage = data.error;
                }
                
                this.showErrorToast('Withdrawal Failed', errorMessage);
            }

        } catch (error) {
            console.error('Error withdrawing interest:', error);
            this.showErrorToast(
                'Network Error',
                'Unable to connect to the server. Please check your connection and try again.'
            );
        } finally {
            // Reset button state
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.classList.remove('btn-loading');
                buttonElement.textContent = buttonElement.getAttribute('data-original-text') || 'Withdraw Interest';
                buttonElement.removeAttribute('data-original-text');
            }
        }
    }

    async addToFavorites(projectId) {
        if (!this.currentUser) {
            console.log('Please log in to add projects to favorites.');
            this.showSection('login');
            this.showAuthTab('student');
            return;
        }

        if (this.currentUser.type !== 'student') {
            console.log('Only students can add projects to favorites.');
            return;
        }

        try {
            const response = await fetch('/api/students/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    projectId: parseInt(projectId)
                })
            });

            const data = await response.json();

            if (response.ok) {
                const project = this.projects.find(p => p.id === projectId);
                const projectTitle = project ? project.title : 'Project';
                
                this.showSuccessToast(
                    'Added to Favorites',
                    `"${projectTitle}" has been added to your favorites.`
                );
                
                // Update the project in our local data
                if (project) {
                    project.isFavorite = true;
                    this.renderProjects(this.projects);
                }
                // If modal is open, refresh project details
                if (document.getElementById('modal').style.display === 'block') {
                    await this.showProjectDetails(projectId);
                }
            } else {
                let errorMessage = 'Failed to add project to favorites.';
                if (data.code === 'ALREADY_FAVORITED') {
                    errorMessage = 'This project is already in your favorites.';
                } else if (data.code === 'FAVORITES_LIMIT_EXCEEDED') {
                    errorMessage = `You have reached the maximum limit of ${data.maxAllowed} favorites.`;
                } else if (data.error) {
                    errorMessage = data.error;
                }
                
                this.showErrorToast('Favorites Error', errorMessage);
            }

        } catch (error) {
            console.error('Error adding to favorites:', error);
            this.showErrorToast(
                'Network Error',
                'Unable to connect to the server. Please try again.'
            );
        }
    }

    async removeFromFavorites(projectId) {
        if (!this.currentUser || this.currentUser.type !== 'student') {
            return;
        }

        try {
            const response = await fetch(`/api/students/favorites/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                const project = this.projects.find(p => p.id === projectId);
                const projectTitle = project ? project.title : 'Project';
                
                this.showSuccessToast(
                    'Removed from Favorites',
                    `"${projectTitle}" has been removed from your favorites.`
                );
                
                // Update the project in our local data
                if (project) {
                    project.isFavorite = false;
                    this.renderProjects(this.projects);
                }
                // If modal is open, refresh project details
                if (document.getElementById('modal').style.display === 'block') {
                    await this.showProjectDetails(projectId);
                }
                // If we're on the student dashboard, refresh it too
                if (this.currentSection === 'studentDashboard') {
                    await this.loadStudentDashboard();
                }
            } else {
                let errorMessage = 'Failed to remove project from favorites.';
                if (data.code === 'NOT_FAVORITED') {
                    errorMessage = 'This project is not in your favorites.';
                } else if (data.error) {
                    errorMessage = data.error;
                }
                
                this.showErrorToast('Favorites Error', errorMessage);
            }

        } catch (error) {
            console.error('Error removing from favorites:', error);
            this.showErrorToast(
                'Network Error',
                'Unable to connect to the server. Please try again.'
            );
        }
    }

    async toggleFavorite(projectId) {
        if (!this.currentUser) {
            console.log('Please log in to add projects to favorites.');
            this.showSection('login');
            this.showAuthTab('student');
            return;
        }

        if (this.currentUser.type !== 'student') {
            console.log('Only students can add projects to favorites.');
            return;
        }

        try {
            // Find the project in our current data
            const project = this.projects.find(p => p.id === projectId);
            if (!project) return;

            // Check current favorite status
            const isFavorite = project.isFavorite;

            if (isFavorite) {
                await this.removeFromFavorites(projectId);
            } else {
                await this.addToFavorites(projectId);
            }
            
        } catch (error) {
            console.error('Error toggling favorite:', error);
            console.log('Network error. Please try again.');
        }
    }

    async editProject(projectId) {
        try {
            // Fetch project details
            const response = await fetch(`/api/clients/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const project = data.data.project;
            
            if (project.status !== 'pending') {
                console.log(`This project cannot be edited because it is ${project.status}. Only pending projects can be modified.`);
                return;
            }

            this.showEditProjectModal(project);
            
        } catch (error) {
            console.error('Error loading project for editing:', error);
            console.log('Failed to load project details. Please try again.');
        }
    }

    showEditProjectModal(project, isResubmission = false) {
        const modalBody = document.getElementById('modalBody');
        
        const rejectionFeedbackSection = isResubmission && project.rejection_reason ? `
            <div style="background: #fee2e2; padding: 1rem; border-radius: var(--border-radius); margin-bottom: 1.5rem; border-left: 4px solid var(--error-color);">
                <h4 style="color: var(--error-color); margin-bottom: 0.5rem;">📝 Previous Rejection Feedback:</h4>
                <p style="margin: 0;">${this.escapeHtml(project.rejection_reason)}</p>
            </div>
        ` : '';
        
        modalBody.innerHTML = `
            <h2>${isResubmission ? 'Edit & Resubmit Project' : 'Edit Project'}</h2>
            ${rejectionFeedbackSection}
            <form id="editProjectForm" class="project-edit-form">
                <div class="form-group">
                    <label for="editProjectTitle">Project Title *</label>
                    <input type="text" id="editProjectTitle" name="title" required 
                           value="${this.escapeHtml(project.title || '')}"
                           placeholder="Give your project a clear, descriptive title">
                </div>

                <div class="form-group">
                    <label for="editProjectDescription">Project Description *</label>
                    <textarea id="editProjectDescription" name="description" rows="6" required 
                             placeholder="Provide a detailed description of the project, its goals, and the problem it aims to solve...">${this.escapeHtml(project.description || '')}</textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editRequiredSkills">Required Skills *</label>
                        <textarea id="editRequiredSkills" name="required_skills" rows="3" required 
                                 placeholder="List the key skills, technologies, or knowledge areas students should have...">${this.escapeHtml(project.required_skills || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editToolsTechnologies">Tools & Technologies *</label>
                        <textarea id="editToolsTechnologies" name="tools_technologies" rows="3" required 
                                 placeholder="Specify the tools, platforms, and technologies students will use...">${this.escapeHtml(project.tools_technologies || '')}</textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label for="editDeliverables">Project Deliverables *</label>
                    <textarea id="editDeliverables" name="deliverables" rows="4" required 
                             placeholder="Describe what students will deliver at the end of the project...">${this.escapeHtml(project.deliverables || '')}</textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editSemesterAvailability">Semester Availability *</label>
                        <select id="editSemesterAvailability" name="semester_availability" required>
                            <option value="">Select Semester</option>
                            <option value="semester1" ${project.semester_availability === 'semester1' ? 'selected' : ''}>Semester 1 (Feb - Jun)</option>
                            <option value="semester2" ${project.semester_availability === 'semester2' ? 'selected' : ''}>Semester 2 (Jul - Nov)</option>
                            <option value="both" ${project.semester_availability === 'both' ? 'selected' : ''}>Both Semesters</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editDurationWeeks">Duration (Weeks)</label>
                        <select id="editDurationWeeks" name="duration_weeks">
                            <option value="">Select Duration</option>
                            <option value="8" ${project.duration_weeks == 8 ? 'selected' : ''}>8 weeks</option>
                            <option value="12" ${project.duration_weeks == 12 ? 'selected' : ''}>12 weeks (Standard)</option>
                            <option value="16" ${project.duration_weeks == 16 ? 'selected' : ''}>16 weeks</option>
                            <option value="20" ${project.duration_weeks == 20 ? 'selected' : ''}>20 weeks</option>
                            <option value="24" ${project.duration_weeks == 24 ? 'selected' : ''}>24 weeks</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editMaxStudents">Maximum Students</label>
                        <select id="editMaxStudents" name="max_students">
                            <option value="">Select Team Size</option>
                            <option value="1" ${project.max_students == 1 ? 'selected' : ''}>1 Student (Individual)</option>
                            <option value="2" ${project.max_students == 2 ? 'selected' : ''}>2 Students</option>
                            <option value="3" ${project.max_students == 3 ? 'selected' : ''}>3 Students</option>
                            <option value="4" ${project.max_students == 4 ? 'selected' : ''}>4 Students (Recommended)</option>
                            <option value="5" ${project.max_students == 5 ? 'selected' : ''}>5 Students</option>
                            <option value="6" ${project.max_students == 6 ? 'selected' : ''}>6+ Students</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editProjectType">Project Type</label>
                        <select id="editProjectType" name="project_type">
                            <option value="">Select Type</option>
                            <option value="software" ${project.project_type === 'software' ? 'selected' : ''}>Software Development</option>
                            <option value="research" ${project.project_type === 'research' ? 'selected' : ''}>Research Project</option>
                            <option value="design" ${project.project_type === 'design' ? 'selected' : ''}>Design & UX</option>
                            <option value="data" ${project.project_type === 'data' ? 'selected' : ''}>Data Analysis</option>
                            <option value="hardware" ${project.project_type === 'hardware' ? 'selected' : ''}>Hardware/IoT</option>
                            <option value="business" ${project.project_type === 'business' ? 'selected' : ''}>Business Analysis</option>
                            <option value="other" ${project.project_type === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="editPrerequisites">Prerequisites & Additional Requirements</label>
                    <textarea id="editPrerequisites" name="prerequisites" rows="3" 
                             placeholder="Any specific prerequisites, certifications, or additional requirements for students (optional)">${this.escapeHtml(project.prerequisites || '')}</textarea>
                </div>

                <div class="form-group">
                    <label for="editAdditionalInfo">Additional Information</label>
                    <textarea id="editAdditionalInfo" name="additional_info" rows="3" 
                             placeholder="Any other details about the project, your organization, or expectations (optional)">${this.escapeHtml(project.additional_info || '')}</textarea>
                </div>

                <div class="modal-actions" style="margin-top: 2rem; text-align: center;">
                    <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="margin-left: 1rem;">Save Changes</button>
                </div>
            </form>
        `;

        // Add form submit handler
        const form = document.getElementById('editProjectForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProjectEdits(project.id, form);
        });

        this.showModal();
    }

    async saveProjectEdits(projectId, form) {
        try {
            const formData = new FormData(form);
            const projectData = {};
            
            for (let [key, value] of formData.entries()) {
                projectData[key] = value || null;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            const response = await fetch(`/api/clients/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(projectData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Project updated successfully!');
                this.closeModal();
                // Refresh the dashboard to show updated project
                await this.loadClientDashboard();
            } else {
                throw new Error(data.error || 'Failed to update project');
            }

        } catch (error) {
            console.error('Error updating project:', error);
            console.log('Failed to update project: ' + error.message);
            
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Save Changes';
        }
    }

    showCreateProjectModal() {
        console.log('showCreateProjectModal called');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>Create New Project</h2>
            <form id="createProjectForm" class="project-edit-form">
                <div class="form-group">
                    <label for="createProjectTitle">Project Title *</label>
                    <input type="text" id="createProjectTitle" name="title" required 
                           placeholder="Give your project a clear, descriptive title">
                </div>

                <div class="form-group">
                    <label for="createProjectDescription">Project Description * (minimum 50 characters)</label>
                    <textarea id="createProjectDescription" name="description" rows="6" required minlength="50"
                             placeholder="Provide a detailed description of the project, its goals, and the problem it aims to solve. This should be at least 50 characters long and include what students will work on, the expected outcomes, and any specific challenges they'll face..."></textarea>
                    <small class="form-help">Current length: <span id="createDescLength">0</span>/50 minimum</small>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="createRequiredSkills">Required Skills *</label>
                        <textarea id="createRequiredSkills" name="required_skills" rows="3" required 
                                 placeholder="List the key skills, technologies, or knowledge areas students should have..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="createToolsTechnologies">Tools & Technologies *</label>
                        <textarea id="createToolsTechnologies" name="tools_technologies" rows="3" required 
                                 placeholder="Specify the tools, platforms, and technologies students will use..."></textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label for="createDeliverables">Project Deliverables *</label>
                    <textarea id="createDeliverables" name="deliverables" rows="4" required 
                             placeholder="Describe what students will deliver at the end of the project..."></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="createSemesterAvailability">Semester Availability *</label>
                        <select id="createSemesterAvailability" name="semester_availability" required>
                            <option value="">Select Semester</option>
                            <option value="semester1">Semester 1 (Feb - Jun)</option>
                            <option value="semester2">Semester 2 (Jul - Nov)</option>
                            <option value="both">Both Semesters</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="createDurationWeeks">Duration (Weeks)</label>
                        <select id="createDurationWeeks" name="duration_weeks">
                            <option value="">Select Duration</option>
                            <option value="8">8 weeks</option>
                            <option value="12" selected>12 weeks (Standard)</option>
                            <option value="16">16 weeks</option>
                            <option value="20">20 weeks</option>
                            <option value="24">24 weeks</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="createMaxStudents">Maximum Students</label>
                        <select id="createMaxStudents" name="max_students">
                            <option value="">Select Team Size</option>
                            <option value="1">1 Student (Individual)</option>
                            <option value="2">2 Students</option>
                            <option value="3">3 Students</option>
                            <option value="4" selected>4 Students (Recommended)</option>
                            <option value="5">5 Students</option>
                            <option value="6">6+ Students</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="createProjectType">Project Type</label>
                        <select id="createProjectType" name="project_type">
                            <option value="">Select Type</option>
                            <option value="software">Software Development</option>
                            <option value="research">Research Project</option>
                            <option value="design">Design & UX</option>
                            <option value="data">Data Analysis</option>
                            <option value="hardware">Hardware/IoT</option>
                            <option value="business">Business Analysis</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="createPrerequisites">Prerequisites & Additional Requirements</label>
                    <textarea id="createPrerequisites" name="prerequisites" rows="3" 
                             placeholder="Any specific prerequisites, certifications, or additional requirements for students (optional)"></textarea>
                </div>

                <div class="form-group">
                    <label for="createAdditionalInfo">Additional Information</label>
                    <textarea id="createAdditionalInfo" name="additional_info" rows="3" 
                             placeholder="Any other details about the project, your organization, or expectations (optional)"></textarea>
                </div>

                <div class="modal-actions" style="margin-top: 2rem; text-align: center;">
                    <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="margin-left: 1rem;">Create Project</button>
                </div>
            </form>
        `;

        // Add form submit handler
        const form = document.getElementById('createProjectForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewProject(form);
        });

        // Add character counting for description
        const descTextarea = document.getElementById('createProjectDescription');
        const descCounter = document.getElementById('createDescLength');
        if (descTextarea && descCounter) {
            descTextarea.addEventListener('input', function() {
                const length = this.value.length;
                descCounter.textContent = length;
                descCounter.parentElement.style.color = length >= 50 ? 'green' : 'red';
            });
        }

        this.showModal();
    }

    async saveNewProject(form) {
        try {
            const formData = new FormData(form);
            const projectData = {};
            
            for (let [key, value] of formData.entries()) {
                projectData[key] = value || null;
            }

            console.log('Project data being sent:', projectData);

            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Creating...';

            const response = await fetch('/api/clients/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(projectData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Project created successfully and submitted for review!');
                this.closeModal();
                // Refresh the dashboard to show the new project
                await this.loadClientDashboard();
            } else {
                console.log('Validation errors:', data);
                throw new Error(data.error || 'Failed to create project');
            }

        } catch (error) {
            console.error('Error creating project:', error);
            console.log('Failed to create project: ' + error.message);
            
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Create Project';
        }
    }

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/clients/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Project deleted successfully!');
                // Refresh the dashboard to remove the deleted project
                await this.loadClientDashboard();
            } else {
                console.log('Failed to delete project: ' + (data.error || 'Unknown error'));
            }

        } catch (error) {
            console.error('Error deleting project:', error);
            console.log('Network error. Please try again.');
        }
    }

    async viewRejectionFeedback(projectId) {
        try {
            const response = await fetch(`/api/clients/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const project = data.data.project;
            
            const modalBody = document.getElementById('modalBody');
            modalBody.innerHTML = `
                <h2>Project Rejection Feedback</h2>
                <h3>${this.escapeHtml(project.title)}</h3>
                <div style="margin-bottom: 1rem;">
                    <strong>Status:</strong> <span class="project-status status-rejected">Rejected</span>
                </div>
                <div style="margin-bottom: 2rem;">
                    <strong>Feedback from UC Staff:</strong>
                    <div style="background: #fee2e2; padding: 1rem; border-radius: var(--border-radius); margin-top: 0.5rem; border-left: 4px solid var(--error-color);">
                        ${project.rejection_reason ? this.escapeHtml(project.rejection_reason) : 'No specific feedback provided. Please contact UC staff for more details.'}
                    </div>
                </div>
                <div style="text-align: center;">
                    <button class="btn btn-secondary" onclick="app.editAndResubmitProject(${project.id})" style="margin-right: 1rem;">
                        Edit & Resubmit Project
                    </button>
                    <button class="btn btn-outline" onclick="app.closeModal()">
                        Close
                    </button>
                </div>
            `;

            this.showModal();
            
        } catch (error) {
            console.error('Error loading rejection feedback:', error);
            console.log('Failed to load feedback. Please try again.');
        }
    }

    async editAndResubmitProject(projectId) {
        try {
            // Fetch project details
            const response = await fetch(`/api/clients/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const project = data.data.project;
            
            // Close any existing modal first
            this.closeModal();
            
            // Show edit modal with resubmission context
            this.showEditProjectModal(project, true);
            
        } catch (error) {
            console.error('Error loading project for resubmission:', error);
            console.log('Failed to load project details. Please try again.');
        }
    }

    async viewInterestedStudents(projectId) {
        try {
            const response = await fetch(`/api/students/interests/project/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                const modalBody = document.getElementById('modalBody');
                modalBody.innerHTML = `
                    <h2>Interested Students</h2>
                    <h3>${this.escapeHtml(data.projectTitle)}</h3>
                    <p><strong>Total Interest:</strong> ${data.count} students</p>
                    <div style="margin-top: 2rem;">
                        ${data.interests.map(interest => `
                            <div style="border: 1px solid var(--border-color); padding: 1rem; margin-bottom: 1rem; border-radius: var(--border-radius);">
                                <h4>${this.escapeHtml(interest.full_name)}</h4>
                                <p><strong>Email:</strong> ${this.escapeHtml(interest.email)}</p>
                                <p><strong>Expressed:</strong> ${new Date(interest.expressed_at).toLocaleDateString()}</p>
                                ${interest.message ? `<p><strong>Message:</strong> ${this.escapeHtml(interest.message)}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    ${data.count === 0 ? '<p style="text-align: center; color: var(--text-light);">No students have expressed interest yet.</p>' : ''}
                `;
                this.showModal();
            } else {
                console.log(data.error || 'Failed to load interested students');
            }

        } catch (error) {
            console.error('Error loading interested students:', error);
            console.log('Network error. Please try again.');
        }
    }

    async showAdminDashboard() {
        if (!this.currentUser || this.currentUser.type !== 'admin') {
            this.showErrorToast('Access Denied', 'Admin access required');
            return;
        }

        this.showSection('admin');
        this.setupAdminTabs();
        await this.loadPendingProjects();
    }

    setupAdminTabs() {
        // Admin tab switching
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabType = e.target.getAttribute('data-tab');
                this.showAdminTab(tabType);
            });
        });

        // Admin search and filter setup
        this.setupAdminFilters();
        this.setupAdminBulkActions();
    }

    showAdminTab(tabType) {
        // Update tab buttons
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabType) {
                tab.classList.add('active');
            }
        });

        // Update panels
        document.querySelectorAll('.admin-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Map tab types to their actual panel IDs
        const panelMap = {
            'pending': 'pendingProjects',
            'stats': 'statsPanel',
            'all': 'allProjectsPanel',
            'users': 'usersPanel'
        };
        
        const panelId = panelMap[tabType] || `${tabType}Panel`;
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        // Load data for specific tabs
        switch (tabType) {
            case 'pending':
                this.loadPendingProjects();
                break;
            case 'stats':
                this.loadAdminStatistics();
                break;
            case 'all':
                this.loadAllProjects();
                break;
            case 'users':
                this.loadUserManagement();
                break;
        }
    }

    setupAdminFilters() {
        // Pending projects search
        const pendingSearch = document.getElementById('pendingProjectsSearch');
        const pendingSort = document.getElementById('pendingProjectsSort');
        
        if (pendingSearch) {
            pendingSearch.addEventListener('input', () => this.filterPendingProjects());
        }
        
        if (pendingSort) {
            pendingSort.addEventListener('change', () => this.filterPendingProjects());
        }

        // All projects search and filters
        const allProjectsSearch = document.getElementById('allProjectsSearch');
        const allProjectsStatus = document.getElementById('allProjectsStatus');
        const allProjectsSort = document.getElementById('allProjectsSort');
        
        if (allProjectsSearch) {
            allProjectsSearch.addEventListener('input', () => this.filterAllProjects());
        }
        
        if (allProjectsStatus) {
            allProjectsStatus.addEventListener('change', () => this.filterAllProjects());
        }
        
        if (allProjectsSort) {
            allProjectsSort.addEventListener('change', () => this.filterAllProjects());
        }

        // Users search and filter
        const usersSearch = document.getElementById('usersSearch');
        const usersType = document.getElementById('usersType');
        
        if (usersSearch) {
            usersSearch.addEventListener('input', () => this.filterUsers());
        }
        
        if (usersType) {
            usersType.addEventListener('change', () => this.filterUsers());
        }
    }

    setupAdminBulkActions() {
        // Bulk selection for pending projects
        this.selectedPendingProjects = new Set();
        
        document.addEventListener('change', (e) => {
            if (e.target.matches('.pending-project-checkbox')) {
                const projectId = parseInt(e.target.dataset.projectId);
                if (e.target.checked) {
                    this.selectedPendingProjects.add(projectId);
                } else {
                    this.selectedPendingProjects.delete(projectId);
                }
                this.updatePendingBulkActions();
            }
        });
    }

    updatePendingBulkActions() {
        const bulkActions = document.getElementById('pendingBulkActions');
        const selectedCount = document.getElementById('pendingSelectedCount');
        
        if (this.selectedPendingProjects.size > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = `${this.selectedPendingProjects.size} projects selected`;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    async showClientDashboard() {
        console.log('showClientDashboard called, currentUser:', this.currentUser);
        
        if (!this.currentUser || this.currentUser.type !== 'client') {
            console.error('Client access denied:', this.currentUser);
            console.log('Client access required');
            return;
        }

        console.log('Showing client dashboard section');
        this.showSection('clientDashboard');
        await this.loadClientDashboard();
    }

    async loadClientDashboard() {
        try {
            this.showLoading('clientProjectsList');
            
            const response = await fetch('/api/clients/dashboard', {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.renderClientDashboard(data.data);
            
        } catch (error) {
            console.error('Error loading client dashboard:', error);
            this.showError('clientProjectsList', 'Failed to load dashboard data.');
        }
    }

    renderClientDashboard(dashboardData) {
        const { client, projects, stats } = dashboardData;
        
        // Update client info
        const clientInfoContainer = document.getElementById('clientInfo');
        if (clientInfoContainer) {
            clientInfoContainer.innerHTML = `
                <h2>Welcome, ${this.escapeHtml(client.organizationName)}</h2>
                <p><strong>Contact:</strong> ${this.escapeHtml(client.contactName)}</p>
                <p><strong>Industry:</strong> ${this.escapeHtml(client.industry)}</p>
            `;
        }
        
        // Calculate detailed stats by status
        const statusStats = projects.reduce((acc, project) => {
            acc[project.status] = (acc[project.status] || 0) + 1;
            return acc;
        }, {});

        // Update stats
        const statsContainer = document.getElementById('clientStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>${stats.totalProjects}</h3>
                    <p>Total Projects</p>
                </div>
                <div class="stat-card">
                    <h3>${statusStats.pending || 0}</h3>
                    <p>Pending Review</p>
                    <span class="stat-badge status-pending">Pending</span>
                </div>
                <div class="stat-card">
                    <h3>${statusStats.approved || 0}</h3>
                    <p>Approved Projects</p>
                    <span class="stat-badge status-approved">Approved</span>
                </div>
                <div class="stat-card">
                    <h3>${statusStats.active || 0}</h3>
                    <p>Active Projects</p>
                    <span class="stat-badge status-active">Active</span>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalInterests}</h3>
                    <p>Student Interests</p>
                </div>
                ${statusStats.rejected ? `
                <div class="stat-card">
                    <h3>${statusStats.rejected}</h3>
                    <p>Rejected Projects</p>
                    <span class="stat-badge status-rejected">Rejected</span>
                </div>
                ` : ''}
            `;
        }
        
        // Render projects
        const container = document.getElementById('clientProjectsList');
        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="no-projects" style="text-align: center; padding: 2rem; color: var(--text-light);">
                    <h3>No projects yet</h3>
                    <p>Create your first capstone project to start connecting with students.</p>
                    <button class="btn btn-primary" onclick="showCreateProject()" style="margin-top: 1rem;">
                        Create Your First Project
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-card client-project-card">
                <div class="project-header">
                    <h3 class="project-title">${this.escapeHtml(project.title)}</h3>
                    <span class="project-status status-${project.status}">${this.formatStatus(project.status)}</span>
                </div>
                <p class="project-description">${this.escapeHtml(project.description.substring(0, 150))}...</p>
                <div class="project-meta">
                    <span class="project-semester">${this.formatSemester(project.semester_availability)}</span>
                    <span class="project-date">Created: ${new Date(project.created_at).toLocaleDateString()}</span>
                    ${project.updated_at && project.updated_at !== project.created_at ? 
                        `<span class="project-date">Updated: ${new Date(project.updated_at).toLocaleDateString()}</span>` : ''
                    }
                </div>
                <div class="project-stats">
                    <span class="interest-count">${project.interestCount} student${project.interestCount !== 1 ? 's' : ''} interested</span>
                </div>
                <div class="project-actions">
                    <button class="btn btn-outline" onclick="app.showProjectDetails(${project.id})">
                        View Details
                    </button>
                    ${project.status === 'pending' ? `
                        <button class="btn btn-secondary" onclick="app.editProject(${project.id})" style="margin-left: 0.5rem;">
                            Edit Project
                        </button>
                        <button class="btn btn-danger" onclick="app.deleteProject(${project.id})" style="margin-left: 0.5rem;">
                            Delete Project
                        </button>
                    ` : ''}
                    ${project.status === 'rejected' ? `
                        <button class="btn btn-warning" onclick="app.viewRejectionFeedback(${project.id})" style="margin-left: 0.5rem;">
                            View Feedback
                        </button>
                        <button class="btn btn-secondary" onclick="app.editAndResubmitProject(${project.id})" style="margin-left: 0.5rem;">
                            Edit & Resubmit
                        </button>
                        <button class="btn btn-danger" onclick="app.deleteProject(${project.id})" style="margin-left: 0.5rem;">
                            Delete Project
                        </button>
                    ` : ''}
                    ${project.interestCount > 0 ? `
                        <button class="btn btn-primary" onclick="app.viewInterestedStudents(${project.id})" style="margin-left: 0.5rem;">
                            View Interests (${project.interestCount})
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    async showStudentDashboard() {
        if (!this.currentUser || this.currentUser.type !== 'student') {
            console.log('Student access required');
            return;
        }

        this.showSection('studentDashboard');
        await this.loadStudentDashboard();
    }

    async loadStudentDashboard() {
        if (!this.currentUser || this.currentUser.type !== 'student') {
            return;
        }

        try {
            this.showLoading('studentStats');
            this.showLoading('interestsList');
            this.showLoading('favoritesList');
            this.showLoading('profileInfo');
            
            const response = await fetch('/api/students/dashboard', {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.renderStudentDashboard(data);
            this.setupDashboardTabs();
            
        } catch (error) {
            console.error('Error loading student dashboard:', error);
            this.showError('studentStats', 'Failed to load dashboard data.');
        }
    }

    renderStudentDashboard(dashboardData) {
        const { profile, interests, favorites, statistics } = dashboardData;
        
        // Update dashboard stats
        const statsContainer = document.getElementById('studentStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>${interests.count}</h3>
                    <p>Active Interests</p>
                    <span class="stat-badge status-active">${interests.count}/${interests.maxAllowed}</span>
                </div>
                <div class="stat-card">
                    <h3>${favorites.count}</h3>
                    <p>Favorite Projects</p>
                    <span class="stat-badge status-approved">${favorites.count}/${favorites.maxAllowed}</span>
                </div>
                <div class="stat-card">
                    <h3>${statistics.totalProjects}</h3>
                    <p>Available Projects</p>
                    <span class="stat-badge status-pending">Browse</span>
                </div>
                <div class="stat-card">
                    <h3>${statistics.totalInterests}</h3>
                    <p>Total Student Interests</p>
                    <span class="stat-badge status-active">System Wide</span>
                </div>
            `;
        }

        // Update interest count badge
        const interestCountBadge = document.getElementById('interestCountBadge');
        if (interestCountBadge) {
            interestCountBadge.textContent = `${interests.count}/${interests.maxAllowed} interests`;
        }

        // Update favorites count badge
        const favoritesCountBadge = document.getElementById('favoritesCountBadge');
        if (favoritesCountBadge) {
            favoritesCountBadge.textContent = `${favorites.count}/${favorites.maxAllowed} favorites`;
        }

        // Render interests list
        this.renderInterestsList(interests.list);
        
        // Render favorites list
        this.renderFavoritesList(favorites.list);
        
        // Render profile info
        this.renderProfileInfo(profile);
    }

    renderInterestsList(interests) {
        const container = document.getElementById('interestsList');
        const selectAllBtn = document.getElementById('selectAllInterests');
        const bulkWithdrawBtn = document.getElementById('bulkWithdrawBtn');
        
        if (!interests || interests.length === 0) {
            container.innerHTML = `
                <div class="dashboard-empty">
                    <h4>No Project Interests Yet</h4>
                    <p>Start exploring projects and express your interest in up to 5 projects.</p>
                    <button class="btn btn-primary" onclick="window.capstoneApp.showSection('projects')">
                        Browse Projects
                    </button>
                </div>
            `;
            // Hide bulk action buttons
            if (selectAllBtn) selectAllBtn.style.display = 'none';
            if (bulkWithdrawBtn) bulkWithdrawBtn.style.display = 'none';
            return;
        }

        // Show bulk action buttons
        if (selectAllBtn) selectAllBtn.style.display = 'inline-block';
        if (bulkWithdrawBtn) bulkWithdrawBtn.style.display = 'inline-block';

        container.innerHTML = interests.map(interest => `
            <div class="dashboard-item selectable" data-project-id="${interest.project_id}" onclick="window.capstoneApp.showProjectDetails(${interest.project_id})">
                <div class="dashboard-item-checkbox">
                    <input type="checkbox" onclick="event.stopPropagation(); window.capstoneApp.toggleInterestSelection(${interest.project_id}); window.capstoneApp.updateBulkActionButtons();" id="interest-${interest.project_id}">
                </div>
                <div class="dashboard-item-header">
                    <h4 class="dashboard-item-title">${this.escapeHtml(interest.title)}</h4>
                    <div class="dashboard-item-meta">
                        <span>Expressed: ${new Date(interest.expressed_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="dashboard-item-org">${this.escapeHtml(interest.organization_name)}</div>
                <p class="dashboard-item-description">${this.truncateDescription(interest.description, 120)}</p>
                ${interest.message && interest.message.trim() ? `<div class="dashboard-item-message"><strong>Your message:</strong> "${this.escapeHtml(interest.message)}"</div>` : ''}
                <div class="dashboard-item-actions">
                    <button class="btn-dashboard-action" onclick="event.stopPropagation(); window.capstoneApp.showProjectDetails(${interest.project_id})">
                        View Details
                    </button>
                    <button class="btn-dashboard-action danger" onclick="event.stopPropagation(); window.capstoneApp.withdrawInterest(${interest.project_id}, this)">
                        Withdraw Interest
                    </button>
                </div>
            </div>
        `).join('');
        
        // Setup bulk action event listeners
        this.setupBulkActions();
    }

    renderFavoritesList(favorites) {
        const container = document.getElementById('favoritesList');
        
        if (!favorites || favorites.length === 0) {
            container.innerHTML = `
                <div class="dashboard-empty">
                    <h4>No Favorite Projects Yet</h4>
                    <p>Save interesting projects to your favorites for easy access later.</p>
                    <button class="btn btn-primary" onclick="window.capstoneApp.showSection('projects')">
                        Browse Projects
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = favorites.map(favorite => `
            <div class="dashboard-item" onclick="window.capstoneApp.showProjectDetails(${favorite.project_id})">
                <div class="dashboard-item-header">
                    <h4 class="dashboard-item-title">${this.escapeHtml(favorite.title)}</h4>
                    <div class="dashboard-item-meta">
                        <span>Added: ${new Date(favorite.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="dashboard-item-org">${this.escapeHtml(favorite.organization_name)}</div>
                <p class="dashboard-item-description">${this.truncateDescription(favorite.description, 120)}</p>
                <div class="dashboard-item-actions">
                    <button class="btn-dashboard-action" onclick="event.stopPropagation(); window.capstoneApp.showProjectDetails(${favorite.project_id})">
                        View Details
                    </button>
                    <button class="btn-dashboard-action danger" onclick="event.stopPropagation(); window.capstoneApp.removeFromFavorites(${favorite.project_id})">
                        Remove from Favorites
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderProfileInfo(profile) {
        const container = document.getElementById('profileInfo');
        
        container.innerHTML = `
            <div class="profile-field">
                <span class="profile-field-label">Full Name</span>
                <span class="profile-field-value">${this.escapeHtml(profile.fullName)}</span>
            </div>
            <div class="profile-field">
                <span class="profile-field-label">Email</span>
                <span class="profile-field-value">${this.escapeHtml(profile.email)}</span>
            </div>
            ${profile.studentId ? `
            <div class="profile-field">
                <span class="profile-field-label">Student ID</span>
                <span class="profile-field-value">${this.escapeHtml(profile.studentId)}</span>
            </div>
            ` : ''}
            <div class="profile-field">
                <span class="profile-field-label">Member Since</span>
                <span class="profile-field-value">${new Date(profile.memberSince).toLocaleDateString()}</span>
            </div>
        `;
    }

    setupDashboardTabs() {
        const tabButtons = document.querySelectorAll('.dashboard-tabs .tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Update button states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update panel states
                tabPanels.forEach(panel => panel.classList.remove('active'));
                const targetPanel = document.getElementById(`${targetTab}Tab`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    setupBulkActions() {
        const selectAllBtn = document.getElementById('selectAllInterests');
        const bulkWithdrawBtn = document.getElementById('bulkWithdrawBtn');
        
        if (selectAllBtn) {
            selectAllBtn.onclick = () => this.toggleSelectAllInterests();
        }
        
        if (bulkWithdrawBtn) {
            bulkWithdrawBtn.onclick = () => this.bulkWithdrawInterests();
        }
    }

    toggleInterestSelection(projectId) {
        const checkbox = document.getElementById(`interest-${projectId}`);
        const item = document.querySelector(`[data-project-id="${projectId}"]`);
        
        if (checkbox && item) {
            if (checkbox.checked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
            
            this.updateBulkActionButtons();
        }
    }

    toggleSelectAllInterests() {
        const checkboxes = document.querySelectorAll('#interestsList input[type="checkbox"]');
        const selectAllBtn = document.getElementById('selectAllInterests');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
            const projectId = checkbox.id.replace('interest-', '');
            const item = document.querySelector(`[data-project-id="${projectId}"]`);
            
            if (item) {
                if (checkbox.checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            }
        });
        
        selectAllBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
        this.updateBulkActionButtons();
    }

    updateBulkActionButtons() {
        const checkboxes = document.querySelectorAll('#interestsList input[type="checkbox"]');
        const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        const bulkWithdrawBtn = document.getElementById('bulkWithdrawBtn');
        const selectAllBtn = document.getElementById('selectAllInterests');
        
        if (bulkWithdrawBtn) {
            if (selectedCount > 0) {
                bulkWithdrawBtn.textContent = `Withdraw Selected (${selectedCount})`;
                bulkWithdrawBtn.disabled = false;
            } else {
                bulkWithdrawBtn.textContent = 'Withdraw Selected';
                bulkWithdrawBtn.disabled = true;
            }
        }
        
        if (selectAllBtn) {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            selectAllBtn.textContent = allChecked ? 'Deselect All' : 'Select All';
        }
    }

    async bulkWithdrawInterests() {
        const checkboxes = document.querySelectorAll('#interestsList input[type="checkbox"]:checked');
        const selectedProjectIds = Array.from(checkboxes).map(cb => 
            parseInt(cb.id.replace('interest-', ''))
        );
        
        if (selectedProjectIds.length === 0) {
            this.showWarningToast('No Selection', 'Please select at least one project to withdraw from.');
            return;
        }
        
        // Enhanced confirmation for bulk action
        const confirmMessage = `Are you sure you want to withdraw your interest from ${selectedProjectIds.length} project${selectedProjectIds.length !== 1 ? 's' : ''}?\n\nThis action will:\n• Remove you from all selected projects' interested students lists\n• Free up ${selectedProjectIds.length} of your interest slots\n• Notify the project clients of your withdrawals\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const bulkWithdrawBtn = document.getElementById('bulkWithdrawBtn');
        const originalText = bulkWithdrawBtn.textContent;
        
        try {
            // Set loading state
            bulkWithdrawBtn.disabled = true;
            bulkWithdrawBtn.classList.add('btn-loading');
            bulkWithdrawBtn.textContent = 'Withdrawing...';
            
            const response = await fetch('/api/students/interests/bulk', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    projectIds: selectedProjectIds
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const { successful, errors } = data.summary;
                
                if (successful > 0) {
                    this.showSuccessToast(
                        'Bulk Withdrawal Complete',
                        `Successfully withdrew from ${successful} project${successful !== 1 ? 's' : ''}. ${errors > 0 ? `${errors} withdrawals failed.` : ''}`
                    );
                }
                
                if (errors > 0) {
                    this.showWarningToast(
                        'Some Withdrawals Failed',
                        `${errors} withdrawal${errors !== 1 ? 's' : ''} could not be completed. Please try again for those projects.`
                    );
                }
                
                // Refresh dashboard
                await this.loadStudentDashboard();
                await this.loadProjects();
                
            } else {
                this.showErrorToast('Bulk Withdrawal Failed', data.error || 'Failed to withdraw from selected projects.');
            }
            
        } catch (error) {
            console.error('Error in bulk withdrawal:', error);
            this.showErrorToast(
                'Network Error',
                'Unable to connect to the server. Please try again.'
            );
        } finally {
            // Reset button state
            bulkWithdrawBtn.disabled = false;
            bulkWithdrawBtn.classList.remove('btn-loading');
            bulkWithdrawBtn.textContent = originalText;
        }
    }

    async loadPendingProjects() {
        try {
            this.showLoading('pendingProjectsList');
            
            const response = await fetch('/api/projects/admin/pending', {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.pendingProjects = data.projects || [];
            this.renderPendingProjects(this.pendingProjects);
            
        } catch (error) {
            console.error('Error loading pending projects:', error);
            this.showError('pendingProjectsList', 'Failed to load pending projects.');
        }
    }

    renderPendingProjects(projects) {
        const container = document.getElementById('pendingProjectsList');
        
        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="admin-empty"><h4>No pending projects</h4><p>All submitted projects have been reviewed.</p></div>';
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-card admin-project-card" data-project-id="${project.id}">
                <div class="admin-project-header">
                    <input type="checkbox" class="pending-project-checkbox" data-project-id="${project.id}">
                    <div class="project-status-badge">
                        <span class="status-indicator status-pending">Pending Review</span>
                    </div>
                </div>
                <h3 class="project-title">${this.escapeHtml(project.title)}</h3>
                <div class="project-client">
                    <span class="client-icon">🏢</span>
                    ${this.escapeHtml(project.organization_name)}
                </div>
                <p class="project-description">${this.escapeHtml((project.description || '').substring(0, 150))}${project.description && project.description.length > 150 ? '...' : ''}</p>
                
                <div class="project-quick-info">
                    <div class="quick-info-item">
                        <span class="quick-info-icon">📅</span>
                        <span>${this.formatSemester(project.semester_availability)}</span>
                    </div>
                    <div class="quick-info-item">
                        <span class="quick-info-icon">👥</span>
                        <span>${project.max_students || 'Not specified'} students</span>
                    </div>
                    <div class="quick-info-item">
                        <span class="quick-info-icon">⏱️</span>
                        <span>${project.duration_weeks || 'Not specified'} weeks</span>
                    </div>
                </div>
                
                <div class="project-meta">
                    <span class="project-date">Submitted: ${new Date(project.created_at).toLocaleDateString()}</span>
                    <span class="project-type">${this.formatProjectType(project.project_type)}</span>
                </div>
                
                <div class="admin-actions">
                    <button class="btn btn-primary" onclick="window.capstoneApp.approveProject(${project.id})">
                        ✓ Approve
                    </button>
                    <button class="btn btn-outline" onclick="window.capstoneApp.showProjectDetails(${project.id})">
                        👁️ View Details
                    </button>
                    <button class="btn btn-danger" onclick="window.capstoneApp.rejectProject(${project.id})">
                        ✗ Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    async approveProject(projectId) {
        try {
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            const approveBtn = projectElement?.querySelector('.btn-primary');
            
            if (approveBtn) {
                approveBtn.classList.add('btn-loading');
                approveBtn.disabled = true;
            }

            const response = await fetch(`/api/projects/${projectId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'approved'
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccessToast('Project Approved', 'The project has been approved and is now visible to students.');
                await this.loadPendingProjects(); // Refresh the list
                this.selectedPendingProjects.delete(projectId);
                this.updatePendingBulkActions();
            } else {
                this.showErrorToast('Approval Failed', data.error || 'Failed to approve project');
            }

        } catch (error) {
            console.error('Error approving project:', error);
            this.showErrorToast('Network Error', 'Please check your connection and try again.');
        }
    }

    async rejectProject(projectId) {
        // Enhanced confirmation dialog
        const project = this.pendingProjects?.find(p => p.id === projectId);
        const projectTitle = project ? project.title : 'this project';
        
        const confirmMessage = `Are you sure you want to reject "${projectTitle}"?\n\nThis action will:\n• Remove the project from the pending queue\n• Notify the client of the rejection\n• Allow the client to resubmit with modifications\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const feedback = prompt('Optional: Provide feedback for rejection (this will be sent to the client):') || '';
        
        try {
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            const rejectBtn = projectElement?.querySelector('.btn-danger');
            
            if (rejectBtn) {
                rejectBtn.classList.add('btn-loading');
                rejectBtn.disabled = true;
            }

            const response = await fetch(`/api/projects/${projectId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'rejected',
                    feedback
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showWarningToast('Project Rejected', `The project has been rejected${feedback ? ' with feedback' : ''}.`);
                await this.loadPendingProjects(); // Refresh the list
                this.selectedPendingProjects.delete(projectId);
                this.updatePendingBulkActions();
            } else {
                this.showErrorToast('Rejection Failed', data.error || 'Failed to reject project');
            }

        } catch (error) {
            console.error('Error rejecting project:', error);
            this.showErrorToast('Network Error', 'Please check your connection and try again.');
        }
    }

    // Admin Statistics Methods
    async loadAdminStatistics() {
        try {
            this.showLoading('adminStats');
            
            const response = await fetch('/api/admin/statistics', {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.renderAdminStatistics(data);
            
        } catch (error) {
            console.error('Error loading admin statistics:', error);
            this.showError('adminStats', 'Failed to load system statistics.');
        }
    }

    renderAdminStatistics(stats) {
        const container = document.getElementById('adminStats');
        
        container.innerHTML = `
            <div class="admin-stat-card">
                <h4>Total Projects</h4>
                <div class="admin-stat-number">${stats.total_projects || 0}</div>
                <div class="admin-stat-description">All projects in the system</div>
                <div class="admin-stat-trend positive">
                    <span>📈</span> ${stats.projects_this_month || 0} this month
                </div>
            </div>
            
            <div class="admin-stat-card">
                <h4>Pending Reviews</h4>
                <div class="admin-stat-number">${stats.pending_projects || 0}</div>
                <div class="admin-stat-description">Awaiting approval</div>
                <div class="admin-stat-trend ${stats.pending_projects > 5 ? 'negative' : 'positive'}">
                    <span>${stats.pending_projects > 5 ? '⚠️' : '✅'}</span> Review queue status
                </div>
            </div>
            
            <div class="admin-stat-card">
                <h4>Active Projects</h4>
                <div class="admin-stat-number">${stats.active_projects || 0}</div>
                <div class="admin-stat-description">Currently available to students</div>
                <div class="admin-stat-trend positive">
                    <span>🎯</span> ${stats.avg_interest_per_project || 0} avg. interest
                </div>
            </div>
            
            <div class="admin-stat-card">
                <h4>Total Users</h4>
                <div class="admin-stat-number">${stats.total_users || 0}</div>
                <div class="admin-stat-description">Students, clients, and admins</div>
                <div class="admin-stat-trend positive">
                    <span>👥</span> ${stats.users_this_month || 0} new this month
                </div>
            </div>
            
            <div class="admin-stat-card">
                <h4>Student Engagement</h4>
                <div class="admin-stat-number">${stats.total_interests || 0}</div>
                <div class="admin-stat-description">Total interest expressions</div>
                <div class="admin-stat-trend positive">
                    <span>🔥</span> ${stats.engagement_rate || 0}% engagement rate
                </div>
            </div>
            
            <div class="admin-stat-card">
                <h4>Organization Partners</h4>
                <div class="admin-stat-number">${stats.total_organizations || 0}</div>
                <div class="admin-stat-description">Industry partners</div>
                <div class="admin-stat-trend positive">
                    <span>🏢</span> ${stats.new_organizations || 0} new partners
                </div>
            </div>
        `;
    }

    // All Projects Management
    async loadAllProjects() {
        // Prevent multiple simultaneous loads
        if (this.loadingAllProjects) {
            console.log('Already loading all projects, skipping...');
            return;
        }
        
        this.loadingAllProjects = true;
        
        try {
            console.log('Loading all projects...');
            this.showLoading('allProjectsList');
            
            const response = await fetch('/api/admin/projects/all', {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('All projects data:', data);
            this.allProjects = data.projects || [];
            console.log('Projects to render:', this.allProjects);
            this.renderAllProjects(this.allProjects);
            
        } catch (error) {
            console.error('Error loading all projects:', error);
            this.showError('allProjectsList', 'Failed to load projects.');
        } finally {
            this.loadingAllProjects = false;
        }
    }

    renderAllProjects(projects) {
        const container = document.getElementById('allProjectsList');
        console.log('Container element:', container);
        console.log('Container exists:', !!container);
        
        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="admin-empty"><h4>No projects found</h4><p>No projects match the current filters.</p></div>';
            return;
        }

        console.log('Rendering projects, count:', projects.length);
        console.log('First project:', projects[0]);
        console.log('Project statuses:', projects.map(p => p.status));

        container.innerHTML = projects.map(project => `
            <div class="project-card admin-project-card" data-project-id="${project.id}">
                <div class="project-header">
                    <h3 class="project-title">${this.escapeHtml(project.title)}</h3>
                    <div class="project-status-badge">
                        <span class="status-indicator status-${project.status}">${this.formatStatus(project.status)}</span>
                    </div>
                </div>
                
                <div class="project-client">
                    <span class="client-icon">🏢</span>
                    ${this.escapeHtml(project.organization_name)}
                </div>
                
                <p class="project-description">${this.escapeHtml((project.description || '').substring(0, 120))}${project.description && project.description.length > 120 ? '...' : ''}</p>
                
                <div class="project-stats">
                    <div class="stat-item">
                        <span>👥 ${project.interest_count || 0} interested</span>
                    </div>
                    <div class="stat-item">
                        <span>⭐ ${project.favorites_count || 0} favorites</span>
                    </div>
                    <div class="stat-item">
                        <span>📅 ${this.formatSemester(project.semester_availability)}</span>
                    </div>
                </div>
                
                <div class="project-meta">
                    <span class="project-date">Created: ${new Date(project.created_at).toLocaleDateString()}</span>
                    <span class="project-type">${this.formatProjectType(project.project_type)}</span>
                </div>
                
                <div class="admin-actions">
                    <button class="btn btn-outline" onclick="window.capstoneApp.showProjectDetails(${project.id})">
                        View Details
                    </button>
                    ${project.status === 'approved' ? `
                        <button class="btn btn-warning" onclick="window.capstoneApp.deactivateProject(${project.id})">
                            Deactivate
                        </button>
                    ` : ''}
                    ${project.status === 'active' ? `
                        <button class="btn btn-secondary" onclick="window.capstoneApp.archiveProject(${project.id})">
                            Archive
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        console.log('HTML set, container innerHTML length:', container.innerHTML.length);
        console.log('Container has content:', container.innerHTML.substring(0, 200));
        
        // Debug: Add background to see if content is there
        container.style.backgroundColor = '#f0f0f0';
        container.style.minHeight = '200px';
        console.log('Container computed styles:', window.getComputedStyle(container).display);
        
        // Check if content persists after a short delay
        setTimeout(() => {
            console.log('After 100ms - Container innerHTML length:', container.innerHTML.length);
            console.log('After 100ms - Container children:', container.children.length);
            if (container.innerHTML.length === 0) {
                console.error('Content was cleared!');
            }
            
            // Check visibility of first child
            if (container.children.length > 0) {
                const firstChild = container.children[0];
                const rect = firstChild.getBoundingClientRect();
                console.log('First project card visibility:', {
                    display: window.getComputedStyle(firstChild).display,
                    visibility: window.getComputedStyle(firstChild).visibility,
                    opacity: window.getComputedStyle(firstChild).opacity,
                    position: window.getComputedStyle(firstChild).position,
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left
                });
                
                // Check if parent panel is visible
                const panel = document.getElementById('allProjectsPanel');
                console.log('Panel visibility:', {
                    display: window.getComputedStyle(panel).display,
                    classNames: panel.className
                });
            }
        }, 100);
    }

    filterAllProjects() {
        const searchTerm = document.getElementById('allProjectsSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('allProjectsStatus')?.value || '';
        const sortBy = document.getElementById('allProjectsSort')?.value || 'newest';
        
        let filtered = [...this.allProjects];
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(project => 
                project.title.toLowerCase().includes(searchTerm) ||
                project.organization_name.toLowerCase().includes(searchTerm) ||
                project.description.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply status filter
        if (statusFilter) {
            filtered = filtered.filter(project => project.status === statusFilter);
        }
        
        // Apply sorting
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'status':
                filtered.sort((a, b) => a.status.localeCompare(b.status));
                break;
            case 'interest':
                filtered.sort((a, b) => (b.interest_count || 0) - (a.interest_count || 0));
                break;
        }
        
        this.renderAllProjects(filtered);
    }

    // User Management
    async loadUserManagement() {
        try {
            this.showLoading('usersList');
            
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.allUsers = data.users || [];
            this.renderUserManagement(this.allUsers);
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('usersList', 'Failed to load users.');
        }
    }

    renderUserManagement(users) {
        const container = document.getElementById('usersList');
        
        if (!users || users.length === 0) {
            container.innerHTML = '<div class="admin-empty"><h4>No users found</h4><p>No users match the current filters.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="admin-users-table">
                <div class="users-table-header">
                    <div class="user-col-name">Name</div>
                    <div class="user-col-email">Email</div>
                    <div class="user-col-type">Type</div>
                    <div class="user-col-joined">Joined</div>
                    <div class="user-col-activity">Activity</div>
                    <div class="user-col-actions">Actions</div>
                </div>
                ${users.map(user => `
                    <div class="users-table-row" data-user-id="${user.id}">
                        <div class="user-col-name">
                            <div class="user-name">${this.escapeHtml(user.full_name || user.contact_name || 'N/A')}</div>
                            ${user.organization_name ? `<div class="user-org">${this.escapeHtml(user.organization_name)}</div>` : ''}
                        </div>
                        <div class="user-col-email">${this.escapeHtml(user.email)}</div>
                        <div class="user-col-type">
                            <span class="user-type-badge user-type-${user.type}">${user.type}</span>
                        </div>
                        <div class="user-col-joined">${new Date(user.created_at).toLocaleDateString()}</div>
                        <div class="user-col-activity">
                            ${user.type === 'student' ? `${user.interests_count || 0} interests` : ''}
                            ${user.type === 'client' ? `${user.projects_count || 0} projects` : ''}
                            ${user.type === 'admin' ? 'Admin' : ''}
                        </div>
                        <div class="user-col-actions">
                            <button class="btn btn-outline btn-sm" onclick="window.capstoneApp.viewUserDetails(${user.id})">
                                View
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Bulk Operations
    async bulkApproveProjects() {
        if (this.selectedPendingProjects.size === 0) {
            this.showWarningToast('No Selection', 'Please select projects to approve.');
            return;
        }

        const confirmMessage = `Are you sure you want to approve ${this.selectedPendingProjects.size} selected project${this.selectedPendingProjects.size > 1 ? 's' : ''}?\n\nThis will make them visible to students immediately.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const projectIds = Array.from(this.selectedPendingProjects);
            
            const response = await fetch('/api/admin/projects/bulk-approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({ projectIds })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccessToast('Bulk Approval Complete', `${data.approved || projectIds.length} projects have been approved.`);
                await this.loadPendingProjects();
                this.selectedPendingProjects.clear();
                this.updatePendingBulkActions();
            } else {
                this.showErrorToast('Bulk Approval Failed', data.error || 'Failed to approve projects');
            }

        } catch (error) {
            console.error('Error bulk approving projects:', error);
            this.showErrorToast('Network Error', 'Please check your connection and try again.');
        }
    }

    async bulkRejectProjects() {
        if (this.selectedPendingProjects.size === 0) {
            this.showWarningToast('No Selection', 'Please select projects to reject.');
            return;
        }

        const confirmMessage = `Are you sure you want to reject ${this.selectedPendingProjects.size} selected project${this.selectedPendingProjects.size > 1 ? 's' : ''}?\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        const feedback = prompt('Optional: Provide feedback for rejection (will be sent to all selected clients):') || '';

        try {
            const projectIds = Array.from(this.selectedPendingProjects);
            
            const response = await fetch('/api/admin/projects/bulk-reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({ projectIds, feedback })
            });

            const data = await response.json();

            if (response.ok) {
                this.showWarningToast('Bulk Rejection Complete', `${data.rejected || projectIds.length} projects have been rejected.`);
                await this.loadPendingProjects();
                this.selectedPendingProjects.clear();
                this.updatePendingBulkActions();
            } else {
                this.showErrorToast('Bulk Rejection Failed', data.error || 'Failed to reject projects');
            }

        } catch (error) {
            console.error('Error bulk rejecting projects:', error);
            this.showErrorToast('Network Error', 'Please check your connection and try again.');
        }
    }

    clearPendingSelection() {
        this.selectedPendingProjects.clear();
        document.querySelectorAll('.pending-project-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updatePendingBulkActions();
    }

    // Filter Methods
    filterPendingProjects() {
        const searchTerm = document.getElementById('pendingProjectsSearch')?.value.toLowerCase() || '';
        const sortBy = document.getElementById('pendingProjectsSort')?.value || 'newest';
        
        let filtered = [...(this.pendingProjects || [])];
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(project => 
                (project.title || '').toLowerCase().includes(searchTerm) ||
                (project.organization_name || '').toLowerCase().includes(searchTerm) ||
                (project.description || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'organization':
                    return (a.organization_name || '').localeCompare(b.organization_name || '');
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                default: // newest
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
        
        this.renderPendingProjects(filtered);
    }

    filterAllProjects() {
        const searchTerm = document.getElementById('allProjectsSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('allProjectsStatus')?.value || '';
        const sortBy = document.getElementById('allProjectsSort')?.value || 'newest';
        
        let filtered = [...(this.allProjects || [])];
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(project => 
                (project.title || '').toLowerCase().includes(searchTerm) ||
                (project.organization_name || '').toLowerCase().includes(searchTerm) ||
                (project.description || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply status filter
        if (statusFilter) {
            filtered = filtered.filter(project => project.status === statusFilter);
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                case 'interest':
                    return (b.interest_count || 0) - (a.interest_count || 0);
                default: // newest
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
        
        this.renderAllProjects(filtered);
    }

    filterUsers() {
        const searchTerm = document.getElementById('usersSearch')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('usersType')?.value || '';
        
        let filtered = [...(this.allUsers || [])];
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(user => 
                (user.full_name || user.contact_name || '').toLowerCase().includes(searchTerm) ||
                (user.email || '').toLowerCase().includes(searchTerm) ||
                (user.organization_name || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply type filter
        if (typeFilter) {
            filtered = filtered.filter(user => user.type === typeFilter);
        }
        
        this.renderUserManagement(filtered);
    }

    // Helper Methods for Admin
    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending Review',
            'approved': 'Approved',
            'active': 'Active',
            'rejected': 'Rejected',
            'completed': 'Completed',
            'inactive': 'Inactive'
        };
        return statusMap[status] || status;
    }

    formatProjectType(type) {
        if (!type) return 'Not specified';
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
    }

    viewUserDetails(userId) {
        // Placeholder for user details functionality
        this.showInfoToast('User Details', 'User details functionality coming soon.');
    }

    showModal() {
        document.getElementById('modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading">Loading...</div>';
        }
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="loading" style="color: var(--error-color);">${message}</div>`;
        }
    }

    checkAuthStatus() {
        console.log('checkAuthStatus called, authManager:', window.authManager);
        
        // If authManager is not ready yet, try again shortly
        if (!window.authManager) {
            console.log('AuthManager not ready, retrying in 100ms...');
            setTimeout(() => this.checkAuthStatus(), 100);
            return;
        }
        
        // Check with auth manager
        if (window.authManager.isAuthenticated()) {
            this.currentUser = window.authManager.user;
            console.log('User authenticated:', this.currentUser);
            this.updateUIForAuthenticatedUser();
        } else {
            this.currentUser = null;
            console.log('User not authenticated');
            this.updateUIForUnauthenticatedUser();
        }
    }

    updateUIForAuthenticatedUser() {
        const userStatus = document.getElementById('userStatus');
        const authNavLink = document.getElementById('authNavLink');
        const userInfo = document.getElementById('userInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        const studentDashboardLink = document.getElementById('studentDashboardLink');

        if (userStatus && authNavLink && userInfo && this.currentUser) {
            // Hide login link
            authNavLink.style.display = 'none';
            
            // Show user status
            userStatus.style.display = 'flex';
            
            // Update user info
            const user = this.currentUser;
            const displayName = user.fullName || user.organizationName || user.email;
            userInfo.textContent = `${displayName} (${user.type})`;
            
            // Show/hide dashboard link based on user type
            if (studentDashboardLink) {
                if (user.type === 'student') {
                    studentDashboardLink.style.display = 'block';
                } else {
                    studentDashboardLink.style.display = 'none';
                }
            }
            
            // Setup logout button
            if (logoutBtn) {
                logoutBtn.onclick = () => this.logout();
            }
            
            // Auto-redirect to appropriate dashboard based on user type
            if (this.currentSection === 'login' || this.currentSection === 'home') {
                if (user.type === 'admin') {
                    this.showAdminDashboard();
                } else if (user.type === 'client') {
                    this.showClientDashboard();
                } else if (user.type === 'student') {
                    this.showStudentDashboard(); // Students go to their dashboard
                }
            }
        }
    }

    updateUIForUnauthenticatedUser() {
        const userStatus = document.getElementById('userStatus');
        const authNavLink = document.getElementById('authNavLink');
        const studentDashboardLink = document.getElementById('studentDashboardLink');

        if (userStatus && authNavLink) {
            // Show login link
            authNavLink.style.display = 'block';
            
            // Hide user status
            userStatus.style.display = 'none';
            
            // Hide dashboard link
            if (studentDashboardLink) {
                studentDashboardLink.style.display = 'none';
            }
        }
    }

    async logout() {
        if (window.authManager) {
            await window.authManager.logout();
            this.currentUser = null;
            this.updateUIForUnauthenticatedUser();
            this.showSection('home');
        }
    }

    formatSemester(availability) {
        switch(availability) {
            case 'semester1': return 'Semester 1';
            case 'semester2': return 'Semester 2';
            case 'both': return 'Both Semesters';
            default: return availability;
        }
    }

    formatStatus(status) {
        switch(status) {
            case 'pending': return 'Pending Review';
            case 'approved': return 'Approved';
            case 'active': return 'Active';
            case 'inactive': return 'Inactive';
            case 'rejected': return 'Rejected';
            default: return status;
        }
    }

    formatProjectType(type) {
        switch(type) {
            case 'software': return 'Software Development';
            case 'research': return 'Research Project';
            case 'design': return 'Design & UX';
            case 'data': return 'Data Analysis';
            case 'hardware': return 'Hardware/IoT';
            case 'business': return 'Business Analysis';
            case 'other': return 'Other';
            default: return type;
        }
    }

    getProjectDetailPopularityBadge(interestCount) {
        const popularity = this.getPopularityLevel(interestCount);
        return `<span class="popularity-badge ${popularity.className}">${popularity.icon} ${popularity.text}</span>`;
    }

    formatSkillsTags(skillsString) {
        if (!skillsString) return '<span class="no-skills">Not specified</span>';
        
        // Split by common delimiters and create tags
        const skills = skillsString.split(/[,;|]/).map(skill => skill.trim()).filter(skill => skill);
        
        return skills.map(skill => `<span class="skill-tag">${this.escapeHtml(skill)}</span>`).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Toast notification system
    showToast(type, title, message, duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const iconMap = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-icon">${iconMap[type] || iconMap.info}</div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                ${message ? `<div class="toast-message">${this.escapeHtml(message)}</div>` : ''}
            </div>
            <button class="toast-close" onclick="window.capstoneApp.dismissToast('${toastId}')">&times;</button>
        `;

        toastContainer.appendChild(toast);

        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                this.dismissToast(toastId);
            }, duration);
        }

        return toastId;
    }

    dismissToast(toastId) {
        const toast = document.getElementById(toastId);
        if (!toast) return;

        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Match animation duration
    }

    // Convenience methods for different toast types
    showSuccessToast(title, message, duration) {
        return this.showToast('success', title, message, duration);
    }

    showErrorToast(title, message, duration) {
        return this.showToast('error', title, message, duration);
    }

    showWarningToast(title, message, duration) {
        return this.showToast('warning', title, message, duration);
    }

    showInfoToast(title, message, duration) {
        return this.showToast('info', title, message, duration);
    }
}

// Global functions for onclick handlers
function showSection(sectionId) {
    app.showSection(sectionId);
}

function showStudentRegistration() {
    // Open the student registration modal
    const modal = document.getElementById('studentRegistrationModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Initialize the student registration manager if not already done
        if (!window.studentRegistrationManager) {
            window.studentRegistrationManager = new StudentRegistrationManager();
        } else {
            window.studentRegistrationManager.reset();
        }
    } else {
        console.log('Student registration modal not found');
    }
}

function showClientRegistration() {
    // Open the client registration modal
    const modal = document.getElementById('clientRegistrationModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Initialize the registration manager if not already done
        if (!window.clientRegistrationManager) {
            window.clientRegistrationManager = new ClientRegistrationManager();
        } else {
            window.clientRegistrationManager.reset();
        }
    } else {
        console.log('Client registration form is not available');
    }
}

function showAdminLogin() {
    // Check if user is already logged in as admin
    if (app.currentUser && app.currentUser.type === 'admin') {
        app.showAdminDashboard();
    } else {
        app.showSection('login');
        app.showAuthTab('admin');
    }
}

function closeModal() {
    app.closeModal();
}

function closeStudentRegistrationModal() {
    const modal = document.getElementById('studentRegistrationModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form if registration manager exists
        if (window.studentRegistrationManager) {
            window.studentRegistrationManager.reset();
        }
    }
}

function showCreateProject() {
    console.log('showCreateProject global function called');
    console.log('app:', app);
    console.log('currentUser:', app?.currentUser);
    if (!app.currentUser || app.currentUser.type !== 'client') {
        console.log('Access denied - not a client');
        console.log('Client access required to create projects');
        return;
    }
    console.log('Calling showCreateProjectModal...');
    app.showCreateProjectModal();
}

// Initialize the application
const app = new CapstoneApp();

// Make app globally available
window.capstoneApp = app;

// Listen for postMessage events for cross-script communication
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SHOW_CLIENT_DASHBOARD') {
        console.log('Received SHOW_CLIENT_DASHBOARD message');
        if (app && typeof app.showClientDashboard === 'function') {
            app.showClientDashboard();
        }
    }
});

// Global function to manually test client dashboard
window.testClientDashboard = function() {
    console.log('Testing client dashboard...');
    if (window.app) {
        window.app.showClientDashboard();
    } else {
        console.error('App not initialized');
    }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CapstoneApp;
}