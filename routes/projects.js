const express = require('express');
const router = express.Router();

const database = require('../database/db');
const { authenticate, authorize, optionalAuth, auditAuth } = require('../middleware/auth');
const { validationRules } = require('../middleware/validation');

// Get all approved projects (public endpoint)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { semester, limit = 50, offset = 0 } = req.query;
        
        let projects = await database.getApprovedProjects();
        
        // Filter by semester if specified
        if (semester && semester !== 'all') {
            projects = projects.filter(project => 
                project.semester_availability === semester || 
                project.semester_availability === 'both'
            );
        }
        
        // Add favorite and interest status for authenticated students
        if (req.user && req.user.type === 'student') {
            for (let project of projects) {
                // Check if student has favorited this project
                project.isFavorite = await database.isFavorite(req.user.id, project.id);
                
                // Check if student has expressed interest
                const interests = await database.query(
                    'SELECT id FROM student_interests WHERE student_id = ? AND project_id = ? AND is_active = 1',
                    [req.user.id, project.id]
                );
                project.hasExpressedInterest = interests.length > 0;
            }
        }
        
        // Apply pagination
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedProjects = projects.slice(startIndex, endIndex);
        
        // Log analytics if user is authenticated
        if (req.user) {
            await database.logAnalytics(
                'project_browse',
                req.user.type,
                req.user.id,
                null,
                null,
                semester ? 'semester' : null,
                semester || null
            );
        }
        
        res.json({
            projects: paginatedProjects,
            pagination: {
                total: projects.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: endIndex < projects.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECTS_FETCH_ERROR'
        });
    }
});

// Get single project by ID
router.get('/:id', validationRules.validateId, optionalAuth, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const project = await database.getProjectById(projectId);
        
        if (!project) {
            return res.status(404).json({ 
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        // Check if user can view this project
        const canView = project.status === 'approved' || 
                       project.status === 'active' || 
                       (req.user && (
                           req.user.type === 'admin' ||
                           (req.user.type === 'client' && project.client_id === req.user.id)
                       ));
        
        if (!canView) {
            return res.status(403).json({ 
                error: 'Access denied to this project',
                code: 'PROJECT_ACCESS_DENIED'
            });
        }
        
        // Get additional data for authenticated users
        let additionalData = {};
        if (req.user) {
            if (req.user.type === 'student') {
                // Check if student has expressed interest or favorited
                const interests = await database.getStudentInterests(req.user.id);
                const favorites = await database.getStudentFavorites(req.user.id);
                
                additionalData.hasExpressedInterest = interests.some(i => i.project_id === projectId);
                additionalData.isFavorite = favorites.some(f => f.project_id === projectId);
            } else if (req.user.type === 'client' && project.client_id === req.user.id) {
                // Get interested students for project owner
                const interests = await database.getProjectInterests(projectId);
                additionalData.interestedStudents = interests;
            }
            
            // Log analytics
            await database.logAnalytics(
                'project_view',
                req.user.type,
                req.user.id,
                projectId,
                null,
                null,
                null
            );
        }
        
        res.json({
            project: {
                ...project,
                ...additionalData
            }
        });
        
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_FETCH_ERROR'
        });
    }
});

// Create new project (clients only)
router.post('/', authenticate, authorize('client'), validationRules.createProject, async (req, res) => {
    try {
        const {
            title,
            description,
            requiredSkills,
            toolsTechnologies,
            deliverables,
            semesterAvailability = 'both'
        } = req.body;
        
        const result = await database.createProject(
            req.user.id,
            title,
            description,
            requiredSkills,
            toolsTechnologies,
            deliverables,
            semesterAvailability
        );
        
        // Get the created project
        const project = await database.getProjectById(result.id);
        
        // Log audit trail
        await auditAuth('project_created', req, req.user, true);
        
        // Log analytics
        await database.logAnalytics(
            'project_create',
            req.user.type,
            req.user.id,
            result.id,
            null,
            null,
            null
        );
        
        res.status(201).json({
            message: 'Project created successfully',
            project: {
                ...project,
                status: 'pending' // Will be pending until admin approval
            }
        });
        
    } catch (error) {
        console.error('Error creating project:', error);
        await auditAuth('project_create_failed', req, req.user, false, error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_CREATE_ERROR'
        });
    }
});

