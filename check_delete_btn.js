const fs = require('fs');
const content = fs.readFileSync('admin/js/admin.js', 'utf8');
const match = content.match(/<button[^>]*onclick=[\"']deletePortfolioItem[^>]*>/);
if (match) console.log(match[0]);
