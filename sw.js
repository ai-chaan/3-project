// ぽつんバスター: ゲーム開始の通知を出すための Service Worker
// （Android の Chrome は、ページから直接 new Notification() で通知を出せないため）
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// 通知をタップしたら、開いているアプリの画面を前に出す
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            const win = list.find((c) => 'focus' in c);
            if (win) return win.focus();
            return self.clients.openWindow('./');
        })
    );
});
