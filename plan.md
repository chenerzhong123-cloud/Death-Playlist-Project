# 死亡歌单三端最小修复计划

生成日期：2026-05-10

## 0. 项目范围与本次结论

当前目录下按实际代码仓库拆为 3 个子项目：

1. H5 前端：`deathplaylist_frontend/`
   - React 19 + Vite 6 + Tailwind CSS 4。
   - 入口为 `src/App.tsx`，当前仍是单文件状态机实现：`landing -> selection -> preview -> share -> friends`。
2. 后端：`deathplaylist_backends/`
   - NestJS 11 + TypeORM + better-sqlite3。
   - 提供 `/api/auth`、`/api/songs`、`/api/playlists`、`/api/friends`、`/api/share`。
   - 同时托管 H5 构建产物 `static/`。
3. 小程序前端：`deathplaylist_miniprogram/`
   - 原生微信小程序。
   - 通过 `utils/api.js` 调用同一套后端 API，并用 Canvas 生成分享卡片。

本次已读取项目文件清单，并逐项检查业务源码、配置、说明文档与静态入口文件。`package-lock.json`、`static/assets/*`、图片和 `.claude/skills/*` 属于依赖锁定、构建产物或工具数据，本计划只把它们作为版本/部署风险纳入判断，不作为手写业务代码修改对象。

本次已经先把小程序主流程更新到与当前 H5 主流程一致：选歌页点击“完成”后进入预览页，预览页再保存并进入分享页；同时修复登录弹窗无法输入昵称的问题。详见第 1 节。

## 1. 本次已完成的小程序对齐

### 1.1 已修改文件

1. `deathplaylist_miniprogram/app.json`
   - 注册已有但未生效的 `pages/preview/preview`。
   - 修复原先 `wx.navigateTo({ url: '/pages/preview/preview' })` 会失败的断点。
2. `deathplaylist_miniprogram/components/auth-popup/auth-popup.wxml`
   - 将弹窗标题改为“设置昵称”。
   - 增加昵称输入框，`maxlength=15`，回车可触发登录。
   - 登录按钮文案改为“开始使用”，并绑定 loading 状态。
3. `deathplaylist_miniprogram/components/auth-popup/auth-popup.js`
   - 昵称为空时默认使用“微信用户”，对齐 H5 的默认昵称逻辑。
   - 去掉“必须输入昵称”的阻断，否则原 WXML 没有输入框时登录永远不可用。
4. `deathplaylist_miniprogram/components/auth-popup/auth-popup.wxss`
   - 补齐昵称输入框盒模型和 placeholder 样式。
5. `deathplaylist_miniprogram/pages/index/index.wxml`
   - 首页副标题改为 H5 当前文案：
     - “不想自己的葬礼还在吹唢呐放哀乐？”
     - “选择你的葬礼上播放的音乐吧”
6. `deathplaylist_miniprogram/pages/selection/selection.js`
   - `onComplete` 从“直接保存并跳分享页”改为“登录门控后跳预览页”。
   - 删除选择页里已废弃的直接保存代码，让保存职责只保留在 `pages/preview/preview.js`。
7. `deathplaylist_miniprogram/pages/selection/selection.wxml`
   - 页标题改为“定制你的歌单”。
   - 底部按钮文案从“保存”改为“完成”。

### 1.2 当前小程序主流程

```text
首页 -> 定制你的歌单(selection) -> 选择歌曲(picker) -> 返回 selection
selection 点击完成 -> 未登录弹出 auth-popup / 已登录进入 preview
preview 点击分享预览 -> 创建或更新歌单 -> share
share -> 生成 Canvas 分享卡片 -> 保存到相册或转发
```

### 1.3 已执行校验

1. 小程序 JS 语法检查：通过。
   - 命令范围：`app.js`、`pages/**/*.js`、`components/**/*.js`、`utils/**/*.js`，排除 `.git` 和 `.claude`。
2. 小程序 JSON 语法检查：通过。
   - 命令范围：`app.json`、`project*.json`、`pages/**/*.json`、`components/**/*.json`。
