-- Migration: Add lifecycle management features (Safe version)
-- Date: 2025-06-12
-- Description: Adds support for user archiving, project phases, and completion snapshots

-- Check and add columns only if they don't exist
-- SQLite doesn't have IF NOT EXISTS for columns, so we'll handle errors in the migration runner

-- For students table
ALTER TABLE students ADD COLUMN is_archived BOOLEAN DEFAULT 0;
ALTER TABLE students ADD COLUMN archived_at DATETIME;

-- For clients table
ALTER TABLE clients ADD COLUMN is_archived BOOLEAN DEFAULT 0;
ALTER TABLE clients ADD COLUMN archived_at DATETIME;

-- For admin_users table
ALTER TABLE admin_users ADD COLUMN is_archived BOOLEAN DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN archived_at DATETIME;

-- For projects table - phase support
ALTER TABLE projects ADD COLUMN parent_project_id INTEGER REFERENCES projects(id);
ALTER TABLE projects ADD COLUMN phase_number INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN completed_at DATETIME;

-- For projects table - completion snapshots
ALTER TABLE projects ADD COLUMN client_name_snapshot TEXT;
ALTER TABLE projects ADD COLUMN client_org_snapshot TEXT;
ALTER TABLE projects ADD COLUMN completion_notes TEXT;

-- Create indexes (these use IF NOT EXISTS so they're safe)
CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_phase ON projects(phase_number);
CREATE INDEX IF NOT EXISTS idx_projects_completed ON projects(completed_at);
CREATE INDEX IF NOT EXISTS idx_students_archived ON students(is_archived);
CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(is_archived);
CREATE INDEX IF NOT EXISTS idx_admins_archived ON admin_users(is_archived);

-- Add audit log entry for migration
INSERT INTO audit_log (user_type, action, entity_type, entity_id, new_value, created_at)
VALUES ('system', 'migration_002_lifecycle_features', 'database', 0, 
        '{"migration": "002_add_lifecycle_features_safe.sql", "features": ["user_archiving", "project_phases", "completion_snapshots"]}',
        CURRENT_TIMESTAMP);