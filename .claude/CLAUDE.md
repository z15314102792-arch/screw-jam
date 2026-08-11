# 螺丝消除 · 解压小游戏

> v1.0 | 2026-08-11

## 项目简介

基于抖音爆款 **Screw Jam（螺丝消除）** 玩法复刻的 HTML5 解压小游戏。
单文件实现，Canvas 渲染 + Web Audio API 音效合成，无任何外部依赖。

## 技术栈

- **前端**: 原生 HTML/CSS/JS，单文件 `index.html`
- **渲染**: Canvas 2D（六角螺丝、面板、粒子）
- **音效**: Web Audio API（全合成，无音频文件）
- **部署**: GitHub Pages（`/docs` 或根目录）

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

### v1.0 (2026-08-11)
- 初版：核心玩法、关卡生成、6色体系
- 音效：4种游戏音效 + 3种事件音效 + BGM
- 特效：螺丝拧出动效、面板掉落粒子、过关烟花
- 功能：撤销、提示、暂停、音效开关

## 待办

- [ ] 螺丝刀/手指动画
- [ ] 更多面板形状（圆形、L形板子）
- [ ] 关卡选择界面
- [ ] 炸弹螺丝（限时螺丝）
- [ ] 冰冻螺丝（需要先解冻）
- [ ] 连击加分系统
- [ ] 排行榜/存档
