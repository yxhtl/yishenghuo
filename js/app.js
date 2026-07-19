/**
 * app.js — 主逻辑模块
 * 视图切换、引导流程、主页渲染、运势、心情、打卡、历史、设置、分享
 */

/* ===== 全局状态 ===== */
let deferredPrompt = null;
let onboardingGoals = [];
let onboardingSleep = '';

/* ===== 初始化 ===== */
window.addEventListener('DOMContentLoaded', init);

function init() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('install-btn');
    const tip = document.getElementById('install-tip');
    if (btn) btn.style.display = 'inline-block';
    if (tip) tip.style.display = 'none';
  });

  const profile = getProfile();
  if (profile) {
    loadHome();
  } else {
    showView('view-onboarding');
    showOnboardScreen('onboard-welcome');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[宜生活] SW 注册失败:', err);
    });
  }
}

/* ===== 视图切换 ===== */
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  const el = document.getElementById(viewId);
  if (el) el.style.display = 'block';
  window.scrollTo(0, 0);
}

function showOnboardScreen(screenId) {
  document.querySelectorAll('.onboard-screen').forEach(s => s.style.display = 'none');
  const el = document.getElementById(screenId);
  if (el) el.style.display = 'flex';
}

/* ===== 引导流程 ===== */
function startOnboarding() {
  onboardingGoals = [];
  onboardingSleep = '';
  document.querySelectorAll('.option-item.selected').forEach(el => el.classList.remove('selected'));
  const input = document.getElementById('q3-input');
  if (input) input.value = '';
  showOnboardScreen('onboard-q1');
}

/**
 * 评委/新用户快速预览：用预设档案直接生成黄历，跳过引导流程
 * 不保存档案，返回设置页时可重新设置
 */
async function previewDemo() {
  const demoProfile = {
    goals: ['健康', '工作效率', '情绪状态'],
    sleepType: '看心情',
    customReminders: '少喝奶茶、别熬夜刷手机',
    createdAt: getTodayKey(),
    _isDemo: true
  };

  saveProfileData(demoProfile);

  showView('view-onboarding');
  showOnboardScreen('onboard-loading');

  const huangli = await fetchHuangli(demoProfile);
  saveHuangliData(getTodayKey(), huangli);

  renderHome(huangli);
  showView('view-home');
  showDataSourceToast(huangli);
  showToast('这是演示效果，可在设置中修改档案');
}

function toggleOption(el) {
  el.classList.toggle('selected');
}

function selectSingle(el, qid) {
  el.parentNode.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
  el.classList.add('selected');
  if (qid === 'q2') {
    onboardingSleep = el.dataset.value;
  }
}

function nextQuestion(qid) {
  if (qid === 1) {
    onboardingGoals = [];
    document.querySelectorAll('#q1-options .option-item.selected').forEach(el => {
      onboardingGoals.push(el.dataset.value);
    });
    if (onboardingGoals.length === 0) {
      showToast('至少选一个吧～');
      return;
    }
    showOnboardScreen('onboard-q2');
  } else if (qid === 2) {
    if (!onboardingSleep) {
      showToast('选一个吧～');
      return;
    }
    showOnboardScreen('onboard-q3');
  }
}

async function finishOnboarding() {
  const reminders = document.getElementById('q3-input').value.trim();

  const profile = {
    goals: onboardingGoals,
    sleepType: onboardingSleep,
    customReminders: reminders,
    createdAt: getTodayKey()
  };

  saveProfileData(profile);

  showView('view-onboarding');
  showOnboardScreen('onboard-loading');

  const huangli = await fetchHuangli(profile);
  saveHuangliData(getTodayKey(), huangli);

  renderHome(huangli);
  showView('view-home');
  showDataSourceToast(huangli);
}

