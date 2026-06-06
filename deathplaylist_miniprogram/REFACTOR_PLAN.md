# 小程序 → H5 重构方案

> 目标：以小程序版本为准，将 H5 前端 (`deathplaylist_frontend`) 重构至功能对齐。
> 核心约束：每步改动小且可验证，避免单次改动过大导致执行卡死。

---

## 当前差距总览

| 能力 | 小程序 | 当前 H5 | 重构动作 |
|------|--------|---------|----------|
| 页面结构 | 6 页独立 (index/selection/picker/preview/share/friends) | 5 视图单文件 (landing/selection/preview/share/friends) | **新增 picker 视图，拆分组件** |
| 选歌流程 | selection(picker入口) → picker(搜索/推荐) → 返回 selection | selection 内嵌搜索，无独立 picker | **拆出独立 Picker 组件** |
| 推荐引擎 | `recommend.js` 6组关键词轮转 + 24h缓存 + 去重 | H5 有类似实现但内嵌 App.tsx | **提取为独立 hook** |
| 登录弹窗 | `auth-popup` 组件，微信登录按钮 + 隐私政策 | 内联实现 | **提取为独立组件** |
| 拖拽排序 | selection + preview 各有独立 touch 拖拽 | preview 用 `Reorder.Group` | **保留 Reorder.Group（已有方案更优）** |
| 分享卡片 | Canvas 2D 绘制 + wxacode + saveToAlbum | html2canvas 截图 | **保留 html2canvas（H5 更适合）** |
| 好友页 | demo 卡 + 登录引导 + 自有歌单 "(我)" 标签 | 类似但简化 | **对齐小程序 UI** |
| 歌曲搜索/选择 | picker 独立页，推荐 + 搜索，可 toggle 已选 | selection 内搜索栏 | **拆出 picker 视图** |
| Intro 编辑 | 不可手动编辑，只能 🎲 随机 | 可手动编辑 + 随机 | **对齐小程序：去掉手动编辑，仅保留随机** |
| 歌单编辑流程 | selection(添加/删除/排序) → preview(预览/编辑intro/保存) | selection(搜索+添加) → preview(排序+intro) → share | **对齐：selection 拆出 picker，preview 仅预览** |

---

## 重构架构

### 文件结构（目标）

```
src/
├── main.tsx              # 入口（不变）
├── index.css             # Tailwind 导入（不变）
├── App.tsx               # 路由 + 全局状态（瘦身至 ~150 行）
├── hooks/
│   ├── useAuth.ts        # 认证状态 + JWT 管理
│   ├── usePlaylist.ts    # 歌单 CRUD
│   └── useRecommend.ts   # 推荐引擎（从小程序 recommend.js 移植）
├── components/
│   ├── AuthPopup.tsx     # 登录弹窗
│   ├── SongRow.tsx       # 歌曲 UI 行（封面 + 标题 + 歌手 + 操作按钮）
│   ├── ShareCard.tsx     # 分享卡片（html2canvas 截图）
│   └── PlaylistCard.tsx  # 好友歌单卡片
├── views/
│   ├── Landing.tsx       # 首页
│   ├── Selection.tsx     # 歌单编辑（歌曲列表 + 添加/删除/排序）
│   ├── Picker.tsx        # 歌曲搜索/推荐选择（新）
│   ├── Preview.tsx       # 歌单预览（intro 随机 + 排序 + 保存）
│   ├── Share.tsx         # 分享卡片生成 + 保存
│   └── Friends.tsx       # 好友歌单列表
└── lib/
    └── api.ts            # apiFetch 封装
```

### 视图状态机（对齐小程序）

```
Landing ──"新的歌单"/"我的歌单"──> Selection
  │                                    │
  │                              选歌 ──> Picker ──(返回)──> Selection
  │                                    │
  │                              "完成"(需登录)──> Preview
  │                                                     │
  │                                               "分享预览"──> Share
  │
  └──"看朋友们的歌单"──> Friends
```

---

## 执行步骤（每步独立可验证）

### Phase 1: 基础拆分（不改功能）

**Step 1** — 提取 `lib/api.ts`
- 将 `apiFetch` 和 `API_BASE` 从 App.tsx 移到 `src/lib/api.ts`
- App.tsx 改为 import
- 验证：`npm run build` 通过

**Step 2** — 提取 `hooks/useAuth.ts`
- 将 `user` state、`jwt` localStorage 操作、`requireLogin`、`pendingAction`、mock 登录逻辑移出
- 暴露：`{ user, requireLogin, login, logout, loginPromise }`
- App.tsx 调用 `useAuth()`
- 验证：`npm run build` 通过

**Step 3** — 提取 `hooks/usePlaylist.ts`
- 将歌单 CRUD（create/update/load my playlist）、`addedSongs` state 移出
- 暴露：`{ addedSongs, setAddedSongs, playlistIntro, setPlaylistIntro, myPlaylistId, savePlaylist, loadMyPlaylist }`
- 验证：`npm run build` 通过

**Step 4** — 提取 `hooks/useRecommend.ts`
- 从 App.tsx 和小程序 `recommend.js` 合并：6组关键词、visit count 轮转、24h 缓存、`shuffleStrict`、`capPerArtist`
- 暴露：`{ recommendations, loading, refresh }`
- 验证：`npm run build` 通过

