-- Curtin Capstone Project Management System Database Schema
-- SQLite database schema for all required tables

-- Admin users table (UC staff)
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Clients table (Industry partners)
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_title TEXT,                      -- Job title/position
    phone TEXT,
    website TEXT,                            -- Company website
    address TEXT,
    description TEXT,                        -- Organization description
    industry TEXT,                           -- Industry category
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT,
    tools_technologies TEXT,
    deliverables TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'active', 'inactive', 'rejected')),
    semester_availability TEXT DEFAULT 'both' CHECK(semester_availability IN ('semester1', 'semester2', 'both')),
    duration_weeks INTEGER,              -- Project duration in weeks
    max_students INTEGER,                -- Maximum number of students
    project_type TEXT,                   -- Type of project (software, research, etc.)
    prerequisites TEXT,                  -- Prerequisites and additional requirements
    additional_info TEXT,                -- Additional information
    interest_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by INTEGER,
    rejection_reason TEXT,               -- Admin feedback for rejected projects
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (approved_by) REFERENCES admin_users(id)
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    student_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Student interests table (tracks which projects students are interested in)
CREATE TABLE IF NOT EXISTS student_interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    message TEXT,
    expressed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    UNIQUE(student_id, project_id)
);

-- Student favorites table (saved projects)
CREATE TABLE IF NOT EXISTS student_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    UNIQUE(student_id, project_id)
);

-- Project gallery table (past successful projects)
CREATE TABLE IF NOT EXISTS project_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    year INTEGER NOT NULL,
    category TEXT,
    image_urls TEXT, -- JSON array of image URLs
    client_name TEXT,
    team_members TEXT,
    outcomes TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    submitted_by INTEGER,
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    FOREIGN KEY (submitted_by) REFERENCES admin_users(id),
    FOREIGN KEY (approved_by) REFERENCES admin_users(id)
);

-- Audit log table (tracks important changes)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'client', 'student', 'system')),
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table (tracks system usage)
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    user_type TEXT,
    user_id INTEGER,
    project_id INTEGER,
    search_query TEXT,
    filter_type TEXT,
    filter_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimized searching
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_semester ON projects(semester_availability);
CREATE INDEX IF NOT EXISTS idx_projects_title ON projects(title);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);

CREATE INDEX IF NOT EXISTS idx_interests_student ON student_interests(student_id);
CREATE INDEX IF NOT EXISTS idx_interests_project ON student_interests(project_id);
CREATE INDEX IF NOT EXISTS idx_interests_active ON student_interests(is_active);

CREATE INDEX IF NOT EXISTS idx_favorites_student ON student_favorites(student_id);
CREATE INDEX IF NOT EXISTS idx_favorites_project ON student_favorites(project_id);

CREATE INDEX IF NOT EXISTS idx_gallery_status ON project_gallery(status);
CREATE INDEX IF NOT EXISTS idx_gallery_year ON project_gallery(year);

CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);

-- Create simple full-text search virtual table for projects (simplified version)
-- Note: FTS triggers will be added later after testing basic functionality

-- Trigger to update project interest count
CREATE TRIGGER IF NOT EXISTS update_interest_count_insert 
AFTER INSERT ON student_interests 
WHEN new.is_active = 1
BEGIN
    UPDATE projects 
    SET interest_count = (
        SELECT COUNT(*) 
        FROM student_interests 
        WHERE project_id = new.project_id AND is_active = 1
    )
    WHERE id = new.project_id;
END;

CREATE TRIGGER IF NOT EXISTS update_interest_count_update 
AFTER UPDATE ON student_interests 
BEGIN
    UPDATE projects 
    SET interest_count = (
        SELECT COUNT(*) 
        FROM student_interests 
        WHERE project_id = new.project_id AND is_active = 1
    )
    WHERE id = new.project_id;
END;

-- Trigger to update project updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_project_timestamp 
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = new.id;
END;

-- Trigger to update gallery item updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_gallery_timestamp 
AFTER UPDATE ON project_gallery
BEGIN
    UPDATE project_gallery SET updated_at = CURRENT_TIMESTAMP WHERE id = new.id;
END;

-- Error logs table for application error tracking
CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info')), -- Error severity level
    message TEXT NOT NULL,                    -- Error message
    error_code TEXT,                         -- Application error code
    request_method TEXT,                     -- HTTP method of request
    request_url TEXT,                        -- URL that caused error
    user_id INTEGER,                         -- User who encountered error (if authenticated)
    ip_address TEXT,                         -- Client IP address
    user_agent TEXT,                         -- Client user agent
    stack_trace TEXT,                        -- Error stack trace (development only)
    additional_data TEXT,                    -- JSON string with additional context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient error log queries
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);