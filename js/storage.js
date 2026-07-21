/**
 * storage.js — localStorage 存储管理模块
 * 管理用户档案、黄历数据、心情记录、运势、打卡
 */

const STORAGE_KEY = 'yishenghuo_data';

/**
 * 数据结构：
 * {
 *   profile: { goals, sleepType, customReminders, createdAt },
 *   huangli: { '2026-07-19': { lunar, items, fortune, quote } },
 *   moods: { '2026-07-19': { mood: 'good', note: '' } },
 *   checkins: { '2026-07-19': true },  // 当天有操作即记为打卡
 *   streakFreeze: { '2026-07': ['2026-07-15'] }  // 每月使用的免死日期
 * }
 */

let _dataCache = null;

function getData() {
  if (_dataCache) return _dataCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    _dataCache = {
      profile: data.profile || null,
      huangli: data.huangli || {},
      moods: data.moods || {},
      checkins: data.checkins || {},
      streakFreeze: data.streakFreeze || {}
    };
    return _dataCache;
  } catch {
    _dataCache = { profile: null, huangli: {}, moods: {}, checkins: {}, streakFreeze: {} };
    return _dataCache;
  }
}

function saveData(data) {
  _dataCache = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ===== 用户档案 ===== */

function getProfile() {
  return getData().profile;
}

function saveProfileData(profile) {
  const data = getData();
  data.profile = profile;
  saveData(data);
}

/* ===== 黄历数据 ===== */

function getTodayKey() {
  return getDateKey(new Date());
}

function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getHuangliByDate(dateKey) {
  return getData().huangli[dateKey] || null;
}

function saveHuangliData(dateKey, huangli) {
  const data = getData();
  data.huangli[dateKey] = huangli;
  saveData(data);
}

/* ===== 操作记录 ===== */

function recordAction(dateKey, itemIndex, action) {
  const data = getData();
  if (data.huangli[dateKey] && data.huangli[dateKey].items[itemIndex]) {
    data.huangli[dateKey].items[itemIndex].status = action;
    // 任何操作都算打卡
    if (!data.checkins) data.checkins = {};
    data.checkins[dateKey] = true;
    saveData(data);
  }
}

/* ===== 心情记录 ===== */

function getMood(dateKey) {
  return getData().moods[dateKey] || null;
}

function saveMoodData(dateKey, mood) {
  const data = getData();
  data.moods[dateKey] = mood;
  saveData(data);
}

/* ===== 打卡统计（含断签容错）===== */

const FREEZE_PER_MONTH = 2; // 每月 2 次免死

/**
 * 获取某月已使用的免死次数
 */
function getFreezeUsed(yearMonth) {
  const data = getData();
  const freezes = data.streakFreeze[yearMonth] || [];
  return freezes.length;
}

/**
 * 获取某月剩余免死次数
 */
function getFreezeRemaining(yearMonth) {
  return Math.max(0, FREEZE_PER_MONTH - getFreezeUsed(yearMonth));
}

/**
 * 尝试为某天使用一次免死，成功返回 true
 */
function tryUseFreeze(dateKey) {
  const d = new Date(dateKey);
  const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const data = getData();
  if (!data.streakFreeze) data.streakFreeze = {};
  if (!data.streakFreeze[yearMonth]) data.streakFreeze[yearMonth] = [];
  if (data.streakFreeze[yearMonth].length >= FREEZE_PER_MONTH) return false;
  if (data.streakFreeze[yearMonth].includes(dateKey)) return false; // 同一天不重复用
  data.streakFreeze[yearMonth].push(dateKey);
  saveData(data);
  return true;
}

/**
 * 自动应用断签保护（页面加载时调用一次）
 * 为今天之前的中断天数自动使用免死，每段中断最多用一次
 */
function autoApplyFreeze() {
  const data = getData();
  const checkins = data.checkins || {};
  const today = new Date();
  let changed = false;
  let gapFreezeUsed = false;

  for (let i = 1; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 遇到打卡记录，开启新的中断段
    if (checkins[key]) {
      gapFreezeUsed = false;
      continue;
    }

    // 缺失天：检查是否已冻结
    const freezes = data.streakFreeze[yearMonth] || [];
    if (freezes.includes(key)) continue;

    // 当前中断段还没用过免死，尝试冻结
    if (!gapFreezeUsed) {
      if (freezes.length < FREEZE_PER_MONTH) {
        if (!data.streakFreeze[yearMonth]) data.streakFreeze[yearMonth] = [];
        data.streakFreeze[yearMonth].push(key);
        changed = true;
      }
      gapFreezeUsed = true;
    }
  }

  if (changed) saveData(data);
}

/**
 * 获取连续打卡天数（只读，不修改数据）
 */
function getStreak() {
  const data = getData();
  const checkins = data.checkins || {};
  const streakFreeze = data.streakFreeze || {};
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const freezes = streakFreeze[yearMonth] || [];

    if (checkins[key]) {
      streak++;
    } else if (i > 0 && freezes.includes(key)) {
      // 已冻结的日期算作连续
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getStats() {
  const data = getData();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let totalYi = 0;
  let doneYi = 0;
  let totalJi = 0;
  let keptJi = 0;
  let activeDays = 0;

  const huangliKeys = Object.keys(data.huangli).filter(k => k.startsWith(yearMonth));

  for (const key of huangliKeys) {
    const h = data.huangli[key];
    if (!h) continue;
    activeDays++;
    for (const item of (h.items || [])) {
      if (item.type === 'yi') {
        totalYi++;
        if (item.status === 'done') doneYi++;
      } else {
        totalJi++;
        if (item.status === 'done') keptJi++;
      }
    }
  }

  const checkinCount = Object.keys(data.checkins || {}).length;

  return { totalYi, doneYi, totalJi, keptJi, activeDays, checkinCount };
}

/* ===== 近七日历史 ===== */

function getRecentDays(count) {
  const data = getData();
  const days = [];
  const today = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    const huangli = data.huangli[key];
    const checkedIn = data.checkins[key];

    // 统计当天完成情况
    let hasDone = false;
    if (huangli && huangli.items) {
      hasDone = huangli.items.some(item => item.status === 'done');
    }

    days.push({
      key,
      date: d,
      day: d.getDate(),
      weekday: ['日','一','二','三','四','五','六'][d.getDay()],
      hasHuangli: !!huangli,
      hasDone,
      checkedIn,
      huangli
    });
  }
  return days;
}

/**
 * 获取最近 N 天的上下文摘要，用于注入 AI prompt
 * 返回 AI 能读懂的自然语言描述
 */
function getRecentContextForAI(days = 3) {
  const data = getData();
  const today = new Date();
  const lines = [];

  for (let i = days; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    const mood = data.moods[key];
    const huangli = data.huangli[key];

    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
    const parts = [];

    // 心情
    if (mood && mood.mood) {
      const moodMap = { great: '很好', good: '不错', ok: '一般', bad: '不太好', terrible: '糟糕' };
      parts.push(`心情${moodMap[mood.mood] || mood.mood}`);
      if (mood.note) parts.push(`写了"${mood.note}"`);
    }

    // 打卡情况
    if (huangli && huangli.items) {
      const doneItems = huangli.items.filter(i => i.status === 'done');
      const skipItems = huangli.items.filter(i => i.status === 'skip');
      if (doneItems.length > 0) {
        parts.push(`做到了：${doneItems.map(i => i.title).join('、')}`);
      }
      if (skipItems.length > 0) {
        parts.push(`没做到：${skipItems.map(i => i.title).join('、')}`);
      }
    }

    if (parts.length > 0) {
      lines.push(`${dateStr}：${parts.join('；')}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

/* ===== 全部历史日期（用于历史列表）===== */

/**
 * 获取所有有黄历记录的日期，按日期倒序排列
 * @returns {Array<{key, date, day, weekday, hasDone, mood}>}
 */
function getAllHistoryDays() {
  const data = getData();
  const today = new Date();
  const todayKey = getDateKey(today);
  const days = [];

  const sortedKeys = Object.keys(data.huangli).sort().reverse();

  for (const key of sortedKeys) {
    const h = data.huangli[key];
    if (!h || !h.items) continue;

    const d = new Date(key);
    const mood = data.moods[key];
    let hasDone = h.items.some(item => item.status === 'done');

    days.push({
      key,
      date: d,
      day: d.getDate(),
      weekday: ['日','一','二','三','四','五','六'][d.getDay()],
      hasDone,
      mood: mood ? mood.mood : null,
      isToday: key === todayKey
    });
  }

  return days;
}

/* ===== 重置 ===== */

function resetAllData() {
  _dataCache = null;
  localStorage.removeItem(STORAGE_KEY);
}

/* ===== 每周回顾 ===== */

/**
 * 获取本周（周一到今天）的回顾数据
 * @returns {{ totalDays, activeDays, doneYi, keptJi, totalActions, moodAvg, moodLabels, bestDay, hasData }}
 */
function getWeeklyReview() {
  const data = getData();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=周日
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 距周一几天

  const weekDays = [];
  for (let i = mondayOffset; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    weekDays.push(getDateKey(d));
  }

  let activeDays = 0;
  let doneYi = 0;
  let keptJi = 0;
  let totalActions = 0;
  let moodSum = 0;
  let moodCount = 0;
  let moodLabels = [];
  let bestDay = null;
  let bestDayScore = -1;

  const moodScore = { great: 5, good: 4, ok: 3, bad: 2, terrible: 1 };

  for (const key of weekDays) {
    const huangli = data.huangli[key];
    const mood = data.moods[key];
    let dayScore = 0;

    if (huangli && huangli.items) {
      activeDays++;
      for (const item of huangli.items) {
        if (item.status === 'done') {
          totalActions++;
          dayScore++;
          if (item.type === 'yi') doneYi++;
          else keptJi++;
        }
      }
    }

    if (mood && mood.mood) {
      moodSum += moodScore[mood.mood] || 3;
      moodCount++;
      moodLabels.push(mood.mood);
      dayScore += (moodScore[mood.mood] || 3) * 0.5;
    }

    if (dayScore > bestDayScore) {
      bestDayScore = dayScore;
      bestDay = key;
    }
  }

  return {
    totalDays: weekDays.length,
    activeDays,
    doneYi,
    keptJi,
    totalActions,
    moodAvg: moodCount > 0 ? moodSum / moodCount : 0,
    moodCount,
    moodLabels,
    bestDay,
    hasData: activeDays > 0 || moodCount > 0
  };
}

/* ===== 数据导出 / 导入 ===== */

/**
 * 导出全部数据为 JSON 字符串
 * 包含 profile / huangli / moods / checkins
 */
function exportDataString() {
  const data = getData();
  const exportObj = {
    app: 'yishenghuo',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: data
  };
  return JSON.stringify(exportObj, null, 2);
}

/**
 * 触发浏览器下载，导出 .json 文件
 */
function exportToFile() {
  const jsonStr = exportDataString();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const filename = `yishenghuo-backup-${y}${m}${d}.json`;

  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 从 JSON 字符串导入数据
 * @param {string} jsonStr
 * @returns {{ success: boolean, message: string, merged?: object }}
 */
function importDataString(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);

    // 兼容两种格式：带 app 包装的 / 纯数据对象
    let importedData;
    if (parsed.app === 'yishenghuo' && parsed.data) {
      importedData = parsed.data;
    } else if (parsed.profile !== undefined || parsed.huangli !== undefined) {
      importedData = parsed;
    } else {
      return { success: false, message: '文件格式不正确，不是宜生活的备份文件' };
    }

    // 合并导入：以导入数据覆盖本地同日期记录，本地独有的记录保留
    const local = getData();
    const merged = {
      profile: importedData.profile || local.profile,
      huangli: { ...local.huangli, ...(importedData.huangli || {}) },
      moods: { ...local.moods, ...(importedData.moods || {}) },
      checkins: { ...local.checkins, ...(importedData.checkins || {}) }
    };

    saveData(merged);

    return {
      success: true,
      message: '数据导入成功',
      merged
    };
  } catch (e) {
    return { success: false, message: '文件解析失败：' + e.message };
  }
}
