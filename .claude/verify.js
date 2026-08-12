/**
 * 螺丝消除 · 验收脚本
 * 用法: node verify.js
 * 输出: verify-results.json
 */
const fs = require('fs');
const vm = require('vm');

const PROJECT = { name: '螺丝消除', version: null, entryFile: 'index.html' };
const results = { project: PROJECT.name, version: PROJECT.version, timestamp: new Date().toISOString(), checks: [], summary: { total: 0, passed: 0, failed: 0 } };
function addCheck(name, pass, data = {}) { results.checks.push({ name, pass, data }); results.summary.total++; if (pass) results.summary.passed++; else results.summary.failed++; }
function fail(msg) { console.error('[verify] ' + msg); fs.writeFileSync('verify-results.json', JSON.stringify(results, null, 2)); process.exit(1); }

// ====== 1. 读取文件 ======
console.log('[verify] 读取 ' + PROJECT.entryFile + '...');
let html;
try { html = fs.readFileSync(PROJECT.entryFile, 'utf-8'); } catch(e) { fail('无法读取文件: ' + e.message); }
const titleMatch = html.match(/<title>螺丝消除 v?([\d.]+)<\/title>/);
PROJECT.version = titleMatch ? 'v' + titleMatch[1] : 'unknown';
results.version = PROJECT.version;
addCheck('入口文件存在', true, { size_bytes: html.length, lines: html.split('\n').length });

// ====== 2. 语法检查 ======
console.log('[verify] 语法检查...');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match, allScripts = '';
while ((match = scriptRegex.exec(html)) !== null) { allScripts += match[1].trim() + '\n'; }
allScripts = allScripts.trim();
try { new Function(allScripts); addCheck('JS 语法正确', true, {}); }
catch(e) { addCheck('JS 语法正确', false, { line: e.lineNumber, message: e.message }); fail('JS 语法错误'); }

// ====== 3. 创建沙箱并执行代码 ======
console.log('[verify] 创建沙箱...');

// 从 Node.js globalThis 继承所有标准对象
const sandbox = {};
for (const key of Object.getOwnPropertyNames(globalThis)) {
  try { sandbox[key] = globalThis[key]; } catch(e) {}
}

// Mock 浏览器 API — 关键：只 mock 需要的，不乱叫
const fakeCtx = new Proxy({}, { get: (t, p) => (p === 'canvas') ? fakeCanvas : (() => {}), set: (t, p, v) => { t[p] = v; return true; } });
const fakeCanvas = { getContext: () => fakeCtx, style: {}, width: 420, height: 700, clientWidth: 420, clientHeight: 700, getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 700, right: 420, bottom: 700 }), addEventListener: () => {}, removeEventListener: () => {} };
const fakeEl = { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, getBoundingClientRect: () => ({}), addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null, appendChild: () => {} };

