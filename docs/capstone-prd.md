# Product Requirements Document: Curtin Capstone Project Management System

## Introduction/Overview

The Curtin Capstone Project Management System will replace the current manual process for connecting industry clients with final-year students for capstone projects. Currently, there is no easy way for clients to submit projects, the LMS project list is difficult to search and navigate, and students must email to express interest in a clunky process. This system will create a streamlined, web-based platform that makes it easy for industry partners to submit projects and for students to discover and express interest in meaningful capstone opportunities.

**Goal:** Create a simple, efficient platform that increases industry engagement and improves the student project selection experience while reducing administrative overhead for UC staff.

## Goals

1. **Increase Industry Participation:** Make it extremely easy for industry clients to submit project proposals without technical barriers
2. **Improve Student Experience:** Provide an intuitive way for students to browse, search, and express interest in projects
3. **Streamline Administration:** Give UC staff efficient tools to manage the approval workflow and track student interests
4. **Showcase Success:** Create a gallery of past projects to attract new industry partners and inspire students
5. **Reduce Manual Work:** Eliminate email-based interest expressions and manual project list management

## User Stories

### Industry Clients
- As an **industry professional**, I want to easily submit a project proposal online so that I can partner with students without complex bureaucracy
- As a **returning client**, I want to edit my project details after submission so that I can refine requirements based on UC feedback
- As a **potential client**, I want to see examples of past successful projects so that I understand what types of collaborations are possible
- As a **returning client**, I want to log back in to check the interest level in my submitted projects so that I can gauge student engagement
- As a **potential client**, I want to search active and past projects for inspiration so that I can understand what types of projects are successful

### Students
- As a **final-year student**, I want to browse available projects with clear descriptions so that I can find opportunities that match my interests and skills
- As a **student**, I want to save projects as favorites so that I can compare multiple options before expressing interest
- As a **student**, I want to see how popular each project is so that I can gauge competition and make informed choices
- As a **student**, I want to withdraw my interest from projects so that I can change my mind or reduce my selections
- As a **student**, I want to search and filter projects by keywords, type, and popularity so that I can quickly find relevant opportunities
- As a **student**, I want to search past projects for inspiration so that I can understand project quality and standards
- As a **student**, I want to be limited to 5 project interests so that I focus on realistic choices and don't overwhelm the system

### UC Staff/Admin
- As a **Unit Coordinator**, I want to review and approve project submissions so that only appropriate projects are visible to students
- As an **administrator**, I want to export student interest data to CSV so that I can work with the information offline for team formation
- As a **UC staff member**, I want to set semester availability for projects so that students see relevant opportunities for their enrollment period
- As an **administrator**, I want to approve past project gallery submissions so that we maintain quality and confidentiality standards
- As an **administrator**, I want to upload past project examples so that the gallery stays current and inspiring

## Functional Requirements

### Client Submission System
1. **FR1:** The system must allow clients to self-register with organization details (name, contact, email, phone, address)
2. **FR2:** The system must collect comprehensive project information including title, description, required skills, tools, and deliverables
3. **FR3:** The system must allow clients to edit their submissions before UC approval
4. **FR4:** The system must provide simple confirmation messages upon successful submission
5. **FR5:** The system must show submission status to clients (pending review, approved, active, etc.)
6. **FR6:** The system must allow clients to log back in to view interest levels in their projects
7. **FR7:** The system must provide search functionality for clients to browse their own projects and active/past projects for inspiration (filtered by permission level)

### Student Project Discovery
7. **FR7:** The system must display approved projects in an easy-to-browse grid layout
8. **FR8:** The system must provide search functionality with keyword, project type, and popularity filters for students
9. **FR9:** The system must allow students to search both active projects and past project gallery for inspiration
10. **FR10:** The system must show project popularity indicators (number of interested students)
11. **FR11:** The system must allow students to view detailed project information in modal/detailed view
12. **FR12:** The system must enable students to save projects as favorites (requires simple registration)
13. **FR13:** The system must allow students to express interest with name, email, and brief message
14. **FR14:** The system must limit students to expressing interest in a maximum of 5 projects
15. **FR15:** The system must allow students to withdraw their interest from projects

### Student Registration
16. **FR16:** The system must allow simple student self-enrollment with email and password
17. **FR17:** The system must protect student accounts with basic authentication
18. **FR18:** The system must allow students to view their interest history and favorites

