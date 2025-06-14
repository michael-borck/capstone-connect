const bcrypt = require('bcrypt');
const database = require('./db');

// Sample data for development and testing
const seedData = {
    // Admin users (UC staff)
    adminUsers: [
        {
            email: 'admin@curtin.edu.au',
            password: 'admin123',
            fullName: 'Dr. Sarah Wilson',
        },
        {
            email: 'coordinator@curtin.edu.au',
            password: 'coord123',
            fullName: 'Prof. Michael Chen',
        }
    ],

    // Industry clients
    clients: [
        {
            email: 'projects@techcorp.com.au',
            password: 'tech123',
            organizationName: 'TechCorp Australia',
            contactName: 'Jennifer Smith',
            phone: '+61 8 9266 1234',
            address: '123 Innovation Drive, Perth WA 6000'
        },
        {
            email: 'partnerships@miningco.com.au',
            password: 'mine123',
            organizationName: 'Mining Solutions Ltd',
            contactName: 'Robert Johnson',
            phone: '+61 8 9266 5678',
            address: '456 Resource Road, Perth WA 6001'
        },
        {
            email: 'digital@healthplus.com.au',
            password: 'health123',
            organizationName: 'HealthPlus Digital',
            contactName: 'Dr. Emily Davis',
            phone: '+61 8 9266 9012',
            address: '789 Medical Centre, Perth WA 6002'
        },
        {
            email: 'innovation@startuplab.com.au',
            password: 'startup123',
            organizationName: 'StartupLab Incubator',
            contactName: 'Alex Thompson',
            phone: '+61 8 9266 3456',
            address: '321 Venture Street, Perth WA 6003'
        },
        {
            email: 'research@energyco.com.au',
            password: 'energy123',
            organizationName: 'GreenEnergy Co',
            contactName: 'Maria Rodriguez',
            phone: '+61 8 9266 7890',
            address: '654 Renewable Ave, Perth WA 6004'
        }
    ],

    // Sample students
    students: [
        {
            email: 'john.doe@student.curtin.edu.au',
            password: 'student123',
            fullName: 'John Doe',
            studentId: '20123456'
        },
        {
            email: 'jane.smith@student.curtin.edu.au',
            password: 'student123',
            fullName: 'Jane Smith',
            studentId: '20123457'
        },
        {
            email: 'mike.wilson@student.curtin.edu.au',
            password: 'student123',
            fullName: 'Mike Wilson',
            studentId: '20123458'
        },
        {
            email: 'sarah.jones@student.curtin.edu.au',
            password: 'student123',
            fullName: 'Sarah Jones',
            studentId: '20123459'
        },
        {
            email: 'david.brown@student.curtin.edu.au',
            password: 'student123',
            fullName: 'David Brown',
            studentId: '20123460'
        }
    ],

    // Sample projects
    projects: [
        {
            title: 'E-commerce Platform Development',
            description: 'Build a modern e-commerce platform with React frontend and Node.js backend. The platform should include user authentication, product catalog, shopping cart, payment integration, and admin dashboard. Focus on responsive design and performance optimization.',
            requiredSkills: 'JavaScript, React, Node.js, MongoDB/PostgreSQL, REST APIs, HTML/CSS',
            tools: 'VS Code, Git, Docker, Stripe API, AWS/Azure',
            deliverables: 'Full-stack web application, source code, documentation, deployment guide',
            semesterAvailability: 'both',
            projectType: 'software',
            durationWeeks: 12,
            maxStudents: 4,
            clientIndex: 0 // TechCorp
        },
        {
            title: 'IoT Sensor Data Analytics Dashboard',
            description: 'Develop a real-time dashboard for visualizing IoT sensor data from mining equipment. The system should collect data from various sensors, process it in real-time, and provide insights through interactive charts and alerts.',
            requiredSkills: 'Python, Data Analytics, IoT protocols, Dashboard frameworks, Database design',
            tools: 'Python (Pandas, Flask), InfluxDB, Grafana, MQTT, Raspberry Pi',
            deliverables: 'Analytics dashboard, data processing pipeline, sensor integration code, user manual',
            semesterAvailability: 'semester1',
            projectType: 'hardware',
            durationWeeks: 16,
            maxStudents: 3,
            clientIndex: 1 // Mining Solutions
        },
        {
            title: 'Patient Health Monitoring Mobile App',
            description: 'Create a mobile application for patients to track their health metrics, medication schedules, and communicate with healthcare providers. Include features for data visualization, reminder notifications, and secure messaging.',
            requiredSkills: 'Mobile development (React Native/Flutter), Healthcare APIs, Security, UI/UX',
            tools: 'React Native/Flutter, Firebase, HL7 FHIR, Push notifications',
            deliverables: 'Mobile app (iOS/Android), backend API, privacy compliance documentation',
            semesterAvailability: 'both',
            projectType: 'design',
            durationWeeks: 12,
            maxStudents: 4,
            clientIndex: 2 // HealthPlus
        },
        {
            title: 'Startup Pitch Evaluation Platform',
            description: 'Build a web platform where startups can submit their pitches and investors can evaluate them. Include video upload, scoring systems, feedback mechanisms, and analytics for tracking startup progress.',
            requiredSkills: 'Full-stack development, Video processing, Database design, Analytics',
            tools: 'React, Node.js, PostgreSQL, Video streaming APIs, Chart.js',
            deliverables: 'Web platform, evaluation algorithms, admin panel, analytics reports',
            semesterAvailability: 'semester2',
            projectType: 'business',
            durationWeeks: 20,
            maxStudents: 5,
            clientIndex: 3 // StartupLab
        },
        {
            title: 'Renewable Energy Optimization System',
            description: 'Develop a system to optimize renewable energy distribution using machine learning. The system should predict energy demand, optimize battery storage, and provide recommendations for energy trading.',
            requiredSkills: 'Machine Learning, Python, Energy systems, Data science, API development',
            tools: 'Python (scikit-learn, TensorFlow), REST APIs, Time-series databases',
            deliverables: 'ML models, optimization algorithms, API endpoints, performance analysis',
            semesterAvailability: 'both',
            projectType: 'data',
            durationWeeks: 16,
            maxStudents: 3,
            clientIndex: 4 // GreenEnergy
        },
        {
            title: 'Inventory Management System',
            description: 'Create a comprehensive inventory management system for small businesses. Include barcode scanning, stock tracking, supplier management, and automated reordering features.',
            requiredSkills: 'Web development, Database design, Barcode integration, Business logic',
            tools: 'Vue.js, Python/Django, PostgreSQL, Barcode APIs',
            deliverables: 'Web application, mobile scanner app, integration guides, training materials',
            semesterAvailability: 'semester1',
            projectType: 'software',
            durationWeeks: 12,
            maxStudents: 4,
            clientIndex: 0 // TechCorp
        },
        {
            title: 'Environmental Impact Assessment Tool',
            description: 'Build a tool to assess and visualize environmental impact of mining operations. Include data collection interfaces, impact calculation algorithms, and reporting dashboards for regulatory compliance.',
            requiredSkills: 'GIS, Environmental science, Data visualization, Regulatory compliance',
            tools: 'QGIS, Python, Leaflet/Mapbox, PostgreSQL with PostGIS',
            deliverables: 'Assessment tool, GIS integration, compliance reports, user documentation',
            semesterAvailability: 'both',
            projectType: 'research',
            durationWeeks: 20,
            maxStudents: 2,
            clientIndex: 1 // Mining Solutions
        },
        {
            title: 'Telemedicine Consultation Platform',
            description: 'Develop a secure video consultation platform for healthcare providers and patients. Include appointment scheduling, video calling, prescription management, and patient records integration.',
            requiredSkills: 'WebRTC, Security protocols, Healthcare compliance, Real-time communication',
            tools: 'WebRTC, Socket.io, HIPAA-compliant hosting, Calendar APIs',
            deliverables: 'Video platform, scheduling system, security documentation, compliance audit',
            semesterAvailability: 'semester2',
            projectType: 'software',
            durationWeeks: 16,
            maxStudents: 4,
            clientIndex: 2 // HealthPlus
        }
    ],

    // Sample gallery projects (past successful projects)
    galleryProjects: [
        {
            title: 'Smart Campus Navigation App',
            description: 'An AR-enabled mobile app that helps students navigate the Curtin campus with real-time directions, building information, and event notifications.',
            year: 2023,
            category: 'Mobile Development',
            clientName: 'Curtin University',
            teamMembers: 'Alice Cooper, Bob Taylor, Charlie Davis',
            outcomes: 'Successfully deployed to 5000+ students, 40% reduction in late arrivals to classes',
            imageUrls: '[]'
        },
        {
            title: 'Predictive Maintenance System',
            description: 'IoT-based system for predicting equipment failures in manufacturing plants using machine learning algorithms.',
            year: 2023,
            category: 'IoT & Machine Learning',
            clientName: 'Industrial Solutions Ltd',
            teamMembers: 'Diana Wilson, Ethan Moore, Fiona Clark',
            outcomes: '30% reduction in unplanned downtime, $200K annual savings',
            imageUrls: '[]'
        },
        {
            title: 'Blockchain Supply Chain Tracker',
            description: 'Transparent supply chain tracking system using blockchain technology for food safety and authenticity verification.',
            year: 2022,
            category: 'Blockchain',
            clientName: 'FreshFood Co',
            teamMembers: 'George Martinez, Helen Lee, Ian Rodriguez',
            outcomes: 'Improved traceability by 95%, enhanced consumer trust',
            imageUrls: '[]'
        },
        {
            title: 'Virtual Reality Training Simulator',
            description: 'VR training simulator for mining safety procedures with realistic hazard scenarios and performance tracking.',
            year: 2022,
            category: 'Virtual Reality',
            clientName: 'SafeMining Corp',
            teamMembers: 'Jack Thompson, Kate Anderson, Liam Wright',
            outcomes: '50% improvement in safety test scores, reduced training time by 30%',
            imageUrls: '[]'
        }
    ]
};

