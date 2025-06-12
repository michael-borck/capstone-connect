const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const database = require('../database/db');
const { authenticateToken, requireStudentAuth } = require('../middleware/auth');
const { logUserAction } = require('../middleware/requestLogger');

/**
 * @route POST /api/students/favorites
 * @desc Add a project to student's favorites
 * @access Private (Students only)
 */
router.post('/', 
    authenticateToken,
    requireStudentAuth,
    [
        body('projectId').isInt({ min: 1 }).withMessage('Valid project ID is required')
    ],
    async (req, res) => {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { projectId } = req.body;
            const studentId = req.user.id;

            // Check if project exists and is approved
            const project = await database.getProjectById(projectId);
            if (!project) {
                return res.status(404).json({
                    error: 'Project not found'
                });
            }

            if (project.status !== 'approved' && project.status !== 'active') {
                return res.status(400).json({
                    error: 'Can only favorite approved or active projects'
                });
            }

            // Add to favorites
            await database.run(
                'INSERT OR IGNORE INTO student_favorites (student_id, project_id) VALUES (?, ?)',
                [studentId, projectId]
            );

            // Log the action
            await logUserAction(req.user.id, 'favorite_added', `Added project ${projectId} to favorites`);

            res.json({
                success: true,
                message: 'Project added to favorites'
            });

        } catch (error) {
            console.error('Error adding project to favorites:', error);
            res.status(500).json({
                error: 'Failed to add project to favorites'
            });
        }
    }
);

/**
 * @route DELETE /api/students/favorites/:projectId
 * @desc Remove a project from student's favorites
 * @access Private (Students only)
 */
router.delete('/:projectId',
    authenticateToken,
    requireStudentAuth,
    async (req, res) => {
        try {
            const projectId = parseInt(req.params.projectId);
            const studentId = req.user.id;

            if (!projectId || isNaN(projectId)) {
                return res.status(400).json({
                    error: 'Valid project ID is required'
                });
            }

            // Remove from favorites
            const result = await database.run(
                'DELETE FROM student_favorites WHERE student_id = ? AND project_id = ?',
                [studentId, projectId]
            );

            if (result.changes === 0) {
                return res.status(404).json({
                    error: 'Project not found in favorites'
                });
            }

            // Log the action
            await logUserAction(req.user.id, 'favorite_removed', `Removed project ${projectId} from favorites`);

            res.json({
                success: true,
                message: 'Project removed from favorites'
            });

        } catch (error) {
            console.error('Error removing project from favorites:', error);
            res.status(500).json({
                error: 'Failed to remove project from favorites'
            });
        }
    }
);

/**
 * @route GET /api/students/favorites
 * @desc Get student's favorite projects
 * @access Private (Students only)
 */
router.get('/',
    authenticateToken,
    requireStudentAuth,
    async (req, res) => {
        try {
            const studentId = req.user.id;

            // Get favorite projects with project details
            const favorites = await database.query(`
                SELECT 
                    p.*,
                    c.organization_name,
                    c.contact_name,
                    sf.created_at as favorited_at,
                    (SELECT COUNT(*) FROM student_interests si WHERE si.project_id = p.id AND si.is_active = 1) as interest_count
                FROM student_favorites sf
                JOIN projects p ON sf.project_id = p.id
                JOIN clients c ON p.client_id = c.id
                WHERE sf.student_id = ? 
                AND p.status IN ('approved', 'active')
                ORDER BY sf.created_at DESC
            `, [studentId]);

            res.json({
                success: true,
                count: favorites.length,
                favorites: favorites
            });

        } catch (error) {
            console.error('Error fetching student favorites:', error);
            res.status(500).json({
                error: 'Failed to fetch favorites'
            });
        }
    }
);

/**
 * @route GET /api/students/favorites/check/:projectId
 * @desc Check if a project is in student's favorites
 * @access Private (Students only)
 */
router.get('/check/:projectId',
    authenticateToken,
    requireStudentAuth,
    async (req, res) => {
        try {
            const projectId = parseInt(req.params.projectId);
            const studentId = req.user.id;

            if (!projectId || isNaN(projectId)) {
                return res.status(400).json({
                    error: 'Valid project ID is required'
                });
            }

            // Check if project is favorited
            const favorite = await database.get(
                'SELECT id FROM student_favorites WHERE student_id = ? AND project_id = ?',
                [studentId, projectId]
            );

            res.json({
                success: true,
                isFavorite: !!favorite
            });

        } catch (error) {
            console.error('Error checking favorite status:', error);
            res.status(500).json({
                error: 'Failed to check favorite status'
            });
        }
    }
);

module.exports = router;