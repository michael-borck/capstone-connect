const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'capstone.db'));

// Remove all lifecycle migrations so we can run a clean one
db.serialize(() => {
    db.run("DELETE FROM migrations WHERE filename LIKE '%lifecycle%'", (err) => {
        if (err) console.error('Error removing lifecycle migrations:', err);
        else console.log('Lifecycle migrations removed');
    });
    
    db.run("DELETE FROM migrations WHERE filename LIKE '%fix_missing%'", (err) => {
        if (err) console.error('Error removing fix migrations:', err);
        else console.log('Fix migrations removed');
    });
    
    // Try to add missing columns directly
    const alterations = [
        "ALTER TABLE students ADD COLUMN is_archived BOOLEAN DEFAULT 0",
        "ALTER TABLE projects ADD COLUMN parent_project_id INTEGER REFERENCES projects(id)",
        "ALTER TABLE projects ADD COLUMN client_name_snapshot TEXT",
        "ALTER TABLE projects ADD COLUMN admin_feedback TEXT"
    ];
    
    alterations.forEach(sql => {
        db.run(sql, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error(`Failed: ${sql} - ${err.message}`);
            } else if (!err) {
                console.log(`Success: ${sql}`);
            }
        });
    });
    
    // Create indexes after columns are added
    setTimeout(() => {
        const indexes = [
            "CREATE INDEX IF NOT EXISTS idx_students_archived ON students(is_archived)",
            "CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id)",
            "CREATE INDEX IF NOT EXISTS idx_projects_phase ON projects(phase_number)",
            "CREATE INDEX IF NOT EXISTS idx_projects_completed ON projects(completed_at)",
            "CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(is_archived)",
            "CREATE INDEX IF NOT EXISTS idx_admins_archived ON admin_users(is_archived)"
        ];
        
        indexes.forEach(sql => {
            db.run(sql, (err) => {
                if (err) {
                    console.error(`Index failed: ${sql} - ${err.message}`);
                } else {
                    console.log(`Index created: ${sql}`);
                }
            });
        });
        
        setTimeout(() => {
            db.close();
            console.log('Database updates completed');
        }, 1000);
    }, 1000);
});