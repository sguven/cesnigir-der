/* Çeşnigir-Der · site ve yönetim panelinin ortak yardımcıları */
(function () {
  'use strict';

  var AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  var GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  // Duyuru türleri: ad -> rozet sınıfı
  var DUYURU_TURLERI = ['Vefat', 'Düğün', 'Nişan', 'Mevlit', 'Toplantı', 'Duyuru', 'Haber', 'Tarihten'];
  var ETKINLIK_TURLERI = ['Düğün', 'Nişan', 'Mevlit', 'Toplantı', 'Etkinlik'];
  var PAZAR_TURLERI = ['Satılık', 'Aranıyor', 'Yardım isteği'];

  function slug(s) {
    return String(s || '').toLocaleLowerCase('tr')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function badgeClass(tur) {
    var s = slug(tur);
    if (s === 'yardim-istegi') s = 'yardim';
    return 'badge b-' + s;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // "2026-11-7", "2026-11-07T10:00" -> "2026-11-07"; geçersizse ''
  function normIso(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s == null ? '' : s).trim());
    if (!m) return '';
    var mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    return m[1] + '-' + pad(mo) + '-' + pad(d);
  }

  function parts(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    var dt = new Date(+m[1], +m[2] - 1, +m[3]);
    return { y: +m[1], m: +m[2] - 1, d: +m[3], wd: dt.getDay(), date: dt };
  }

  function todayIso() {
    var t = new Date();
    return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }

  function addDays(iso, n) {
    var p = parts(iso); if (!p) return iso;
    var d = new Date(p.y, p.m, p.d + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function daysBetween(a, b) {
    var pa = parts(a), pb = parts(b);
    if (!pa || !pb) return 0;
    return Math.round((pb.date - pa.date) / 86400000);
  }

  // "25 Eylül 2026"
  function longDate(iso, withDay) {
    var p = parts(normIso(iso));
    if (!p) return '';
    return p.d + ' ' + AY[p.m] + ' ' + p.y + (withDay ? ', ' + GUN[p.wd] : '');
  }

  // "Bugün", "Dün", "3 gün önce", yoksa tarih
  function relDate(iso) {
    iso = normIso(iso);
    if (!iso) return '';
    var n = daysBetween(iso, todayIso());
    if (n === 0) return 'Bugün';
    if (n === 1) return 'Dün';
    if (n > 1 && n < 7) return n + ' gün önce';
    return longDate(iso);
  }

  // "Bugün", "Yarın", "5 gün sonra"
  function untilText(iso) {
    var n = daysBetween(todayIso(), iso);
    if (n === 0) return 'Bugün';
    if (n === 1) return 'Yarın';
    if (n > 1 && n < 30) return n + ' gün sonra';
    return '';
  }

  // Fotoğraf yolu: images/x.jpg, /images/x.jpg veya https://...
  function imgSrc(p, base) {
    p = String(p == null ? '' : p).trim();
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(p) || p.indexOf('//') === 0) return '';
    return (base || '') + p.replace(/^\/+/, '');
  }

  function linkUrl(u) {
    u = String(u == null ? '' : u).trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }

  // Telefonu arama bağlantısına çevir: 0555 123 45 67 -> +905551234567
  function telHref(t) {
    var d = String(t || '').replace(/[^\d+]/g, '');
    if (!d) return '';
    if (d.indexOf('+') === 0) return d.length >= 8 ? d : '';
    if (d.indexOf('00') === 0) return '+' + d.slice(2);
    if (d.indexOf('0') === 0 && d.length === 11) return '+90' + d.slice(1);
    if (d.length === 10 && d.charAt(0) === '5') return '+90' + d;
    return d.length >= 7 ? d : '';
  }

  function waHref(t, text) {
    var d = telHref(t).replace('+', '');
    if (!d) return '';
    return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  // YouTube adresinden gömülü oynatıcı adresi üretir.
  // Desteklenen: watch?v=, youtu.be/, /live/, /embed/, /shorts/, kanal canlı yayını (/channel/UC.../live)
  function ytEmbed(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    var url;
    try { url = new URL(u); } catch (e) { return ''; }
    var host = url.hostname.replace(/^(www\.|m\.)/, '');
    var id = '', ch = '';
    if (host === 'youtu.be') id = url.pathname.split('/')[1] || '';
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      var p = url.pathname.split('/').filter(Boolean);
      if (p[0] === 'watch') id = url.searchParams.get('v') || '';
      else if (p[0] === 'live' || p[0] === 'embed' || p[0] === 'shorts') {
        if (p[1] === 'live_stream') ch = url.searchParams.get('channel') || '';
        else id = p[1] || '';
      } else if (p[0] === 'channel' && /^UC[\w-]{20,}$/.test(p[1] || '')) ch = p[1];
    }
    var q = 'autoplay=1&mute=1&playsinline=1&rel=0';
    if (/^[\w-]{6,20}$/.test(id)) return 'https://www.youtube.com/embed/' + id + '?' + q;
    if (/^UC[\w-]{20,}$/.test(ch)) return 'https://www.youtube.com/embed/live_stream?channel=' + ch + '&' + q;
    return '';
  }

  /* Fotoğrafla paylaşma: telefonda [data-share-photo] taşıyan paylaş düğmesi, telefonun paylaşım ekranını fotoğraf ve yazıyla açar
     (oradan WhatsApp seçilir). Telefon desteklemiyorsa ya da bir şey ters giderse düğmenin kendi WhatsApp bağlantısı açılır. */
  var shareFiles = {};
  function warmShare(src) {
    if (!shareFiles[src]) shareFiles[src] = fetch(src).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
      .then(function (b) { return new File([b], 'etkinlik.jpg', { type: b.type || 'image/jpeg' }); });
    shareFiles[src].catch(function () { delete shareFiles[src]; });
    return shareFiles[src];
  }
  /* iPhone/iPad (Safari ve iOS'taki tüm tarayıcılar): paylaşım ekranına fotoğraf ve yazı birlikte verilince fotoğraf düşüyor
     (WebKit hatası 251500), WhatsApp'a yalnız yazı gidiyor. Bu yüzden iOS'ta düğmenin kendi WhatsApp bağlantısı açılır:
     WhatsApp bağlantının önizlemesini (kaydın fotoğrafı, başlığı) paylaşım sayfasından alıp mesajda gösterir. */
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function bindShare() {
    if (!navigator.share || !navigator.canShare || !window.File || !matchMedia('(pointer: coarse)').matches || isIOS()) return;
    var warm = function (e) { var a = e.target.closest && e.target.closest('[data-share-photo]'); if (a) warmShare(a.getAttribute('data-share-photo')); };
    document.addEventListener('touchstart', warm, { passive: true });
    document.addEventListener('pointerdown', warm, { passive: true });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-share-photo]');
      if (!a) return;
      var href = a.href;
      e.preventDefault();
      warmShare(a.getAttribute('data-share-photo')).then(function (file) {
        var d = { files: [file], text: a.getAttribute('data-share-text') || '' };
        if (!navigator.canShare(d)) throw 0;
        return navigator.share(d);
      }).catch(function (er) {
        if (er && er.name === 'AbortError') return;   // paylaşım ekranı kapatıldı
        location.href = href;
      });
    });
  }

  function ytFrame(src) {
    return '<iframe src="' + esc(src) + '" title="Köprüköy canlı yayın" loading="lazy" ' +
      'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen ' +
      'referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>';
  }

  /* Paylaşım sayfaları: fotoğrafı olan her duyuru, etkinlik ve ilan için p/ klasöründe küçük bir sayfa tutulur
     (p/e-…html, p/d-…html, p/i-…html). WhatsApp ve Facebook bağlantının önizlemesini bu sayfadan okur; böylece paylaşımda
     o kaydın kendi fotoğrafı ve başlığı çıkar. Sayfayı açan kişi doğrudan sitedeki kayda yönlenir.
     Sayfaları yönetim paneli kaydederken, araclar/paylasim-sayfalari.js ise topluca üretir. */
  var SHARE_COLS = { duyurular: 'd', etkinlikler: 'e', pazar: 'i' };
  function shareId(key, x) {
    var t = key === 'e' ? x.ad : x.baslik;
    return (normIso(x.tarih) || 'x') + '-' + (slug(t).slice(0, 50) || { d: 'duyuru', e: 'etkinlik', i: 'ilan' }[key]);
  }
  function sharePath(key, id) { return 'p/' + key + '-' + id + '.html'; }
  function shareVer(src) {
    var h = 0, t = String(src || '').split('/').pop();
    for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return h.toString(36).slice(0, 6);
  }
  function shareShort(t, n) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
  }
  // base: sitenin tam adresi, sonunda / ile (https://…/cesnigir-der/). Fotoğrafı olmayan kayıt için null döner.
  function sharePage(key, x, base) {
    var foto = imgSrc(x.foto, base);
    if (!foto) return null;
    var id = shareId(key, x), tur = x.tur ? String(x.tur).toLocaleUpperCase('tr') + ': ' : '';
    var title = tur + (key === 'e' ? x.ad : x.baslik || ''), det;
    if (key === 'e') det = [longDate(x.tarih, true), x.saat, x.yer].filter(Boolean).join(' · ');
    else if (key === 'i') det = [x.fiyat ? x.fiyat + ' ₺' : '', shareShort(x.aciklama, 150)].filter(Boolean).join(' · ');
    else det = shareShort(x.metin, 180);
    var to = '../?' + key + '=' + encodeURIComponent(id);
    return { path: sharePath(key, id), html: '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex">\n' +
      '<title>' + esc(title) + ' · Çeşnigir-Der</title>\n' +
      '<meta property="og:title" content="' + esc(title) + '">\n' +
      '<meta property="og:description" content="' + esc(det || 'Çeşnigir-Der · Köprüköy') + '">\n' +
      '<meta property="og:type" content="article">\n<meta property="og:site_name" content="Çeşnigir-Der">\n' +
      '<meta property="og:image" content="' + esc(foto) + '">\n<meta name="twitter:card" content="summary_large_image">\n' +
      '<script>location.replace(' + JSON.stringify(to).replace(/</g, '\\u003c') + ');</script>\n</head>\n' +
      '<body style="font-family:sans-serif;padding:24px;font-size:20px">\n<p><a href="' + esc(to) + '">' + esc(title) + '</a></p>\n</body>\n</html>\n' };
  }

  /* Kısa paylaşım bağlantısı: cesnigirder.org/d/k3f9xa gibi. Her duyuru (d), etkinlik (e) ve ilan (i) için 6 harflik bir kod,
     kodun dosyası (d/k3f9xa.html) önizleme bilgisini (başlık, açıklama, fotoğraf) taşır ve açanı doğrudan o kayda götürür.
     Kod, kaydın adresinden ve fotoğrafının adından hesaplanır: fotoğraf değişince kod da değişir, WhatsApp/Facebook eski önizlemeyi göstermez.
     Dosyayı yönetim paneli kaydederken, araclar/site-sayfalari.js ise topluca yazar; dosyası henüz yazılmamış kodu 404.html kayda çevirir. */
  function shortCode(key, id, photo) {
    var s = key + ':' + id + '|' + String(photo || '').split('/').pop(), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    var c = (h % 2176782336).toString(36);               // 36^6: her zaman 6 haneye sığar
    return ('000000' + c).slice(-6);
  }
  function shortPath(key, x) { return key + '/' + shortCode(key, shareId(key, x), x.foto) + '.html'; }
  // base: sitenin tam adresi, sonunda / ile. Fotoğrafı olmayan kayıtta önizlemede sitenin kapak fotoğrafı çıkar.
  function shortPage(key, x, base) {
    var id = shareId(key, x), tur = x.tur ? String(x.tur).toLocaleUpperCase('tr') + ': ' : '';
    var title = tur + (key === 'e' ? x.ad : x.baslik || ''), det;
    if (key === 'e') det = [longDate(x.tarih, true), x.saat, x.yer].filter(Boolean).join(' · ');
    else if (key === 'i') det = [x.fiyat ? x.fiyat + ' ₺' : '', shareShort(x.aciklama, 150)].filter(Boolean).join(' · ');
    else det = shareShort(x.metin, 180);
    // kapak.jpg 350 KB; WhatsApp ~300 KB üstünü önizlemede göstermediği için küçük kopyası kullanılır
    var foto = imgSrc(x.foto, base) || base + 'images/kapak-paylasim.jpg', to = '../?' + key + '=' + encodeURIComponent(id);
    return { path: shortPath(key, x), html: '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex">\n' +
      '<title>' + esc(title) + ' · Çeşnigir-Der</title>\n' +
      '<meta property="og:title" content="' + esc(title) + '">\n' +
      '<meta property="og:description" content="' + esc(det || 'Çeşnigir-Der · Köprüköy') + '">\n' +
      '<meta property="og:type" content="article">\n<meta property="og:site_name" content="Çeşnigir-Der">\n' +
      '<meta property="og:image" content="' + esc(foto) + '">\n<meta name="twitter:card" content="summary_large_image">\n' +
      '<script>location.replace(' + JSON.stringify(to).replace(/</g, '\\u003c') + ');</script>\n</head>\n' +
      '<body style="font-family:sans-serif;padding:24px;font-size:20px">\n<p><a href="' + esc(to) + '">' + esc(title) + '</a></p>\n</body>\n</html>\n' };
  }

  function arr(d) {
    var a = Array.isArray(d) ? d : (d && Array.isArray(d.items) ? d.items : []);
    return a.filter(function (x) { return x && typeof x === 'object'; });
  }

  (typeof window !== 'undefined' ? window : globalThis).CD = {
    AY: AY, AY_KISA: AY_KISA, GUN: GUN,
    DUYURU_TURLERI: DUYURU_TURLERI, ETKINLIK_TURLERI: ETKINLIK_TURLERI, PAZAR_TURLERI: PAZAR_TURLERI,
    slug: slug, badgeClass: badgeClass, esc: esc, pad: pad, normIso: normIso, parts: parts,
    todayIso: todayIso, addDays: addDays, daysBetween: daysBetween, longDate: longDate, relDate: relDate,
    SHARE_COLS: SHARE_COLS, shareId: shareId, sharePath: sharePath, shareVer: shareVer, sharePage: sharePage,
    shortCode: shortCode, shortPath: shortPath, shortPage: shortPage,
    untilText: untilText, imgSrc: imgSrc, linkUrl: linkUrl, telHref: telHref, waHref: waHref, arr: arr,
    ytEmbed: ytEmbed, ytFrame: ytFrame, bindShare: bindShare, warmShare: warmShare
  };
})();
