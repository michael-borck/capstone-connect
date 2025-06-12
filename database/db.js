const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = path.join(__dirname, 'capstone.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

class Database {
    constructor() {
        this.db = null;
    }

    // Initialize database connection and create tables if needed
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                    return;
                }
                console.log('Connected to SQLite database');
                
                // Enable foreign keys
                this.db.run('PRAGMA foreign_keys = ON;', (err) => {
                    if (err) {
                        console.error('Error enabling foreign keys:', err);
                        reject(err);
                        return;
                    }
                    
                    // Initialize schema if database is new
                    this.initSchema()
                        .then(() => resolve())
                        .catch(reject);
                });
            });
        });
    }

    // Initialize database schema from SQL file
    async initSchema() {
        return new Promise((resolve, reject) => {
            fs.readFile(SCHEMA_PATH, 'utf8', (err, sql) => {
                if (err) {
                    console.error('Error reading schema file:', err);
                    reject(err);
                    return;
                }

                this.db.exec(sql, (err) => {
                    if (err) {
                        console.error('Error executing schema:', err);
                        reject(err);
                        return;
                    }
                    console.log('Database schema initialized');
                    resolve();
                });
            });
        });
    }

    // Generic query method for SELECT statements
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Query error:', err);
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Generic method for INSERT, UPDATE, DELETE statements
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Run error:', err);
                    reject(err);
                    return;
                }
                resolve({
                    id: this.lastID,
                    changes: this.changes
                });
            });
        });
    }

    // Get single row
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Get error:', err);
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // Transaction wrapper
    async transaction(callback) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                Promise.resolve(callback())
                    .then((result) => {
                        this.db.run('COMMIT', (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        });
                    })
                    .catch((error) => {
                        this.db.run('ROLLBACK', () => {
                            reject(error);
                        });
                    });
            });
        });
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                        return;
                    }
                    console.log('Database connection closed');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // Helper methods for common operations

    // Admin users
    async createAdmin(email, passwordHash, fullName) {
        const sql = `INSERT INTO admin_users (email, password_hash, full_name) VALUES (?, ?, ?)`;
        return this.run(sql, [email, passwordHash, fullName]);
    }

    async getAdminByEmail(email) {
        const sql = `SELECT * FROM admin_users WHERE email = ? AND is_archived = 0`;
        return this.get(sql, [email]);
    }

    async updateAdminLogin(adminId) {
        const sql = `UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`;
        return this.run(sql, [adminId]);
    }

    // Clients
    async createClient(email, passwordHash, organizationName, contactName, phone, address, contactTitle, website, description, industry) {
        const sql = `INSERT INTO clients (
            email, password_hash, organization_name, contact_name, phone, address,
            contact_title, website, description, industry
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        return this.run(sql, [
            email, passwordHash, organizationName, contactName, phone, address,
            contactTitle, website, description, industry
        ]);
    }

    async getClientByEmail(email) {
        const sql = `SELECT * FROM clients WHERE email = ? AND is_archived = 0`;
        return this.get(sql, [email]);
    }

    async getClientById(id) {
        const sql = `SELECT * FROM clients WHERE id = ?`;
        return this.get(sql, [id]);
    }

    async updateClientLogin(clientId) {
        const sql = `UPDATE clients SET last_login = CURRENT_TIMESTAMP WHERE id = ?`;
        return this.run(sql, [clientId]);
    }

    // Students
    async createStudent(email, passwordHash, fullName, studentId = null) {
        const sql = `INSERT INTO students (email, password_hash, full_name, student_id) VALUES (?, ?, ?, ?)`;
        return this.run(sql, [email, passwordHash, fullName, studentId]);
    }

    async getStudentByEmail(email) {
        const sql = `SELECT * FROM students WHERE email = ? AND is_archived = 0`;
        return this.get(sql, [email]);
    }

    async getStudentById(id) {
        const sql = `SELECT * FROM students WHERE id = ?`;
        return this.get(sql, [id]);
    }

    async updateStudentLogin(studentId) {
        const sql = `UPDATE students SET last_login = CURRENT_TIMESTAMP WHERE id = ?`;
        return this.run(sql, [studentId]);
    }

    // Projects
    async createProject(clientId, title, description, requiredSkills, tools, deliverables, semesterAvailability = 'both', projectType = null, durationWeeks = null, maxStudents = null, prerequisites = null, additionalInfo = null) {
        const sql = `INSERT INTO projects (client_id, title, description, required_skills, tools_technologies, deliverables, semester_availability, project_type, duration_weeks, max_students, prerequisites, additional_info) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        return this.run(sql, [clientId, title, description, requiredSkills, tools, deliverables, semesterAvailability, projectType, durationWeeks, maxStudents, prerequisites, additionalInfo]);
    }

    async getProjectById(id) {
        const sql = `SELECT p.*, c.organization_name, c.contact_name 
                     FROM projects p 
                     JOIN clients c ON p.client_id = c.id 
                     WHERE p.id = ?`;
        return this.get(sql, [id]);
    }

    async getProjectsByClient(clientId) {
        const sql = `SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC`;
        return this.query(sql, [clientId]);
    }

    async getApprovedProjects() {
        const sql = `SELECT p.*, c.organization_name, c.contact_name 
                     FROM projects p 
                     JOIN clients c ON p.client_id = c.id 
                     WHERE p.status IN ('approved', 'active') 
                     ORDER BY p.created_at DESC`;
        return this.query(sql);
    }

    async getPendingProjects() {
        const sql = `SELECT p.*, c.organization_name, c.contact_name 
                     FROM projects p 
                     JOIN clients c ON p.client_id = c.id 
                     WHERE p.status = 'pending' 
                     ORDER BY p.created_at DESC`;
        return this.query(sql);
    }

    async getCompletedProjects() {
        const sql = `SELECT p.*, c.organization_name, c.contact_name 
                     FROM projects p 
                     JOIN clients c ON p.client_id = c.id 
                     WHERE p.status = 'completed' 
                     ORDER BY p.completed_at DESC`;
        return this.query(sql);
    }

    // Multi-phase project support
    async createProjectPhase(clientId, parentProjectId, phaseNumber, title, description, requiredSkills, tools, deliverables, semesterAvailability = 'both', projectType = null, durationWeeks = null, maxStudents = null, prerequisites = null, additionalInfo = null) {
        const sql = `INSERT INTO projects (
                     client_id, parent_project_id, phase_number, title, description, required_skills, 
                     tools_technologies, deliverables, semester_availability, project_type, 
                     duration_weeks, max_students, prerequisites, additional_info
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        return this.run(sql, [
            clientId, parentProjectId, phaseNumber, title, description, requiredSkills, 
            tools, deliverables, semesterAvailability, projectType, durationWeeks, 
            maxStudents, prerequisites, additionalInfo
        ]);
    }

    async getProjectPhases(parentProjectId) {
        const sql = `SELECT p.*, c.organization_name, c.contact_name 
                     FROM projects p 
                     JOIN clients c ON p.client_id = c.id 
                     WHERE p.parent_project_id = ? 
                     ORDER BY p.phase_number ASC`;
        return this.query(sql, [parentProjectId]);
    }

    async getProjectFamily(projectId) {
        // Get the root project (either this project if it's a parent, or its parent)
        const sql1 = `SELECT p.*, c.organization_name, c.contact_name 
                      FROM projects p 
                      JOIN clients c ON p.client_id = c.id 
                      WHERE p.id = ?`;
        const currentProject = await this.get(sql1, [projectId]);
        
        if (!currentProject) return null;
        
        const rootProjectId = currentProject.parent_project_id || projectId;
        
        // Get the root project
        const rootProject = await this.get(sql1, [rootProjectId]);
        
        // Get all phases
        const phases = await this.getProjectPhases(rootProjectId);
        
        return {
            rootProject,
            phases,
            currentPhase: currentProject.parent_project_id ? currentProject : null
        };
    }

    async getNextPhaseNumber(parentProjectId) {
        const sql = `SELECT MAX(phase_number) as max_phase FROM projects WHERE parent_project_id = ?`;
        const result = await this.get(sql, [parentProjectId]);
        return (result.max_phase || 0) + 1;
    }

    async updateProjectStatus(projectId, status, approvedBy = null) {
        let sql, params;
        if (status === 'approved' && approvedBy) {
            sql = `UPDATE projects SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`;
            params = [status, approvedBy, projectId];
        } else {
            sql = `UPDATE projects SET status = ? WHERE id = ?`;
            params = [status, projectId];
        }
        return this.run(sql, params);
    }

    async completeProject(projectId, completedBy, clientSnapshot = null, organizationSnapshot = null) {
        const sql = `UPDATE projects SET 
                     status = 'completed', 
                     completed_at = CURRENT_TIMESTAMP,
                     completed_by = ?,
                     client_name_snapshot = ?,
                     client_org_snapshot = ?
                     WHERE id = ?`;
        return this.run(sql, [completedBy, clientSnapshot, organizationSnapshot, projectId]);
    }

    async updateProject(projectId, title, description, requiredSkills, tools, deliverables, semesterAvailability) {
        const sql = `UPDATE projects SET title = ?, description = ?, required_skills = ?, 
                     tools_technologies = ?, deliverables = ?, semester_availability = ? WHERE id = ?`;
        return this.run(sql, [title, description, requiredSkills, tools, deliverables, semesterAvailability, projectId]);
    }

    // Student interests
    async expressInterest(studentId, projectId, message = '') {
        const sql = `INSERT INTO student_interests (student_id, project_id, message) VALUES (?, ?, ?)`;
        return this.run(sql, [studentId, projectId, message]);
    }

    async withdrawInterest(studentId, projectId) {
        const sql = `UPDATE student_interests SET is_active = 0, withdrawn_at = CURRENT_TIMESTAMP 
                     WHERE student_id = ? AND project_id = ? AND is_active = 1`;
        return this.run(sql, [studentId, projectId]);
    }

    async getStudentInterests(studentId) {
        const sql = `SELECT si.*, p.title, p.description, c.organization_name 
                     FROM student_interests si 
                     JOIN projects p ON si.project_id = p.id 
                     JOIN clients c ON p.client_id = c.id 
                     WHERE si.student_id = ? AND si.is_active = 1 
                     ORDER BY si.expressed_at DESC`;
        return this.query(sql, [studentId]);
    }

    async getActiveInterestCount(studentId) {
        const sql = `SELECT COUNT(*) as count FROM student_interests WHERE student_id = ? AND is_active = 1`;
        const result = await this.get(sql, [studentId]);
        return result.count;
    }

    async getProjectInterests(projectId) {
        const sql = `SELECT si.*, s.full_name, s.email 
                     FROM student_interests si 
                     JOIN students s ON si.student_id = s.id 
                     WHERE si.project_id = ? AND si.is_active = 1 
                     ORDER BY si.expressed_at DESC`;
        return this.query(sql, [projectId]);
    }

    // Student favorites
    async addFavorite(studentId, projectId) {
        const sql = `INSERT INTO student_favorites (student_id, project_id) VALUES (?, ?)`;
        return this.run(sql, [studentId, projectId]);
    }

    async removeFavorite(studentId, projectId) {
        const sql = `DELETE FROM student_favorites WHERE student_id = ? AND project_id = ?`;
        return this.run(sql, [studentId, projectId]);
    }

    async getStudentFavorites(studentId) {
        const sql = `SELECT sf.*, p.title, p.description, c.organization_name 
                     FROM student_favorites sf 
                     JOIN projects p ON sf.project_id = p.id 
                     JOIN clients c ON p.client_id = c.id 
                     WHERE sf.student_id = ? 
                     ORDER BY sf.created_at DESC`;
        return this.query(sql, [studentId]);
    }

    async isFavorite(studentId, projectId) {
        const sql = `SELECT COUNT(*) as count FROM student_favorites WHERE student_id = ? AND project_id = ?`;
        const result = await this.get(sql, [studentId, projectId]);
        return result.count > 0;
    }

    // Search functionality
    async searchProjects(query, filters = {}) {
        let sql = `
            SELECT p.*, c.organization_name, c.contact_name 
            FROM projects p 
            JOIN clients c ON p.client_id = c.id 
            WHERE p.status IN ('approved', 'active')
        `;
        let params = [];

        if (query) {
            sql += ` AND p.id IN (
                SELECT rowid FROM projects_fts 
                WHERE projects_fts MATCH ?
            )`;
            params.push(query);
        }

        if (filters.semester) {
            sql += ` AND (p.semester_availability = ? OR p.semester_availability = 'both')`;
            params.push(filters.semester);
        }

        if (filters.minInterests) {
            sql += ` AND p.interest_count >= ?`;
            params.push(filters.minInterests);
        }

        sql += ` ORDER BY p.interest_count DESC, p.created_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(filters.limit);
        }

        return this.query(sql, params);
    }

    // Analytics
    async logAnalytics(eventType, userType, userId, projectId, searchQuery, filterType, filterValue) {
        const sql = `INSERT INTO analytics (event_type, user_type, user_id, project_id, search_query, filter_type, filter_value) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        return this.run(sql, [eventType, userType, userId, projectId, searchQuery, filterType, filterValue]);
    }

    async getAnalytics(startDate, endDate) {
        const sql = `SELECT * FROM analytics WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC`;
        return this.query(sql, [startDate, endDate]);
    }

    // Audit logging
    async logAudit(userType, userId, action, entityType, entityId, oldValue, newValue, ipAddress) {
        const sql = `INSERT INTO audit_log (user_type, user_id, action, entity_type, entity_id, old_value, new_value, ip_address) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        return this.run(sql, [userType, userId, action, entityType, entityId, oldValue, newValue, ipAddress]);
    }

    // Error logging
    async logError(errorData) {
        try {
            const sql = `
                INSERT INTO error_logs (
                    level, message, error_code, request_method, request_url,
                    user_id, ip_address, user_agent, stack_trace, additional_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            return this.run(sql, [
                errorData.level,
                errorData.message,
                errorData.error_code,
                errorData.request_method,
                errorData.request_url,
                errorData.user_id,
                errorData.ip_address,
                errorData.user_agent,
                errorData.stack_trace,
                errorData.additional_data
            ]);
        } catch (error) {
            // If error logging fails, just log to console
            console.error('Failed to log error to database:', error);
        }
    }

    // Gallery management
    async createGalleryItem(title, description, year, category, imageUrls, clientName, teamMembers, outcomes, submittedBy) {
        const sql = `INSERT INTO project_gallery 
                     (title, description, year, category, image_urls, client_name, team_members, outcomes, submitted_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        return this.run(sql, [
            title, description, year, category, 
            JSON.stringify(imageUrls || []), 
            clientName, teamMembers, outcomes, submittedBy
        ]);
    }

    async addProjectToGallery(projectId, submittedBy, additionalInfo = {}) {
        // Get the completed project data
        const project = await this.getProjectById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Extract year from completion date or creation date
        const year = new Date(project.completed_at || project.created_at).getFullYear();
        
        // Use snapshot data if available, otherwise current data
        const clientName = project.client_name_snapshot || project.contact_name;
        const organizationName = project.client_org_snapshot || project.organization_name;
        
        const galleryData = {
            title: additionalInfo.galleryTitle || project.title,
            description: additionalInfo.galleryDescription || project.description,
            year: year,
            category: additionalInfo.category || project.project_type || 'Software',
            image_urls: additionalInfo.imageUrls || [],
            client_name: `${clientName} (${organizationName})`,
            team_members: additionalInfo.teamMembers || '',
            outcomes: additionalInfo.outcomes || project.deliverables,
            submitted_by: submittedBy
        };

        return this.createGalleryItem(
            galleryData.title,
            galleryData.description,
            galleryData.year,
            galleryData.category,
            galleryData.image_urls,
            galleryData.client_name,
            galleryData.team_members,
            galleryData.outcomes,
            galleryData.submitted_by
        );
    }

    async getGalleryItems(status = 'approved') {
        const sql = `SELECT * FROM project_gallery WHERE status = ? ORDER BY year DESC, created_at DESC`;
        return this.query(sql, [status]);
    }

    async getPendingGalleryItems() {
        const sql = `SELECT pg.*, au.full_name as submitted_by_name 
                     FROM project_gallery pg 
                     LEFT JOIN admin_users au ON pg.submitted_by = au.id 
                     WHERE pg.status = 'pending' 
                     ORDER BY pg.created_at ASC`;
        return this.query(sql);
    }

    async updateGalleryItemStatus(galleryId, status, approvedBy = null) {
        let sql, params;
        if (status === 'approved' && approvedBy) {
            sql = `UPDATE project_gallery SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`;
            params = [status, approvedBy, galleryId];
        } else {
            sql = `UPDATE project_gallery SET status = ? WHERE id = ?`;
            params = [status, galleryId];
        }
        return this.run(sql, params);
    }

    async deleteGalleryItem(galleryId) {
        const sql = `DELETE FROM project_gallery WHERE id = ?`;
        return this.run(sql, [galleryId]);
    }

    async getGalleryItemById(galleryId) {
        const sql = `SELECT pg.*, au.full_name as submitted_by_name, 
                            au2.full_name as approved_by_name
                     FROM project_gallery pg 
                     LEFT JOIN admin_users au ON pg.submitted_by = au.id 
                     LEFT JOIN admin_users au2 ON pg.approved_by = au2.id 
                     WHERE pg.id = ?`;
        return this.get(sql, [galleryId]);
    }

    async updateGalleryItem(galleryId, title, description, year, category, imageUrls, clientName, teamMembers, outcomes) {
        const sql = `UPDATE project_gallery SET 
                     title = ?, description = ?, year = ?, category = ?, 
                     image_urls = ?, client_name = ?, team_members = ?, outcomes = ?,
                     updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        return this.run(sql, [
            title, description, year, category,
            JSON.stringify(imageUrls || []),
            clientName, teamMembers, outcomes, galleryId
        ]);
    }

    async getGalleryStats() {
        const stats = await Promise.all([
            this.query('SELECT COUNT(*) as total FROM project_gallery WHERE status = "approved"'),
            this.query('SELECT COUNT(*) as pending FROM project_gallery WHERE status = "pending"'),
            this.query('SELECT COUNT(DISTINCT year) as years FROM project_gallery WHERE status = "approved"'),
            this.query('SELECT COUNT(DISTINCT category) as categories FROM project_gallery WHERE status = "approved"')
        ]);

        return {
            total: stats[0][0].total,
            pending: stats[1][0].pending,
            years: stats[2][0].years,
            categories: stats[3][0].categories
        };
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;