3. VS Code 诊断：本次修改的 JS/WXML/WXSS/JSON 文件均无错误。
4. H5 `npm run lint` 未能执行到 TypeScript 校验，因为当前未安装依赖，报错为 `tsc: command not found`。
5. 后端 `npm run build` 未能执行到 Nest 构建，因为当前未安装依赖，报错为 `nest: command not found`。

下一步执行本计划前，先在 H5 和后端分别执行 `npm ci`，再运行对应校验命令。

## 2. H5 前端现存 Bug 与技术风险

### H5-P0-1：`html2canvas` 被引用但未声明依赖，安装后构建会失败

风险位置：`deathplaylist_frontend/src/App.tsx` 引入 `html2canvas`，但 `deathplaylist_frontend/package.json` 和 `package-lock.json` 中没有 `html2canvas`。

影响：

1. 当前没有 `node_modules` 时已无法运行 `npm run lint`。
2. 安装依赖后，TypeScript/Vite 会因找不到 `html2canvas` 模块而失败。
3. 分享卡片保存功能依赖该库，属于核心分享链路。

最小修复：

1. 进入 H5 子项目：`cd deathplaylist_frontend`。
2. 执行：`npm install html2canvas`。
3. 确认 `package.json` dependencies 新增 `html2canvas`，`package-lock.json` 同步更新。
4. 执行：`npm run lint && npm run build`。

验收标准：

1. `npm run lint` 不再报 `Cannot find module 'html2canvas'`。
2. `npm run build` 生成 `dist/`，且 `scripts/unwrap-css-layers.js` 正常执行。

### H5-P0-2：默认 intro 展示与保存不一致

风险位置：`deathplaylist_frontend/src/App.tsx`。

当前行为：

1. 预览页和分享页显示 `playlistIntro || suggestedIntro`。
2. 保存歌单时发送的是 `intro: playlistIntro`。
3. 如果用户没有手动编辑 intro，后端保存的是空字符串。
4. 当前会话分享页看起来正常，但刷新、好友页或再次加载后会丢失当时显示的默认 intro。

最小修复：

1. 在 `App` 函数组件内新增一个稳定方法：

```ts
const getEffectiveIntro = () => (playlistIntro.trim() || suggestedIntro).slice(0, 30);
```

2. 保存歌单前先计算：

```ts
const effectiveIntro = getEffectiveIntro();
```

3. `POST /playlists` 和 `PUT /playlists/:id` 的 body 改为：

```ts
body: JSON.stringify({ intro: effectiveIntro, songs: songsPayload })
```

4. 保存成功后执行：

```ts
setPlaylistIntro(effectiveIntro);
```

5. 分享卡片、好友页本人的卡片统一使用 `getEffectiveIntro()`，不要直接使用 `playlistIntro`。

验收标准：

1. 用户不编辑 intro，直接保存后，`GET /api/playlists/me` 返回的 `intro` 是当前页面展示的那句文案。
2. 刷新后再次进入“我的歌单”，intro 不丢失。
3. 好友页自己的卡片不再显示“暂无简介”。

### H5-P0-3：API 地址硬编码为 HTTP IP，部署和微信环境风险高

风险位置：`deathplaylist_frontend/src/App.tsx` 的 `API_BASE`。

当前行为：

```ts
const API_BASE = 'http://47.103.81.95/api';
```

影响：

1. 正式域名或 HTTPS 切换时必须改源码。
2. H5 由后端同源托管时，仍跨源请求硬编码 IP。
3. 微信 WebView/小程序正式环境更容易受 HTTPS 和域名白名单限制。

最小修复：

1. 把 `API_BASE` 改为环境变量优先、生产同源、开发本地后端：

```ts
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/api');
```

2. 在 `deathplaylist_frontend/.env.example` 增加：

```env
VITE_API_BASE=http://localhost:3001/api
```

3. 保留生产部署时不配置 `VITE_API_BASE`，让 H5 自动走同源 `/api`。

验收标准：

