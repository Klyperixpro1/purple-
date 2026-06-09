const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/<video controls playsinline='' controlsList=\"nodownload noplaybackrate noremoteplayback\" disablePictureInPicture src=\"\$\{a\}\" loop preload=\"none\" style=\"max-height: 80vh;\"><\/video>/, '<video playsinline muted autoplay src="${a}" loop preload="none" style="max-height: 80vh; pointer-events: none;"></video>');
fs.writeFileSync('index.html', c);
