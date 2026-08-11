class MockCtx {
  constructor() { this.state = { fills:[] }; this.canvas = { width:840, height:1400 }; }
  save() {}; restore() {}; translate() {}; scale() {}; rotate() {}; beginPath() {}; closePath() {}
  moveTo() {}; lineTo() {}; arc() {}; fill() {}; stroke() {}; fillText() {}; strokeText() {}
  clip() {}; clearRect() {};
  fillRect(x,y,w,h) { this.state.fills.push({x,y,w,h}); }
  strokeRect(x,y,w,h) {}
  createRadialGradient() { return { addColorStop: () => {} }; }
  createLinearGradient() { return { addColorStop: () => {} }; }
  measureText(t) { return { width: t.length * 7 }; }
}
global.document = {
  getElementById: (id) => {
    if (id === 'gc') return { getContext: () => new MockCtx(), getBoundingClientRect: () => ({ width: 420, height: 700 }) };
    return { classList: { add: (c) => {}, remove: (c) => {}, contains: (c) => false }, textContent: '', style: {} };
  }
};
global.window = global;
global.devicePixelRatio = 2;
global.requestAnimationFrame = (cb) => { if(!global._stop) setTimeout(() => cb(), 16); };

const fs = require('fs');
const html = fs.readFileSync('C:\screw-jam\_deployed.html', 'utf-8');
const re = /<script[^>]*>(.*?)<\/script>/gs;
let m, scripts = [];
while ((m = re.exec(html)) !== null) scripts.push(m[1]);
const js = scripts.reduce((a,b) => a.length > b.length ? a : b);
eval(js);

try {
  const g = new Game();
  console.log('Game created, W:', g.W, 'H:', g.H);
  g.start(1);
  console.log('start(1) OK');
  console.log('panels:', g.st.panels.length, 'screws:', g.st.screws.length);
  for (const p of g.st.panels) {
    console.log('P' + p.id + ' layer=' + p.layer + ' screws=' + p.screws.length + ' cx=' + p.cx.toFixed(0) + ' cy=' + p.cy.toFixed(0));
    for (const s of p.screws) {
      let blocked = '?';
      try { blocked = g._isScrewBlocked(s); } catch(e) { blocked = 'ERR'; }
      console.log('  S' + s.id + ' ' + s.color + ' @(' + s.x.toFixed(0) + ',' + s.y.toFixed(0) + ') blocked=' + blocked);
    }
  }
  try { g._draw(); console.log('_draw OK'); } catch(e) { console.error('_draw ERR:', e.message); }
} catch(e) {
  console.error('ERROR:', e.message);
}
