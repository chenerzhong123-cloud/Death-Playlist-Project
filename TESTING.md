# 死亡歌单技术验证与发布前置条件

## 当前结构

H5 为 React + Vite，入口 `src/App.tsx` 编排 `hooks/` 和 `views/`；小程序是原生页面，直接调用 NestJS API。两端共用 SQLite 后端，H5 构建后由后端静态托管。生产 nginx 将 `/deathplaylist/` 转发到容器根路径，API 外部地址是 `/deathplaylist/api`。

保留现有公开歌单流：`GET /api/playlists/public` 与小程序旧地址 `/api/playlists/friends` 返回同一列表；不新增好友授权、关注或邀请产品机制。

## 本地回归

使用 `.nvmrc` 指定的 Node 版本，分别在两个 npm 项目中执行：

```sh
npm ci
npm run lint
npm test
npm run build
```

仓库根目录验证小程序逻辑：

```sh
node --test deathplaylist_miniprogram/test/*.test.js
```

`lint` 为 TypeScript 检查。后端测试启动真实 Nest 应用，使用内存 SQLite 和 HTTP 请求；微信接口使用受控模拟响应，不会请求生产数据。H5 测试覆盖 StrictMode、请求先后顺序、歌曲 externalId、重复保存和搜索分页；小程序测试模拟 wx API。

GitHub PR 执行 `.github/workflows/ci.yml`，main 部署须先通过同一组检查。小程序 `test/` 已从上传包排除。

后端连续运行两次 `npm run build` 后均应存在 `dist/main.js`。编译配置排除测试，并关闭会与清理输出目录冲突的增量缓存。

## 上线前必须处理

1. 将生产 `JWT_SECRET` 换成密码学随机生成的私有值。现有生产配置仍是公开默认值；新版本在 production 下会拒绝此配置。更换密钥会让所有旧 JWT 失效，H5 会按本机 deviceId 重新登录，小程序需重新微信登录。不要把密钥写进 Git 或日志。
2. 使用 SQLite online backup 方式备份数据库，并确认 `playlists` 中没有重复的 userId。新增唯一约束不会自动合并或删除重复数据；如有重复应先人工确认归属。只读核查时生产库未发现重复 userId。
3. `PUBLIC_BASE_URL=https://www.deuce.monster/deathplaylist/`；`WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 须为有效私有配置，`WECHAT_CODE_ENV=release`。体验版验收时使用 trial，正式发布后恢复 release。微信 API 错误不会降级成 mock 身份。
4. 先部署后端兼容接口，再上传小程序体验版。真机验证：新用户与老用户登录、保存/重排、分享给另一个微信账号、冷启动/热启动、扫码进入、继续转发、拒绝相册权限后的重试。

## 风险与边界

- 修改仅在修复分支中；合并 main 会触发自动部署。不要在未更换默认 JWT 密钥时合并。
- 未修改 seed、曲库内容、产品文案、CSS/WXSS 或现有选歌和卡片布局；仅增加失败提示与重试入口。
- 历史 externalId 错用数据库 UUID 的歌曲行保留，通过兼容解析阻止继续复制。此修复不清理历史数据。
- iTunes Search 每个查询最多返回 200 条；后端对同一结果集分页并短时缓存，不保证超出服务商上限的无限滚动。[Apple 文档](https://performance-partners.apple.com/search-api)
- 小程序码 scene 将 UUID 去除连字符压缩到 32 字符，客户端可完整恢复；禁止截断 UUID。[腾讯 CloudBase 参数分享说明](https://docs.cloudbase.net/en/recipes/add-share-with-params-miniprogram)
- 微信登录、扫码、隐私授权和相册权限的真机行为不能由模拟测试替代；发布验收仍需真机。
- SQLite `synchronize`、单实例部署、匿名身份随浏览器存储清理而丢失、H5 与小程序账号不自动互通，是现有架构的限制，本次不做产品或数据库架构迁移。
