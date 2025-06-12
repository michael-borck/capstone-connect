# Database Indexes and Search Optimization

## Overview
This document outlines the database indexes and search optimization strategies implemented for the Curtin Capstone Project Management System.

## Standard Indexes

### Projects Table
- `idx_projects_status` - Optimizes filtering by project status (pending, approved, active, inactive)
- `idx_projects_client` - Fast lookups for client's projects
- `idx_projects_semester` - Filtering by semester availability
- `idx_projects_title` - Quick title-based searches
- `idx_projects_created` - Chronological sorting and date range queries

### Student Interests Table
- `idx_interests_student` - Fast retrieval of student's interests
- `idx_interests_project` - Quick lookup of project interest count
- `idx_interests_active` - Filtering active vs withdrawn interests

### Student Favorites Table
- `idx_favorites_student` - Fast retrieval of student's favorites
- `idx_favorites_project` - Quick favorite status checks

### Project Gallery Table
- `idx_gallery_status` - Filtering by approval status
- `idx_gallery_year` - Browsing by project year

### Analytics Table
- `idx_analytics_event` - Grouping by event type for reporting
- `idx_analytics_created` - Time-based analytics queries

## Full-Text Search (FTS5)

### Projects FTS Virtual Table
The `projects_fts` virtual table provides advanced text search capabilities:

**Indexed Fields:**
- Project title
- Project description
- Required skills
- Tools and technologies
- Client organization name

**Features:**
- Porter stemming for better match relevance
- Unicode support for international characters
- Phrase matching with quotes
- Boolean search operators (AND, OR, NOT)
- Prefix matching with wildcards

**Search Examples:**
```sql
-- Simple keyword search
SELECT * FROM projects_fts WHERE projects_fts MATCH 'javascript';

-- Phrase search
SELECT * FROM projects_fts WHERE projects_fts MATCH '"web development"';

-- Boolean search
SELECT * FROM projects_fts WHERE projects_fts MATCH 'python AND machine learning';

-- Prefix search
SELECT * FROM projects_fts WHERE projects_fts MATCH 'web*';
```

## Automatic Synchronization

### FTS Triggers
Three triggers maintain synchronization between the projects table and FTS index:
- `projects_fts_insert` - Adds new projects to FTS
- `projects_fts_update` - Updates FTS when projects change
- `projects_fts_delete` - Removes deleted projects from FTS

### Interest Count Triggers
Automatic interest count maintenance:
- `update_interest_count_insert` - Increments count when interest expressed
- `update_interest_count_update` - Updates count when interest withdrawn

### Timestamp Triggers
- `update_project_timestamp` - Updates project modification time automatically

## Performance Considerations

### Query Optimization Tips
1. **Use indexes effectively**: Filter by indexed columns first
2. **Limit result sets**: Use LIMIT for pagination
3. **Avoid SELECT ***: Select only needed columns
4. **Use transactions**: Group related operations for consistency

### Expected Performance
- **Project searches**: Sub-millisecond for keyword searches
- **Interest queries**: Instant retrieval for student dashboards
- **Admin operations**: Fast filtering and reporting
- **Analytics**: Efficient time-range and event-type queries

## Maintenance

### Index Monitoring
SQLite automatically maintains all indexes. No manual maintenance required.

### FTS Optimization
The FTS table will automatically optimize itself. For manual optimization:
```sql
INSERT INTO projects_fts(projects_fts) VALUES('optimize');
```

### Statistics Updates
SQLite auto-analyzes tables for query optimization. Manual analysis:
```sql
ANALYZE;
```