const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

c = c.replace(
    /<video playsinline muted autoplay src="\$\{a\}" poster="\$\{a\.replace\(\/\\\\\.\(mp4\|webm\|mov\|avi\)\$\/i, '\.jpg'\)\}" loop preload="metadata" style="max-height: 80vh;"><\/video>/g,
    '<video playsinline src="${a}" poster="${a.replace(/\\.(mp4|webm|mov|avi)$/i, \'.jpg\')}" loop preload="metadata" style="max-height: 80vh;"></video>'
);

c = c.replace(
    /"video"===o\)\{const t=l\.querySelector\("video"\);let e=t\.play\(\);void 0!==e&&e\.catch\(t=>\{console\.log\("Autoplay blocked, waiting for click:",t\)\}\),t\.addEventListener\("click",e=>\{e\.stopPropagation\(\);if\(t\.muted\)\{t\.muted=false;t\.volume=1;\}else\{t\.paused\?t\.play\(\):t\.pause\(\);\}\}\)\}/g,
    '"video"===o){const t=l.querySelector("video");t.muted=false;t.volume=1;let e=t.play();void 0!==e&&e.catch(t=>{console.log("Autoplay blocked, waiting for click:",t)});t.addEventListener("click",e=>{e.stopPropagation();t.paused?t.play():t.pause()})}'
);

fs.writeFileSync('index.html', c);
console.log('Fixed index.html!');