// Hash password function
async function hashPassword(password) {
    const saltRounds = 12; // Use same rounds as config
    return await bcrypt.hash(password, saltRounds);
}

// Seed admin users
async function seedAdminUsers() {
    console.log('Seeding admin users...');
    for (const admin of seedData.adminUsers) {
        const hashedPassword = await hashPassword(admin.password);
        try {
            await database.createAdmin(admin.email, hashedPassword, admin.fullName);
            console.log(`Created admin: ${admin.email}`);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
                console.log(`Admin already exists: ${admin.email}`);
            } else {
                console.error(`Error creating admin ${admin.email}:`, error.message);
            }
        }
    }
}

// Seed clients
async function seedClients() {
    console.log('Seeding clients...');
    for (const client of seedData.clients) {
        const hashedPassword = await hashPassword(client.password);
        try {
            await database.createClient(
                client.email, 
                hashedPassword, 
                client.organizationName, 
                client.contactName, 
                client.phone, 
                client.address
            );
            console.log(`Created client: ${client.organizationName}`);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
                console.log(`Client already exists: ${client.email}`);
            } else {
                console.error(`Error creating client ${client.email}:`, error.message);
            }
        }
    }
}

// Seed students
async function seedStudents() {
    console.log('Seeding students...');
    for (const student of seedData.students) {
        const hashedPassword = await hashPassword(student.password);
        try {
            await database.createStudent(
                student.email, 
                hashedPassword, 
                student.fullName, 
                student.studentId
            );
            console.log(`Created student: ${student.fullName}`);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
                console.log(`Student already exists: ${student.email} or student ID: ${student.studentId}`);
            } else {
                console.error(`Error creating student ${student.email}:`, error.message);
            }
        }
    }
}

