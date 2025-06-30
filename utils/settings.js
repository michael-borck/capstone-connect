const database = require('../database/db');

class SettingsManager {
    constructor() {
        this.cache = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastCacheTime = 0;
    }

    // Load all settings into cache
    async loadSettings() {
        try {
            // Ensure database is initialized
            if (!database.db) {
                await database.init();
            }
            
            this.cache = await database.getSettingsObject();
            this.lastCacheTime = Date.now();
            console.log('Settings loaded into cache');
            return this.cache;
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Return defaults if database not ready
            this.cache = this.getDefaults();
            this.lastCacheTime = Date.now();
            return this.cache;
        }
    }

    // Get a specific setting
    async get(key, defaultValue = null) {
        // Check if cache needs refresh
        if (!this.cache || Date.now() - this.lastCacheTime > this.cacheTimeout) {
            await this.loadSettings();
        }
        
        return this.cache && this.cache.hasOwnProperty(key) ? this.cache[key] : defaultValue;
    }

    // Get all settings
    async getAll() {
        if (!this.cache || Date.now() - this.lastCacheTime > this.cacheTimeout) {
            await this.loadSettings();
        }
        return this.cache || this.getDefaults();
    }

    // Update a setting and refresh cache
    async update(key, value, adminId) {
        await database.updateSetting(key, value, adminId);
        await this.loadSettings(); // Refresh cache
        return this.cache[key];
    }

    // Force refresh cache
    async refresh() {
        return await this.loadSettings();
    }

    // Get default settings (fallback when database not available)
    getDefaults() {
        return {
            // Branding
            site_title: 'Curtin Capstone Connect',
            site_tagline: 'Connecting Students with Real-World Projects',
            primary_color: '#B8860B',
            secondary_color: '#2C2C2C',
            footer_text: '© 2025 Curtin University. All rights reserved.',
            site_logo_url: '',
            
            // Auth
            student_domain_whitelist: ['@student.curtin.edu.au', '@postgrad.curtin.edu.au'],
            client_registration_mode: 'open',
            client_domain_whitelist: [],
            require_email_verification: false,
            
            // Features
            enable_gallery: true,
            enable_analytics: true,
            enable_student_favorites: true,
            enable_bulk_operations: true,
            enable_project_phases: true,
            enable_interest_messages: true,
            
            // Rules
            max_student_interests: 5,
            max_student_favorites: 20,
            min_team_size: 1,
            max_team_size: 10,
            interest_withdrawal_allowed: true,
            project_types: ['development', 'research', 'design', 'analysis', 'other'],
            academic_terms: ['Semester 1', 'Semester 2', 'Summer', 'Winter'],
            
            // Privacy
            data_retention_years: 7,
            show_student_details_to_clients: true,
            public_project_visibility: true,
            public_gallery_visibility: true
        };
    }

    // Helper methods for common checks
    async isStudentDomainAllowed(email) {
        const whitelist = await this.get('student_domain_whitelist', []);
        if (!Array.isArray(whitelist) || whitelist.length === 0) return true;
        
        const domain = email.substring(email.lastIndexOf('@'));
        return whitelist.some(allowed => {
            if (allowed.startsWith('*')) {
                // Handle wildcard patterns like *.curtin.edu.au
                return domain.endsWith(allowed.substring(1));
            }
            return domain === allowed;
        });
    }

    async isClientDomainAllowed(email) {
        const mode = await this.get('client_registration_mode', 'open');
        if (mode === 'open') return true;
        
        const whitelist = await this.get('client_domain_whitelist', []);
        if (!Array.isArray(whitelist) || whitelist.length === 0) return mode !== 'whitelist';
        
        const domain = email.substring(email.lastIndexOf('@'));
        return whitelist.some(allowed => {
            if (allowed.startsWith('*')) {
                return domain.endsWith(allowed.substring(1));
            }
            return domain === allowed;
        });
    }

    async isFeatureEnabled(feature) {
        return await this.get(`enable_${feature}`, true);
    }

    async getBranding() {
        const all = await this.getAll();
        return {
            site_title: all.site_title,
            site_tagline: all.site_tagline,
            primary_color: all.primary_color,
            secondary_color: all.secondary_color,
            footer_text: all.footer_text
        };
    }

    async getBusinessRules() {
        const all = await this.getAll();
        return {
            max_student_interests: all.max_student_interests,
            max_student_favorites: all.max_student_favorites,
            min_team_size: all.min_team_size,
            max_team_size: all.max_team_size,
            interest_withdrawal_allowed: all.interest_withdrawal_allowed,
            project_types: all.project_types,
            academic_terms: all.academic_terms
        };
    }

    // Reset all settings to defaults
    async resetToDefaults(adminId) {
        const results = await database.resetSettingsToDefaults(adminId);
        await this.refresh();
        return results;
    }

    // Check if current settings match defaults
    async isUsingDefaults() {
        const current = await this.getAll();
        const defaults = this.getDefaults();
        
        for (const [key, defaultValue] of Object.entries(defaults)) {
            if (JSON.stringify(current[key]) !== JSON.stringify(defaultValue)) {
                return false;
            }
        }
        return true;
    }
}

// Create singleton instance
const settingsManager = new SettingsManager();

// Initialize on first import (but don't fail if database not ready)
settingsManager.loadSettings().catch(() => {
    // Silently use defaults if database not ready yet
    settingsManager.cache = settingsManager.getDefaults();
    settingsManager.lastCacheTime = Date.now();
});

module.exports = settingsManager;