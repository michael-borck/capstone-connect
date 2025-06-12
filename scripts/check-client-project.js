const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/capstone.db');
const db = new Database(dbPath);

async function checkClientProject() {
    try {
        console.log('Checking client 6 project...');
        const projects = db.prepare(`
            SELECT p.*, c.organization_name 
            FROM projects p 
            JOIN clients c ON p.client_id = c.id 
            WHERE p.client_id = ?
        `).all(6);
        
        console.log('Projects for client 6:', JSON.stringify(projects, null, 2));
        
        const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(6);
        console.log('Client info:', JSON.stringify(client, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        db.close();
        process.exit(0);
    }
}

checkClientProject();