1. 本地 `npm run dev` 时可通过 `.env.local` 指向后端。
2. 后端托管 `static/` 时，浏览器 Network 中 API 请求为同源 `/api/...`。
3. 源码不再出现硬编码 `http://47.103.81.95/api`。

### H5-P1-1：登录弹窗关闭后未清理 pending action，可能执行过期动作

风险位置：`deathplaylist_frontend/src/App.tsx` 中 `pendingAction` 和 auth popup。

当前行为：

1. 触发登录门控时设置 `pendingAction.current`。
2. 用户点击“暂不登录”只关闭弹窗。
3. 下一次成功登录时，旧的 pending action 可能被执行。

最小修复：

1. 新增关闭方法：

```ts
const closeAuthPopup = () => {
  pendingAction.current = null;
  setShowAuthPopup(false);
};
```

2. “暂不登录”按钮改为调用 `closeAuthPopup`。
3. `handleLogin` 中执行 pending action 前先取出并清空：

```ts
const action = pendingAction.current;
pendingAction.current = null;
if (action) action();
```

验收标准：

1. 点“完成”弹登录，点“暂不登录”，再从好友页登录，不会自动跳预览页。
2. 点“分享预览”弹登录，成功登录后仍会继续保存并跳分享页。

### H5-P1-2：静态 HTML 标题仍是脚手架默认值

风险位置：`deathplaylist_frontend/index.html`、`deathplaylist_backends/static/index.html`。

当前标题：`My Google AI Studio App`。

最小修复：

1. 将 `deathplaylist_frontend/index.html` 的 title 改为：

```html
<title>死亡歌单</title>
```

2. H5 构建后重新复制 `dist/` 到后端 `static/`，不要手工改 `static/index.html`。

验收标准：浏览器标签页显示“死亡歌单”。

### H5-P1-3：分享二维码不是歌单级链接

风险位置：`deathplaylist_frontend/src/App.tsx` 分享卡片二维码。

当前行为：二维码固定为 `weixin://dl/business/?appid=wxd9305525bdda7423`，不包含歌单 ID。

影响：扫码无法打开具体歌单，只能打开小程序入口或失败。

最小修复依赖后端和小程序的分享链路修复，执行顺序见第 4 节和第 5 节。H5 侧最终应改为：

1. 如果 `myPlaylistId` 存在，二维码内容使用后端返回的分享目标。
2. 分享目标必须能打开具体歌单，而不是泛化的小程序入口。
3. 若后端提供 `GET /api/share/:id` JSON，H5 分享卡片不应直接把 JSON URL 放给用户扫码；需要一个可展示页面或小程序码。

## 3. 后端现存 Bug 与技术风险

### BE-P0-1：后端没有加载 `.env`，环境变量说明与实际运行不一致

风险位置：`deathplaylist_backends/src/main.ts`、`src/app.module.ts`、`src/auth/auth.service.ts`、`src/share/share.service.ts`。

当前行为：源码直接读取 `process.env`，但项目没有 `@nestjs/config` 或 `dotenv/config`。如果运行进程前没有显式导出环境变量，`.env` 文件不会自动生效。

影响：

1. `.env.example` 中 `PORT=3001` 对 `npm run start:dev` 不自动生效，服务默认监听 80。
2. `JWT_SECRET`、`WECHAT_APP_ID`、`WECHAT_APP_SECRET` 可能默认为不安全值或 mock 模式。
3. 文档与实际运行不一致。

最小修复：

1. 进入后端子项目：`cd deathplaylist_backends`。
2. 执行：`npm install dotenv`。
3. 在 `src/main.ts` 第一行增加：

```ts
import 'dotenv/config';
```

4. 确认该 import 位于 `AppModule` import 之前。
5. 执行：`npm run build`。

验收标准：

1. 本地创建 `.env` 后，`PORT=3001 npm run start:dev` 或 `.env` 中的 `PORT=3001` 能让服务监听 3001。
2. `WECHAT_APP_ID` 配置后，登录不再无条件进入 mock fallback。

### BE-P0-2：歌单更新 delete-all-then-insert 无事务，失败会导致歌单清空

风险位置：`deathplaylist_backends/src/playlists/playlists.service.ts`。

