# Death Playlist Backend

死亡歌单后端服务 — 基于 NestJS + TypeORM + SQLite。

## 快速开始

```bash
npm install
npm run start:dev
```

服务启动在 `http://localhost:3001/api`，数据库（SQLite）自动创建并填充种子数据。

## API 概览

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | /api/auth/wechat | 模拟微信登录 | 否 |
| GET | /api/users/me | 获取当前用户信息 | 是 |
| GET | /api/songs/search?q=keyword | 搜索歌曲 | 否 |
| POST | /api/playlists | 创建歌单 | 是 |
| GET | /api/playlists/me | 获取我的歌单 | 是 |
| GET | /api/playlists/friends | 获取朋友歌单 | 是 |
| GET | /api/playlists/:id | 获取歌单详情 | 否 |
| PUT | /api/playlists/:id | 更新歌单 | 是 |
| DELETE | /api/playlists/:id | 删除歌单 | 是 |
| POST | /api/playlists/:id/like | 点赞歌单 | 否 |
| GET | /api/friends | 获取好友列表 | 是 |
| POST | /api/friends | 添加好友 | 是 |
| DELETE | /api/friends/:friendId | 删除好友 | 是 |
| GET | /api/share/:id | 获取分享数据 | 否 |

## 鉴权

使用 JWT Bearer Token。登录后获取 `accessToken`，后续请求在 Header 中携带：

```
Authorization: Bearer <accessToken>
```

## 项目结构

```
src/
  auth/          — JWT 鉴权 + 模拟微信登录
  users/         — 用户管理
  songs/         — 歌曲搜索与元数据
  playlists/     — 歌单 CRUD + 排序
  friends/       — 好友关系管理
  share/         — 分享链接生成
  seed/          — 种子数据（自动填充）
```
