const express = require('express');
const router = express.Router();

const database = require('../database/db');
const { authenticate, authorize, auditAuth } = require('../middleware/auth');
const { validationRules, validateInterestLimit } = require('../middleware/validation');

// Express interest in a project
router.post('/interests', authenticate, authorize('student'), validationRules.expressInterest, validateInterestLimit, async (req, res) => {
    try {
        const { projectId, message = '' } = req.body;
        const studentId = req.user.id;

        // Check if project exists and is available
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }

        // Check if project is available for interest
        if (project.status !== 'approved' && project.status !== 'active') {
            return res.status(400).json({
                error: 'Project is not available for interest',
                code: 'PROJECT_NOT_AVAILABLE'
            });
        }

        // Check if student has already expressed interest
        const existingInterests = await database.getStudentInterests(studentId);
        const alreadyInterested = existingInterests.some(interest => 
            interest.project_id === projectId && interest.is_active
        );

        if (alreadyInterested) {
            return res.status(400).json({
                error: 'You have already expressed interest in this project',
                code: 'INTEREST_ALREADY_EXISTS'
            });
        }

        // Express interest
        const result = await database.expressInterest(studentId, projectId, message);

        // Get updated project with new interest count
        const updatedProject = await database.getProjectById(projectId);

        // Log audit trail
        await database.logAudit(
            'student',
            studentId,
            'interest_expressed',
            'project',
            projectId,
            null,
            JSON.stringify({ message, projectTitle: project.title }),
            req.ip
        );

        // Log analytics
        await database.logAnalytics(
            'interest_expressed',
            'student',
            studentId,
            projectId,
            null,
            null,
            null
        );

        res.status(201).json({
            message: 'Interest expressed successfully',
            interest: {
                id: result.id,
                projectId,
                projectTitle: project.title,
                message,
                expressedAt: new Date().toISOString()
            },
            projectInterestCount: updatedProject.interest_count
        });

    } catch (error) {
        console.error('Error expressing interest:', error);
        await auditAuth('interest_express_failed', req, req.user, false, error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTEREST_EXPRESS_ERROR'
        });
    }
});

// Bulk withdraw interests (for cleanup or limit management)
router.delete('/interests/bulk', authenticate, authorize('student'), async (req, res) => {
    try {
        const { projectIds } = req.body;
        const studentId = req.user.id;

        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({
                error: 'Project IDs array is required',
                code: 'INVALID_PROJECT_IDS'
            });
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const projectId of projectIds) {
            try {
                // Check if student has expressed interest
                const interests = await database.getStudentInterests(studentId);
                const hasInterest = interests.some(interest => 
                    interest.project_id === projectId && interest.is_active
                );

                if (hasInterest) {
                    await database.withdrawInterest(studentId, projectId);
                    successCount++;
                    results.push({ projectId, status: 'withdrawn' });
                } else {
                    results.push({ projectId, status: 'not_found' });
                }
            } catch (error) {
                errorCount++;
                results.push({ projectId, status: 'error', error: error.message });
            }
        }

        // Log audit trail
        await database.logAudit(
            'student',
            studentId,
            'bulk_interest_withdrawal',
            'interests',
            null,
            null,
            JSON.stringify({ projectIds, successCount, errorCount }),
            req.ip
        );

        res.json({
            message: `Bulk withdrawal completed: ${successCount} successful, ${errorCount} errors`,
            results,
            summary: {
                total: projectIds.length,
                successful: successCount,
                errors: errorCount
            }
        });

    } catch (error) {
        console.error('Error in bulk withdrawal:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'BULK_WITHDRAWAL_ERROR'
        });
    }
});

