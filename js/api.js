/**
 * api.js — API 调用模块
 * 调用后端 Serverless Function 获取 AI 生成的黄历
 * API 不可用时使用本地 mock 数据
 */

/**
 * 获取今日黄历（含运势、每日一言）
 */
async function fetchHuangli(profile) {
  try {
    const resp = await fetch('/api/huangli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile })
    });

    if (!resp.ok) throw new Error(`API ${resp.status}`);

    const data = await resp.json();

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('返回数据格式异常');
    }

    return {
      lunar: data.lunar || getLunarDate(),
      items: data.items.map(item => ({
        type: item.type || 'yi',
        icon: item.icon || '✨',
        title: item.title || '——',
        reason: item.reason || '',
        status: null
      })),
      fortune: data.fortune || getMockFortune(),
      quote: data.quote || getMockQuote()
    };
  } catch (err) {
    console.warn('[宜生活] API 调用失败，使用本地数据:', err.message);
    const mock = getMockHuangli(profile);
    return {
      ...mock,
      fortune: getMockFortune(),
      quote: getMockQuote()
    };
  }
}

/* ===== 农历日期 ===== */

function getLunarDate() {
  try {
    const lunar = Lunar.fromDate(new Date());
    const ganzhi = lunar.getYearInGanZhi();
    const month = lunar.getMonthInChinese();
    const day = lunar.getDayInChinese();
    return `${ganzhi}年 ${month}月${day}`;
  } catch {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  }
}

function getSolarDate() {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
}

/* ===== 节气 ===== */

function getSolarTerm() {
  try {
    const lunar = Lunar.fromDate(new Date());
    const jieQi = lunar.getJieQi();
    if (jieQi) return jieQi;

    // 检查今日是否是节气前后
    const festivals = lunar.getFestivals();
    if (festivals && festivals.length > 0) return festivals[0];

    return null;
  } catch {
    return null;
  }
}

/* ===== 运势签 ===== */

const FORTUNES = [
  { grade: '大吉', desc: '今日诸事顺遂，宜积极行动，把握良机。' },
  { grade: '中吉', desc: '运势平顺，做好该做的事，小有收获。' },
  { grade: '小吉', desc: '平稳的一天，不急不躁，顺其自然便好。' },
  { grade: '平', desc: '今日平淡如水，安守本分，不冒进即可。' },
  { grade: '末吉', desc: '稍有小波折，但无大碍，耐心待之。' }
];

function getMockFortune() {
  // 基于日期种子选择，同一天结果一致
  const seed = getDateSeed();
  return FORTUNES[seed % FORTUNES.length];
}

function getDateSeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

/* ===== 每日一言 ===== */

