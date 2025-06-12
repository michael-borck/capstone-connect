const express = require('express');
const router = express.Router();

const database = require('../database/db');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validationRules } = require('../middleware/validation');

// Get all approved gallery items (public endpoint)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { year, category, limit = 50, offset = 0 } = req.query;
        
        let galleryItems = await database.getGalleryItems('approved');
        
        // Filter by year if specified
        if (year && year !== 'all') {
            galleryItems = galleryItems.filter(item => item.year.toString() === year);
        }
        
        // Filter by category if specified
        if (category && category !== 'all') {
            galleryItems = galleryItems.filter(item => 
                item.category && item.category.toLowerCase() === category.toLowerCase()
            );
        }
        
        // Parse image URLs
        galleryItems = galleryItems.map(item => ({
            ...item,
            image_urls: item.image_urls ? JSON.parse(item.image_urls) : []
        }));
        
        // Apply pagination
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedItems = galleryItems.slice(startIndex, endIndex);
        
        // Log analytics if user is authenticated
        if (req.user) {
            await database.logAnalytics(
                'gallery_browse',
                req.user.type,
                req.user.id,
                null,
                null,
                'filter',
                JSON.stringify({ year, category })
            );
        }
        
        res.json({
            success: true,
            gallery: paginatedItems,
            pagination: {
                total: galleryItems.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: endIndex < galleryItems.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching gallery items:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'GALLERY_FETCH_ERROR'
        });
    }
});

// Get single gallery item by ID (public endpoint)
router.get('/:id', validationRules.validateId, optionalAuth, async (req, res) => {
    try {
        const galleryId = parseInt(req.params.id);
        const galleryItem = await database.getGalleryItemById(galleryId);
        
        if (!galleryItem || galleryItem.status !== 'approved') {
            return res.status(404).json({ 
                success: false,
                error: 'Gallery item not found',
                code: 'GALLERY_ITEM_NOT_FOUND'
            });
        }
        
        // Parse image URLs
        galleryItem.image_urls = galleryItem.image_urls ? JSON.parse(galleryItem.image_urls) : [];
        
        // Log analytics if user is authenticated
        if (req.user) {
            await database.logAnalytics(
                'gallery_view',
                req.user.type,
                req.user.id,
                null,
                null,
                'gallery_item_id',
                galleryId.toString()
            );
        }
        
        res.json({
            success: true,
            galleryItem
        });
        
    } catch (error) {
        console.error('Error fetching gallery item:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'GALLERY_ITEM_FETCH_ERROR'
        });
    }
});

// Get gallery statistics (for filtering options)
router.get('/stats/filters', async (req, res) => {
    try {
        // Get available years and categories for filtering
        const [years, categories] = await Promise.all([
            database.query('SELECT DISTINCT year FROM project_gallery WHERE status = "approved" ORDER BY year DESC'),
            database.query('SELECT DISTINCT category FROM project_gallery WHERE status = "approved" AND category IS NOT NULL ORDER BY category ASC')
        ]);
        
        res.json({
            success: true,
            filters: {
                years: years.map(y => y.year),
                categories: categories.map(c => c.category)
            }
        });
        
    } catch (error) {
        console.error('Error fetching gallery filter options:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'GALLERY_FILTERS_ERROR'
        });
    }
});

// Admin routes for gallery management

// Get pending gallery items (admin only)
router.get('/admin/pending', authenticate, authorize('admin'), async (req, res) => {
    try {
        const pendingItems = await database.getPendingGalleryItems();
        
        // Parse image URLs for each item
        const itemsWithParsedUrls = pendingItems.map(item => ({
            ...item,
            image_urls: item.image_urls ? JSON.parse(item.image_urls) : []
        }));
        
        res.json({
            success: true,
            pending: itemsWithParsedUrls
        });
        
    } catch (error) {
        console.error('Error fetching pending gallery items:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'PENDING_GALLERY_ERROR'
        });
    }
});