当前行为：

1. 更新歌单时先删除所有 `playlist_songs`。
2. 再逐首 upsert song 并插入 join 记录。
3. 如果插入中途失败，原歌单歌曲已被删除。

最小修复：

1. 在 `PlaylistsService` 注入 `DataSource`：

```ts
import { DataSource, Repository, In } from 'typeorm';

constructor(
  private dataSource: DataSource,
  ...
) {}
```

2. 在 `update` 中先校验歌曲数量，再在删除前预创建/获取歌曲实体：

```ts
const resolvedSongs = data.songs
  ? await Promise.all(data.songs.map((song) => this.songsService.findOrCreate(song)))
  : null;
```

3. 用事务包住 playlist 保存、删除 join、插入 join：

```ts
await this.dataSource.transaction(async (manager) => {
  if (hasMetaChanges) await manager.save(Playlist, playlist);
  if (resolvedSongs) {
    await manager.delete(PlaylistSong, { playlistId: id });
    await manager.save(
      PlaylistSong,
      resolvedSongs.map((song, index) => manager.create(PlaylistSong, {
        playlistId: id,
        songId: song.id,
        sortOrder: index,
      })),
    );
  }
});
```

4. `create` 也用同样方式事务化，避免创建 playlist 后插入歌曲失败产生空歌单。

验收标准：

1. 人为让第 2 首歌曲插入失败时，旧歌单歌曲不被清空。
2. 正常更新后，`GET /api/playlists/me` 返回新顺序。

### BE-P0-3：返回歌单时歌曲顺序不稳定

风险位置：`deathplaylist_backends/src/playlists/playlists.service.ts`。

当前行为：

1. `findById` 手动排序了 `playlist.playlistSongs`。
2. `findByUserId` 和 `getFriendsPlaylists` 没有排序。
3. `formatPlaylist` 直接 map 当前 relation 数组。

影响：H5 加载“我的歌单”或好友歌单时，歌曲可能不是用户保存的顺序。

最小修复：

1. 在 `formatPlaylist` 内部统一排序：

```ts
const playlistSongs = [...(playlist.playlistSongs || [])]
  .sort((a, b) => a.sortOrder - b.sortOrder);
```

2. 下方 `songs` 改为从 `playlistSongs.map(...)` 生成。

3. 保留 `findById` 的排序也可以，但真正保证输出顺序的是 `formatPlaylist`。

验收标准：

1. 调整顺序保存后，`GET /api/playlists/me`、`GET /api/playlists/:id`、`GET /api/playlists/friends` 三个接口顺序一致。

### BE-P0-4：每人一份歌单只靠业务层判断，存在并发重复创建风险

风险位置：`deathplaylist_backends/src/playlists/playlist.entity.ts`、`playlists.controller.ts`。

当前行为：`POST /playlists` 先查 `findByUserId`，再创建。两个并发请求可能都查到不存在，然后各自创建。

最小修复：

1. 在 `Playlist` entity 增加唯一索引：

```ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';

@Entity('playlists')
@Index('IDX_playlists_userId_unique', ['userId'], { unique: true })
export class Playlist { ... }
```

2. 保留 controller 的业务提示。
3. 在 `create` 捕获数据库唯一约束错误，转换为 `BadRequestException('每人只能创建一份歌单，请使用更新接口')`。

验收标准：并发两次 `POST /api/playlists`，只会成功一次，另一次返回明确业务错误。

### BE-P0-5：分享小程序码无法可靠打开具体歌单

风险位置：`deathplaylist_backends/src/share/share.service.ts`、小程序 `pages/index/index.js`。

当前行为：

1. 后端使用 `getwxacodeunlimit`，`scene: playlistId.substring(0, 32)`。
2. UUID 长度 36，截断后不是完整 playlistId。
3. 小程序首页没有解析 `scene` 或 `playlistId`，扫码后无法加载具体歌单。
4. `env_version` 固定为 `develop`，正式分享可能打开开发版。

最小修复方案：

1. 后端先改为 `getwxacode`，使用完整 query path：