// Update project (clients can update their own pending projects)
router.put('/:id', authenticate, validationRules.updateProject, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const {
            title,
            description,
            requiredSkills,
            toolsTechnologies,
            deliverables,
            semesterAvailability
        } = req.body;
        
        // Get existing project
        const existingProject = await database.getProjectById(projectId);
        if (!existingProject) {
            return res.status(404).json({ 
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        // Check permissions
        const canUpdate = req.user.type === 'admin' || 
                         (req.user.type === 'client' && 
                          existingProject.client_id === req.user.id && 
                          existingProject.status === 'pending');
        
        if (!canUpdate) {
            return res.status(403).json({ 
                error: 'Cannot update this project. Only pending projects can be updated by their owners.',
                code: 'PROJECT_UPDATE_DENIED'
            });
        }
        
        // Update project
        await database.updateProject(
            projectId,
            title,
            description,
            requiredSkills,
            toolsTechnologies,
            deliverables,
            semesterAvailability
        );
        
        // Get updated project
        const updatedProject = await database.getProjectById(projectId);
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'project_updated',
            'project',
            projectId,
            JSON.stringify(existingProject),
            JSON.stringify(updatedProject),
            req.ip
        );
        
        // Log analytics
        await database.logAnalytics(
            'project_update',
            req.user.type,
            req.user.id,
            projectId,
            null,
            null,
            null
        );
        
        res.json({
            message: 'Project updated successfully',
            project: updatedProject
        });
        
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_UPDATE_ERROR'
        });
    }
});

// Update project status (admin only)
router.patch('/:id/status', authenticate, authorize('admin'), validationRules.approveProject, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const { status, feedback } = req.body;
        
        // Get existing project
        const existingProject = await database.getProjectById(projectId);
        if (!existingProject) {
            return res.status(404).json({ 
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        // Update project status
        await database.updateProjectStatus(projectId, status, req.user.id);
        
        // Get updated project
        const updatedProject = await database.getProjectById(projectId);
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            `project_${status}`,
            'project',
            projectId,
            existingProject.status,
            status,
            req.ip
        );
        
        // Log analytics
        await database.logAnalytics(
            `project_${status}`,
            req.user.type,
            req.user.id,
            projectId,
            null,
            null,
            null
        );
        
        res.json({
            message: `Project ${status} successfully`,
            project: updatedProject,
            feedback
        });
        
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_STATUS_ERROR'
        });
    }
});

// Complete project with data snapshot (admin only)
router.patch('/:id/complete', authenticate, authorize('admin'), validationRules.validateId, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const { completionNotes, preserveClientData = true } = req.body;
        
        // Get existing project with client data
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({ 
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        // Can only complete approved or active projects
        if (!['approved', 'active'].includes(project.status)) {
            return res.status(400).json({ 
                error: 'Can only complete approved or active projects',
                code: 'PROJECT_COMPLETION_INVALID_STATUS'
            });
        }
        
        let clientSnapshot = null;
        let organizationSnapshot = null;
        
        if (preserveClientData) {
            // Get current client data for snapshot
            const client = await database.getClientById(project.client_id);
            if (client) {
                clientSnapshot = client.contact_name;
                organizationSnapshot = client.organization_name;
            }
        }
        
        // Complete the project with snapshots
        await database.completeProject(
            projectId, 
            req.user.id, 
            clientSnapshot, 
            organizationSnapshot
        );
        
        // Add completion notes if provided
        if (completionNotes) {
            await database.logAudit(
                req.user.type,
                req.user.id,
                'project_completion_notes',
                'project',
                projectId,
                null,
                completionNotes,
                req.ip
            );
        }
        
        // Get updated project
        const updatedProject = await database.getProjectById(projectId);
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'project_completed',
            'project',
            projectId,
            project.status,
            'completed',
            req.ip
        );
        
        // Log analytics
        await database.logAnalytics(
            'project_completed',
            req.user.type,
            req.user.id,
            projectId,
            null,
            'completion_type',
            preserveClientData ? 'with_snapshot' : 'without_snapshot'
        );
        
        res.json({
            message: 'Project completed successfully',
            project: updatedProject,
            preservedData: preserveClientData ? {
                clientName: clientSnapshot,
                organizationName: organizationSnapshot
            } : null,
            completionNotes
        });
        
    } catch (error) {
        console.error('Error completing project:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_COMPLETION_ERROR'
        });
    }
});

