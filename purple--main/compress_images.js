const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item.endsWith('.tmp')) continue;
        const fullPath = path.join(dir, item);
        if (!fs.existsSync(fullPath)) continue;
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            await processDirectory(fullPath);
        } else if (item.endsWith('.webp') || item.endsWith('.png') || item.endsWith('.jpg') || item.endsWith('.jpeg')) {
            try {
                console.log(`Compressing ${item}...`);
                const tempPath = fullPath + '.tmp';
                
                const buffer = fs.readFileSync(fullPath);
                const image = sharp(buffer);
                const metadata = await image.metadata();
                
                const newWidth = Math.max(10, Math.floor(metadata.width * 0.5));
                
                await image
                    .resize(newWidth)
                    .webp({ quality: 10 }) // Extreme compression to hit the < 1.5MB total size goal
                    .toFile(tempPath);
                    
                fs.unlinkSync(fullPath);
                fs.renameSync(tempPath, fullPath);
            } catch (err) {
                console.error(`Failed to process ${item}:`, err.message);
            }
        }
    }
}

processDirectory(process.cwd()).then(() => {
    console.log('Finished compressing images');
});
