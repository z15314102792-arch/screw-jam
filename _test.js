
// Mock DOM
global.document = {
  getElementById: (id) => {
    if (id === 'lv') return { textContent: '' };
    return { classList: { add: (c) => {}, remove: (c) => {}, contains: (c) => false } };
  }
};
global.devicePixelRatio = 2;


// ==================== 音效引擎 ====================
class Audio {
  constructor() {
    this.on = true; this.ctx = null; this.master = null; this.bgmGain = null;
    this._unlocked = false; this._bgmNodes = []; this._bgmTimer = null; this._boot();
  }
  _boot() {
    const doUnlock = () => {
      if (this._unlocked) return; this._unlocked = true;
      try {
        this.ctx = new (window.AudioContext||window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.85;
        this.master.connect(this.ctx.destination);
        this.bgmGain = this.ctx.createGain(); this.bgmGain.gain.value = 0.9;
        this.bgmGain.connect(this.master);
      } catch(e) { this.on = false; }
    };
    if (typeof WeixinJSBridge !== 'undefined') {
      try { WeixinJSBridge.invoke('getNetworkType', {}, () => doUnlock()); } catch(e) {}
    }
    document.addEventListener('WeixinJSBridgeReady', () => {
      try { WeixinJSBridge.invoke('getNetworkType', {}, () => doUnlock()); } catch(e) {}
    }, {once:true});
    ['touchstart','mousedown','click'].forEach(evt => {
      document.addEventListener(evt, () => { if (!this._unlocked) doUnlock(); }, {once:true, passive:true});
    });
    setTimeout(() => { if (!this._unlocked) doUnlock(); }, 800);
  }
  t() { return this.ctx ? this.ctx.currentTime : 0; }

  play(k) {
    if (!this.on || !this.ctx) return;
    const t = this.t(), m = this.master;
    const tone = (f, dur, vol, type, fe) => {
      const o = this.ctx.createOscillator(); o.type = type||'sine'; o.frequency.setValueAtTime(f,t);
      if (fe) o.frequency.exponentialRampToValueAtTime(fe,t+dur);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
      o.connect(g); g.connect(m); o.start(t); o.stop(t+dur);
    };
    const noise = (dur, flo, fhi, q, vol) => {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate*dur, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(this.ctx.sampleRate*0.015));
      const s=this.ctx.createBufferSource(); s.buffer=buf;
      const flt=this.ctx.createBiquadFilter();
      if(flo&&fhi){flt.type='bandpass';flt.frequency.value=(flo+fhi)/2;flt.Q.value=q||3;}
      else{flt.type='lowpass';flt.frequency.value=flo||800;}
      const g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
      s.connect(flt);flt.connect(g);g.connect(m);s.start(t);s.stop(t+dur);
    };
    switch(k){
      case 'unscrew': noise(0.1,2500,4500,5,0.07); for(let i=0;i<3;i++)tone(2200+i*150,0.03,0.05,'sine'); break;
      case 'boxIn': tone(750,0.07,0.09,'triangle',380); break;
      case 'boxFull': [523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,0.28,0.07,'sine'),i*80)); break;
      case 'panelDrop': tone(180,0.28,0.12,'sine',50); noise(0.15,300,1000,2,0.06); break;
      case 'panelWobble': tone(110,0.25,0.05,'sine'); break;
      case 'panelTilt': tone(150,0.2,0.04,'triangle',100); break;
      case 'win': [523,659,784,1047,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,0.35,0.09,'sine'),i*95)); break;
      case 'lose': tone(180,0.3,0.07,'square',110); break;
      case 'hint': [700,900].forEach((f,i)=>setTimeout(()=>tone(f,0.2,0.05,'sine'),i*100)); break;
      case 'click': tone(1100,0.025,0.03,'sine'); break;
      case 'autoMatch': tone(650,0.12,0.06,'triangle',400); break;
    }
  }

  bgm() { if (this.on && this.ctx) { this.stopBGM(); this._bgmLoop(); } }
  _bgmLoop() {
    if (!this.on || !this.ctx) return;
    this._bgmNodes = [];
    const ctx = this.ctx, t = this.t(), mg = this.bgmGain;
    // 舒缓氛围 — 慢板五声音阶 + 温暖铺底，放松不头疼
    // Am 五声：A4 C5 D5 E5 G5 A5 (440-880Hz)
    const melody = [
      440, 523.2, 587.3, 659.2,  // A4 C5 D5 E5
      784, 659.2, 587.3, 523.2,  // G5 E5 D5 C5
      440, 523.2, 659.2, 784,     // A4 C5 E5 G5
      659.2, 587.3, 523.2, 440,  // E5 D5 C5 A4
    ];
    const beat = 0.92; // 慢板 ~65 BPM
    melody.forEach((freq, i) => {
      const start = t + i * beat;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(freq, start);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.28, start + 0.08); // 柔和起音
      g.gain.setValueAtTime(0.28, start + beat * 0.55);
      g.gain.linearRampToValueAtTime(0, start + beat * 0.92); // 自然衰减
      o.connect(g); g.connect(mg);
      o.start(start); o.stop(start + beat);
      this._bgmNodes.push(o);
    });
    // 温暖泛音铺底 (Am 和弦 A-C-E 泛音)
    const padNotes = [440, 523.2, 659.2];
    padNotes.forEach(freq => {
      const po = ctx.createOscillator(); po.type = 'sine';
      po.frequency.setValueAtTime(freq, t);
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(0.07, t + 1.2);
      pg.gain.setValueAtTime(0.07, t + melody.length * beat * 0.75);
      pg.gain.linearRampToValueAtTime(0, t + melody.length * beat);
      po.connect(pg); pg.connect(mg);
      po.start(t); po.stop(t + melody.length * beat);
      this._bgmNodes.push(po);
    });
    this._bgmTimer = setTimeout(() => this._bgmLoop(), melody.length * beat * 1000);
  }
  stopBGM() {
    clearTimeout(this._bgmTimer);
    this._bgmNodes.forEach(n => { try{n.stop()}catch(e){} });
    this._bgmNodes = [];
  }
}

