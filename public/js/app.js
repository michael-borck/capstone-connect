// Main application JavaScript
class CapstoneApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'home';
        this.projects = [];
        this.galleryItems = [];
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        await this.loadInitialData();
        await this.loadBrandingSettings();
        await this.loadBusinessRules();
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

        // Legacy auth tabs removed - using unified login form

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
            
            // Fetch approved gallery items from the public endpoint
            const response = await fetch('/api/gallery');
            
            if (!response.ok) {
                throw new Error('Failed to fetch gallery items');
            }
            
            const data = await response.json();
            this.galleryItems = data.gallery || [];
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
        // Legacy function - no longer needed with unified login
        // Just show the login section (unified form handles all user types)
        console.log(`Showing unified login (legacy showAuthTab called with: ${tabType})`);
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
                        <button class="btn btn-primary" onclick="app.showSection('login');">
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
        // Ensure auth is ready
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            console.log('Auth not ready in showAdminDashboard, waiting...');
            await this.checkAuthStatus();
        }
        
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
            'users': 'usersPanel',
            'gallery': 'galleryPanel'
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
            case 'gallery':
                this.loadGalleryManagement();
                break;
            case 'settings':
                this.loadSettings();
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
            
            const response = await fetch('/api/admin/projects/pending', {
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

    async completeProject(projectId) {
        // Find project in current projects list
        const project = this.allProjects?.find(p => p.id === projectId);
        const projectTitle = project ? project.title : 'this project';
        
        const confirmMessage = `Mark "${projectTitle}" as completed?\n\nThis action will:\n• Mark the project as completed\n• Create a snapshot of the current project data\n• Make it available for addition to the gallery\n• Students can no longer express interest\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const notes = prompt('Optional: Add completion notes (internal use only):') || '';
        
        try {
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            const completeBtn = projectElement?.querySelector('.btn-primary');
            
            if (completeBtn) {
                completeBtn.classList.add('btn-loading');
                completeBtn.disabled = true;
            }

            const response = await fetch(`/api/projects/${projectId}/complete`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    completionNotes: notes
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccessToast('Project Completed', 'The project has been marked as completed and is now eligible for the gallery.');
                await this.loadAllProjects(); // Refresh the list
            } else {
                this.showErrorToast('Completion Failed', data.error || 'Failed to complete project');
            }

        } catch (error) {
            console.error('Error completing project:', error);
            this.showErrorToast('Network Error', 'Please check your connection and try again.');
        } finally {
            // Re-enable button
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            const completeBtn = projectElement?.querySelector('.btn-primary');
            if (completeBtn) {
                completeBtn.classList.remove('btn-loading');
                completeBtn.disabled = false;
            }
        }
    }

    async archiveProject(projectId) {
        // Find project in current projects list
        const project = this.allProjects?.find(p => p.id === projectId);
        const projectTitle = project ? project.title : 'this project';
        
        const confirmMessage = `Archive "${projectTitle}"?\n\nThis action will:\n• Move the project to archived status\n• Hide it from most views\n• Preserve all project data\n• Can be restored later if needed\n\nContinue?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            const archiveBtn = projectElement?.querySelector('.btn-secondary');
            
            if (archiveBtn) {
                archiveBtn.classList.add('btn-loading');
                archiveBtn.disabled = true;
            }

            const response = await fetch(`/api/projects/${projectId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'archived'
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showInfoToast('Project Archived', 'The project has been archived and moved out of active view.');
                await this.loadAllProjects(); // Refresh the list
            } else {
                this.showErrorToast('Archive Failed', data.error || 'Failed to archive project');
            }

        } catch (error) {
            console.error('Error archiving project:', error);
            this.showErrorToast('Network Error', 'Please check your connection and try again.');
        } finally {
            // Re-enable button
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            const archiveBtn = projectElement?.querySelector('.btn-secondary');
            if (archiveBtn) {
                archiveBtn.classList.remove('btn-loading');
                archiveBtn.disabled = false;
            }
        }
    }

    async deactivateProject(projectId) {
        // Find project in current projects list
        const project = this.allProjects?.find(p => p.id === projectId);
        const projectTitle = project ? project.title : 'this project';
        
        const confirmMessage = `Deactivate "${projectTitle}"?\n\nThis action will:\n• Change project status from approved to inactive\n• Students can no longer express interest\n• Hide project from public view\n• Can be reactivated later\n\nContinue?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            const deactivateBtn = projectElement?.querySelector('.btn-warning');
            
            if (deactivateBtn) {
                deactivateBtn.classList.add('btn-loading');
                deactivateBtn.disabled = true;
            }

            const response = await fetch(`/api/projects/${projectId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'inactive'
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showWarningToast('Project Deactivated', 'The project has been deactivated and is no longer visible to students.');
                await this.loadAllProjects(); // Refresh the list
            } else {
                this.showErrorToast('Deactivation Failed', data.error || 'Failed to deactivate project');
            }

        } catch (error) {
            console.error('Error deactivating project:', error);
            this.showErrorToast('Network Error', 'Please check your connection and try again.');
        } finally {
            // Re-enable button
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            const deactivateBtn = projectElement?.querySelector('.btn-warning');
            if (deactivateBtn) {
                deactivateBtn.classList.remove('btn-loading');
                deactivateBtn.disabled = false;
            }
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
            
            // For now, show a simple message for charts
            const chartsContainer = document.getElementById('adminCharts');
            if (chartsContainer) {
                chartsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Chart visualization coming soon. Use the statistics above for current metrics.</p>';
            }
            
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
                    ${project.status === 'pending' ? `
                        <button class="btn btn-success" onclick="window.capstoneApp.approveProject(${project.id})">
                            Approve
                        </button>
                        <button class="btn btn-danger" onclick="window.capstoneApp.rejectProject(${project.id})">
                            Reject
                        </button>
                    ` : ''}
                    ${(project.status === 'approved' || project.status === 'active') ? `
                        <button class="btn btn-primary" onclick="window.capstoneApp.completeProject(${project.id})">
                            Complete
                        </button>
                    ` : ''}
                    ${project.status === 'active' ? `
                        <button class="btn btn-warning" onclick="window.capstoneApp.deactivateProject(${project.id})">
                            Deactivate
                        </button>
                    ` : ''}
                    ${project.status === 'completed' ? `
                        <button class="btn btn-secondary" onclick="window.capstoneApp.archiveProject(${project.id})">
                            Archive
                        </button>
                    ` : ''}
                    ${(project.status === 'rejected' || project.status === 'archived') ? `
                        <button class="btn btn-danger" onclick="window.capstoneApp.deleteProject(${project.id})">
                            Delete
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

    async viewUserDetails(userId) {
        try {
            // Find the user in our current users list
            const users = this.currentUsers || [];
            const user = users.find(u => u.id === userId);
            
            if (!user) {
                this.showErrorToast('Error', 'User not found');
                return;
            }
            
            // Show user details in a modal
            const modal = document.getElementById('modal');
            const modalBody = document.getElementById('modalBody');
            
            modalBody.innerHTML = `
                <h2>User Details</h2>
                <div class="user-details">
                    <div class="detail-row">
                        <strong>Type:</strong> <span class="user-type-badge user-type-${user.type}">${user.type}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Name:</strong> ${this.escapeHtml(user.full_name || user.organization_name || 'N/A')}
                    </div>
                    <div class="detail-row">
                        <strong>Email:</strong> ${this.escapeHtml(user.email)}
                    </div>
                    <div class="detail-row">
                        <strong>Joined:</strong> ${new Date(user.created_at).toLocaleDateString()}
                    </div>
                    ${user.type === 'student' ? `
                        <div class="detail-row">
                            <strong>Student ID:</strong> ${this.escapeHtml(user.student_id || 'N/A')}
                        </div>
                        <div class="detail-row">
                            <strong>Course:</strong> ${this.escapeHtml(user.course || 'N/A')}
                        </div>
                        <div class="detail-row">
                            <strong>Year Level:</strong> ${user.year_level || 'N/A'}
                        </div>
                        <div class="detail-row">
                            <strong>Interests:</strong> ${user.interests_count || 0} projects
                        </div>
                    ` : ''}
                    ${user.type === 'client' ? `
                        <div class="detail-row">
                            <strong>Organization:</strong> ${this.escapeHtml(user.organization_name)}
                        </div>
                        <div class="detail-row">
                            <strong>Website:</strong> ${user.website ? `<a href="${this.escapeHtml(user.website)}" target="_blank">${this.escapeHtml(user.website)}</a>` : 'N/A'}
                        </div>
                        <div class="detail-row">
                            <strong>Projects:</strong> ${user.projects_count || 0} submitted
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <strong>Status:</strong> ${user.is_archived ? '<span style="color: var(--warning-color);">Archived</span>' : '<span style="color: var(--success-color);">Active</span>'}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                    ${!user.is_archived ? `
                        <button class="btn btn-warning" onclick="window.capstoneApp.archiveUser(${userId})">Archive User</button>
                    ` : `
                        <button class="btn btn-success" onclick="window.capstoneApp.restoreUser(${userId})">Restore User</button>
                    `}
                </div>
            `;
            
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Error viewing user details:', error);
            this.showErrorToast('Error', 'Failed to load user details');
        }
    }
    
    showAddUserModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>Add New User</h2>
            <form id="addUserForm" class="auth-form">
                <div class="form-group">
                    <label for="userType">User Type *</label>
                    <select id="userType" required onchange="window.capstoneApp.toggleUserTypeFields()">
                        <option value="">Select user type...</option>
                        <option value="student">Student</option>
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="userEmail">Email *</label>
                    <input type="email" id="userEmail" required placeholder="user@example.com">
                </div>
                
                <div class="form-group">
                    <label for="userPassword">Password *</label>
                    <input type="password" id="userPassword" required placeholder="Minimum 8 characters">
                </div>
                
                <!-- Student fields -->
                <div id="studentFields" style="display: none;">
                    <div class="form-group">
                        <label for="fullName">Full Name *</label>
                        <input type="text" id="fullName" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label for="studentId">Student ID *</label>
                        <input type="text" id="studentId" placeholder="12345678">
                    </div>
                    <div class="form-group">
                        <label for="course">Course *</label>
                        <input type="text" id="course" placeholder="Computer Science">
                    </div>
                    <div class="form-group">
                        <label for="yearLevel">Year Level *</label>
                        <select id="yearLevel">
                            <option value="1">Year 1</option>
                            <option value="2">Year 2</option>
                            <option value="3">Year 3</option>
                            <option value="4">Year 4</option>
                        </select>
                    </div>
                </div>
                
                <!-- Client fields -->
                <div id="clientFields" style="display: none;">
                    <div class="form-group">
                        <label for="orgName">Organization Name *</label>
                        <input type="text" id="orgName" placeholder="Company Inc.">
                    </div>
                    <div class="form-group">
                        <label for="contactName">Contact Name *</label>
                        <input type="text" id="contactName" placeholder="Jane Smith">
                    </div>
                    <div class="form-group">
                        <label for="website">Website</label>
                        <input type="url" id="website" placeholder="https://example.com">
                    </div>
                </div>
                
                <!-- Admin fields -->
                <div id="adminFields" style="display: none;">
                    <div class="form-group">
                        <label for="adminName">Full Name *</label>
                        <input type="text" id="adminName" placeholder="Admin Name">
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create User</button>
                </div>
            </form>
        `;
        
        const form = document.getElementById('addUserForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createUser();
        });
        
        modal.style.display = 'block';
    }
    
    toggleUserTypeFields() {
        const userType = document.getElementById('userType').value;
        document.getElementById('studentFields').style.display = userType === 'student' ? 'block' : 'none';
        document.getElementById('clientFields').style.display = userType === 'client' ? 'block' : 'none';
        document.getElementById('adminFields').style.display = userType === 'admin' ? 'block' : 'none';
        
        // Update required attributes
        const studentInputs = document.querySelectorAll('#studentFields input, #studentFields select');
        const clientInputs = document.querySelectorAll('#clientFields input[required]');
        const adminInputs = document.querySelectorAll('#adminFields input');
        
        studentInputs.forEach(input => input.required = userType === 'student');
        clientInputs.forEach(input => input.required = userType === 'client');
        adminInputs.forEach(input => input.required = userType === 'admin');
    }
    
    async createUser() {
        try {
            const userType = document.getElementById('userType').value;
            const email = document.getElementById('userEmail').value;
            const password = document.getElementById('userPassword').value;
            
            let userData = {
                email,
                password,
                type: userType
            };
            
            // Add type-specific fields
            if (userType === 'student') {
                userData.fullName = document.getElementById('fullName').value;
                userData.studentId = document.getElementById('studentId').value;
                userData.course = document.getElementById('course').value;
                userData.yearLevel = document.getElementById('yearLevel').value;
            } else if (userType === 'client') {
                userData.organizationName = document.getElementById('orgName').value;
                userData.contactName = document.getElementById('contactName').value;
                userData.website = document.getElementById('website').value;
            } else if (userType === 'admin') {
                userData.fullName = document.getElementById('adminName').value;
            }
            
            const response = await fetch('/api/admin/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create user');
            }
            
            this.showSuccessToast('User Created', `New ${userType} account created successfully`);
            this.closeModal();
            
            // Refresh users list
            if (document.querySelector('.admin-tab[data-tab="users"].active')) {
                await this.loadUsers();
            }
            
        } catch (error) {
            console.error('Error creating user:', error);
            this.showErrorToast('Error', error.message || 'Failed to create user');
        }
    }
    
    async archiveUser(userId) {
        if (!confirm('Are you sure you want to archive this user?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/users/${userId}/archive`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to archive user');
            }
            
            this.showSuccessToast('User Archived', 'User has been archived successfully');
            this.closeModal();
            
            // Refresh users list
            if (document.querySelector('.admin-tab[data-tab="users"].active')) {
                await this.loadUsers();
            }
            
        } catch (error) {
            console.error('Error archiving user:', error);
            this.showErrorToast('Error', error.message || 'Failed to archive user');
        }
    }
    
    async restoreUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/restore`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to restore user');
            }
            
            this.showSuccessToast('User Restored', 'User has been restored successfully');
            this.closeModal();
            
            // Refresh users list
            if (document.querySelector('.admin-tab[data-tab="users"].active')) {
                await this.loadUsers();
            }
            
        } catch (error) {
            console.error('Error restoring user:', error);
            this.showErrorToast('Error', error.message || 'Failed to restore user');
        }
    }
    
    async showCreateProjectModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        // First, get list of clients
        try {
            const response = await fetch('/api/admin/users?type=client&status=active', {
                headers: { 'Authorization': `Bearer ${window.authManager.getToken()}` },
                credentials: 'include'
            });
            
            const data = await response.json();
            const clients = data.users || [];
            
            modalBody.innerHTML = `
                <h2>Create New Project</h2>
                <form id="createProjectForm" class="project-form">
                    <div class="form-group">
                        <label for="projectClient">Client Organization *</label>
                        <select id="projectClient" required onchange="window.capstoneApp.toggleNewClientFields()">
                            <option value="">Select existing client...</option>
                            ${clients.map(client => `
                                <option value="${client.id}">${this.escapeHtml(client.organization_name)} - ${this.escapeHtml(client.email)}</option>
                            `).join('')}
                            <option value="new">+ Create New Client</option>
                        </select>
                    </div>
                    
                    <!-- New Client Fields -->
                    <div id="newClientFields" style="display: none; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                        <h4>New Client Details</h4>
                        <div class="form-group">
                            <label for="newClientOrg">Organization Name *</label>
                            <input type="text" id="newClientOrg" placeholder="Company Inc.">
                        </div>
                        <div class="form-group">
                            <label for="newClientContact">Contact Name *</label>
                            <input type="text" id="newClientContact" placeholder="Jane Smith">
                        </div>
                        <div class="form-group">
                            <label for="newClientEmail">Email *</label>
                            <input type="email" id="newClientEmail" placeholder="contact@company.com">
                        </div>
                        <div class="form-group">
                            <label for="newClientPassword">Password *</label>
                            <input type="password" id="newClientPassword" placeholder="Minimum 8 characters">
                        </div>
                    </div>
                    
                    <!-- Project Details -->
                    <h4>Project Details</h4>
                    <div class="form-group">
                        <label for="projectTitle">Project Title *</label>
                        <input type="text" id="projectTitle" required placeholder="Enter project title">
                    </div>
                    
                    <div class="form-group">
                        <label for="projectDescription">Description *</label>
                        <textarea id="projectDescription" rows="4" required placeholder="Describe the project goals and requirements..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="projectType">Project Type *</label>
                            <select id="projectType" required>
                                <option value="">Select type...</option>
                                <option value="development">Development</option>
                                <option value="research">Research</option>
                                <option value="design">Design</option>
                                <option value="analysis">Analysis</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="teamSize">Team Size *</label>
                            <input type="number" id="teamSize" min="1" max="10" value="3" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="projectSkills">Required Skills</label>
                        <input type="text" id="projectSkills" placeholder="e.g., Python, React, Machine Learning">
                    </div>
                    
                    <div class="form-group">
                        <label for="projectStatus">Initial Status *</label>
                        <select id="projectStatus" required>
                            <option value="pending">Pending (Requires Admin Approval)</option>
                            <option value="approved">Approved (Immediately Visible)</option>
                        </select>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Project</button>
                    </div>
                </form>
            `;
            
            const form = document.getElementById('createProjectForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createProjectAsAdmin();
            });
            
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Error loading clients:', error);
            this.showErrorToast('Error', 'Failed to load client list');
        }
    }
    
    toggleNewClientFields() {
        const clientSelect = document.getElementById('projectClient');
        const newClientFields = document.getElementById('newClientFields');
        const isNewClient = clientSelect.value === 'new';
        
        newClientFields.style.display = isNewClient ? 'block' : 'none';
        
        // Update required attributes for new client fields
        const newClientInputs = newClientFields.querySelectorAll('input');
        newClientInputs.forEach(input => input.required = isNewClient);
    }
    
    async createProjectAsAdmin() {
        try {
            const clientSelect = document.getElementById('projectClient').value;
            let clientId;
            
            // If creating new client
            if (clientSelect === 'new') {
                const clientData = {
                    type: 'client',
                    email: document.getElementById('newClientEmail').value,
                    password: document.getElementById('newClientPassword').value,
                    organizationName: document.getElementById('newClientOrg').value,
                    contactName: document.getElementById('newClientContact').value
                };
                
                const clientResponse = await fetch('/api/admin/users/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.authManager.getToken()}`
                    },
                    credentials: 'include',
                    body: JSON.stringify(clientData)
                });
                
                if (!clientResponse.ok) {
                    const error = await clientResponse.json();
                    throw new Error(error.message || 'Failed to create client');
                }
                
                const newClient = await clientResponse.json();
                clientId = newClient.user.id;
                this.showSuccessToast('Client Created', 'New client account created successfully');
                
            } else {
                clientId = parseInt(clientSelect);
            }
            
            // Create the project
            const projectData = {
                clientId,
                title: document.getElementById('projectTitle').value,
                description: document.getElementById('projectDescription').value,
                type: document.getElementById('projectType').value,
                teamSize: parseInt(document.getElementById('teamSize').value),
                requiredSkills: document.getElementById('projectSkills').value,
                status: document.getElementById('projectStatus').value
            };
            
            const projectResponse = await fetch('/api/admin/projects/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(projectData)
            });
            
            if (!projectResponse.ok) {
                const error = await projectResponse.json();
                throw new Error(error.message || 'Failed to create project');
            }
            
            this.showSuccessToast('Project Created', 'Project has been created successfully');
            this.closeModal();
            
            // Refresh projects list
            if (document.querySelector('.admin-tab[data-tab="all"].active')) {
                await this.loadAllProjects();
            } else if (document.querySelector('.admin-tab[data-tab="pending"].active') && projectData.status === 'pending') {
                await this.loadPendingProjects();
            }
            
        } catch (error) {
            console.error('Error creating project:', error);
            this.showErrorToast('Error', error.message || 'Failed to create project');
        }
    }

    showModal() {
        document.getElementById('modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    // Settings Management Functions
    async loadSettings() {
        try {
            // Setup category switching
            this.setupSettingsCategories();
            
            // Load settings for the active category
            await this.loadSettingsCategory('branding');
            
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showErrorToast('Error', 'Failed to load settings');
        }
    }
    
    setupSettingsCategories() {
        const categories = document.querySelectorAll('.settings-category');
        categories.forEach(cat => {
            cat.addEventListener('click', async (e) => {
                // Update active state
                categories.forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                
                // Load settings for this category
                const category = e.target.getAttribute('data-category');
                await this.loadSettingsCategory(category);
            });
        });
    }
    
    async loadSettingsCategory(category) {
        const loader = document.getElementById('settingsLoader');
        const form = document.getElementById('settingsForm');
        
        loader.style.display = 'block';
        form.style.display = 'none';
        
        try {
            const response = await fetch(`/api/admin/settings/${category}`, {
                headers: { 'Authorization': `Bearer ${window.authManager.getToken()}` },
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to load settings');
            
            const data = await response.json();
            this.currentSettings = data.settings;
            this.originalSettings = JSON.parse(JSON.stringify(data.settings)); // Deep copy
            
            // Render settings form
            this.renderSettingsForm(category, data.settings);
            
            loader.style.display = 'none';
            form.style.display = 'block';
            
        } catch (error) {
            console.error('Error loading settings category:', error);
            loader.innerHTML = '<div class="error">Failed to load settings</div>';
        }
    }
    
    renderSettingsForm(category, settings) {
        const form = document.getElementById('settingsForm');
        let html = '';
        
        // Group settings by subcategory if needed
        const groups = this.groupSettings(category, settings);
        
        for (const [groupName, groupSettings] of Object.entries(groups)) {
            html += `<div class="settings-group">`;
            if (groupName !== 'default') {
                html += `<h4>${this.formatGroupName(groupName)}</h4>`;
            }
            
            for (const setting of groupSettings) {
                html += this.renderSettingItem(setting);
            }
            
            html += `</div>`;
        }
        
        form.innerHTML = html;
        
        // Add event listeners
        this.attachSettingListeners();
    }
    
    groupSettings(category, settings) {
        // For now, just return all settings in default group
        // Can be enhanced to group by subcategories
        return { default: settings };
    }
    
    formatGroupName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
    }
    
    renderSettingItem(setting) {
        const { setting_key, setting_value, setting_type, description } = setting;
        let inputHtml = '';
        
        switch (setting_type) {
            case 'string':
                if (setting_key.includes('color')) {
                    inputHtml = `
                        <div class="color-picker-wrapper">
                            <input type="color" 
                                   class="setting-input" 
                                   id="${setting_key}" 
                                   value="${setting_value}"
                                   data-type="${setting_type}">
                            <input type="text" 
                                   class="setting-input color-hex-input" 
                                   value="${setting_value}"
                                   placeholder="#000000"
                                   pattern="^#[0-9A-Fa-f]{6}$"
                                   maxlength="7">
                            <div class="color-preview" style="background: ${setting_value}"></div>
                        </div>
                    `;
                } else {
                    inputHtml = `
                        <input type="text" 
                               class="setting-input" 
                               id="${setting_key}" 
                               value="${this.escapeHtml(setting_value)}"
                               data-type="${setting_type}">
                    `;
                }
                break;
                
            case 'number':
                inputHtml = `
                    <input type="number" 
                           class="setting-input" 
                           id="${setting_key}" 
                           value="${setting_value}"
                           data-type="${setting_type}">
                `;
                break;
                
            case 'boolean':
                inputHtml = `
                    <div class="setting-toggle">
                        <div class="toggle-switch ${setting_value === 'true' ? 'active' : ''}" 
                             onclick="window.capstoneApp.toggleSetting('${setting_key}')">
                            <div class="toggle-slider"></div>
                        </div>
                        <span>${setting_value === 'true' ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <input type="hidden" 
                           id="${setting_key}" 
                           value="${setting_value}"
                           data-type="${setting_type}">
                `;
                break;
                
            case 'json':
                if (setting_key.includes('domain_whitelist')) {
                    const domains = JSON.parse(setting_value);
                    inputHtml = `
                        <div class="domain-manager">
                            <div class="domain-list" id="${setting_key}_list">
                                ${domains.map(d => `
                                    <span class="domain-tag">
                                        ${this.escapeHtml(d)}
                                        <span class="remove" onclick="window.capstoneApp.removeDomain('${setting_key}', '${d}')">×</span>
                                    </span>
                                `).join('')}
                            </div>
                            <div class="add-domain-input">
                                <input type="text" 
                                       placeholder="Add domain (e.g., @example.edu)" 
                                       id="${setting_key}_input"
                                       class="setting-input">
                                <button class="btn btn-sm btn-primary" 
                                        onclick="window.capstoneApp.addDomain('${setting_key}')">
                                    Add
                                </button>
                            </div>
                            <input type="hidden" 
                                   id="${setting_key}" 
                                   value='${setting_value}'
                                   data-type="${setting_type}">
                        </div>
                    `;
                } else {
                    // For other JSON fields, use textarea
                    inputHtml = `
                        <textarea class="setting-input" 
                                  id="${setting_key}" 
                                  rows="3"
                                  data-type="${setting_type}">${this.escapeHtml(setting_value)}</textarea>
                    `;
                }
                break;
        }
        
        return `
            <div class="setting-item">
                <label class="setting-label" for="${setting_key}">
                    ${this.formatSettingLabel(setting_key)}
                </label>
                <p class="setting-description">${description}</p>
                ${inputHtml}
            </div>
        `;
    }
    
    formatSettingLabel(key) {
        return key.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    attachSettingListeners() {
        const inputs = document.querySelectorAll('.setting-input');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.checkForChanges());
            input.addEventListener('input', () => {
                this.checkForChanges();
                
                // Update color preview if this is a color input
                if (input.type === 'color') {
                    const wrapper = input.parentElement;
                    const preview = wrapper.querySelector('.color-preview');
                    const hexInput = wrapper.querySelector('.color-hex-input');
                    
                    if (preview) {
                        preview.style.background = input.value;
                    }
                    if (hexInput) {
                        hexInput.value = input.value;
                    }
                }
                
                // Update color picker if this is a hex input
                if (input.classList.contains('color-hex-input')) {
                    const wrapper = input.parentElement;
                    const colorPicker = wrapper.querySelector('input[type="color"]');
                    const preview = wrapper.querySelector('.color-preview');
                    
                    if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
                        if (colorPicker) {
                            colorPicker.value = input.value;
                        }
                        if (preview) {
                            preview.style.background = input.value;
                        }
                    }
                }
            });
        });
        
        // Add toggle listeners for boolean settings
        const toggles = document.querySelectorAll('.toggle-switch');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const key = toggle.dataset.key;
                if (key) {
                    this.toggleSetting(key);
                }
            });
        });
    }
    
    checkForChanges() {
        const hasChanges = this.hasUnsavedChanges();
        const saveBar = document.querySelector('.settings-save-bar');
        if (saveBar) {
            saveBar.style.display = hasChanges ? 'flex' : 'none';
        }
    }
    
    hasUnsavedChanges() {
        if (!this.currentSettings || !this.originalSettings) return false;
        
        for (const setting of this.currentSettings) {
            const input = document.getElementById(setting.setting_key);
            if (input) {
                const currentValue = input.value;
                const originalSetting = this.originalSettings.find(s => s.setting_key === setting.setting_key);
                if (originalSetting && currentValue !== originalSetting.setting_value) {
                    return true;
                }
            }
        }
        return false;
    }
    
    toggleSetting(key) {
        const input = document.getElementById(key);
        const toggle = input.previousElementSibling;
        const currentValue = input.value === 'true';
        const newValue = !currentValue;
        
        input.value = newValue.toString();
        toggle.classList.toggle('active', newValue);
        toggle.nextElementSibling.textContent = newValue ? 'Enabled' : 'Disabled';
        
        this.checkForChanges();
    }
    
    addDomain(key) {
        const input = document.getElementById(`${key}_input`);
        const domain = input.value.trim();
        
        if (!domain) return;
        
        // Validate domain format
        if (!domain.startsWith('@') && !domain.startsWith('*.')) {
            this.showErrorToast('Invalid Format', 'Domain must start with @ or *.');
            return;
        }
        
        const hiddenInput = document.getElementById(key);
        const domains = JSON.parse(hiddenInput.value);
        
        if (domains.includes(domain)) {
            this.showWarningToast('Duplicate', 'This domain is already in the list');
            return;
        }
        
        domains.push(domain);
        hiddenInput.value = JSON.stringify(domains);
        
        // Update UI
        this.updateDomainList(key, domains);
        input.value = '';
        this.checkForChanges();
    }
    
    removeDomain(key, domain) {
        const hiddenInput = document.getElementById(key);
        const domains = JSON.parse(hiddenInput.value);
        const index = domains.indexOf(domain);
        
        if (index > -1) {
            domains.splice(index, 1);
            hiddenInput.value = JSON.stringify(domains);
            this.updateDomainList(key, domains);
            this.checkForChanges();
        }
    }
    
    updateDomainList(key, domains) {
        const list = document.getElementById(`${key}_list`);
        list.innerHTML = domains.map(d => `
            <span class="domain-tag">
                ${this.escapeHtml(d)}
                <span class="remove" onclick="window.capstoneApp.removeDomain('${key}', '${d}')">×</span>
            </span>
        `).join('');
    }
    
    async saveSettings() {
        const updates = [];
        
        // Collect changed settings
        for (const setting of this.currentSettings) {
            const input = document.getElementById(setting.setting_key);
            if (input) {
                const currentValue = input.value;
                const originalSetting = this.originalSettings.find(s => s.setting_key === setting.setting_key);
                
                if (originalSetting && currentValue !== originalSetting.setting_value) {
                    updates.push({
                        key: setting.setting_key,
                        value: setting.setting_type === 'number' ? parseFloat(currentValue) : 
                               setting.setting_type === 'boolean' ? currentValue === 'true' :
                               setting.setting_type === 'json' ? JSON.parse(currentValue) :
                               currentValue
                    });
                }
            }
        }
        
        if (updates.length === 0) {
            this.showInfoToast('No Changes', 'No settings have been modified');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/settings/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({ updates })
            });
            
            if (!response.ok) throw new Error('Failed to save settings');
            
            this.showSuccessToast('Settings Saved', 'Your changes have been saved successfully');
            
            // Update original settings
            this.originalSettings = JSON.parse(JSON.stringify(this.currentSettings));
            this.checkForChanges();
            
            // If branding was updated, refresh the page to apply changes
            if (updates.some(u => ['site_title', 'primary_color', 'secondary_color'].includes(u.key))) {
                setTimeout(() => location.reload(), 1000);
            }
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showErrorToast('Error', 'Failed to save settings');
        }
    }
    
    resetSettings() {
        if (!confirm('Are you sure you want to reset all changes?')) return;
        
        // Reset all inputs to original values
        for (const setting of this.originalSettings) {
            const input = document.getElementById(setting.setting_key);
            if (input) {
                input.value = setting.setting_value;
                
                // Handle special cases
                if (setting.setting_type === 'boolean') {
                    const toggle = input.previousElementSibling;
                    const isActive = setting.setting_value === 'true';
                    toggle.classList.toggle('active', isActive);
                    toggle.nextElementSibling.textContent = isActive ? 'Enabled' : 'Disabled';
                } else if (setting.setting_type === 'json' && setting.setting_key.includes('domain_whitelist')) {
                    this.updateDomainList(setting.setting_key, JSON.parse(setting.setting_value));
                }
            }
        }
        
        this.checkForChanges();
    }
    
    async exportSettings() {
        try {
            const response = await fetch('/api/admin/settings/export', {
                headers: { 'Authorization': `Bearer ${window.authManager.getToken()}` },
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to export settings');
            
            const settings = await response.json();
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `capstone-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showSuccessToast('Export Complete', 'Settings have been exported');
            
        } catch (error) {
            console.error('Error exporting settings:', error);
            this.showErrorToast('Error', 'Failed to export settings');
        }
    }
    
    async importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const settings = JSON.parse(text);
                
                if (!confirm('This will overwrite all current settings. Continue?')) return;
                
                const response = await fetch('/api/admin/settings/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.authManager.getToken()}`
                    },
                    credentials: 'include',
                    body: JSON.stringify(settings)
                });
                
                if (!response.ok) throw new Error('Failed to import settings');
                
                this.showSuccessToast('Import Complete', 'Settings have been imported. Page will reload.');
                setTimeout(() => location.reload(), 1500);
                
            } catch (error) {
                console.error('Error importing settings:', error);
                this.showErrorToast('Error', 'Failed to import settings. Please check the file format.');
            }
        };
        
        input.click();
    }

    // Reset all settings to factory defaults
    async resetAllSettings() {
        try {
            // Show a serious confirmation dialog
            const confirmed = confirm(
                '⚠️ WARNING: This will reset ALL settings to factory defaults!\n\n' +
                'This action will:\n' +
                '• Reset all branding settings\n' +
                '• Reset authentication configuration\n' +
                '• Reset feature toggles\n' +
                '• Reset business rules\n' +
                '• Reset privacy settings\n\n' +
                'This cannot be undone without a backup.\n\n' +
                'Are you absolutely sure you want to continue?'
            );

            if (!confirmed) {
                return;
            }

            // Second confirmation with type requirement
            const confirmText = prompt(
                'To confirm, please type: RESET_ALL_SETTINGS\n\n' +
                'This is your final warning - this action cannot be undone!'
            );

            if (confirmText !== 'RESET_ALL_SETTINGS') {
                this.showInfoToast('Reset Cancelled', 'Confirmation text did not match');
                return;
            }

            // Show loading state
            this.showInfoToast('Resetting Settings', 'Resetting all settings to defaults...');

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.authManager.getToken()}`
            };

            const response = await fetch('/api/admin/settings/reset', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    confirm: 'RESET_ALL_SETTINGS'
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccessToast(
                    'Settings Reset Complete',
                    `${result.details.successful} settings restored to defaults. Page will reload.`
                );
                
                // Log the action
                console.log('Settings reset result:', result);
                
                // Reload the page to show updated settings
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } else {
                throw new Error(result.error || 'Failed to reset settings');
            }

        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showErrorToast('Reset Failed', 'Failed to reset settings to defaults');
        }
    }
    
    async loadBrandingSettings() {
        try {
            // Load public branding settings
            const response = await fetch('/api/settings/branding');
            if (!response.ok) return; // Fail silently if settings not available
            
            const settings = await response.json();
            
            // Apply site title
            if (settings.site_title) {
                document.title = settings.site_title;
                const logoElement = document.querySelector('.logo-text');
                if (logoElement) {
                    logoElement.textContent = settings.site_title;
                }
            }
            
            // Apply site tagline
            if (settings.site_tagline) {
                const subtitleElement = document.querySelector('.hero-subtitle');
                if (subtitleElement) {
                    subtitleElement.textContent = settings.site_tagline;
                }
            }
            
            // Apply footer text
            if (settings.footer_text) {
                const footerElement = document.querySelector('.footer-content p:first-child');
                if (footerElement) {
                    footerElement.textContent = settings.footer_text;
                }
            }
            
            // Apply colors if provided
            if (settings.primary_color) {
                document.documentElement.style.setProperty('--primary-color', settings.primary_color);
            }
            if (settings.secondary_color) {
                document.documentElement.style.setProperty('--secondary-color', settings.secondary_color);
            }
            
        } catch (error) {
            // Fail silently - branding is not critical
            console.debug('Could not load branding settings:', error);
        }
    }
    
    async loadBusinessRules() {
        try {
            // Load business rules for filters
            const response = await fetch('/api/settings/business-rules');
            if (!response.ok) return;
            
            const rules = await response.json();
            
            // Update semester filter
            if (rules.academic_terms) {
                const semesterFilter = document.getElementById('semesterFilter');
                if (semesterFilter) {
                    // Keep the "All Semesters" option
                    const allOption = semesterFilter.querySelector('option[value=""]');
                    semesterFilter.innerHTML = '';
                    if (allOption) semesterFilter.appendChild(allOption);
                    
                    // Add configured semester options
                    rules.academic_terms.forEach(term => {
                        const option = document.createElement('option');
                        // Convert display name to value (e.g., "Semester 1" -> "semester1")
                        const value = term.toLowerCase().replace(/\s+/g, '');
                        option.value = value;
                        option.textContent = term;
                        semesterFilter.appendChild(option);
                    });
                }
            }
            
            // Update project type filter
            if (rules.project_types) {
                const projectTypeFilter = document.getElementById('projectTypeFilter');
                if (projectTypeFilter) {
                    // Keep the "All Project Types" option
                    const allOption = projectTypeFilter.querySelector('option[value=""]');
                    projectTypeFilter.innerHTML = '';
                    if (allOption) projectTypeFilter.appendChild(allOption);
                    
                    // Add configured project types
                    rules.project_types.forEach(type => {
                        const option = document.createElement('option');
                        option.value = type;
                        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                        projectTypeFilter.appendChild(option);
                    });
                }
            }
            
            // Store rules for later use (e.g., in forms)
            this.businessRules = rules;
            
        } catch (error) {
            console.debug('Could not load business rules:', error);
        }
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

    async checkAuthStatus() {
        console.log('checkAuthStatus called, authManager:', window.authManager);
        
        // Wait for authManager to be ready
        let retries = 0;
        while (!window.authManager && retries < 50) {
            console.log('AuthManager not ready, waiting...');
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.authManager) {
            console.error('AuthManager failed to initialize');
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
        const clientDashboardLink = document.getElementById('clientDashboardLink');
        const adminDashboardLink = document.getElementById('adminDashboardLink');

        if (userStatus && authNavLink && userInfo && this.currentUser) {
            // Hide login link
            authNavLink.style.display = 'none';
            
            // Show user status
            userStatus.style.display = 'flex';
            
            // Update user info
            const user = this.currentUser;
            const displayName = user.fullName || user.organizationName || user.email;
            userInfo.textContent = `${displayName} (${user.type})`;
            
            // Hide all dashboard links first
            if (studentDashboardLink) studentDashboardLink.style.display = 'none';
            if (clientDashboardLink) clientDashboardLink.style.display = 'none';
            if (adminDashboardLink) adminDashboardLink.style.display = 'none';
            
            // Show the appropriate dashboard link based on user type
            if (user.type === 'student' && studentDashboardLink) {
                studentDashboardLink.style.display = 'block';
            } else if (user.type === 'client' && clientDashboardLink) {
                clientDashboardLink.style.display = 'block';
            } else if (user.type === 'admin' && adminDashboardLink) {
                adminDashboardLink.style.display = 'block';
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
        const clientDashboardLink = document.getElementById('clientDashboardLink');
        const adminDashboardLink = document.getElementById('adminDashboardLink');

        if (userStatus && authNavLink) {
            // Show login link
            authNavLink.style.display = 'block';
            
            // Hide user status
            userStatus.style.display = 'none';
            
            // Hide all dashboard links
            if (studentDashboardLink) studentDashboardLink.style.display = 'none';
            if (clientDashboardLink) clientDashboardLink.style.display = 'none';
            if (adminDashboardLink) adminDashboardLink.style.display = 'none';
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

    // Gallery Management Methods (stubs for now)
    bulkApproveGalleryItems() {
        this.showToast('success', 'Gallery bulk approve feature coming soon!');
    }

    bulkRejectGalleryItems() {
        this.showToast('info', 'Gallery bulk reject feature coming soon!');
    }

    bulkDeleteGalleryItems() {
        this.showToast('warning', 'Gallery bulk delete feature coming soon!');
    }

    clearGallerySelection() {
        this.showToast('info', 'Gallery selection cleared');
    }

    async showAddToGalleryModal() {
        try {
            // First, fetch completed projects and existing gallery items
            const [projectsResponse, galleryResponse] = await Promise.all([
                fetch('/api/admin/projects/all?status=completed', {
                    headers: { 'Authorization': `Bearer ${window.authManager.getToken()}` },
                    credentials: 'include'
                }),
                fetch('/api/gallery/admin/all', {
                    headers: { 'Authorization': `Bearer ${window.authManager.getToken()}` },
                    credentials: 'include'
                })
            ]);
            
            if (!projectsResponse.ok) throw new Error('Failed to fetch completed projects');
            if (!galleryResponse.ok) throw new Error('Failed to fetch gallery items');
            
            const projectsData = await projectsResponse.json();
            const galleryData = await galleryResponse.json();
            
            const completedProjects = projectsData.projects || [];
            const galleryItems = galleryData.items || [];
            
            // Filter out projects that are already in the gallery (match by title and year)
            const currentYear = new Date().getFullYear();
            const availableProjects = completedProjects.filter(project => {
                return !galleryItems.some(galleryItem => 
                    galleryItem.title === project.title && 
                    galleryItem.year === currentYear
                );
            });
            
            if (availableProjects.length === 0) {
                this.showWarningToast('No Projects Available', 'No completed projects are available to add to the gallery.');
                return;
            }
            
            // Show modal with project selection
            this.showAddToGalleryForm(availableProjects);
        } catch (error) {
            console.error('Error loading completed projects:', error);
            this.showErrorToast('Error', 'Failed to load completed projects');
        }
    }

    async editGalleryItem(itemId) {
        try {
            // Get the item from the current gallery items in memory
            const galleryItems = this.galleryManagementItems || [];
            const item = galleryItems.find(g => g.id === itemId);
            
            if (!item) {
                // If not found in memory, fetch from API
                const response = await fetch(`/api/gallery/${itemId}`, {
                    headers: { 'Authorization': `Bearer ${window.authManager.getToken()}` },
                    credentials: 'include'
                });
                
                if (!response.ok) throw new Error('Failed to fetch gallery item');
                
                const data = await response.json();
                this.showEditGalleryModal(data.galleryItem);
            } else {
                this.showEditGalleryModal(item);
            }
            
        } catch (error) {
            console.error('Error fetching gallery item:', error);
            this.showErrorToast('Error', 'Failed to load gallery item for editing');
        }
    }

    async deleteGalleryItem(itemId) {
        if (!confirm('Are you sure you want to delete this gallery item? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/gallery/admin/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${window.authManager.getToken()}` },
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to delete gallery item');
            
            this.showSuccessToast('Gallery Item Deleted', 'The gallery item has been permanently deleted.');
            
            // Refresh gallery management
            await this.loadGalleryManagement();
            
            // Also refresh public gallery if it's currently visible
            if (this.currentSection === 'gallery') {
                await this.loadGallery();
            }
            
        } catch (error) {
            console.error('Error deleting gallery item:', error);
            this.showErrorToast('Error', 'Failed to delete gallery item');
        }
    }

    async approveGalleryItem(itemId) {
        try {
            const response = await fetch(`/api/gallery/admin/${itemId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({ status: 'approved' })
            });
            
            if (!response.ok) throw new Error('Failed to approve gallery item');
            
            this.showSuccessToast('Gallery Item Approved', 'The gallery item is now published and visible to the public.');
            
            // Refresh gallery management
            await this.loadGalleryManagement();
            
            // Also refresh public gallery if it's currently visible
            if (this.currentSection === 'gallery') {
                await this.loadGallery();
            }
            
        } catch (error) {
            console.error('Error approving gallery item:', error);
            this.showErrorToast('Error', 'Failed to approve gallery item');
        }
    }

    async rejectGalleryItem(itemId) {
        const reason = prompt('Optional: Provide a reason for rejection:') || '';
        
        try {
            const response = await fetch(`/api/gallery/admin/${itemId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    status: 'rejected',
                    rejection_reason: reason
                })
            });
            
            if (!response.ok) throw new Error('Failed to reject gallery item');
            
            this.showWarningToast('Gallery Item Rejected', 'The gallery item has been rejected and will not be published.');
            
            // Refresh gallery management
            await this.loadGalleryManagement();
            
            // Also refresh public gallery if it's currently visible
            if (this.currentSection === 'gallery') {
                await this.loadGallery();
            }
            
        } catch (error) {
            console.error('Error rejecting gallery item:', error);
            this.showErrorToast('Error', 'Failed to reject gallery item');
        }
    }

    async unapproveGalleryItem(itemId) {
        if (!confirm('Are you sure you want to unapprove this gallery item? It will be removed from the public gallery.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/gallery/admin/${itemId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({ status: 'pending' })
            });
            
            if (!response.ok) throw new Error('Failed to unapprove gallery item');
            
            this.showWarningToast('Gallery Item Unapproved', 'The gallery item has been moved back to pending status.');
            
            // Refresh gallery management
            await this.loadGalleryManagement();
            
            // Also refresh public gallery if it's currently visible
            if (this.currentSection === 'gallery') {
                await this.loadGallery();
            }
            
        } catch (error) {
            console.error('Error unapproving gallery item:', error);
            this.showErrorToast('Error', 'Failed to unapprove gallery item');
        }
    }

    showEditGalleryModal(item) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>Edit Gallery Item</h2>
            <form id="editGalleryForm" class="gallery-form">
                <div class="form-group">
                    <label for="editTitle">Title *</label>
                    <input type="text" id="editTitle" value="${this.escapeHtml(item.title)}" required>
                </div>
                <div class="form-group">
                    <label for="editDescription">Description *</label>
                    <textarea id="editDescription" rows="4" required>${this.escapeHtml(item.description)}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editYear">Year *</label>
                        <input type="number" id="editYear" value="${item.year}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCategory">Category</label>
                        <input type="text" id="editCategory" value="${this.escapeHtml(item.category || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="editClientName">Client/Organization</label>
                    <input type="text" id="editClientName" value="${this.escapeHtml(item.client_name || '')}">
                </div>
                <div class="form-group">
                    <label for="editTeamMembers">Team Members</label>
                    <textarea id="editTeamMembers" rows="2">${this.escapeHtml(item.team_members || '')}</textarea>
                </div>
                <div class="form-group">
                    <label for="editOutcomes">Outcomes/Impact</label>
                    <textarea id="editOutcomes" rows="3">${this.escapeHtml(item.outcomes || '')}</textarea>
                </div>
                <div class="form-group">
                    <label for="editImageUrl">Image URL</label>
                    <input type="url" id="editImageUrl" value="${this.escapeHtml(item.image_urls && item.image_urls[0] || '')}">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </form>
        `;
        
        const form = document.getElementById('editGalleryForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateGalleryItem(item.id);
        });
        
        modal.style.display = 'block';
    }

    async updateGalleryItem(itemId) {
        try {
            const updateData = {
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDescription').value,
                year: parseInt(document.getElementById('editYear').value),
                category: document.getElementById('editCategory').value,
                clientName: document.getElementById('editClientName').value,
                teamMembers: document.getElementById('editTeamMembers').value,
                outcomes: document.getElementById('editOutcomes').value,
                imageUrls: document.getElementById('editImageUrl').value ? [document.getElementById('editImageUrl').value] : []
            };
            
            const response = await fetch(`/api/gallery/admin/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) throw new Error('Failed to update gallery item');
            
            this.showSuccessToast('Gallery Item Updated', 'The gallery item has been successfully updated.');
            this.closeModal();
            
            // Refresh gallery management
            await this.loadGalleryManagement();
            
            // Also refresh public gallery if it's currently visible
            if (this.currentSection === 'gallery') {
                await this.loadGallery();
            }
            
        } catch (error) {
            console.error('Error updating gallery item:', error);
            this.showErrorToast('Error', 'Failed to update gallery item');
        }
    }
    
    showAddToGalleryForm(projects) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>Add Project to Gallery</h2>
            <form id="addToGalleryForm" class="gallery-form">
                <div class="form-group">
                    <label for="projectSelect">Select Completed Project *</label>
                    <select id="projectSelect" required>
                        <option value="">Choose a project...</option>
                        ${projects.map(project => `
                            <option value="${project.id}">
                                ${this.escapeHtml(project.title)} - ${this.escapeHtml(project.organization_name)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div id="projectDetails" style="display: none;">
                    <div class="form-group">
                        <label for="galleryDescription">Gallery Description *</label>
                        <textarea id="galleryDescription" rows="4" required 
                                  placeholder="Brief description highlighting the project's success and impact..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="teamMembers">Team Members *</label>
                        <input type="text" id="teamMembers" required 
                               placeholder="e.g., John Doe, Jane Smith, Bob Johnson">
                    </div>
                    
                    <div class="form-group">
                        <label for="outcomes">Project Outcomes *</label>
                        <textarea id="outcomes" rows="3" required 
                                  placeholder="Key achievements, metrics, and impact..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="projectYear">Year *</label>
                            <input type="number" id="projectYear" required 
                                   min="2020" max="${new Date().getFullYear()}" 
                                   value="${new Date().getFullYear()}">
                        </div>
                        <div class="form-group">
                            <label for="category">Category *</label>
                            <select id="category" required>
                                <option value="">Select category...</option>
                                <option value="Software Development">Software Development</option>
                                <option value="Mobile Development">Mobile Development</option>
                                <option value="IoT & Machine Learning">IoT & Machine Learning</option>
                                <option value="Blockchain">Blockchain</option>
                                <option value="Virtual Reality">Virtual Reality</option>
                                <option value="Data Analytics">Data Analytics</option>
                                <option value="Web Development">Web Development</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="imageUrl">Image URL (optional)</label>
                        <input type="url" id="imageUrl" 
                               placeholder="https://example.com/project-image.jpg">
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submitGalleryBtn" style="display: none;">
                        Add to Gallery
                    </button>
                </div>
            </form>
        `;
        
        // Show project details when a project is selected
        const projectSelect = document.getElementById('projectSelect');
        const projectDetails = document.getElementById('projectDetails');
        const submitBtn = document.getElementById('submitGalleryBtn');
        
        projectSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                const selectedProject = projects.find(p => p.id === parseInt(e.target.value));
                if (selectedProject) {
                    // Pre-fill description if available
                    document.getElementById('galleryDescription').value = selectedProject.description || '';
                    projectDetails.style.display = 'block';
                    submitBtn.style.display = 'inline-block';
                }
            } else {
                projectDetails.style.display = 'none';
                submitBtn.style.display = 'none';
            }
        });
        
        // Handle form submission
        const form = document.getElementById('addToGalleryForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitGalleryItem(projects);
        });
        
        modal.style.display = 'block';
    }
    
    async submitGalleryItem(projects) {
        const projectId = document.getElementById('projectSelect').value;
        const selectedProject = projects.find(p => p.id === parseInt(projectId));
        
        const galleryData = {
            galleryTitle: selectedProject.title,
            galleryDescription: document.getElementById('galleryDescription').value,
            category: document.getElementById('category').value,
            teamMembers: document.getElementById('teamMembers').value,
            outcomes: document.getElementById('outcomes').value,
            imageUrls: document.getElementById('imageUrl').value ? [document.getElementById('imageUrl').value] : []
        };
        
        try {
            const response = await fetch('/api/gallery/admin/from-project/' + projectId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(galleryData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add to gallery');
            }
            
            this.showSuccessToast('Success', 'Project added to gallery successfully!');
            this.closeModal();
            
            // Reload gallery if we're on that tab
            if (document.querySelector('.admin-tab[data-tab="gallery"].active')) {
                this.loadGalleryManagement();
            }
        } catch (error) {
            console.error('Error adding to gallery:', error);
            this.showErrorToast('Error', error.message || 'Failed to add project to gallery');
        }
    }

    async loadGalleryManagement() {
        try {
            // For now, just clear the loading messages
            const statsContainer = document.getElementById('galleryStats');
            const itemsContainer = document.getElementById('galleryItemsList');
            
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-card">
                        <h3>0</h3>
                        <p>Total Gallery Items</p>
                    </div>
                    <div class="stat-card">
                        <h3>0</h3>
                        <p>Pending Review</p>
                    </div>
                    <div class="stat-card">
                        <h3>0</h3>
                        <p>Published</p>
                    </div>
                `;
            }
            
            if (itemsContainer) {
                // Fetch all gallery items from admin endpoint (includes pending, approved, rejected)
                const response = await fetch('/api/gallery/admin/all', {
                    headers: { 'Authorization': `Bearer ${window.authManager.getToken()}` },
                    credentials: 'include'
                });
                const data = await response.json();
                console.log('Gallery admin response:', data);
                const galleryItems = data.gallery || [];
                
                // Store in memory for edit functionality
                this.galleryManagementItems = galleryItems;
                
                // Update stats with actual counts from API
                if (statsContainer && data.stats) {
                    statsContainer.innerHTML = `
                        <div class="stat-card">
                            <h3>${data.stats.total || 0}</h3>
                            <p>Total Gallery Items</p>
                        </div>
                        <div class="stat-card">
                            <h3>${data.stats.pending || 0}</h3>
                            <p>Pending Review</p>
                        </div>
                        <div class="stat-card">
                            <h3>${data.stats.approved || 0}</h3>
                            <p>Published</p>
                        </div>
                    `;
                }
                
                if (galleryItems.length > 0) {
                    itemsContainer.innerHTML = galleryItems.map(item => `
                        <div class="gallery-card admin-gallery-card">
                            <div class="gallery-image">
                                ${item.image_urls && item.image_urls.length > 0 ? `<img src="${item.image_urls[0]}" alt="${this.escapeHtml(item.title)}">` : '📷 No Image'}
                            </div>
                            <div class="gallery-content">
                                <h3 class="gallery-title">${this.escapeHtml(item.title)}</h3>
                                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                    <span class="gallery-year">${item.year}</span>
                                    <span class="status-indicator status-${item.status}">${item.status}</span>
                                    <span style="color: #666;">• ${item.category}</span>
                                </div>
                                <p style="margin-bottom: 10px;">${this.escapeHtml(item.description || 'No description available')}</p>
                                <p style="font-size: 0.9em; color: #666;">
                                    <strong>Client:</strong> ${this.escapeHtml(item.client_name)}<br>
                                    <strong>Team:</strong> ${this.escapeHtml(item.team_members)}
                                </p>
                                <div class="admin-actions" style="margin-top: 15px;">
                                    ${item.status === 'pending' ? `
                                        <button class="btn btn-success btn-sm" onclick="approveGalleryItem(${item.id})">Approve</button>
                                        <button class="btn btn-warning btn-sm" onclick="rejectGalleryItem(${item.id})">Reject</button>
                                    ` : item.status === 'approved' ? `
                                        <button class="btn btn-warning btn-sm" onclick="unapproveGalleryItem(${item.id})">Unapprove</button>
                                    ` : item.status === 'rejected' ? `
                                        <button class="btn btn-success btn-sm" onclick="approveGalleryItem(${item.id})">Approve</button>
                                    ` : ''}
                                    <button class="btn btn-outline btn-sm" onclick="editGalleryItem(${item.id})">Edit</button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteGalleryItem(${item.id})">Delete</button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    itemsContainer.innerHTML = '<div class="admin-empty"><h4>No gallery items found</h4><p>Gallery items will appear here once projects are completed and added to the gallery.</p></div>';
                }
            }
        } catch (error) {
            console.error('Error loading gallery management:', error);
            const itemsContainer = document.getElementById('galleryItemsList');
            if (itemsContainer) {
                itemsContainer.innerHTML = '<div class="error">Failed to load gallery items</div>';
            }
        }
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

