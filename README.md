# 宜生活 — AI 现代黄历

> 每天给你看得懂、用得上的个性化生活建议

把传统黄历的"宜/忌"形式，用 AI 填上真正属于你个人的内容。

## 快速开始

### 1. 本地开发

```bash
# 安装 Vercel CLI（如果没有）
npm i -g vercel

# 在项目目录下启动本地开发服务器
vercel dev
```

打开 `http://localhost:3000` 即可体验。

> 即使没有配置 API Key，前端也会用本地 Mock 数据运行，可以体验完整流程。

### 2. 配置 AI 接口

1. 在 [DeepSeek 平台](https://platform.deepseek.com/) 注册并获取 API Key
2. 复制 `.env.example` 为 `.env`，填入你的 Key
3. 本地开发时 Vercel CLI 会自动读取 `.env`

### 3. 部署上线

```bash
vercel --prod
```

在 Vercel 项目设置 → Environment Variables 中添加 `DEEPSEEK_API_KEY`。

## 技术栈

| 部分 | 技术 |
|------|------|
| 前端 | 原生 HTML / CSS / JavaScript |
| AI | DeepSeek API（兼容 OpenAI 格式） |
| 后端 | Vercel Serverless Function |
| 存储 | localStorage |
| 部署 | Vercel |
| 农历 | lunar-javascript |

## 项目结构

```
yishenghuo/
├── index.html          # 主页面
├── css/
│   └── style.css       # 中式视觉样式
├── js/
│   ├── storage.js      # localStorage 数据管理
│   ├── api.js          # API 调用 + Mock 兜底
│   ├── share.js        # Canvas 分享图片生成
│   └── app.js          # 主逻辑
├── api/
│   └── huangli.js      # Serverless Function（调 DeepSeek）
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker
├── icon.svg            # 应用图标
├── vercel.json         # Vercel 部署配置
├── package.json
└── .env.example        # 环境变量示例
```

## 后续迭代方向

- [ ] 接入天气 API，建议更精准
- [ ] 周报/月报功能
- [ ] 更多场景模板（考研党、新手爸妈…）
- [ ] 社区分享与互动