// ==================== 面板形状定义 ====================
const SHAPE_RECT = 'rect', SHAPE_CIRCLE = 'circle', SHAPE_TRI = 'triangle', SHAPE_HEX = 'hexagon';
const ALL_SHAPES = [SHAPE_RECT, SHAPE_RECT, SHAPE_RECT, SHAPE_CIRCLE, SHAPE_TRI, SHAPE_HEX]; // 矩形偏多

function shapePath(ctx, cx, cy, w, h, shape) {
  ctx.beginPath();
  const r = Math.min(w, h) / 2;
  switch (shape) {
    case SHAPE_CIRCLE:
      ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI*2); break;
    case SHAPE_TRI:
      ctx.moveTo(cx, cy - h/2); ctx.lineTo(cx + w/2, cy + h/2); ctx.lineTo(cx - w/2, cy + h/2); ctx.closePath(); break;
    case SHAPE_HEX:
      for (let i=0;i<6;i++) { const a=Math.PI/6+i*Math.PI/3; const px=cx+Math.cos(a)*r, py=cy+Math.sin(a)*r; i===0?ctx.moveTo(px,py):ctx.lineTo(px,py); } ctx.closePath(); break;
    default: // rect
      const R=14; ctx.moveTo(cx-w/2+R,cy-h/2); ctx.lineTo(cx+w/2-R,cy-h/2);
      ctx.quadraticCurveTo(cx+w/2,cy-h/2,cx+w/2,cy-h/2+R); ctx.lineTo(cx+w/2,cy+h/2-R);
      ctx.quadraticCurveTo(cx+w/2,cy+h/2,cx+w/2-R,cy+h/2); ctx.lineTo(cx-w/2+R,cy+h/2);
      ctx.quadraticCurveTo(cx-w/2,cy+h/2,cx-w/2,cy+h/2-R); ctx.lineTo(cx-w/2,cy-h/2+R);
      ctx.quadraticCurveTo(cx-w/2,cy-h/2,cx-w/2+R,cy-h/2); ctx.closePath(); break;
  }
}

function shapeContains(cx, cy, w, h, shape, px, py) {
  const dx = px - cx, dy = py - cy;
  switch (shape) {
    case SHAPE_CIRCLE: return (dx*dx)/(w*w/4) + (dy*dy)/(h*h/4) <= 1;
    case SHAPE_TRI: {
      const hw=w/2, hh=h/2;
      const yNorm = (dy + hh) / h; if (yNorm < 0 || yNorm > 1) return false;
      const maxHW = hw * (1 - yNorm);
      return Math.abs(dx) <= maxHW - 4;
    }
    case SHAPE_HEX: {
      const r = Math.min(w, h) / 2;
      return dx*dx + dy*dy <= r*r && Math.abs(dy) <= r*0.87;
    }
    default: return Math.abs(dx) <= w/2 - 4 && Math.abs(dy) <= h/2 - 4;
  }
}

