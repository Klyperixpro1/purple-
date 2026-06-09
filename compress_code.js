const fs = require('fs');
const path = require('path');
const { minify: htmlMinify } = require('html-minifier-terser');
const { minify: jsMinify } = require('terser');

async function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            await processDirectory(fullPath);
        } else if (item.endsWith('.html')) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                const minified = await htmlMinify(content, {
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyCSS: true,
                    minifyJS: true,
                    removeAttributeQuotes: true
                });
                fs.writeFileSync(fullPath, minified);
                console.log(`Minified ${item}`);
            } catch (err) {
                console.error(`Error minifying ${item}:`, err.message);
            }
        } else if (item.endsWith('.js') || item.endsWith('.mjs')) {
            if (item.includes('compress')) continue; // skip my own scripts
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                const minified = await jsMinify(content, {
                    compress: { drop_console: true, passes: 2 },
                    mangle: true
                });
                if (minified.code) {
                    fs.writeFileSync(fullPath, minified.code);
                    console.log(`Minified ${item}`);
                }
            } catch (err) {
                console.error(`Error minifying ${item}:`, err.message);
            }
        }
    }
}

processDirectory(process.cwd()).then(() => {
    console.log('Finished minifying code files');
});
