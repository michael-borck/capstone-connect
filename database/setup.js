const fs = require('fs');
const path = require('path');
const database = require('./db');

async function runMigrations() {
    console.log('Running database migrations...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    
    try {
        // Get all migration files in order
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sort to ensure they run in order
        
        console.log(`Found ${migrationFiles.length} migration files`);
        
        for (const file of migrationFiles) {
            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            
            // Split by semicolons to handle multiple statements
            const statements = sql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);
            
            for (const statement of statements) {
                try {
                    await database.run(statement);
                } catch (error) {
                    // Ignore errors for things that already exist or duplicate columns
                    if (!error.message.includes('already exists') && 
                        !error.message.includes('duplicate column name')) {
                        console.error(`Error in migration ${file}:`, error.message);
                    }
                }
            }
            
            console.log(`  ✓ ${file} completed`);
        }
        
        console.log('All migrations completed successfully!');
        
    } catch (error) {
        console.error('Error running migrations:', error);
        throw error;
    }
}

async function setupDatabase() {
    try {
        console.log('Setting up database...');
        
        // Initialize database connection
        await database.init();
        
        // Run all migrations
        await runMigrations();
        
        console.log('Database setup completed successfully!');
        
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
}

// Export for use in other scripts
module.exports = {
    setupDatabase,
    runMigrations
};

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase().then(() => {
        console.log('Database setup finished.');
        process.exit(0);
    }).catch((error) => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}