// Get all gallery items for admin management
router.get('/admin/all', authenticate, authorize('admin'), async (req, res) => {
    try {
        const [approved, pending, rejected] = await Promise.all([
            database.getGalleryItems('approved'),
            database.getGalleryItems('pending'),
            database.getGalleryItems('rejected')
        ]);
        
        const allItems = [...approved, ...pending, ...rejected].map(item => ({
            ...item,
            image_urls: item.image_urls ? JSON.parse(item.image_urls) : []
        }));
        
        res.json({
            success: true,
            gallery: allItems,
            stats: {
                approved: approved.length,
                pending: pending.length,
                rejected: rejected.length,
                total: allItems.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching all gallery items:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'ALL_GALLERY_ERROR'
        });
    }
});

// Create gallery item from completed project (admin only)
router.post('/admin/from-project/:projectId', authenticate, authorize('admin'), async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const {
            galleryTitle,
            galleryDescription,
            category,
            teamMembers,
            outcomes,
            imageUrls = []
        } = req.body;
        
        // Validate that project exists and is completed
        const project = await database.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            });
        }
        
        if (project.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Can only add completed projects to gallery',
                code: 'PROJECT_NOT_COMPLETED'
            });
        }
        
        // Check if project is already in gallery
        const existingGalleryItem = await database.query(
            'SELECT id FROM project_gallery WHERE title = ? AND year = ?',
            [galleryTitle || project.title, new Date(project.completed_at || project.created_at).getFullYear()]
        );
        
        if (existingGalleryItem.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'This project is already in the gallery',
                code: 'PROJECT_ALREADY_IN_GALLERY'
            });
        }
        
        // Add project to gallery
        const result = await database.addProjectToGallery(projectId, req.user.id, {
            galleryTitle,
            galleryDescription,
            category,
            teamMembers,
            outcomes,
            imageUrls
        });
        
        // Get the created gallery item
        const galleryItem = await database.getGalleryItemById(result.id);
        galleryItem.image_urls = galleryItem.image_urls ? JSON.parse(galleryItem.image_urls) : [];
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'gallery_item_created',
            'gallery',
            result.id,
            null,
            JSON.stringify({ projectId, galleryTitle }),
            req.ip
        );
        
        res.status(201).json({
            success: true,
            message: 'Project added to gallery successfully',
            galleryItem
        });
        
    } catch (error) {
        console.error('Error adding project to gallery:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'ADD_TO_GALLERY_ERROR'
        });
    }
});

// Create manual gallery item (admin only)
router.post('/admin/create', authenticate, authorize('admin'), async (req, res) => {
    try {
        const {
            title,
            description,
            year,
            category,
            imageUrls = [],
            clientName,
            teamMembers,
            outcomes
        } = req.body;
        
        // Validate required fields
        if (!title || !description || !year) {
            return res.status(400).json({
                success: false,
                error: 'Title, description, and year are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }
        
        // Create gallery item
        const result = await database.createGalleryItem(
            title,
            description,
            parseInt(year),
            category || 'Other',
            imageUrls,
            clientName || '',
            teamMembers || '',
            outcomes || '',
            req.user.id
        );
        
        // Get the created gallery item
        const galleryItem = await database.getGalleryItemById(result.id);
        galleryItem.image_urls = galleryItem.image_urls ? JSON.parse(galleryItem.image_urls) : [];
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'gallery_item_created_manual',
            'gallery',
            result.id,
            null,
            JSON.stringify({ title, year, category }),
            req.ip
        );
        
        res.status(201).json({
            success: true,
            message: 'Gallery item created successfully',
            galleryItem
        });
        
    } catch (error) {
        console.error('Error creating gallery item:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'CREATE_GALLERY_ERROR'
        });
    }
});

// Update gallery item status (admin only)
router.patch('/admin/:id/status', authenticate, authorize('admin'), async (req, res) => {
    try {
        const galleryId = parseInt(req.params.id);
        const { status } = req.body;
        
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be approved, rejected, or pending',
                code: 'INVALID_STATUS'
            });
        }
        
        // Get existing gallery item
        const existingItem = await database.getGalleryItemById(galleryId);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                error: 'Gallery item not found',
                code: 'GALLERY_ITEM_NOT_FOUND'
            });
        }
        
        // Update status
        await database.updateGalleryItemStatus(galleryId, status, req.user.id);
        
        // Get updated item
        const updatedItem = await database.getGalleryItemById(galleryId);
        updatedItem.image_urls = updatedItem.image_urls ? JSON.parse(updatedItem.image_urls) : [];
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            `gallery_item_${status}`,
            'gallery',
            galleryId,
            existingItem.status,
            status,
            req.ip
        );
        
        res.json({
            success: true,
            message: `Gallery item ${status} successfully`,
            galleryItem: updatedItem
        });
        
    } catch (error) {
        console.error('Error updating gallery item status:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'UPDATE_GALLERY_STATUS_ERROR'
        });
    }
});

