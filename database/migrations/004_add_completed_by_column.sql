-- Migration: Add completed_by column to projects table
-- Date: 2025-06-12
-- Description: Adds the missing completed_by column to track which admin completed the project

-- Add completed_by column to reference the admin user who completed the project
ALTER TABLE projects ADD COLUMN completed_by INTEGER;

-- Add foreign key constraint by creating a new index
CREATE INDEX IF NOT EXISTS idx_projects_completed_by ON projects(completed_by);

-- Verify the column was added
INSERT INTO audit_log (user_type, action, entity_type, entity_id, new_value, created_at)
VALUES ('system', 'migration_004_add_completed_by', 'database', 0, 
        '{"migration": "004_add_completed_by_column.sql", "added": ["projects.completed_by"]}',
        CURRENT_TIMESTAMP);