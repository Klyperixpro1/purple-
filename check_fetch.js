const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const match = content.match(/fetch\(['"`]\/api\/content/i);
if (match) {
  console.log("Found fetch:", content.substring(match.index, match.index + 200));
} else {
  console.log("No legacy fetch found in index.html!");
}