```ts
const url = `https://api.weixin.qq.com/wxa/getwxacode?access_token=${token}`;
body: JSON.stringify({
  path: `pages/index/index?playlistId=${playlistId}`,
  width: 280,
  auto_color: false,
  line_color: { r: 255, g: 255, b: 255 },
  is_hyaline: true,
  env_version: process.env.WECHAT_ENV_VERSION || 'release',
})
```

2. `.env.example` 增加：

```env
WECHAT_ENV_VERSION=release
```

3. 小程序在下一轮跟进中解析 `options.playlistId`，详见第 5 节。

验收标准：生成的小程序码包含完整 playlistId，扫码进入小程序能拿到 `options.playlistId`。

### BE-P1-1：生产安全默认值风险

风险位置：`auth.module.ts`、`jwt.strategy.ts`、`auth.service.ts`、`share.service.ts`、`app.module.ts`、`.npmrc`。

风险点：

1. `JWT_SECRET` 有默认值。
2. `WECHAT_APP_ID` 未配置时自动 mock。
3. TypeORM `synchronize: true` 在生产可能误改 schema。
4. `.npmrc` 设置 `strict-ssl=false`。

最小修复：

1. 新增 `src/config.ts`，集中读取环境变量。
2. 当 `NODE_ENV === 'production'` 且 `JWT_SECRET` 缺失或等于默认值时，启动直接抛错。
3. 当 `NODE_ENV === 'production'` 且微信配置缺失时，不允许 auth/share 静默 mock。
4. TypeORM 改为：

```ts
synchronize: process.env.TYPEORM_SYNC === 'true',
```

5. `.env.example` 增加：

```env
TYPEORM_SYNC=true
```

6. 删除 `.npmrc` 中 `strict-ssl=false`，如必须使用镜像，仅保留 registry。

验收标准：生产环境缺关键密钥时服务拒绝启动，而不是以默认密钥上线。

### BE-P1-2：歌曲搜索缺少超时和 limit 边界

风险位置：`deathplaylist_backends/src/songs/songs.controller.ts`、`songs.service.ts`。

当前行为：

1. `limit` 直接 `parseInt`，没有 NaN、最小值、最大值处理。
2. 调 iTunes API 没有超时。

最小修复：

1. controller 中 clamp limit：

```ts
const parsedLimit = Number.parseInt(limit || '20', 10);
const safeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 20;
```

2. query 超过 100 字符直接截断或返回 `BadRequestException`。
3. service 中为 fetch 增加 `AbortController`，5 秒超时后 fallback 本地搜索。

验收标准：`limit=9999` 最多返回 50 条；iTunes 超时不会拖死接口。

### BE-P1-3：好友关系写入无事务且未显式校验 friendId

风险位置：`deathplaylist_backends/src/friends/friends.service.ts`。

最小修复：

1. 添加好友前先查 `friendId` 对应用户是否存在，不存在返回 `BadRequestException('好友不存在')`。
2. A->B 和 B->A 两条记录用事务同时写入。
3. 为 `(userId, friendId)` 增加唯一索引，避免重复行。

验收标准：添加不存在用户不会产生数据库异常；重复添加不会产生重复关系。

## 4. 建议执行顺序：H5 与后端最小修复

### Phase A：准备与基线验证

1. H5：

```bash
cd deathplaylist_frontend
npm ci
npm run lint
```

预期：当前会先暴露 `html2canvas` 缺失问题。

2. 后端：

```bash
cd deathplaylist_backends
npm ci
npm run build
```

预期：依赖安装后能执行 Nest 构建；若暴露 TypeScript 错误，先记录，不做无关重构。

### Phase B：先修会阻塞构建或核心链路的问题

1. 修 H5-P0-1：安装 `html2canvas`。
2. 修 H5-P0-2：统一 effective intro。
3. 修 BE-P0-1：后端加载 `.env`。
4. 修 BE-P0-3：后端统一输出歌曲顺序。

每完成一项执行一次：

```bash
# H5 修改后
cd deathplaylist_frontend && npm run lint && npm run build

