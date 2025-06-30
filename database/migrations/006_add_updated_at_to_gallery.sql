-- Migration: Add updated_at column to project_gallery table
-- Date: 2025-06-30
-- Description: Adds missing updated_at column to project_gallery table required by updateGalleryItem function

-- Add the missing updated_at column to project_gallery table
ALTER TABLE project_gallery ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have an updated_at value (set to created_at)
UPDATE project_gallery SET updated_at = created_at WHERE updated_at IS NULL;

-- Create an index for performance on the updated_at column
CREATE INDEX IF NOT EXISTS idx_gallery_updated_at ON project_gallery(updated_at);

-- Create audit log entry for migration
INSERT INTO audit_log (user_type, action, entity_type, entity_id, new_value, created_at)
VALUES ('system', 'migration_006_add_updated_at_gallery', 'database', 0, 
        '{"migration": "006_add_updated_at_to_gallery.sql", "added": ["project_gallery.updated_at"], "indexes": ["idx_gallery_updated_at"]}',
        CURRENT_TIMESTAMP);