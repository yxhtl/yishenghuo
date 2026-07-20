# 宜生活 — AI 现代黄历

> 每天给你看得懂、用得上的个性化生活建议

把传统黄历的"宜/忌"形式，用 AI 填上真正属于你个人的内容。

## 快速开始

### 1. 本地开发

```bash
# 本地开发服务器（Cloudflare Wrangler）
npx wrangler pages dev . --port 8788
```

打开 `http://localhost:8788` 即可体验。

> 即使没有配置 API Key，前端也会用本地 Mock 数据运行，可以体验完整流程。

### 2. 配置 AI 接口

1. 在 [DeepSeek 平台](https://platform.deepseek.com/) 注册并获取 API Key
2. 在 `.env` 文件中填入你的 Key（本地开发用，wrangler 会自动读取）：
   ```
   DEEPSEEK_API_KEY=sk-xxxxxxxx
   ```

### 3. 部署到 Cloudflare Pages

**方式一：Git 自动部署（推荐）**

1. 将代码推送到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → Create a project → Connect to Git
3. 选择仓库，构建配置：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `.`
4. 在 Settings → Environment variables 中添加 `DEEPSEEK_API_KEY`
5. Save and Deploy

**方式二：命令行直接部署**

```bash
npx wrangler pages deploy .
```

## 技术栈

| 部分 | 技术 |
|------|------|
| 前端 | 原生 HTML / CSS / JavaScript |
| AI | DeepSeek API（兼容 OpenAI 格式） |
| 后端 | Cloudflare Pages Functions |
| 天气 | Open-Meteo（免费、无需 API Key） |
| 存储 | localStorage |
| 部署 | Cloudflare Pages |
| 农历 | lunar-javascript |

## 项目结构

```
yishenghuo/
├── index.html              # 主页面
├── css/
│   └── style.css           # 中式视觉样式
├── js/
│   ├── storage.js          # localStorage 数据管理
│   ├── weather.js          # 天气模块（定位 + Open-Meteo）
│   ├── api.js              # API 调用 + Mock 兜底
│   ├── share.js            # Canvas 分享图片生成
│   ├── app.js              # 主逻辑
│   └── lib/lunar.js        # 农历库
├── functions/
│   └── api/
│       ├── huangli.js      # Pages Function（调 DeepSeek）
│       └── weather.js      # Pages Function（IP 定位兜底）
├── manifest.json           # PWA 配置
├── sw.js                   # Service Worker
├── icon.svg                # 应用图标
├── wrangler.toml           # Cloudflare 配置
├── package.json
└── .env                    # 本地环境变量
```

## 后续迭代方向

- [ ] 周报/月报功能
- [ ] 更多场景模板（备考季、换工作、异地恋…）
- [ ] 社区分享与互动
