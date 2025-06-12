const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'capstone.db');
const MIGRATIONS_PATH = path.join(__dirname, 'migrations');

async function runMigration() {
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Create migrations table if it doesn't exist
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT UNIQUE NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Get list of migration files
        const files = await fs.readdir(MIGRATIONS_PATH);
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

        // Get applied migrations
        const appliedMigrations = await new Promise((resolve, reject) => {
            db.all('SELECT filename FROM migrations', (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => r.filename));
            });
        });

        // Run pending migrations
        for (const file of sqlFiles) {
            if (!appliedMigrations.includes(file)) {
                console.log(`Running migration: ${file}`);
                
                const sqlContent = await fs.readFile(
                    path.join(MIGRATIONS_PATH, file), 
                    'utf8'
                );

                // Split by semicolons but preserve those within CHECK constraints
                const statements = sqlContent
                    .split(/;\s*$/m)
                    .filter(stmt => stmt.trim().length > 0)
                    .map(stmt => stmt.trim() + ';');

                // Run each statement
                for (const statement of statements) {
                    if (statement.trim() && !statement.startsWith('--')) {
                        await new Promise((resolve, reject) => {
                            db.run(statement, (err) => {
                                if (err) {
                                    // Handle specific errors gracefully
                                    if (err.message.includes('duplicate column name')) {
                                        console.log(`Column already exists, skipping: ${statement.substring(0, 50)}...`);
                                        resolve();
                                    } else if (err.message.includes('no such table')) {
                                        console.error(`Table not found: ${statement.substring(0, 100)}...`);
                                        reject(err);
                                    } else {
                                        console.error(`Error in statement: ${statement.substring(0, 100)}...`);
                                        reject(err);
                                    }
                                }
                                else resolve();
                            });
                        });
                    }
                }

                // Record migration as applied
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO migrations (filename) VALUES (?)',
                        [file],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

                console.log(`Migration ${file} completed successfully`);
            }
        }

        console.log('All migrations completed');

    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run migrations
runMigration().catch(console.error);