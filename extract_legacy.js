const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const regex = /<script>(?:(?!(?:<\/script>)).)*fetch\(\"\/api\/content[^]*?<\/script>/is;
const match = content.match(regex);
if (match) {
  fs.writeFileSync('legacy_script.js', match[0]);
  console.log('Saved legacy script to legacy_script.js');
}