// Seed projects with different statuses
async function seedProjects() {
    console.log('Seeding projects with various statuses...');
    
    // Get client IDs and admin for approvals
    const clients = [];
    for (const clientData of seedData.clients) {
        const client = await database.getClientByEmail(clientData.email);
        if (client) {
            clients.push(client);
        }
    }
    
    const admin = await database.getAdminByEmail('admin@curtin.edu.au');
    
    // Define what status each project should have (for realistic testing)
    const projectStatuses = [
        'approved',   // Project 0 - E-commerce Platform (popular, has interests)
        'active',     // Project 1 - IoT Dashboard (currently active)
        'approved',   // Project 2 - Health App (approved, getting interest)
        'pending',    // Project 3 - Startup Platform (waiting for approval)
        'approved',   // Project 4 - Energy System (approved but less popular)
        'pending',    // Project 5 - Inventory System (pending review)
        'rejected',   // Project 6 - Environmental Tool (rejected for revision)
        'approved'    // Project 7 - Telemedicine (newly approved)
    ];

    for (let i = 0; i < seedData.projects.length; i++) {
        const project = seedData.projects[i];
        const client = clients[project.clientIndex];
        const status = projectStatuses[i] || 'pending';
        
        if (client) {
            try {
                const result = await database.createProject(
                    client.id,
                    project.title,
                    project.description,
                    project.requiredSkills,
                    project.tools,
                    project.deliverables,
                    project.semesterAvailability,
                    project.projectType,
                    project.durationWeeks,
                    project.maxStudents
                );
                
                // Update project status if not pending
                if (status !== 'pending') {
                    if (status === 'approved' || status === 'active') {
                        await database.run(
                            `UPDATE projects SET status = ?, approved_by = ?, approved_at = datetime('now', '-' || (ABS(RANDOM()) % 10 + 1) || ' days') WHERE id = ?`,
                            [status, admin ? admin.id : null, result.id]
                        );
                    } else if (status === 'rejected') {
                        const rejectionReasons = [
                            'Project scope is too broad for a capstone project. Please narrow the focus to a specific feature or component.',
                            'Technical requirements are unclear. Please provide more details about the technologies and skills needed.',
                            'Project description lacks sufficient detail about deliverables and expected outcomes.',
                            'This project appears to be commercial work rather than educational. Please revise to focus on learning objectives.',
                            'Timeline and scope need adjustment to fit within the capstone timeframe. Please consider reducing complexity.'
                        ];
                        const randomReason = rejectionReasons[Math.floor(Math.random() * rejectionReasons.length)];
                        
                        await database.run(
                            `UPDATE projects SET status = ?, rejection_reason = ? WHERE id = ?`,
                            [status, randomReason, result.id]
                        );
                    } else {
                        await database.run(`UPDATE projects SET status = ? WHERE id = ?`, [status, result.id]);
                    }
                }
                
                console.log(`  Created project (${status}): ${project.title}`);
                
            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
                    console.log(`Project already exists: ${project.title}`);
                } else {
                    console.error(`Error creating project ${project.title}:`, error.message);
                }
            }
        }
    }
}

