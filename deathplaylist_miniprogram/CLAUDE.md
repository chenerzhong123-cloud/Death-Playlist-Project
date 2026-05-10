# CLAUDE.md — 死亡歌单 (Death Playlist)

> **⚠️ 本项目包含三个独立代码仓库，修改前务必确认路径正确：**
> - 前端（H5）：`/Users/deuce.chen/deathplaylist/deathplaylist_frontend`
> - 后端（NestJS API）：`/Users/deuce.chen/deathplaylist/deathplaylist_backends`
> - 微信小程序壳：`/Users/deuce.chen/deathplaylist/deathplaylist_miniprogram`
>
> **不要找错路径修改代码。**

## Project Overview

**死亡歌单** 是一款中文微信小程序 + H5 应用，用户创建并分享自己的"葬礼歌单"。用户可以搜索和选择最多 9 首歌曲、随机生成个性化 intro、生成分享卡片（Canvas 绘制 + 小程序码）、查看朋友的歌单。

- **未登录用户**可自由浏览首页、搜索和添加歌曲，仅在保存歌单或查看完整好友列表时要求登录。
- **登录方式**：`wx.login()` 获取 code → 后端 `jscode2session` → 返回 JWT。用户默认昵称"微信用户"。

## Three Sub-Projects

### 1. Frontend (`deathplaylist_frontend/`)

React 19 SPA，Vite 6 构建，Tailwind CSS 4，Framer Motion。

- 所有逻辑在 `src/App.tsx`（~980 行），视图状态机：`landing → selection → preview → share → friends`
- 构建产物复制到后端 `static/` 目录，由 NestJS 统一托管
- 详细说明见 `deathplaylist_frontend/CLAUDE.md`

### 2. Backend (`deathplaylist_backends/`)

NestJS 11 + TypeORM + SQLite，微信云托管部署。

- 认证、歌曲搜索（iTunes API）、歌单 CRUD（每用户一个）、好友关系、分享链接
- `static/` 目录托管前端构建产物
- 详细说明见 `deathplaylist_backends/CLAUDE.md`

### 3. Mini Program Shell (`deathplaylist_miniprogram/`)

原生微信小程序，作为壳加载 H5 页面 + 提供原生能力（wx.login、Canvas 分享卡片、隐私授权）。

- **AppID:** `wxd9305525bdda7423`
- **云环境:** `prod-1gis5b1g29ea3aec`
- **API 地址:** `https://www.deuce.monster/api`

#### 小程序结构

```
miniprogram/
├── app.js / app.json / app.wxss     # 全局入口
├── utils/
│   ├── api.js       # HTTP 请求封装（wx.request / wx.cloud.callContainer 双模式）
│   ├── auth.js      # 登录、JWT 存储、自动登录
│   ├── recommend.js # 歌曲推荐（6组关键词轮转 + 去重 + 无相邻同歌手）
│   ├── helper.wxs   # WXS 工具函数（isAdded, formatDuration）
│   └── qrcode.js    # 纯 JS QR 码生成（Canvas 分享卡片备用）
├── components/
│   └── auth-popup/  # 登录弹窗组件（微信登录按钮 + 隐私政策链接）
├── pages/
│   ├── index/       # 首页（logo + 两个入口按钮）
│   ├── selection/   # 歌单编辑（添加/删除/拖拽排序歌曲 + intro 随机切换 🎲）
│   ├── picker/      # 歌曲搜索/推荐选择页
│   ├── share/       # Canvas 绘制分享卡片 + 保存相册
│   ├── friends/     # 好友歌单列表（未登录显示 demo 卡 + 登录引导）
│   └── privacy/     # 隐私政策页
└── images/          # logo 图片资源
```

#### 小程序关键机制