// Create a new phase for an existing project (admin or client)
router.post('/:id/phases', authenticate, async (req, res) => {
    try {
        const parentProjectId = parseInt(req.params.id);
        const {
            title, description, required_skills, tools_technologies,
            deliverables, semester_availability, project_type,
            duration_weeks, max_students, prerequisites, additional_info
        } = req.body;
        
        // Get parent project to verify ownership/permissions
        const parentProject = await database.getProjectById(parentProjectId);
        if (!parentProject) {
            return res.status(404).json({ 
                error: 'Parent project not found',
                code: 'PARENT_PROJECT_NOT_FOUND'
            });
        }
        
        // Check permissions - admin can create phases for any project, clients only for their own
        if (req.user.type === 'client' && req.user.id !== parentProject.client_id) {
            return res.status(403).json({ 
                error: 'Access denied. You can only create phases for your own projects.',
                code: 'PHASE_ACCESS_DENIED'
            });
        }
        
        // Only allow phase creation for approved or completed projects
        if (!['approved', 'active', 'completed'].includes(parentProject.status)) {
            return res.status(400).json({ 
                error: 'Can only create phases for approved, active, or completed projects',
                code: 'PHASE_INVALID_PARENT_STATUS'
            });
        }
        
        // Get next phase number
        const phaseNumber = await database.getNextPhaseNumber(parentProjectId);
        
        // Create the new phase
        const result = await database.createProjectPhase(
            parentProject.client_id,
            parentProjectId,
            phaseNumber,
            title,
            description,
            required_skills,
            tools_technologies,
            deliverables,
            semester_availability,
            project_type,
            duration_weeks,
            max_students,
            prerequisites,
            additional_info
        );
        
        // Get the created phase
        const newPhase = await database.getProjectById(result.id);
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'project_phase_created',
            'project',
            result.id,
            null,
            JSON.stringify({ parentProjectId, phaseNumber }),
            req.ip
        );
        
        // Log analytics
        await database.logAnalytics(
            'project_phase_created',
            req.user.type,
            req.user.id,
            result.id,
            null,
            'parent_project_id',
            parentProjectId.toString()
        );
        
        res.status(201).json({
            message: `Phase ${phaseNumber} created successfully`,
            phase: newPhase,
            parentProject: {
                id: parentProject.id,
                title: parentProject.title
            }
        });
        
    } catch (error) {
        console.error('Error creating project phase:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_PHASE_CREATION_ERROR'
        });
    }
});

// Get all phases for a project
router.get('/:id/phases', optionalAuth, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        
        // Get project family (root project and all phases)
        const projectFamily = await database.getProjectFamily(projectId);
        
        if (!projectFamily) {
            return res.status(404).json({ 
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        // Log analytics
        if (req.user) {
            await database.logAnalytics(
                'project_phases_viewed',
                req.user.type,
                req.user.id,
                projectId,
                null,
                null,
                null
            );
        }
        
        res.json({
            rootProject: projectFamily.rootProject,
            phases: projectFamily.phases,
            currentPhase: projectFamily.currentPhase,
            totalPhases: projectFamily.phases.length
        });
        
    } catch (error) {
        console.error('Error fetching project phases:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_PHASES_FETCH_ERROR'
        });
    }
});

// Get project with phase information
router.get('/:id/with-phases', optionalAuth, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        
        // Get the main project
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({ 
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        // Get project family information
        const projectFamily = await database.getProjectFamily(projectId);
        
        // Get interest count for this specific project
        const interests = await database.getProjectInterests(projectId);
        
        // Check if user has expressed interest (if authenticated)
        let hasExpressedInterest = false;
        let isFavorite = false;
        
        if (req.user && req.user.type === 'student') {
            const userInterests = await database.getStudentInterests(req.user.id);
            hasExpressedInterest = userInterests.some(interest => interest.project_id === projectId);
            isFavorite = await database.isFavorite(req.user.id, projectId);
        }
        
        // Log analytics
        if (req.user) {
            await database.logAnalytics(
                'project_viewed_with_phases',
                req.user.type,
                req.user.id,
                projectId,
                null,
                null,
                null
            );
        }
        
        res.json({
            project: {
                ...project,
                interest_count: interests.length,
                hasExpressedInterest,
                isFavorite
            },
            projectFamily,
            interests: req.user && req.user.type === 'admin' ? interests : null
        });
        
    } catch (error) {
        console.error('Error fetching project with phases:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_WITH_PHASES_FETCH_ERROR'
        });
    }
});

