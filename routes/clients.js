const express = require('express');
const router = express.Router();

const database = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { validationRules } = require('../middleware/validation');

// Middleware to ensure only clients can access these routes
const requireClient = (req, res, next) => {
    if (req.user.type !== 'client') {
        return res.status(403).json({
            error: 'Access denied. Client access required.',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
    }
    next();
};

// Get client dashboard data
router.get('/dashboard', authenticate, requireClient, async (req, res) => {
    try {
        const clientId = req.user.id;
        
        // Get client info
        const client = await database.getClientById(clientId);
        if (!client) {
            return res.status(404).json({
                error: 'Client not found',
                code: 'CLIENT_NOT_FOUND'
            });
        }
        
        // Get client's projects
        const projects = await database.getProjectsByClient(clientId);
        
        // Get interest statistics for each project
        const projectsWithStats = await Promise.all(
            projects.map(async (project) => {
                const interests = await database.getProjectInterests(project.id);
                return {
                    ...project,
                    interestCount: interests.length,
                    interests: interests
                };
            })
        );
        
        // Calculate summary statistics
        const stats = {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'approved' || p.status === 'active').length,
            pendingProjects: projects.filter(p => p.status === 'pending').length,
            totalInterests: projectsWithStats.reduce((sum, p) => sum + p.interestCount, 0)
        };
        
        res.json({
            success: true,
            data: {
                client: {
                    id: client.id,
                    organizationName: client.organization_name,
                    contactName: client.contact_name,
                    email: client.email,
                    industry: client.industry
                },
                projects: projectsWithStats,
                stats
            }
        });
        
    } catch (error) {
        console.error('Error fetching client dashboard:', error);
        res.status(500).json({
            error: 'Failed to load dashboard data',
            code: 'DASHBOARD_ERROR'
        });
    }
});

// Get client's projects
router.get('/projects', authenticate, requireClient, async (req, res) => {
    try {
        const clientId = req.user.id;
        const projects = await database.getProjectsByClient(clientId);
        
        res.json({
            success: true,
            data: { projects }
        });
        
    } catch (error) {
        console.error('Error fetching client projects:', error);
        res.status(500).json({
            error: 'Failed to load projects',
            code: 'PROJECTS_FETCH_ERROR'
        });
    }
});

// Get project details with interests
router.get('/projects/:id', authenticate, requireClient, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const clientId = req.user.id;
        
        // Get project and verify ownership
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        if (project.client_id !== clientId) {
            return res.status(403).json({
                error: 'Access denied. You can only view your own projects.',
                code: 'PROJECT_ACCESS_DENIED'
            });
        }
        
        // Get student interests for this project
        const interests = await database.getProjectInterests(projectId);
        
        res.json({
            success: true,
            data: {
                project,
                interests
            }
        });
        
    } catch (error) {
        console.error('Error fetching project details:', error);
        res.status(500).json({
            error: 'Failed to load project details',
            code: 'PROJECT_DETAILS_ERROR'
        });
    }
});

// Create new project
router.post('/projects', authenticate, requireClient, validationRules.createProject, async (req, res) => {
    try {
        const clientId = req.user.id;
        const {
            title, description, required_skills, tools_technologies,
            deliverables, semester_availability, duration_weeks,
            max_students, project_type, prerequisites, additional_info
        } = req.body;
        
        const result = await database.run(`
            INSERT INTO projects (
                client_id, title, description, required_skills, tools_technologies,
                deliverables, semester_availability, duration_weeks, max_students,
                project_type, prerequisites, additional_info, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
        `, [
            clientId, title, description, required_skills, tools_technologies,
            deliverables, semester_availability, duration_weeks || null,
            max_students || null, project_type || null, prerequisites || null,
            additional_info || null
        ]);
        
        const newProject = await database.getProjectById(result.id);
        
        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: { project: newProject }
        });
        
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            error: 'Failed to create project',
            code: 'PROJECT_CREATE_ERROR'
        });
    }
});

// Update project (only pending projects can be edited)
router.put('/projects/:id', authenticate, requireClient, validationRules.updateProject, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const clientId = req.user.id;
        const {
            title, description, required_skills, tools_technologies,
            deliverables, semester_availability, duration_weeks,
            max_students, project_type, prerequisites, additional_info
        } = req.body;
        
        // Get project and verify ownership and status
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        if (project.client_id !== clientId) {
            return res.status(403).json({
                error: 'Access denied. You can only edit your own projects.',
                code: 'PROJECT_ACCESS_DENIED'
            });
        }
        
        if (project.status !== 'pending' && project.status !== 'rejected') {
            return res.status(400).json({
                error: 'Only pending and rejected projects can be edited. Approved projects cannot be modified.',
                code: 'PROJECT_NOT_EDITABLE',
                currentStatus: project.status
            });
        }
        
        // Update the project (reset to pending if it was rejected)
        const newStatus = project.status === 'rejected' ? 'pending' : project.status;
        await database.run(`
            UPDATE projects SET 
                title = ?, description = ?, required_skills = ?, tools_technologies = ?,
                deliverables = ?, semester_availability = ?, duration_weeks = ?, max_students = ?,
                project_type = ?, prerequisites = ?, additional_info = ?, 
                status = ?, rejection_reason = NULL, updated_at = datetime('now')
            WHERE id = ? AND client_id = ?
        `, [
            title, description, required_skills, tools_technologies,
            deliverables, semester_availability, duration_weeks || null,
            max_students || null, project_type || null, prerequisites || null,
            additional_info || null, newStatus, projectId, clientId
        ]);
        
        // Get the updated project
        const updatedProject = await database.getProjectById(projectId);
        
        res.json({
            success: true,
            message: 'Project updated successfully',
            data: { project: updatedProject }
        });
        
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            error: 'Failed to update project',
            code: 'PROJECT_UPDATE_ERROR'
        });
    }
});

// Delete project (only pending projects can be deleted by their owners)
router.delete('/projects/:id', authenticate, requireClient, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const clientId = req.user.id;
        
        // Get project and verify ownership and status
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        if (project.client_id !== clientId) {
            return res.status(403).json({
                error: 'Access denied. You can only delete your own projects.',
                code: 'PROJECT_ACCESS_DENIED'
            });
        }
        
        if (project.status !== 'pending' && project.status !== 'rejected') {
            return res.status(400).json({
                error: `Cannot delete ${project.status} projects. Only pending and rejected projects can be deleted.`,
                code: 'PROJECT_DELETE_DENIED'
            });
        }
        
        // Delete the project
        await database.run('DELETE FROM projects WHERE id = ?', [projectId]);
        
        res.json({
            success: true,
            message: 'Project deleted successfully',
            data: { projectId }
        });
        
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            error: 'Failed to delete project',
            code: 'PROJECT_DELETE_ERROR'
        });
    }
});

module.exports = router;