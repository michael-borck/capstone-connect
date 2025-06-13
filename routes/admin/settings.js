const express = require('express');
const router = express.Router();

const database = require('../../database/db');
const settingsManager = require('../../utils/settings');
const { authenticate, authorize } = require('../../middleware/auth');

// Get settings by category
router.get('/:category', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { category } = req.params;
        const validCategories = ['branding', 'auth', 'features', 'rules', 'privacy'];
        
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category'
            });
        }
        
        const settings = await database.getSettings(category);
        
        res.json({
            success: true,
            category,
            settings
        });
        
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settings'
        });
    }
});

// Update multiple settings
router.put('/update', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { updates } = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No updates provided'
            });
        }
        
        // Update each setting
        for (const update of updates) {
            await database.updateSetting(update.key, update.value, req.user.id);
        }
        
        // Refresh settings cache
        await settingsManager.refresh();
        
        // Log audit
        await database.logAudit(
            req.user.type,
            req.user.id,
            'settings_updated',
            'settings',
            null,
            null,
            JSON.stringify({ count: updates.length }),
            req.ip
        );
        
        res.json({
            success: true,
            message: 'Settings updated successfully',
            updatedCount: updates.length
        });
        
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update settings'
        });
    }
});

// Export all settings
router.get('/export', authenticate, authorize('admin'), async (req, res) => {
    try {
        const settings = await database.getSettings();
        
        const exportData = {
            exported_at: new Date().toISOString(),
            exported_by: req.user.email,
            version: '1.0',
            settings: {}
        };
        
        // Group settings by category
        for (const setting of settings) {
            if (!exportData.settings[setting.category]) {
                exportData.settings[setting.category] = {};
            }
            
            // Parse value based on type
            let value = setting.setting_value;
            switch (setting.setting_type) {
                case 'number':
                    value = parseFloat(value);
                    break;
                case 'boolean':
                    value = value === 'true';
                    break;
                case 'json':
                    value = JSON.parse(value);
                    break;
            }
            
            exportData.settings[setting.category][setting.setting_key] = {
                value,
                type: setting.setting_type,
                description: setting.description
            };
        }
        
        res.json(exportData);
        
    } catch (error) {
        console.error('Error exporting settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export settings'
        });
    }
});

// Import settings
router.post('/import', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { settings, version } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid settings format'
            });
        }
        
        let importCount = 0;
        
        // Import settings by category
        for (const [category, categorySettings] of Object.entries(settings)) {
            for (const [key, settingData] of Object.entries(categorySettings)) {
                try {
                    // Get current setting to verify it exists
                    const currentSetting = await database.getSetting(key);
                    if (currentSetting) {
                        await database.updateSetting(key, settingData.value, req.user.id);
                        importCount++;
                    }
                } catch (err) {
                    console.error(`Failed to import setting ${key}:`, err);
                }
            }
        }
        
        // Refresh settings cache
        await settingsManager.refresh();
        
        // Log audit
        await database.logAudit(
            req.user.type,
            req.user.id,
            'settings_imported',
            'settings',
            null,
            null,
            JSON.stringify({ count: importCount, version }),
            req.ip
        );
        
        res.json({
            success: true,
            message: 'Settings imported successfully',
            importedCount: importCount
        });
        
    } catch (error) {
        console.error('Error importing settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import settings'
        });
    }
});

// Reset all settings to defaults
router.post('/reset', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { confirm } = req.body;
        
        if (confirm !== 'RESET_ALL_SETTINGS') {
            return res.status(400).json({
                success: false,
                error: 'Invalid confirmation. Send "confirm": "RESET_ALL_SETTINGS" to proceed.'
            });
        }
        
        // Reset all settings to defaults
        const results = await database.resetSettingsToDefaults(req.user.id);
        
        // Count successes and failures
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        // Refresh settings cache
        await settingsManager.refresh();
        
        // Log audit
        await database.logAudit(
            req.user.type,
            req.user.id,
            'settings_reset_to_defaults',
            'settings',
            null,
            null,
            JSON.stringify({ successful, failed, total: results.length }),
            req.ip
        );
        
        res.json({
            success: true,
            message: 'Settings reset to defaults',
            details: {
                successful,
                failed,
                total: results.length
            },
            failures: failed > 0 ? results.filter(r => !r.success) : undefined
        });
        
    } catch (error) {
        console.error('Error resetting settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset settings to defaults'
        });
    }
});

module.exports = router;