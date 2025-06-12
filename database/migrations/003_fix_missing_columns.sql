-- Migration: Fix missing columns
-- Date: 2025-06-12
-- Description: Adds missing columns that weren't created in previous migrations

-- Add missing is_archived column to students table
ALTER TABLE students ADD COLUMN is_archived BOOLEAN DEFAULT 0;

-- Add missing columns to projects table
ALTER TABLE projects ADD COLUMN parent_project_id INTEGER REFERENCES projects(id);
ALTER TABLE projects ADD COLUMN client_name_snapshot TEXT;
ALTER TABLE projects ADD COLUMN admin_feedback TEXT;

-- Verify all tables have the expected columns
-- This will be logged for verification purposes
INSERT INTO audit_log (user_type, action, entity_type, entity_id, new_value, created_at)
VALUES ('system', 'migration_003_fix_columns', 'database', 0, 
        '{"migration": "003_fix_missing_columns.sql", "fixed": ["students.is_archived", "projects.parent_project_id", "projects.client_name_snapshot", "projects.admin_feedback"]}',
        CURRENT_TIMESTAMP);