// Toggle project active/inactive status (admin only)
router.patch('/:id/toggle', authenticate, authorize('admin'), validationRules.validateId, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        
        // Get existing project
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({ 
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        // Can only toggle approved projects
        if (project.status !== 'approved' && project.status !== 'active' && project.status !== 'inactive') {
            return res.status(400).json({ 
                error: 'Can only toggle status of approved projects',
                code: 'PROJECT_TOGGLE_INVALID'
            });
        }
        
        // Toggle status
        const newStatus = project.status === 'active' ? 'inactive' : 'active';
        await database.updateProjectStatus(projectId, newStatus, req.user.id);
        
        // Get updated project
        const updatedProject = await database.getProjectById(projectId);
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'project_toggled',
            'project',
            projectId,
            project.status,
            newStatus,
            req.ip
        );
        
        res.json({
            message: `Project ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
            project: updatedProject
        });
        
    } catch (error) {
        console.error('Error toggling project status:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_TOGGLE_ERROR'
        });
    }
});

// Get projects by client (clients can see their own, admins can see all)
router.get('/client/:clientId', authenticate, async (req, res) => {
    try {
        const clientId = parseInt(req.params.clientId);
        
        // Check permissions
        if (req.user.type !== 'admin' && req.user.id !== clientId) {
            return res.status(403).json({ 
                error: 'Access denied',
                code: 'CLIENT_PROJECTS_ACCESS_DENIED'
            });
        }
        
        const projects = await database.getProjectsByClient(clientId);
        
        // Log analytics
        await database.logAnalytics(
            'client_projects_view',
            req.user.type,
            req.user.id,
            null,
            null,
            'client_id',
            clientId.toString()
        );
        
        res.json({
            projects,
            clientId
        });
        
    } catch (error) {
        console.error('Error fetching client projects:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'CLIENT_PROJECTS_ERROR'
        });
    }
});

// Get pending projects (admin only)
router.get('/admin/pending', authenticate, authorize('admin'), async (req, res) => {
    try {
        const projects = await database.getPendingProjects();
        
        // Log analytics
        await database.logAnalytics(
            'pending_projects_view',
            req.user.type,
            req.user.id,
            null,
            null,
            null,
            null
        );
        
        res.json({
            projects,
            count: projects.length
        });
        
    } catch (error) {
        console.error('Error fetching pending projects:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PENDING_PROJECTS_ERROR'
        });
    }
});

// Get project statistics (admin only)
router.get('/admin/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        // Get project counts by status
        const allProjects = await database.query('SELECT status, COUNT(*) as count FROM projects GROUP BY status');
        const statusStats = {};
        allProjects.forEach(row => {
            statusStats[row.status] = row.count;
        });
        
        // Get semester distribution
        const semesterStats = await database.query(
            'SELECT semester_availability, COUNT(*) as count FROM projects WHERE status IN ("approved", "active") GROUP BY semester_availability'
        );
        
        // Get interest statistics
        const interestStats = await database.query(`
            SELECT 
                AVG(interest_count) as avgInterests,
                MAX(interest_count) as maxInterests,
                COUNT(CASE WHEN interest_count > 0 THEN 1 END) as projectsWithInterests
            FROM projects 
            WHERE status IN ('approved', 'active')
        `);
        
        // Get recent activity
        const recentProjects = await database.query(`
            SELECT COUNT(*) as count 
            FROM projects 
            WHERE created_at >= datetime('now', '-7 days')
        `);
        
        const stats = {
            statusDistribution: statusStats,
            semesterDistribution: semesterStats,
            interestStatistics: interestStats[0],
            recentActivity: {
                newProjectsThisWeek: recentProjects[0].count
            }
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error fetching project statistics:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_STATS_ERROR'
        });
    }
});

// Delete project (admin only, or client for pending projects)
router.delete('/:id', authenticate, validationRules.validateId, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        
        // Get existing project
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({ 
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        // Check permissions
        const canDelete = req.user.type === 'admin' || 
                         (req.user.type === 'client' && 
                          project.client_id === req.user.id && 
                          project.status === 'pending');
        
        if (!canDelete) {
            return res.status(403).json({ 
                error: 'Cannot delete this project. Only pending projects can be deleted by their owners.',
                code: 'PROJECT_DELETE_DENIED'
            });
        }
        
        // Delete related records first
        await database.run('DELETE FROM student_interests WHERE project_id = ?', [projectId]);
        await database.run('DELETE FROM student_favorites WHERE project_id = ?', [projectId]);
        
        // Delete project
        await database.run('DELETE FROM projects WHERE id = ?', [projectId]);
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'project_deleted',
            'project',
            projectId,
            JSON.stringify(project),
            null,
            req.ip
        );
        
        res.json({
            message: 'Project deleted successfully',
            deletedProject: {
                id: projectId,
                title: project.title
            }
        });
        
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'PROJECT_DELETE_ERROR'
        });
    }
});

module.exports = router;