// ==================== 关卡生成器 ====================
const COLS = [
  {n:'red', f:'#e94560', g:'#ff6b6b', d:'#a71d3a'},
  {n:'blue', f:'#4d96ff', g:'#6db3ff', d:'#1a56b8'},
  {n:'green', f:'#2ecc71', g:'#58d68d', d:'#1a7a3a'},
  {n:'yellow', f:'#f1c40f', g:'#f9e154', d:'#b8960a'},
  {n:'purple', f:'#9b59b6', g:'#bb8fce', d:'#6c3483'},
  {n:'orange', f:'#e67e22', g:'#f0a04b', d:'#a05517'},
];
const WOODS = [
  {base:'#e8d5b7', dark:'#c4a882', light:'#f5ede0', name:'浅橡木'},
  {base:'#d4c0a0', dark:'#b89a7a', light:'#e8dcc8', name:'蜂蜜木'},
  {base:'#c9a882', dark:'#a07850', light:'#e0c8a8', name:'核桃木'},
  {base:'#bfa88a', dark:'#967855', light:'#d8c8b0', name:'柚木'},
  {base:'#dcc8a8', dark:'#b89870', light:'#f0e0c8', name:'枫木'},
  {base:'#b89578', dark:'#8c6a4a', light:'#d4b898', name:'樱桃木'},
  {base:'#e0c090', dark:'#b89860', light:'#f5e8c8', name:'松木'},
  {base:'#c8b8a0', dark:'#a09078', light:'#e0d8c8', name:'灰木'},
];

function genLevel(lv) {
  let numCol, cap, numPanel, tempMax;
  // 策略核心：少临时位+首盒颜色藏在底层=必须规划消除顺序
  if (lv === 1)               { numCol=2; cap=3; numPanel=3; tempMax=5; }
  else if (lv === 2)          { numCol=2; cap=3; numPanel=5; tempMax=4; }
  else if (lv <= 3)           { numCol=3; cap=3; numPanel=6; tempMax=4; }
  else if (lv <= 5)           { numCol=3; cap=3; numPanel=7; tempMax=4; }
  else if (lv <= 7)           { numCol=4; cap=3; numPanel=8; tempMax=4; }
  else if (lv <= 10)          { numCol=4; cap=3; numPanel=9; tempMax=4; }
  else if (lv <= 13)          { numCol=5; cap=3; numPanel=9; tempMax=4; }
  else if (lv <= 17)          { numCol=5; cap=3; numPanel=10; tempMax=5; }
  else                        { numCol=6; cap=3; numPanel=10; tempMax=5; }

  const total = numCol * cap;
  const colors = COLS.slice(0, numCol);
  const GX=30, GY=130, GW=360, GH=340;

  let attempts = 0;
  while (attempts < 300) {
    attempts++;
    const result = _tryGen(lv, colors, cap, total, numPanel, tempMax, GX, GY, GW, GH);
    if (result && _isSolvable(result)) return result;
  }
  // 兜底：增加tempMax降低难度再试
  const fallback = _tryGen(lv, colors, cap, total, numPanel, tempMax + 2, GX, GY, GW, GH);
  return fallback;
}