**Step 5** — 提取 `components/AuthPopup.tsx`
- 登录弹窗 UI + 昵称输入 + 登录按钮 + 隐私政策链接 + 暂不登录
- Props：`{ show, onClose, onLogin }`
- 验证：`npm run build` 通过

**Step 6** — 提取 `components/SongRow.tsx`
- 单行歌曲 UI：封面 + 标题 + 歌手 + 操作按钮（添加/移除/拖拽手柄）
- Props：`{ song, onAction, actionIcon, added, dimmed }`
- 验证：`npm run build` 通过

### Phase 2: 视图拆分（对应小程序页面）

**Step 7** — 提取 `views/Landing.tsx`
- 首页：logo + 标题 + 副标题 + 两个按钮
- Props：`{ onNewPlaylist, onFriends, hasExistingPlaylist }`
- 从 App.tsx 的 landing 视图剪切
- 验证：首页显示正常

**Step 8** — 提取 `views/Selection.tsx`
- 歌单编辑：已选歌曲列表 + 空槽位 + 添加按钮(跳转 Picker) + 删除 + 拖拽排序
- 对齐小程序：9 个槽位（已填/空），点击空槽或 + 按钮进入 Picker
- Props/状态来自 usePlaylist + useAuth
- 验证：添加/删除歌曲正常

**Step 9** — 新建 `views/Picker.tsx`（**核心新功能**）
- 独立歌曲搜索/推荐页，对应小程序 picker 页
- 顶部搜索栏（debounce 400ms）
- 无搜索时显示推荐歌曲（useRecommend）
- 搜索时显示搜索结果
- 已选歌曲显示已添加标记（dimmed）
- 点击歌曲 → 设 `pendingPick` → 返回 Selection
- 验证：搜索 + 推荐 + 选择返回正常

**Step 10** — 提取 `views/Preview.tsx`
- 歌单预览：歌曲列表 + intro 随机(🎲) + 排序 + 保存按钮
- 对齐小程序：intro 不可手动编辑，只能随机
- 保存 → 调用 usePlaylist.savePlaylist → 跳转 Share
- 验证：预览 + 保存 + 跳转正常

**Step 11** — 提取 `views/Share.tsx`
- 分享卡片生成 + 保存图片
- 保留 html2canvas 方案（H5 最优解）
- 对齐小程序卡片布局：黑底 + 歌曲列表 + QR 码 + 品牌
- 验证：卡片生成 + 下载正常

**Step 12** — 提取 `views/Friends.tsx`
- 好友歌单列表
- 对齐小程序：guest 模式 demo 卡 + 自有歌单 "(我)" 标签 + 登录引导
- 提取 `components/PlaylistCard.tsx`
- 验证：好友列表 + guest 模式正常

### Phase 3: App.tsx 瘦身 + 路由整合

**Step 13** — 重写 App.tsx 为路由壳
- 视图状态机：`landing → selection ↔ picker → preview → share`，`landing → friends`
- 全局状态通过 hooks 注入
- 目标 ~150 行
- 验证：完整流程跑通

### Phase 4: 细节对齐

**Step 14** — Intro 逻辑对齐小程序
- Preview 页：intro 为 `suggestedIntro`，只能点 🎲 随机，不可手动编辑
- 15 条预设短语与小程序一致

**Step 15** — Selection 页 9 槽位 UI
- 对齐小程序：9 个可视槽位，已填显示歌曲信息，未填显示虚线 + 号
- 从空槽进入 Picker 时传递 slotIndex

**Step 16** — 分享卡片视觉对齐
- 黑底白字，卡片尺寸自适应歌曲数
- 包含：用户名 + intro + 歌曲列表（封面+标题+歌手）+ QR码 + "死亡歌单"品牌

---

## 性能优化要点

1. **代码拆分**：每个 view 用 `React.lazy` + `Suspense` 按需加载
2. **搜索 debounce**：保留 400ms，避免频繁 API 调用
3. **推荐缓存**：localStorage 24h TTL，避免重复请求
4. **图片懒加载**：专辑封面 `<img loading="lazy">`
5. **html2canvas 替代考量**：若性能不佳可换用纯 CSS 卡片 + `dom-to-image`

---

## 需保留的 H5 优势

- **Tailwind CSS 4** 样式系统（比小程序 WXSS 开发效率高）
- **Framer Motion** 动画（小程序没有）
- **html2canvas** 分享卡片（比 Canvas 2D API 开发简单）
- **Reorder.Group** 拖拽排序（比小程序 touch 事件实现更稳定）

---

## 不移植的小程序特有逻辑

- `wx.login()` / `wx.cloud` → H5 使用 mock 登录 + URL param wxCode
- `wx.saveImageToPhotosAlbum` → H5 使用 `<a download>`
- `wx.requirePrivacyAuthorize` → H5 不需要
- `qrcode.js` 客户端 QR → H5 使用 API 生成或 `api.qrserver.com`
- `wx.onShareAppMessage` → H5 使用微信 JS-SDK 或手动分享

---

## 验证清单

每个 Step 完成后执行：
```bash
cd deathplaylist_frontend && npm run build
```
全部完成后执行完整流程验证：
1. 首页 → 新的歌单 → 搜索添加歌曲 → 完成 → 预览 → 分享 → 保存图片
2. 首页 → 看朋友们的歌单 → guest 模式 → 登录
3. 推荐歌曲显示 + 切换
4. 歌单编辑 → 排序 → 保存 → 再次打开（持久化验证）