// Update gallery item (admin only)
router.put('/admin/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const galleryId = parseInt(req.params.id);
        const {
            title,
            description,
            year,
            category,
            imageUrls,
            clientName,
            teamMembers,
            outcomes
        } = req.body;
        
        // Get existing gallery item
        const existingItem = await database.getGalleryItemById(galleryId);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                error: 'Gallery item not found',
                code: 'GALLERY_ITEM_NOT_FOUND'
            });
        }
        
        // Update gallery item
        await database.updateGalleryItem(
            galleryId,
            title || existingItem.title,
            description || existingItem.description,
            parseInt(year) || existingItem.year,
            category || existingItem.category,
            imageUrls || JSON.parse(existingItem.image_urls || '[]'),
            clientName || existingItem.client_name,
            teamMembers || existingItem.team_members,
            outcomes || existingItem.outcomes
        );
        
        // Get updated item
        const updatedItem = await database.getGalleryItemById(galleryId);
        updatedItem.image_urls = updatedItem.image_urls ? JSON.parse(updatedItem.image_urls) : [];
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'gallery_item_updated',
            'gallery',
            galleryId,
            JSON.stringify(existingItem),
            JSON.stringify(updatedItem),
            req.ip
        );
        
        res.json({
            success: true,
            message: 'Gallery item updated successfully',
            galleryItem: updatedItem
        });
        
    } catch (error) {
        console.error('Error updating gallery item:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'UPDATE_GALLERY_ERROR'
        });
    }
});

// Delete gallery item (admin only)
router.delete('/admin/:id', authenticate, authorize('admin'), validationRules.validateId, async (req, res) => {
    try {
        const galleryId = parseInt(req.params.id);
        
        // Get existing gallery item
        const existingItem = await database.getGalleryItemById(galleryId);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                error: 'Gallery item not found',
                code: 'GALLERY_ITEM_NOT_FOUND'
            });
        }
        
        // Delete gallery item
        await database.deleteGalleryItem(galleryId);
        
        // Log audit trail
        await database.logAudit(
            req.user.type,
            req.user.id,
            'gallery_item_deleted',
            'gallery',
            galleryId,
            JSON.stringify(existingItem),
            null,
            req.ip
        );
        
        res.json({
            success: true,
            message: 'Gallery item deleted successfully',
            deletedItem: {
                id: galleryId,
                title: existingItem.title
            }
        });
        
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'DELETE_GALLERY_ERROR'
        });
    }
});

// Get gallery statistics (admin only)
router.get('/admin/stats/overview', authenticate, authorize('admin'), async (req, res) => {
    try {
        const stats = await database.getGalleryStats();
        
        res.json({
            success: true,
            ...stats
        });
        
    } catch (error) {
        console.error('Error fetching gallery statistics:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            code: 'GALLERY_STATS_ERROR'
        });
    }
});

module.exports = router;