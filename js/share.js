/**
 * share.js — 分享图片生成模块
 * Canvas 绘制水墨风格竖版分享图片
 */

async function generateShareImage(huangli) {
  // 等待自定义字体加载完成，但设置 3 秒超时避免无限等待
  try {
    const fontLoadPromise = Promise.all([
      document.fonts.load('bold 24px "Ma Shan Zheng"'),
      document.fonts.load('bold 26px "Ma Shan Zheng"'),
      document.fonts.load('bold 30px "Ma Shan Zheng"'),
      document.fonts.load('14px "ZCOOL XiaoWei"'),
      document.fonts.load('16px "Long Cang"')
    ]).then(() => document.fonts.ready);

    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 3000));
    await Promise.race([fontLoadPromise, timeoutPromise]);
  } catch (e) {
    console.warn('[宜生活] 字体加载未完成，使用回退字体');
  }

  const W = 380;
  const yiItems = (huangli.items || []).filter(i => i.type === 'yi');
  const jiItems = (huangli.items || []).filter(i => i.type === 'ji');
  const fortune = huangli.fortune;
  const quote = huangli.quote;

  // 先创建 ctx 用于测量每日一言的实际换行行数
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let quoteLines = 1;
  if (quote && quote.text) {
    ctx.font = '17px "Long Cang", "STXingkai", cursive';
    quoteLines = countWrappedLines(ctx, quote.text, W - 100);
  }

  // 基础间距单位 28px，整体更宽松
  const BASE = 28;
  // 根据实际行数计算一言区域高度
  const quoteSectionHeight = quote ? (BASE * 1.5 + BASE * 0.75 + quoteLines * BASE * 0.95 + BASE * 0.8) : 0;

  let H = BASE * 4;     // 顶部留白
  H += BASE * 3.2;     // 标题区高度（灯笼+宜生活+农历+天气）
  if (fortune) H += BASE * 5;   // 运势区（大幅增加）
  H += yiItems.length * BASE * 1.3 + BASE * 3.2; // 宜卡片
  H += jiItems.length * BASE * 1.3 + BASE * 3.2; // 忌卡片
  if (yiItems.length > 0 && jiItems.length > 0) H += BASE; // 卡片间距
  if (quote) H += quoteSectionHeight;
  H += BASE * 4;    // 底部区域（大幅增加）
  H = Math.max(H, 750);

  // 设置最终画布尺寸
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  // 宣纸背景
  ctx.fillStyle = '#f4ede0';
  ctx.fillRect(0, 0, W, H);

  // 纸张纹理
  ctx.fillStyle = 'rgba(139, 105, 20, 0.02)';
  for (let i = 0; i < 80; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }

  // 顶部墨晕
  const topGrad = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.6);
  topGrad.addColorStop(0, 'rgba(40, 30, 15, 0.08)');
  topGrad.addColorStop(1, 'rgba(40, 30, 15, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 150);

  // 底部墨晕
  const botGrad = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, W * 0.5);
  botGrad.addColorStop(0, 'rgba(40, 30, 15, 0.06)');
  botGrad.addColorStop(1, 'rgba(40, 30, 15, 0)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 120, W, 120);

  ctx.textAlign = 'center';

  // 顶部标题区 - 大幅增加顶部留白
  let y = BASE * 3;
  
  // 灯笼 + 宜生活 横向排列
  ctx.font = 'bold 30px "Ma Shan Zheng", "STKaiti", serif';
  ctx.fillStyle = '#1a1612';
  const titleText = '宜生活';
  const titleWidth = ctx.measureText(titleText).width;
  const lanternWidth = 30;
  const totalWidth = lanternWidth + 10 + titleWidth;
  const startX = (W - totalWidth) / 2;
  
  // 绘制灯笼
  ctx.font = '26px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏮', startX + lanternWidth/2, y);
  
  // 绘制标题
  ctx.font = 'bold 30px "Ma Shan Zheng", "STKaiti", serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(titleText, startX + lanternWidth + 10 + titleWidth/2, y + 5);
  y += BASE * 1.3;   // 标题到农历 大幅拉开

  // 农历
  ctx.font = '14px "Ma Shan Zheng", "STKaiti", serif';
  ctx.fillStyle = '#7a6e60';
  ctx.fillText(huangli.lunar || '', W / 2, y);
  y += BASE * 0.85;

  // 天气信息（如果有）- 行间距缩小
  if (typeof currentWeather !== 'undefined' && currentWeather) {
    ctx.font = '12px "ZCOOL XiaoWei", "PingFang SC", sans-serif';
    ctx.fillStyle = '#a89c8a';
    const weatherStr = `${currentWeather.emoji || ''} ${currentWeather.desc || ''} ${currentWeather.temperature}° ${currentWeather.city || ''}`;
    ctx.fillText(weatherStr, W / 2, y);
    y += BASE * 0.625;
  }

  drawInkLine(ctx, 60, y, W - 60, y);
  y += BASE * 1.5;

  // 运势签 - 大幅拉开各层间距
  if (fortune) {
    // 今日运势（小标签）
    ctx.font = '12px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#4a4a4a';
    ctx.fillText('今日运势', W / 2, y);
    y += BASE * 1;     // 标签到运势 大幅拉开 (28px)

    // 中吉（大结果）
    ctx.font = 'bold 30px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#9c1f17';
    ctx.fillText(fortune.grade, W / 2, y);
    y += BASE * 1.8;    // 运势到说明 大幅拉开 (50px)

    // 说明文字
    ctx.font = '13px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#7a6e60';
    ctx.fillText(fortune.desc, W / 2, y);
    y += BASE * 1.6;

    drawInkLine(ctx, 80, y, W - 80, y);
    y += BASE * 1.2;
  }

  // 宜
  if (yiItems.length > 0) {
    const cardPaddingTop = 28;
    const cardPaddingBottom = 24;
    const headerHeight = 48;
    const itemHeight = 34;
    const cardHeight = cardPaddingTop + headerHeight + yiItems.length * itemHeight + cardPaddingBottom;
    drawCardBg(ctx, 28, y, W - 56, cardHeight, 'rgba(184, 50, 41, 0.05)');

    ctx.font = 'bold 28px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#b83229';
    ctx.textBaseline = 'middle';
    const yiY = y + cardPaddingTop + headerHeight / 2;
    ctx.fillText('宜', W / 2 - 12, yiY);
    drawSeal(ctx, W / 2 + 20, yiY - 4, 15, '吉');

    yiItems.forEach((item, i) => {
      drawYiJiItem(ctx, item, W / 2, y + cardPaddingTop + headerHeight + 10 + i * itemHeight);
    });
    y += cardHeight + 18;
  }

  // 忌
  if (jiItems.length > 0) {
    const cardPaddingTop = 28;
    const cardPaddingBottom = 24;
    const headerHeight = 48;
    const itemHeight = 34;
    const cardHeight = cardPaddingTop + headerHeight + jiItems.length * itemHeight + cardPaddingBottom;
    drawCardBg(ctx, 28, y, W - 56, cardHeight, 'rgba(26, 22, 18, 0.03)');

    ctx.font = 'bold 28px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#1a1612';
    ctx.textBaseline = 'middle';
    const jiY = y + cardPaddingTop + headerHeight / 2;
    ctx.fillText('忌', W / 2 - 12, jiY);
    drawSeal(ctx, W / 2 + 20, jiY - 4, 15, '慎');

    jiItems.forEach((item, i) => {
      drawYiJiItem(ctx, item, W / 2, y + cardPaddingTop + headerHeight + 10 + i * itemHeight);
    });
    y += cardHeight + 18;
  }

  // 每日一言
  if (quote) {
    drawInkLine(ctx, 80, y, W - 80, y);
    y += BASE * 1.3;

    ctx.font = '14px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#a89c8a';
    ctx.fillText('每日一言', W / 2, y);
    y += BASE;

    // 引用文
    ctx.font = '18px "Long Cang", "STXingkai", cursive';
    ctx.fillStyle = '#4a3f35';
    wrapText(ctx, quote.text, W / 2, y, W - 80, BASE * 0.95);
    y += quoteLines * BASE * 0.95;

    // 作者
    y += BASE * 0.6;
    ctx.font = '12px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#a89c8a';
    ctx.textBaseline = 'middle';
    ctx.fillText(quote.author || '', W / 2, y);
    y += BASE;
  }

  // 底部 - 大幅增加空间
  y = H - BASE * 4;
  drawInkLine(ctx, 60, y - BASE * 0.8, W - 60, y - BASE * 0.8);

  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const solarStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} 星期${weekdays[now.getDay()]}`;

  ctx.font = '14px "ZCOOL XiaoWei", sans-serif';
  ctx.fillStyle = '#8a7e6a';
  ctx.fillText(solarStr, W / 2, y + BASE * 0.8);

  return canvas.toDataURL('image/png');
}

// 绘制宜/忌条目 - 图标和文字横向排列
// 图标在左，文字在右，整体居中对齐，使用 middle 垂直居中
function drawYiJiItem(ctx, item, x, y) {
  const icon = item.icon;
  const title = item.title;
  const gap = 6; // 图标和文字间距
  
  // 使用 middle 垂直对齐，确保图标和文字视觉中心一致
  ctx.textBaseline = 'middle';
  
  // 先测量文字
  ctx.font = '15px "ZCOOL XiaoWei", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#1a1612';
  const titleWidth = ctx.measureText(title).width;
  
  // 测量 emoji（使用相同字体大小）
  ctx.font = '16px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  const iconWidth = ctx.measureText(icon).width;
  
  // 计算总宽度和起始位置（居中对齐）
  const totalWidth = iconWidth + gap + titleWidth;
  const startX = x - totalWidth / 2;
  
  // 绘制图标 - middle 对齐，垂直居中
  ctx.font = '16px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, startX + iconWidth / 2, y);
  
  // 绘制文字 - middle 对齐，垂直居中
  ctx.font = '15px "ZCOOL XiaoWei", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1a1612';
  ctx.fillText(title, startX + iconWidth + gap + titleWidth / 2, y);
}

function drawCardBg(ctx, x, y, w, h, bgColor) {
  const r = 10;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawInkLine(ctx, x1, y1, x2, y2) {
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, 'rgba(120, 100, 70, 0)');
  grad.addColorStop(0.5, 'rgba(120, 100, 70, 0.3)');
  grad.addColorStop(1, 'rgba(120, 100, 70, 0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawSeal(ctx, x, y, size, text) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  ctx.fillStyle = 'rgba(184, 50, 41, 0.7)';
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.65}px "Ma Shan Zheng", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  let lines = [];

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = chars[i];
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);

  // 避免最后一行只有一个字，尝试从上一行借字
  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1];
    const prevLine = lines[lines.length - 2];
    if (lastLine.length === 1 && prevLine.length > 1) {
      // 从上一行最后一个字借到最后一行
      lines[lines.length - 2] = prevLine.slice(0, -1);
      lines[lines.length - 1] = prevLine.slice(-1) + lastLine;
    }
  }

  lines.forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight);
  });
}

/**
 * 计算文本按 maxWidth 换行后的实际行数（不绘制，只测量）
 */
function countWrappedLines(ctx, text, maxWidth) {
  const chars = text.split('');
  let line = '';
  let lines = 0;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
      lines++;
      line = chars[i];
    } else {
      line = testLine;
    }
  }
  if (line) lines++;
  return Math.max(1, lines);
}