function _tryGen(lv, colors, cap, total, numPanel, tempMax, GX, GY, GW, GH) {
  // 1. 盒子顺序 — 首盒颜色增加难度
  const boxes = []; colors.forEach(c => boxes.push(c)); shuffle(boxes);
  const firstBoxN = boxes[0].n;

  // 2. 螺丝颜色池
  const screwCols = [];
  colors.forEach(c => { for(let i=0;i<cap;i++) screwCols.push(c); });
  shuffle(screwCols);

  // 3. 创建面板（聚集中心确保层间重叠）
  const panels = [];
  for (let i = 0; i < numPanel; i++) {
    const pw = 75 + Math.random() * 85;
    const ph = 52 + Math.random() * 62;
    const spreadX = GW * 0.42, spreadY = GH * 0.38;
    const cx = GX + GW/2 + (Math.random() - 0.5) * spreadX;
    const cy = GY + GH/2 + (Math.random() - 0.5) * spreadY;
    const wood = WOODS[i % WOODS.length];
    const shape = lv <= 1 ? SHAPE_RECT : ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)];
    panels.push({ id:i, cx, cy, w:pw, h:ph, shape, screws:[], dropped:false, wobble:false,
      wood, layer:i, _physAngle:0, _pivotX:null, _pivotY:null, _targetAngle:0
    });
  }
  // 层级按创建顺序（后续螺丝放置会确保覆盖关系）
  panels.sort((a,b) => a.layer - b.layer);
  panels.forEach((p,i) => { p.layer = i; });

  // 4. 分配每板螺丝数（每板至少1颗，最多4颗，优先给重叠多的板）
  const maxPerPanel = Math.min(4, Math.ceil(total / numPanel) + 1);
  const screwCounts = new Array(numPanel).fill(1);
  let remaining = total - numPanel;
  while (remaining > 0) {
    let best = null, bestScore = -1;
    for (let i = 0; i < numPanel; i++) {
      if (screwCounts[i] >= maxPerPanel) continue;
      const score = countOverlaps(panels[i], panels);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best === null) break;
    screwCounts[best]++; remaining--;
  }

  // 5. ★ 逐层放置：底层散布，上层直接盖下层螺丝（每颗都有意义）
  let si = 0;
  const maxLayer = panels[panels.length - 1].layer;
  for (let layer = 0; layer <= maxLayer; layer++) {
    const layerPanels = panels.filter(p => p.layer === layer);
    for (const p of layerPanels) {
      for (let k = 0; k < screwCounts[p.id] && si < total; k++) {
        let pos;
        if (layer === 0) {
          // 底层：网格均匀散布
          pos = screwSpreadPos(p, k, screwCounts[p.id]);
        } else {
          // 上层：找到可覆盖的下层螺丝，直接盖在上面
          const targets = findCoverTargets(p, panels);
          // 优先选尚未被本板其他螺丝覆盖的目标
          const fresh = targets.filter(t => !p.screws.some(ps =>
            Math.hypot(ps.x - t.x, ps.y - t.y) < 8));
          const pool = fresh.length > 0 ? fresh : targets;
          if (pool.length > 0) {
            const t = pool[Math.floor(Math.random() * pool.length)];
            pos = {
              x: t.x + (Math.random() - 0.5) * 12,
              y: t.y + (Math.random() - 0.5) * 12
            };
            if (!shapeContains(p.cx, p.cy, p.w, p.h, p.shape, pos.x, pos.y)) {
              pos = { x: t.x, y: t.y };
            }
          } else {
            // 无可覆盖目标 → 均匀散布（保底）
            pos = screwSpreadPos(p, k, screwCounts[p.id]);
          }
        }
        const col = assignColor(screwCols, si, p, panels, firstBoxN, total);
        p.screws.push({ id: si, color: col, x: pos.x, y: pos.y, panelId: p.id, removed: false });
        si++;
      }
    }
  }

  const allScrews = panels.flatMap(p => p.screws);
  return {
    level: lv, colors, panels, screws: allScrews, boxes, cap, tempMax,
    activeBox: boxes.shift(), activeCount: 0, temp: [],
  };
}

// 面板上均匀分布螺丝（网格法，避免挤在一起）
function screwSpreadPos(p, idx, total) {
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const fx = (col + 0.5) / cols;
  const fy = (row + 0.5) / rows;
  const margin = 0.18;
  const sx = p.cx - p.w/2 + (margin + fx * (1 - 2*margin)) * p.w;
  const sy = p.cy - p.h/2 + (margin + fy * (1 - 2*margin)) * p.h;
  const jx = (Math.random() - 0.5) * 8;
  const jy = (Math.random() - 0.5) * 8;
  if (shapeContains(p.cx, p.cy, p.w, p.h, p.shape, sx + jx, sy + jy)) {
    return {x: sx + jx, y: sy + jy};
  }
  return {x: sx, y: sy};
}

// 找到上层面板可遮盖的下层螺丝
function findCoverTargets(upper, panels) {
  const targets = [];
  for (const lp of panels) {
    if (lp.layer >= upper.layer) continue;
    if (lp.dropped) continue;
    if (!_overlap(upper, lp)) continue;
    for (const s of lp.screws) {
      if (s.removed) continue;
      if (shapeContains(upper.cx, upper.cy, upper.w, upper.h, upper.shape, s.x, s.y)) {
        targets.push({x: s.x, y: s.y, screw: s, panel: lp});
      }
    }
  }
  return targets;
}

// 统计面板重叠数
function countOverlaps(p, panels) {
  let n = 0;
  for (const op of panels) {
    if (op.id === p.id) continue;
    if (_overlap(p, op)) n++;
  }
  return n;
}

// 螺丝颜色分配：首盒颜色优先底层
function assignColor(screwCols, si, panel, panels, firstBoxN, total) {
  let col = screwCols[si];
  if (col.n === firstBoxN && panel.layer >= 2 && si + 1 < total) {
    for (let j = si + 1; j < Math.min(si + 10, total); j++) {
      if (screwCols[j].n !== firstBoxN) {
        [screwCols[si], screwCols[j]] = [screwCols[j], screwCols[si]];
        col = screwCols[si]; break;
      }
    }
  }
  return col;
}

