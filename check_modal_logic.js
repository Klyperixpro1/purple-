const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const match = content.match(/"video"===o\)\{const t=l\.querySelector\("video"\)[^]+?t\.addEventListener[^}]+\}/);
if (match) console.log(match[0]);
