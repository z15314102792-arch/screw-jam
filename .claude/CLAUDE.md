# 螺丝消除 · 解压小游戏

> v1.5 | 2026-08-11

## 项目简介

基于抖音爆款 **Screw Jam（螺丝消除）** 玩法复刻的 HTML5 解压小游戏。
单文件实现，Canvas 渲染 + Web Audio API 音效合成，无任何外部依赖。

## 技术栈

- **前端**: 原生 HTML/CSS/JS，单文件 `index.html`
- **渲染**: Canvas 2D（六角螺丝、面板、粒子）
- **音效**: Web Audio API（全合成，无音频文件）
- **部署**: GitHub Pages（根目录）

## 部署方式

GitHub Pages → 仓库 Settings → Pages → Branch: `master` → 根目录 → Save

URL: https://z15314102792-arch.github.io/screw-jam/

## 核心架构

```
index.html
├── Audio (音效引擎) — Web Audio API 合成
│   ├── unscrew / boxIn / boxFull / panelDrop / win / lose / bgm
├── genLevel(lv) — 关卡生成器
│   ├── 2~6 色 × 3~4 螺丝/盒 = 6~24 螺丝
│   ├── 面板随机布局 + 层级遮挡
│   └── 收纳盒队列随机排列
├── Game (游戏主类)
│   ├── _tap → _remove → _animUn → _place → _checkPanels
│   ├── undo / hint / restart / next
│   └── _loop (60fps 渲染)
└── 粒子系统: sparks / burst / panelBurst
```

## 版本历史

### v1.5 (2026-08-11)
- **3项用户反馈修复**：
  1. BGM音量大幅提升 — bgmGain 0.06→0.22，Master 0.5→0.65，各乐器分量翻2-3倍
  2. 自动收纳飞行动画 — 暂存螺丝像正常螺丝一样从临时区弧线飞入盒子，带拖尾粒子
  3. 难度显著提升 — tempMax 比 v1.4 减少 1-2 格，面板更集中重叠，关卡生成尝试次数 50→80

### v1.4 (2026-08-11)
- **5项重大改进**：
  1. Lo-fi 解压 BGM — 4和弦进行（Am-F-C-G）+ bass + pad + hi-hat + 木鱼
  2. 木板下落优化 — 速度减半、下落空间加倍、音效增强
  3. 结束自动清暂存区 — 所有面板清空后自动匹配暂存螺丝到盒子
  4. 难度曲线重写 — 1关极易→快速递增，贪心求解器保证可解（30关×3轮=90/90通过）
  5. 木板样式升级 — 8种木纹配色（橡木/蜂蜜/核桃/柚木/枫木/樱桃/松木/灰木）+ 木纤维纹 + 木节

### v1.3 (2026-08-11)
- **修复9个问题**：
  1. 移除木板掉落时的屏幕震动
  2. 修复空白木板bug（每块木板至少1颗螺丝）
  3. 木板支点旋转下落（替代滑动）
  4. 重来按钮现在重玩同一关（保存种子）
  5. 提示光环更大更明显（双层：金色+虚线）
  6. 主界面默认显示，不再直接进入关卡
  7. 主界面新增详细游戏规则说明
  8. 撤销时恢复面板状态（掉落、摇晃）
  9. 面板下落用蒙版裁剪替代渐隐

### v1.2 (2026-08-11)
- 动画全面升级 — 螺丝飞行弧线+圆角3D螺丝+面板圆角16px+震屏+连击+拖尾粒子

### v1.1 (2026-08-11)
- 微信浏览器全兼容 — WeixinJSBridge 音频解锁、X5 meta、全局触摸防护、安全区适配

### v1.0 (2026-08-11)
- 初版上线，6色体系，关卡生成器，音效特效完备

## 微信兼容（v1.1）

| 项目 | 方案 |
|------|------|
| 音频解锁 | WeixinJSBridge + touchstart 双重保险 |
| X5 浏览器 | x5-orientation/fullscreen/page-mode meta |
| 下拉刷新 | 全局 touchmove capture + CSS overflow:hidden |
| 长按菜单 | contextmenu preventDefault |
| 双击缩放 | dblclick preventDefault + maximum-scale=1.0 |
| 字体调整 | setFontSizeCallback 锁定 |
| 安全区 | viewport-fit=cover + env(safe-area-inset-*) |
| 横竖屏 | orientationchange 监听 + resize 触发 |
| 点击高亮 | -webkit-tap-highlight-color:transparent |
| 文本渲染 | -webkit-font-smoothing:antialiased |

## 待办

- 炸弹螺丝（限时螺丝）
- 冰冻螺丝（需解冻）
- 更多面板形状
- 连击加分系统