function _isSolvable(st) {
  const screws = st.screws.map(s => ({...s}));
  const panels = st.panels.map(p => ({...p, dropped:false}));
  const temp = [], tempMax = st.tempMax;
  let activeBox = {...st.activeBox}, activeCount = st.activeCount;
  const boxes = st.boxes.map(b => ({...b}));
  const blocked = (screw) => {
    const p = panels.find(p => p.id === screw.panelId);
    if (!p || p.dropped) return false;
    for (const op of panels) {
      if (op.id === p.id || op.dropped || op.dropStart) continue;
      if (op.layer > p.layer && shapeContains(op.cx, op.cy, op.w, op.h, op.shape, screw.x, screw.y)) return true;
    }
    return false;
  };
  let stuck = 0;
  while (screws.some(s=>!s.removed) && stuck < screws.length * 5) {
    let found = null;
    // 优先匹配当前盒子颜色
    for (const s of screws) { if (s.removed || blocked(s)) continue; if (activeBox&&s.color.n===activeBox.n){found=s;break;} }
    // 卡住时：尝试取一颗会释放最多螺丝的面板上的螺丝
    if (!found && stuck > screws.length) {
      let bestScore = -1;
      for (const s of screws) {
        if (s.removed || blocked(s)) continue;
        const p = panels.find(pp => pp.id === s.panelId);
        if (!p || p.dropped) continue;
        // 评估：取这颗螺丝能释放多少被它面板挡住的螺丝
        let unlocks = 0;
        const savedDropped = p.dropped;
        p.dropped = true; // 模拟面板掉落
        for (const os of screws) {
          if (os.removed || os.id === s.id) continue;
          if (blocked(os)) continue; // 不计数仍然blocked的
          const wasBlocked = (() => {
            const op = panels.find(pp => pp.id === os.panelId);
            if (!op || op.dropped) return false;
            for (const hp of panels) {
              if (hp.id === op.id || hp.dropped) continue;
              if (hp.layer > op.layer && shapeContains(hp.cx, hp.cy, hp.w, hp.h, hp.shape, os.x, os.y)) return true;
            }
            return false;
          })();
          if (!wasBlocked) unlocks++;
        }
        p.dropped = savedDropped;
        if (unlocks > bestScore) { bestScore = unlocks; found = s; }
      }
    }
    // 实在找不到，随便取一颗可达的
    if (!found) { for (const s of screws) { if (s.removed||blocked(s)) continue; found=s;break; } }
    if (!found) { stuck++; continue; }
    found.removed = true;
    const panel = panels.find(p=>p.id===found.panelId);
    if (panel && panel.screws.every(ps=>{const s=screws.find(ss=>ss.id===ps.id);return s?s.removed:ps.removed;})) panel.dropped=true;
    if (activeBox && found.color.n===activeBox.n) {
      activeCount++; if (activeCount>=st.cap) { activeBox=boxes.length>0?boxes.shift():null; activeCount=0;
        if (activeBox) { for (let i=temp.length-1;i>=0;i--) { if (temp[i].color.n===activeBox.n) { temp.splice(i,1); activeCount++;
          if (activeCount>=st.cap) { activeBox=boxes.length>0?boxes.shift():null; activeCount=0; if(!activeBox)break; } } } }
      }
    } else { if (temp.length>=tempMax) return false; temp.push({color:found.color}); stuck=0; }
  }
  return screws.every(s=>s.removed);
}

function shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} }
function _overlap(a, b) {
  return !(a.cx-a.w/2 > b.cx+b.w/2 || a.cx+a.w/2 < b.cx-b.w/2 ||
           a.cy-a.h/2 > b.cy+b.h/2 || a.cy+a.h/2 < b.cy-b.h/2);
}

// ==================== 游戏主类 ====================


// Test genLevel
try {
  const result = genLevel(1);
  console.log('genLevel(1) result keys:', Object.keys(result));
  console.log('panels:', result.panels.length);
  console.log('screws:', result.screws.length);
  console.log('boxes:', result.boxes.length);
  result.panels.forEach(p => {
    console.log('Panel', p.id, 'layer:', p.layer, 'screws:', p.screws.length, 'cx:', p.cx.toFixed(0), 'cy:', p.cy.toFixed(0), 'w:', p.w.toFixed(0), 'h:', p.h.toFixed(0));
  });
} catch(e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
}