/* ===== 主页 ===== */
async function loadHome() {
  const todayKey = getTodayKey();
  let huangli = getHuangliByDate(todayKey);

  showView('view-home');

  if (!huangli) {
    document.getElementById('huangli-list').innerHTML = `
      <div class="empty-state">
        <div class="loading-ink" style="margin: 0 auto 16px;"></div>
        <div class="empty-state-text">正在翻今日黄历…</div>
      </div>
    `;
    const profile = getProfile();
    huangli = await fetchHuangli(profile);
    saveHuangliData(todayKey, huangli);
  }

  renderHome(huangli);
  if (huangli._source && huangli._source !== 'ai') {
    showDataSourceToast(huangli);
  }
}

function renderHome(huangli) {
  // 日期
  document.getElementById('date-lunar').textContent = huangli.lunar || getLunarDate();
  document.getElementById('date-solar').textContent = getSolarDate();

  // 节气
  renderSolarTerm();

  // 运势签
  renderFortune(huangli.fortune);

  // 宜/忌
  renderHuangliList(huangli);

  // 每日一言
  renderQuote(huangli.quote);

  // 心情
  renderMood();

  // 打卡统计
  renderStreak();

  // 历史
  renderHistory();
}

/* ===== 节气 ===== */
function renderSolarTerm() {
  const term = getSolarTerm();
  const bar = document.getElementById('solar-term-bar');
  const text = document.getElementById('solar-term-text');
  if (term) {
    text.textContent = term;
    bar.style.display = 'block';
  } else {
    bar.style.display = 'none';
  }
}

/* ===== 运势签 ===== */
function renderFortune(fortune) {
  if (!fortune) return;
  document.getElementById('fortune-grade').textContent = fortune.grade;
  document.getElementById('fortune-desc').textContent = fortune.desc;
}