function editGalleryItem(id) {
    app.showToast('info', 'Edit gallery item feature coming soon!');
}

function deleteGalleryItem(id) {
    if (confirm('Are you sure you want to delete this gallery item?')) {
        app.showToast('warning', 'Delete gallery item feature coming soon!');
    }
}

// Initialize the application
const app = new CapstoneApp();

// Make app globally available
window.capstoneApp = app;
window.app = app; // Also make it available as window.app for compatibility

// Expose necessary functions globally for inline onclick handlers
window.showSection = (section) => app.showSection(section);
window.showClientRegistration = () => app.showClientRegistration();
window.showStudentRegistration = () => app.showStudentRegistration();
window.showAdminLogin = () => app.showAdminLogin();
window.showCreateProject = () => app.showCreateProjectModal();
window.closeModal = () => app.closeModal();
window.showProjectDetail = (projectId) => app.showProjectDetail(projectId);
window.toggleFavorite = (projectId, event) => app.toggleFavorite(projectId, event);
window.expressInterest = (projectId, event) => app.expressInterest(projectId, event);
// Legacy function removed - unified login no longer uses tabs
window.approveProject = (projectId) => app.approveProject(projectId);
window.rejectProject = (projectId) => app.rejectProject(projectId);
window.completeProject = (projectId) => app.completeProject(projectId);
window.archiveProject = (projectId) => app.archiveProject(projectId);
window.deactivateProject = (projectId) => app.deactivateProject(projectId);
window.editGalleryItem = (itemId) => app.editGalleryItem(itemId);
window.deleteGalleryItem = (itemId) => app.deleteGalleryItem(itemId);
window.approveGalleryItem = (itemId) => app.approveGalleryItem(itemId);
window.rejectGalleryItem = (itemId) => app.rejectGalleryItem(itemId);
window.unapproveGalleryItem = (itemId) => app.unapproveGalleryItem(itemId);
window.showAdminTab = (tab) => app.showAdminTab(tab);

// Admin bulk operations
window.bulkApproveProjects = () => app.bulkApproveProjects();
window.bulkRejectProjects = () => app.bulkRejectProjects();
window.clearPendingSelection = () => app.clearPendingSelection();
window.bulkArchiveUsers = () => app.bulkArchiveUsers();
window.bulkRestoreUsers = () => app.bulkRestoreUsers();
window.bulkDeleteUsers = () => app.bulkDeleteUsers();
window.clearUserSelection = () => app.clearUserSelection();
window.bulkApproveGalleryItems = () => app.bulkApproveGalleryItems();
window.bulkRejectGalleryItems = () => app.bulkRejectGalleryItems();
window.bulkDeleteGalleryItems = () => app.bulkDeleteGalleryItems();
window.clearGallerySelection = () => app.clearGallerySelection();
window.showAddToGalleryModal = () => app.showAddToGalleryModal();

// Settings functions
window.resetAllSettings = () => app.resetAllSettings();

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