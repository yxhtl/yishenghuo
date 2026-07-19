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
 *   checkins: { '2026-07-19': true }  // 当天有操作即记为打卡
 * }
 */

function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return {
      profile: data.profile || null,
      huangli: data.huangli || {},
      moods: data.moods || {},
      checkins: data.checkins || {}
    };
  } catch {
    return { profile: null, huangli: {}, moods: {}, checkins: {} };
  }
}

function saveData(data) {
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

/* ===== 打卡统计 ===== */

function getStreak() {
  const data = getData();
  const checkins = data.checkins || {};
  let streak = 0;
  const today = new Date();

  // 从今天往回数连续天数
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    if (checkins[key]) {
      streak++;
    } else if (i > 0) {
      // 今天没打卡不算断，但昨天没打卡就断了
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

/* ===== 重置 ===== */

function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
}