### Administrative Functions
19. **FR19:** The system must provide UC staff login for administrative functions
20. **FR20:** The system must allow UC staff to approve/reject client project submissions
21. **FR21:** The system must enable UC staff to toggle project status (active/inactive)
22. **FR22:** The system must allow UC staff to set semester availability for projects (Semester 1, Semester 2, or Both)
23. **FR23:** The system must provide comprehensive search and filter functionality for UC staff across all projects (pending, active, past)
24. **FR24:** The system must allow UC staff to export student interest data to CSV format
25. **FR25:** The system must enable UC staff to upload and manage past project gallery items
26. **FR26:** The system must allow UC staff to add individual students or bulk import via CSV
27. **FR27:** The system must require UC approval before displaying past project gallery items
28. **FR28:** The system must provide analytics dashboard showing popular projects, project types, client engagement trends, and semester statistics
29. **FR29:** The system must allow UC staff to export complete database backup
30. **FR30:** The system must provide data export functionality for all major data sets

### Project Gallery
31. **FR31:** The system must display past successful projects with title, year, description, and images
32. **FR32:** The system must allow filtering/browsing of gallery items by year or category
33. **FR33:** The system must provide search functionality within the project gallery

### Data Management
34. **FR34:** The system must use SQLite database for all data storage
35. **FR35:** The system must track project interest counts automatically
36. **FR36:** The system must maintain audit trail of project status changes
37. **FR37:** The system must display semester availability indicators for projects (Semester 1, Semester 2, Both)
38. **FR38:** The system must track analytics data for popular project types, client engagement patterns, and interest trends
39. **FR39:** The system must index project content for efficient search functionality (title, description, skills, client name)

## Non-Goals (Out of Scope)

- **Email notifications/automation:** Keep it simple, rely on manual status checking
- **Complex matching algorithms:** UC staff will handle team formation offline
- **In-app messaging:** All communication happens outside the system
- **Email verification for registration:** Trust-based system, address abuse if it occurs
- **Mobile app:** Web-responsive interface only
- **Integration with university LMS:** Standalone system for now due to complexity and cost
- **Advanced reporting/analytics:** Basic CSV export is sufficient, though simple analytics dashboard will be included
- **Multi-semester/year project tracking:** Focus on current semester only
- **Real-time notifications:** No email or push notifications - users check status manually

## Design Considerations

- **Technology Stack:** Vanilla HTML/CSS/JavaScript with Node.js backend and SQLite database
- **Design Philosophy:** Clean, simple interface similar to the provided mockup
- **Responsive Design:** Must work well on both desktop and mobile browsers
- **Accessibility:** Use semantic HTML and proper contrast ratios
- **Performance:** Optimize for fast loading with minimal dependencies

## Technical Considerations

- **Database:** SQLite is sufficient for expected load (50 projects, 200 students per semester)
- **Hosting:** Should be deployable on university servers or simple cloud hosting
- **Security:** Basic form validation and SQL injection protection
- **Backup:** Simple file-based backup of SQLite database
- **Scalability:** Architecture should allow easy migration to PostgreSQL if needed

## Success Metrics

- **Industry Engagement:** 50% increase in project submissions compared to manual process
- **Student Satisfaction:** Positive feedback on ease of browsing and expressing interest
- **Administrative Efficiency:** 75% reduction in email-based project management
- **System Usage:** 90% of enrolled students use the system to express project interest
- **Project Completion:** Maintain or improve current project success rates

## Open Questions

~~1. Should there be a deadline for project submissions each semester?~~
**Resolved:** No deadlines, but projects will be tagged with semester availability (Semester 1, Semester 2, or Both)

~~2. Do we need any integration points prepared for future LMS connection?~~
**Resolved:** No LMS integration planned due to complexity and institutional costs

~~3. Should students be able to withdraw interest, or is it one-way only?~~
**Resolved:** Students can withdraw interest to allow flexibility in their choices

~~4. What approval process should we have for past project gallery submissions?~~
**Resolved:** Simple UC/Admin approval process, assuming compliance with NDAs and confidentiality

~~5. Should we limit the number of projects a student can express interest in?~~
**Resolved:** Maximum of 5 projects per student to encourage focused selection

~~6. Should we add any basic analytics for UC staff?~~
**Resolved:** Yes, include analytics dashboard with popular projects, project types, client engagement trends

~~7. Should clients be able to see interest in their projects?~~
**Resolved:** Yes, clients can log back in to view interest levels in their submitted projects

~~8. Do we need backup/export functionality?~~
**Resolved:** Yes, include database backup and data export capabilities

### No Remaining Questions
All major requirements have been clarified and documented.

---

*This PRD serves as the foundation for implementing a streamlined capstone project management system that will improve the experience for all stakeholders while maintaining simplicity and ease of use.*