const QUOTES = [
  { text: '不必着急，慢慢来，比较快。', author: '—— 生活感悟' },
  { text: '你今天少做的一件小事，可能正是明天的遗憾。', author: '—— 宜生活' },
  { text: '所有的改变，都从那个微小的"开始"算起。', author: '—— 生活感悟' },
  { text: '生活不是等暴风雨过去，而是学会在雨中跳舞。', author: '—— 佚名' },
  { text: '把每一天，都当成值得认真对待的一天。', author: '—— 宜生活' },
  { text: '走得慢没关系，只要你真的在走。', author: '—— 生活感悟' },
  { text: '今天的好心情，从给身边的人一个微笑开始。', author: '—— 宜生活' },
  { text: '最好的投资，是投资自己的健康和成长。', author: '—— 生活感悟' },
  { text: '不必和别人比，你只需要比昨天的自己好一点。', author: '—— 宜生活' },
  { text: '有些事现在不做，一辈子都不会做了。', author: '—— 九把刀' },
  { text: '你对待时间的态度，就是时间对待你的态度。', author: '—— 生活感悟' },
  { text: '生活就像骑自行车，要保持平衡就得不断前进。', author: '—— 爱因斯坦' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', author: '—— 尼采' },
  { text: '你的人生不会辜负你的努力。', author: '—— 宜生活' },
  { text: '今天的疲惫，是明天的底气。', author: '—— 生活感悟' }
];

function getMockQuote() {
  const seed = getDateSeed();
  return QUOTES[seed % QUOTES.length];
}

/* ===== 宜/忌 选项池 ===== */
/* 每条建议有多个 reason 变体，随机选取，保证每次刷新都有新鲜感 */

const YI_POOL = {
  '家人关系': [
    { icon: '📞', title: '给家人打个电话', reasons: [
      '你在档案里说很在意家人关系，今天适合好好聊聊。',
      '有多久没给家里打电话了？今天就拨一个吧。',
      '家人其实一直在等你联系，一个电话就能让他们开心很久。',
      '今天心情不错，正好跟家人分享一下最近的事。'
    ]},
    { icon: '🍚', title: '给家人做顿饭', reasons: [
      '你说了在意家人，做顿饭是最朴实的表达方式。',
      '不用很复杂，一碗面也能让家人感到被惦记。',
      '今天有空的话，试试亲手做点什么给他们。'
    ]},
    { icon: '💬', title: '给老朋友发条消息', reasons: [
      '有些关系不联系就淡了，今天主动发条消息吧。',
      '你想起的那个朋友，其实也在想你。先开口吧。',
      '友情也需要浇水，今天就给某个老朋友发个"在干嘛"。'
    ]},
    { icon: '🤗', title: '对身边的人说句暖心话', reasons: [
      '你关注家人关系，但有些话不说出来对方不知道。',
      '一句"辛苦了"就能让今天变得不一样。',
      '把感谢说出口，对方会记很久。'
    ]}
  ],
  '健康': [
    { icon: '🚶', title: '出门散步15分钟', reasons: [
      '你选了"在意健康"，动一动心情也会变好。',
      '坐太久了，出去走走透透气，身体会感谢你。',
      '不需要跑步那么累，散步15分钟就够了，今天试试？',
      '今天的散步路线换一条没走过的，也许有新发现。'
    ]},
    { icon: '💧', title: '多喝两杯水', reasons: [
      '简单但容易忘，今天试着多喝两杯。',
      '你身体里70%是水，别让它缺了。',
      '把水杯放在手边，喝水的频率自然就上去了。'
    ]},
    { icon: '🍎', title: '吃个水果', reasons: [
      '你关注健康，但今天吃水果了吗？',
      '维生素不用靠药片，一个苹果就够了。',
      '把手边的零食换成水果，身体会舒服很多。'
    ]},
    { icon: '🤸', title: '拉伸一下身体', reasons: [
      '坐了一天浑身僵，花3分钟拉伸一下。',
      '你关注健康，但容易忘动，起来伸个懒腰也好。',
      '脖子酸了吧？转转脖子、扭扭腰，现在就做。'
    ]},
    { icon: '😴', title: '今晚早点睡', reasons: [
      '你选了"在意健康"，睡眠是最基础的那一环。',
      '今晚试着比平时早睡半小时，明天的你会感谢你。',
      '没什么比早睡更划算的健康投资了。'
    ]},
    { icon: '🥗', title: '好好吃顿饭', reasons: [
      '你关注健康，但别总是随便对付，今天认真吃一顿。',
      '别跳过任何一餐，你的胃值得被认真对待。',
      '今天试试少吃外卖，自己搭配点健康的。'
    ]}
  ],
  '工作效率': [
    { icon: '✍️', title: '写下今天最重要的3件事', reasons: [
      '先想清楚再动手，效率会高很多。',
      '与其列20个to-do，不如只挑3个最重要的。',
      '今天的目标不用多，完成3件就够了。'
    ]},
    { icon: '🔇', title: '关掉通知专注30分钟', reasons: [
      '你说想提升效率，但手机一直在打断你。',
      '试一次"勿扰模式"，你会发现30分钟能做很多事。',
      '把微信静音30分钟，天不会塌。'
    ]},
    { icon: '🧹', title: '整理一下桌面', reasons: [
      '桌面乱心也乱，花5分钟收拾一下。',
      '你选了"在意效率"，清爽的环境是第一步。',
      '把不用的东西收起来，桌面空了思路就清了。'
    ]},
    { icon: '⏰', title: '试试番茄工作法', reasons: [
      '25分钟专注 + 5分钟休息，你说了想提高效率。',
      '不用很复杂，设个计时器就行，今天试一轮。',
      '效率不是靠蛮干，而是靠节奏，今天就试试。'
    ]},
    { icon: '📧', title: '清掉一个拖延的小事', reasons: [
      '那个一直拖着没回的消息、没填的表，今天处理掉。',
      '你说了在意效率，但这些小事一直在消耗你的精力。',
      '花5分钟清掉一件拖了很久的事，心里会轻松很多。'
    ]}
  ],
  '学习成长': [
    { icon: '📖', title: '读10页书', reasons: [
      '你说想在学习上有所成长，10页不多，先开始。',
      '读书不用一口气读完，每天10页，一个月就是一本书。',
      '今天翻开那本搁了很久的书，只看10页就好。'
    ]},
    { icon: '✏️', title: '写一段今日复盘', reasons: [
      '你关注学习成长，但光经历不反思等于白经历。',
      '不用很长，三句话写下今天学到了什么。',
      '睡前花3分钟写下来，比刷手机有价值多了。'
    ]},
    { icon: '🎓', title: '学一个新知识点', reasons: [
      '你说了想成长，今天学一个小的知识点就好。',
      '不用报课程，一个5分钟的科普视频也算学习。',
      '每天一个小知识，一年就是365个。'
    ]},
    { icon: '🗣️', title: '把学的东西讲给别人听', reasons: [
      '你关注学习成长，但能讲出来才是真正学会了。',
      '今天试着把最近学的一个东西，用自己的话说一遍。',
      '教是最好的学，找个机会分享你学到的东西。'
    ]}
  ],
  '情绪状态': [
    { icon: '🧘', title: '深呼吸三次', reasons: [
      '你关注自己的情绪，今天花一分钟停下来感受一下。',
      '焦虑的时候，三次深呼吸就能让你缓过来。',
      '不用冥想那么复杂，闭眼深呼吸三次就好。'
    ]},
    { icon: '🎵', title: '听一首喜欢的歌', reasons: [
      '你关注情绪状态，音乐是最简单的调节方式。',
      '今天别听歌当背景音，认真听一首完整的。',
      '戴上耳机，把世界关在外面5分钟。'
    ]},
    { icon: '📝', title: '写下现在的感受', reasons: [
      '你选了"关注情绪"，但情绪需要被看见才能被管理。',
      '不用写日记那么正式，几个词也行，写下来就好。',
      '此刻什么感受？写下来，你会更了解自己。'
    ]},
    { icon: '☕', title: '给自己泡杯热饮', reasons: [
      '你关注情绪，有时候一杯热茶就能让心静下来。',
      '今天别急着喝，慢慢泡，慢慢喝。',
      '仪式感不用很复杂，一杯热水也算。'
    ]},
    { icon: '🌙', title: '放下手机发会呆', reasons: [
      '你关注情绪，但信息过载本身就是焦虑的来源。',
      '今天试着放下手机5分钟，什么都不想。',
      '发呆不是浪费时间，是给大脑一个喘息的机会。'
    ]}
  ],
  '通用宜': [
    { icon: '☀️', title: '晒晒太阳', reasons: [
      '今天适合出门走走，哪怕只是5分钟。',
      '阳光是最好的免费抗抑郁药，出去站一会儿。',
      '你今天晒太阳了吗？维生素D免费领取。'
    ]},
    { icon: '🙏', title: '对一个人说谢谢', reasons: [
      '感恩这件事，做了心情真的会好。',
      '今天找个机会对某个人说声谢谢，不管大事小事。',
      '你身边的人为你做了很多，他们也需要被看见。'
    ]},
    { icon: '😊', title: '夸一个人', reasons: [
      '夸别人自己也会开心，今天试试。',
      '你今天看到的第一个人，找个优点夸夸他。',
      '一句真诚的夸奖，可能点亮别人的一整天。'
    ]},
    { icon: '🧹', title: '扔掉一样不需要的东西', reasons: [
      '今天断舍离一下，扔掉一样你不需要的东西。',
      '清理物品也是清理心情，从桌面开始就好。',
      '那个"以后可能用得上"但其实一年没碰的东西，扔了吧。'
    ]},
    { icon: '📔', title: '记下一件今天的好事', reasons: [
      '不管多小，今天一定有件好事，记下来。',
      '你今天笑过吗？把那个瞬间写下来。',
      '每天一件小事，积累起来就是你的幸福账本。'
    ]}
  ]
};

const JI_POOL = {
  '花钱习惯': [
    { icon: '🛒', title: '冲动消费', reasons: [
      '你说自己花钱容易冲动，今天大额消费先放一放。',
      '想买的东西加入购物车，但今天别结账。',
      '你提醒过自己花钱要克制，今天就忍一下。',
      '冲动消费的快感只有3分钟，后悔却是3天。'
    ]},
    { icon: '🌙', title: '深夜网购', reasons: [
      '你说自己花钱容易冲动，深夜是判断力最差的时候。',
      '深夜下单的东西，第二天经常后悔。今天先睡了。',
      '凌晨1点的购物车，是冲动消费的重灾区。'
    ]},
    { icon: '☕', title: '第四杯咖啡', reasons: [
      '你今天已经喝了不少咖啡了，再来一杯身体会抗议。',
      '咖啡因不是无限的，今天到此为止吧。',
      '你说关注健康，但咖啡喝多了也会焦虑。'
    ]}
  ],
  '熬夜': [
    { icon: '📱', title: '睡前刷手机', reasons: [
      '你说过想改掉这个习惯，今晚试试放下手机。',
      '蓝光会抑制褪黑素，刷完更睡不着。',
      '你说想早睡，但手机是最大的敌人。',
      '今晚把手机放远一点，够不着的那种。'
    ]},
    { icon: '🎬', title: '熬夜追剧', reasons: [
      '你说自己是夜猫子，但追剧和晚睡是两回事。',
      '"再看一集"是最危险的四个字，今天就到这里。',
      '明天可以继续看，今晚先睡了。',
      '剧情不会跑，但你的黑眼圈会越来越重。'
    ]},
    { icon: '🎮', title: '熬夜打游戏', reasons: [
      '你说过别熬夜，但游戏是时间黑洞。',
      '"最后一把"通常不是最后一把，今天就到这。',
      '游戏明天还在，你的精力不会。'
    ]}
  ],
  '情绪': [
    { icon: '😠', title: '带着情绪回复消息', reasons: [
      '如果有人让你不开心，先冷静一下再回。',
      '生气时发的消息，冷静后通常都会后悔。',
      '你关注情绪状态，今天就别在气头上打字了。',
      '等10分钟再回那条让你不爽的消息，你会发现没那么气了。'
    ]},
    { icon: '🤯', title: '过度内耗', reasons: [
      '你关注情绪，但有些事想多了反而更焦虑。',
      '今天如果开始钻牛角尖，提醒自己停下来。',
      '不是所有问题都需要现在解决，有些放着放着就没了。',
      '你脑子里的辩论赛可以停一停了，没有裁判。'
    ]},
    { icon: '📱', title: '刷短视频超过30分钟', reasons: [
      '你关注情绪，但短视频刷多了反而会更空虚。',
      '30分钟够了，再刷下去就是浪费时间。',
      '"再看一个"是最容易上瘾的陷阱，今天适可而止。'
    ]}
  ],
  '饮食': [
    { icon: '🧋', title: '喝奶茶', reasons: [
      '你提醒过自己少喝奶茶，今天就忍一下？',
      '一杯奶茶的糖分超出你一天的量，今天换成水吧。',
      '你说要少喝奶茶，但路过奶茶店又心动了？忍住。'
    ]},
    { icon: '🍔', title: '吃夜宵', reasons: [
      '你关注健康，但夜宵是健康的隐形杀手。',
      '晚上10点以后吃东西，身体要加班消化。',
      '今天如果饿了，喝杯热牛奶比夜宵好多了。'
    ]},
    { icon: '🌶️', title: '吃太辣', reasons: [
      '你今天已经吃过辣的了，再来一顿胃会抗议。',
      '嘴上痛快，但明天上厕所的时候你就后悔了。'
    ]}
  ],
  '通用忌': [
    { icon: '😴', title: '拖延一件重要的事', reasons: [
      '那件你一直拖着的事，今天别再拖了。',
      '拖延的焦虑比做这件事本身更消耗你。',
      '你说想提高效率，但拖延是效率最大的敌人。',
      '今天至少开始做第一步，哪怕只做5分钟。'
    ]},
    { icon: '🙅', title: '什么都答应别人', reasons: [
      '你今天已经够忙了，不想做的事就说"不"。',
      '讨好别人委屈自己，不划算。',
      '你的时间和精力有限，今天留点给自己。'
    ]},
    { icon: '📉', title: '和别人比较', reasons: [
      '别人的朋友圈都是精修过的，别拿来比。',
      '你关注情绪状态，但比较是焦虑的最大来源。',
      '今天的你只需要比昨天的你好一点就够了。',
      '关掉别人的生活，过好自己的今天。'
    ]},
    { icon: '🍕', title: '用垃圾食品对付一餐', reasons: [
      '你值得好好吃一顿，别总是随便对付。',
      '方便面和外卖偶尔可以，但今天认真吃点好的。',
      '你关注健康，但垃圾食品是最不健康的捷径。'
    ]}
  ]
};

/* ===== 生成 Mock 黄历 ===== */

function getMockHuangli(profile) {
  const goals = profile.goals || [];
  const reminders = profile.customReminders || '';
  const sleepType = profile.sleepType || '';
  const weekday = new Date().getDay();
  const isWeekend = weekday === 0 || weekday === 6;

  const yiPool = [];
  const jiPool = [];

  // 按用户目标添加宜
  for (const goal of goals) {
    if (YI_POOL[goal]) {
      yiPool.push(...YI_POOL[goal]);
    }
  }
  // 花钱习惯 -> 加到忌
  if (goals.includes('花钱习惯') && JI_POOL['花钱习惯']) {
    jiPool.push(...JI_POOL['花钱习惯']);
  }

  // 作息
  if (sleepType === '夜猫子' && JI_POOL['熬夜']) {
    jiPool.push(...JI_POOL['熬夜']);
  }
  if (sleepType === '早起鸟' && YI_POOL['工作效率']) {
    yiPool.push(YI_POOL['工作效率'][1]); // 关掉通知专注
  }

  // 自定义提醒关键词匹配
  const reminderLower = reminders.toLowerCase();
  if ((reminderLower.includes('奶茶') || reminderLower.includes('饮料')) && JI_POOL['饮食']) {
    jiPool.push(JI_POOL['饮食'][0]); // 喝奶茶
  }
  if (reminderLower.includes('熬夜') && JI_POOL['熬夜']) {
    jiPool.push(JI_POOL['熬夜'][0]); // 睡前刷手机
  }
  if (reminderLower.includes('辣') && JI_POOL['饮食']) {
    jiPool.push(JI_POOL['饮食'][2]); // 吃太辣
  }
  if (reminderLower.includes('夜宵') && JI_POOL['饮食']) {
    jiPool.push(JI_POOL['饮食'][1]); // 吃夜宵
  }
  if (reminderLower.includes('拖延') && JI_POOL['通用忌']) {
    jiPool.push(JI_POOL['通用忌'][0]); // 拖延
  }
  if (reminderLower.includes('内耗') || reminderLower.includes('比较') && JI_POOL['情绪']) {
    jiPool.push(JI_POOL['情绪'][1]); // 过度内耗
  }

  // 周末特别建议
  if (isWeekend) {
    if (YI_POOL['家人关系']) yiPool.push(YI_POOL['家人关系'][0]);
    if (YI_POOL['通用宜']) yiPool.push(YI_POOL['通用宜'][4]); // 记下一件好事
  } else {
    // 工作日
    if (YI_POOL['通用忌']) jiPool.push(JI_POOL['通用忌'][2]); // 和别人比较
    if (YI_POOL['情绪']) jiPool.push(JI_POOL['情绪'][2]); // 刷短视频
  }

  // 通用建议兜底（保证池子够大）
  if (YI_POOL['通用宜']) yiPool.push(...YI_POOL['通用宜']);
  if (JI_POOL['通用忌']) jiPool.push(...JI_POOL['通用忌']);
  if (JI_POOL['情绪']) jiPool.push(JI_POOL['情绪'][0]); // 带着情绪回复

  // 去重（按 title）
  const yiUnique = dedupeByTitle(yiPool);
  const jiUnique = dedupeByTitle(jiPool);

  // 随机选 3 条宜 + 2 条忌
  const yi = shuffle(yiUnique).slice(0, Math.min(3, yiUnique.length));
  const ji = shuffle(jiUnique).slice(0, Math.min(2, jiUnique.length));

  // 每条随机选一个 reason 变体
  const items = [
    ...yi.map(i => ({ icon: i.icon, title: i.title, reason: pickRandom(i.reasons), type: 'yi', status: null })),
    ...ji.map(i => ({ icon: i.icon, title: i.title, reason: pickRandom(i.reasons), type: 'ji', status: null }))
  ];

  return { lunar: getLunarDate(), items };
}

function dedupeByTitle(arr) {
  const seen = new Set();
  return arr.filter(item => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
