const fs = require('fs');
const content = fs.readFileSync('public/api_client.js', 'utf8');
const match = content.match(/fetch\(['"]\/api\/content[^'"]*['"]/);
if (match) console.log(match[0]);
