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
        const sql = `SELECT * FROM admin_users WHERE email = ?`;
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
        const sql = `SELECT * FROM clients WHERE email = ?`;
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
        const sql = `SELECT * FROM students WHERE email = ?`;
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
}

// Create singleton instance
const database = new Database();

module.exports = database;