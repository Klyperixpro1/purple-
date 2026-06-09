const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Find the IIFE that fetches /api/content and removes it
const regex = /\!async function\(\)\{.*?fetch\(\"\/api\/content.*?\.*?\}catch\(.*?\).*?\}\(\);/is;
const match = content.match(regex);
if (match) {
    console.log("Found fetch block:", match[0].substring(0, 50) + "...");
    content = content.replace(regex, '');
    fs.writeFileSync('index.html', content);
    console.log("Removed legacy fetch block.");
} else {
    // try another regex if first fails
    const fallback = /fetch\(\"\/api\/content[^]+?catch\([^\)]+\)\{[^\}]+\}\s*e=!0\}\(\);/i;
    const fbMatch = content.match(fallback);
    if(fbMatch) {
       console.log("Found fallback fetch block:", fbMatch[0].substring(0, 50) + "...");
       content = content.replace(fallback, '');
       fs.writeFileSync('index.html', content);
       console.log("Removed fallback legacy fetch block.");
    } else {
       console.log("Could not find fetch block.");
    }
}
