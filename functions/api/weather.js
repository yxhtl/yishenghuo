/**
 * functions/api/weather.js — Cloudflare Pages Function
 * 服务端 IP 定位兜底
 *
 * Cloudflare 自带 request.cf 对象，包含基于 IP 的地理位置信息：
 *   cf.latitude   — 纬度
 *   cf.longitude  — 经度
 *   cf.city       — 城市名
 *   cf.region     — 区域
 *   cf.country    — 国家代码
 *
 * 前端拿到经纬度后自行调用 Open-Meteo 获取天气（CORS 友好）
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
  });
}

/* CORS 预检 */
export function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request } = context;

  // Cloudflare 自带 request.cf 地理定位
  const cf = request.cf;

  if (!cf || !cf.latitude || !cf.longitude) {
    return jsonResponse({ error: '无法获取位置信息' }, 404);
  }

  return jsonResponse({
    lat: cf.latitude,
    lon: cf.longitude,
    city: cf.city || cf.region || '当前位置'
  });
}
