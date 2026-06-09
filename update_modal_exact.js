const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

c = c.replace(
    '<video playsinline muted autoplay src="${a}" loop preload="none" style="max-height: 80vh; pointer-events: none;"></video>',
    '<video playsinline muted autoplay src="${a}" poster="${a.replace(/\\.(mp4|webm|mov|avi)$/i, \'.jpg\')}" loop preload="metadata" style="max-height: 80vh;"></video>'
);

const oldClick = 't.addEventListener("click",e=>{e.stopPropagation(),t.paused?t.play():t.pause()})';
const newClick = 't.addEventListener("click",e=>{e.stopPropagation();if(t.muted){t.muted=false;t.volume=1;}else{t.paused?t.play():t.pause();}})';
c = c.replace(oldClick, newClick);

fs.writeFileSync('index.html', c);
