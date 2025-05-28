// WeTalk Service Worker

const CACHE_NAME = 'wetalk-v1.0.0';
const STATIC_CACHE_NAME = 'wetalk-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'wetalk-dynamic-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/scripts/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// 需要缓存的动态资源模式
const CACHE_PATTERNS = [
    /^https:\/\/fonts\.googleapis\.com/,
    /^https:\/\/fonts\.gstatic\.com/
];

// 不缓存的资源模式
const NO_CACHE_PATTERNS = [
    /^https:\/\/api\.openai\.com/
];

// Service Worker 安装事件
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Static assets cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache static assets', error);
            })
    );
});

// Service Worker 激活事件
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // 删除旧版本的缓存
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName.startsWith('wetalk-')) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// 网络请求拦截
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // 跳过非GET请求
    if (request.method !== 'GET') {
        return;
    }
    
    // 跳过Chrome扩展请求
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // 跳过不需要缓存的API请求
    if (NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
        return;
    }
    
    event.respondWith(handleRequest(request));
});

// 处理网络请求的策略
async function handleRequest(request) {
    const url = new URL(request.url);
    
    // 对于静态资源，使用缓存优先策略
    if (STATIC_ASSETS.some(asset => request.url.endsWith(asset))) {
        return cacheFirst(request, STATIC_CACHE_NAME);
    }
    
    // 对于字体等外部资源，使用缓存优先策略
    if (CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
        return cacheFirst(request, DYNAMIC_CACHE_NAME);
    }
    
    // 对于HTML页面，使用网络优先策略
    if (request.headers.get('accept').includes('text/html')) {
        return networkFirst(request, DYNAMIC_CACHE_NAME);
    }
    
    // 其他资源使用网络优先策略
    return networkFirst(request, DYNAMIC_CACHE_NAME);
}

// 缓存优先策略
async function cacheFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // 后台更新缓存
            updateCache(request, cacheName);
            return cachedResponse;
        }
        
        // 缓存中没有，从网络获取
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache first strategy failed:', error);
        return new Response('离线状态，资源不可用', { 
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// 网络优先策略
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', error);
        
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 如果是HTML请求且缓存中没有，返回离线页面
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
        }
        
        return new Response('离线状态，资源不可用', { 
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// 后台更新缓存
async function updateCache(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        console.log('Background cache update failed:', error);
    }
}

// 消息处理
self.addEventListener('message', event => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: CACHE_NAME
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({
                    success: true
                });
            }).catch(error => {
                event.ports[0].postMessage({
                    success: false,
                    error: error.message
                });
            });
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
});

// 清除所有缓存
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames
        .filter(name => name.startsWith('wetalk-'))
        .map(name => caches.delete(name));
    
    return Promise.all(deletePromises);
}

// 推送通知处理（预留）
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: data.actions || []
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 通知点击处理（预留）
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

// 后台同步处理（预留）
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // 实现后台同步逻辑
    console.log('Background sync triggered');
}

// 错误处理
self.addEventListener('error', event => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker: Script loaded'); 