const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

const target = '"video"===o){const t=l.querySelector("video");let e=t.play();void 0!==e&&e.catch(t=>{console.log("Autoplay blocked, waiting for click:",t)}),t.addEventListener("click",e=>{e.stopPropagation();if(t.muted){t.muted=false;t.volume=1;}else{t.paused?t.play():t.pause();}})}';
const repl = '"video"===o){const t=l.querySelector("video");t.muted=false;t.volume=1;let e=t.play();void 0!==e&&e.catch(t=>{console.log("Autoplay blocked, waiting for click:",t)});t.addEventListener("click",e=>{e.stopPropagation();t.paused?t.play():t.pause()})}';

c = c.split(target).join(repl);
fs.writeFileSync('index.html', c);
console.log('Is fixed:', c.includes(repl));
