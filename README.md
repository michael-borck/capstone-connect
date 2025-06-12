# Capstone Connect

A comprehensive project management system designed to connect students with real-world capstone projects from industry partners. Initially built for Curtin University, with plans for multi-institutional customization.

## 🌟 Features

### For Students
- **Project Discovery**: Browse approved capstone projects with advanced filtering by semester, type, and popularity
- **Interest Management**: Express interest in up to 5 projects with validation and tracking
- **Favorites System**: Save interesting projects for later review (up to 20 favorites)
- **Interactive Dashboard**: Track interest history, favorites, and application status
- **Secure Authentication**: Student-specific login with email validation

### For Industry Partners (Clients)
- **Project Submission**: Create and submit detailed project proposals
- **Status Tracking**: Monitor project approval status (pending, approved, rejected)
- **Student Interest Monitoring**: View students who have expressed interest
- **Project Management**: Edit pending projects and resubmit rejected ones
- **Organization Dashboard**: Comprehensive overview of all submitted projects

### For Administrators
- **Project Approval Workflow**: Review and approve/reject submitted projects
- **User Management**: Oversee student and client registrations
- **Analytics & Reporting**: Track system usage and project popularity
- **Audit Logging**: Complete audit trail of all system activities

## 🏗️ Architecture

### Backend
- **Node.js + Express.js**: RESTful API server with comprehensive middleware
- **SQLite Database**: Lightweight, file-based database with full-text search
- **JWT Authentication**: Secure token-based authentication for all user types
- **Input Validation**: Comprehensive validation using express-validator
- **Security Middleware**: Helmet, CORS, rate limiting, and XSS protection
- **Logging System**: File and database logging with error tracking

### Frontend
- **Vanilla JavaScript**: No framework dependencies for maximum compatibility
- **Responsive Design**: Mobile-first CSS with modern layouts
- **Real-time Updates**: Dynamic UI updates without page refreshes
- **Modal-based Interface**: Clean, focused user interactions
- **Progressive Enhancement**: Works across all modern browsers

### Database Schema
- **Users**: Students, clients, and administrators with role-based access
- **Projects**: Complete project lifecycle management
- **Interests**: Student-project relationship tracking
- **Favorites**: Personal project bookmarking system
- **Analytics**: Usage tracking and reporting data
- **Audit Logs**: Complete activity auditing

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/capstone-connect.git
   cd capstone-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npm run setup
   ```

4. **Seed with sample data (optional)**
   ```bash
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Access the application**
   - Open http://localhost:3000 in your browser
   - The application will be ready to use!

## 📁 Project Structure

```
capstone-connect/
├── config/
│   └── config.js              # Application configuration
├── database/
│   ├── schema.sql             # Database schema definitions
│   ├── seedData.js            # Sample data for development
│   └── db.js                  # Database connection and methods
├── middleware/
│   ├── auth.js                # Authentication middleware
│   ├── validation.js          # Input validation rules
│   ├── security.js            # Security middleware
│   ├── errorHandler.js        # Error handling
│   └── requestLogger.js       # Request logging
├── routes/
│   ├── auth.js                # Authentication endpoints
│   ├── projects.js            # Project management
│   ├── students.js            # Student-specific features
│   ├── clients.js             # Client dashboard and management
│   └── admin.js               # Administrative functions
├── public/
│   ├── css/
│   │   └── styles.css         # Application styles
│   ├── js/
│   │   ├── app.js             # Main application logic
│   │   ├── auth.js            # Authentication handling
│   │   ├── search.js          # Search functionality
│   │   ├── studentRegistration.js
│   │   └── clientRegistration.js
│   └── index.html             # Single-page application
├── utils/
│   └── logger.js              # Logging utilities
├── server.js                  # Express server setup
└── package.json               # Dependencies and scripts
```

## 🔧 Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run seed` - Populate database with sample data
- `npm run backup` - Create database backup
- `npm run export` - Export data to JSON
- `npm test` - Run test suite (coming soon)

### Environment Configuration

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
DB_PATH=./database/capstone.db
LOG_LEVEL=info
```

### API Endpoints

#### Authentication
- `POST /api/auth/register/student` - Student registration
- `POST /api/auth/register/client` - Client registration
- `POST /api/auth/login/student` - Student login
- `POST /api/auth/login/client` - Client login
- `POST /api/auth/login/admin` - Admin login
- `POST /api/auth/logout` - Logout (all users)

#### Projects
- `GET /api/projects` - Get all approved projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project (clients)
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Students
- `POST /api/students/interests` - Express interest in project
- `DELETE /api/students/interests/:id` - Withdraw interest
- `GET /api/students/interests` - Get student's interests
- `POST /api/students/favorites` - Add project to favorites
- `GET /api/students/dashboard` - Student dashboard data

#### Administration
- `GET /api/projects/admin/pending` - Get pending projects
- `PATCH /api/projects/:id/status` - Approve/reject projects
- `GET /api/admin/logs` - System logs
- `GET /api/admin/analytics` - Usage analytics

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password hashing
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive server-side validation
- **XSS Protection**: Content Security Policy and input sanitization
- **CSRF Protection**: Cross-site request forgery protection
- **Audit Logging**: Complete activity tracking
- **Error Handling**: Secure error responses

## 🎯 Current Status

### Completed Features ✅
- ✅ Database setup and architecture
- ✅ Express.js server with comprehensive middleware
- ✅ Three-tier authentication system (students, clients, admins)
- ✅ Project CRUD operations with validation
- ✅ Client registration and project dashboard
- ✅ Student registration and login
- ✅ Project browsing with filters and popularity indicators
- ✅ Project detail modal with full information
- ✅ Favorites functionality for students
- ✅ Interest expression system with 5-project limit validation

### In Progress 🚧
- 🚧 Student dashboard with interest history and favorites
- 🚧 Interest withdrawal functionality
- 🚧 Admin portal and management tools

### Planned Features 📋
- 📋 Advanced search and analytics
- 📋 Email notifications
- 📋 File upload capabilities
- 📋 Multi-institutional configuration
- 📋 API documentation
- 📋 Comprehensive testing suite
- 📋 Docker containerization

## 🌍 Multi-Institutional Vision

While currently configured for Curtin University (with email validation specific to Curtin domains), the system is designed with multi-institutional deployment in mind. Future versions will include:

- **Configurable Institution Settings**: Easy setup for any university
- **Custom Branding**: Institution-specific logos and colors
- **Flexible Email Domains**: Support for multiple email domain validation
- **Tenant Management**: Multi-tenant architecture for hosting multiple institutions
- **Custom Workflows**: Institution-specific approval processes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for Curtin University's capstone program
- Designed to bridge the gap between academia and industry
- Inspired by the need for better student-industry collaboration

## 📞 Support

For support, please contact the development team or create an issue in the GitHub repository.

---

**Built with ❤️ for connecting students with real-world opportunities**