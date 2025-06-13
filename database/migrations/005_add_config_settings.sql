-- Migration: Add configuration settings table for multi-tenant support
-- Date: 2025-06-13
-- Description: Creates config_settings table to store customizable application settings

-- Create config_settings table
CREATE TABLE IF NOT EXISTS config_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    category VARCHAR(100) NOT NULL CHECK (category IN ('branding', 'auth', 'features', 'rules', 'privacy')),
    description TEXT,
    is_sensitive BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES admin_users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_config_settings_category ON config_settings(category);
CREATE INDEX IF NOT EXISTS idx_config_settings_key ON config_settings(setting_key);

-- Insert default configuration values
INSERT INTO config_settings (setting_key, setting_value, setting_type, category, description) VALUES
-- Branding Settings
('site_title', 'Curtin Capstone Connect', 'string', 'branding', 'Main title displayed across the application'),
('site_tagline', 'Connecting Students with Real-World Projects', 'string', 'branding', 'Tagline shown on homepage'),
('primary_color', '#1a73e8', 'string', 'branding', 'Primary color for buttons and headers (hex format)'),
('secondary_color', '#fbbc04', 'string', 'branding', 'Secondary accent color (hex format)'),
('footer_text', '© 2025 Curtin University. All rights reserved.', 'string', 'branding', 'Footer copyright text'),

-- Authentication Settings
('student_domain_whitelist', '["@student.curtin.edu.au", "@postgrad.curtin.edu.au"]', 'json', 'auth', 'Allowed email domains for student registration'),
('client_registration_mode', 'open', 'string', 'auth', 'Client registration mode: open, whitelist, or approval_required'),
('client_domain_whitelist', '[]', 'json', 'auth', 'Allowed email domains for client registration (if mode is whitelist)'),
('require_email_verification', 'false', 'boolean', 'auth', 'Whether email verification is required for registration'),

-- Feature Toggles
('enable_gallery', 'true', 'boolean', 'features', 'Enable/disable project gallery feature'),
('enable_analytics', 'true', 'boolean', 'features', 'Enable/disable analytics dashboard for admins'),
('enable_student_favorites', 'true', 'boolean', 'features', 'Allow students to favorite projects'),
('enable_bulk_operations', 'true', 'boolean', 'features', 'Enable bulk operations for admin users'),
('enable_project_phases', 'true', 'boolean', 'features', 'Allow multi-phase projects'),
('enable_interest_messages', 'true', 'boolean', 'features', 'Allow students to add messages when expressing interest'),

-- Business Rules
('max_student_interests', '5', 'number', 'rules', 'Maximum number of active project interests per student'),
('max_student_favorites', '20', 'number', 'rules', 'Maximum number of favorite projects per student'),
('min_team_size', '1', 'number', 'rules', 'Minimum team size for projects'),
('max_team_size', '10', 'number', 'rules', 'Maximum team size for projects'),
('interest_withdrawal_allowed', 'true', 'boolean', 'rules', 'Allow students to withdraw interest from projects'),
('project_types', '["development", "research", "design", "analysis", "other"]', 'json', 'rules', 'Available project type options'),
('academic_terms', '["Semester 1", "Semester 2", "Summer", "Winter"]', 'json', 'rules', 'Academic term options'),

-- Privacy and Data Settings
('data_retention_years', '7', 'number', 'privacy', 'Years to retain data before archiving'),
('show_student_details_to_clients', 'true', 'boolean', 'privacy', 'Whether clients can see full student details'),
('public_project_visibility', 'true', 'boolean', 'privacy', 'Whether non-logged users can browse projects'),
('public_gallery_visibility', 'true', 'boolean', 'privacy', 'Whether non-logged users can view gallery');

-- Create audit log entry for migration
INSERT INTO audit_log (user_type, action, entity_type, entity_id, new_value, created_at)
VALUES ('system', 'migration_005_config_settings', 'database', 0, 
        '{"migration": "005_add_config_settings.sql", "tables": ["config_settings"], "records_created": 25}',
        CURRENT_TIMESTAMP);