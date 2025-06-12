const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'capstone.db'));

// Check schema for each table
const tables = ['students', 'clients', 'admin_users', 'projects'];

tables.forEach(table => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) {
            console.error(`Error checking ${table}:`, err);
        } else {
            console.log(`\n${table} columns:`);
            rows.forEach(row => {
                console.log(`  - ${row.name} (${row.type})`);
            });
        }
        
        if (table === tables[tables.length - 1]) {
            db.close();
        }
    });
});