/**
 * Service Worker — PWA 离线缓存
 */

const CACHE_NAME = 'yishenghuo-v9';
const FONT_CACHE_NAME = 'yishenghuo-fonts-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/lib/lunar.js',
  '/js/storage.js',
  '/js/weather.js',
  '/js/api.js',
  '/js/share.js',
  '/js/app.js',
  '/manifest.json',
  '/icon.svg'
];

// 安装：缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== FONT_CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 请求拦截：API 不缓存，其他网络优先
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 请求不走缓存
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 字体文件（loli.net 镜像）：缓存优先，命中则直接返回，未命中才网络请求并缓存
  // 字体文件不会变化，缓存优先策略可以避免重复下载
  if (url.hostname === 'fonts.loli.net' || url.hostname === 'gstatic.loli.net') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // 静态资源：网络优先，失败回退缓存
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 缓存成功的响应
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
