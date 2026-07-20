# 宜生活项目 — 工作进度记录

> 最后更新：2026-07-20
> 用途：上下文清除后快速恢复工作状态

## 项目概览

- **项目名称**：宜生活 — AI 现代黄历
- **项目路径**：`yishenghuo/`
- **技术栈**：原生 HTML/CSS/JS + Vercel Serverless + DeepSeek API + Open-Meteo 天气 API + localStorage
- **部署平台**：Vercel

## 当前文件结构

```
yishenghuo/
├── index.html          # 主页面（引导页 + 主页 + 设置页 + 弹窗）
├── css/style.css       # 中式视觉样式
├── js/
│   ├── storage.js      # localStorage 数据管理（档案/黄历/心情/打卡/断签保护/每周回顾/导入导出）
│   ├── weather.js      # 天气模块（浏览器定位 + Open-Meteo API + 缓存）
│   ├── api.js          # API 调用 + Mock 兜底（含天气上下文）
│   ├── share.js        # Canvas 分享图片生成（含天气信息）
│   ├── app.js          # 主逻辑（视图/引导/渲染/天气/场景模板）
│   └── lib/lunar.js    # 农历库
├── api/
│   ├── huangli.js      # Serverless Function（调 DeepSeek，含天气+近况上下文）
│   └── weather.js     # Serverless Function（IP 定位兜底，返回经纬度）
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker（v6 缓存）
├── icon.svg            # 应用图标
├── vercel.json         # Vercel 部署配置
├── package.json
├── .env                # 环境变量（DEEPSEEK_API_KEY，当前为空）
└── .gitignore
```

## 已完成的功能

1. ✅ 基本黄历页面（宜/忌形式）
2. ✅ AI 个性化建议（DeepSeek API）
3. ✅ localStorage 数据存储（客户端存储，数据不离开浏览器）
4. ✅ Canvas 分享图片生成（含天气信息）
5. ✅ PWA 支持（manifest + service worker v6）
6. ✅ Vercel 部署配置
7. ✅ 连续打卡保护 / 断签容错（每月 2 次免死，`storage.js` 中 `tryUseFreeze`）
8. ✅ 每周回顾功能（周一至今的心情趋势 + 完成统计，`getWeeklyReview` + `renderWeeklyReview`）
9. ✅ 数据导出/导入（JSON 备份 + 合并导入，`exportToFile` + `importDataString`）
10. ✅ 天气 API 集成（Open-Meteo 免费 API + 浏览器定位 + Vercel IP 定位兜底）
11. ✅ 天气纳入 AI 建议（prompt 中注入天气信息，让建议更贴合天气）
12. ✅ 场景模板快选（考研党 / 新手爸妈 / 减脂人群 / 职场新人 / 自由职业）
13. ✅ 分享图片优化（字体加载 3 秒超时保护，避免卡死）

## 待办 / 进行中

- [ ] **部署上线**：需要在 Vercel 项目设置中配置 `DEEPSEEK_API_KEY` 环境变量，然后 `vercel --prod`
- [ ] 天气定位授权引导优化（首次拒绝后不重复弹窗）
- [ ] 周报/月报功能（跨周回顾趋势）
- [ ] 更多场景模板（备考季、换工作、异地恋…）
- [ ] 社区分享与互动

## 关键概念说明

### 客户端 vs 服务端
- **客户端（浏览器）**：`js/` 目录下的所有文件，在用户浏览器中运行。localStorage 数据存储在用户本地，不会上传到服务器。
- **服务端（Vercel）**：`api/` 目录下两个 Serverless Function：
  - `huangli.js` — 调用 DeepSeek API 生成 AI 建议，接收天气+近况上下文
  - `weather.js` — 利用 Vercel 自带的 IP 定位头（`x-vercel-ip-latitude`）返回经纬度，兜底浏览器定位失败的场景
- 用户的 API Key 保存在服务端环境变量中，前端看不到。

### 天气 API 架构
1. **数据源**：[Open-Meteo](https://open-meteo.com/)（免费、无需 API Key、支持 CORS）
2. **定位策略**（双保险）：
   - 优先：浏览器 `navigator.geolocation`（精确到街道，需用户授权）
   - 兜底：`api/weather.js` 通过 Vercel IP 定位头获取经纬度（城市级，无需授权）
3. **缓存**：localStorage 缓存天气 3 小时（同一天内有效）
4. **降级**：天气获取失败不影响核心功能，AI 建议 prompt 中不含天气字段

### 场景模板
在引导页欢迎屏幕底部提供 5 个身份模板 chip，点击直接创建预设档案并生成黄历：
- 📚 考研党：学习成长 / 工作效率 / 情绪状态，夜猫子
- 👶 新手爸妈：家人关系 / 健康 / 情绪状态，看心情
- 💪 减脂人群：健康 / 情绪状态，早起鸟
- 💼 职场新人：工作效率 / 学习成长 / 情绪状态，早起鸟
- 🎧 自由职业：工作效率 / 健康 / 情绪状态，看心情

### 数据导出
- 数据存储在浏览器 localStorage 中
- 可以通过 `storage.js` 中的导出功能将数据导出为 JSON 文件
- 数据完全在用户本地，不会上传到任何服务器

## 部署状态

- `.env` 文件中 `DEEPSEEK_API_KEY` 为空，需要填入
- 部署命令：`vercel --prod`
- 需要在 Vercel Dashboard 配置环境变量 `DEEPSEEK_API_KEY`
- 天气 API 无需配置任何环境变量（Open-Meteo 免费 + Vercel 自带 IP 定位）

## 如何恢复工作

清除上下文后，告诉 AI：
> "请读取 yishenghuo/PROGRESS.md 文件了解项目进度"
