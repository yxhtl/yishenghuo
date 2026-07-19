/**
 * Service Worker — PWA 离线缓存
 */

const CACHE_NAME = 'yishenghuo-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/storage.js',
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
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
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
