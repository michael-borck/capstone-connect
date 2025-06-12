#!/usr/bin/env node

// Quick script to approve some projects for testing
const database = require('./database/db');

async function approveProjects() {
    try {
        await database.init();
        
        // Get all pending projects
        const pendingProjects = await database.query('SELECT * FROM projects WHERE status = "pending"');
        console.log(`Found ${pendingProjects.length} pending projects`);
        
        // Get admin user
        const admin = await database.getAdminByEmail('admin@curtin.edu.au');
        if (!admin) {
            console.error('Admin user not found');
            return;
        }
        
        // Approve first 6 projects (leave some pending for testing)
        for (let i = 0; i < Math.min(6, pendingProjects.length); i++) {
            const project = pendingProjects[i];
            await database.updateProjectStatus(project.id, 'approved', admin.id);
            console.log(`✅ Approved: ${project.title}`);
        }
        
        // Leave remaining as pending
        for (let i = 6; i < pendingProjects.length; i++) {
            console.log(`⏳ Left pending: ${pendingProjects[i].title}`);
        }
        
        console.log('\n🎉 Project approval complete!');
        
    } catch (error) {
        console.error('Error approving projects:', error);
    } finally {
        await database.close();
    }
}

approveProjects();