// Withdraw interest from a project
router.delete('/interests/:projectId', authenticate, authorize('student'), validationRules.validateProjectIdParam, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const studentId = req.user.id;

        // Check if project exists
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }

        // Check if student has expressed interest
        const interests = await database.getStudentInterests(studentId);
        const existingInterest = interests.find(interest => 
            interest.project_id === projectId && interest.is_active
        );

        if (!existingInterest) {
            return res.status(400).json({
                error: 'You have not expressed interest in this project',
                code: 'INTEREST_NOT_FOUND'
            });
        }

        // Withdraw interest
        await database.withdrawInterest(studentId, projectId);

        // Get updated project with new interest count
        const updatedProject = await database.getProjectById(projectId);

        // Log audit trail
        await database.logAudit(
            'student',
            studentId,
            'interest_withdrawn',
            'project',
            projectId,
            'active',
            'withdrawn',
            req.ip
        );

        // Log analytics
        await database.logAnalytics(
            'interest_withdrawn',
            'student',
            studentId,
            projectId,
            null,
            null,
            null
        );

        res.json({
            message: 'Interest withdrawn successfully',
            projectId,
            projectTitle: project.title,
            projectInterestCount: updatedProject.interest_count
        });

    } catch (error) {
        console.error('Error withdrawing interest:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTEREST_WITHDRAW_ERROR'
        });
    }
});

// Get student's interests
router.get('/interests', authenticate, authorize('student'), async (req, res) => {
    try {
        const studentId = req.user.id;
        const interests = await database.getStudentInterests(studentId);

        // Log analytics
        await database.logAnalytics(
            'interests_viewed',
            'student',
            studentId,
            null,
            null,
            null,
            null
        );

        res.json({
            interests,
            count: interests.length,
            maxAllowed: 5
        });

    } catch (error) {
        console.error('Error fetching student interests:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERESTS_FETCH_ERROR'
        });
    }
});

// Add project to favorites
router.post('/favorites', authenticate, authorize('student'), validationRules.addToFavorites, async (req, res) => {
    try {
        const { projectId } = req.body;
        const studentId = req.user.id;

        // Check if project exists
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }

        // Check if already favorited
        const isFavorite = await database.isFavorite(studentId, projectId);
        if (isFavorite) {
            return res.status(400).json({
                error: 'Project is already in favorites',
                code: 'ALREADY_FAVORITED'
            });
        }

        // Check favorites limit (20 max)
        const favorites = await database.getStudentFavorites(studentId);
        if (favorites.length >= 20) {
            return res.status(400).json({
                error: 'Maximum of 20 favorites allowed',
                code: 'FAVORITES_LIMIT_EXCEEDED',
                currentCount: favorites.length,
                maxAllowed: 20
            });
        }

        // Add to favorites
        const result = await database.addFavorite(studentId, projectId);

        // Log analytics
        await database.logAnalytics(
            'favorite_added',
            'student',
            studentId,
            projectId,
            null,
            null,
            null
        );

        res.status(201).json({
            message: 'Project added to favorites',
            favorite: {
                id: result.id,
                projectId,
                projectTitle: project.title,
                addedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'FAVORITE_ADD_ERROR'
        });
    }
});

// Remove project from favorites
router.delete('/favorites/:projectId', authenticate, authorize('student'), validationRules.validateProjectIdParam, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const studentId = req.user.id;

        // Check if project exists
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }

        // Check if favorited
        const isFavorite = await database.isFavorite(studentId, projectId);
        if (!isFavorite) {
            return res.status(400).json({
                error: 'Project is not in favorites',
                code: 'NOT_FAVORITED'
            });
        }

        // Remove from favorites
        await database.removeFavorite(studentId, projectId);

        // Log analytics
        await database.logAnalytics(
            'favorite_removed',
            'student',
            studentId,
            projectId,
            null,
            null,
            null
        );

        res.json({
            message: 'Project removed from favorites',
            projectId,
            projectTitle: project.title
        });

    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'FAVORITE_REMOVE_ERROR'
        });
    }
});

