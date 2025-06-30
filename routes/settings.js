const express = require('express');
const router = express.Router();
const database = require('../database/db');

// Public endpoint for branding settings (no auth required)
router.get('/branding', async (req, res) => {
    try {
        const brandingKeys = [
            'site_title',
            'site_tagline', 
            'footer_text',
            'primary_color',
            'secondary_color',
            'site_logo_url'
        ];
        
        const settings = {};
        
        for (const key of brandingKeys) {
            const setting = await database.getSetting(key);
            if (setting && setting.value !== null && setting.value !== undefined) {
                settings[key] = setting.value; // Extract just the value
            }
        }
        
        res.json(settings);
        
    } catch (error) {
        console.error('Error fetching branding settings:', error);
        // Return empty object on error - don't expose internal errors
        res.json({});
    }
});

// Public endpoint for business rules (no auth required)
router.get('/business-rules', async (req, res) => {
    try {
        const ruleKeys = [
            'academic_terms',
            'project_types',
            'max_student_interests',
            'max_team_size',
            'min_team_size'
        ];
        
        const rules = {};
        
        for (const key of ruleKeys) {
            const setting = await database.getSetting(key);
            if (setting && setting.value !== null && setting.value !== undefined) {
                rules[key] = setting.value; // Extract just the value
            }
        }
        
        res.json(rules);
        
    } catch (error) {
        console.error('Error fetching business rules:', error);
        res.json({});
    }
});

module.exports = router;