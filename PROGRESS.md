# 宜生活项目 — 工作进度记录

> 最后更新：2026-07-20
> 用途：上下文清除后快速恢复工作状态

## 项目概览

- **项目名称**：宜生活 — AI 现代黄历
- **项目路径**：`yishenghuo/`
- **技术栈**：原生 HTML/CSS/JS + Cloudflare Pages Functions + DeepSeek API + Open-Meteo 天气 + localStorage
- **部署平台**：Cloudflare Pages（免费、不需要备案、国内访问友好）

## 当前文件结构

```
yishenghuo/
├── index.html              # 主页面（引导页 + 主页 + 设置页 + 弹窗）
├── css/style.css           # 中式视觉样式
├── js/
│   ├── storage.js          # localStorage 数据管理（档案/黄历/心情/打卡/断签/回顾/导入导出）
│   ├── weather.js          # 天气模块（浏览器定位 + Open-Meteo + 缓存）
│   ├── api.js              # API 调用 + Mock 兜底（含天气上下文）
│   ├── share.js            # Canvas 分享图片生成（含天气信息）
│   ├── app.js              # 主逻辑（视图/引导/渲染/天气/场景模板）
│   └── lib/lunar.js        # 农历库
├── functions/
│   └── api/
│       ├── huangli.js      # Cloudflare Pages Function（调 DeepSeek，含天气+近况）
│       └── weather.js      # Cloudflare Pages Function（IP 定位兜底，用 request.cf）
├── manifest.json           # PWA 配置
├── sw.js                   # Service Worker（v6 缓存）
├── icon.svg                # 应用图标
├── wrangler.toml           # Cloudflare 配置
├── package.json            # npm scripts（wrangler dev/deploy）
└── .env                    # 本地环境变量（DEEPSEEK_API_KEY）
```

## 已完成的功能

1. ✅ 基本黄历页面（宜/忌形式）
2. ✅ AI 个性化建议（DeepSeek API）
3. ✅ localStorage 数据存储（客户端存储，数据不离开浏览器）
4. ✅ Canvas 分享图片生成（含天气信息）
5. ✅ PWA 支持（manifest + service worker v6）
6. ✅ 连续打卡保护 / 断签容错（每月 2 次免死）
7. ✅ 每周回顾功能（心情趋势 + 完成统计）
8. ✅ 数据导出/导入（JSON 备份 + 合并导入）
9. ✅ 天气 API 集成（Open-Meteo 免费 + 浏览器定位 + Cloudflare IP 定位兜底）
10. ✅ 天气纳入 AI 建议（prompt 注入天气信息）
11. ✅ 场景模板快选（考研党 / 新手爸妈 / 减脂 / 职场新人 / 自由职业）
12. ✅ 分享图片优化（字体加载 3 秒超时保护）
13. ✅ **从 Vercel 迁移到 Cloudflare Pages**
    - `functions/api/` 替代 `api/`（Cloudflare Pages Functions 格式）
    - `request.cf` 对象替代 Vercel IP 头（地理定位更简洁）
    - `wrangler.toml` 替代 `vercel.json`
    - `npx wrangler pages dev/deploy` 替代 `vercel dev/deploy`

## 待办 / 进行中

- [ ] **部署上线**：在 Cloudflare Pages 创建项目，配置 `DEEPSEEK_API_KEY` 环境变量
- [ ] 天气定位授权引导优化（首次拒绝后不重复弹窗）
- [ ] 周报/月报功能
- [ ] 更多场景模板
- [ ] 社区分享与互动

## 部署指南（Cloudflare Pages）

### 本地开发
```bash
npx wrangler pages dev . --port 8788
```
打开 `http://localhost:8788`，`.env` 中的 `DEEPSEEK_API_KEY` 会被自动读取。

### 部署
**Git 自动部署（推荐）**：
1. 推代码到 GitHub
2. Cloudflare Dashboard → Pages → Connect to Git
3. Build output directory: `.`（无需构建命令）
4. Settings → Environment variables 添加 `DEEPSEEK_API_KEY`

**命令行部署**：
```bash
npx wrangler pages deploy .
```

## 关键概念说明

### 客户端 vs 服务端
- **客户端（浏览器）**：`js/` 下所有文件，localStorage 数据存在用户本地
- **服务端（Cloudflare）**：`functions/api/` 下两个 Pages Function：
  - `huangli.js` — 调用 DeepSeek API 生成 AI 建议，接收天气+近况上下文
  - `weather.js` — 利用 Cloudflare `request.cf` 对象返回 IP 定位的经纬度
- API Key 在 Cloudflare 环境变量中，前端看不到

### Cloudflare vs Vercel 迁移要点
| 项目 | Vercel | Cloudflare Pages |
|------|--------|-----------------|
| 函数目录 | `api/` | `functions/api/` |
| 函数格式 | `module.exports = async (req, res) => {}` | `export async function onRequestPost(context) {}` |
| 请求对象 | Express-like `req` | Web API `context.request` |
| 响应 | `res.json()` | `return new Response()` |
| 环境变量 | `process.env.X` | `context.env.X` |
| IP 地理 | `x-vercel-ip-latitude` 头 | `request.cf.latitude` |
| 本地开发 | `vercel dev` | `wrangler pages dev` |
| 部署 | `vercel --prod` | `wrangler pages deploy` |

## 如何恢复工作

清除上下文后，告诉 AI：
> "请读取 yishenghuo/PROGRESS.md 文件了解项目进度"
