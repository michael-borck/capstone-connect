const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'capstone.db'));

db.run("DELETE FROM migrations WHERE filename = '002_add_lifecycle_features.sql'", (err) => {
    if (err) {
        console.error('Error removing migration record:', err);
    } else {
        console.log('Migration record removed');
    }
    db.close();
});