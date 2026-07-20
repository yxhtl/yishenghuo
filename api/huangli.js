/**
 * api/huangli.js — Vercel Serverless Function
 * 接收用户档案，调用 DeepSeek API 生成个性化黄历
 *
 * 环境变量：DEEPSEEK_API_KEY
 * 在 Vercel 项目设置 → Environment Variables 中配置
 *
 * 内置基于 IP 的频率限制：同一 IP 每天最多 10 次请求
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/* ===== 频率限制（基于 IP 的内存限流）===== */
const RATE_LIMIT_MAX = 10;              // 每个 IP 每天最多请求次数
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 小时窗口（毫秒）

// Map<ip, { count, firstTime }>
const ipRequestMap = new Map();

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.connection?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = ipRequestMap.get(ip);

  // 窗口过期 → 重置
  if (record && now - record.firstTime > RATE_LIMIT_WINDOW) {
    ipRequestMap.delete(ip);
  }

  const current = ipRequestMap.get(ip);

  if (!current) {
    ipRequestMap.set(ip, { count: 1, firstTime: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    const resetAt = new Date(current.firstTime + RATE_LIMIT_WINDOW);
    return { allowed: false, remaining: 0, resetAt };
  }

  current.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - current.count };
}

// 定期清理过期记录，防止内存泄漏（每次调用时触发轻量清理）
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 10 * 60 * 1000) return; // 每 10 分钟最多清理一次
  lastCleanup = now;
  for (const [ip, record] of ipRequestMap) {
    if (now - record.firstTime > RATE_LIMIT_WINDOW) {
      ipRequestMap.delete(ip);
    }
  }
}

const SYSTEM_PROMPT = `你是一个现代生活黄历的生成器。
你的任务是根据用户的个人档案，生成今日的"宜/忌"建议。

传统黄历写的是"宜嫁娶、忌动土"，但那跟现代人的生活没什么关系。
你要做的是：保留"宜/忌"这个形式，但内容必须是针对这个具体用户的、真正有用的生活建议。

宜的建议方向（从中选择最贴合用户档案的）：
- 家人关系：打电话、做饭、发消息、说暖心话
- 健康：散步、喝水、吃水果、拉伸、早睡、好好吃饭
- 工作效率：列重点、关通知、整理桌面、番茄法、清拖延
- 学习成长：读书、写复盘、学新知识、教别人
- 情绪状态：深呼吸、听歌、写感受、泡热饮、发呆
- 通用：晒太阳、说谢谢、夸人、断舍离、记好事

忌的提醒方向（从中选择最贴合用户档案的）：
- 花钱：冲动消费、深夜网购、第四杯咖啡
- 熬夜：睡前刷手机、追剧、打游戏
- 情绪：带情绪回复、过度内耗、刷短视频
- 饮食：喝奶茶、吃夜宵、吃太辣
- 通用：拖延、什么都答应、和别人比较、垃圾食品

输出要求 — 返回一个 JSON 对象：
{
  "lunar": "丙午年 六月十九",
  "items": [
    {
      "type": "yi",
      "icon": "📞",
      "title": "给家人打个电话",
      "reason": "你在档案里说很在意家人关系，今天是周日，适合好好聊聊。"
    },
    {
      "type": "ji",
      "icon": "🛒",
      "title": "深夜网购",
      "reason": "你说自己花钱容易冲动，现在这个点冲动消费高发。"
    }
  ],
  "fortune": {
    "grade": "中吉",
    "desc": "运势平顺，做好该做的事，小有收获。"
  },
  "quote": {
    "text": "不必着急，慢慢来，比较快。",
    "author": "—— 生活感悟"
  }
}

规则：
1. 宜 2-3 条，忌 1-2 条
2. 每条必须结合用户档案中的信息，不能是通用套话
3. 语气温暖、具体、像朋友在提醒你，不要说教
4. reason 要让人感觉"它真的懂我"，解释为什么今天适合/不适合做这件事
5. 每条建议的 reason 要有独特性，不要几条说得差不多
6. icon 用一个合适的 emoji
7. title 控制在 12 个字以内，简洁有力
8. reason 控制在 60 个字以内
9. 如果用户档案提到具体习惯（如"少喝奶茶"），要在建议中体现
10. 适当结合今天星期几给出建议（如周末适合联系家人、工作日注意效率）
11. lunar 字段填农历日期，格式如"丙午年 六月十九"
12. fortune 从 大吉/中吉/小吉/平/末吉 中选一个，配一句描述
13. quote 给一句温暖有道理的话，配作者出处
14. 【重要】如果提供了用户近几天的记录，必须参考：
    - 如果用户连续心情不好，建议中要体现关怀，避免说教
    - 如果用户昨天"没做到"某件事，今天可以换个角度鼓励，不要重复同一条
    - 如果用户最近做得很好，给予肯定并建议保持或尝试新的
    - 如果用户连续没做某类建议，换一个方向，别重复
15. 每天的建议尽量和前几天不重复，保持新鲜感
16. 【天气】如果提供了天气信息，建议要结合天气：
    - 晴天适合出门、晒太阳、散步
    - 雨天适合室内活动、读书、听歌、发呆
    - 冷天提醒保暖、喝热饮
    - 热天提醒多喝水、少喝冷饮
    - 但不要生硬地提天气，要自然融入建议`;

module.exports = async (req, res) => {
  // CORS（本地调试用，同域部署不需要）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 频率限制检查
  maybeCleanup();
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP);

  // 设置限流响应头，方便前端提示
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);

  if (!rateLimitResult.allowed) {
    console.warn(`[宜生活] IP ${clientIP} 触发限流`);
    return res.status(429).json({
      error: '今日请求次数已达上限，请明天再试',
      resetAt: rateLimitResult.resetAt
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });
  }

  const { profile, recentContext, weather } = req.body || {};

  if (!profile) {
    return res.status(400).json({ error: 'Profile is required' });
  }

  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const todayStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;

  let userPrompt = `用户档案：
- 在意的事：${profile.goals ? profile.goals.join('、') : '未指定'}
- 作息类型：${profile.sleepType || '未指定'}
- 自定义提醒：${profile.customReminders || '无'}
- 今天：${todayStr}`;

  if (recentContext) {
    userPrompt += `

用户近几天的记录：
${recentContext}

请结合以上记录生成今天的建议，让用户感觉你真的记得他们最近的状态。`;
  }

  if (weather) {
    userPrompt += `

今日天气：${weather}

请结合天气给出建议，例如晴天宜出门、雨天宜室内活动、冷天宜保暖、热天宜多喝水。但不要生硬地提及天气，要自然融入。`;
  }

  userPrompt += `

请生成今日黄历。只返回 JSON，不要其他内容。`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.85,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[宜生活] DeepSeek API error:', response.status, errText);
      throw new Error(`DeepSeek API ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const parsed = JSON.parse(content);

    // 校验
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid response format');
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[宜生活] huangli API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
