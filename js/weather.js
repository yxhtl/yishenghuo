/**
 * weather.js — 天气数据模块
 * 获取用户位置 + 当前天气，缓存到 localStorage（按天缓存）
 * 天气数据来源于 Open-Meteo（免费、无需 API Key、支持 CORS）
 */

const WEATHER_CACHE_KEY = 'yishenghuo_weather';
const WEATHER_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 小时缓存（天气会变，不宜太长）
const GEO_DENIED_KEY = 'yishenghuo_geo_denied';

/* WMO 天气代码 → 中文描述 + emoji */
const WMO_CODE_MAP = {
  0:  { desc: '晴',     emoji: '☀️' },
  1:  { desc: '晴',     emoji: '🌤️' },
  2:  { desc: '多云',   emoji: '⛅' },
  3:  { desc: '阴',     emoji: '☁️' },
  45: { desc: '有雾',   emoji: '🌫️' },
  48: { desc: '雾凇',   emoji: '🌫️' },
  51: { desc: '小毛雨', emoji: '🌦️' },
  53: { desc: '毛毛雨', emoji: '🌦️' },
  55: { desc: '大毛雨', emoji: '🌧️' },
  56: { desc: '冻毛雨', emoji: '🌧️' },
  57: { desc: '冻雨',   emoji: '🌧️' },
  61: { desc: '小雨',   emoji: '🌦️' },
  63: { desc: '中雨',   emoji: '🌧️' },
  65: { desc: '大雨',   emoji: '🌧️' },
  66: { desc: '冻雨',   emoji: '🌧️' },
  67: { desc: '大冻雨', emoji: '🌧️' },
  71: { desc: '小雪',   emoji: '🌨️' },
  73: { desc: '中雪',   emoji: '🌨️' },
  75: { desc: '大雪',   emoji: '❄️' },
  77: { desc: '米雪',   emoji: '🌨️' },
  80: { desc: '小阵雨', emoji: '🌦️' },
  81: { desc: '阵雨',   emoji: '🌧️' },
  82: { desc: '大阵雨', emoji: '⛈️' },
  85: { desc: '小阵雪', emoji: '🌨️' },
  86: { desc: '大阵雪', emoji: '❄️' },
  95: { desc: '雷阵雨', emoji: '⛈️' },
  96: { desc: '雷雨冰雹', emoji: '⛈️' },
  99: { desc: '大雷雨冰雹', emoji: '⛈️' }
};

/**
 * 获取缓存的天气数据（如果未过期）
 * @returns {object|null}
 */
function getCachedWeather() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const age = Date.now() - (data.fetchedAt || 0);
    // 跨天则过期
    const cacheDate = new Date(data.fetchedAt);
    const now = new Date();
    const isSameDay = cacheDate.getDate() === now.getDate() &&
                      cacheDate.getMonth() === now.getMonth() &&
                      cacheDate.getFullYear() === now.getFullYear();
    if (!isSameDay) return null;
    if (age > WEATHER_CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 缓存天气数据
 */
function cacheWeather(data) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
      ...data,
      fetchedAt: Date.now()
    }));
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 获取用户地理位置（优先浏览器 API，失败则用服务端 IP 定位）
 * 用户拒绝浏览器定位后不再重复弹窗，直接走 IP 定位
 * @returns {Promise<{lat, lon, city}|null>}
 */
async function getUserLocation() {
  // 方案 1：浏览器地理定位（精确，但需用户授权）
  // 用户曾拒绝过则跳过，不再弹窗
  const geoDenied = localStorage.getItem(GEO_DENIED_KEY) === '1';
  if (!geoDenied && 'geolocation' in navigator) {
    try {
      const pos = await getGeoPosition(5000); // 5 秒超时
      if (pos) {
        const city = await reverseGeocode(pos.lat, pos.lon);
        return { lat: pos.lat, lon: pos.lon, city: city || '当前位置' };
      }
    } catch (e) {
      // 用户拒绝授权（code=1）则记录，不再弹窗
      if (e.message && e.message.includes('Geo error: 1')) {
        localStorage.setItem(GEO_DENIED_KEY, '1');
        console.info('[宜生活] 用户拒绝定位授权，后续将使用 IP 定位');
      } else {
        console.info('[宜生活] 浏览器定位失败，尝试 IP 定位:', e.message);
      }
    }
  }

  // 方案 2：服务端 IP 定位（无需授权，精度到城市级）
  try {
    const resp = await fetch('/api/weather', { method: 'GET' });
    if (resp.ok) {
      const data = await resp.json();
      if (data.lat && data.lon) {
        return { lat: data.lat, lon: data.lon, city: data.city || '当前位置' };
      }
    }
  } catch (e) {
    console.info('[宜生活] IP 定位失败:', e.message);
  }

  return null;
}

/**
 * 封装 navigator.geolocation.getCurrentPosition 为 Promise
 */
function getGeoPosition(timeout = 5000) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      }),
      (err) => reject(new Error(`Geo error: ${err.message}`)),
      { timeout, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false }
    );
  });
}

/**
 * 反向地理编码：经纬度 → 城市名
 * 使用 Open-Meteo 的逆转码 API（免费、CORS 支持）
 */
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=zh`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    // Open-Meteo 逆转码返回 results 数组
    if (data.results && data.results.length > 0) {
      const r = data.results[0];
      return r.name || r.admin3 || r.admin2 || r.admin1 || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 调用 Open-Meteo API 获取当前天气
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object|null>}
 */
async function fetchWeatherData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,wind_speed_10m&timezone=auto&forecast_days=1`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Weather API ${resp.status}`);
  const data = await resp.json();

  if (!data.current) return null;

  const code = data.current.weather_code;
  const wmo = WMO_CODE_MAP[code] || { desc: '未知', emoji: '🌡️' };

  return {
    temperature: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    humidity: data.current.relative_humidity_2m,
    windSpeed: Math.round(data.current.wind_speed_10m),
    code: code,
    desc: wmo.desc,
    emoji: wmo.emoji
  };
}

/**
 * 获取天气（缓存优先，未命中则请求）
 * 如果获取不到地理位置，返回 null（不报错，静默降级）
 * @returns {Promise<{temperature, desc, emoji, city, feelsLike, humidity, windSpeed}|null>}
 */
async function getWeather() {
  // 检查缓存
  const cached = getCachedWeather();
  if (cached) return cached;

  // 获取位置
  const location = await getUserLocation();
  if (!location) return null;

  // 获取天气
  try {
    const weather = await fetchWeatherData(location.lat, location.lon);
    if (!weather) return null;

    const result = {
      ...weather,
      city: location.city,
      lat: location.lat,
      lon: location.lon
    };

    cacheWeather(result);
    return result;
  } catch (e) {
    console.warn('[宜生活] 天气获取失败:', e.message);
    return null;
  }
}

/**
 * 生成天气的简短文本描述（用于 AI prompt 注入）
 * @param {object} weather
 * @returns {string}
 */
function getWeatherContextText(weather) {
  if (!weather) return '';
  let text = `今日天气：${weather.desc}，气温${weather.temperature}°C`;
  if (weather.feelsLike !== weather.temperature) {
    text += `（体感${weather.feelsLike}°C）`;
  }
  if (weather.humidity) text += `，湿度${weather.humidity}%`;
  if (weather.windSpeed) text += `，风速${weather.windSpeed}km/h`;
  text += `，所在城市：${weather.city}`;
  return text;
}
