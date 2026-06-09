const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');

function findVideos(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findVideos(fullPath, fileList);
        } else if (file.endsWith('.mp4')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const videos = findVideos(process.cwd());
console.log(`Found ${videos.length} videos. Compressing aggressively...`);

for (const videoPath of videos) {
    console.log(`Compressing: ${videoPath}`);
    const tempPath = videoPath + '.tmp.mp4';
    try {
        // -vf scale=-2:144 scales to 144p, -r 10 reduces to 10fps, -crf 38 highly compresses, -an removes audio
        cp.execSync(`"${ffmpeg}" -i "${videoPath}" -vf scale=-2:144 -r 10 -c:v libx264 -preset veryfast -crf 38 -an "${tempPath}"`);
        fs.unlinkSync(videoPath);
        fs.renameSync(tempPath, videoPath);
        console.log(`Done compressing ${videoPath}`);
    } catch (err) {
        console.error(`Error compressing ${videoPath}:`, err.message);
    }
}
console.log('All videos compressed.');
