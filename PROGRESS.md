# 宜生活项目 — 工作进度记录

> 最后更新：2026-07-21
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

## 2026-07-21 优化记录

### Bug 修复
1. ✅ **修复 `getStreak()` 严重 bug**（storage.js）
   - **问题1**：`getStreak()` 每次调用都会通过 `tryUseFreeze()` 写入 localStorage，而它在每次渲染时都被调用，导致多次渲染会重复消耗免死次数
   - **问题2**：已冻结的日期在后续调用中 `alreadyFrozen=true`，条件不满足直接 `break`，导致连续天数归零
   - **修复**：将 `getStreak()` 改为纯只读函数；新增 `autoApplyFreeze()` 在页面加载时调用一次，自动为中断天数应用免死
2. ✅ **修复 api.js 运算符优先级 bug**：`A || B && C` 被解析为 `A || (B && C)`，修正为 `(A || B) && C`（影响“内耗/比较”关键词匹配）
3. ✅ **移除 api.js 中重复的 `getTodayKey()` 定义**（storage.js 已有同名函数）

### 性能优化
4. ✅ **lunar.js (~300KB) 改为 `defer` 加载**：原在 `<head>` 中同步阻塞渲染，改为 `defer` 后并行下载、延迟执行，不阻塞首屏

### 代码清理
5. ✅ **修复 CSS `.card-status` 重复 `font-size`**（13px 被 16px 覆盖，删除冗余声明）
6. ✅ **删除 `.weather-bar::after` 空规则**
7. ✅ **Service Worker 缓存版本 v6 → v7**（确保用户拿到最新代码）

### 分享图片视觉优化（第二轮）
8. ✅ **删除底部重复提示**（share.js）：画布内"长按保存·查看你的今日黄历"与弹窗外"长按图片保存"重复，删除画布内提示行
9. ✅ **放大底部日期字体**（share.js）：11px → 13px，颜色加深 `#a89c8a` → `#8a7e6a`
10. ✅ **修复视觉层级**（share.js）：标题 30px > 宜/忌 26px > 运势 24px，建立清晰大小梯度（原来运势 30px 比标题 26px 还大）
11. ✅ **修复印章位置**（share.js）：从 `(W/2+30, y+8)` 调整到 `(W/2+28, y+16)`，对齐文字垂直中心；尺寸 16→14 更精致
12. ✅ **删除背景小圆点**（share.js）：4 个随机圆点容易像"加载中"指示器，删除后保留顶/底墨晕即可
13. ✅ **修复运势颜色对比度**（share.js）：运势等级 `#b83229`→`#9c1f17`（更深红，在米色背景上更跳）；标签 `#a89c8a`→`#bfb3a1`（更淡，不抢注意力）；删除运势旁多余的"吉"印章
14. ✅ **新增"保存图片"按钮**（index.html + app.js）：分享弹窗新增下载按钮，图片生成后显示，点击直接下载 PNG

### AI 内容质量优化
15. ✅ **AI Prompt 新增 4 条规则**（huangli.js）：
    - 规则17：忌的标题要普适、有黄历味（"忌喝冰奶茶"→"忌贪凉饮冷"）
    - 规则18：每日一言必须联动天气/宜忌/近况，不用通用鸡汤
    - 规则19：图标风格统一，用生活化 emoji，避免办公/科技图标
    - 规则20：建议要有针对性，避免"多喝水"这种正确的废话
16. ✅ **Mock 数据同步优化**（api.js）：
    - 忌标题："喝奶茶"→"贪凉饮冷"、"吃夜宵"→"深夜进食"、"吃太辣"→"过食辛辣"
    - 图标统一：🔇→🤫、📝→📓、📉→😰
17. ✅ **Service Worker 缓存版本 v7 → v8**

### 第三轮优化（性能/体验/无障碍）
18. ✅ **`getData()` 内存缓存**（storage.js）：首次读取后缓存在 `_dataCache`，后续操作零开销；`saveData()` 同步更新缓存；`resetAllData()` 清空缓存
19. ✅ **`showFullHistory()` 改为真正的历史列表**（app.js + storage.js + index.html）：
    - 新增 `getAllHistoryDays()` 返回所有有记录的日期（倒序）
    - `showFullHistory()` 渲染日期列表（日期+星期+心情emoji+完成状态），点击进入详情
    - 详情页新增"← 返回列表"按钮
    - 弹窗标题动态切换（"历史黄历" / "7月21日 · 历史黄历"）
20. ✅ **无障碍优化**（index.html + app.js + css/style.css）：
    - 所有 modal 添加 `role="dialog"` `aria-modal="true"` `aria-labelledby`
    - modal overlay 添加 `aria-hidden="true"`
    - toast 添加 `role="status"` `aria-live="polite"`
    - 图标按钮添加 `aria-label`（☰→设置、↻→刷新黄历、←→返回首页）
    - 新增焦点陷阱：打开 modal 时自动聚焦第一个可交互元素，Tab 循环不跳出，Shift+Tab 回到末尾
    - ESC 键关闭 modal
    - 关闭后焦点回到打开前的元素
21. ✅ **天气定位授权引导**（weather.js + app.js + index.html）：
    - 用户拒绝浏览器定位后（`GeolocationPositionError.code=1`）记录到 `localStorage`
    - 后续访问直接跳过浏览器定位，走 IP 定位兜底，不再弹授权窗
    - 设置页新增"天气定位"卡片，显示当前状态，提供"重新允许精确定位"按钮
22. ✅ **Service Worker 缓存版本 v8 → v9**

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
