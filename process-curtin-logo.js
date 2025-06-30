// Process the Curtin logo image and add to seed data
const fs = require('fs');
const path = require('path');

// Base64 representation of the Curtin logo (from the provided image)
// This is a manually created representation based on the shield design
function createCurtinLogoBase64() {
    // SVG recreation of the Curtin shield logo
    const svg = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120">
  <!-- Gold background -->
  <rect width="400" height="120" fill="#B8860B"/>
  
  <!-- Shield outline in white -->
  <g fill="white" transform="translate(50, 10)">
    <!-- Main shield shape -->
    <path d="M150 20 L150 70 Q150 85 135 90 L150 100 L165 90 Q150 85 150 70 Z" fill="white"/>
    
    <!-- Hexagon in center -->
    <polygon points="120,30 130,25 140,25 150,30 140,35 130,35" fill="#B8860B"/>
    
    <!-- Horizontal lines (left side) -->
    <rect x="70" y="25" width="40" height="4"/>
    <rect x="70" y="35" width="40" height="4"/>
    <rect x="70" y="45" width="40" height="4"/>
    <rect x="70" y="55" width="40" height="4"/>
    <rect x="70" y="65" width="35" height="4"/>
    <rect x="70" y="75" width="30" height="4"/>
    <rect x="70" y="85" width="25" height="4"/>
    
    <!-- Horizontal lines (right side) -->
    <rect x="190" y="25" width="40" height="4"/>
    <rect x="190" y="35" width="40" height="4"/>
    <rect x="190" y="45" width="40" height="4"/>
    <rect x="190" y="55" width="40" height="4"/>
    <rect x="195" y="65" width="35" height="4"/>
    <rect x="200" y="75" width="30" height="4"/>
    <rect x="205" y="85" width="25" height="4"/>
  </g>
  
  <!-- University text -->
  <text x="200" y="105" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">CURTIN UNIVERSITY</text>
</svg>`;

    // Convert to base64
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

// Update the database to include the logo
async function addLogoToDatabase() {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'database', 'capstone.db');
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            const logoBase64 = createCurtinLogoBase64();
            
            // Update the site_logo_url setting
            const updateQuery = `UPDATE config_settings SET setting_value = ? WHERE setting_key = 'site_logo_url'`;
            
            db.run(updateQuery, [logoBase64], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log('Curtin logo added to database successfully!');
                db.close();
                resolve(logoBase64);
            });
        });
    });
}

// Run if called directly
if (require.main === module) {
    addLogoToDatabase()
        .then(logoBase64 => {
            console.log('Logo base64 length:', logoBase64.length);
            console.log('Logo preview:', logoBase64.substring(0, 100) + '...');
        })
        .catch(error => {
            console.error('Error adding logo to database:', error);
        });
}

module.exports = { createCurtinLogoBase64, addLogoToDatabase };