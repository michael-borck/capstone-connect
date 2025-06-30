// Simple script to create a Curtin-style logo
// Creates a simple text-based logo since we can't access external images

function createCurtinLogo() {
    // Simple SVG logo as base64
    const svg = `
<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="60" fill="#B8860B"/>
  <text x="100" y="25" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">CURTIN</text>
  <text x="100" y="45" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">UNIVERSITY</text>
</svg>`;
    
    // Convert to base64
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

// Output the logo
console.log('Curtin Logo (base64):');
console.log(createCurtinLogo());

module.exports = { createCurtinLogo };