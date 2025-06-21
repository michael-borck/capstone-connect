const database = require('./db');
const fs = require('fs').promises;
const path = require('path');

async function runConfigMigration() {
    try {
        console.log('Running config settings migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', '005_add_config_settings.sql');
        const sqlContent = await fs.readFile(migrationPath, 'utf8');
        
        // Split statements properly, avoiding splits within CHECK constraints
        const statements = sqlContent
            .split(/;\s*\n/)
            .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
            .map(stmt => stmt.trim() + ';');
        
        // Execute each statement
        for (const statement of statements) {
            if (statement.includes('CREATE TABLE') || 
                statement.includes('INSERT INTO') || 
                statement.includes('CREATE INDEX')) {
                try {
                    await database.run(statement);
                    console.log('✓ Executed:', statement.substring(0, 50) + '...');
                } catch (error) {
                    // Skip if table/index already exists
                    if (error.message.includes('already exists')) {
                        console.log('⚠ Already exists:', statement.substring(0, 50) + '...');
                    } else {
                        throw error;
                    }
                }
            }
        }
        
        console.log('\nMigration completed successfully!');
        
        // Test by fetching a setting
        const testSetting = await database.getSetting('site_title');
        console.log('\nTest - Site title:', testSetting?.value);
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runConfigMigration();