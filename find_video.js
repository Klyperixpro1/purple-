const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const match = content.match(/<video[^>]*><\/video>/g);
if (match) {
    match.forEach(m => console.log(m));
} else {
    console.log('No video tags matched.');
}
