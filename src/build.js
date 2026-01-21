// Build script to bundle pages into worker.js
// This reads HTML files and inlines them into the worker

const fs = require('fs');
const path = require('path');

// Read HTML files
const gatewayPageHTML = fs.readFileSync(path.join(__dirname, 'pages/gateway/index.html'), 'utf-8');
const coachingPageHTML = fs.readFileSync(path.join(__dirname, 'pages/coaching/index.html'), 'utf-8');

// Read worker template
const workerTemplate = fs.readFileSync(path.join(__dirname, 'worker-template.js'), 'utf-8');

// Escape template literals properly
function escapeForTemplate(html) {
  return html
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/`/g, '\\`')     // Escape backticks
    .replace(/\$/g, '\\$');   // Escape dollar signs
}

// Replace placeholders with actual HTML
let workerContent = workerTemplate
  .replace('__GATEWAY_PAGE_HTML__', escapeForTemplate(gatewayPageHTML))
  .replace('__COACHING_PAGE_HTML__', escapeForTemplate(coachingPageHTML));

// Write to root worker.js
fs.writeFileSync(path.join(__dirname, '../worker.js'), workerContent);

console.log('✅ Worker built successfully!');
console.log('📦 Pages bundled:');
console.log('   - Gateway block page (/gateway/)');
console.log('   - Coaching page (/coaching/)');
