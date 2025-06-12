const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const database = require('../database/db');

const copyFile = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

class BackupManager {
    constructor() {
        this.backupDir = path.join(__dirname, '..', 'backups');
        this.dbPath = path.join(__dirname, '..', 'database', 'capstone.db');
    }

    // Ensure backup directory exists
    async ensureBackupDir() {
        try {
            await access(this.backupDir);
        } catch {
            await mkdir(this.backupDir, { recursive: true });
            console.log('Created backup directory:', this.backupDir);
        }
    }

    // Generate timestamp for backup filenames
    getTimestamp() {
        const now = new Date();
        return now.toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0];
    }

    // Create full database backup (SQLite file copy)
    async createFullBackup(customName = null) {
        try {
            await this.ensureBackupDir();
            
            const timestamp = this.getTimestamp();
            const backupName = customName || `capstone_backup_${timestamp}.db`;
            const backupPath = path.join(this.backupDir, backupName);

            // Copy the SQLite database file
            await copyFile(this.dbPath, backupPath);
            
            console.log(`Full backup created: ${backupPath}`);
            return {
                success: true,
                backupPath,
                backupName,
                timestamp,
                type: 'full'
            };
        } catch (error) {
            console.error('Error creating full backup:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create data export in JSON format
    async createDataExport(tables = 'all') {
        try {
            await this.ensureBackupDir();
            await database.init();

            const timestamp = this.getTimestamp();
            const exportName = `capstone_export_${timestamp}.json`;
            const exportPath = path.join(this.backupDir, exportName);

            const exportData = {
                exportInfo: {
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    type: 'data_export'
                },
                data: {}
            };

            // Define tables to export
            const tablesToExport = tables === 'all' ? [
                'admin_users',
                'clients', 
                'students',
                'projects',
                'student_interests',
                'student_favorites',
                'project_gallery',
                'audit_log',
                'analytics'
            ] : (Array.isArray(tables) ? tables : [tables]);

            // Export each table
            for (const table of tablesToExport) {
                try {
                    const data = await database.query(`SELECT * FROM ${table}`);
                    exportData.data[table] = data;
                    console.log(`Exported ${data.length} records from ${table}`);
                } catch (error) {
                    console.error(`Error exporting table ${table}:`, error.message);
                    exportData.data[table] = [];
                }
            }

            // Write JSON export
            await writeFile(exportPath, JSON.stringify(exportData, null, 2));
            
            console.log(`Data export created: ${exportPath}`);
            return {
                success: true,
                exportPath,
                exportName,
                timestamp,
                type: 'data_export',
                tablesExported: tablesToExport
            };
        } catch (error) {
            console.error('Error creating data export:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create CSV export for specific data
    async createCSVExport(exportType) {
        try {
            await this.ensureBackupDir();
            await database.init();

            const timestamp = this.getTimestamp();
            let data, filename, csvContent;

            switch (exportType) {
                case 'projects':
                    data = await database.query(`
                        SELECT p.id, p.title, p.description, p.status, p.semester_availability,
                               p.interest_count, p.created_at, c.organization_name as client_name,
                               c.contact_name, c.email as client_email
                        FROM projects p 
                        JOIN clients c ON p.client_id = c.id
                        ORDER BY p.created_at DESC
                    `);
                    filename = `projects_export_${timestamp}.csv`;
                    csvContent = this.convertToCSV(data);
                    break;

                case 'student_interests':
                    data = await database.query(`
                        SELECT si.id, s.full_name as student_name, s.email as student_email,
                               p.title as project_title, c.organization_name as client_name,
                               si.message, si.expressed_at, si.is_active
                        FROM student_interests si
                        JOIN students s ON si.student_id = s.id
                        JOIN projects p ON si.project_id = p.id
                        JOIN clients c ON p.client_id = c.id
                        ORDER BY si.expressed_at DESC
                    `);
                    filename = `student_interests_export_${timestamp}.csv`;
                    csvContent = this.convertToCSV(data);
                    break;

                case 'analytics':
                    data = await database.query(`
                        SELECT event_type, user_type, COUNT(*) as count,
                               DATE(created_at) as date
                        FROM analytics 
                        GROUP BY event_type, user_type, DATE(created_at)
                        ORDER BY date DESC
                    `);
                    filename = `analytics_summary_${timestamp}.csv`;
                    csvContent = this.convertToCSV(data);
                    break;

                case 'users_summary':
                    // Get summary of all users
                    const adminCount = await database.query('SELECT COUNT(*) as count FROM admin_users');
                    const clientCount = await database.query('SELECT COUNT(*) as count FROM clients');
                    const studentCount = await database.query('SELECT COUNT(*) as count FROM students');
                    
                    data = [
                        { user_type: 'Admin Users', count: adminCount[0].count },
                        { user_type: 'Clients', count: clientCount[0].count },
                        { user_type: 'Students', count: studentCount[0].count }
                    ];
                    filename = `users_summary_${timestamp}.csv`;
                    csvContent = this.convertToCSV(data);
                    break;

                default:
                    throw new Error(`Unknown export type: ${exportType}`);
            }

            const exportPath = path.join(this.backupDir, filename);
            await writeFile(exportPath, csvContent);

            console.log(`CSV export created: ${exportPath}`);
            return {
                success: true,
                exportPath,
                filename,
                timestamp,
                type: 'csv_export',
                exportType,
                recordCount: data.length
            };
        } catch (error) {
            console.error('Error creating CSV export:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Convert array of objects to CSV format
    convertToCSV(data) {
        if (!data || data.length === 0) {
            return '';
        }

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                // Escape quotes and wrap in quotes if contains comma or quote
                if (value === null || value === undefined) {
                    return '';
                }
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    // Restore from full backup
    async restoreFromBackup(backupPath) {
        try {
            // Verify backup file exists
            await access(backupPath);
            
            // Close current database connection
            await database.close();
            
            // Create backup of current database before restore
            const currentBackup = await this.createFullBackup('pre_restore_backup');
            console.log('Created safety backup before restore');

            // Copy backup file to database location
            await copyFile(backupPath, this.dbPath);
            
            // Reinitialize database connection
            await database.init();
            
            console.log(`Database restored from: ${backupPath}`);
            return {
                success: true,
                restoredFrom: backupPath,
                safetyBackup: currentBackup.backupPath
            };
        } catch (error) {
            console.error('Error restoring from backup:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // List available backups
    async listBackups() {
        try {
            await this.ensureBackupDir();
            
            const files = await promisify(fs.readdir)(this.backupDir);
            const backups = [];

            for (const file of files) {
                const filePath = path.join(this.backupDir, file);
                const stats = await promisify(fs.stat)(filePath);
                
                if (stats.isFile()) {
                    backups.push({
                        filename: file,
                        size: stats.size,
                        created: stats.mtime,
                        type: this.getBackupType(file)
                    });
                }
            }

            // Sort by creation date (newest first)
            backups.sort((a, b) => b.created - a.created);

            return {
                success: true,
                backups
            };
        } catch (error) {
            console.error('Error listing backups:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Determine backup type from filename
    getBackupType(filename) {
        if (filename.endsWith('.db')) {
            return 'full_backup';
        } else if (filename.endsWith('.json')) {
            return 'data_export';
        } else if (filename.endsWith('.csv')) {
            return 'csv_export';
        }
        return 'unknown';
    }

    // Clean old backups (keep last N backups)
    async cleanOldBackups(keepCount = 10) {
        try {
            const backupList = await this.listBackups();
            if (!backupList.success) {
                return backupList;
            }

            const fullBackups = backupList.backups.filter(b => b.type === 'full_backup');
            
            if (fullBackups.length <= keepCount) {
                return {
                    success: true,
                    message: `Only ${fullBackups.length} backups found, no cleanup needed`
                };
            }

            const toDelete = fullBackups.slice(keepCount);
            let deletedCount = 0;

            for (const backup of toDelete) {
                try {
                    const backupPath = path.join(this.backupDir, backup.filename);
                    await promisify(fs.unlink)(backupPath);
                    deletedCount++;
                    console.log(`Deleted old backup: ${backup.filename}`);
                } catch (error) {
                    console.error(`Error deleting backup ${backup.filename}:`, error.message);
                }
            }

            return {
                success: true,
                deletedCount,
                remainingCount: fullBackups.length - deletedCount
            };
        } catch (error) {
            console.error('Error cleaning old backups:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create automated backup with cleanup
    async createAutomatedBackup() {
        try {
            // Create full backup
            const backupResult = await this.createFullBackup();
            
            if (backupResult.success) {
                // Clean old backups (keep last 10)
                await this.cleanOldBackups(10);
                
                // Log the backup creation
                await database.logAudit('system', null, 'backup_created', 'database', null, null, backupResult.backupName, null);
            }

            return backupResult;
        } catch (error) {
            console.error('Error in automated backup:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
const backupManager = new BackupManager();

module.exports = backupManager;

// CLI interface if run directly
if (require.main === module) {
    const command = process.argv[2];
    const param = process.argv[3];

    switch (command) {
        case 'backup':
            backupManager.createFullBackup(param).then(result => {
                console.log('Backup result:', result);
                process.exit(result.success ? 0 : 1);
            });
            break;
            
        case 'export':
            const exportType = param || 'all';
            backupManager.createDataExport(exportType).then(result => {
                console.log('Export result:', result);
                process.exit(result.success ? 0 : 1);
            });
            break;
            
        case 'csv':
            const csvType = param || 'projects';
            backupManager.createCSVExport(csvType).then(result => {
                console.log('CSV export result:', result);
                process.exit(result.success ? 0 : 1);
            });
            break;
            
        case 'list':
            backupManager.listBackups().then(result => {
                if (result.success) {
                    console.log('Available backups:');
                    result.backups.forEach(backup => {
                        console.log(`- ${backup.filename} (${backup.type}, ${backup.size} bytes, ${backup.created})`);
                    });
                } else {
                    console.error('Error listing backups:', result.error);
                }
                process.exit(result.success ? 0 : 1);
            });
            break;
            
        case 'clean':
            const keepCount = parseInt(param) || 10;
            backupManager.cleanOldBackups(keepCount).then(result => {
                console.log('Cleanup result:', result);
                process.exit(result.success ? 0 : 1);
            });
            break;
            
        default:
            console.log('Usage: node backup.js <command> [parameter]');
            console.log('Commands:');
            console.log('  backup [name]     - Create full database backup');
            console.log('  export [tables]   - Export data to JSON');
            console.log('  csv [type]        - Export to CSV (projects, student_interests, analytics, users_summary)');
            console.log('  list              - List available backups');
            console.log('  clean [keep]      - Clean old backups (default: keep 10)');
            process.exit(1);
    }
}