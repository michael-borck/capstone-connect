---
layout: default
title: Project Overview
nav_order: 2
---

# Curtin Capstone Connect

A modern web-based project management system that connects industry clients with final-year students for meaningful capstone projects.

## 🎯 Project Purpose

Curtin Capstone Connect bridges the gap between industry challenges and student talent by providing:

- **Industry Partners** with access to skilled final-year students
- **Students** with real-world project experience
- **UC Staff** with tools to manage and oversee the entire process

## ✨ Key Features

### For Industry Clients
- **Easy Project Submission** - Submit project proposals through intuitive forms
- **Student Discovery** - Browse student profiles and skills
- **Project Management** - Track progress and communicate with teams
- **Multi-Phase Support** - Handle complex, multi-semester projects

### For Students
- **Project Browsing** - Discover opportunities that match your skills
- **Interest Expression** - Apply for projects with custom messages
- **Dashboard Management** - Track applications and project status
- **Portfolio Showcase** - Display completed work in the gallery
- **Favorites System** - Save interesting projects for later

### For UC Staff (Administrators)
- **Project Approval Workflow** - Review and approve industry submissions
- **User Management** - Manage students, clients, and staff accounts
- **Analytics Dashboard** - Monitor platform usage and success metrics
- **System Configuration** - Customize branding, rules, and features
- **Audit Logging** - Complete activity tracking for security

## 🚀 Quick Start

### Prerequisites
- Node.js (version 16.0.0 or higher)
- npm (comes with Node.js)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/michael-borck/capstone-connect.git
   cd capstone-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npm run setup-db
   npm run seed
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open your browser to `http://localhost:1077`
   - Default admin login: `admin@curtin.edu.au` / `admin123`

### Environment Configuration

Create a `.env` file for production settings:

```env
# Server Configuration
NODE_ENV=production
PORT=1077
HOST=localhost

# Security
JWT_SECRET=your-super-secure-jwt-secret-key
BCRYPT_ROUNDS=12

# Database
DB_PATH=./database/capstone.db

# Features
ANALYTICS_ENABLED=true
BACKUP_ENABLED=true
EMAIL_ENABLED=false
```

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│                 │    │                 │    │                 │
│ • Vanilla JS    │◄──►│ • Node.js       │◄──►│ • SQLite3       │
│ • HTML5/CSS3    │    │ • Express.js    │    │ • Migrations    │
│ • Responsive    │    │ • JWT Auth      │    │ • Audit Logs    │
│ • SPA Design    │    │ • REST APIs     │    │ • Settings      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

- **Authentication System** - JWT-based with role-based access
- **Project Management** - Complete lifecycle from submission to completion
- **User Management** - Students, clients, and administrators
- **Settings Engine** - Configurable branding, rules, and features
- **Audit System** - Comprehensive activity logging
- **Gallery System** - Showcase completed projects

## 📊 User Roles

### Students
- Browse and search available projects
- Express interest in projects
- Manage project applications
- Update profile and skills
- Access dashboard with personalized content

### Industry Clients
- Submit new project proposals
- Manage existing projects
- View and communicate with interested students
- Track project progress
- Access client dashboard

### UC Staff (Administrators)
- Approve/reject project submissions
- Manage all user accounts
- Configure system settings
- View analytics and reports
- Perform system maintenance

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Role-Based Access Control** - Granular permissions
- **Password Hashing** - bcrypt with configurable rounds
- **Rate Limiting** - Prevent abuse and DoS attacks
- **Input Validation** - Comprehensive data sanitization
- **CSRF Protection** - Cross-site request forgery prevention
- **XSS Protection** - Cross-site scripting mitigation
- **Security Headers** - Helmet.js security middleware

## 📈 Performance Features

- **Caching System** - Settings and frequent data caching
- **Compression** - Gzip compression for responses
- **Connection Pooling** - Efficient database connections
- **Static File Serving** - Optimized asset delivery
- **Responsive Design** - Mobile-first approach

## 🛠️ Development Features

- **Hot Reload** - Nodemon for development
- **Testing Suite** - Jest testing framework
- **Database Migrations** - Version-controlled schema changes
- **Seed Data** - Sample data for development
- **Backup System** - Automated database backups
- **Logging** - Comprehensive application logging

## 📋 Project Status

### Current Version: 1.0.0

**Completed Features:**
- ✅ User authentication and authorization
- ✅ Project submission and approval workflow
- ✅ Student interest expression system
- ✅ Admin dashboard and user management
- ✅ Settings configuration system
- ✅ Gallery and portfolio features
- ✅ Responsive design
- ✅ Security implementation

**Upcoming Features:**
- 🔄 Email notification system
- 🔄 Advanced analytics dashboard
- 🔄 API rate limiting enhancements
- 🔄 Mobile app integration
- 🔄 Real-time messaging system

## 📞 Support

- **Documentation**: [Full documentation site](https://michael-borck.github.io/capstone-connect/)
- **Issues**: [GitHub Issues](https://github.com/michael-borck/capstone-connect/issues)
- **Email**: support@curtin.edu.au

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](../LICENSE.md) file for details.

---

**Ready to get started?** Check out our [installation guide](support/installation.md) or dive into the [user workflows](workflows/) for your role!