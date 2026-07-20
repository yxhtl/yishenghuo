/**
 * api/weather.js — 服务端 IP 定位兜底
 * 当浏览器无法获取地理位置时（用户拒绝授权 / 不支持），
 * 通过 Vercel 提供的 IP 定位头信息获取经纬度，返回给前端。
 *
 * Vercel 自动注入的头：
 *   x-vercel-ip-latitude   — 纬度
 *   x-vercel-ip-longitude  — 经度
 *   x-vercel-ip-city       — 城市名（英文）
 *
 * 前端拿到经纬度后自行调用 Open-Meteo 获取天气（CORS 友好）
 */

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const lat = req.headers['x-vercel-ip-latitude'];
  const lon = req.headers['x-vercel-ip-longitude'];
  const city = req.headers['x-vercel-ip-city'];

  if (!lat || !lon) {
    return res.status(404).json({ error: '无法获取位置信息' });
  }

  return res.status(200).json({
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    city: city ? decodeURIComponent(city) : '当前位置'
  });
};