sandbox.document = { getElementById: (id) => (id === 'gc') ? fakeCanvas : fakeEl, createElement: () => fakeEl, querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, removeEventListener: () => {}, body: { ...fakeEl }, head: fakeEl, documentElement: { style: {} } };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
sandbox.AudioContext = class { constructor() { return { resume: () => {}, createGain: () => ({ connect: () => {}, gain: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }), createOscillator: () => ({ type: '', frequency: { setValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }), destination: {}, state: 'running', sampleRate: 44100, currentTime: 0, close: () => {} }; } };
sandbox.webkitAudioContext = null;
sandbox.Image = class { constructor() { this.onload = null; this.src = ''; this.width = 0; this.height = 0; } };
sandbox.innerWidth = 420; sandbox.innerHeight = 700; sandbox.devicePixelRatio = 2;
sandbox.screen = { width: 420, height: 700 };
sandbox.parent = sandbox; sandbox.top = sandbox;
sandbox.location = { href: 'http://localhost', protocol: 'http:', host: 'localhost', pathname: '/', search: '', hash: '' };
sandbox.navigator = { userAgent: 'verify', platform: 'Win32', language: 'zh-CN' };
sandbox.performance = { now: () => Date.now() };
sandbox.MutationObserver = class { observe() {} disconnect() {} };
sandbox.getComputedStyle = () => ({});
sandbox.matchMedia = () => ({ matches: false });
sandbox.WeixinJSBridge = null;
sandbox.addEventListener = () => {}; sandbox.removeEventListener = () => {};
sandbox.scrollTo = () => {}; sandbox.dispatchEvent = () => {};
sandbox.getSelection = () => ({ removeAllRanges: () => {} });
sandbox.XMLHttpRequest = class { open() {} send() {} };
sandbox.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
sandbox.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
sandbox.ResizeObserver = class { observe() {} disconnect() {} };
sandbox.IntersectionObserver = class { observe() {} disconnect() {} };

// 准备代码：剥离 new Game() 初始化，在主 IIFE 结束前导出函数
let codeBody = allScripts;
codeBody = codeBody.replace(/const\s+G\s*=\s*new\s+Game\s*\(\);?/g, '// SKIPPED: new Game()');

const exportCode = '\nglobalThis.genLevel = typeof genLevel !== "undefined" ? genLevel : null;\nglobalThis._tryGen = typeof _tryGen !== "undefined" ? _tryGen : null;\nglobalThis._isSolvable = typeof _isSolvable !== "undefined" ? _isSolvable : null;\nglobalThis.shapeContains = typeof shapeContains !== "undefined" ? shapeContains : null;\nglobalThis.shuffle = typeof shuffle !== "undefined" ? shuffle : null;\n';
const iifeEnd = codeBody.lastIndexOf('})();');
if (iifeEnd === -1) fail('找不到主 IIFE 结束标记');
codeBody = codeBody.substring(0, iifeEnd) + exportCode + codeBody.substring(iifeEnd);

// 执行
console.log('[verify] 执行游戏代码 (沙箱)...');
let ctx;
try {
  ctx = vm.createContext(sandbox);
  const script = new vm.Script(codeBody, { filename: 'game.js' });
  script.runInContext(ctx, { timeout: 10000 });
} catch(e) {
  addCheck('代码加载（沙箱执行）', false, { error: e.message });
  fail('沙箱执行失败: ' + e.message);
}

const genLevel = sandbox.genLevel;
const _isSolvable = sandbox._isSolvable;
const shapeContains = sandbox.shapeContains;
const shuffle = sandbox.shuffle;

if (typeof genLevel !== 'function' || typeof _isSolvable !== 'function') {
  addCheck('关卡函数存在', false, { genLevel: typeof genLevel, _isSolvable: typeof _isSolvable });
  fail('关卡函数未正确导出');
}
addCheck('代码加载（沙箱执行）', true, { code_size: allScripts.length });

// ====== 4. 关卡可解性测试 ======
console.log('[verify] 测试关卡可解性 (30关×3轮)...');
const LEVELS = 30, ROUNDS = 3;
let totalTests = 0, totalSolvable = 0;

for (let lv = 1; lv <= LEVELS; lv++) {
  for (let r = 0; r < ROUNDS; r++) {
    totalTests++;
    try {
      const st = genLevel(lv);
      if (!st) continue;
      if (_isSolvable(st)) totalSolvable++;
    } catch(e) { /* skip */ }
  }
}

const solvableRate = Math.round((totalSolvable / totalTests) * 1000) / 10;
addCheck('关卡可解性 (30关×3轮)', totalSolvable === totalTests, {
  total_attempts: totalTests, solvable: totalSolvable, failed: totalTests - totalSolvable, solvable_rate_pct: solvableRate,
});

// ====== 5. 螺丝遮盖率稳定性（10次×30关，契约 M1/M2/M3） ======
console.log('[verify] 统计螺丝遮盖率稳定性 (10次×30关)...');
const coverageRounds = 10;
const allSamples = [], openCounts = []; // { level, coverage_pct } × 10 per level
const coverageByLevel = {}; // level -> [coverage_pct, ...]

for (let lv = 1; lv <= LEVELS; lv++) {
  coverageByLevel[lv] = [];
  for (let r = 0; r < coverageRounds; r++) {
    try {
      const st = genLevel(lv);
      if (!st || !st.screws || !st.panels) continue;
      st.screws.forEach(s => { s.removed = false; s.animPhase = null; });
      st.panels.forEach(p => { p.dropped = false; p.dropStart = null; });

      let blocked = 0;
      for (const s of st.screws) {
        const panel = st.panels.find(p => p.id === s.panelId);
        if (!panel || panel.dropped) continue;
        for (const op of st.panels) {
          if (op.id === panel.id || op.dropped) continue;
          if (op.layer > panel.layer && shapeContains(op.cx, op.cy, op.w, op.h, op.shape, s.x, s.y)) { blocked++; break; }
        }
      }
      const total = st.screws.length;
      const cov = total > 0 ? Math.round((blocked / total) * 100) : 0;
      allSamples.push({ level: lv, round: r, total, blocked, coverage_pct: cov });
      coverageByLevel[lv].push(cov);
      if (r === 0) openCounts.push(total - blocked);
    } catch(e) { /* skip */ }
  }
}

// M1: 同级稳定性 — 每关标准差最大值 ≤ 25
const stddevs = [];
for (let lv = 1; lv <= LEVELS; lv++) {
  const vals = coverageByLevel[lv] || [];
  if (vals.length < 2) continue;
  const mean = vals.reduce((a,b)=>a+b,0) / vals.length;
  const variance = vals.reduce((s,v)=>s+(v-mean)*(v-mean),0) / vals.length;
  stddevs.push({ level: lv, mean: Math.round(mean), stddev: Math.round(Math.sqrt(variance)), min: Math.min(...vals), max: Math.max(...vals) });
}
const maxStddev = stddevs.length > 0 ? Math.max(...stddevs.map(d=>d.stddev)) : 999;
const m1_pass = maxStddev <= 25;

// M2: 低关底线 — Lv1-5 任意一次生成 ≥ 25%
const earlyMins = [];
for (let lv = 1; lv <= 5; lv++) {
  const vals = coverageByLevel[lv] || [];
  if (vals.length > 0) earlyMins.push(Math.min(...vals));
}
const m2_min = earlyMins.length > 0 ? Math.min(...earlyMins) : 0;
const m2_pass = m2_min >= 25;

// M3: 递进趋势 — Lv1-5 均值 < Lv10-15 均值
const earlyAvg = stddevs.filter(d=>d.level>=1&&d.level<=5).reduce((s,d)=>s+d.mean,0) /
  Math.max(1, stddevs.filter(d=>d.level>=1&&d.level<=5).length);
const midAvg = stddevs.filter(d=>d.level>=10&&d.level<=15).reduce((s,d)=>s+d.mean,0) /
  Math.max(1, stddevs.filter(d=>d.level>=10&&d.level<=15).length);
const m3_pass = earlyAvg < midAvg;

// 综合覆盖率检查 (M1+M2+M3+M4)
const coverageOK = m1_pass && m2_pass && m3_pass && (totalSolvable === totalTests);
addCheck('契约: 覆盖率稳定性 (M1+M2+M3)', coverageOK, {
  M1_同级稳定性: { pass: m1_pass, max_stddev: maxStddev, target: '≤25', levels: stddevs },
  M2_低关底线: { pass: m2_pass, min_coverage_lv1_5: m2_min, target: '≥25' },
  M3_递进趋势: { pass: m3_pass, early_avg: Math.round(earlyAvg), mid_avg: Math.round(midAvg), target: 'early < mid' },
  M4_可解性: { pass: totalSolvable === totalTests, rate: solvableRate + '%', target: '100%' },
});

// 保留原有覆盖率分布摘要
if (allSamples.length > 0) {
  const sorted = allSamples.map(d => d.coverage_pct).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  addCheck('螺丝遮盖率分布', true, {
    samples: allSamples.length,
    min_pct: sorted[0], p25_pct: sorted[Math.floor(sorted.length * 0.25)], p50_pct: sorted[mid],
    p75_pct: sorted[Math.floor(sorted.length * 0.75)], max_pct: sorted[sorted.length - 1],
    first_10: allSamples.filter(s => s.round === 0).slice(0, 10),
  });
} else {
  addCheck('螺丝遮盖统计', false, { error: '无法生成统计数据' });
}

// 开局可操作螺丝数
if (openCounts.length > 0) {
  const openSorted = openCounts.sort((a, b) => a - b);
  addCheck('开局可操作螺丝数', true, {
    min: openSorted[0], p50: openSorted[Math.floor(openSorted.length / 2)], max: openSorted[openSorted.length - 1],
  });
}

// ====== 写入结果 ======
fs.writeFileSync('verify-results.json', JSON.stringify(results, null, 2));
console.log('[verify] ' + results.summary.passed + '/' + results.summary.total + ' 通过, 可解率=' + solvableRate + '%');
console.log('[verify] 结果写入 verify-results.json');
process.exit(results.summary.failed > 0 ? 1 : 0);
