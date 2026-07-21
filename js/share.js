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
    ctx.font = '16px "Long Cang", "STXingkai", cursive';
    quoteLines = countWrappedLines(ctx, quote.text, W - 100);
  }

  // 根据实际行数计算一言区域高度
  // 结构：分割线间距24 + 标签20 + 首行偏移14 + (行数-1)*24行距 + 作者20 + 底部间距10
  const quoteSectionHeight = quote ? (24 + 20 + 14 + (quoteLines - 1) * 24 + 20 + 10) : 0;

  let H = 80;
  H += 70;
  if (fortune) H += 64;
  H += yiItems.length * 32 + 50;
  H += jiItems.length * 32 + 50;
  if (quote) H += quoteSectionHeight;
  H += 50;
  H = Math.max(H, 480);

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

  // 顶部标题
  let y = 50;
  ctx.font = '32px sans-serif';
  ctx.fillText('🏮', W / 2, y);
  y += 24;

  ctx.font = 'bold 30px "Ma Shan Zheng", "STKaiti", serif';
  ctx.fillStyle = '#1a1612';
  ctx.fillText('宜 生 活', W / 2, y);
  y += 22;

  ctx.font = '14px "Ma Shan Zheng", "STKaiti", serif';
  ctx.fillStyle = '#7a6e60';
  ctx.fillText(huangli.lunar || '', W / 2, y);
  y += 20;

  // 天气信息（如果有）
  if (typeof currentWeather !== 'undefined' && currentWeather) {
    ctx.font = '12px "ZCOOL XiaoWei", "PingFang SC", sans-serif';
    ctx.fillStyle = '#a89c8a';
    const weatherStr = `${currentWeather.emoji || ''} ${currentWeather.desc || ''} ${currentWeather.temperature}° ${currentWeather.city || ''}`;
    ctx.fillText(weatherStr, W / 2, y);
    y += 16;
  }

  drawInkLine(ctx, 60, y, W - 60, y);
  y += 24;

  // 运势签
  if (fortune) {
    ctx.font = '11px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#bfb3a1';
    ctx.fillText('今日运势', W / 2, y);
    y += 24;

    ctx.font = 'bold 24px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#9c1f17';
    ctx.fillText(fortune.grade, W / 2, y);
    y += 16;

    ctx.font = '12px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#7a6e60';
    ctx.fillText(fortune.desc, W / 2, y + 14);
    y += 34;

    drawInkLine(ctx, 80, y, W - 80, y);
    y += 20;
  }

  // 宜
  if (yiItems.length > 0) {
    drawCardBg(ctx, 28, y, W - 56, yiItems.length * 32 + 40, 'rgba(184, 50, 41, 0.05)');

    ctx.font = 'bold 26px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#b83229';
    ctx.fillText('宜', W / 2, y + 30);
    drawSeal(ctx, W / 2 + 28, y + 16, 14, '吉');

    ctx.font = '15px "ZCOOL XiaoWei", "PingFang SC", sans-serif';
    ctx.fillStyle = '#1a1612';
    yiItems.forEach((item, i) => {
      ctx.fillText(`${item.icon}  ${item.title}`, W / 2, y + 55 + i * 32);
    });
    y += yiItems.length * 32 + 50;
  }

  // 忌
  if (jiItems.length > 0) {
    drawCardBg(ctx, 28, y, W - 56, jiItems.length * 32 + 40, 'rgba(26, 22, 18, 0.03)');

    ctx.font = 'bold 26px "Ma Shan Zheng", "STKaiti", serif';
    ctx.fillStyle = '#1a1612';
    ctx.fillText('忌', W / 2, y + 30);
    drawSeal(ctx, W / 2 + 28, y + 16, 14, '慎');

    ctx.font = '15px "ZCOOL XiaoWei", "PingFang SC", sans-serif';
    ctx.fillStyle = '#1a1612';
    jiItems.forEach((item, i) => {
      ctx.fillText(`${item.icon}  ${item.title}`, W / 2, y + 55 + i * 32);
    });
    y += jiItems.length * 32 + 50;
  }

  // 每日一言
  if (quote) {
    drawInkLine(ctx, 80, y, W - 80, y);
    y += 24;

    ctx.font = '13px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#a89c8a';
    ctx.fillText('每日一言', W / 2, y);
    y += 20;

    ctx.font = '16px "Long Cang", "STXingkai", cursive';
    ctx.fillStyle = '#4a3f35';
    wrapText(ctx, quote.text, W / 2, y + 14, W - 100, 24);
    y += 14 + quoteLines * 24;

    ctx.font = '11px "ZCOOL XiaoWei", serif';
    ctx.fillStyle = '#a89c8a';
    ctx.fillText(quote.author || '', W / 2, y);
    y += 10;
  }

  // 底部
  y = H - 36;
  drawInkLine(ctx, 60, y - 14, W - 60, y - 14);

  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const solarStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} 星期${weekdays[now.getDay()]}`;

  ctx.font = '13px "ZCOOL XiaoWei", sans-serif';
  ctx.fillStyle = '#8a7e6a';
  ctx.fillText(solarStr, W / 2, y);

  return canvas.toDataURL('image/png');
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