/* ===== 宜/忌卡片 ===== */
function renderHuangliList(huangli) {
  const list = document.getElementById('huangli-list');

  if (!huangli || !huangli.items || huangli.items.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📜</div>
        <div class="empty-state-text">今日黄历暂未生成<br>点击右上角 ↻ 刷新试试</div>
      </div>
    `;
    return;
  }

  list.innerHTML = huangli.items.map((item, index) => {
    const isYi = item.type === 'yi';
    const cardClass = isYi ? 'huangli-card-yi' : 'huangli-card-ji';
    const label = isYi ? '宜' : '忌';
    const seal = isYi ? '吉' : '慎';

    const doneBtnText = isYi ? '✅ 做了' : '🙏 守住了';
    const skipBtnText = isYi ? '⏭ 跳过' : '😬 没忍住';

    let doneClass = '';
    let skipClass = '';
    let statusHtml = '';

    if (item.status === 'done') {
      doneClass = 'active';
      statusHtml = isYi
        ? '<div class="card-status">做得好</div>'
        : '<div class="card-status">好样的</div>';
    } else if (item.status === 'skip') {
      skipClass = 'active';
      statusHtml = isYi
        ? '<div class="card-status">明天再说吧</div>'
        : '<div class="card-status">没事，下次注意</div>';
    }

    return `
      <div class="huangli-card ${cardClass}">
        <div class="card-header">
          <span class="card-label">${label}</span>
          <span class="card-seal">${seal}</span>
        </div>
        <div class="card-title"><span class="card-icon">${item.icon}</span> ${escapeHtml(item.title)}</div>
        <div class="card-reason">${escapeHtml(item.reason)}</div>
        <div class="card-actions">
          <button class="card-btn card-btn-done ${doneClass}" onclick="markAction(${index}, 'done')">${doneBtnText}</button>
          <button class="card-btn card-btn-skipped ${skipClass}" onclick="markAction(${index}, 'skip')">${skipBtnText}</button>
        </div>
        ${statusHtml}
      </div>
    `;
  }).join('');
}

function markAction(index, action) {
  const todayKey = getTodayKey();
  recordAction(todayKey, index, action);

  const huangli = getHuangliByDate(todayKey);
  if (huangli) {
    renderHuangliList(huangli);
  }

  // 更新打卡统计和历史
  renderStreak();
  renderHistory();

  if (action === 'done') {
    showToast('记下了 ✨');
  }
}

async function refreshHuangli() {
  const todayKey = getTodayKey();
  const profile = getProfile();

  if (!profile) {
    showView('view-onboarding');
    showOnboardScreen('onboard-welcome');
    return;
  }

  document.getElementById('huangli-list').innerHTML = `
    <div class="empty-state">
      <div class="loading-ink" style="margin: 0 auto 16px;"></div>
      <div class="empty-state-text">正在重新翻黄历…</div>
    </div>
  `;

  const huangli = await fetchHuangli(profile);
  saveHuangliData(todayKey, huangli);
  renderHome(huangli);
  showDataSourceToast(huangli, '已更新今日黄历');
}

/* ===== 每日一言 ===== */
function renderQuote(quote) {
  if (!quote) return;
  document.getElementById('quote-text').textContent = quote.text;
  document.getElementById('quote-author').textContent = quote.author || '';
}

/* ===== 心情记录 ===== */
function renderMood() {
  const todayKey = getTodayKey();
  const mood = getMood(todayKey);

  // 清除选中状态
  document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));

  if (mood && mood.mood) {
    const btn = document.querySelector(`.mood-btn[data-mood="${mood.mood}"]`);
    if (btn) btn.classList.add('active');
  }

  const noteEl = document.getElementById('mood-note');
  if (noteEl) noteEl.value = (mood && mood.note) || '';
}

function selectMood(mood) {
  const todayKey = getTodayKey();
  const existing = getMood(todayKey) || {};
  const newMood = { ...existing, mood };

  // 如果点击的是已选中的，取消选择
  if (existing.mood === mood) {
    delete newMood.mood;
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));
  } else {
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`.mood-btn[data-mood="${mood}"]`);
    if (btn) btn.classList.add('active');
  }

  saveMoodData(todayKey, newMood);

  const labels = { great: '今天心情不错呢', good: '还不错的一天', ok: '平平淡淡也挺好', bad: '辛苦了，抱抱', terrible: '难熬的一天，明天会好的' };
  if (labels[mood]) showToast(labels[mood]);
}

function saveMoodNote() {
  const todayKey = getTodayKey();
  const note = document.getElementById('mood-note').value.trim();
  const existing = getMood(todayKey) || {};
  saveMoodData(todayKey, { ...existing, note });
}

/* ===== 打卡统计 ===== */
function renderStreak() {
  const streak = getStreak();
  const stats = getStats();
  const rate = stats.totalYi > 0 ? Math.round(stats.doneYi / stats.totalYi * 100) : 0;

  document.getElementById('streak-days').textContent = streak;
  document.getElementById('streak-total').textContent = stats.doneYi;
  document.getElementById('streak-rate').textContent = rate + '%';
}

/* ===== 日历历史 ===== */
function renderHistory() {
  const days = getRecentDays(7);
  const container = document.getElementById('history-days');
  const todayKey = getTodayKey();

  container.innerHTML = days.map(day => {
    const isToday = day.key === todayKey;
    let dotClass = 'none';
    if (day.hasDone) dotClass = 'done';
    else if (isToday) dotClass = 'none';

    return `
      <div class="history-day ${isToday ? 'active' : ''}" onclick="showHistoryDetail('${day.key}')">
        <div class="history-day-num">${day.day}</div>
        <div class="history-day-dot ${dotClass}"></div>
        <div class="history-day-label">${day.weekday}</div>
      </div>
    `;
  }).join('');
}

function showHistoryDetail(dateKey) {
  const huangli = getHuangliByDate(dateKey);
  const mood = getMood(dateKey);
  const container = document.getElementById('history-detail');

  const d = new Date(dateKey);
  const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;

  if (!huangli) {
    container.innerHTML = `
      <div class="history-detail-date">${dateStr}</div>
      <p class="settings-desc" style="text-align:center;">这一天没有黄历记录</p>
    `;
  } else {
    const itemsHtml = (huangli.items || []).map(item => {
      const isYi = item.type === 'yi';
      const statusMap = {
        done: isYi ? '✅ 已完成' : '✅ 已守住',
        skip: isYi ? '⏭ 已跳过' : '❌ 没忍住',
        null: '— 未记录'
      };
      const status = statusMap[item.status] || '— 未记录';
      const statusClass = item.status === 'done' ? 'done' : '';

      return `
        <div class="history-detail-item">
          <span class="history-detail-label ${isYi ? 'yi' : 'ji'}">${isYi ? '宜' : '忌'}</span>
          <span class="history-detail-title">${item.icon} ${escapeHtml(item.title)}</span>
          <span class="history-detail-status ${statusClass}">${status}</span>
        </div>
      `;
    }).join('');

    const moodHtml = mood && mood.mood ? `
      <div style="text-align:center; margin-top:16px;">
        <div style="font-size:28px;">${getMoodEmoji(mood.mood)}</div>
        <div class="settings-desc">${getMoodLabel(mood.mood)}</div>
        ${mood.note ? `<div class="settings-desc" style="margin-top:8px;">"${escapeHtml(mood.note)}"</div>` : ''}
      </div>
    ` : '';

    container.innerHTML = `
      <div class="history-detail-date">${dateStr}</div>
      <div class="history-detail-items">${itemsHtml}</div>
      ${moodHtml}
    `;
  }

  document.getElementById('modal-history').style.display = 'flex';
}

function closeHistoryModal() {
  document.getElementById('modal-history').style.display = 'none';
}

function showFullHistory() {
  // 直接展示今天的历史详情
  showHistoryDetail(getTodayKey());
}

function getMoodEmoji(mood) {
  const map = { great: '😊', good: '🙂', ok: '😐', bad: '😕', terrible: '😢' };
  return map[mood] || '😐';
}

function getMoodLabel(mood) {
  const map = { great: '很好', good: '不错', ok: '一般', bad: '不太好', terrible: '糟糕' };
  return map[mood] || '';
}

/* ===== 设置页 ===== */
function goSettings() {
  renderSettings();
  showView('view-settings');
}

function goHome() {
  showView('view-home');
}

function renderSettings() {
  const profile = getProfile();
  const stats = getStats();

  const profileDisplay = document.getElementById('profile-display');
  if (profile) {
    profileDisplay.innerHTML = `
      <div class="profile-row">
        <span class="profile-label">在意的事</span>
        <span class="profile-value">${escapeHtml(profile.goals.join('、'))}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">作息类型</span>
        <span class="profile-value">${escapeHtml(profile.sleepType)}</span>
      </div>
      ${profile.customReminders ? `
      <div class="profile-row">
        <span class="profile-label">提醒事项</span>
        <span class="profile-value">${escapeHtml(profile.customReminders)}</span>
      </div>
      ` : ''}
    `;
  } else {
    profileDisplay.innerHTML = '<p class="settings-desc">尚未设置档案</p>';
  }

  const statsDisplay = document.getElementById('stats-display');
  const rate = stats.totalYi > 0 ? Math.round(stats.doneYi / stats.totalYi * 100) : 0;
  const streak = getStreak();
  statsDisplay.innerHTML = `
    <div class="stat-big">${streak}</div>
    <div class="stat-label">连续打卡 ${streak} 天</div>
    <div class="stat-row">
      <div class="stat-item">
        <div class="stat-num">${stats.activeDays}</div>
        <div class="stat-desc">使用天数</div>
      </div>
      <div class="stat-item">
        <div class="stat-num">${stats.doneYi}</div>
        <div class="stat-desc">完成宜</div>
      </div>
      <div class="stat-item">
        <div class="stat-num">${stats.keptJi}</div>
        <div class="stat-desc">守住忌</div>
      </div>
      <div class="stat-item">
        <div class="stat-num">${rate}%</div>
        <div class="stat-desc">完成率</div>
      </div>
    </div>
  `;
}

function editProfile() {
  const profile = getProfile();
  if (profile) {
    document.getElementById('edit-goals').value = profile.goals.join('、');
    document.getElementById('edit-sleep').value = profile.sleepType;
    document.getElementById('edit-reminders').value = profile.customReminders || '';
  }
  document.getElementById('modal-edit').style.display = 'flex';
}

function saveProfile() {
  const goalsStr = document.getElementById('edit-goals').value.trim();
  const sleep = document.getElementById('edit-sleep').value.trim();
  const reminders = document.getElementById('edit-reminders').value.trim();

  if (!goalsStr) {
    showToast('至少填一项在意的事');
    return;
  }

  const oldProfile = getProfile();
  const profile = {
    goals: goalsStr.split(/[、,，]/).map(s => s.trim()).filter(s => s),
    sleepType: sleep || '看心情',
    customReminders: reminders,
    createdAt: oldProfile ? oldProfile.createdAt : getTodayKey()
  };

  saveProfileData(profile);
  closeModal();
  renderSettings();
  showToast('档案已更新');
}

function closeModal() {
  document.getElementById('modal-edit').style.display = 'none';
}

/* ===== 分享 ===== */
async function shareHuangli() {
  const todayKey = getTodayKey();
  const huangli = getHuangliByDate(todayKey);

  if (!huangli) {
    showToast('黄历还没生成呢');
    return;
  }

  document.getElementById('modal-share').style.display = 'flex';
  document.getElementById('share-preview').innerHTML = '<p class="settings-desc">生成中…</p>';

  const dataUrl = await generateShareImage(huangli);
  document.getElementById('share-preview').innerHTML = `<img src="${dataUrl}" alt="今日黄历">`;
}

function closeShareModal() {
  document.getElementById('modal-share').style.display = 'none';
}

/* ===== PWA 安装 ===== */
function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        showToast('已添加到桌面 📱');
      }
      deferredPrompt = null;
      const btn = document.getElementById('install-btn');
      const tip = document.getElementById('install-tip');
      if (btn) btn.style.display = 'none';
      if (tip) tip.style.display = 'block';
    });
  } else {
    showToast('请在浏览器菜单中选择"添加到主屏幕"');
  }
}

/* ===== 重置 ===== */
function resetData() {
  if (confirm('确定要重置所有数据吗？这将清除你的档案和历史记录。')) {
    resetAllData();
    showToast('已重置');
    setTimeout(() => {
      showView('view-onboarding');
      showOnboardScreen('onboard-welcome');
    }, 500);
  }
}

/* ===== 数据导出 / 导入 ===== */
function doExportData() {
  const profile = getProfile();
  if (!profile) {
    showToast('还没有数据可导出');
    return;
  }
  try {
    exportToFile();
    showToast('数据已导出 📄');
  } catch (e) {
    showToast('导出失败：' + e.message);
  }
}

function doImportData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const jsonStr = e.target.result;
    const result = importDataString(jsonStr);
    if (result.success) {
      showToast(result.message);
      // 刷新设置页显示 + 回到首页重新加载
      renderSettings();
      setTimeout(() => {
        loadHome();
      }, 800);
    } else {
      showToast(result.message);
    }
    // 清空 input，使同一文件可重复选择
    event.target.value = '';
  };
  reader.onerror = function() {
    showToast('文件读取失败');
    event.target.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

/* ===== 工具函数 ===== */
function showDataSourceToast(huangli, defaultMsg) {
  const source = huangli._source;
  if (source === 'ai') {
    if (defaultMsg) showToast(defaultMsg);
  } else if (source === 'mock_rate_limited') {
    showToast('今日 AI 生成次数已用完，当前显示本地建议');
  } else if (source === 'mock_error') {
    showToast('AI 暂时不可用，当前显示本地建议');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 2000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
