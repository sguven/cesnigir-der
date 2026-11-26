/* Çeşnigir-Der · telefon hafızası (service worker)
   Yalnız fotoğrafları (images/…) ve yazı tiplerini telefonda saklar: siteye tekrar girildiğinde bunlar yeniden inmez, sayfa hızlı açılır.
   Sayfalar, duyurular, etkinlikler (data/*.json), app.js ve site.css'e hiç dokunmaz: yeni içerik her zaman olduğu gibi hemen görünür.
   Fotoğraf hafızadan gösterilirken arka planda yenisi de kontrol edilir; değiştiyse bir sonraki açılışta yenisi görünür.
   Kapatmak gerekirse: bu dosyanın içeriğini yalnız şu satırla değiştirin (telefonlar bir sonraki girişte hafızayı siler):
     self.addEventListener('install',function(){self.skipWaiting()});self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.map(function(x){return caches.delete(x)}))}).then(function(){return self.registration.unregister()}))});
*/
var FOTO = 'cd-foto-1', FONT = 'cd-font-1', EN_FAZLA = 200;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== FOTO && k !== FONT; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function kirp(c) {   // en eski fotoğrafları sil: telefonun hafızası dolmasın
  c.keys().then(function (ks) { for (var i = 0; i < ks.length - EN_FAZLA; i++) c.delete(ks[i]); });
}

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  var foto = u.origin === self.location.origin && /^\/images\/.+\.(jpe?g|png|webp|gif)$/i.test(u.pathname);
  var font = u.origin === 'https://fonts.gstatic.com';
  if (!foto && !font) return;
  e.respondWith(caches.open(foto ? FOTO : FONT).then(function (c) {
    return c.match(r).then(function (eski) {
      function al() {
        return fetch(r).then(function (res) {
          if (res && res.ok) { c.put(r, res.clone()); if (foto && !eski) kirp(c); }
          return res;
        });
      }
      if (eski) {
        if (foto) e.waitUntil(al().catch(function () {}));   // yazı tipleri değişmez; fotoğrafı arka planda yokla
        return eski;
      }
      return al();
    });
  }).catch(function () { return fetch(r); }));
});