// Get student's favorites
router.get('/favorites', authenticate, authorize('student'), async (req, res) => {
    try {
        const studentId = req.user.id;
        const favorites = await database.getStudentFavorites(studentId);

        // Log analytics
        await database.logAnalytics(
            'favorites_viewed',
            'student',
            studentId,
            null,
            null,
            null,
            null
        );

        res.json({
            favorites,
            count: favorites.length,
            maxAllowed: 20
        });

    } catch (error) {
        console.error('Error fetching student favorites:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'FAVORITES_FETCH_ERROR'
        });
    }
});

// Get student dashboard data
router.get('/dashboard', authenticate, authorize('student'), async (req, res) => {
    try {
        const studentId = req.user.id;

        // Get all student data in parallel
        const [interests, favorites, profile] = await Promise.all([
            database.getStudentInterests(studentId),
            database.getStudentFavorites(studentId),
            database.getStudentById(studentId)
        ]);

        // Get some statistics
        const totalProjects = await database.query('SELECT COUNT(*) as count FROM projects WHERE status IN ("approved", "active")');
        const totalInterests = await database.query('SELECT COUNT(*) as count FROM student_interests WHERE is_active = 1');

        // Log analytics
        await database.logAnalytics(
            'dashboard_viewed',
            'student',
            studentId,
            null,
            null,
            null,
            null
        );

        res.json({
            profile: {
                id: profile.id,
                email: profile.email,
                fullName: profile.full_name,
                studentId: profile.student_id,
                memberSince: profile.created_at
            },
            interests: {
                list: interests,
                count: interests.length,
                maxAllowed: 5
            },
            favorites: {
                list: favorites,
                count: favorites.length,
                maxAllowed: 20
            },
            statistics: {
                totalProjects: totalProjects[0].count,
                totalInterests: totalInterests[0].count
            }
        });

    } catch (error) {
        console.error('Error fetching student dashboard:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'DASHBOARD_ERROR'
        });
    }
});

// Get interest statistics for a student
router.get('/stats', authenticate, authorize('student'), async (req, res) => {
    try {
        const studentId = req.user.id;

        // Get interest count
        const interestCount = await database.getActiveInterestCount(studentId);

        // Get favorites count
        const favorites = await database.getStudentFavorites(studentId);

        // Get recent activity
        const recentInterests = await database.query(`
            SELECT COUNT(*) as count 
            FROM student_interests 
            WHERE student_id = ? AND expressed_at >= datetime('now', '-7 days') AND is_active = 1
        `, [studentId]);

        res.json({
            interests: {
                current: interestCount,
                maxAllowed: 5,
                remaining: Math.max(0, 5 - interestCount)
            },
            favorites: {
                current: favorites.length,
                maxAllowed: 20,
                remaining: Math.max(0, 20 - favorites.length)
            },
            recentActivity: {
                newInterestsThisWeek: recentInterests[0].count
            }
        });

    } catch (error) {
        console.error('Error fetching student stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'STUDENT_STATS_ERROR'
        });
    }
});

// Get interested students for a project (for clients to see their project interest)
router.get('/interests/project/:projectId', authenticate, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);

        // Get project to check permissions
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }

        // Check permissions - only project owner (client) or admin can see interested students
        if (req.user.type !== 'admin' && 
            !(req.user.type === 'client' && project.client_id === req.user.id)) {
            return res.status(403).json({
                error: 'Access denied',
                code: 'PROJECT_INTERESTS_ACCESS_DENIED'
            });
        }

        // Get interested students
        const interests = await database.getProjectInterests(projectId);

        // Log analytics
        await database.logAnalytics(
            'project_interests_viewed',
            req.user.type,
            req.user.id,
            projectId,
            null,
            null,
            null
        );

        res.json({
            projectId,
            projectTitle: project.title,
            interests,
            count: interests.length
        });

    } catch (error) {
        console.error('Error fetching project interests:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'PROJECT_INTERESTS_ERROR'
        });
    }
});

module.exports = router;