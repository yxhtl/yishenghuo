/**
 * api/huangli.js — Vercel Serverless Function
 * 接收用户档案，调用 DeepSeek API 生成个性化黄历
 *
 * 环境变量：DEEPSEEK_API_KEY
 * 在 Vercel 项目设置 → Environment Variables 中配置
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

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
13. quote 给一句温暖有道理的话，配作者出处`;

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

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });
  }

  const { profile } = req.body || {};

  if (!profile) {
    return res.status(400).json({ error: 'Profile is required' });
  }

  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const todayStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;

  const userPrompt = `用户档案：
- 在意的事：${profile.goals ? profile.goals.join('、') : '未指定'}
- 作息类型：${profile.sleepType || '未指定'}
- 自定义提醒：${profile.customReminders || '无'}
- 今天：${todayStr}

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
