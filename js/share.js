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

  // 基础间距单位 24px，所有间距都是它的倍数：标题间1x、区块间2x、大段间3x
  const BASE = 24;
  // 根据实际行数计算一言区域高度
  const quoteSectionHeight = quote ? (BASE * 1.5 + BASE * 0.75 + quoteLines * BASE * 0.875 + BASE * 0.75) : 0;

  let H = BASE * 3.5; // 顶部留白增大（灯笼和文字间距）
  H += BASE * 2.8;  // 标题区高度（灯笼+宜生活+农历+天气）
  if (fortune) H += BASE * 4; // 运势区增大（解决中吉与今日运势重叠）
  H += yiItems.length * BASE * 1.25 + BASE * 2.8; // 宜卡片（增加内边距）
  H += jiItems.length * BASE * 1.25 + BASE * 2.8; // 忌卡片（增加内边距）
  if (yiItems.length > 0 && jiItems.length > 0) H += BASE * 0.75; // 卡片间距
  if (quote) H += quoteSectionHeight;
  H += BASE * 3; // 底部区域增大（解决一言和日期重叠）
  H = Math.max(H, 650);

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

  // 顶部标题区 - 增大顶部留白
  let y = BASE * 2.5;
  
  // 灯笼 + 宜生活 横向排列
  ctx.font = 'bold 28px "Ma Shan Zheng", "STKaiti", serif';
  ctx.fillStyle = '#1a1612';
  const titleText = '宜生活';
  const titleWidth = ctx.measureText(titleText).width;
  const lanternWidth = 28;
  const totalWidth = lanternWidth + 8 + titleWidth;
  const startX = (W - totalWidth) / 2;
  
  // 绘制灯笼
  ctx.font = '24px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏮', startX + lanternWidth/2, y);
  
  // 绘制标题
  ctx.font = 'bold 28px "Ma Shan Zheng", "STKaiti", serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(titleText, startX + lanternWidth + 8 + titleWidth/2, y + 4);
    y += BASE * 1;   // 标题到农历间距增大

  // 农历
  ctx.font = '13px "Ma Shan Zheng", "STKaiti", serif';
  ctx.fillStyle = '#7a6e60';
  ctx.fillText(huangli.lunar || '', W / 2, y);
  y += BASE * 0.7;

  // 天气信息（如果有）- 行间距缩小
  if (typeof currentWeather !== 'undefined' && currentWeather) {
    ctx.font = '12px "ZCOOL XiaoWei", "PingFang SC", sans-serif';
    ctx.fillStyle = '#a89c8a';
    const weatherStr = `${currentWeather.emoji || ''} ${currentWeather.desc || ''} ${currentWeather.temperature}° ${currentWeather.city || ''}`;
    ctx.fillText(weatherStr, W / 2, y);
    y += BASE * 0.625;
  }

  drawInkLine(ctx, 60, y, W - 60, y);
  y += BASE * 1.25;

  // 运势签 - 增大各层间距避免重叠
  if (fortune) {
    // 今日运势（小标签）
    ctx.font = '11px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#4a4a4a';
    ctx.fillText('今日运势', W / 2, y);
    y += BASE * 0.75; // 标签和运势间距增大 (18px)，避免重叠

    // 中吉（大结果）
    ctx.font = 'bold 26px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#9c1f17';
    ctx.fillText(fortune.grade, W / 2, y);
    y += BASE * 1.6; // 运势和说明距离 (38px)

    // 说明文字
    ctx.font = '12px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#7a6e60';
    ctx.fillText(fortune.desc, W / 2, y);
    y += BASE * 1.4;

    drawInkLine(ctx, 80, y, W - 80, y);
    y += BASE;
  }

  // 宜
  if (yiItems.length > 0) {
    // 固定卡片内边距和内容布局
    const cardPaddingTop = 24;
    const cardPaddingBottom = 20;
    const headerHeight = 42;     // 宜字+印章区域高度
    const itemHeight = 30;       // 每条内容固定高度（增大行高）
    const cardHeight = cardPaddingTop + headerHeight + yiItems.length * itemHeight + cardPaddingBottom;
    drawCardBg(ctx, 28, y, W - 56, cardHeight, 'rgba(184, 50, 41, 0.05)');

    // 宜字和印章 - 居中于头部区域
    ctx.font = 'bold 26px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#b83229';
    ctx.textBaseline = 'middle';
    const yiY = y + cardPaddingTop + headerHeight / 2;
    ctx.fillText('宜', W / 2 - 10, yiY);   // 宜字稍左偏，给印章留空间
    drawSeal(ctx, W / 2 + 18, yiY - 4, 14, '吉');

    // 宜忌内容
    yiItems.forEach((item, i) => {
      drawYiJiItem(ctx, item, W / 2, y + cardPaddingTop + headerHeight + 8 + i * itemHeight);
    });
    y += cardHeight + 14;
  }

  // 忌
  if (jiItems.length > 0) {
    // 固定卡片内边距和内容布局
    const cardPaddingTop = 24;
    const cardPaddingBottom = 20;
    const headerHeight = 42;     // 忌字+印章区域高度
    const itemHeight = 30;       // 每条内容固定高度（增大行高）
    const cardHeight = cardPaddingTop + headerHeight + jiItems.length * itemHeight + cardPaddingBottom;
    drawCardBg(ctx, 28, y, W - 56, cardHeight, 'rgba(26, 22, 18, 0.03)');

    // 忌字和印章 - 居中于头部区域
    ctx.font = 'bold 26px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#1a1612';
    ctx.textBaseline = 'middle';
    const jiY = y + cardPaddingTop + headerHeight / 2;
    ctx.fillText('忌', W / 2 - 10, jiY);   // 忌字稍左偏，给印章留空间
    drawSeal(ctx, W / 2 + 18, jiY - 4, 14, '慎');

    jiItems.forEach((item, i) => {
      drawYiJiItem(ctx, item, W / 2, y + cardPaddingTop + headerHeight + 8 + i * itemHeight);
    });
    y += cardHeight + 14;
  }

  // 每日一言
  if (quote) {
    drawInkLine(ctx, 80, y, W - 80, y);
    y += BASE;

    ctx.font = '13px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#a89c8a';
    ctx.fillText('每日一言', W / 2, y);
    y += BASE * 0.75;

    // 引用文 - 正常字距（取消手动加空格）
    ctx.font = '17px "Long Cang", "STXingkai", cursive';
    ctx.fillStyle = '#4a3f35';
    wrapText(ctx, quote.text, W / 2, y, W - 80, BASE * 0.875);
    y += quoteLines * BASE * 0.875;

    // 作者 - 使用 middle 中线对齐，让破折号和文字对齐
    y += BASE * 0.5;
    ctx.font = '11px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#a89c8a';
    ctx.textBaseline = 'middle';
    ctx.fillText(quote.author || '', W / 2, y);
    y += BASE * 0.75;
  }

  // 底部 - 确保不被截断
  y = H - BASE * 3;
  drawInkLine(ctx, 60, y - BASE * 0.5, W - 60, y - BASE * 0.5);

  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const solarStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} 星期${weekdays[now.getDay()]}`;

  ctx.font = '13px "ZCOOL XiaoWei", sans-serif';
  ctx.fillStyle = '#8a7e6a';
  ctx.fillText(solarStr, W / 2, y + BASE * 0.5);

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
