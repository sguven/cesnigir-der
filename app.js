/* Çeşnigir-Der · Tasarım 3
   Sayfalar: Ana Sayfa, Duyurular (ve ayrıntı), Etkinlikler, Köy Meydanı (forum), Fotoğraflar, Market, Hakkımızda, İletişim.
   İçerik data/ klasöründen okunur; yönetim panelinden değişir. */

/* Ziyaretçi sayacı (GoatCounter): istatistikler https://cesnifirder.goatcounter.com
   Yalnız gerçek adreste (cesnigirder.org) sayar; bilgisayarda denerken saymaz. Panel (yonetim/) sayılmaz. */
(function () {
  if (!/(^|\.)cesnigirder\.org$/.test(location.hostname) || window.CD_EDIT) return;
  // Site sayfaları #/duyuru/… gibi adreslerle açılıyor; sayaçta her kayıt ayrı görünsün
  function yol() { return location.pathname + (location.hash.indexOf('#/') === 0 ? location.hash : ''); }
  // Kısa paylaşım bağlantısından (/d/…, /e/…, /i/…) gelen ziyareti ayrıca belirt
  var kaynak = /\/\/(www\.)?cesnigirder\.org\/[dei]\//.test(document.referrer) ? 'Paylaşılan bağlantı (WhatsApp/Facebook)' : undefined;
  window.goatcounter = { path: yol, referrer: kaynak };
  var son = yol();
  window.addEventListener('hashchange', function () {
    var p = yol();
    if (p === son || !window.goatcounter.count) return;
    son = p;
    window.goatcounter.count({ path: p, referrer: location.origin + '/' });
  });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', 'https://cesnifirder.goatcounter.com/count');
  document.head.appendChild(s);
})();