# 后端修改后
cd deathplaylist_backends && npm run build
```

### Phase C：修数据一致性和并发风险

1. 修 BE-P0-2：歌单 create/update 事务化。
2. 修 BE-P0-4：Playlist userId 唯一索引。
3. 对 create/update 加最小测试脚本或手工 curl 验证。

手工验证样例：

```bash
# 1. 登录拿 token
curl -s -X POST http://localhost:3001/api/auth/wechat \
  -H 'Content-Type: application/json' \
  -d '{"code":"mock_plan","nickname":"Plan用户"}'

# 2. 创建 1 首歌的歌单
# 3. PUT 更新为 3 首并改变顺序
# 4. GET /api/playlists/me 检查 sortOrder 与返回顺序
```

### Phase D：修部署与分享链路

1. 修 H5-P0-3：H5 API base 环境化。
2. 修 H5-P1-2：页面 title。
3. 修 BE-P0-5：后端小程序码携带完整 playlistId，并使用 `WECHAT_ENV_VERSION`。
4. 修 BE-P1-1：生产安全默认值。
5. 修 BE-P1-2：搜索超时和 limit 边界。

### Phase E：重新构建并同步静态资源

H5 和后端都通过后：

```bash
cd deathplaylist_frontend
npm run build

cd ../deathplaylist_backends
rm -rf static
cp -r ../deathplaylist_frontend/dist static
npm run build
```

验收标准：

1. `deathplaylist_backends/static/index.html` 的 title 来自 H5 构建结果，不再是脚手架默认值。
2. `static/assets/*.css` 已经过 `unwrap-css-layers.js` 后处理。
3. 后端启动后访问 `/` 能打开 H5，访问 `/api/users/me` 仍走 API。

## 5. H5 与后端优化后，小程序需要再次更新的计划

本次已经先把小程序主流程对齐当前 H5。等第 4 节的 H5/后端修复完成后，小程序还需要再做一轮同步，避免三端再次分叉。

### MP-NEXT-1：同步 API base 和 HTTPS/域名策略

风险位置：`deathplaylist_miniprogram/utils/api.js`。

后续修改：

1. 把 `API_BASE = 'http://47.103.81.95/api'` 替换为正式 HTTPS 域名。
2. 如果继续保留 `USE_CALL_CONTAINER`，明确生产模式只使用一种通道，避免直连和云托管配置长期并存。
3. `request` 在收到 401 时统一清理 `jwt` 和 `user`，并返回可识别错误：

```js
if (res.statusCode === 401) {
  wx.removeStorageSync('jwt')
  wx.removeStorageSync('user')
  getApp().globalData.user = null
}
```

验收标准：正式版小程序不再请求 HTTP IP；登录过期后不会静默显示旧用户状态。

### MP-NEXT-2：解析分享入口，支持打开具体歌单

风险位置：`pages/index/index.js`、可新增 `pages/playlist-detail/*` 或复用 `pages/preview/preview` 的只读模式。

后续修改：

1. `index.onLoad(options)` 增加：

```js
if (options.playlistId) {
  this.openSharedPlaylist(options.playlistId)
}
```

2. 新增方法：

```js
openSharedPlaylist: function(playlistId) {
  request('/playlists/' + playlistId).then(function(playlist) {
    app.globalData.sharedPlaylist = playlist
    wx.navigateTo({ url: '/pages/playlist-detail/playlist-detail?id=' + playlistId })
  }).catch(function() {
    wx.showToast({ title: '歌单不存在或已删除', icon: 'none' })
  })
}
```

3. 推荐新增只读页 `pages/playlist-detail/`，不要复用可编辑的 `preview`，避免扫码用户误以为能编辑他人歌单。
4. 页面展示字段复用好友卡片样式：昵称、intro、歌曲封面、歌名、歌手。
5. `onShareAppMessage` 对分享详情页返回同一个 `playlistId` 路径。

验收标准：扫码分享卡片的小程序码能进入具体歌单详情页。

### MP-NEXT-3：同步 effective intro 规则

当前小程序 `preview.doSave()` 已使用：

```js
const intro = this.data.playlistIntro || this.data.suggestedIntro || ''
```

后续仍需补两点：

1. 保存成功后确保 `app.globalData.playlistIntro = intro`。
2. 好友页自己的卡片使用 `app.globalData.playlistIntro || app.globalData.suggestedIntro || '暂无简介'`，避免空 intro。

验收标准：小程序与 H5 不编辑 intro 时保存结果一致。

### MP-NEXT-4：清理 picker 重复方法，并决定是否继续保留独立 picker

风险位置：`deathplaylist_miniprogram/pages/picker/picker.js`。

当前 `onSearchInput`、`clearSearch`、`searchSongs` 各定义了两次，运行时后者覆盖前者。

后续修改：

1. 删除重复的第一组方法，只保留一组。
2. 如果 H5 后续仍保持“选择页内嵌搜索”，小程序可以保留独立 picker 作为原生体验差异，但 plan 和文档必须明确：这是交互承载差异，不是功能版本差异。
3. 如果要求三端页面结构完全一致，再把 picker 搜索列表并入 selection。该改动较大，不建议和后端数据一致性修复同一轮做。

验收标准：picker 行为不变，代码无重复定义。

### MP-NEXT-5：同步后端分享码环境变量

当前小程序分享页调用：

```js
GET /api/share/:id/wxacode
```

后端修复 `WECHAT_ENV_VERSION` 后，小程序不需要改调用路径，但需要在微信开发者工具中验证：

1. develop 环境生成的码打开开发版。
2. trial 环境生成的码打开体验版。
3. release 环境生成的码打开正式版。

验收标准：正式分享卡片不再打开开发版小程序。

### MP-NEXT-6：补小程序端回归清单

后续每次小程序同步后，在微信开发者工具中按以下顺序手工验收：

1. 首次进入首页，显示 H5 同款标题和副标题。
2. 点击“新的歌单”，进入 selection。
3. 点击“选一首歌”，进入 picker，推荐歌曲能加载。
4. 搜索歌曲，添加 1-9 首，重复歌曲不会重复添加。
5. selection 点击“完成”，未登录时弹昵称输入；登录后进入 preview。
6. preview 编辑 intro、拖拽排序、点击“分享预览”。
7. 后端存在旧歌单时走 PUT，不存在时走 POST。
8. share 页生成图片，保存到相册触发隐私授权。
9. 好友页 guest 模式显示 demo，登录后显示真实好友歌单和“(我)”标签。
10. 扫小程序码进入具体歌单详情页。

## 6. 不建议在下一步混入的改动

为了保持改动最小，下一步不建议同时做以下事项：

1. 不拆分 H5 `App.tsx`。
   - 单文件确实有维护成本，但拆分会扩大 diff，不是当前 P0 风险的必要条件。
2. 不重做 UI 视觉体系。
   - 当前问题主要是构建、数据一致性、分享链路和环境配置。
3. 不引入新的路由库。
   - 当前状态机足够支撑本轮修复。
4. 不把 SQLite 替换为其他数据库。
   - 先补唯一约束、事务和迁移策略，再考虑数据库替换。
5. 不在小程序里大规模重写 selection/picker。
   - 本次已经接通主流程，后续只在 H5/后端稳定后做同步。

## 7. 最终验收标准

完成本计划后，三端应满足：

1. H5：`npm run lint && npm run build` 通过。
2. 后端：`npm run build` 通过。
3. H5 构建产物复制到后端 `static/` 后，后端能同时服务 `/` 和 `/api/*`。
4. 用户不编辑 intro 也能保存当前展示文案，刷新后不丢失。
5. 歌单歌曲顺序在“我的歌单”、“好友歌单”、“分享详情”三个入口一致。
6. 并发创建歌单不会产生重复歌单。
7. 更新歌单中途失败不会清空旧歌曲。
8. 分享卡片上的码能打开具体歌单。
9. 小程序选择页“完成”进入预览页，预览页“分享预览”才保存并生成卡片。
10. 正式环境不依赖默认 JWT 密钥、mock 微信配置、HTTP IP 或开发版小程序码。