| 机制 | 说明 |
|------|------|
| **认证** | `wx.login()` → code → `POST /auth/wechat` → JWT 存 `wx.Storage` |
| **自动登录** | `app.onLaunch` 调用 `tryAutoLogin()`：先试 JWT → 失败则 `wx.login()` |
| **登录门控** | `selection.js` 的 `onComplete` 检查 `app.globalData.user`，无则弹 auth-popup |
| **歌单编辑** | 选歌页 `picker` → `_pendingPick` 存 `globalData` → 返回 `selection` 时 `onShow` 读取 |
| **拖拽排序** | `selection.js` 纯 touch 事件实现长按拖拽（150ms 延迟激活，8px 移动取消） |
| **Intro 随机** | `INTRO_SUGGESTIONS` 15 条中文短语，🎲 按钮随机切换，不可手动编辑 |
| **分享卡片** | Canvas 2D API 绘制黑底卡片：用户名 + intro + 歌曲列表 + 小程序码/QR 码 |
| **推荐系统** | 6 组关键词按访问次数轮转，24h 缓存，`shuffleStrict()` 确保无相邻同歌手 |
| **隐私合规** | `__usePrivacyCheck__` + `wx.onNeedPrivacyAuthorization` + `wx.requirePrivacyAuthorize` |
| **分享转发** | 各页 `onShareAppMessage()` 提供自定义标题和路径 |

#### 小程序全局数据 (`app.globalData`)

```js
{
  user: null,           // { id, nickname, avatar }
  addedSongs: [],       // 已选歌曲列表
  playlistIntro: '',    // 用户自定义 intro
  myPlaylistId: null,   // 已保存的歌单 ID
  suggestedIntro: '',   // 随机 intro 建议
  _pendingPick: null,   // picker → selection 传递的选歌结果
}
```

## Deployment Flow

**后端 + H5 前端统一部署到阿里云服务器，域名 `www.deuce.monster`：**

```bash
# 1. 构建前端
cd /Users/deuce.chen/deathplaylist/deathplaylist_frontend
npm run build

# 2. 复制到后端 static/
rm -rf ../deathplaylist_backends/static
cp -r dist ../deathplaylist_backends/static

# 3. 构建后端
cd ../deathplaylist_backends
npm run build

# 4. 部署到阿里云（Docker 或直接运行）
# Docker:
docker build -t deathplaylist .
docker run -d -p 80:80 -e CORS_ORIGINS=https://www.deuce.monster deathplaylist
# 或直接:
# NODE_ENV=production PORT=80 node dist/main.js

# 5. 小程序壳：在微信开发者工具中上传代码 → 提交审核
```

**正式域名：** `www.deuce.monster`，已配置在各项目的 API 地址和 CORS 中。
- `deathplaylist_frontend/src/App.tsx` → `API_BASE`
- `deathplaylist_miniprogram/utils/api.js` → `API_BASE`
- `deathplaylist_backends/.env` → `CORS_ORIGINS`

## API Endpoints (Backend)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/auth/wechat` | No | 微信登录（code + nickname） |
| `GET /api/users/me` | JWT | 获取当前用户 |
| `PATCH /api/users/me` | JWT | 更新用户资料 |
| `GET /api/songs/search?q=&limit=` | No | 搜索歌曲（iTunes API） |
| `POST /api/playlists` | JWT | 创建歌单（每用户限一个） |
| `GET /api/playlists/me` | JWT | 获取我的歌单 |
| `PUT /api/playlists/:id` | JWT | 更新歌单 |
| `GET /api/playlists/friends` | JWT | 获取好友歌单 |
| `GET /api/playlists/:id` | No | 获取指定歌单 |
| `GET /api/share/:id/wxacode` | No | 获取小程序码图片 |

## Key Patterns & Conventions

- **纯 JavaScript**：小程序代码使用 ES5/ES6 混写，无 TypeScript
- **globalData 传递**：页面间通过 `app.globalData` 共享状态，不用 URL 参数传复杂数据
- **Promise + async/await**：工具函数和 `app.js` 用 async/await，页面事件回调用 Promise `.then()`
- **Privacy API**：`wx.requirePrivacyAuthorize()` 在保存相册前调用，`wx.onNeedPrivacyAuthorization` 在 `app.js` 全局自动同意
- **API 双模式**：`utils/api.js` 支持 `wx.request`（直连）和 `wx.cloud.callContainer`（云托管内网），通过 `USE_CALL_CONTAINER` 切换
- **无 CSS 预处理器**：小程序使用原生 WXSS（类似 CSS，支持 rpx 单位）
