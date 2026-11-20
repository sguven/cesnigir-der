/* Çeşnigir-Der · site ve yönetim panelinin ortak yardımcıları */
(function () {
  'use strict';

  var AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  var GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  // Duyuru türleri: ad -> rozet sınıfı
  var DUYURU_TURLERI = ['Vefat', 'Düğün', 'Nişan', 'Mevlit', 'Toplantı', 'Duyuru', 'Haber'];
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

  function ytFrame(src) {
    return '<iframe src="' + esc(src) + '" title="Köprüköy canlı yayın" loading="lazy" ' +
      'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen ' +
      'referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>';
  }

  function arr(d) {
    var a = Array.isArray(d) ? d : (d && Array.isArray(d.items) ? d.items : []);
    return a.filter(function (x) { return x && typeof x === 'object'; });
  }

  window.CD = {
    AY: AY, AY_KISA: AY_KISA, GUN: GUN,
    DUYURU_TURLERI: DUYURU_TURLERI, ETKINLIK_TURLERI: ETKINLIK_TURLERI, PAZAR_TURLERI: PAZAR_TURLERI,
    slug: slug, badgeClass: badgeClass, esc: esc, pad: pad, normIso: normIso, parts: parts,
    todayIso: todayIso, addDays: addDays, daysBetween: daysBetween, longDate: longDate, relDate: relDate,
    untilText: untilText, imgSrc: imgSrc, linkUrl: linkUrl, telHref: telHref, waHref: waHref, arr: arr,
    ytEmbed: ytEmbed, ytFrame: ytFrame
  };
})();