(function () {
  'use strict';
  var C = window.CD, esc = C.esc;
  // B: sitenin köküne giden yol. Ana adreste boş; arama motorları için üretilen sayfalarda (hakkimizda/, p/…html) '../'.
  var B = window.CD_BASE || '';
  var MAP = 'https://maps.app.goo.gl/WZUFDn7iB7aiHGTf8';
  var data = null;
  // Düzenleme modu (yonetim/): yonetim/duzen.js bu nesneyi tanımlar; ziyaretçi sitesinde yoktur
  var E = window.CD_EDIT || null;
  var main = document.getElementById('icerik');
  var pos = {}, curHash = location.hash, tapped = false;   // sayfaların kaydırma yeri (geri dönünce kaldığı yerden)

  function $(id) { return document.getElementById(id); }
  function icon(n) { return '<svg aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function img(p) { return E ? E.img(p) : C.imgSrc(p, B); }
  function load(name, fb) {
    if (E) return E.load(name, fb);
    return fetch(B + 'data/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return fb; });
  }
  function byDate(list, dir) {
    return list.slice().sort(function (a, b) {
      var x = C.normIso(a.tarih), y = C.normIso(b.tarih);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }
  function pid(p) { return C.shareId('d', p); }
  function isTarih(p) { return p.tur === 'Tarihten'; }
  // Tarihten yazılarda öne çıkan tarih olayın tarihidir; yayın tarihi ikinci planda kalır
  function dateSpan(p, uzun) {
    return isTarih(p) && p.olay_tarihi ? '<span class="olay">' + esc(p.olay_tarihi) + '</span>' : '<span>' + esc(C.longDate(p.tarih, uzun)) + '</span>';
  }
  function excerpt(t, n) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
  }
  function band(title, sub) {
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › ' + esc(title) + '</div>' +
      '<h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div></div>';
  }
  /* Başkan ve yardımcısı: alt alta, her ismin yanında aranabilir numarası. rows: <li> satırları (unvanlı), people: yalnız isimler */
  function person(ad, no) {
    var tel = C.telHref(no);
    return '<div class="kisi"><b>' + esc(ad || '') + '</b>' +
      (no ? (tel ? '<a href="tel:' + esc(tel) + '">' + esc(no) + '</a>' : '<span>' + esc(no) + '</span>') : '') + '</div>';
  }
  // noTel: yalnız isimler (Hakkımızda); İletişim'de numaralarıyla
  function peopleRows(d, noTel) {
    return (d.baskan ? '<li><span>Dernek Başkanı</span>' + person(d.baskan, noTel ? '' : d.telefon) + '</li>' : (!noTel && d.telefon ? '<li><span>Dernek Başkanı</span>' + person('', d.telefon) + '</li>' : '')) +
      (d.baskan2 ? '<li><span>Başkan Yardımcısı</span>' + person(d.baskan2, noTel ? '' : d.telefon2) + '</li>' : (!noTel && d.telefon2 ? '<li><span>Başkan Yardımcısı</span>' + person('', d.telefon2) + '</li>' : ''));
  }
  function people(d) {
    return ((d.baskan || d.telefon) ? person(d.baskan, d.telefon) : '') + ((d.baskan2 || d.telefon2) ? person(d.baskan2, d.telefon2) : '');
  }
  // Düzenleme modunda kaydın hangi listede kaçıncı olduğunu işaretler (düzenle / sil düğmeleri için)
  function ek(col, i) { return E && i >= 0 ? ' data-ek="' + col + '" data-ix="' + i + '"' : ''; }
  function ed(what) { return E ? ' data-ed="' + what + '"' : ''; }
  /* ---------- parçalar ---------- */
  function newsCard(p) {
    var src = img(p.foto);
    return '<a class="news' + (isTarih(p) ? ' tarih' : '') + '" href="#/duyuru/' + esc(pid(p)) + '" data-yc="duyuru:' + esc(pid(p)) + '"' + ek('duyurular', data.duyurular.indexOf(p)) + '>' +
      '<div class="news-img' + (src ? '' : ' noimg') + '">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<img class="ph" src="' + B + 'images/logo-160.png" alt="">') + '</div>' +
      '<div class="news-body"><div class="news-meta">' + (p.tur ? '<span class="' + C.badgeClass(p.tur) + '">' + esc(p.tur) + '</span>' : '') +
      dateSpan(p) + '</div>' +
      '<h3>' + esc(p.baslik) + '</h3>' + (p.metin ? '<p>' + esc(excerpt(p.metin, 150)) + '</p>' : '') +
      '<span class="read">Devamını oku ›</span></div></a>';
  }

  function upcoming(days) {
    var today = C.todayIso(), end = C.addDays(today, days), out = [];
    data.etkinlikler.forEach(function (e, ix) {
      var iso = C.normIso(e.tarih);
      if (iso && iso >= today) out.push({ iso: iso, ad: e.ad, tur: e.tur, saat: e.saat, yer: e.yer, foto: e.foto, id: eid(e), koy: true, ix: ix });
    });
    (data.resmi.tarihli || []).forEach(function (e) {
      var iso = C.normIso(e.tarih);
      if (iso && iso >= today && iso <= end) out.push({ iso: iso, ad: e.ad, koy: false });
    });
    var y0 = +today.slice(0, 4);
    [y0, y0 + 1].forEach(function (y) {
      (data.resmi.sabit || []).forEach(function (e) {
        var iso = y + '-' + C.pad(+e.ay) + '-' + C.pad(+e.gun);
        if (iso >= today && iso <= end) out.push({ iso: iso, ad: e.ad, koy: false });
      });
    });
    return out.sort(function (a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : (a.koy ? -1 : 1); });
  }


  // Etkinliğin kendi adresi: #/etkinlik/2026-11-29-ali-ayse
  function eid(e) { return (C.normIso(e.tarih) || 'x') + '-' + (C.slug(e.ad).slice(0, 50) || 'etkinlik'); }
  function iid(x) { return (C.normIso(x.tarih) || 'x') + '-' + (C.slug(x.baslik).slice(0, 50) || 'ilan'); }
  function upper(t) { return String(t || '').toLocaleUpperCase('tr'); }

  /* Paylaşım: WhatsApp ve Facebook düğmeleri. Bağlantı doğrudan o etkinliğe, ilana ya da duyuruya gider (…/?e=…, ?i=…, ?d=…:
     Facebook # işaretinden sonrasını attığı için soru işaretli adres kullanılır; sayfa açılınca openShared() ilgili sayfaya geçer).
     o: { key: 'e'|'i'|'d', id, tur, title, det, photo }  ·  big: ayrıntı sayfasındaki büyük düğmeler */
  // Kısa bağlantı (…/d/k3f9xa): kodu kaydın adresinden ve fotoğrafından hesaplanır (bkz. ortak.js shortCode)
  function shareUrl(o) {
    var base = new URL(B || './', location.href.split(/[?#]/)[0]).href;
    return base + o.key + '/' + C.shortCode(o.key, o.id, o.photo);
  }
  function shareButtons(o, big) {
    var url = shareUrl(o), text = (o.tur ? upper(o.tur) + ': ' : '') + (o.title || '') + (o.det ? '\n' + o.det : '') + '\n' + url;
    var wa = '<a class="' + (big ? 'btn btn-green' : 's-wa') + '" href="https://wa.me/?text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener"' +
      (o.photo ? ' data-share-photo="' + esc(o.photo) + '" data-share-text="' + esc(text) + '"' : '') + '>' + icon('wa') + (big ? 'WhatsApp\'ta paylaş' : 'WhatsApp') + '</a>';
    var fb = '<a class="' + (big ? 'btn btn-fb' : 's-fb') + '" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">' +
      icon('fb') + (big ? 'Facebook\'ta paylaş' : 'Facebook') + '</a>';
    return big ? wa + fb : '<div class="share"><span>Paylaş:</span>' + wa + fb + '</div>';
  }
  function evShare(e, det) { return { key: 'e', id: e.id, tur: e.tur, title: e.ad, det: C.longDate(e.iso, true) + (det ? ' · ' + det : ''), photo: img(e.foto) }; }
  // Köy etkinliğinin fotoğrafı ve paylaş düğmeleri (resmî günlerde yok)
  function evExtras(e, det) {
    if (!e.koy) return '';
    var src = img(e.foto);
    return (src ? '<button type="button" class="ev-photo" data-photo="' + esc(src) + '" data-cap="' + esc(e.ad) + '" aria-label="Fotoğrafı büyüt">' +
      '<img src="' + esc(src) + '" alt="' + esc(e.ad) + '" loading="lazy"></button>' : '') + shareButtons(evShare(e, det));
  }

  function evRow(e) {
    var p = C.parts(e.iso), until = C.untilText(e.iso), det = [e.saat, e.yer].filter(Boolean).join(' · ');
    return '<div class="ev' + (e.koy ? ' koy' : ' official') + '"' + (e.koy ? ek('etkinlikler', e.ix) + ' data-yc="etkinlik:' + esc(e.id) + '"' : '') + '><div class="ev-date" aria-hidden="true"><span>' + C.AY_KISA[p.m] + '</span><b>' + p.d +
      '</b><small>' + C.GUN[p.wd] + '</small></div><div class="ev-info">' + (until ? '<div class="ev-when">' + esc(until) + '</div>' : '') +
      (e.tur ? '<span class="' + C.badgeClass(e.tur) + '">' + esc(e.tur) + '</span> ' : '') +
      (e.koy ? '<a class="ev-link" href="#/etkinlik/' + esc(e.id) + '"><b>' + esc(e.ad) + '</b></a>' : '<b>' + esc(e.ad) + '</b>') +
      '<div class="muted">' + esc(C.longDate(e.iso, true)) + (det ? ' · ' + esc(det) : '') + '</div>' + evExtras(e, det) + '</div></div>';
  }

  function galleryGrid(list, cls) {
    return '<div class="gal ' + (cls || '') + '"' + ed('galeri') + '>' + list.map(function (x) {
      var i = data.galeri.indexOf(x);
      return '<button type="button" data-gal="' + i + '" data-yc="foto:' + esc(fKey(x)) + '" aria-label="Fotoğrafı büyüt: ' + esc(x.aciklama) + '"><img src="' + esc(img(x.foto)) + '" alt="' + esc((x.aciklama || 'Fotoğraf') + ' Köprüköy, Keskin (Kırıkkale).') + '" loading="lazy"></button>';
    }).join('') + '</div>';
  }

  /* ---------- ana sayfa takvimi ----------
     Ay görünümü: köy etkinliği olan günler bordo, resmî ve dinî günler altın çerçeveli. Renkli güne dokununca
     o günün ayrıntısı takvimin altında açılır (evRow: saat, yer, fotoğraf, paylaş düğmeleri). */
  /* ---------- Köprüköy hava durumu ----------
     Open-Meteo (ücretsiz, anahtarsız): şu anki hava ve önümüzdeki günler. Ana sayfanın sağ sütununda, takvimin üstünde.
     Sonuç 20 dakika tarayıcıda saklanır; alınamazsa kutu görünmez. */
  var WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=39.5765&longitude=33.4357' +
    '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FIstanbul&forecast_days=5';
  var WX_KEY = 'cesnigir_hava', wx = null, wxFail = false, wxLoading = false;
  function wxKind(c, day) {
    if (c <= 1) return day === 0 ? 'moon' : 'sun';
    if (c === 2) return 'part';
    if (c === 3) return 'cloud';
    if (c === 45 || c === 48) return 'fog';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if (c >= 95) return 'storm';
    return 'rain';
  }
  var WX_TEXT = { 0: 'Açık', 1: 'Çoğunlukla açık', 2: 'Parçalı bulutlu', 3: 'Kapalı', 45: 'Sisli', 48: 'Kırağılı sis',
    51: 'Hafif çisenti', 53: 'Çisenti', 55: 'Yoğun çisenti', 56: 'Donan çisenti', 57: 'Donan çisenti',
    61: 'Hafif yağmurlu', 63: 'Yağmurlu', 65: 'Kuvvetli yağmur', 66: 'Donan yağmur', 67: 'Donan yağmur',
    71: 'Hafif kar yağışlı', 73: 'Kar yağışlı', 75: 'Yoğun kar', 77: 'Kar taneleri',
    80: 'Hafif sağanak', 81: 'Sağanak yağışlı', 82: 'Kuvvetli sağanak', 85: 'Kar sağanağı', 86: 'Yoğun kar sağanağı',
    95: 'Gök gürültülü fırtına', 96: 'Dolulu fırtına', 99: 'Dolulu fırtına' };
  function wxIcon(k, big) {
    var sun = '<circle cx="24" cy="24" r="8" fill="#E9A21B"/><g stroke="#E9A21B" stroke-width="3" stroke-linecap="round"><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"/></g>';
    var cloud = function (x, y, f) { return '<path transform="translate(' + x + ' ' + y + ')" d="M12 34h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2A9 9 0 0 0 12 34Z" fill="' + f + '" stroke="#8A7E72" stroke-width="2"/>'; };
    var drops = '<g stroke="#2C6FB7" stroke-width="3" stroke-linecap="round"><path d="M17 38l-2 5M25 38l-2 5M33 38l-2 5"/></g>';
    var g = {
      sun: sun,
      moon: '<path d="M30 8a15 15 0 1 0 10 25A13 13 0 0 1 30 8Z" fill="#C9B26B"/>',
      part: '<g transform="translate(-6 -6) scale(.8)">' + sun + '</g>' + cloud(2, 2, '#fff'),
      cloud: cloud(0, -2, '#E7E1D8'),
      fog: cloud(0, -6, '#E7E1D8') + '<g stroke="#8A7E72" stroke-width="3" stroke-linecap="round"><path d="M10 36h28M14 42h22"/></g>',
      rain: cloud(0, -6, '#DCE3EA') + drops,
      snow: cloud(0, -6, '#EEF2F6') + '<g fill="#5B8CC9"><circle cx="16" cy="40" r="2.4"/><circle cx="24" cy="43" r="2.4"/><circle cx="32" cy="40" r="2.4"/></g>',
      storm: cloud(0, -6, '#C9CDD3') + '<path d="M25 30l-6 9h6l-3 8 9-11h-6l3-6Z" fill="#E9A21B"/>'
    };
    return '<svg class="wx-ic' + (big ? ' big' : '') + '" viewBox="0 0 48 48" aria-hidden="true">' + (g[k] || g.cloud) + '</svg>';
  }
  function wxBox() {
    if (wxFail) return '';
    if (!wx) return '<div class="box wx" id="wxBox"><div class="wx-load">Köprüköy\'de hava durumu yükleniyor…</div></div>';
    var c = wx.current || {}, d = wx.daily || {}, code = +c.weather_code, days = '';
    (d.time || []).slice(0, 5).forEach(function (t, i) {
      var p = C.parts(t), rain = d.precipitation_probability_max && d.precipitation_probability_max[i];
      days += '<li><span class="wx-day">' + (i === 0 ? 'Bugün' : C.GUN[p.wd].slice(0, 3)) + '</span>' + wxIcon(wxKind(+d.weather_code[i], 1)) +
        '<span class="wx-mm"><b>' + Math.round(d.temperature_2m_max[i]) + '°</b> ' + Math.round(d.temperature_2m_min[i]) + '°</span>' +
        (rain >= 20 ? '<span class="wx-rain">%' + rain + '</span>' : '<span class="wx-rain"></span>') + '</li>';
    });
    var t = new Date(wx.at || Date.now());
    return '<div class="box wx" id="wxBox"><div class="wx-now">' + wxIcon(wxKind(code, c.is_day), true) +
      '<div class="wx-main"><span class="wx-place">Köprüköy\'de hava</span><b class="wx-t">' + Math.round(c.temperature_2m) + '°</b>' +
      '<span class="wx-desc">' + esc(WX_TEXT[code] || '') + '</span></div></div>' +
      '<p class="wx-more">Hissedilen ' + Math.round(c.apparent_temperature) + '° · Rüzgâr ' + Math.round(c.wind_speed_10m) + ' km/sa · Nem %' + Math.round(c.relative_humidity_2m) + '</p>' +
      '<ul class="wx-days" aria-label="Önümüzdeki günler">' + days + '</ul>' +
      '<p class="wx-src">Güncelleme ' + C.pad(t.getHours()) + ':' + C.pad(t.getMinutes()) + ' · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></p></div>';
  }
  function loadWeather() {
    if (wxLoading) return;
    try { var c = JSON.parse(localStorage.getItem(WX_KEY) || 'null'); if (c && c.at && Date.now() - c.at < 20 * 60000 && c.current) { wx = c; return; } } catch (e) { /* yok say */ }
    wxLoading = true;
    fetch(WX_URL).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      if (!j || !j.current || !j.daily) throw 0;
      j.at = Date.now(); wx = j; wxFail = false;
      try { localStorage.setItem(WX_KEY, JSON.stringify(j)); } catch (e) { /* yok say */ }
    }).catch(function () { if (!wx) wxFail = true; }).then(function () {
      wxLoading = false;
      var el = $('wxBox'); if (el) { var h = wxBox(); if (h) el.outerHTML = h; else el.remove(); }
    });
  }
  // sayfa uzun süre açık kalırsa (telefon ana ekranında) geri gelince hava yenilenir
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && wx && Date.now() - wx.at > 20 * 60000 && $('wxBox')) { try { localStorage.removeItem(WX_KEY); } catch (e) { /* yok say */ } loadWeather(); }
  });

  var calY = null, calM = null, calSel = '';
  function dayItems(iso) {
    var p = C.parts(iso), out = [];
    data.etkinlikler.forEach(function (e, ix) {
      if (C.normIso(e.tarih) === iso) out.push({ iso: iso, ad: e.ad, tur: e.tur, saat: e.saat, yer: e.yer, foto: e.foto, id: eid(e), koy: true, ix: ix });
    });
    (data.resmi.tarihli || []).forEach(function (e) { if (C.normIso(e.tarih) === iso) out.push({ iso: iso, ad: e.ad, koy: false }); });
    (data.resmi.sabit || []).forEach(function (e) { if (+e.ay === p.m + 1 && +e.gun === p.d) out.push({ iso: iso, ad: e.ad, koy: false }); });
    return out;
  }
  function calendar() {
    var today = C.todayIso(), t = C.parts(today);
    if (calY === null) { calY = t.y; calM = t.m; }
    var n = new Date(calY, calM + 1, 0).getDate(), lead = (new Date(calY, calM, 1).getDay() + 6) % 7;   // hafta pazartesi başlar
    var h = '<div class="box cal" id="homeCal"><div class="cal-head">' +
      '<button type="button" class="cal-nav" data-cal-nav="-1" aria-label="Önceki ay">‹</button>' +
      '<b aria-live="polite">' + C.AY[calM] + ' ' + calY + '</b>' +
      '<button type="button" class="cal-nav" data-cal-nav="1" aria-label="Sonraki ay">›</button></div><div class="cal-grid">';
    ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach(function (g) { h += '<span class="cal-wd" aria-hidden="true">' + g + '</span>'; });
    for (var i = 0; i < lead; i++) h += '<span></span>';
    for (var d = 1; d <= n; d++) {
      var iso = calY + '-' + C.pad(calM + 1) + '-' + C.pad(d), it = dayItems(iso), cls = 'cal-day' + (iso === today ? ' today' : '');
      if (!it.length) { h += '<span class="' + cls + '">' + d + '</span>'; continue; }
      cls += (it.some(function (x) { return x.koy; }) ? ' koy' : ' resmi') + (iso === calSel ? ' sel' : '');
      h += '<button type="button" class="' + cls + '" data-cal-day="' + iso + '" aria-pressed="' + (iso === calSel) + '" aria-label="' +
        esc(C.longDate(iso, true) + ': ' + it.map(function (x) { return x.ad; }).join(', ')) + '">' + d + '</button>';
    }
    h += '</div><div class="cal-legend"><span><i class="koy"></i>Köy etkinliği</span><span><i class="resmi"></i>Resmî, dinî gün</span></div>';
    var sel = calSel ? dayItems(calSel) : [];
    h += '<div class="cal-detail" aria-live="polite">' + (sel.length ? '<h3>' + esc(C.longDate(calSel, true)) + '</h3>' + sel.map(evRow).join('')
      : '<p class="muted">Renkli bir güne dokunun, o günün ayrıntısı burada açılır.</p>') + '</div></div>';
    return h;
  }
  function redrawCal(focusSel) {
    var el = $('homeCal'); if (!el) return;
    el.outerHTML = calendar();
    var f = $('homeCal').querySelector(focusSel); if (f) f.focus();
  }

  /* ---------- sayfalar ---------- */
  function pageHome() {
    var d = data.dernek, news = data.duyurular.slice(0, 4), ev = upcoming(45).slice(0, 4);
    // Canlı görüntü: karşılama bandının sağında küçük oynar; dokununca aynı oynatıcı ekranı kaplayacak kadar büyür
    // (oynatıcı yeniden yüklenmez, yalnızca boyutu değişir). Kapat, karanlık alana dokunmak ya da Esc eski hâline döndürür.
    var live = C.ytEmbed(d.canli_yayin), liveBox = live ? '<div class="live-mini" id="liveBox"' + ed('dernek:canli') + '>' +
      '<div class="live-label"><span class="live-dot" aria-hidden="true"></span>Köyden Canlı Görüntü' +
      (d.canli_not ? ' <span class="live-soon">' + esc(d.canli_not) + '</span>' : '') + '</div>' +
      '<div class="live-frame">' + C.ytFrame(live) +
      '<button type="button" class="live-open" id="liveOpen" aria-label="Görüntüyü büyüt">' + (d.canli_not ? '' : '<span class="live-tag">CANLI</span>') + '<span class="live-zoom">⤢ Büyüt</span></button>' +
      '<button type="button" class="live-close" id="liveClose" hidden>✕ Kapat</button></div></div>' : '';
    var h = '<section class="hero"><img src="' + B + 'images/kapak.jpg?v=2" width="1926" height="817" decoding="async" alt="Gün batımında Çeşnigir Köprüsü ve Türk bayrağı, üzerinde Çeşnigir-Der yazısı."></section>' +
      '<div class="welcome"><div class="container welcome-in" style="padding:22px 18px"><div><h1>Köprüköy\'e hoş geldiniz</h1>' +
      '<p>Köyümüzden duyurular, vefat ve düğün haberleri, etkinlikler ve fotoğraflar.</p></div>' + (liveBox || (E ? '<div' + ed('dernek:canli') + '></div>' : '')) + '</div></div>';

    h += '<section class="section"><div class="container grid-main"><div>' +
      '<div class="sec-head"' + ed('ekle:duyurular') + '><h2>Son Duyurular</h2><a href="#/duyurular">Tüm duyurular ›</a></div>' +
      (news.length ? '<div class="news-list">' + news.map(newsCard).join('') + '</div>' : '<div class="box empty"><b>Henüz duyuru yok</b></div>') +
      '<div class="box m-cta"><div><h3>Köy Meydanı</h3><p>Hatıranızı, sorunuzu, gurbetten selamınızı paylaşın; köylülerimizle sohbet edin.</p></div>' +
      '<a class="btn" href="#/meydan">' + icon('chat') + 'Köy Meydanı\'na git</a></div>' +
      '</div><aside>' + wxBox() +
      '<div class="sec-head"' + ed('ekle:etkinlikler') + '><h2>Yaklaşan Günler</h2></div>' + calendar() +
      '<div class="box" style="margin-top:14px">' + (ev.length ? ev.map(evRow).join('') : '<div class="empty">Yaklaşan bir gün yok.</div>') + '</div>' +
      '<p style="margin:10px 0 0"><a href="#/etkinlikler" style="font-weight:700">Tüm takvim ›</a></p>' +
      '</aside></div></section>';

    var g = data.galeri.slice(0, 6);
    if (g.length || E) h += '<section class="section alt"><div class="container"><div class="sec-head"' + ed('ekle:galeri') + '><h2>Fotoğraflardan</h2><a href="#/fotograflar">Tüm fotoğraflar (' + data.galeri.length + ') ›</a></div>' +
      galleryGrid(g, 'strip') + '</div></section>';

    h += '<section class="section"><div class="container village"><img src="' + B + 'images/koprukoy-gol.jpg" alt="Göl kıyısından Köprüköy ve Çeşnigir Köprüsü." loading="lazy">' +
      '<div><div class="sec-head"><h2>Köyümüz Köprüköy</h2></div>' +
      '<p>Köyümüz adını Kızılırmak üzerindeki tarihi Çeşnigir Köprüsü\'nden alır. Selçuklu döneminden kalan on iki gözlü bu taş köprü, yüzyıllarca Ankara ile Kırşehir arasındaki yolun geçiş noktası oldu.</p>' +
      '<p class="muted">Kapulukaya Baraj Gölü kıyısında, Keskin\'e 25 km, Kırıkkale\'ye 37 km uzaklıktayız.</p>' +
      '<div class="btn-row"><a class="btn btn-light" href="#/hakkimizda">Köyümüz ve tarihçe</a><a class="btn btn-light" href="#/gezilecek-yerler">Gezilecek yerler</a></div></div></div></section>';
    return h;
  }

  var filter = 'Tümü';
  function pageNews() {
    var all = data.duyurular.slice();
    var types = ['Tümü'].concat(C.DUYURU_TURLERI.filter(function (t) { return all.some(function (p) { return p.tur === t; }); }));
    if (types.indexOf(filter) < 0) filter = 'Tümü';
    var list = filter === 'Tümü' ? all : all.filter(function (p) { return p.tur === filter; });
    return band('Duyurular', 'Vefat, düğün ve toplantı ilanları, köyümüzden haberler ve köyümüzün tarihinden yazılar.') +
      '<section class="section"><div class="container"' + ed('ekle:duyurular') + '>' +
      (types.length > 2 ? '<div class="filters" role="group" aria-label="Duyuru türü">' + types.map(function (t) {
        return '<button type="button" data-filter="' + esc(t) + '" aria-pressed="' + (t === filter) + '">' + esc(t) + '</button>';
      }).join('') + '</div>' : '') +
      (list.length ? '<div class="news-list">' + list.map(newsCard).join('') + '</div>' : '<div class="box empty"><b>Henüz duyuru yok</b>Yeni duyurular burada görünecek.</div>') +
      '</div></section>';
  }

  function pageArticle(id) {
    var p = data.duyurular.filter(function (x) { return pid(x) === id || x.eski_id === id; })[0];
    if (!p) return band('Duyuru bulunamadı') + '<section class="section"><div class="container"><p>Bu duyuru kaldırılmış olabilir.</p><a class="btn" href="#/duyurular">Tüm duyurular</a></div></section>';
    var src = img(p.foto), link = C.linkUrl(p.link);
    var paras = String(p.metin || '').split(/\n\s*\n|\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    // ek fotoğraflar: "ust" işaretliler kapağın hemen altında, diğerleri yazının sonunda
    function ekFoto(ust) {
      return (p.fotolar || []).filter(function (f) { return !!f.ust === ust; }).map(function (f) {
        var s = img(f.foto);
        return s ? '<figure class="fig"><button type="button" class="article-img" style="margin-bottom:6px" data-photo="' + esc(s) + '" data-cap="' + esc(f.aciklama || p.baslik) + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(s) + '" alt="' + esc(f.aciklama || p.baslik) + '"' + (ust ? '' : ' loading="lazy"') + ' style="aspect-ratio:auto;object-fit:contain"></button>' +
          (f.aciklama ? '<figcaption>' + esc(f.aciklama) + '</figcaption>' : '') + '</figure>' : '';
      }).join('');
    }
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/duyurular">Duyurular</a></div></div></div>' +
      '<section class="section"><div class="container"><article class="article"' + ek('duyurular', data.duyurular.indexOf(p)) + '>' +
      '<div class="news-meta">' + (p.tur ? '<span class="' + C.badgeClass(p.tur) + '">' + esc(p.tur) + '</span>' : '') + (isTarih(p) && p.olay_tarihi ? '<span class="olay">' + esc(p.olay_tarihi) + '</span><span>Paylaşıldı: ' + esc(C.longDate(p.tarih)) + '</span>' : '<span>' + esc(C.longDate(p.tarih, true)) + '</span>') + '</div>' +
      '<h1>' + esc(p.baslik) + '</h1>' +
      (src ? '<button type="button" class="article-img" data-photo="' + esc(src) + '" data-cap="' + esc(p.baslik) + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(src) + '" alt="' + esc(p.foto_aciklama || p.baslik) + '"></button>' : '') +
      ekFoto(true) +
      '<div class="article-text">' + paras.map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' +
      ekFoto(false) +
      (p.kaynak ? '<p class="muted small">Kaynak: ' + esc(p.kaynak) + '</p>' : '') +
      '<div class="btn-row">' + shareButtons({ key: 'd', id: id, tur: p.tur, title: p.baslik, photo: src }, true) +
      (link ? '<a class="btn btn-light" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + 'Haberin kaynağı</a>' : '') +
      '<a class="btn btn-light" href="#/duyurular">‹ Tüm duyurular</a></div>' +
      yBox('duyuru', pid(p), p.baslik, p.tur) +
      '</article></div></section>';
  }

  function pageEvents() {
    var list = upcoming(365), h = '', cur = '';
    list.forEach(function (e) {
      var p = C.parts(e.iso), key = C.AY[p.m] + ' ' + p.y;
      if (key !== cur) { if (cur) h += '</div>'; h += '<h2 class="month">' + esc(key) + '</h2><div class="box">'; cur = key; }
      h += evRow(e);
    });
    if (cur) h += '</div>';
    return band('Etkinlikler', 'Düğün, nişan, mevlit, toplantılar ve resmî günler.') +
      '<section class="section"><div class="container" style="max-width:860px"' + ed('ekle:etkinlikler') + '>' + (h || '<div class="box empty"><b>Yaklaşan bir gün yok</b></div>') + '</div></section>';
  }

  // Tek etkinliğin sayfası: paylaşılan bağlantı buraya gelir (geçmiş etkinlikler de açılır)
  function pageEvent(id) {
    var x = data.etkinlikler.filter(function (v) { return eid(v) === id; })[0];
    var crumb = '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/etkinlikler">Etkinlikler</a></div></div></div>';
    if (!x) return band('Etkinlik bulunamadı') + '<section class="section"><div class="container"><p>Bu etkinlik kaldırılmış olabilir.</p><a class="btn" href="#/etkinlikler">Tüm etkinlikler</a></div></section>';
    var e = { iso: C.normIso(x.tarih), ad: x.ad, tur: x.tur, saat: x.saat, yer: x.yer, foto: x.foto, id: id, koy: true };
    var src = img(e.foto), until = C.untilText(e.iso), det = [e.saat, e.yer].filter(Boolean).join(' · ');
    return crumb + '<section class="section"><div class="container"><article class="article"' + ek('etkinlikler', data.etkinlikler.indexOf(x)) + '>' +
      '<div class="news-meta">' + (e.tur ? '<span class="' + C.badgeClass(e.tur) + '">' + esc(e.tur) + '</span>' : '') +
      (until ? '<span class="ev-when">' + esc(until) + '</span>' : '') + '</div>' +
      '<h1>' + esc(e.ad) + '</h1>' +
      '<div class="box box-pad" style="margin-bottom:18px"><ul class="facts"><li><span>Gün</span>' + esc(C.longDate(e.iso, true)) + '</li>' +
      (e.saat ? '<li><span>Saat</span>' + esc(e.saat) + '</li>' : '') + (e.yer ? '<li><span>Yer</span>' + esc(e.yer) + '</li>' : '') + '</ul></div>' +
      (src ? '<button type="button" class="article-img" data-photo="' + esc(src) + '" data-cap="' + esc(e.ad) + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(src) + '" alt="' + esc(e.ad) + '"></button>' : '') +
      '<div class="btn-row">' + shareButtons(evShare(e, det), true) + '<a class="btn btn-light" href="#/etkinlikler">‹ Tüm etkinlikler</a></div>' +
      yBox('etkinlik', id, e.ad, e.tur) +
      '</article></div></section>';
  }

  function pagePhotos() {
    return band('Fotoğraflar', 'Büyütmek için fotoğrafa dokunun; altındaki "Yorumlar" düğmesiyle yorum yazabilirsiniz.') + '<section class="section"><div class="container"' + ed('ekle:galeri') + '>' +
      (data.galeri.length ? galleryGrid(data.galeri) : '<div class="box empty"><b>Henüz fotoğraf yok</b></div>') + '</div></section>';
  }

  // İlan sahibine ulaşma düğmeleri ve ilanın paylaşım bilgisi
  function mkContact(x) {
    var tel = C.telHref(x.telefon), wa = C.waHref(x.telefon, (x.baslik || '') + ' ilanı için yazıyorum.');
    return (tel || wa) ? '<div class="btn-row" style="margin-top:6px">' + (tel ? '<a class="btn" href="tel:' + esc(tel) + '">' + icon('phone') + 'Ara</a>' : '') +
      (wa ? '<a class="btn btn-green" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp\'tan yaz</a>' : '') + '</div>' : '';
  }
  function mkShare(x) { return { key: 'i', id: iid(x), tur: x.tur, title: x.baslik, det: x.fiyat ? x.fiyat + ' ₺' : '', photo: img(x.foto) }; }

  // Tek ilanın sayfası: paylaşılan bağlantı buraya gelir
  function pageListing(id) {
    var x = data.pazar.filter(function (v) { return iid(v) === id; })[0];
    if (!x) return band('İlan bulunamadı') + '<section class="section"><div class="container"><p>Bu ilan kaldırılmış olabilir.</p><a class="btn" href="#/pazar">Tüm ilanlar</a></div></section>';
    var src = img(x.foto);
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/pazar">Market</a></div></div></div>' +
      '<section class="section"><div class="container"><article class="article"' + ek('pazar', data.pazar.indexOf(x)) + '>' +
      '<div class="news-meta">' + (x.tur ? '<span class="' + C.badgeClass(x.tur) + '">' + esc(x.tur) + '</span>' : '') + '<span>' + esc(C.longDate(x.tarih)) + '</span></div>' +
      '<h1>' + esc(x.baslik) + '</h1>' + (x.fiyat ? '<div class="mk-price" style="margin:-6px 0 12px">' + esc(x.fiyat) + ' ₺</div>' : '') +
      (src ? '<button type="button" class="article-img" data-photo="' + esc(src) + '" data-cap="' + esc(x.baslik) + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(src) + '" alt="' + esc(x.baslik) + '"></button>' : '') +
      '<div class="article-text">' + (x.aciklama ? '<p>' + esc(x.aciklama) + '</p>' : '') + (x.kisi ? '<p class="muted">İlan sahibi: ' + esc(x.kisi) + '</p>' : '') + '</div>' +
      mkContact(x) +
      '<div class="btn-row">' + shareButtons(mkShare(x), true) + '<a class="btn btn-light" href="#/pazar">‹ Tüm ilanlar</a></div>' +
      '</article></div></section>';
  }

  function pageMarket() {
    var list = byDate(data.pazar, -1), dtel = C.telHref(data.dernek.telefon);
    var body = list.length ? '<div class="cards">' + list.map(function (x) {
      var src = img(x.foto);
      return '<article class="box mk"' + ek('pazar', data.pazar.indexOf(x)) + '>' + (src ? '<img src="' + esc(src) + '" alt="' + esc(x.baslik) + '" loading="lazy">' : '') +
        '<div class="box-pad"><div class="news-meta">' + (x.tur ? '<span class="' + C.badgeClass(x.tur) + '">' + esc(x.tur) + '</span>' : '') + '<span>' + esc(C.longDate(x.tarih)) + '</span></div>' +
        '<h3><a class="ev-link" href="#/ilan/' + esc(iid(x)) + '"><b>' + esc(x.baslik) + '</b></a></h3>' + (x.fiyat ? '<div class="mk-price">' + esc(x.fiyat) + ' ₺</div>' : '') +
        (x.aciklama ? '<p>' + esc(x.aciklama) + '</p>' : '') + (x.kisi ? '<p class="muted">' + esc(x.kisi) + '</p>' : '') +
        mkContact(x) + shareButtons(mkShare(x)) +
        '</div></article>';
    }).join('') + '</div>' : '<div class="box empty"><b>Şu anda ilan yok</b>İlan vermek isterseniz derneği arayın.' +
      (dtel ? '<p style="margin:14px 0 0"><a class="btn" href="tel:' + esc(dtel) + '">' + icon('phone') + 'Derneği Ara</a></p>' : '') + '</div>';
    return band('Market ve Yardımlaşma', 'Köyümüzden satılık ürünler, aranan şeyler ve yardım istekleri.') +
      '<section class="section"><div class="container"' + ed('ekle:pazar') + '>' + body + '</div></section>';
  }

  function credit(who, file) {
    return '<span class="kredi">Fotoğraf: <a href="https://commons.wikimedia.org/wiki/File:' + file + '" target="_blank" rel="noopener">' + who + '</a></span>';
  }
  var EG = 'Egeasln, CC BY-SA 4.0', IS = 'Ingeborg Simon, CC BY-SA 3.0', VH = 'Volker Höhfeld, CC BY-SA 4.0';

  function pageAbout() {
    var d = data.dernek;
    var paras = String(d.hakkimizda || '').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var kasa = (d.kasa || d.gelir || d.gider) ? '<div class="box box-pad"' + ed('dernek:kasa') + ' style="margin-top:20px"><h3>Kasa Durumu</h3>' +
      (d.kasa_donem ? '<p class="muted small" style="margin:-4px 0 10px">' + esc(d.kasa_donem) + '</p>' : '') + '<div class="kasa">' +
      (d.gelir ? '<div><span>Gelir</span><b>' + esc(d.gelir) + ' ₺</b></div>' : '') +
      (d.gider ? '<div><span>Gider</span><b>' + esc(d.gider) + ' ₺</b></div>' : '') +
      (d.kasa ? '<div class="total"><span>Kasadaki para</span><b>' + esc(d.kasa) + ' ₺</b></div>' : '') + '</div></div>' : '';
    return band('Hakkımızda', 'Köprüköy Çeşnigir Kültür Sosyal Yardımlaşma ve Dayanışma Derneği') +
      '<section class="section"><div class="container grid-main"><div>' +
      '<div class="box box-pad"' + ed('dernek:hakkimizda') + ' style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap"><img src="' + B + 'images/logo.png" alt="Çeşnigir-Der logosu" width="120" height="120" style="flex:none">' +
      '<div style="flex:1 1 260px">' + paras.map(function (s) { return '<p style="margin:0 0 12px">' + esc(s) + '</p>'; }).join('') + '</div></div>' +
      '<div class="sec-head" style="margin-top:30px"><h2>Neler yapıyoruz?</h2></div>' +
      '<ul class="check-list">' +
      '<li>Köyden haberleri ve duyuruları herkese ulaştırıyoruz.</li>' +
      '<li>Düğün, nişan, mevlit ve cenaze gibi özel günleri takvimde duyuruyoruz.</li>' +
      '<li>Köylülerin alım satım ve yardımlaşma ilanlarına aracılık ediyoruz.</li>' +
      '<li>Çeşnigir Köprüsü\'nü ve Köprüköy\'ün tarihini tanıtıyoruz.</li>' +
      '<li>Köyde yaşayanla gurbetteki hemşehrilerimiz arasındaki bağı canlı tutuyoruz.</li></ul>' +
      '</div><aside><div class="box box-pad"' + ed('dernek:kisiler') + '><h3>Dernek Bilgileri</h3><ul class="facts">' +
      peopleRows(d, true) +
      '<li><span>Kuruluş</span>Aralık 2025</li>' +
      '<li><span>Açılış töreni</span>6 Eylül 2026</li>' +
      '<li><span>Adres</span>' + esc(d.adres || 'Köprüköy, Keskin / Kırıkkale') + '</li>' +
      '</ul></div>' + (kasa || (E ? '<div' + ed('dernek:kasa') + ' style="margin-top:20px"></div>' : '')) + '</aside></div></section>' +
      boardsSection(d) + villageSection() +
      '<section class="section alt"><div class="container"><div class="sec-head"><h2>Gezilecek Yerler</h2></div>' +
      '<p>Çeşnigir Kanyonu mesire alanı, seyir terasları, tekne turu, yürüyüş yolu, Büklükale ören yeri ve Sulu Mağara: köyümüzde ve çevresinde görülecek yerleri ayrı bir sayfada topladık.</p>' +
      '<a class="btn" href="#/gezilecek-yerler">Gezilecek yerleri gör</a></div></section>';
  }

  function rows(list) {
    return '<ul class="facts">' + list.map(function (r) { return '<li><span>' + r[0] + '</span>' + r[1] + '</li>'; }).join('') + '</ul>';
  }

  /* Kurullar: panelde her satıra bir isim yazılır; görev varsa isimden sonra tireyle ("Ad Soyad - Sayman") */
  function boardList(t) {
    return String(t || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
      var m = /^(.*?)\s+[-–—:]\s+(.+)$/.exec(x);
      return '<li><b>' + esc(m ? m[1] : x) + '</b>' + (m ? '<span>' + esc(m[2]) + '</span>' : '') + '</li>';
    }).join('');
  }
  function boardsSection(d) {
    var y = boardList(d.yonetim_kurulu), n = boardList(d.denetim_kurulu);
    if (!y && !n) return E ? '<section class="section"><div class="container"' + ed('dernek:kurullar') + '></div></section>' : '';
    return '<section class="section"><div class="container"><div class="sec-head"' + ed('dernek:kurullar') + '><h2>Dernek Kurulları</h2></div><div class="pair" style="margin-bottom:0">' +
      (y ? '<div class="box box-pad"><h3>Yönetim Kurulu</h3><ol class="kurul">' + y + '</ol></div>' : '') +
      (n ? '<div class="box box-pad"><h3>Denetim Kurulu</h3><ol class="kurul">' + n + '</ol></div>' : '') +
      '</div></div></section>';
  }

  function para(t) { return '<p>' + t + '</p>'; }
  function figure(file, alt, cap) {
    return '<figure class="fig"><img src="' + B + 'images/' + file + '" alt="' + alt + '" loading="lazy"><figcaption>' + cap + '</figcaption></figure>';
  }

  /* Tarihçe kaynakları: [ad, adres] bağlantılı, düz yazı bağlantısız (arşiv künyesi, basılı kitap) */
  var K = {
    pehl: ['Pehlivanlı, Yedi Kıta 2012', 'https://pusulagazetesi.net/kose-yazilari/osmanlilarda_yol_emniyeti-1242'],
    kosan: ['O. Zengin Koşan, "Antik Çağ\'da Kızılırmak", 2021', 'https://dergipark.org.tr/en/download/article-file/1673482'],
    gg: 'J. Garstang ve O. R. Gurney, The Geography of the Hittite Empire, 1959',
    vikiKoy: ['Vikipedi, Köprüköy (Keskin)', 'https://tr.wikipedia.org/wiki/K%C3%B6pr%C3%BC,_Keskin'],
    wikiKopru: ['Wikipedia, Çeşnigir Bridge', 'https://en.wikipedia.org/wiki/%C3%87e%C5%9Fnigir_Bridge'],
    wikiKoy: ['Wikipedia, Köprüköy, Keskin', 'https://en.wikipedia.org/wiki/K%C3%B6pr%C3%BCk%C3%B6y,_Keskin'],
    kure: ['KÜRE Ansiklopedi, Çeşnigir Köprüsü', 'https://kureansiklopedi.com/tr/detay/cesnigir-koprusu-7f5c9'],
    kkTanitim: ['Kırıkkale Turizm ve Tanıtım Portalı', 'https://www.kirikkale.com.tr/mekan/cesnigir'],
    deprem: ['Yeni Ankara, 1938 depremi', 'https://www.yeniankara.com.tr/turkiye-haberleri/ankarada-binalari-catlatan-keskini-yikan-deprem-19-nisan-1938in-kayitlara-gecen-agir-bilancosu-188563'],
    tekne: ['Türkiye Gazetesi', 'https://www.turkiyegazetesi.com.tr/gundem/bakan-kurumdan-tarihi-bolgede-tekne-turu-717166'],
    acilis: ['İl Gazetesi', 'https://www.ilgazetesi.com.tr/koprukoy-cesnigir-der-kapilarini-aciyor-6-eylul-pazar-gunu-buyuk-acilis-toreni-var-334738h.htm'],
    ataAns: ['Atatürk Ansiklopedisi, Mustafa Kemal Paşa\'nın Ankara\'ya Gelişi', 'https://ataturkansiklopedisi.gov.tr/detay/385/Mustafa-Kemal-Pa%C5%9Fa%E2%80%99n%C4%B1n-Ankara%E2%80%99ya-Geli%C5%9Fi-(27-Aral%C4%B1k-1919)'],
    atam: ['G. Çaykıran, ATAM Dergisi', 'https://atamdergi.gov.tr/tam-metin/1101/tur'],
    vikiBala: ['Vikipedi, Balâ', 'https://tr.wikipedia.org/wiki/Bal%C3%A2'],
    kardes: ['Sırrı Kardeş, Heyet-i Temsiliye ve Mustafa Kemal Kırşehir\'de (1950), aktaran Adnan Yılmaz', 'https://www.adnanyilmaz.com.tr/2020/01/28/100-yilinda-samsundan-kirsehire-gelen-mustafa-kemal-pasa/']
  };
  function srcHtml(list) {
    if (!list || !list.length) return '';
    return '<small class="t-src">Kaynak: ' + list.map(function (k) {
      return typeof k === 'string' ? esc(k) : '<a href="' + esc(k[1]) + '" target="_blank" rel="noopener">' + esc(k[0]) + '</a>';
    }).join(' · ') + '</small>';
  }

  var TARIH = [
    ['Rivayet: MÖ 6. yüzyıl', 'Herodot, Lidya Kralı Kroisos\'un Kızılırmak\'ı orada bulunan köprülerden geçtiğini yazar, ama yer adı vermez. Tarihçi Olcay Zengin Koşan (2021), O\'Grady\'ye (2002) dayanarak bu geçişin bugünkü köprünün yerinde bulunmuş daha eski bir köprüden olmuş olabileceğini öne sürer. Garstang ve Gurney (1959) da köprünün altında Roma dönemi ve daha eski köprülerden kalma taşlar gördüklerini yazar. Ancak Herodot köprüyü görmemiştir; geçişin burada olduğunu kesinleştiren bir belge yoktur.', [K.kosan, K.gg, K.pehl]],
    ['13. yüzyıl', 'Köprü Anadolu Selçukluları döneminde, yanındaki bir hanla birlikte yapılır. Sanat tarihçisi Fügen İlter\'e göre İslam öncesine ait eski bir köprünün temelleri üzerine kurulmuştur. Han bugün ayakta değildir.', [K.pehl, K.kure]],
    ['1402', 'Rivayete göre Timur\'un ordusu Ankara Savaşı\'na giderken köprüden geçer.', [K.wikiKopru, K.kure]],
    ['16. yüzyıl', 'Rivayete göre Yavuz Sultan Selim\'in Mısır Seferi hazırlıkları sırasında köprü elden geçirilir; onarımın Mimar Sinan\'a ait olduğu söylenir.', [K.kure, K.kkTanitim]],
    ['1609', 'İki padişah emri: Temmuz\'da Ankara Beyi\'ne Çaşnigir köprüsü civarındaki palangalarda eşkıya tahkiki, Kasım\'da Çaşnigir Köprüsü yani Kırkkeçili kalesindeki eşkıyanın temizlenmesi emredilir.', ['BOA, Mühimme Defteri 78/504 ve 78/1234']],
    ['Osmanlı dönemi', 'Kayalık ve tehlikeli geçidi korumak için köprü çevresine 50 kadar derbendci (geçit bekçisi) yerleştirilir. Bekçilerin aileleri zamanla bugünkü köyün çekirdeğini oluşturur.', [K.pehl]],
    ['1724', 'Bir padişah emrinde Ankara sancağının sınırı "Çaşnigir" olarak anılır; yolların eşkıyaya karşı korunması istenir.', ['BOA, Mühimme Defteri 131/1456']],
    ['1777', 'Köy, devlet kayıtlarında "Çaşnigir Köprüsü karyesi" adıyla geçer. Köy ahalisi adına Köprülüzâde Osman Ağa, Rakka\'da iskân edilen Kürt tayfası ve oymaklarının arazi ve bağlara tecavüz, mal gasbı ve adam öldürmesinden şikâyet eder.', ['BOA, Cevdet Adliye 38/2270', K.vikiKoy]],
    ['1791', 'Çaşnigir Derbendi Ağası Hacı Mehmed Ağa ölür. Yerine oğlu Süleyman atanır, fakat nüfuzlu Cabbarzâde Süleyman Bey ağalığı kendi üzerine aldırır; padişah fermanıyla oğula başka bir görev verilir.', [K.pehl]],
    ['1807', 'Konur kazasındaki Çaşnigir Köprüsü derbendinin muhafızı Hacı Mehmed\'in ölümü üzerine görev Cabbarzâde Süleyman Bey\'e verilir.', ['BOA, Ali Emiri III. Selim 313/18217']],
    ['1815', 'Kayıtlarda köyün adı "Çaşnigir Derbendi" olur. Aynı yıl Köprülü oğullarından Hacı Ali, Hüsrev Şir ve Mehmed Emin\'in halktan fazla para istediği şikâyeti üzerine Kırşehir Mutasarrıfı Vezir Ali Paşa\'ya inceleme emri verilir.', [K.pehl, K.vikiKoy]],
    ['1818', 'Derbendi korumakla görevli üç köyün halkı, vergiden muaf oldukları hâlde valilerin vergi istediğini İstanbul\'a şikâyet eder.', [K.pehl]],
    ['1822', 'Halka zulmeden derbend ağası Deli Battal yakalanır ve padişah emriyle cezalandırılır.', [K.pehl]],
    ['1831', 'Derbendin vergi muafiyeti kaldırılır, köprünün korunması Gümüşkân madeni yöneticilerine verilir.', [K.pehl]],
    ['1836', 'Çaşnigir Köprüsü köyündeki caminin hatibi vefat eder, yerine yenisi atanır. Bu kayıt köyde o yıllarda bir cami olduğunu gösterir.', [K.pehl]],
    ['1840–1845', 'Vergi defterlerine göre köyde 182 Müslüman ve 7 Rum hanesi vardır; nüfus 900\'ün üzerindedir.', [K.pehl, 'BOA, Nüfus Defteri 3543 ve 1845 Temettuat Defteri']],
    ['1852', 'Köprü harap olur. Vakfı olmadığından 5.900 kuruşluk onarım masrafı devletin bayındırlık gelirlerinden karşılanır. Bu yazışmada köprü "Sultan Murad Han\'ın yaptırdığı Çaşnigir Köprüsü" diye anılır.', [K.pehl]],
    ['1892', 'Köprüden geçen Fransız gezgin Comte de Cholet, sol kıyıda köprüyü bekler gibi duran taştan bir aslan heykeli görür. Heykel bugün yerinde değildir.', [K.pehl, 'Cevdet Çulpan, Türk Taş Köprüleri']],
    ['26 Aralık 1919', 'Mustafa Kemal Paşa ve Heyet-i Temsiliye, Sivas\'tan Ankara\'ya giderken Kaman\'dan sonra Keskinli süvarilerin korumasında İğdebeli–Köprüköy yolunu kullanır, Kızılırmak\'ı geçip Bala\'ya, geceyi geçirdikleri Beynam köyüne varır. Ertesi gün Ankara\'ya girerler.', [K.vikiBala, K.ataAns, K.kardes], [['ataturk-karsilama-1919.jpg', 'Mustafa Kemal Paşa ve heyetin karşılanışı, arşiv fotoğrafı'], ['ataturk-yol-haritasi.jpg', 'Sivas–Ankara yolculuğunun haritası; Köprüköy 26 Aralık']]],
    ['1936', 'Avusturyalı araştırmacı K. Ritter köprüyü iki kez inceler ve bugünkü hâliyle Osmanlı yapısı olduğunu yazar.', [K.pehl]],
    ['19 Nisan 1938', 'Kırşehir–Keskin depremi bölgeyi sarsar. Depremi inceleyen bilim heyeti Köprüköy çevresinde de çalışır.', [K.deprem]],
    ['29 Şubat 1972', 'Köprüköy\'de belediye kurulur, köy belde olur.', [K.vikiKoy, K.wikiKoy]],
    ['1979–1989', 'Kızılırmak üzerinde Kapulukaya Barajı yapılır. 1989\'da sular yükselince köprü araç trafiğine kapanır, yakınına yeni karayolu köprüsü yapılır.', [K.wikiKopru, K.wikiKoy]],
    ['2010', 'Karayolları 4. Bölge Müdürlüğü köprüyü restore eder. Köprü bugün yayalara açıktır.', [K.wikiKopru, K.kure]],
    ['2013', 'Nüfus 2.000\'in altına düşünce belediye kapanır, Köprüköy yeniden köy olur.', [K.vikiKoy, K.wikiKoy]],
    ['2019–2020', 'Kırıkkale Valiliği çalışmalarıyla Çeşnigir Kanyonu seyir terasları, yürüyüş yolları ve tekne turlarıyla turizme açılır.', [K.kure, K.tekne]],
    ['Aralık 2025', 'Köprüköy Çeşnigir Kültür Sosyal Yardımlaşma ve Dayanışma Derneği kurulur.', ['Dernek kayıtları']],
    ['6 Eylül 2026', 'Dernek merkezi Köprüköy Çarşı Merkezi\'nde törenle açılır.', [K.acilis]]
  ];

  function villageSection() {
    var W = 'https://tr.wikipedia.org/wiki/';
    var stats = [['800 yıla yakın', 'köprünün tahmini yaşı'], ['113 m', 'köprünün boyu'], ['18,60 m', 'ana kemer açıklığı'], ['50', 'Osmanlı döneminde köprü bekçisi'], ['1972', 'belde oluşu']];
    return '<section class="section alt"><div class="container"><div class="sec-head"><h2>Köyümüz Köprüköy</h2></div>' +
      '<div class="stats">' + stats.map(function (s) { return '<div><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="container grid-main"><div>' +
      figure('koprukoy-gol.jpg', 'Kapulukaya Baraj Gölü kıyısında Köprüköy: kayalık yamaçta kırmızı çatılı evler, solda Çeşnigir Köprüsü.', 'Göl kıyısından Köprüköy ve Çeşnigir Köprüsü. ' + credit(IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_02.jpg')) +
      para('Kırıkkale\'nin Keskin ilçesine bağlı Köprüköy, adını Kızılırmak üzerindeki tarihi Çeşnigir Köprüsü\'nden alır; halk arasında kısaca "Köprü" de denir. Köy, Ankara–Kırşehir yolunun eski güzergâhında, ırmağın kayalar arasında daraldığı ve en sağlam geçit verdiği yerde kurulmuştur. Yerleşimin Selçuklu döneminde başladığı kabul edilir.') +
      para('Köyümüzün asıl hikâyesi köprüyle birlikte yazılmıştır. Osmanlı döneminde kervanların geçtiği bu kayalık geçidi eşkıyadan korumak için köprünün çevresine derbendciler, yani geçit bekçileri yerleştirildi. Bekçilerin aileleri burada kalıp çoğaldı; han ve cami yapıldı. Böylece bir güvenlik noktası, zamanla kalabalık bir köye dönüştü. Kayıtlarda köyün adı 1777\'de "Çaşnigir Köprüsü", 1815\'te "Çaşnigir Derbendi" olarak geçer.') +

      '<div class="sec-head" style="margin-top:30px"><h2>Çeşnigir Köprüsü</h2></div>' +
      '<div class="pair">' +
      figure('kopru-1972.jpg', 'Çeşnigir Köprüsü 1972\'de: baraj öncesi, kemerlerin altından akan turkuaz Kızılırmak.', '15 Eylül 1972, baraj suları yükselmeden önce. ' + credit(VH, 'K%C3%B6pr%C3%BCk%C3%B6y_15_09_1972_historischen_%C3%87e%C5%9Fnigir-Br%C3%BCcke_%C3%BCber_den_K%C4%B1z%C4%B1l%C4%B1rmak.jpg')) +
      figure('kopru-bugun.jpg', 'Bugün Çeşnigir Köprüsü: kemerlerin yarısı baraj suyunda.', 'Bugün: su kemerlerin yarısına ulaşıyor. ' + credit(EG, 'Cesnigir_paradise3_(cropped).jpg')) + '</div>' +
      para('Köprü kesme taştan yapılmıştır; üzerinde kitabe de süsleme de yoktur. Ayaklarının sağlam kayaya oturması için kayaların çizgisini izleyerek eğri kurulmuş, ortası iki yana eğimli biçimde yükselir. Ortadaki büyük sivri kemerin altından ırmağın ana akıntısı geçer; yanlardaki küçük gözlerden ise yalnızca taşkınlarda su akar. Gövdenin içine gizlenmiş üç küçük göz, ağırlığı azaltmak için yapılmıştır.') +
      '<div class="pair"><div class="box box-pad"><h3>Köprünün ölçüleri</h3>' +
      rows([['Uzunluk', '113,25 m (bazı kaynaklarda 110 m)'], ['Genişlik', '5,80 m yol, korkuluklarla 6 m'], ['Ana kemer', '18,60 m açıklık, 13,65 m yükseklik'],
        ['Kemer açıklıkları', 'Ankara yönünden: 3,75 · 4,00 · 4,13 · 6,28 · 18,60 · 5,90 m'], ['Gizli gözler', 'Gövde içinde üç sivri kemerli hafifletme gözü'], ['Malzeme', 'Kesme taş']]) +
      '</div><div class="box box-pad"><h3>"Çeşnigir" ne demek?</h3>' +
      '<p style="margin:0 0 10px">Farsça <i>çaşni</i> (tat) ve <i>gir</i> (alan) sözlerinden gelir. Selçuklu ve Osmanlı saraylarında padişaha sunulan yemekleri önceden tadıp güvenliğinden sorumlu olan görevliye <b>çaşnigir</b> denirdi; Osmanlı sarayının en itibarlı görevlerinden biriydi.</p>' +
      '<p style="margin:0">Kelimenin bir anlamı da darphanede basılan altın ve gümüş paraların ayarını denetleyen görevlidir. Köprünün neden bu adı aldığı kesin olarak bilinmiyor; belgelerde hem "Çaşnigir" hem "Çeşnigir" yazılışı geçer.</p></div></div>' +

      '<div class="sec-head" style="margin-top:30px"><h2>Köprüyü kim yaptırdı?</h2></div>' +
      para('Kitabesi olmadığı için bu soru hâlâ tartışmalıdır. En yaygın görüş, köprünün 13. yüzyılda Anadolu Selçukluları döneminde, yanındaki hanla birlikte yapıldığıdır. Sanat tarihçisi Fügen İlter, köprünün İslam öncesi döneme ait eski bir köprünün temelleri üzerine kurulduğunu, Osmanlı döneminde yenilenince ilk biçimini yitirdiğini yazar.') +
      para('Öte yandan 1936\'da köprüyü inceleyen Avusturyalı K. Ritter, bugünkü hâliyle Osmanlı öncesine ait olamayacağını ve Sultan Murad zamanında yapıldığını ileri sürmüştür. Tarihçi Prof. Dr. Hamit Pehlivanlı\'nın Osmanlı arşivinde bulduğu 27 Temmuz 1852 tarihli belge de köprüyü "Sultan Murad Han\'ın yaptırdığı Çaşnigir Köprüsü" diye anar. Pehlivanlı, o yıllarda köprünün üzerinde bugün kayıp olan bir kitabenin bulunmuş olabileceğini düşünür.') +

      '<div class="sec-head" style="margin-top:30px"><h2>Derbend: köprünün bekçileri</h2></div>' +
      figure('kopru-merdiven.jpg', 'Çeşnigir Köprüsü\'ne inen taş merdiven ve köprünün kemerleri.', 'Köprüye inen yol. ' + credit(IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_04.jpg')) +
      para('<b>Derbend</b>, Farsça "geçit tutmak" demektir. Osmanlı devleti, bugünkü jandarma ve polisin olmadığı dönemlerde, eşkıyanın sık görüldüğü tehlikeli geçitleri civar köylerin halkına korutur; karşılığında onları bazı vergilerden muaf tutardı. Bekçiler yolcuların canına ve malına zarar gelmeyeceğine söz verir, bir şey olursa zararı öderlerdi. Başlarındaki kişiye <b>derbend ağası</b> denirdi.') +
      para('Çaşnigir Köprüsü, Kırşehir Sancağı\'nın Konur Kazası\'nda, bu düzenin Anadolu\'daki önemli noktalarından biriydi. 17. yüzyıl sonunda başka yerlerde bekçiler dağılırken, burada 19. yüzyılın ortasında hâlâ kalabalık bir nüfus yaşıyordu: 1845 vergi defterine göre köyde 182 Müslüman hane, 1840 defterine göre de 7 Rum hanesi vardı. Hane başına beş kişi sayılırsa nüfus 945 civarındadır.') +
      para('Zamanla düzen bozuldu. Arşiv belgelerinde halktan fazla para isteyen ağalar, vergi muafiyetine rağmen vergi talep eden valiler ve halka zulmettiği için 1822\'de cezalandırılan Deli Battal adlı bir ağa geçer. 1831\'de derbendin muafiyeti kaldırıldı; Tanzimat\'tan sonra yol güvenliğini önce zaptiye, sonra jandarma üstlendi. Derbendden geriye bugün yalnızca köprü kaldı; han ve caminin izi yoktur.') +

      '<div class="sec-head" style="margin-top:30px"><h2>Atatürk köyümüzden geçti</h2></div>' +
      '<figure class="fig"><img src="' + B + 'images/ataturk-yol-haritasi.jpg" alt="Harita: Mustafa Kemal Paşa\'nın 18-27 Aralık 1919\'da Sivas\'tan Kayseri, Mucur, Hacıbektaş, Kırşehir, Kaman, Köprüköy, Bala ve Beynam üzerinden Ankara\'ya yolculuğu." loading="lazy" style="aspect-ratio:auto;object-fit:contain">' +
      '<figcaption>Sivas\'tan Ankara\'ya yolculuk, 18–27 Aralık 1919. Konumlar yaklaşıktır. <a href="' + B + 'images/ataturk-yol-haritasi.jpg" target="_blank" rel="noopener">Haritayı büyüt</a></figcaption></figure>' +
      para('Mustafa Kemal Paşa ve Heyet-i Temsiliye, 18 Aralık 1919\'da Sivas\'tan Ankara\'ya doğru yola çıktı. Kayseri, Mucur, Hacıbektaş ve Kırşehir\'den sonra 25 Aralık gecesini Kaman\'da geçirdiler. Ertesi gün, 26 Aralık Cuma, heyet Keskinli süvarilerin korumasında <b>İğdebeli–Köprüköy yolunu</b> kullanarak Kızılırmak\'ı geçti ve Bala\'ya ulaştı. Geceyi Beynam köyünde geçiren heyet, 27 Aralık 1919\'da Ankara\'ya girdi.') +
      para('Kaman\'da Paşa\'yı ağırlayan Ali Çavuş\'un yeğeni Mehmet Bektaş\'ın anlattığına göre, Paşa yolda nerede kalabileceğini sorunca Ali Çavuş, <i>"Köprü köyünde Hacı Ali Ağa\'nın odasında kalırsınız"</i> demiştir. Irmağın muhtemelen köyümüzdeki Çeşnigir Köprüsü\'nden geçildiği düşünülmektedir; kaynaklar köprünün adını ayrıca anmaz.') +
      '<div class="pair">' +
      '<figure class="fig"><img src="' + B + 'images/ataturk-karsilama-1919.jpg" alt="Kalpaklı ve paltolu kalabalık arasında yürüyen Mustafa Kemal Paşa ve heyet, eski bir arşiv fotoğrafı." loading="lazy" style="aspect-ratio:auto"><figcaption>Millî Mücadele yıllarından bir karşılama. Arşiv fotoğrafı.</figcaption></figure>' +
      '<figure class="fig"><img src="' + B + 'images/ataturk-karsilama-tablo.jpg" alt="Davul zurna ve kalabalık bir halkın heyeti karşıladığı renkli bir tablo." loading="lazy" style="aspect-ratio:auto"><figcaption>Heyetin halk tarafından karşılanışını canlandıran bir tablo.</figcaption></figure>' +
      '</div>' +
      '<div class="box box-pad"><h3>Yolculuk gün gün</h3>' +
      rows([['18 Aralık', 'Sivas\'tan hareket'], ['19–21 Aralık', 'Kayseri'], ['21 Aralık', 'Mucur'], ['22 Aralık', 'Hacıbektaş'], ['23 Aralık', 'Yeniden Mucur'], ['24 Aralık', 'Kırşehir'], ['25 Aralık', 'Kaman'],
        ['26 Aralık', '<b>Köprüköy</b>, Bala; gece Beynam köyü'], ['27 Aralık', 'Ankara']]) +
      '</div>' +
      '<p class="muted small" style="margin-top:14px">' + srcHtml([K.vikiBala, K.ataAns, K.atam, K.kardes]).replace('<small class="t-src">', '').replace('</small>', '') + '</p>' +

      '<div class="sec-head" style="margin-top:30px"><h2>Tarihçe</h2></div>' +
      (function () {
        var t = data.duyurular.filter(isTarih);
        return t.length ? '<div class="box box-pad" style="margin-bottom:18px;background:#FBF5E8;border-color:#D9C49A"><h3>Tarihten yazılar</h3><ul class="tarih-links">' +
          t.map(function (p) { return '<li><a href="#/duyuru/' + esc(pid(p)) + '">' + esc(p.baslik) + '</a>' + (p.olay_tarihi ? '<span>' + esc(p.olay_tarihi) + '</span>' : '') + '</li>'; }).join('') +
          '</ul></div>' : '';
      })() +
      '<ul class="timeline">' + TARIH.map(function (t) {
        var foto = (t[3] || []).map(function (f) {
          return '<a class="t-foto" href="' + B + 'images/' + f[0] + '" target="_blank" rel="noopener"><img src="' + B + 'images/' + f[0] + '" alt="' + esc(f[1]) + '" loading="lazy"><span>' + esc(f[1]) + '</span></a>';
        }).join('');
        return '<li><b>' + t[0] + '</b>' + t[1] + (foto ? '<span class="t-fotos">' + foto + '</span>' : '') + srcHtml(t[2]) + '</li>';
      }).join('') + '</ul>' +

      '<div class="pair" style="margin-top:28px"><div class="box box-pad"><h3>Nüfusun seyri</h3>' +
      rows([['1840\'lar', 'yaklaşık 945 (vergi defterlerinden tahmin)'], ['1985', '3.020'], ['1990', '2.914'], ['2000', '3.836'], ['2010', '1.638'], ['2013', '1.023'], ['2020', '604'], ['2024', '720'], ['2025', '662']]) +
      '<p class="muted small" style="margin:10px 0 0">Kaynak: 1840\'lar için BOA nüfus ve temettuat defterleri; 1985–2000 için <a href="https://tr.wikipedia.org/wiki/K%C3%B6pr%C3%BC,_Keskin" target="_blank" rel="noopener">Vikipedi, Köprüköy (Keskin)</a>; 2007 sonrası <a href="https://www.nufusune.com/35416-kirikkale-keskin-koprukoy-koy-nufusu" target="_blank" rel="noopener">TÜİK Adrese Dayalı Nüfus Kayıt Sistemi</a> (31 Aralık 2025 sonuçları)</p></div>' +
      '<div class="box box-pad"><h3>Belde dönemi belediye başkanları</h3>' +
      rows([['1972', 'Hacı Erbek (ilk başkan)'], ['1973', 'Mehmet Güven'], ['1977', 'M. Dede Köprülü'], ['1984', 'Şerafettin Güven'], ['1989', 'Şerafettin Güven'], ['1994', 'Muzaffer Büken'], ['1999', 'Selahattin Güven'], ['2004', 'Oğuzhan Köprülü'], ['2009', 'Hasan Taşpınar']]) +
      '<p class="muted small" style="margin:10px 0 0">Kaynak: Vikipedi, Köprüköy (Keskin)</p></div></div>' +

      '<div class="box box-pad" style="margin-top:24px"><h3>Türküde Köprüköy</h3>' +
      '<p style="margin:0">Kızılırmak türkülerinden "Nettin Kızılırmak Allı Gelini"nde anlatılan olayın köyümüzde yaşandığı aktarılır. Hikâyeye göre karşı köye götürülen gelin alayı köprüden geçerken köprü yıkılır, gelin ve alaydan pek çok kişi ırmağa kapılır. Ardından Kızılırmak\'a sitem eden ağıtlar yakılır.</p></div>' +

      '<p class="muted small" style="margin-top:20px">Kaynak: Prof. Dr. Hamit Pehlivanlı, <a href="https://pusulagazetesi.net/kose-yazilari/osmanlilarda_yol_emniyeti-1242" target="_blank" rel="noopener">"Osmanlılarda Yol Emniyetinin Sağlanmasında Derbendlerin Yeri ve Çaşnigir Köprüsü Derbendi"</a> (Yedi Kıta, Aralık 2012; Osmanlı arşiv belgeleri, Cevdet Çulpan ve Fügen İlter\'in çalışmalarına dayanır) · ' +
      '<a href="' + W + 'K%C3%B6pr%C3%BC,_Keskin" target="_blank" rel="noopener">Vikipedi, Köprüköy (Keskin)</a> · <a href="https://en.wikipedia.org/wiki/%C3%87e%C5%9Fnigir_Bridge" target="_blank" rel="noopener">Wikipedia, Çeşnigir Bridge</a> · ' +
      '<a href="https://kureansiklopedi.com/tr/detay/cesnigir-koprusu-7f5c9" target="_blank" rel="noopener">KÜRE Ansiklopedi</a> · <a href="https://www.yeniankara.com.tr/turkiye-haberleri/kirikkale-keskin-tarihi-casnigir-koprusu-keskin-askeri-hastanesi-190184" target="_blank" rel="noopener">Yeni Ankara</a> · ' +
      '<a href="https://www.yeniankara.com.tr/turkiye-haberleri/ankarada-binalari-catlatan-keskini-yikan-deprem-19-nisan-1938in-kayitlara-gecen-agir-bilancosu-188563" target="_blank" rel="noopener">Yeni Ankara (1938 depremi)</a> · <a href="https://www.timeturk.com/kultur/turkulere-hikayelere-konu-olan-kizilirmak/haber-1780026" target="_blank" rel="noopener">Timeturk</a></p>' +

      '</div><aside><div class="box box-pad"><h3>Köy Bilgileri</h3>' +
      rows([['Konum', 'Kapulukaya Baraj Gölü\'nün doğu kıyısı'], ['Uzaklık', 'Keskin 25 km, Kırıkkale 37 km, Ankara yaklaşık 113 km'], ['Rakım', '803 m'], ['Nüfus', '662 (2025, TÜİK)'],
        ['Geçim', 'Buğday, arpa, patates, nohut, fasulye, ayçiçeği, pancar; hayvancılık; tatlı su levreği ve sazan balıkçılığı'], ['Yönetim', 'Muhtar ve ihtiyar heyeti'], ['Posta kodu', '71860']]) +
      '</div><div class="box box-pad" style="margin-top:20px"><h3>Biliyor muydunuz?</h3><ul class="check-list">' +
      '<li>Köprü, Ankara–Kırşehir eski yolunun 100. kilometresindeydi ve "Köprüköy Köprüsü" diye de anılırdı.</li>' +
      '<li>Baraj kapakları açılıp su indirilmezse göl köprüyü yutabiliyor; yetkililer köprünün su üstünde kalmasına dikkat ediyor.</li>' +
      '<li>1892\'de köprünün başında taştan bir aslan heykeli vardı.</li>' +
      '<li>1852\'deki onarım açık eksiltmeyle en ucuz fiyatı veren ustaya verilmişti.</li>' +
      '<li>Gün batımında köprünün sudaki yansıması, Türkiye\'nin dört bir yanından fotoğrafçıları köye getiriyor.</li></ul></div>' +
      '</aside></div></section>';
  }

  var GEZI = [
    ['Çeşnigir Kanyonu Mesire Alanı', 'Kırıkkale Valiliği\'nin 2019-2020\'de yaklaşık 500 bin metrekarelik alanda düzenlediği kanyon: tarihi köprü, dinlenme ve piknik alanları, göl kenarında yürüyüş yolları.', 'mesire-parki.jpg', EG, 'Cesnigir_paradise.jpg', 'Çeşnigir Kanyonu mesire alanında ahşap korkuluklu yürüyüş yolu ve kayalıklar; arkada Kızılırmak. Köprüköy, Keskin, Kırıkkale.'],
    ['Seyir Terasları', 'Kanyona bakan iki seyir terası var; biri cam zeminli. Kızılırmak\'ı ve karşı kıyıdaki tarlaları yukarıdan görmek için en iyi yer.', 'gezi-seyir-terasi.jpg', '', '', 'Çeşnigir Kanyonu\'nda cam zeminli seyir terasının tepeden görünüşü: aşağıda yeşil Kızılırmak, kayalık yamaçlar ve tarlalar.'],
    ['Kanyonda Tekne Turu', 'Ahşap iskeleden kalkan teknelerle Kızılırmak\'ın kayalık kanyonu su üzerinden gezilir.', 'gezi-tekne-iskelesi.jpg', '', '', 'Çeşnigir Kanyonu\'nda ahşap tekne iskelesi ve Kızılırmak\'ta bekleyen gezi teknesi.'],
    ['Yürüyüş ve Bisiklet Yolu', 'Kanyon boyunca yaklaşık 6,5 km\'lik yürüyüş ve bisiklet yolu. Daha uzun rota Büklükale\'den başlar, köprüyü geçip Köprüköy\'den Behrek (Böğrek) Dağı eteklerine, Haydar Sultan Türbesi ve Deliler Kuyusu\'na uzanır. Yanınıza su ve atıştırmalık alın.', 'kopru-merdiven.jpg', IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_04.jpg', 'Tarihi Çeşnigir Köprüsü\'ne inen taş merdiven ve köprünün kemerleri, Köprüköy.'],
    ['Kapulukaya Baraj Gölü Kıyısı', 'Köyün batısında uzanan göl kıyısı; sazan ve tatlı su levreği avlanır. Sisli sabahlarda vadiyi kaplayan sis görülmeye değer.', 'kopru-gol.jpg', IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_01.jpg', 'Kapulukaya Baraj Gölü kıyısından Köprüköy: yamaçta evler, solda Çeşnigir Köprüsü.'],
    ['Büklükale Ören Yeri', 'Köprünün karşı kıyısında 5 bin yıllık yerleşim. Japon arkeolog Kimiyoshi Matsumura başkanlığında 2009\'dan beri kazılıyor; 7 metre yüksekliğinde sur ve 2010\'da bulunan Hitit çivi yazılı tablet en bilinen buluntuları.', 'buklukale.jpg', IS, 'B%C3%BCkl%C3%BCkale_01.jpg', 'Kızılırmak kıyısında Büklükale ören yerinin kayalık tepesi; sağda Çeşnigir Köprüsü.'],
    ['Sulu Mağara (Keskin)', 'Keskin\'de üç katlı, 285 metrelik mağara; içi yıl boyu 18 derece civarında. Yakınındaki Ceritkale Kanyonu\'nda yaklaşık 10 km\'lik doğa yürüyüşü yapılabiliyor.', 'sulu-magara.jpg', '', '', 'Keskin\'deki Sulu Mağara\'nın içi: ışıklandırılmış kaya tavan ve ahşap korkuluklu yürüyüş yolu.']
  ];

  function placesSection() {
    return '<section class="section alt"><div class="container"><div class="sec-head"><h2>Görülecek Yerler</h2></div>' +
      '<figure class="fig" style="margin-bottom:24px"><img class="wide" src="' + B + 'images/mesire.jpg" alt="Çeşnigir Kanyonu mesire alanının tepeden görünüşü: Kızılırmak kıyısında seyir terası, yürüyüş yolları ve tekne iskelesi." loading="lazy"></figure>' +
      '<div class="cards">' + GEZI.map(function (g) {
        var kredi = g[4] ? credit(g[3], g[4]) : (g[3] ? '<span class="kredi">Fotoğraf: ' + g[3] + '</span>' : '');
        return '<article class="box mk"><img src="' + B + 'images/' + g[2] + '" alt="' + esc(g[5] || g[0]) + '" loading="lazy">' +
          '<div class="box-pad"><h3>' + g[0] + '</h3><p>' + g[1] + '</p>' + kredi + '</div></article>';
      }).join('') + '</div>' +
      '<div class="pair" style="margin-top:28px">' +
      '<figure class="fig"><img src="' + B + 'images/kanyon-kopru.jpg" alt="Tarihi Çeşnigir Köprüsü, Kızılırmak\'ın yeşil suyundaki yansımasıyla (Köprüköy, Kırıkkale)." loading="lazy"><figcaption>Köprünün kıyıdan görünüşü. ' + credit(EG, 'Cesnigir_paradise3.jpg') + '</figcaption></figure>' +
      '<figure class="fig"><img src="' + B + 'images/kanyon-teras.jpg" alt="Çeşnigir Kanyonu: Kızılırmak\'ın kayalar arasından geçtiği vadi ve seyir terası." loading="lazy"><figcaption>Kanyon ve seyir terası. ' + credit(EG, 'Cesnigir_paradise2.jpg') + '</figcaption></figure></div>' +
      '<p class="muted small" style="margin-top:20px">Kaynak: <a href="https://www.turkiyegazetesi.com.tr/gundem/bakan-kurumdan-tarihi-bolgede-tekne-turu-717166" target="_blank" rel="noopener">Türkiye Gazetesi</a> · <a href="https://www.discovercappadocia.com/hiking/cesnigir-bridge-koprukoy-hasandede/85" target="_blank" rel="noopener">Discover Cappadocia</a> · <a href="https://en.wikipedia.org/wiki/B%C3%BCkl%C3%BCkale" target="_blank" rel="noopener">Vikipedi, Büklükale</a> · <a href="https://cnnturk.com/yasam/galeri/dogal-agri-kesici-etkisini-duyan-buraya-kosuyor-turkiyenin-her-yerinden-ziyaretci-akini-var-hem-sifa-dagitiyor-hem-de-tarihi-sulu-magara-2182485" target="_blank" rel="noopener">CNN Türk</a></p>' +
      '</div></section>';
  }

  /* Gezilecek Yerler: ziyaretçiye (ve arama motorlarına) yönelik ayrı sayfa. Bilgiler Hakkımızda'daki kaynaklı içerikle aynıdır. */
  function pageGezi() {
    function sss(q, a) { return '<h3 style="margin:18px 0 6px">' + q + '</h3><p style="margin:0">' + a + '</p>'; }
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › Gezilecek Yerler</div>' +
      '<h1>Köprüköy ve Çeşnigir Kanyonu\'nda Gezilecek Yerler</h1>' +
      '<p>Kırıkkale\'nin Keskin ilçesinde, Ankara\'dan günübirlik gidilebilen tarihi köprü, kanyon ve göl kıyısı.</p></div></div>' +
      '<section class="section"><div class="container grid-main"><div>' +
      para('Köprüköy, Kızılırmak üzerindeki Kapulukaya Baraj Gölü\'nün doğu kıyısında bir köydür. 13. yüzyıldan kalma <b>Çeşnigir Köprüsü</b>, onu çevreleyen <b>Çeşnigir Kanyonu mesire alanı</b>, cam zeminli seyir terası ve tekne turlarıyla Kırıkkale\'de ve Ankara çevresinde bir günde gezilebilecek yerlerden biridir.') +
      '<div class="sec-head" style="margin-top:26px"><h2>Burada Neler Yapılır?</h2></div>' +
      '<ul class="check-list">' +
      '<li>Tarihi Çeşnigir Köprüsü\'nü yakından görmek</li>' +
      '<li>Kanyona bakan seyir teraslarından (biri cam zeminli) Kızılırmak\'ı izlemek</li>' +
      '<li>Ahşap iskeleden kalkan teknelerle kanyonu sudan gezmek</li>' +
      '<li>Kanyon boyunca yaklaşık 6,5 km\'lik yolda yürüyüş yapmak ya da bisiklete binmek</li>' +
      '<li>Mesire alanında piknik yapmak</li>' +
      '<li>Gün batımında köprünün sudaki yansımasını fotoğraflamak</li>' +
      '<li>Göl kıyısında sazan ve tatlı su levreği avlamak</li>' +
      '<li>Karşı kıyıdaki 5 bin yıllık Büklükale ören yerini ve Keskin\'deki Sulu Mağara\'yı görmek</li></ul>' +
      '</div><aside><div class="box box-pad"><h3>Nerede, Nasıl Gidilir?</h3>' +
      rows([['Yer', 'Köprüköy, Keskin / Kırıkkale'], ['Ankara\'dan', 'yaklaşık 113 km'], ['Kırıkkale\'den', '37 km'], ['Keskin\'den', '25 km'], ['Yol', 'Eski Ankara–Kırşehir yolu üzerinde']]) +
      '<p style="margin:14px 0 0"><a class="btn" href="' + MAP + '" target="_blank" rel="noopener">Haritada aç</a></p></div></aside></div></section>' +
      placesSection() +
      '<section class="section"><div class="container"><div class="sec-head"><h2>Sık Sorulan Sorular</h2></div><div class="box box-pad">' +
      sss('Çeşnigir Köprüsü nerede?', 'Kırıkkale\'nin Keskin ilçesine bağlı Köprüköy\'de, Kızılırmak üzerindedir. Keskin\'e 25 km, Kırıkkale\'ye 37 km, Ankara\'ya yaklaşık 113 km uzaklıktadır.').replace('margin:18px', 'margin:0') +
      sss('Çeşnigir Köprüsü ne zaman yapıldı?', 'Köprü 13. yüzyılda, Anadolu Selçukluları döneminde yapılmıştır. Ayrıntılar için <a href="#/hakkimizda">köyün ve köprünün tarihçesine</a> bakabilirsiniz.') +
      sss('Ankara\'dan günübirlik gidilir mi?', 'Evet. Köprüköy Ankara\'ya yaklaşık 113 km uzaklıktadır; köprü, kanyon, seyir terası ve tekne turu bir günde gezilebilir.') +
      sss('En güzel fotoğraf ne zaman çekilir?', 'Gün batımında köprü sudaki yansımasıyla birlikte görünür. Sisli sabahlarda vadiyi kaplayan sis de görülmeye değerdir.') +
      sss('Yakında başka nereler gezilir?', 'Köprünün karşı kıyısındaki Büklükale ören yeri, Keskin\'deki Sulu Mağara ve yakınındaki Ceritkale Kanyonu.') +
      '</div><div class="btn-row" style="margin-top:20px"><a class="btn btn-light" href="#/hakkimizda">Köyün ve köprünün tarihçesi</a><a class="btn btn-light" href="#/fotograflar">Fotoğraflar</a></div></div></section>';
  }

  function pageContact() {
    var d = data.dernek, mail = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(d.eposta || '') ? d.eposta : '';
    return band('İletişim', 'Bize telefonla ya da dernek binasında ulaşabilirsiniz.') +
      '<section class="section"><div class="container grid-main"><div class="box"><iframe class="map" title="Çeşnigir-Der haritası" loading="lazy" ' +
      'src="https://www.google.com/maps?q=39.5765122,33.4357454&z=17&output=embed"></iframe></div>' +
      '<aside><div class="box box-pad"' + ed('dernek:kisiler') + '><h3>Bize Ulaşın</h3><ul class="facts">' +
      peopleRows(d) +
      (mail ? '<li><span>E-posta</span><a href="mailto:' + esc(mail) + '">' + esc(mail) + '</a></li>' : '') +
      '<li><span>Adres</span>' + esc(d.adres || 'Köprüköy, Keskin / Kırıkkale') + '</li>' +
      '<li><span>Konum</span><a href="' + MAP + '" target="_blank" rel="noopener">Haritada aç</a></li></ul></div></aside></div></section>';
  }

  /* ---------- Köy Meydanı (forum) ----------
     Köylülerin yazı paylaşıp birbirine cevap yazdığı bölüm. Yazılar Supabase'de durur (C.sb, kurulum: araclar/supabase-meydan.sql).
     Gönderilen her yazı ve cevap önce onaya düşer; yönetim panelinde onaylanınca burada görünür (yonetim/duzen.js).
     Liste ve yazı sayfası önce bellekteki son listeyle çizilir (geri dönünce kaldığı yerden açılsın), sonra yenisi gelir. */
  var M_AD = 'cd_meydan_ad', mKat = 'Tümü', mSeq = 0, mCache = null;
  function mAd() { try { return localStorage.getItem(M_AD) || ''; } catch (e) { return ''; } }
  function mAdKaydet(a) { try { localStorage.setItem(M_AD, a); } catch (e) { /* yok say */ } }
  function mParas(t) {
    return String(t || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('');
  }
  var AV_RENK = ['#7A2E1C', '#0B7A54', '#8A5A12', '#1F5F8B', '#6B4C8A', '#9A3B53'];
  function mAvatar(ad) {
    var w = String(ad || '').trim().split(/\s+/).filter(Boolean), ini = w.slice(0, 2).map(function (s) { return s.charAt(0); }).join('').toLocaleUpperCase('tr'), h = 0;
    for (var i = 0; i < (ad || '').length; i++) h = (h * 31 + ad.charCodeAt(i)) % 997;
    return '<span class="m-av" style="background:' + AV_RENK[h % AV_RENK.length] + '" aria-hidden="true">' + esc(ini || '?') + '</span>';
  }
  function mBy(x) { return '<p class="m-by">' + mAvatar(x.ad) + '<span><b>' + esc(x.ad) + '</b><span class="m-time">' + esc(C.zaman(x.created_at)) + '</span></span></p>'; }
  // Paylaşılan bağlantı …/?m=12 yazının sayfasını açar (openShared)
  function mShare(k) {
    var url = new URL(B || './', location.href.split(/[?#]/)[0]).href + '?m=' + k.id, text = 'KÖY MEYDANI: ' + k.baslik + '\n' + url;
    return '<div class="share"><span>Paylaş:</span><a class="s-wa" href="https://wa.me/?text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp</a>' +
      '<a class="s-fb" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">' + icon('fb') + 'Facebook</a></div>';
  }
  function mForm(tur, konuId, yk) {
    var yeni = tur === 'konu', L = tur === 'yorum' ? YL[yk] || YL.yorum : null;
    return '<form class="m-form" data-m-form="' + tur + '"' + (konuId ? ' data-konu="' + konuId + '"' : '') + ' novalidate>' +
      (yeni ? '' : '<h3 class="m-form-h">' + (L ? L.h : 'Cevap yazın') + '</h3>') +
      '<label class="m-l">Adınız ve soyadınız<input name="ad" autocomplete="name" maxlength="60" value="' + esc(mAd()) + '"></label>' +
      (yeni ? '<label class="m-l">Ne hakkında?<select name="kategori">' + C.MEYDAN.kategoriler.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') + '</select></label>' +
        '<label class="m-l">Başlık<input name="baslik" maxlength="120" placeholder="Örnek: Eski düğünlerimizden bir hatıra"></label>' : '') +
      '<label class="m-l">' + (yeni ? 'Yazınız' : L ? L.l : 'Cevabınız') + '<textarea name="metin" rows="' + (yeni ? 6 : 4) + '" maxlength="' + (yeni ? 4000 : 2000) + '"></textarea></label>' +
      '<label class="m-hp" aria-hidden="true">Web sitesi<input name="web" tabindex="-1" autocomplete="off"></label>' +
      '<p class="m-err" role="alert" hidden></p>' +
      '<button type="submit" class="btn">' + icon(yeni ? 'pen' : 'chat') + (yeni ? 'Gönder' : L ? L.b : 'Cevabı gönder') + '</button>' +
      '<p class="muted small m-note">Yazdıklarınız dernek yönetimi onayladıktan sonra sitede görünür.</p></form>';
  }
  function mFail() {
    return '<div class="box empty"><b>Yazılar şu anda açılamadı</b>İnternet bağlantınızı kontrol edip sayfayı yenileyin.</div>';
  }

  function mCard(k) {
    return '<article class="m-card' + (k.sabit ? ' pin' : '') + '" data-m-konu="' + k.id + '"' + (k.sabit ? ' data-sabit="1"' : '') + '>' +
      '<div class="news-meta">' + (k.sabit ? '<span class="badge m-pinned">Sabit</span>' : '') + '<span class="badge">' + esc(k.kategori) + '</span></div>' +
      '<h3><a class="ev-link" href="#/konu/' + k.id + '"><b>' + esc(k.baslik) + '</b></a></h3>' + mBy(k) +
      '<p class="m-ex">' + esc(excerpt(k.metin, 220)) + '</p>' +
      '<a class="m-replies" href="#/konu/' + k.id + '">' + icon('chat') + (k.cevap_sayisi ? k.cevap_sayisi + ' cevap · Oku ve cevap yaz' : 'Devamını oku ve cevap yaz') + '</a></article>';
  }
  function mListHtml() {
    if (!mCache) return '<p class="loading">Yazılar yükleniyor…</p>';
    var list = mKat === 'Tümü' ? mCache : mCache.filter(function (k) { return k.kategori === mKat; });
    return list.length ? '<div class="m-list">' + list.map(mCard).join('') + '</div>' :
      '<div class="box empty"><b>' + (mCache.length ? 'Bu başlıkta henüz yazı yok' : 'Henüz yazı yok') + '</b>İlk yazıyı siz paylaşın.</div>';
  }
  function mDrawn(sayfa) { realLinks(main); document.dispatchEvent(new CustomEvent('meydan:ciz', { detail: { sayfa: sayfa } })); }
  function pageForum() {
    var seq = ++mSeq;
    setTimeout(function () {
      C.sb('/forum_konular?select=id,kategori,baslik,metin,ad,sabit,cevap_sayisi,son_hareket,created_at&order=sabit.desc,son_hareket.desc&limit=300')
        .then(function (r) { mCache = C.arr(r); }, function () { if (!mCache) mCache = false; })
        .then(function () {
          var b = $('mList'); if (seq !== mSeq || !b) return;
          b.innerHTML = mCache === false ? mFail() : mListHtml();
          mDrawn('meydan');
        });
    }, 0);
    var kats = ['Tümü'].concat(C.MEYDAN.kategoriler);
    return band('Köy Meydanı', 'Hatıranızı, sorunuzu, gurbetten selamınızı paylaşın; köylülerimizle sohbet edin.') +
      '<section class="section"><div class="container m-wrap"><div class="m-main">' +
      '<details class="m-new"><summary class="btn">' + icon('pen') + 'Yeni yazı paylaş</summary><div class="box box-pad">' + mForm('konu') + '</div></details>' +
      '<div class="filters" role="group" aria-label="Yazıların konusu">' + kats.map(function (t) {
        return '<button type="button" data-m-kat="' + esc(t) + '" aria-pressed="' + (t === mKat) + '">' + esc(t) + '</button>';
      }).join('') + '</div>' +
      '<div id="mList">' + (mCache === false ? '<p class="loading">Yazılar yükleniyor…</p>' : mListHtml()) + '</div></div>' +
      '<aside class="m-side"><div class="box box-pad m-rules"><h3>Meydanın kuralları</h3><ul>' +
      '<li>Adınızı ve soyadınızı yazın.</li><li>Saygılı bir dil kullanın; kırıcı söz, siyaset ve kavga yok.</li>' +
      '<li>Telefon, adres gibi kişisel bilgileri paylaşmayın.</li><li>Her yazı ve cevap, dernek yönetimi onayladıktan sonra yayınlanır.</li></ul>' +
      '<p class="small muted" style="margin:10px 0 0">Satılık ve aranan şeyler için <a href="#/pazar">Market</a> sayfasına bakın.</p></div></aside>' +
      '</div></section>';
  }

  function mReply(c) { return '<div class="m-rep" data-m-cevap="' + c.id + '">' + mBy(c) + '<div class="m-rep-text">' + mParas(c.metin) + '</div></div>'; }
  function mTopicHtml(k) {
    return '<article class="m-art" data-m-konu="' + k.id + '"' + (k.sabit ? ' data-sabit="1"' : '') + '>' +
      '<div class="news-meta">' + (k.sabit ? '<span class="badge m-pinned">Sabit</span>' : '') + '<span class="badge">' + esc(k.kategori) + '</span></div>' +
      '<h1>' + esc(k.baslik) + '</h1>' + mBy(k) + '<div class="article-text">' + mParas(k.metin) + '</div>' + mShare(k) + '</article>' +
      '<section class="m-rep-sec"><h2 class="m-rep-h">Cevaplar</h2><div id="mReps"><p class="muted">Cevaplar yükleniyor…</p></div><div id="mPend"></div>' +
      '<div class="box box-pad">' + mForm('cevap', k.id) + '</div></section>' +
      '<p style="margin-top:24px"><a class="btn btn-light" href="#/meydan">‹ Köy Meydanı</a></p>';
  }
  function pageTopic(id) {
    var seq = ++mSeq, k = /^\d+$/.test(id) && mCache ? mCache.filter(function (x) { return String(x.id) === id; })[0] : null;
    var gone = band('Yazı bulunamadı') + '<section class="section"><div class="container"><p>Bu yazı kaldırılmış ya da henüz onaylanmamış olabilir.</p><a class="btn" href="#/meydan">Köy Meydanı</a></div></section>';
    if (!/^\d+$/.test(id)) return gone;
    setTimeout(function () {
      Promise.all([
        k ? Promise.resolve([k]) : C.sb('/forum_konular?id=eq.' + id + '&select=id,kategori,baslik,metin,ad,sabit,cevap_sayisi,son_hareket,created_at'),
        C.sb('/forum_cevaplar?konu_id=eq.' + id + '&select=id,metin,ad,created_at&order=created_at.asc&limit=500')
      ]).then(function (r) {
        if (seq !== mSeq) return;
        var x = C.arr(r[0])[0], box = $('mTopic');
        if (!box) return;
        if (!x) { main.innerHTML = gone; realLinks(main); return; }
        if (!box.querySelector('[data-m-konu]')) { box.innerHTML = mTopicHtml(x); document.title = x.baslik + ' · Köy Meydanı · Çeşnigir-Der'; }
        var reps = C.arr(r[1]);
        $('mReps').innerHTML = reps.length ? '<div class="m-reps">' + reps.map(mReply).join('') + '</div>' : '<p class="muted">Henüz cevap yok. İlk cevabı siz yazın.</p>';
        box.querySelector('.m-rep-h').textContent = reps.length ? 'Cevaplar (' + reps.length + ')' : 'Cevaplar';
        mDrawn('konu');
      }).catch(function () {
        var box = $('mTopic'); if (seq !== mSeq || !box) return;
        if (box.querySelector('#mReps')) $('mReps').innerHTML = '<p class="muted">Cevaplar şu anda açılamadı. Sayfayı yenileyin.</p>';
        else box.innerHTML = mFail();
      });
    }, 0);
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/meydan">Köy Meydanı</a></div></div></div>' +
      '<section class="section"><div class="container"><div class="article m-topic" id="mTopic">' + (k ? mTopicHtml(k) : '<p class="loading">Yükleniyor…</p>') + '</div></div></section>';
  }

  function mThanks(tur) {
    return '<div class="m-thanks" role="status"><b>Teşekkürler, ' + ({ konu: 'yazınız', cevap: 'cevabınız', yorum: 'mesajınız' }[tur]) + ' alındı.</b>' +
      '<p>Dernek yönetimi onayladıktan sonra burada görünecek.</p>' +
      '<button type="button" class="btn btn-light" data-m-again="' + tur + '">' + ({ konu: 'Bir yazı daha yaz', cevap: 'Bir cevap daha yaz', yorum: 'Bir mesaj daha yaz' }[tur]) + '</button></div>';
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('form[data-m-form]');
    if (!f) return;
    e.preventDefault();
    var tur = f.getAttribute('data-m-form'), v = {}, err = f.querySelector('.m-err'), btn = f.querySelector('button[type=submit]');
    ['ad', 'kategori', 'baslik', 'metin', 'web'].forEach(function (n) { if (f.elements[n]) v[n] = f.elements[n].value.trim(); });
    function hata(t, n) { err.textContent = t; err.hidden = false; if (n && f.elements[n]) f.elements[n].focus(); }
    if (v.ad.length < 3) return hata('Lütfen adınızı ve soyadınızı yazın.', 'ad');
    if (tur === 'konu' && v.baslik.length < 3) return hata('Lütfen yazınıza bir başlık yazın.', 'baslik');
    if (v.metin.length < 2) return hata(tur === 'konu' ? 'Lütfen yazınızı yazın.' : tur === 'cevap' ? 'Lütfen cevabınızı yazın.' : 'Lütfen mesajınızı yazın.', 'metin');
    err.hidden = true;
    mAdKaydet(v.ad);
    var label = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    var done = function () { var t = document.createElement('div'); t.innerHTML = mThanks(tur); f.parentNode.replaceChild(t.firstChild, f); };
    if (v.web) { done(); return; }   // yalnız otomatik programların doldurduğu gizli alan
    var ys = f.closest('.y-sec');
    var body = tur === 'konu' ? { ad: v.ad, kategori: v.kategori, baslik: v.baslik, metin: v.metin } :
      tur === 'yorum' ? { ad: v.ad, metin: v.metin, hedef_tur: ys.getAttribute('data-y'), hedef: ys.getAttribute('data-yh'), hedef_baslik: (ys.getAttribute('data-yb') || '').slice(0, 200) } :
      { ad: v.ad, metin: v.metin, konu_id: +f.getAttribute('data-konu') };
    C.sb({ konu: '/forum_konular', cevap: '/forum_cevaplar', yorum: '/yorumlar' }[tur], { method: 'POST', headers: { Prefer: 'return=minimal' }, body: body })
      .then(done).catch(function (er) {
        btn.disabled = false; btn.innerHTML = label;
        hata(er && er.status === 'net' ? 'İnternet bağlantısı yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.' :
          er && /çok fazla/.test(er.message || '') ? er.message : 'Gönderilemedi. Lütfen biraz sonra tekrar deneyin.');
      });
  });
  document.addEventListener('click', function (e) {
    var k = e.target.closest('[data-m-kat]');
    if (k) {
      mKat = k.getAttribute('data-m-kat');
      main.querySelectorAll('[data-m-kat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === k)); });
      var l = $('mList'); if (l && mCache) { l.innerHTML = mListHtml(); mDrawn('meydan'); }
      return;
    }
    var a = e.target.closest('[data-m-again]');
    if (a) {
      var tur = a.getAttribute('data-m-again'), konu = main.querySelector('[data-m-konu]'), ys = a.closest('.y-sec');
      var t = document.createElement('div'); t.innerHTML = mForm(tur, tur === 'cevap' && konu ? konu.getAttribute('data-m-konu') : null, ys ? ys.getAttribute('data-yk') : null);
      var f = t.firstChild; a.parentNode.parentNode.replaceChild(f, a.parentNode);
      var inp = f.elements[tur === 'konu' ? 'baslik' : 'metin']; if (inp) inp.focus();
    }
  });

  /* ---------- Yorumlar: haberlere (duyurular), etkinliklere ve fotoğraflara ----------
     Köy Meydanı ile aynı düzen: yorumlar Supabase'de (yorumlar tablosu), her yorum önce onaya düşer.
     Vefat ilanında "Başsağlığı dilekleri", düğün ve nişanda "Tebrik ve dilekler" olarak görünür.
     Fotoğrafın kendi sayfası var (#/foto/<dosya adı>): büyük fotoğraf, önceki/sonraki ve yorumlar. */
  var YL = {
    yorum: { t: 'Yorumlar', h: 'Yorum yazın', l: 'Yorumunuz', b: 'Yorumu gönder', bos: 'Henüz yorum yok. İlk yorumu siz yazın.' },
    vefat: { t: 'Başsağlığı dilekleri', h: 'Başsağlığı dileyin', l: 'Mesajınız', b: 'Gönder', bos: 'Henüz mesaj yok.' },
    tebrik: { t: 'Tebrik ve dilekler', h: 'Tebrik edin', l: 'Mesajınız', b: 'Gönder', bos: 'Henüz mesaj yok. İlk tebriği siz yazın.' }
  };
  function yKind(tur) { return tur === 'Vefat' ? 'vefat' : tur === 'Düğün' || tur === 'Nişan' ? 'tebrik' : 'yorum'; }
  // Fotoğrafın kimliği: dosya adı (images/galeri/kopru-gunbatimi.jpg -> kopru-gunbatimi)
  function fKey(x) { return String(x.foto || '').split('?')[0].split('/').pop().replace(/\.[a-z0-9]+$/i, ''); }
  function yBox(tur, hedef, baslik, kayitTuru) {
    var k = yKind(kayitTuru), L = YL[k];
    return '<section class="y-sec" data-y="' + tur + '" data-yh="' + esc(hedef) + '" data-yb="' + esc(baslik || '') + '" data-yk="' + k + '">' +
      '<h2 class="m-rep-h">' + esc(L.t) + '</h2><div class="y-list"><p class="muted">Yükleniyor…</p></div><div class="y-pend"></div>' +
      '<div class="box box-pad">' + mForm('yorum', null, k) + '</div></section>';
  }
  function yItem(c) { return '<div class="m-rep" data-y-id="' + c.id + '">' + mBy(c) + '<div class="m-rep-text">' + mParas(c.metin) + '</div></div>'; }
  function yLoad(page) {
    var s = main.querySelector('.y-sec');
    if (!s) return;
    var seq = ++mSeq, L = YL[s.getAttribute('data-yk')] || YL.yorum;
    C.sb('/yorumlar?hedef_tur=eq.' + s.getAttribute('data-y') + '&hedef=eq.' + encodeURIComponent(s.getAttribute('data-yh')) + '&select=id,ad,metin,created_at&order=created_at.asc&limit=500')
      .then(function (r) {
        if (seq !== mSeq || !s.isConnected) return;
        r = C.arr(r);
        s.querySelector('.y-list').innerHTML = r.length ? '<div class="m-reps">' + r.map(yItem).join('') + '</div>' : '<p class="muted">' + esc(L.bos) + '</p>';
        s.querySelector('.m-rep-h').textContent = L.t + (r.length ? ' (' + r.length + ')' : '');
        mDrawn(page);
      }, function () { if (s.isConnected) s.querySelector('.y-list').innerHTML = ''; });
  }
  // Kartlardaki yorum sayısı (duyuru, etkinlik, fotoğraf): yayındaki bütün yorumların yalnız hedefleri okunur, iki dakika saklanır
  var yCount = null, yCountT = 0, yCountP = null;
  function yCounts() {
    if (yCount && Date.now() - yCountT < 120000) return Promise.resolve(yCount);
    if (!yCountP) yCountP = C.sb('/yorumlar?select=hedef_tur,hedef&limit=10000').then(function (r) {
      var c = {}; C.arr(r).forEach(function (y) { var k = y.hedef_tur + ':' + y.hedef; c[k] = (c[k] || 0) + 1; });
      yCount = c; yCountT = Date.now(); yCountP = null; return c;
    }, function (e) { yCountP = null; throw e; });
    return yCountP;
  }
  function yBadges() {
    if (!main.querySelector('[data-yc]')) return;
    yCounts().then(function (c) {
      main.querySelectorAll('[data-yc]').forEach(function (el) {
        var n = c[el.getAttribute('data-yc')];
        if (!n || el.querySelector('.y-n')) return;
        var b = '<span class="y-n" title="' + n + ' yorum">' + icon('chat') + n + '</span>';
        var at = el.classList.contains('news') ? el.querySelector('.news-meta') : el.classList.contains('ev') ? el.querySelector('.ev-info .muted') : el;
        if (at) at.insertAdjacentHTML('beforeend', b);
      });
    }).catch(function () { /* sayı görünmez, o kadar */ });
  }
  function pagePhoto(key) {
    var list = data.galeri, i = -1;
    list.some(function (x, j) { if (fKey(x) === key) { i = j; return true; } return false; });
    if (i < 0) return band('Fotoğraf bulunamadı') + '<section class="section"><div class="container"><p>Bu fotoğraf kaldırılmış olabilir.</p><a class="btn" href="#/fotograflar">Tüm fotoğraflar</a></div></section>';
    var x = list[i], n = list.length, prev = list[(i - 1 + n) % n], next = list[(i + 1) % n], cap = x.aciklama || '';
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/fotograflar">Fotoğraflar</a></div></div></div>' +
      '<section class="section"><div class="container"><article class="article">' +
      '<button type="button" class="article-img" data-gal="' + i + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(img(x.foto)) + '" alt="' + esc(cap || 'Fotoğraf') + '" style="aspect-ratio:auto;object-fit:contain"></button>' +
      (cap ? '<h1 class="f-cap">' + esc(cap) + '</h1>' : '<h1 class="f-cap">Fotoğraf ' + (i + 1) + ' / ' + n + '</h1>') +
      (n > 1 ? '<div class="btn-row"><a class="btn btn-light" href="#/foto/' + encodeURIComponent(fKey(prev)) + '">‹ Önceki fotoğraf</a>' +
        '<a class="btn btn-light" href="#/foto/' + encodeURIComponent(fKey(next)) + '">Sonraki fotoğraf ›</a></div>' : '') +
      yBox('foto', key, cap || 'Fotoğraf') +
      '<p style="margin-top:24px"><a class="btn btn-light" href="#/fotograflar">‹ Tüm fotoğraflar</a></p></article></div></section>';
  }

  /* ---------- yönlendirme ---------- */
  /* Arama motorları için her sayfanın gerçek bir adresi vardır (hakkimizda/, duyurular/, p/d-…html; araclar/site-sayfalari.js üretir).
     Sayfadaki #/… bağlantıları bu adresleri gösterir (data-h asıl hedefi tutar); dokununca sayfa yenilenmeden geçilir. */
  var REAL = { 'gezilecek-yerler': 1, hakkimizda: 1, duyurular: 1, etkinlikler: 1, fotograflar: 1, iletisim: 1 };
  function realHref(hash) {
    var r = hash.replace(/^#\/?/, ''), p = r.split('/');
    if (!r) return B || './';
    if (p.length === 1 && REAL[r]) return B + r + '/';
    if (p.length === 2 && (p[0] === 'duyuru' || p[0] === 'etkinlik') && /^[a-z0-9-]+$/.test(p[1])) return B + 'p/' + p[0].charAt(0) + '-' + p[1] + '.html';
    return '';
  }
  function realLinks(root) {
    if (E) return;   // düzenleme modunda sayfa yonetim/ içinde kalır
    root.querySelectorAll('a[href^="#/"]').forEach(function (a) {
      var h = a.getAttribute('href'), r = realHref(h);
      if (r) { a.setAttribute('data-h', h); a.setAttribute('href', r); }
    });
  }
  var TITLES = {
    '': 'Çeşnigir-Der · Köprüköy Çeşnigir Derneği (Keskin, Kırıkkale)',
    hakkimizda: 'Köprüköy ve Çeşnigir Köprüsü\'nün tarihi · Çeşnigir-Der',
    'gezilecek-yerler': 'Çeşnigir Köprüsü ve Kanyonu: Kırıkkale\'de gezilecek yerler · Köprüköy',
    duyurular: 'Köprüköy, Keskin ve Kırıkkale haberleri ve duyurular · Çeşnigir-Der',
    etkinlikler: 'Köprüköy etkinlik takvimi: düğün, mevlit ve özel günler · Çeşnigir-Der',
    fotograflar: 'Köprüköy ve Çeşnigir Köprüsü fotoğrafları · Çeşnigir-Der',
    iletisim: 'İletişim · Çeşnigir-Der, Köprüköy (Keskin, Kırıkkale)',
    meydan: 'Köy Meydanı: Köprüköylülerin sohbet ve hatıra köşesi · Çeşnigir-Der'
  };
  function route() {
    // adreste #/… yoksa üretilmiş sayfanın kendi içeriği (CD_ROUTE) açılır
    var h = location.hash.indexOf('#/') === 0 ? location.hash.replace(/^#\/?/, '') : (window.CD_ROUTE || ''), p = h.split('/'), html;
    var page = p[0] || '';
    if (page === 'duyuru') html = pageArticle(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'duyurular') html = pageNews();
    else if (page === 'etkinlikler') html = pageEvents();
    else if (page === 'etkinlik') html = pageEvent(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'fotograflar') html = pagePhotos();
    else if (page === 'pazar') html = pageMarket();
    else if (page === 'ilan') html = pageListing(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'hakkimizda') html = pageAbout();
    else if (page === 'koyumuz') { page = 'hakkimizda'; html = pageAbout(); }
    else if (page === 'gezilecek-yerler' || page === 'gezi') { page = 'gezilecek-yerler'; html = pageGezi(); }
    else if (page === 'iletisim') html = pageContact();
    else if (page === 'meydan') html = pageForum();
    else if (page === 'foto') html = pagePhoto(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'konu') html = pageTopic(decodeURIComponent(p.slice(1).join('/')));
    else { page = ''; loadWeather(); html = pageHome(); }
    var hash = location.hash, back = !tapped && hash !== curHash && pos[hash] > 0;
    tapped = false; curHash = hash;
    main.innerHTML = html;
    realLinks(main);
    main.classList.remove('gir'); void main.offsetWidth; main.classList.add('gir');
    var navKey = page === 'duyuru' ? 'duyurular' : page === 'etkinlik' ? 'etkinlikler' : page === 'ilan' ? 'pazar' : page === 'konu' ? 'meydan' : page === 'foto' ? 'fotograflar' : page;
    if (page === 'etkinlik' || page === 'ilan' || page === 'duyuru') { var sp = main.querySelector('[data-share-photo]'); if (sp) C.warmShare(sp.getAttribute('data-share-photo')); }
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    closeMenu();
    // geri tuşuyla dönülen sayfa kaldığı yerden açılır; bağlantıya dokunulunca en baştan
    var y = back ? pos[hash] : (E && E.keep ? window.pageYOffset : 0);
    window.scrollTo(0, y);
    if (back) requestAnimationFrame(function () { window.scrollTo(0, y); });
    headerPhoto();
    var t = main.querySelector('h1');
    document.title = TITLES[page] || (t ? t.textContent + ' · Çeşnigir-Der, Köprüköy' : TITLES['']);
    if (E) E.after(page);
    yLoad(page); yBadges();
  }

  // Başlığın arkasındaki köprü fotoğrafı: ana sayfada büyük fotoğraf başlığın altına girdikçe, kaydırmayla aynı hızda belirir
  // (site.css, --hf). Ani bir geçiş yok: fotoğrafın ne kadarı başlığın altına girdiyse o kadar görünür.
  var hfTick = false, hfLast = -1;
  function headerPhoto() {
    if (hfTick) return; hfTick = true;
    requestAnimationFrame(function () {
      hfTick = false;
      var hero = document.querySelector('.hero'), k = 1;
      if (hero) {
        var r = hero.getBoundingClientRect(), b = document.querySelector('.header').getBoundingClientRect().bottom;
        k = r.height ? Math.min(1, Math.max(0, (b - r.top) / r.height)) : 0;
        k = k * k * (3 - 2 * k);   // başta ve sonda yumuşak
      }
      k = Math.round(k * 100) / 100;
      if (k !== hfLast) { hfLast = k; document.documentElement.style.setProperty('--hf', k); }
    });
  }

  function setMenu(open) {
    var b = $('menuBtn');
    $('nav').classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    b.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu'); b.querySelector('span').textContent = open ? 'Kapat' : 'Menü';
  }
  function closeMenu() { if ($('nav').classList.contains('open')) setMenu(false); }

  function renderChrome() {
    var d = data.dernek, tel = C.telHref(d.telefon);
    var f = '';
    if (d.adres) f += '<div>' + esc(d.adres) + '</div>';
    f += people(d);
    if (/@/.test(d.eposta || '')) f += '<div><a href="mailto:' + esc(d.eposta) + '">' + esc(d.eposta) + '</a></div>';
    f += '<div><a href="' + MAP + '" target="_blank" rel="noopener">Haritada göster</a></div>';
    $('footContact').innerHTML = f;
    $('yil').textContent = new Date().getFullYear();
  }

  /* ---------- fotoğraf görüntüleyici ---------- */
  var vList = [], vIdx = 0, last = null;
  function openV(list, i) { vList = list; last = document.activeElement; $('viewer').hidden = false; document.body.style.overflow = 'hidden';
    $('vPrev').hidden = $('vNext').hidden = list.length < 2; showV(i); $('vClose').focus(); }
  function showV(i) { var n = vList.length; vIdx = (i + n) % n; var x = vList[vIdx];
    $('vImg').src = x.src; $('vImg').alt = x.cap || ''; $('vCap').textContent = x.cap || ''; $('vCount').textContent = n > 1 ? (vIdx + 1) + ' / ' + n : '';
    // galerideki fotoğrafta "Yorumlar" düğmesi: fotoğrafın sayfasını açar (yorumlar orada)
    var vc = $('vCom');
    if (!vc) { $('vClose').insertAdjacentHTML('beforebegin', '<a id="vCom" class="viewer-com" href="#/">' + icon('chat') + '<span></span></a>'); vc = $('vCom'); }
    vc.hidden = !x.key || (location.hash === '#/foto/' + encodeURIComponent(x.key));
    if (x.key) {
      vc.setAttribute('href', '#/foto/' + encodeURIComponent(x.key));
      var cnt = yCount && yCount['foto:' + x.key];
      vc.querySelector('span').textContent = cnt ? 'Yorumlar (' + cnt + ')' : 'Yorum yaz';
    } }
  function closeV() { $('viewer').hidden = true; $('vImg').removeAttribute('src'); document.body.style.overflow = '';
    if (last && last.focus) { try { last.focus(); } catch (e) { /* yok say */ } } }

  /* ---------- canlı görüntü: küçük / büyük ---------- */
  // Telefon/tablette (Android gibi destekleyen tarayıcılarda) gerçek tam ekrana geçer ve yatay çevirmeyi dener;
  // desteklemeyen tarayıcılarda (ör. iPhone) karartmalı büyük görünüm kullanılır.
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function liveBig(on) {
    var box = $('liveBox'); if (!box) return;
    var fr = box.querySelector('.live-frame');
    if (!on && fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* yok say */ } }
    box.classList.toggle('big', on);
    $('liveOpen').hidden = on; $('liveClose').hidden = !on;
    document.body.style.overflow = on ? 'hidden' : '';
    (on ? $('liveClose') : $('liveOpen')).focus();
    var req = fr && (fr.requestFullscreen || fr.webkitRequestFullscreen);
    if (on && req && window.matchMedia('(max-width:900px)').matches) {
      try {
        var pr = req.call(fr);
        var lock = function () { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) { /* yok say */ } };
        if (pr && pr.then) pr.then(lock, function () {}); else lock();
      } catch (e) { /* tam ekran olmazsa büyük görünüm yeter */ }
    }
  }
  function liveFsChange() {
    if (fsEl()) return;
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* yok say */ }
    var box = $('liveBox'); if (box && box.classList.contains('big')) liveBig(false);
  }

  function bind() {
    window.addEventListener('hashchange', route);
    // sayfadan çıkılırken büyük canlı görüntü açık kaldıysa kaydırma kilidini bırak
    window.addEventListener('hashchange', function () { if (!document.querySelector('.live-mini.big') && $('viewer').hidden) document.body.style.overflow = ''; });
    C.bindShare();
    document.addEventListener('fullscreenchange', liveFsChange); document.addEventListener('webkitfullscreenchange', liveFsChange);
    window.addEventListener('scroll', headerPhoto, { passive: true }); window.addEventListener('resize', headerPhoto);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('scroll', function () { pos[curHash] = window.pageYOffset; }, { passive: true });
    $('menuBtn').addEventListener('click', function () { setMenu(!$('nav').classList.contains('open')); });
    document.addEventListener('click', function (e) {
      // menü açıkken dışına dokunmak yalnızca menüyü kapatır
      if ($('nav').classList.contains('open') && !e.target.closest('.header')) { closeMenu(); e.preventDefault(); return; }
      if (e.target.closest('#liveOpen')) { liveBig(true); return; }
      // büyükken Kapat'a ya da oynatıcının dışındaki karanlık alana dokunmak küçültür
      if (e.target.closest('#liveClose') || (e.target.id === 'liveBox' && e.target.classList.contains('big'))) { liveBig(false); return; }
      if (e.target.closest('a[href^="#/"]')) { tapped = true; setTimeout(function () { tapped = false; }, 600); }
      if (e.target.closest('[data-tarih]')) filter = 'Tarihten';
      var dh = e.target.closest('a[data-h]');
      if (dh && !e.button && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault(); tapped = true; setTimeout(function () { tapped = false; }, 600);
        var to = dh.getAttribute('data-h');
        if (location.hash === to) route(); else location.hash = to;
        return;
      }
      var f = e.target.closest('[data-filter]');
      if (f) { filter = f.getAttribute('data-filter'); main.innerHTML = pageNews(); realLinks(main); var b = main.querySelector('[data-filter="' + filter + '"]'); if (b) b.focus(); return; }
      var cn = e.target.closest('[data-cal-nav]');
      if (cn) { var dir = +cn.getAttribute('data-cal-nav'), dt = new Date(calY, calM + dir, 1); calY = dt.getFullYear(); calM = dt.getMonth();
        redrawCal('[data-cal-nav="' + dir + '"]'); return; }
      var cd = e.target.closest('[data-cal-day]');
      if (cd) { var ci = cd.getAttribute('data-cal-day'); calSel = calSel === ci ? '' : ci; redrawCal('[data-cal-day="' + ci + '"]'); return; }
      var g = e.target.closest('[data-gal]');
      if (g) { openV(data.galeri.map(function (x) { return { src: img(x.foto), cap: x.aciklama, key: fKey(x) }; }), +g.getAttribute('data-gal')); return; }
      if (e.target.closest('#vCom')) { closeV(); return; }
      var ph = e.target.closest('[data-photo]');
      if (ph) openV([{ src: ph.getAttribute('data-photo'), cap: ph.getAttribute('data-cap') }], 0);
    });
    $('vClose').addEventListener('click', closeV);
    $('vPrev').addEventListener('click', function () { showV(vIdx - 1); });
    $('vNext').addEventListener('click', function () { showV(vIdx + 1); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('nav').classList.contains('open')) { closeMenu(); $('menuBtn').focus(); return; }
      if (e.key === 'Escape' && $('liveBox') && $('liveBox').classList.contains('big')) { liveBig(false); return; }
      if ($('viewer').hidden) return;
      if (e.key === 'Escape') closeV();
      else if (e.key === 'ArrowLeft' && vList.length > 1) showV(vIdx - 1);
      else if (e.key === 'ArrowRight' && vList.length > 1) showV(vIdx + 1);
      else if (e.key === 'Tab') { var fs = [$('vCom'), $('vClose'), $('vPrev'), $('vNext')].filter(function (b) { return b && !b.hidden; });
        var k = fs.indexOf(document.activeElement); e.preventDefault(); fs[(k + (e.shiftKey ? fs.length - 1 : 1)) % fs.length].focus(); }
    });
    var sx = null, st = $('vImg').parentNode;
    st.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    st.addEventListener('touchend', function (e) { if (sx === null || vList.length < 2) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) showV(vIdx + (dx < 0 ? 1 : -1)); });
  }

  // Paylaşılan bağlantı (?e=…, ?i=…, ?d=…) ilgili sayfayı açar; adres çubuğu sade adrese döner
  (function openShared() {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var map = { e: 'etkinlik', i: 'ilan', d: 'duyuru', m: 'konu' };
    Object.keys(map).some(function (k) {
      var v = q.get(k); if (!v) return false;
      history.replaceState(null, '', location.pathname + '#/' + map[k] + '/' + encodeURIComponent(v));
      return true;
    });
  })();

  bind();
  Promise.all([load('duyurular', []), load('etkinlikler', []), load('resmi-gunler', {}), load('galeri', []), load('pazar', []), load('dernek', {})])
    .then(function (r) {
      data = {
        duyurular: C.arr(r[0]), etkinlikler: C.arr(r[1]),
        resmi: r[2] && typeof r[2] === 'object' ? r[2] : {},
        galeri: C.arr(r[3]).filter(function (x) { return img(x.foto); }), pazar: C.arr(r[4]),
        dernek: r[5] && typeof r[5] === 'object' && !Array.isArray(r[5]) ? r[5] : {}
      };
      renderChrome();
      realLinks(document);
      if (E) E.ready({
        data: function () { return data; },
        set: function (k, v) {
          if (k === 'galeri') v = C.arr(v).filter(function (x) { return img(x.foto); });
          else if (k === 'dernek') v = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
          else v = C.arr(v);
          data[k] = v;
          if (k === 'dernek') renderChrome();
        },
        route: route, evRow: evRow, eid: eid, iid: iid, pid: pid
      });
      route();
    });
})();
