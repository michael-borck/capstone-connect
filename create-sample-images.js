// Simple script to create sample images for gallery projects
const Canvas = require('canvas');

function createSampleImage(text, width = 600, height = 450) {
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#B8860B'); // Curtin gold
    gradient.addColorStop(1, '#2C2C2C'); // Dark gray
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Wrap text if too long
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width_test = ctx.measureText(currentLine + " " + word).width;
        if (width_test < width - 40) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    
    // Draw lines
    const lineHeight = 30;
    const startY = height / 2 - (lines.length - 1) * lineHeight / 2;
    
    lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + index * lineHeight);
    });
    
    return canvas.toDataURL('image/jpeg', 0.7);
}

function createThumbnail(text, width = 150, height = 150) {
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Create solid background
    ctx.fillStyle = '#B8860B'; // Curtin gold
    ctx.fillRect(0, 0, width, height);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Get first letter or abbreviation
    const abbrev = text.split(' ').map(word => word[0]).join('').substring(0, 3);
    ctx.fillText(abbrev, width / 2, height / 2);
    
    return canvas.toDataURL('image/jpeg', 0.6);
}

// Export for use in seed script
module.exports = { createSampleImage, createThumbnail };

// Test when run directly
if (require.main === module) {
    const sampleProjects = [
        'Smart Campus Navigation App',
        'Predictive Maintenance System', 
        'Blockchain Supply Chain Tracker',
        'Virtual Reality Training Simulator'
    ];
    
    sampleProjects.forEach(title => {
        const medium = createSampleImage(title);
        const thumbnail = createThumbnail(title);
        
        console.log(`${title}:`);
        console.log(`Medium: ${medium.substring(0, 100)}...`);
        console.log(`Thumbnail: ${thumbnail.substring(0, 100)}...`);
        console.log('---');
    });
}