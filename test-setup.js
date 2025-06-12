#!/usr/bin/env node

// Test setup script to verify database and server functionality
const database = require('./database/db');
const { seedDatabase } = require('./database/seedData');

async function testSetup() {
    console.log('🧪 Testing Curtin Capstone Connect Setup...\n');

    try {
        // 1. Test database connection
        console.log('1. Testing database connection...');
        await database.init();
        console.log('✅ Database connected successfully\n');

        // 2. Test if tables exist
        console.log('2. Checking database tables...');
        const tables = await database.query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);
        console.log(`✅ Found ${tables.length} tables:`, tables.map(t => t.name).join(', '));
        console.log('');

        // 3. Check if we have sample data
        console.log('3. Checking for sample data...');
        const adminCount = await database.query('SELECT COUNT(*) as count FROM admin_users');
        const clientCount = await database.query('SELECT COUNT(*) as count FROM clients');
        const studentCount = await database.query('SELECT COUNT(*) as count FROM students');
        const projectCount = await database.query('SELECT COUNT(*) as count FROM projects');

        console.log(`   - Admin users: ${adminCount[0].count}`);
        console.log(`   - Clients: ${clientCount[0].count}`);
        console.log(`   - Students: ${studentCount[0].count}`);
        console.log(`   - Projects: ${projectCount[0].count}`);

        if (adminCount[0].count === 0) {
            console.log('\n🔄 No sample data found. Seeding database...');
            await seedDatabase();
            console.log('✅ Database seeded with sample data\n');
        } else {
            console.log('✅ Sample data exists\n');
        }

        // 4. Test login credentials
        console.log('4. Testing login credentials...');
        const bcrypt = require('bcrypt');
        
        // Test admin login
        const admin = await database.getAdminByEmail('admin@curtin.edu.au');
        if (admin) {
            const isValidPassword = await bcrypt.compare('admin123', admin.password_hash);
            console.log(`   - Admin login (admin@curtin.edu.au): ${isValidPassword ? '✅' : '❌'}`);
        } else {
            console.log('   - Admin login: ❌ Admin not found');
        }

        // Test student login
        const student = await database.getStudentByEmail('john.doe@student.curtin.edu.au');
        if (student) {
            const isValidPassword = await bcrypt.compare('student123', student.password_hash);
            console.log(`   - Student login (john.doe@student.curtin.edu.au): ${isValidPassword ? '✅' : '❌'}`);
        } else {
            console.log('   - Student login: ❌ Student not found');
        }

        // Test client login
        const client = await database.getClientByEmail('projects@techcorp.com.au');
        if (client) {
            const isValidPassword = await bcrypt.compare('tech123', client.password_hash);
            console.log(`   - Client login (projects@techcorp.com.au): ${isValidPassword ? '✅' : '❌'}`);
        } else {
            console.log('   - Client login: ❌ Client not found');
        }

        console.log('');

        // 5. Test projects and interests
        console.log('5. Testing project data...');
        const approvedProjects = await database.getApprovedProjects();
        console.log(`   - Approved projects: ${approvedProjects.length}`);
        
        if (approvedProjects.length > 0) {
            const projectInterests = await database.getProjectInterests(approvedProjects[0].id);
            console.log(`   - Interests in first project: ${projectInterests.length}`);
        }

        console.log('');

        // 6. Final recommendations
        console.log('🎉 Setup Test Complete!\n');
        console.log('📋 To test the application:');
        console.log('   1. Run: npm start');
        console.log('   2. Open: http://localhost:3000');
        console.log('   3. Try these login credentials:');
        console.log('      • Admin: admin@curtin.edu.au / admin123');
        console.log('      • Student: john.doe@student.curtin.edu.au / student123');
        console.log('      • Client: projects@techcorp.com.au / tech123');
        console.log('');
        console.log('🐛 If you see network errors:');
        console.log('   - Make sure the server is running on port 3000');
        console.log('   - Check browser console for detailed error messages');
        console.log('   - Try refreshing the database: rm database/capstone.db && npm run seed');

    } catch (error) {
        console.error('❌ Setup test failed:', error);
        console.log('\n🔧 Try running: npm run seed');
    } finally {
        await database.close();
    }
}

if (require.main === module) {
    testSetup();
}

module.exports = { testSetup };