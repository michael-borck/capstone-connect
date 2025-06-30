// Script to extract gallery data from existing database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'capstone.db');

// Extract gallery data and save to a separate file
function extractGalleryData() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            const query = `
                SELECT title, description, year, category, client_name, team_members, outcomes, image_urls, status
                FROM project_gallery
                ORDER BY id
            `;
            
            db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const galleryData = rows.map(row => ({
                    title: row.title,
                    description: row.description,
                    year: row.year,
                    category: row.category,
                    clientName: row.client_name,
                    teamMembers: row.team_members,
                    outcomes: row.outcomes,
                    imageUrls: row.image_urls ? row.image_urls : null,
                    status: row.status || 'approved'
                }));
                
                db.close();
                resolve(galleryData);
            });
        });
    });
}

// Run if called directly
if (require.main === module) {
    extractGalleryData()
        .then(data => {
            const outputPath = path.join(__dirname, 'database', 'gallery-seed-data.js');
            const content = `// Extracted gallery data with images
module.exports = ${JSON.stringify(data, null, 4)};
`;
            fs.writeFileSync(outputPath, content);
            console.log(`Gallery data extracted to: ${outputPath}`);
            console.log(`Found ${data.length} gallery projects`);
        })
        .catch(error => {
            console.error('Error extracting gallery data:', error);
        });
}

module.exports = { extractGalleryData };