// Seed gallery projects
async function seedGalleryProjects() {
    console.log('Seeding gallery projects...');
    
    const admin = await database.getAdminByEmail('admin@curtin.edu.au');
    
    for (const gallery of seedData.galleryProjects) {
        try {
            const sql = `INSERT INTO project_gallery 
                        (title, description, year, category, client_name, team_members, outcomes, image_urls, status, submitted_by, approved_by, approved_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, CURRENT_TIMESTAMP)`;
            
            await database.run(sql, [
                gallery.title,
                gallery.description,
                gallery.year,
                gallery.category,
                gallery.clientName,
                gallery.teamMembers,
                gallery.outcomes,
                gallery.imageUrls,
                admin ? admin.id : null,
                admin ? admin.id : null
            ]);
            
            console.log(`Created gallery project: ${gallery.title}`);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
                console.log(`Gallery project already exists: ${gallery.title}`);
            } else {
                console.error(`Error creating gallery project ${gallery.title}:`, error.message);
            }
        }
    }
}

// Seed realistic student interests and favorites
async function seedInterests() {
    console.log('Seeding realistic student interests and favorites...');
    
    const students = await database.query('SELECT * FROM students ORDER BY id');
    const approvedProjects = await database.query('SELECT * FROM projects WHERE status IN ("approved", "active") ORDER BY id');
    
    if (approvedProjects.length === 0) {
        console.log('No approved projects found, skipping interest seeding');
        return;
    }
    
    // Define realistic interest patterns for each student
    const studentInterestPatterns = [
        { studentIndex: 0, projectIndices: [0, 2, 4], messages: ['Strong background in web development and e-commerce systems', 'Healthcare tech interests me greatly', 'Passionate about sustainable technology'] },
        { studentIndex: 1, projectIndices: [1, 0], messages: ['IoT and data analytics are my specialties', 'Full-stack development experience'] },
        { studentIndex: 2, projectIndices: [2, 7, 1], messages: ['Mobile app development is my passion', 'Telemedicine could revolutionize healthcare', 'Love working with sensor data'] },
        { studentIndex: 3, projectIndices: [0, 4, 7], messages: ['E-commerce platforms fascinate me', 'Environmental impact is important to me', 'Healthcare technology has huge potential'] },
        { studentIndex: 4, projectIndices: [1, 2, 4], messages: ['Data visualization and analytics expert', 'Mobile health apps are the future', 'Renewable energy technology enthusiast'] }
    ];
    
    // Add interests based on patterns
    for (const pattern of studentInterestPatterns) {
        if (pattern.studentIndex < students.length) {
            const student = students[pattern.studentIndex];
            
            for (let i = 0; i < pattern.projectIndices.length; i++) {
                const projectIndex = pattern.projectIndices[i];
                if (projectIndex < approvedProjects.length) {
                    const project = approvedProjects[projectIndex];
                    const message = pattern.messages[i] || `Very interested in ${project.title}`;
                    
                    try {
                        await database.expressInterest(student.id, project.id, message);
                        console.log(`  ${student.full_name} expressed interest in "${project.title}"`);
                    } catch (error) {
                        // Silently ignore duplicate interests
                    }
                }
            }
            
            // Add some favorites (students favorite projects they might be interested in later)
            const favoriteIndices = pattern.projectIndices.concat([
                (pattern.projectIndices[0] + 1) % approvedProjects.length,
                (pattern.projectIndices[0] + 2) % approvedProjects.length
            ]);
            
            for (const projectIndex of favoriteIndices) {
                if (projectIndex < approvedProjects.length) {
                    const project = approvedProjects[projectIndex];
                    try {
                        await database.run(
                            'INSERT OR IGNORE INTO student_favorites (student_id, project_id) VALUES (?, ?)',
                            [student.id, project.id]
                        );
                    } catch (error) {
                        // Silently ignore duplicate favorites
                    }
                }
            }
        }
    }
    
    // Add some additional random interests to make popular projects more realistic
    const popularProjects = [0, 1, 2]; // E-commerce, IoT, Health App
    for (const projectIndex of popularProjects) {
        if (projectIndex < approvedProjects.length) {
            const project = approvedProjects[projectIndex];
            
            // Add 2-3 more random students to popular projects
            const additionalStudents = students.slice(0, 3);
            for (let i = 0; i < 2; i++) {
                const student = additionalStudents[i];
                if (student) {
                    try {
                        await database.expressInterest(
                            student.id, 
                            project.id, 
                            'This project aligns perfectly with my career goals and technical interests.'
                        );
                        console.log(`  Additional interest: ${student.full_name} → "${project.title}"`);
                    } catch (error) {
                        // Silently ignore duplicate interests
                    }
                }
            }
        }
    }
    
    console.log('Interest and favorites seeding completed');
}

// Main seeding function
async function seedDatabase() {
    try {
        console.log('Starting database seeding...');
        
        // Initialize database connection
        await database.init();
        
        // Seed in order (respecting foreign key constraints)
        await seedAdminUsers();
        await seedClients();
        await seedStudents();
        await seedProjects();
        await seedGalleryProjects();
        await seedInterests();
        
        console.log('Database seeding completed successfully!');
        
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

// Export for use in other scripts
module.exports = {
    seedDatabase,
    seedData,
    hashPassword
};

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase().then(() => {
        console.log('Seeding finished. You can now start the application.');
        process.exit(0);
    }).catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
}