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
                                <button class="btn-quick-action" onclick="event.stopPropagation(); window.capstoneApp.toggleFavorite(${project.id})" title="Add to favorites">
                                    ⭐
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
                                    onclick="app.${hasExpressed ? 'withdrawInterest' : 'expressInterest'}(${project.id})"
                                    ${hasExpressed ? 'disabled' : ''}>
                                ${hasExpressed ? 'Interest Expressed' : 'Express Interest'}
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
                <h2>${this.escapeHtml(project.title)}</h2>
                <div class="project-client" style="margin-bottom: 1rem; color: var(--primary-color); font-weight: bold;">
                    ${this.escapeHtml(project.organization_name)}
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong>Status:</strong> <span class="project-status status-${project.status}">${this.formatStatus(project.status)}</span>
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong>Semester:</strong> ${this.formatSemester(project.semester_availability)}
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong>Interest Level:</strong> ${project.interest_count} students interested
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong>Required Skills:</strong> ${this.escapeHtml(project.required_skills)}
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong>Tools & Technologies:</strong> ${this.escapeHtml(project.tools_technologies)}
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong>Deliverables:</strong> ${this.escapeHtml(project.deliverables)}
                </div>
                <div style="margin-bottom: 2rem;">
                    <strong>Description:</strong>
                    <p style="margin-top: 0.5rem; line-height: 1.6;">${this.escapeHtml(project.description)}</p>
                </div>
                ${actionButtons}
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
                console.log('Interest expressed successfully!');
                this.closeModal();
                // Refresh project data
                await this.loadProjects();
            } else {
                console.log(data.error || 'Failed to express interest');
            }

        } catch (error) {
            console.error('Error expressing interest:', error);
            console.log('Network error. Please try again.');
        }
    }

    async withdrawInterest(projectId) {
        if (!this.currentUser || this.currentUser.type !== 'student') {
            return;
        }

        try {
            const response = await fetch(`/api/students/interests/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Interest withdrawn successfully!');
                this.closeModal();
                // Refresh project data
                await this.loadProjects();
            } else {
                console.log(data.error || 'Failed to withdraw interest');
            }

        } catch (error) {
            console.error('Error withdrawing interest:', error);
            console.log('Network error. Please try again.');
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
                console.log('Project added to favorites!');
                // Refresh project details
                await this.showProjectDetails(projectId);
            } else {
                console.log(data.error || 'Failed to add to favorites');
            }

        } catch (error) {
            console.error('Error adding to favorites:', error);
            console.log('Network error. Please try again.');
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
                console.log('Project removed from favorites!');
                // Refresh project details
                await this.showProjectDetails(projectId);
            } else {
                console.log(data.error || 'Failed to remove from favorites');
            }

        } catch (error) {
            console.error('Error removing from favorites:', error);
            console.log('Network error. Please try again.');
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
            // First check if it's already a favorite
            const project = this.projects.find(p => p.id === projectId);
            if (!project) return;

            // For now, just add to favorites (we'd need to track favorite status in project data)
            await this.addToFavorites(projectId);
            
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
            console.log('Admin access required');
            return;
        }

        this.showSection('admin');
        await this.loadPendingProjects();
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
            this.renderPendingProjects(data.projects || []);
            
        } catch (error) {
            console.error('Error loading pending projects:', error);
            this.showError('pendingProjectsList', 'Failed to load pending projects.');
        }
    }

    renderPendingProjects(projects) {
        const container = document.getElementById('pendingProjectsList');
        
        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="loading">No pending projects</div>';
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-card admin-project-card">
                <h3 class="project-title">${this.escapeHtml(project.title)}</h3>
                <div class="project-client">${this.escapeHtml(project.organization_name)}</div>
                <p class="project-description">${this.escapeHtml(project.description.substring(0, 150))}...</p>
                <div class="project-meta">
                    <span class="project-semester">${this.formatSemester(project.semester_availability)}</span>
                    <span class="project-date">Submitted: ${new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                <div class="admin-actions">
                    <button class="btn btn-primary" onclick="app.approveProject(${project.id})">
                        Approve
                    </button>
                    <button class="btn btn-outline" onclick="app.showProjectDetails(${project.id})">
                        View Details
                    </button>
                    <button class="btn btn-secondary" onclick="app.rejectProject(${project.id})">
                        Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    async approveProject(projectId) {
        try {
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
                console.log('Project approved successfully!');
                await this.loadPendingProjects(); // Refresh the list
            } else {
                console.log(data.error || 'Failed to approve project');
            }

        } catch (error) {
            console.error('Error approving project:', error);
            console.log('Network error. Please try again.');
        }
    }

    async rejectProject(projectId) {
        const feedback = prompt('Optional: Provide feedback for rejection:') || '';
        
        try {
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
                console.log('Project rejected successfully!');
                await this.loadPendingProjects(); // Refresh the list
            } else {
                console.log(data.error || 'Failed to reject project');
            }

        } catch (error) {
            console.error('Error rejecting project:', error);
            console.log('Network error. Please try again.');
        }
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

        if (userStatus && authNavLink && userInfo && this.currentUser) {
            // Hide login link
            authNavLink.style.display = 'none';
            
            // Show user status
            userStatus.style.display = 'flex';
            
            // Update user info
            const user = this.currentUser;
            const displayName = user.fullName || user.organizationName || user.email;
            userInfo.textContent = `${displayName} (${user.type})`;
            
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
                    this.showSection('projects'); // Students go to projects page
                }
            }
        }
    }

    updateUIForUnauthenticatedUser() {
        const userStatus = document.getElementById('userStatus');
        const authNavLink = document.getElementById('authNavLink');

        if (userStatus && authNavLink) {
            // Show login link
            authNavLink.style.display = 'block';
            
            // Hide user status
            userStatus.style.display = 'none';
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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