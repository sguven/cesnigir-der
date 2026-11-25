/* Çeşnigir-Der · Tasarım 3
   Sayfalar: Ana Sayfa, Duyurular (ve ayrıntı), Etkinlikler, Sizden Gelenler (forum), Fotoğraflar, Market, Esnaf Rehberi, Gezilecek Yerler, Tarihimiz, Hakkımızda (iletişim bilgileri dahil).
   İçerik data/ klasöründen okunur; yönetim panelinden değişir. */

/* Ziyaretçi sayacı (GoatCounter): istatistikler https://cesnifirder.goatcounter.com
   Yalnız gerçek adreste (cesnigirder.org) sayar; bilgisayarda denerken saymaz. Panel (yonetim/) sayılmaz. */
(function () {
  if (!/(^|\.)cesnigirder\.org$/.test(location.hostname) || window.CD_EDIT) return;
  // Site sayfaları #/duyuru/… gibi adreslerle açılıyor; sayaçta her kayıt ayrı görünsün
  function yol() { return location.pathname + (location.hash.indexOf('#/') === 0 ? location.hash : ''); }
  // Kısa paylaşım bağlantısından (/d/…, /e/…, /i/…) gelen ziyareti ayrıca belirt
  var kaynak = /\/\/(www\.)?cesnigirder\.org\/[deir]\//.test(document.referrer) ? 'Paylaşılan bağlantı (WhatsApp/Facebook)' : undefined;
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
  var pos = {}, curHash = location.hash, tapped = false, ilkAcilis = true;   // sayfaların kaydırma yeri (geri dönünce kaldığı yerden)

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
  // noTel: yalnız isimler (Hakkımızda)
  function peopleRows(d, noTel) {
    return (d.baskan ? '<li><span>Dernek Başkanı</span>' + person(d.baskan, noTel ? '' : d.telefon) + '</li>' : (!noTel && d.telefon ? '<li><span>Dernek Başkanı</span>' + person('', d.telefon) + '</li>' : '')) +
      (d.baskan2 ? '<li><span>Başkan Yardımcısı</span>' + person(d.baskan2, noTel ? '' : d.telefon2) + '</li>' : (!noTel && d.telefon2 ? '<li><span>Başkan Yardımcısı</span>' + person('', d.telefon2) + '</li>' : ''));
  }
  function people(d) {
    return ((d.baskan || d.telefon) ? person(d.baskan, d.telefon) : '') + ((d.baskan2 || d.telefon2) ? person(d.baskan2, d.telefon2) : '');
  }
  // Düzenleme modunda kaydın hangi listede kaçıncı olduğunu işaretler (düzenle / sil düğmeleri için)
  // Duyurular dosyadaki sırayla (en son eklenen en üstte) gösterilir; "sabit": "Evet" olanlar (panelde "En üstte sabit dursun mu?") her zaman en üstte kalır
  function duyuruSirali() {
    var d = data.duyurular || [];
    var sabit = function (p) { return p.sabit === 'Evet' || p.sabit === true; };
    return d.filter(sabit).concat(d.filter(function (p) { return !sabit(p); }));
  }
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
  function rid(x) { return C.shareId('r', x); }
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

  // sade: ana sayfadaki kısa listede fotoğraf ve paylaş düğmeleri çıkmaz (etkinliğin sayfasında ve takvimde günü seçince görünür)
  function evRowSade(e) { return evRow(e, 0, true); }
  function evRow(e, _i, sade) {
    var p = C.parts(e.iso), until = C.untilText(e.iso), det = [e.saat, e.yer].filter(Boolean).join(' · ');
    return '<div class="ev' + (e.koy ? ' koy' : ' official') + '"' + (e.koy ? ek('etkinlikler', e.ix) + ' data-yc="etkinlik:' + esc(e.id) + '"' : '') + '><div class="ev-date" aria-hidden="true"><span>' + C.AY_KISA[p.m] + '</span><b>' + p.d +
      '</b><small>' + C.GUN[p.wd] + '</small></div><div class="ev-info">' + (until ? '<div class="ev-when">' + esc(until) + '</div>' : '') +
      (e.tur ? '<span class="' + C.badgeClass(e.tur) + '">' + esc(e.tur) + '</span> ' : '') +
      (e.koy ? '<a class="ev-link" href="#/etkinlik/' + esc(e.id) + '"><b>' + esc(e.ad) + '</b></a>' : '<b>' + esc(e.ad) + '</b>') +
      '<div class="muted">' + esc(C.longDate(e.iso, true)) + (det ? ' · ' + esc(det) : '') + '</div>' + (sade === true ? '' : evExtras(e, det)) + '</div></div>';
  }

  /* Fotoğraflar iki bölümdür: "kategori": "koy" (Köyümüzden) ya da "dernek" (Derneğimizden). Kategorisi yazmayan fotoğraf Köyümüzden sayılır. */
  var FOTO_KAT = { koy: ['Köyümüzden Fotoğraflar', 'Köyümüzden'], dernek: ['Derneğimizden Fotoğraflar', 'Derneğimizden'] };
  // alt yazısı: açıklama; köyün adı geçmiyorsa yeri eklenir (arama motorları ve ekran okuyucular için)
  function fAlt(x) { var a = x.aciklama || 'Köprüköy\'den bir fotoğraf'; return /Köprüköy/.test(a) ? a : a.replace(/\.?$/, '.') + ' Köprüköy, Keskin (Kırıkkale).'; }
  function fKat(x) { return x && x.kategori === 'dernek' ? 'dernek' : 'koy'; }
  // kat verilirse büyütülen fotoğrafın oklarla gezilmesi o bölümün fotoğraflarıyla sınırlı kalır (data-gk)
  function galleryGrid(list, cls, kat) {
    return '<div class="gal ' + (cls || '') + '"' + (kat ? ' data-gk="' + kat + '"' : '') + ed('galeri') + '>' + list.map(function (x) {
      var i = data.galeri.indexOf(x);
      return '<button type="button" data-gal="' + i + '" data-yc="foto:' + esc(fKey(x)) + '" aria-label="Fotoğrafı büyüt: ' + esc(x.aciklama) + '"><img src="' + esc(img(x.foto)) + '" alt="' + esc(fAlt(x)) + '" loading="lazy"></button>';
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
    h += '<div class="cal-detail" aria-live="polite">' + (sel.length ? '<h3>' + esc(C.longDate(calSel, true)) + '</h3>' + sel.map(function (x) { return evRow(x); }).join('')
      : '<p class="muted">Renkli bir güne dokunun, o günün ayrıntısı burada açılır.</p>') + '</div></div>';
    return h;
  }
  function redrawCal(focusSel) {
    var el = $('homeCal'); if (!el) return;
    el.outerHTML = calendar();
    var f = $('homeCal').querySelector(focusSel); if (f) f.focus();
  }

  /* Kısayollar: telefonda menü "Menü" düğmesinin arkasında kaldığı için ana sayfanın başında bölümlere tek dokunuşla geçilir
     (site.css: yalnız menünün kapalı olduğu genişlikte görünür). */
  var QI = {
    duyurular: '<path d="M4 10v4h3l6 4V6L7 10H4Z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
    etkinlikler: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    meydan: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/>',
    fotograflar: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
    pazar: '<path d="M4 9h16l-1 11H5L4 9Z"/><path d="M8 9a4 4 0 0 1 8 0"/>',
    rehber: '<path d="M4 10 5.5 4h13L20 10"/><path d="M4 10a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20"/>',
    'gezilecek-yerler': '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    tarihimiz: '<path d="M2 13Q12 5 22 13"/><path d="M3 12.3V19M21 12.3V19"/><path d="M7 19a5 5 0 0 1 10 0"/><path d="M1 19h5M18 19h5"/>',   // kemerli köprü
    hakkimizda: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5 6"/>'
  };
  function quickLinks() {
    var L = [['duyurular', 'Duyurular'], ['etkinlikler', 'Etkinlikler'], ['meydan', 'Sizden Gelenler'], ['fotograflar', 'Fotoğraflar'], ['pazar', 'Market'], ['rehber', 'Esnaf Rehberi'], ['gezilecek-yerler', 'Gezilecek Yerler'], ['tarihimiz', 'Tarihimiz'], ['hakkimizda', 'Hakkımızda']];
    return '<nav class="quick" aria-label="Kısayollar"><div class="container quick-in">' + L.map(function (x) {
      return '<a href="#/' + x[0] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + QI[x[0]] + '</svg><span>' + x[1] + '</span></a>';
    }).join('') + '</div></nav>';
  }

  /* ---------- sayfalar ---------- */
  function pageHome() {
    var d = data.dernek, news = duyuruSirali().slice(0, 4), ev = upcoming(45).slice(0, 4);
    // Canlı görüntü: karşılama bandının sağında küçük oynar; dokununca aynı oynatıcı ekranı kaplayacak kadar büyür
    // (oynatıcı yeniden yüklenmez, yalnızca boyutu değişir). Kapat, karanlık alana dokunmak ya da Esc eski hâline döndürür.
    // CANLI_VIDEO_GOSTER: YouTube oynatıcısı şimdilik gizli; yalnız "Köyden Canlı Görüntü · Yakında" yazısı görünür.
    // Videoyu geri açmak için bunu true yapın (adres data/dernek.json'daki canli_yayin alanında duruyor).
    var CANLI_VIDEO_GOSTER = false;
    var liveLabel = '<div class="live-label"><span class="live-dot" aria-hidden="true"></span>Köyden Canlı Görüntü' +
      (d.canli_not ? ' <span class="live-soon">' + esc(d.canli_not) + '</span>' : '') + '</div>';
    var live = CANLI_VIDEO_GOSTER ? C.ytEmbed(d.canli_yayin) : '', liveBox = live ? '<div class="live-mini" id="liveBox"' + ed('dernek:canli') + '>' + liveLabel +
      '<div class="live-frame">' + C.ytFrame(live) +
      '<button type="button" class="live-open" id="liveOpen" aria-label="Görüntüyü büyüt">' + (d.canli_not ? '' : '<span class="live-tag">CANLI</span>') + '<span class="live-zoom">⤢ Büyüt</span></button>' +
      '<button type="button" class="live-close" id="liveClose" hidden>✕ Kapat</button></div></div>' :
      (d.canli_yayin || d.canli_not) ? '<div class="live-mini"' + ed('dernek:canli') + '>' + liveLabel + '</div>' : '';
    var h = '<section class="hero"><img src="' + B + 'images/kapak.jpg?v=3" srcset="' + B + 'images/kapak-800.jpg 800w, ' + B + 'images/kapak-1200.jpg 1200w, ' + B + 'images/kapak.jpg?v=3 1926w" sizes="100vw" width="1926" height="817" fetchpriority="high" alt="Gün batımında Çeşnigir Köprüsü ve Türk bayrağı, üzerinde Çeşnigir-Der yazısı."></section>' +
      '<div class="welcome"><div class="container welcome-in" style="padding:22px 18px"><div><h1>Köprüköy\'e hoş geldiniz</h1>' +
      '<p>Köyümüzden duyurular, vefat ve düğün haberleri, etkinlikler ve fotoğraflar.</p></div>' +
      '<div class="welcome-side">' + (liveBox || (E ? '<div' + ed('dernek:canli') + '></div>' : '')) + radyoHtml() + '</div></div></div>' + quickLinks();

    h += '<section class="section"><div class="container grid-main"><div>' +
      '<div class="sec-head"' + ed('ekle:duyurular') + '><h2>Son Duyurular</h2><a href="#/duyurular">Tüm duyurular ›</a></div>' +
      (news.length ? '<div class="news-list">' + news.map(newsCard).join('') + '</div>' : '<div class="box empty"><b>Henüz duyuru yok</b></div>') +
      mSonKutu() +
      '</div><aside>' + wxBox() +
      '<div class="sec-head"' + ed('ekle:etkinlikler') + '><h2>Yaklaşan Günler</h2></div>' + calendar() +
      '<div class="box" style="margin-top:14px">' + (ev.length ? ev.map(evRowSade).join('') : '<div class="empty">Yaklaşan bir gün yok.</div>') + '</div>' +
      '<p style="margin:10px 0 0"><a href="#/etkinlikler" style="font-weight:700">Tüm takvim ›</a></p>' +
      '</aside></div></section>';

    var g = data.galeri.slice(0, 6);
    if (g.length || E) h += '<section class="section alt"><div class="container"><div class="sec-head"' + ed('ekle:galeri') + '><h2>Fotoğraflardan</h2><a href="#/fotograflar">Tüm fotoğraflar (' + data.galeri.length + ') ›</a></div>' +
      galleryGrid(g, 'strip') + '</div></section>';

    h += '<section class="section"><div class="container village"><img src="' + B + 'images/koprukoy-gol.jpg" alt="Göl kıyısından Köprüköy ve Çeşnigir Köprüsü." loading="lazy">' +
      '<div><div class="sec-head"><h2>Köyümüz Köprüköy</h2></div>' +
      '<p>Köyümüz adını Kızılırmak üzerindeki tarihi Çeşnigir Köprüsü\'nden alır. Selçuklu döneminden kalan on iki gözlü bu taş köprü, yüzyıllarca Ankara ile Kırşehir arasındaki yolun geçiş noktası oldu.</p>' +
      '<p class="muted">Kapulukaya Baraj Gölü kıyısında, Keskin\'e 25 km, Kırıkkale\'ye 37 km uzaklıktayız.</p>' +
      '<div class="btn-row"><a class="btn btn-light" href="#/tarihimiz">Köyümüz ve tarihçe</a><a class="btn btn-light" href="#/gezilecek-yerler">Gezilecek yerler</a></div></div></div></section>';
    return h;
  }

  var filter = 'Tümü', NEWS_STEP = 8, newsShown = NEWS_STEP;
  function pageNews() {
    var all = duyuruSirali();
    var types = ['Tümü'].concat(C.DUYURU_TURLERI.filter(function (t) { return all.some(function (p) { return p.tur === t; }); }));
    if (types.indexOf(filter) < 0) filter = 'Tümü';
    var list = filter === 'Tümü' ? all : all.filter(function (p) { return p.tur === filter; });
    // uzun liste telefonda bitmeyen bir sayfa olmasın: önce son 8 kayıt, gerisi düğmeyle açılır (düzenleme modunda hepsi görünür)
    var total = list.length, rest = (E || navigator.webdriver) ? 0 : Math.max(0, total - newsShown);   // navigator.webdriver: arama motoru sayfalarını üreten araç (site-sayfalari.js) bütün listeyi yazar
    if (rest) list = list.slice(0, newsShown);
    return band('Duyurular', 'Vefat, düğün ve toplantı ilanları, köyümüzden haberler ve köyümüzün tarihinden yazılar.') +
      '<section class="section"><div class="container"' + ed('ekle:duyurular') + '>' +
      (types.length > 2 ? '<div class="filters" role="group" aria-label="Duyuru türü">' + types.map(function (t) {
        return '<button type="button" data-filter="' + esc(t) + '" aria-pressed="' + (t === filter) + '">' + esc(t) + '</button>';
      }).join('') + '</div>' : '') +
      (list.length ? '<div class="news-list">' + list.map(newsCard).join('') + '</div>' : '<div class="box empty"><b>Henüz duyuru yok</b>Yeni duyurular burada görünecek.</div>') +
      (rest ? '<p class="more"><button type="button" class="btn btn-light" data-more>Daha fazla göster (' + rest + ' duyuru daha)</button></p>' : '') +
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
      '<div class="news-meta">' + (p.tur ? '<span class="' + C.badgeClass(p.tur) + '">' + esc(p.tur) + '</span>' : '') + (isTarih(p) && p.olay_tarihi ? '<span class="olay">' + esc(p.olay_tarihi) + '</span>' : '<span>' + esc(C.longDate(p.tarih, true)) + '</span>') + '</div>' +
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

  var evFilter = 'Tümü';
  function pageEvents() {
    var all = upcoming(365), h = '', cur = '';
    var koyVar = all.some(function (e) { return e.koy; }), resmiVar = all.some(function (e) { return !e.koy; });
    if (!(koyVar && resmiVar)) evFilter = 'Tümü';
    var list = evFilter === 'Tümü' ? all : all.filter(function (e) { return (evFilter === 'Köy etkinlikleri') === !!e.koy; });
    var chips = koyVar && resmiVar ? '<div class="filters" role="group" aria-label="Gün türü">' + ['Tümü', 'Köy etkinlikleri', 'Resmî ve dinî günler'].map(function (t) {
      return '<button type="button" data-evf="' + t + '" aria-pressed="' + (t === evFilter) + '">' + t + '</button>';
    }).join('') + '</div>' : '';
    list.forEach(function (e) {
      var p = C.parts(e.iso), key = C.AY[p.m] + ' ' + p.y;
      if (key !== cur) { if (cur) h += '</div>'; h += '<h2 class="month">' + esc(key) + '</h2><div class="box">'; cur = key; }
      h += evRow(e);
    });
    if (cur) h += '</div>';
    return band('Etkinlikler', 'Düğün, nişan, mevlit, toplantılar ve resmî günler.') +
      '<section class="section"><div class="container" style="max-width:860px"' + ed('ekle:etkinlikler') + '>' + chips + (h || '<div class="box empty"><b>Yaklaşan bir gün yok</b></div>') + '</div></section>';
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

  var fotoSekme = '';   // son açılan bölüm: fotoğraftan "Tüm fotoğraflar"a dönünce aynı bölüm açılır
  function pagePhotos(kat) {
    var say = { koy: 0, dernek: 0 };
    data.galeri.forEach(function (x) { say[fKat(x)]++; });
    if (!FOTO_KAT[kat]) kat = fotoSekme || 'koy';
    fotoSekme = kat;
    var list = data.galeri.filter(function (x) { return fKat(x) === kat; });
    var sekme = '<nav class="f-tabs" aria-label="Fotoğraf bölümleri">' + ['koy', 'dernek'].map(function (k) {
      return '<a class="f-tab" href="#/fotograflar/' + k + '"' + (k === kat ? ' aria-current="page"' : '') + '>' + FOTO_KAT[k][1] + ' <small>(' + say[k] + ')</small></a>';
    }).join('') + '</nav>';
    if (!E) setTimeout(fHazirla, 0);
    return band('Fotoğraflar', 'Köyümüzden ve derneğimizden kareler. Büyütmek için fotoğrafa dokunun; altındaki "Yorumlar" düğmesiyle yorum yazabilirsiniz.') +
      '<section class="section"><div class="container"' + ed('ekle:galeri') + '>' + sekme +
      (E ? '' : '<div id="fYeni" hidden></div>') +
      (list.length ? galleryGrid(list, '', kat) : '<div class="box empty"><b>Bu bölümde henüz fotoğraf yok</b>Yeni fotoğraflar burada görünecek.</div>') + '</div></section>';
  }

  /* ---------- Ziyaretçinin fotoğraf göndermesi ----------
     Fotoğraflar sayfasındaki "Fotoğraf gönderin" formu: ziyaretçi en çok 4 fotoğraf ekler
     (telefonda küçültülür, Supabase deposuna yüklenir), adını ve isterse fotoğrafta ne olduğunu yazar. İstek foto_istekleri tablosunda
     bekler (kurulum: araclar/supabase-meydan.sql); yönetici panelde onaylayınca fotoğraflar sitenin deposuna aktarılır ve
     data/galeri.json'a yazılır (yonetim/duzen.js: fotoYayinla). Tablo henüz kurulmadıysa form hiç gösterilmez. */
  var fVar = null;   // null: henüz bakılmadı · true: istek alınabiliyor · false: kurulum yok
  function fForm() {   // ziyaretçi bölüm seçmez: fotoğraf Köyümüzden'e gelir, yönetici onaylarken bölümü değiştirebilir
    return '<form class="m-form" data-f-form novalidate>' +
      mFotoAlan(true) +
      '<label class="m-l">Fotoğrafta ne var?<input name="aciklama" maxlength="200" placeholder="Örnek: 1985 yılında köy meydanı">' + '<span class="i-yardim">İsterseniz boş bırakın.</span></label>' +
      '<label class="m-l">Adınız ve soyadınız<input name="ad" autocomplete="name" maxlength="60" value="' + esc(mAd()) + '"></label>' +
      '<label class="m-hp" aria-hidden="true">Web sitesi<input name="web" tabindex="-1" autocomplete="off"></label>' +
      '<p class="m-err" role="alert" hidden></p>' +
      '<button type="submit" class="btn">' + KAMERA + 'Fotoğrafları gönder</button>' +
      '<p class="muted small m-note">Fotoğraflarınız dernek yönetimi onayladıktan sonra sitede görünür. Adınız fotoğrafın altında yazar. Lütfen yalnız kendi çektiğiniz ya da paylaşmaya izniniz olan fotoğrafları gönderin.</p></form>';
  }
  function fCiz() {
    var b = $('fYeni'); if (!b || !fVar) return;
    if (!b.firstChild) b.innerHTML = '<details class="m-new"><summary class="btn">' + KAMERA + 'Fotoğraf gönderin</summary><div class="box box-pad">' + fForm() + '</div></details>';
    b.hidden = false;
  }
  function fHazirla() {
    if (fVar !== null) { fCiz(); return; }
    C.sb('/foto_istekleri?select=id&limit=1').then(function () { fVar = true; fCiz(); }, function (e) { if (e && e.status !== 'net') fVar = false; });
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('form[data-f-form]');
    if (!f) return;
    e.preventDefault();
    var err = f.querySelector('.m-err'), btn = f.querySelector('button[type=submit]'), fotos = (f._fotos || []).slice();
    var ad = f.elements.ad.value.trim(), aciklama = f.elements.aciklama.value.trim();
    function hata(t, el) { err.textContent = t; err.hidden = false; if (el) el.focus(); }
    if (!fotos.length) return hata('Lütfen önce "Fotoğraf ekle" düğmesiyle en az bir fotoğraf seçin.', f.querySelector('.m-file'));
    if (ad.length < 3) return hata('Lütfen adınızı ve soyadınızı yazın.', f.elements.ad);
    err.hidden = true;
    mAdKaydet(ad);
    var label = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    var done = function () {
      fotos.forEach(function (x) { URL.revokeObjectURL(x.url); });
      var t = document.createElement('div');
      t.innerHTML = '<div class="m-thanks" role="status"><b>Teşekkürler, fotoğraflarınız alındı.</b><p>Dernek yönetimi onayladıktan sonra Fotoğraflar sayfasında görünecek.</p>' +
        '<button type="button" class="btn btn-light" data-f-again>Başka fotoğraf gönder</button></div>';
      f.parentNode.replaceChild(t.firstChild, f);
    };
    if (f.elements.web.value) { done(); return; }   // yalnız otomatik programların doldurduğu gizli alan
    mFotoGonder(fotos, btn).then(function (yollar) {
      btn.textContent = 'Gönderiliyor…';
      var body = { kategori: 'koy', ad: ad, fotolar: yollar };
      if (aciklama) body.aciklama = aciklama;
      return C.sb('/foto_istekleri', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: body });
    }).then(done).catch(function (er) {
      btn.disabled = false; btn.innerHTML = label;
      hata(er && er.status === 'net' ? 'İnternet bağlantısı yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.' :
        er && er.foto ? 'Fotoğraf yüklenemedi. Biraz sonra tekrar deneyin. (Hata F' + er.status + (er.message ? ': ' + er.message : '') + ')' :
        er && /çok fazla/.test(er.message || '') ? er.message : 'Gönderilemedi. Lütfen biraz sonra tekrar deneyin.' + (er && er.status ? ' (Hata ' + er.status + ')' : ''));
    });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-f-again]');
    if (!a) return;
    var t = document.createElement('div'); t.innerHTML = fForm();
    a.parentNode.parentNode.replaceChild(t.firstChild, a.parentNode);
  });

  // İlan sahibine ulaşma düğmeleri ve ilanın paylaşım bilgisi
  function mkContact(x, mesaj) {
    var tel = C.telHref(x.telefon), wa = C.waHref(x.telefon, mesaj || (x.baslik || '') + ' ilanı için yazıyorum.');
    return (tel || wa) ? '<div class="btn-row" style="margin-top:6px">' + (tel ? '<a class="btn" href="tel:' + esc(tel) + '">' + icon('phone') + 'Ara</a>' : '') +
      (wa ? '<a class="btn btn-green" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp\'tan yaz</a>' : '') + '</div>' : '';
  }
  function mkShare(x) { return { key: 'i', id: iid(x), tur: x.tur, title: x.baslik, det: x.fiyat ? x.fiyat + ' ₺' : '', photo: img(x.foto) }; }

  // Tek ilanın sayfası: paylaşılan bağlantı buraya gelir
  function pageListing(id) {
    var x = data.pazar.filter(function (v) { return iid(v) === id; })[0];
    if (!x) return band('İlan bulunamadı') + '<section class="section"><div class="container"><p>Bu ilan kaldırılmış olabilir.</p><a class="btn" href="#/pazar">Tüm ilanlar</a></div></section>';
    var src = img(x.foto), ekF = C.arr(x.fotolar).map(function (f) { return img(f.foto); }).filter(Boolean);   // ek fotoğraflar (ziyaretçinin gönderdiği ilanlarda)
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/pazar">Market</a></div></div></div>' +
      '<section class="section"><div class="container"><article class="article"' + ek('pazar', data.pazar.indexOf(x)) + '>' +
      '<div class="news-meta">' + (x.tur ? '<span class="' + C.badgeClass(x.tur) + '">' + esc(x.tur) + '</span>' : '') + '<span>' + esc(C.longDate(x.tarih)) + '</span></div>' +
      '<h1>' + esc(x.baslik) + '</h1>' + (x.fiyat ? '<div class="mk-price" style="margin:-6px 0 12px">' + esc(x.fiyat) + ' ₺</div>' : '') +
      (src ? '<button type="button" class="article-img" data-photo="' + esc(src) + '" data-cap="' + esc(x.baslik) + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(src) + '" alt="' + esc(x.baslik) + '"></button>' : '') +
      (ekF.length ? '<div class="mk-fotos">' + ekF.map(function (s, i) {
        return '<button type="button" data-photo="' + esc(s) + '" data-cap="' + esc(x.baslik) + '" aria-label="Fotoğrafı büyüt (' + (i + 2) + ' / ' + (ekF.length + 1) + ')"><img src="' + esc(s) + '" alt="' + esc(x.baslik) + ': fotoğraf ' + (i + 2) + '" loading="lazy"></button>';
      }).join('') + '</div>' : '') +
      '<div class="article-text">' + (x.aciklama ? mParas(x.aciklama) : '') + (x.kisi ? '<p class="muted">İlan sahibi: ' + esc(x.kisi) + '</p>' : '') + '</div>' +
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
    }).join('') + '</div>' : '<div class="box empty"><b>Şu anda ilan yok</b><span id="iBos">İlan vermek isterseniz derneği arayın.' +
      (dtel ? '<p style="margin:14px 0 0"><a class="btn" href="tel:' + esc(dtel) + '">' + icon('phone') + 'Derneği Ara</a></p>' : '') + '</span></div>';
    if (!E) setTimeout(function () { iHazirla('ilan'); }, 0);
    return band('Market ve Yardımlaşma', 'Köyümüzden satılık ürünler, aranan şeyler ve yardım istekleri.') +
      '<section class="section"><div class="container"' + ed('ekle:pazar') + '>' + (E ? '' : '<div id="iYeni" hidden></div>') + body + '</div></section>';
  }

  /* ---------- Esnaf Rehberi: dükkân, restoran, sanayi, okul gibi işletmelerin kartları ----------
     Kayıtlar data/rehber.json'da durur (tur, baslik = işletmenin adı, aciklama, adres, kisi, telefon, link, foto, fotolar).
     Kartvizit bütün görünsün diye kart fotoğrafı kırpılmaz. Ziyaretçi kendi işletmesini "İşletmenizi ekleyin" formuyla gönderir (aşağıda). */
  var rKat = 'Tümü';
  function rShare(x) { return { key: 'r', id: rid(x), tur: x.tur, title: x.baslik, det: x.adres || '', photo: img(x.foto) }; }
  function rMesaj(x) { return 'Merhaba, ' + (x.baslik || 'işletmenizi') + ' kaydını Çeşnigir-Der sitesinde gördüm.'; }
  function rLink(x, big) {
    var u = C.linkUrl(x.link); if (!u) return '';
    var insta = /instagram\.com/i.test(u), fb = /facebook\.com/i.test(u);
    return '<a class="btn btn-light' + (big ? '' : ' rh-link') + '" href="' + esc(u) + '" target="_blank" rel="noopener">' + icon('link') + (insta ? 'Instagram' : fb ? 'Facebook sayfası' : 'Web sitesi') + '</a>';
  }
  function rAdres(x) { return x.adres ? '<p class="rh-adres">' + icon('pin') + '<span>' + esc(x.adres) + '</span></p>' : ''; }
  function rListHtml() {
    var all = byDate(data.rehber, -1), list = rKat === 'Tümü' ? all : all.filter(function (x) { return x.tur === rKat; });
    return list.map(function (x) {
      var src = img(x.foto), id = esc(rid(x));
      return '<article class="box mk rh"' + ek('rehber', data.rehber.indexOf(x)) + '>' +
        (src ? '<a class="rh-img" href="#/isletme/' + id + '" tabindex="-1" aria-hidden="true"><img src="' + esc(src) + '" alt="" loading="lazy"></a>' : '') +
        '<div class="box-pad">' + (x.tur ? '<div class="news-meta"><span class="badge">' + esc(x.tur) + '</span></div>' : '') +
        '<h3><a class="ev-link" href="#/isletme/' + id + '"><b>' + esc(x.baslik) + '</b></a></h3>' + rAdres(x) +
        (x.aciklama ? '<p class="rh-acik">' + esc(excerpt(x.aciklama, 160)) + '</p>' : '') + (x.kisi ? '<p class="muted rh-kisi">' + esc(x.kisi) + '</p>' : '') +
        '<div class="rh-alt">' + mkContact(x, rMesaj(x)) + shareButtons(rShare(x)) + '</div></div></article>';
    }).join('');
  }
  function pageRehber() {
    var kats = C.REHBER_TURLERI.filter(function (t) { return data.rehber.some(function (x) { return x.tur === t; }); });
    if (kats.indexOf(rKat) < 0) rKat = 'Tümü';
    var body = data.rehber.length ? (kats.length > 1 ? '<div class="filters" role="group" aria-label="İşletme türü">' + ['Tümü'].concat(kats).map(function (t) {
      return '<button type="button" data-r-kat="' + esc(t) + '" aria-pressed="' + (t === rKat) + '">' + esc(t) + '</button>';
    }).join('') + '</div>' : '') + '<div class="cards" id="rList">' + rListHtml() + '</div>' :
      '<div class="box empty"><b>Henüz kayıtlı işletme yok</b><span id="rBos">Yakında burada köylülerimizin işletmeleri yer alacak.</span></div>';
    if (!E) setTimeout(function () { iHazirla('rehber'); }, 0);
    return band('Esnaf Rehberi', 'Köylülerimizin dükkânları, lokantaları, sanayi ve hizmet işletmeleri. Alışverişte önce kendi esnafımız.') +
      '<section class="section"><div class="container"' + ed('ekle:rehber') + '>' + (E ? '' : '<div id="rYeni" hidden></div>') + body + '</div></section>';
  }
  function pageIsletme(id) {
    var x = data.rehber.filter(function (v) { return rid(v) === id; })[0];
    if (!x) return band('İşletme bulunamadı') + '<section class="section"><div class="container"><p>Bu kayıt kaldırılmış olabilir.</p><a class="btn" href="#/rehber">Esnaf Rehberi</a></div></section>';
    var src = img(x.foto), ekF = C.arr(x.fotolar).map(function (f) { return img(f.foto); }).filter(Boolean);
    var harita = x.adres ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(x.adres) : '';
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/rehber">Esnaf Rehberi</a></div></div></div>' +
      '<section class="section"><div class="container"><article class="article"' + ek('rehber', data.rehber.indexOf(x)) + '>' +
      (x.tur ? '<div class="news-meta"><span class="badge">' + esc(x.tur) + '</span></div>' : '') +
      '<h1>' + esc(x.baslik) + '</h1>' +
      (src ? '<button type="button" class="article-img rh-kart" data-photo="' + esc(src) + '" data-cap="' + esc(x.baslik) + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(src) + '" alt="' + esc(x.baslik) + '"></button>' : '') +
      (ekF.length ? '<div class="mk-fotos">' + ekF.map(function (s, i) {
        return '<button type="button" data-photo="' + esc(s) + '" data-cap="' + esc(x.baslik) + '" aria-label="Fotoğrafı büyüt (' + (i + 2) + ' / ' + (ekF.length + 1) + ')"><img src="' + esc(s) + '" alt="' + esc(x.baslik) + ': fotoğraf ' + (i + 2) + '" loading="lazy"></button>';
      }).join('') + '</div>' : '') +
      '<div class="article-text">' + (x.aciklama ? mParas(x.aciklama) : '') +
      (x.adres ? '<p class="rh-adres">' + icon('pin') + '<span>' + esc(x.adres) + ' · <a href="' + esc(harita) + '" target="_blank" rel="noopener">Haritada aç</a></span></p>' : '') +
      (x.kisi ? '<p class="muted">Yetkili: ' + esc(x.kisi) + '</p>' : '') + '</div>' +
      mkContact(x, rMesaj(x)) + (C.linkUrl(x.link) ? '<div class="btn-row" style="margin-top:10px">' + rLink(x, true) + '</div>' : '') +
      '<div class="btn-row">' + shareButtons(rShare(x), true) + '<a class="btn btn-light" href="#/rehber">‹ Esnaf Rehberi</a></div>' +
      '</article></div></section>';
  }
  document.addEventListener('click', function (e) {
    var k = e.target.closest('[data-r-kat]');
    if (!k) return;
    rKat = k.getAttribute('data-r-kat');
    main.querySelectorAll('[data-r-kat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === k)); });
    var l = $('rList'); if (l) { l.innerHTML = rListHtml(); realLinks(l); if (E) E.after('rehber'); }
  });

  /* ---------- Ziyaretçinin istekleri: Market ilanı ve Esnaf Rehberi kaydı ----------
     Ziyaretçi Market sayfasındaki "İlan ver", Esnaf Rehberi sayfasındaki "İşletmenizi ekleyin" formuyla kendi kaydını
     (fotoğraf ve telefonuyla) gönderir. İstek Supabase'de bekler (pazar_istekleri, rehber_istekleri; kurulum: araclar/supabase-meydan.sql);
     yönetici panelde onaylayınca kayıt öteki kayıtlar gibi data/pazar.json ya da data/rehber.json'a yazılır (yonetim/duzen.js: istekYayinla).
     Tablo henüz kurulmadıysa form hiç gösterilmez. */
  var ISTEK = {
    ilan: { tablo: '/pazar_istekleri', kutu: 'iYeni', bos: 'iBos', dugme: 'İlan ver', turler: C.PAZAR_TURLERI, turL: 'İlanın türü',
      baslikL: 'Ne satıyorsunuz / arıyorsunuz?', baslikP: 'Örnek: Köy yumurtası', baslikH: 'Lütfen ne sattığınızı ya da aradığınızı yazın.',
      aciklamaL: 'Açıklama', aciklamaP: 'Örnek: Günlük taze, köyde elden teslim.', telY: 'İlanı görenler sizi bu numaradan arar.', gonder: 'İlanı gönder',
      not: 'İlanınız dernek yönetimi onayladıktan sonra sitede görünür. Adınız ve telefon numaranız ilanda herkese açık olur.',
      ilk: 'İlk ilanı siz verin: yukarıdaki "İlan ver" düğmesine dokunun.', tamam: 'Teşekkürler, ilanınız alındı.', nerede: 'Market sayfasında', yine: 'Bir ilan daha ver', fotosuz: 'ilanınızı' },
    rehber: { tablo: '/rehber_istekleri', kutu: 'rYeni', bos: 'rBos', dugme: 'İşletmenizi ekleyin', turler: C.REHBER_TURLERI, turL: 'İşletmenin türü',
      baslikL: 'İşletmenin adı', baslikP: 'Örnek: Köprü Lokantası', baslikH: 'Lütfen işletmenizin adını yazın.',
      aciklamaL: 'Ne iş yapıyorsunuz?', aciklamaP: 'Örnek: Ev yemekleri, gözleme, kahvaltı. Her gün 08.00-22.00 arası açık.', telY: 'Müşteriler sizi bu numaradan arar.', gonder: 'Gönder',
      fotoL: 'Kartvizitinizin ya da dükkânınızın fotoğrafı',
      not: 'Kaydınız dernek yönetimi onayladıktan sonra sitede görünür. Yazdığınız bütün bilgiler (ad, telefon, adres) herkese açık olur. Yayın ücretsizdir.',
      ilk: 'İlk kaydı siz ekleyin: yukarıdaki "İşletmenizi ekleyin" düğmesine dokunun.', tamam: 'Teşekkürler, kaydınız alındı.', nerede: 'Esnaf Rehberi sayfasında', yine: 'Bir işletme daha ekle', fotosuz: 'kaydınızı' }
  };
  var iVar = { ilan: null, rehber: null };   // null: henüz bakılmadı · true: istek alınabiliyor · false: kurulum yok
  function iForm(tur) {
    var K = ISTEK[tur], y = function (t) { return '<span class="i-yardim">' + t + '</span>'; };
    return '<form class="m-form" data-i-form="' + tur + '" novalidate>' +
      '<label class="m-l">' + K.turL + '<select name="tur">' + K.turler.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') + '</select></label>' +
      '<label class="m-l">' + K.baslikL + '<input name="baslik" maxlength="120" placeholder="' + esc(K.baslikP) + '"></label>' +
      (tur === 'ilan' ? '<label class="m-l">Fiyat (TL)<input name="fiyat" maxlength="30" inputmode="numeric" placeholder="Örnek: 150">' + y('Fiyat yoksa boş bırakın.') + '</label>' : '') +
      '<label class="m-l">' + K.aciklamaL + '<textarea name="aciklama" rows="4" maxlength="2000" placeholder="' + esc(K.aciklamaP) + '"></textarea></label>' +
      (tur === 'rehber' ? '<label class="m-l">Adres<input name="adres" maxlength="200" autocomplete="street-address" placeholder="Örnek: Sanayi Sitesi 3. Sokak No: 12, Keskin"></label>' : '') +
      (K.fotoL ? '<p class="m-l" style="margin:0 0 -6px">' + K.fotoL + '</p>' : '') + mFotoAlan() +
      '<label class="m-l">Adınız ve soyadınız<input name="ad" autocomplete="name" maxlength="60" value="' + esc(mAd()) + '"></label>' +
      '<label class="m-l">Telefon numaranız<input name="telefon" type="tel" autocomplete="tel" inputmode="tel" maxlength="25" placeholder="0555 123 45 67">' + y(K.telY) + '</label>' +
      (tur === 'rehber' ? '<label class="m-l">Web siteniz ya da Instagram adresiniz<input name="link" maxlength="200" inputmode="url" autocapitalize="none" autocomplete="off" placeholder="Örnek: instagram.com/koprulokantasi">' + y('Yoksa boş bırakın.') + '</label>' : '') +
      '<label class="m-hp" aria-hidden="true">Web sitesi<input name="web" tabindex="-1" autocomplete="off"></label>' +
      '<p class="m-err" role="alert" hidden></p>' +
      '<button type="submit" class="btn">' + icon('pen') + K.gonder + '</button>' +
      '<p class="muted small m-note">' + K.not + '</p></form>';
  }
  function iCiz(tur) {
    var K = ISTEK[tur], b = $(K.kutu); if (!b || !iVar[tur]) return;
    if (!b.firstChild) b.innerHTML = '<details class="m-new"><summary class="btn">' + icon('pen') + K.dugme + '</summary><div class="box box-pad">' + iForm(tur) + '</div></details>';
    b.hidden = false;
    var bos = $(K.bos); if (bos) bos.textContent = K.ilk;
  }
  function iHazirla(tur) {
    if (iVar[tur] !== null) { iCiz(tur); return; }
    C.sb(ISTEK[tur].tablo + '?select=id&limit=1').then(function () { iVar[tur] = true; iCiz(tur); }, function (e) { if (e && e.status !== 'net') iVar[tur] = false; });
  }
  // "instagram.com/x", "@x", "www.x.com" gibi yazılanı tam adrese çevirir; adres değilse boş döner
  function iLink(t) {
    t = String(t || '').trim();
    if (!t) return '';
    if (/^@[\w.]{2,30}$/.test(t)) t = 'https://www.instagram.com/' + t.slice(1);
    else if (!/^https?:\/\//i.test(t)) t = 'https://' + t;
    return /^https?:\/\/[^\s\/.]+\.[^\s]{2,}$/i.test(t) && t.length <= 200 ? t : '';
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('form[data-i-form]');
    if (!f) return;
    e.preventDefault();
    var tur = f.getAttribute('data-i-form'), K = ISTEK[tur], v = {}, err = f.querySelector('.m-err'), btn = f.querySelector('button[type=submit]');
    ['tur', 'baslik', 'fiyat', 'aciklama', 'adres', 'link', 'ad', 'telefon', 'web'].forEach(function (n) { v[n] = f.elements[n] ? f.elements[n].value.trim() : ''; });
    function hata(t, n) { err.textContent = t; err.hidden = false; if (n && f.elements[n]) f.elements[n].focus(); }
    if (v.baslik.length < 3) return hata(K.baslikH, 'baslik');
    if (v.ad.length < 3) return hata('Lütfen adınızı ve soyadınızı yazın.', 'ad');
    if (!/^[0-9+ ()\-]+$/.test(v.telefon) || v.telefon.replace(/\D/g, '').length < 10 || !C.telHref(v.telefon)) return hata('Lütfen telefon numaranızı başında 0 ile yazın. Örnek: 0555 123 45 67', 'telefon');
    var link = iLink(v.link);
    if (v.link && !link) return hata('Web adresi anlaşılamadı. Örnek: instagram.com/koprulokantasi. Emin değilseniz boş bırakın.', 'link');
    err.hidden = true;
    mAdKaydet(v.ad);
    var label = btn.innerHTML, fotos = (f._fotos || []).slice();
    btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    var done = function () { fotos.forEach(function (x) { URL.revokeObjectURL(x.url); });
      var t = document.createElement('div');
      t.innerHTML = '<div class="m-thanks" role="status"><b>' + K.tamam + '</b><p>Dernek yönetimi onayladıktan sonra ' + K.nerede + ' görünecek.</p>' +
        '<button type="button" class="btn btn-light" data-i-again="' + tur + '">' + K.yine + '</button></div>';
      f.parentNode.replaceChild(t.firstChild, f); };
    if (v.web) { done(); return; }   // yalnız otomatik programların doldurduğu gizli alan
    var body = { tur: v.tur, baslik: v.baslik, ad: v.ad, telefon: v.telefon };
    var fiyat = v.fiyat.replace(/\s*(tl|₺|lira)\.?$/i, '').trim();
    if (fiyat) body.fiyat = fiyat;
    if (v.aciklama) body.aciklama = v.aciklama;
    if (v.adres) body.adres = v.adres;
    if (link) body.link = link;
    mFotoGonder(fotos, btn).then(function (yollar) {
      if (yollar.length) { body.fotolar = yollar; btn.textContent = 'Gönderiliyor…'; }
      return C.sb(K.tablo, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: body });
    }).then(done).catch(function (er) {
      btn.disabled = false; btn.innerHTML = label;
      hata(er && er.status === 'net' ? 'İnternet bağlantısı yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.' :
        er && er.foto ? 'Fotoğraf yüklenemedi. Biraz sonra tekrar deneyin ya da fotoğrafı kaldırıp ' + K.fotosuz + ' fotoğrafsız gönderin. (Hata F' + er.status + (er.message ? ': ' + er.message : '') + ')' :
        er && /çok fazla/.test(er.message || '') ? er.message : 'Gönderilemedi. Lütfen biraz sonra tekrar deneyin.' + (er && er.status ? ' (Hata ' + er.status + (er.message ? ': ' + String(er.message).slice(0, 120) : '') + ')' : ''));
    });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-i-again]');
    if (!a) return;
    var t = document.createElement('div'); t.innerHTML = iForm(a.getAttribute('data-i-again'));
    var f = t.firstChild; a.parentNode.parentNode.replaceChild(f, a.parentNode);
    f.elements.baslik.focus();
  });

  function credit(who, file) {
    return '<span class="kredi">Fotoğraf: <a href="https://commons.wikimedia.org/wiki/File:' + file + '" target="_blank" rel="noopener">' + who + '</a></span>';
  }
  var EG = 'Egeasln, CC BY-SA 4.0', IS = 'Ingeborg Simon, CC BY-SA 3.0', VH = 'Volker Höhfeld, CC BY-SA 4.0';

  /* Bize Ulaşın: ziyaretçi dernek yönetimine mesaj yazar (Hakkımızda sayfasının içinde; #/bize-ulasin doğrudan buraya açılır).
     Mesaj Supabase'de (mesajlar tablosu, kurulum: araclar/supabase-mesajlar.sql) durur, sitede yayınlanmaz; yönetim panelinde okunur
     (yonetim/duzen.js: mesajlar). Tablo henüz kurulmadıysa formun yerine "yakında" yazar. */
  var buVar = null;   // null: henüz bakılmadı · true: mesaj alınabiliyor · false: kurulum yok
  function buForm() {
    return '<form class="m-form" data-bu-form novalidate>' +
      '<label class="m-l">Adınız ve soyadınız<input name="ad" autocomplete="name" maxlength="60" value="' + esc(mAd()) + '"></label>' +
      '<label class="m-l">Telefon numaranız ya da e-posta adresiniz<input name="iletisim" autocomplete="tel" maxlength="100" placeholder="0555 123 45 67">' +
      '<span class="i-yardim">Size cevap verebilmemiz için yazın. İstemiyorsanız boş bırakabilirsiniz.</span></label>' +
      '<label class="m-l">Mesajınız<textarea name="metin" rows="6" maxlength="3000" placeholder="Sorunuzu, önerinizi ya da isteğinizi buraya yazın."></textarea></label>' +
      '<label class="m-hp" aria-hidden="true">Web sitesi<input name="web" tabindex="-1" autocomplete="off"></label>' +
      '<p class="m-err" role="alert" hidden></p>' +
      '<button type="submit" class="btn">' + icon('mail') + 'Mesajı gönder</button>' +
      '<p class="muted small m-note">Mesajınızı yalnız dernek yönetimi okur, sitede yayınlanmaz.</p></form>';
  }
  function buSection() {
    return '<section class="section alt bu-sec" id="bize-ulasin"><div class="container bu-in"><div class="sec-head"><h2>Bize Ulaşın</h2></div>' +
      '<p style="margin:0 0 16px">Dernek yönetimine sorunuzu, önerinizi ya da isteğinizi yazın. En kısa zamanda size dönüş yaparız.</p>' +
      '<div class="box box-pad" id="buKutu">' + (buVar === false ? buYakinda() : buForm()) + '</div></div></section>';
  }
  function buYakinda() { return '<p style="margin:0">Mesaj formu çok yakında burada olacak.</p>'; }
  function buHazirla() {
    if (buVar !== null || !$('buKutu')) return;
    C.sb('/mesajlar?select=id&limit=1').then(function () { buVar = true; }, function (e) {
      if (!e || e.status === 'net') return;
      buVar = false;
      var b = $('buKutu'); if (b && !E) b.innerHTML = buYakinda();
    });
  }
  var BU_SON = 'cd-bu-son';   // son gönderilen mesajın zamanı: aynı kişi art arda çok mesaj göndermesin
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('form[data-bu-form]');
    if (!f) return;
    e.preventDefault();
    var v = {}, err = f.querySelector('.m-err'), btn = f.querySelector('button[type=submit]');
    ['ad', 'iletisim', 'metin', 'web'].forEach(function (n) { v[n] = f.elements[n] ? f.elements[n].value.trim() : ''; });
    function hata(t, n) { err.textContent = t; err.hidden = false; if (n && f.elements[n]) f.elements[n].focus(); }
    if (v.ad.length < 3) return hata('Lütfen adınızı ve soyadınızı yazın.', 'ad');
    if (v.iletisim && !/@/.test(v.iletisim) && (!/^[0-9+ ()\-]+$/.test(v.iletisim) || v.iletisim.replace(/\D/g, '').length < 10))
      return hata('Telefon numaranızı başında 0 ile yazın (örnek: 0555 123 45 67) ya da e-posta adresinizi yazın. İstemiyorsanız boş bırakın.', 'iletisim');
    if (/@/.test(v.iletisim) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.iletisim)) return hata('E-posta adresi anlaşılamadı. Örnek: ad@gmail.com', 'iletisim');
    if (v.metin.length < 5) return hata('Lütfen mesajınızı yazın.', 'metin');
    var son = 0; try { son = +localStorage.getItem(BU_SON) || 0; } catch (x) { /* yok say */ }
    if (Date.now() - son < 60000) return hata('Mesajınız az önce gönderildi. Yeni bir mesaj için lütfen bir dakika bekleyin.');
    err.hidden = true;
    mAdKaydet(v.ad);
    var label = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    var done = function () {
      try { localStorage.setItem(BU_SON, String(Date.now())); } catch (x) { /* yok say */ }
      var t = document.createElement('div');
      t.innerHTML = '<div class="m-thanks" role="status"><b>Teşekkürler, mesajınız dernek yönetimine ulaştı.</b>' +
        '<p>' + (v.iletisim ? 'En kısa zamanda size dönüş yapacağız.' : 'Mesajınızı okuyacağız.') + '</p>' +
        '<button type="button" class="btn btn-light" data-bu-again>Yeni bir mesaj yaz</button></div>';
      f.parentNode.replaceChild(t.firstChild, f);
    };
    if (v.web) { done(); return; }   // yalnız otomatik programların doldurduğu gizli alan
    var body = { ad: v.ad, metin: v.metin };
    if (v.iletisim) body.iletisim = v.iletisim;
    C.sb('/mesajlar', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: body }).then(done).catch(function (er) {
      btn.disabled = false; btn.innerHTML = label;
      hata(er && er.status === 'net' ? 'İnternet bağlantısı yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.' :
        er && /çok fazla/.test(er.message || '') ? er.message : 'Gönderilemedi. Lütfen biraz sonra tekrar deneyin.' + (er && er.status ? ' (Hata ' + er.status + ')' : ''));
    });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-bu-again]');
    if (!a) return;
    var t = document.createElement('div'); t.innerHTML = buForm();
    var f = t.firstChild, box = a.parentNode; box.parentNode.replaceChild(f, box);
    f.elements.metin.focus();
  });

  /* Hakkımızda: yalnız dernekle ilgili bilgiler. Eski İletişim sayfasının içeriği (adres, harita) de burada; #/iletisim buraya açılır.
     Köyün ve köprünün tarihi Tarihimiz sayfasında (pageTarih). */
  function pageAbout() {
    var d = data.dernek, mail = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(d.eposta || '') ? d.eposta : '';
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
      '<li>Çeşnigir Köprüsü\'nü ve <a href="#/tarihimiz">Köprüköy\'ün tarihini</a> tanıtıyoruz.</li>' +
      '<li>Köyde yaşayanla gurbetteki hemşehrilerimiz arasındaki bağı canlı tutuyoruz.</li></ul>' +
      '</div><aside><div class="box box-pad"' + ed('dernek:kisiler') + '><h3>Dernek Bilgileri</h3><ul class="facts">' +
      peopleRows(d, true) +
      '<li><span>Kuruluş</span>Aralık 2025</li>' +
      '<li><span>Açılış töreni</span>6 Eylül 2026</li>' +
      (mail ? '<li><span>E-posta</span><a href="mailto:' + esc(mail) + '">' + esc(mail) + '</a></li>' : '') +
      '<li><span>Adres</span>' + esc(d.adres || 'Köprüköy, Keskin / Kırıkkale') + '</li>' +
      '<li><span>Konum</span><a href="' + MAP + '" target="_blank" rel="noopener">Haritada aç</a></li>' +
      '</ul></div>' + (kasa || (E ? '<div' + ed('dernek:kasa') + ' style="margin-top:20px"></div>' : '')) + '</aside></div></section>' +
      boardsSection(d) + buSection() +
      '<section class="section alt"><div class="container"><div class="sec-head"><h2>Dernek Binası ve Konum</h2></div>' +
      '<p style="margin:0 0 14px">' + esc(d.adres || 'Köprüköy, Keskin / Kırıkkale') + ' · <a href="' + MAP + '" target="_blank" rel="noopener">Haritada aç</a></p>' +
      '<div class="box"><iframe class="map" title="Çeşnigir-Der haritası" loading="lazy" ' +
      'src="https://www.google.com/maps?q=39.5765122,33.4357454&z=17&output=embed"></iframe></div></div></section>' +
      '<section class="section"><div class="container"><div class="pair" style="margin-bottom:0">' +
      '<div class="box box-pad"><h3>Tarihimiz</h3><p>Çeşnigir Köprüsü\'nün tanıtımı, teknik bilgileri, "Çeşnigir" adının anlamı ve köyümüzün kaynaklı tarihçesi.</p>' +
      '<a class="btn" href="#/tarihimiz">Tarihimizi oku</a></div>' +
      '<div class="box box-pad"><h3>Gezilecek Yerler</h3><p>Çeşnigir Kanyonu mesire alanı, seyir terasları, tekne turu, yürüyüş yolu, Büklükale ören yeri ve Sulu Mağara.</p>' +
      '<a class="btn" href="#/gezilecek-yerler">Gezilecek yerleri gör</a></div>' +
      '</div></div></section>';
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
    ozkan: ['A. Ateş Özkan, Hacettepe Türkiyat Araştırmaları Dergisi 44, 2026', 'https://dergipark.org.tr/tr/download/article-file/4744013'],
    ozcelik: 'B. Özçelik, Kırıkkale Karakeçilileri\'nin Halkbilimi Derlemeleri, 1995',
    culpan: 'Cevdet Çulpan, Türk Taş Köprüleri, 2002',
    ahiEvran: ['Kırşehir Ahi Evran Üniversitesi, Büklükale kazısı', 'https://ahievran.edu.tr/en/archive-news/7205-kaeu-faculty-member-discovered-a-palace-built-in-the-buklukale-area-in-the-20th-century-bc'],
    hdn23: ['Hürriyet Daily News, 30 Haziran 2023', 'https://hurriyetdailynews.com/japanese-archaeologist-unearths-hittite-remains-184319'],
    hdnIsk: ['Hürriyet Daily News, Büklükale\'de İskender dönemi izleri', 'https://www.hurriyetdailynews.com/excavations-uncover-traces-of-alexander-the-great-era-site-223825'],
    sabah23: ['Daily Sabah, 19 Haziran 2023', 'https://www.dailysabah.com/arts/japanese-archaeologist-reveal-1st-settlement-of-cimmerians-in-anatolia/news'],
    wikiBaraj: ['Wikipedia, Kapulukaya Dam', 'https://en.wikipedia.org/wiki/Kapulukaya_Dam'],
    kardes: ['Sırrı Kardeş, Heyet-i Temsiliye ve Mustafa Kemal Kırşehir\'de (1950), aktaran Adnan Yılmaz', 'https://www.adnanyilmaz.com.tr/2020/01/28/100-yilinda-samsundan-kirsehire-gelen-mustafa-kemal-pasa/']
  };
  function srcHtml(list) {
    if (!list || !list.length) return '';
    return '<small class="t-src">Kaynak: ' + list.map(function (k) {
      return typeof k === 'string' ? esc(k) : '<a href="' + esc(k[1]) + '" target="_blank" rel="noopener">' + esc(k[0]) + '</a>';
    }).join(' · ') + '</small>';
  }

  var TARIH = [
    ['MÖ 3000 civarı', 'Köprünün hemen yanında, Kızılırmak\'ın en dar yerindeki Büklükale tepesinde ilk yerleşim kurulur. Burada Eski Tunç Çağı\'ndan Osmanlı dönemine kadar aralıksız yaşanır; ırmağın bu dar yeri her dönemde önemli bir geçit olur.', [K.ahiEvran, K.sabah23]],
    ['Rivayet: MÖ 6. yüzyıl', 'Herodot, Lidya Kralı Kroisos\'un Kızılırmak\'ı orada bulunan köprülerden geçtiğini yazar, ama yer adı vermez. Tarihçi Olcay Zengin Koşan (2021), O\'Grady\'ye (2002) dayanarak bu geçişin bugünkü köprünün yerinde bulunmuş daha eski bir köprüden olmuş olabileceğini öne sürer. Garstang ve Gurney (1959) da köprünün altında Roma dönemi ve daha eski köprülerden kalma taşlar gördüklerini yazar. Ancak Herodot köprüyü görmemiştir; geçişin burada olduğunu kesinleştiren bir belge yoktur.', [K.kosan, K.gg, K.pehl]],
    ['13. yüzyıl', 'Köprü Anadolu Selçukluları döneminde, yanındaki bir hanla birlikte yapılır. Sanat tarihçisi Fügen İlter\'e göre İslam öncesine ait eski bir köprünün temelleri üzerine kurulmuştur. Han bugün ayakta değildir.', [K.pehl, K.kure]],
    ['1402', 'Rivayete göre Timur\'un ordusu Ankara Savaşı\'na giderken köprüden geçer.', [K.wikiKopru, K.kure]],
    ['16. yüzyıl', 'Rivayete göre Yavuz Sultan Selim\'in Mısır Seferi hazırlıkları sırasında köprü elden geçirilir; onarımın Mimar Sinan\'a ait olduğu söylenir.', [K.kure, K.kkTanitim]],
    ['1609', 'İki padişah emri: Temmuz\'da Ankara Beyi\'ne Çaşnigir köprüsü civarındaki palangalarda eşkıya tahkiki, Kasım\'da Çaşnigir Köprüsü yani Kırkkeçili kalesindeki eşkıyanın temizlenmesi emredilir.', ['BOA, Mühimme Defteri 78/504 ve 78/1234']],
    ['Osmanlı dönemi', 'Kayalık ve tehlikeli geçidi korumak için köprü çevresine 50 kadar derbendci (geçit bekçisi) yerleştirilir. Bekçilerin aileleri zamanla bugünkü köyün çekirdeğini oluşturur.', [K.pehl]],
    ['1724', 'Bir padişah emrinde Ankara sancağının sınırı "Çaşnigir" olarak anılır; yolların eşkıyaya karşı korunması istenir.', ['BOA, Mühimme Defteri 131/1456']],
    ['1777', 'Köy, devlet kayıtlarında "Çaşnigir Köprüsü karyesi" adıyla geçer. Köy ahalisi adına Köprülüzâde Osman Ağa, çevrede konaklayan bazı oymakların arazi ve bağlara tecavüz, mal gasbı ve adam öldürmesinden şikâyet eder.', ['BOA, Cevdet Adliye 38/2270', K.vikiKoy]],
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
    ['1979–1989', 'Kızılırmak üzerinde 61 metre yüksekliğindeki Kapulukaya Barajı yapılır ve 1979\'da açılır. 1989\'da sular yükselince köprü araç trafiğine kapanır, yakınına yeni karayolu köprüsü yapılır.', [K.wikiKopru, K.wikiKoy, K.wikiBaraj]],
    ['2009', 'Kültür ve Turizm Bakanlığı izniyle Japon arkeolog Kimiyoshi Matsumura başkanlığında karşı kıyıdaki Büklükale\'de kazılar başlar. Kazılarda Hitit dönemine ait çivi yazılı tabletler bulunur.', [K.ahiEvran, K.hdn23]],
    ['2010', 'Karayolları 4. Bölge Müdürlüğü köprüyü restore eder. Köprü bugün yayalara açıktır.', [K.wikiKopru, K.kure]],
    ['2013', 'Nüfus 2.000\'in altına düşünce belediye kapanır, Köprüköy yeniden köy olur.', [K.vikiKoy, K.wikiKoy]],
    ['2019–2020', 'Kırıkkale Valiliği çalışmalarıyla Çeşnigir Kanyonu seyir terasları, yürüyüş yolları ve tekne turlarıyla turizme açılır.', [K.kure, K.tekne]],
    ['Aralık 2025', 'Köprüköy Çeşnigir Kültür Sosyal Yardımlaşma ve Dayanışma Derneği kurulur.', ['Dernek kayıtları']],
    ['6 Eylül 2026', 'Dernek merkezi Köprüköy Çarşı Merkezi\'nde törenle açılır.', [K.acilis]]
  ];

  /* Tarihimiz: önce Çeşnigir Köprüsü'nün tanıtımı, teknik bilgileri ve "Çeşnigir" adının anlamı, sonra köyün ve köprünün tarihçesi.
     Her bilginin kaynağı yanında yazılı (K, srcHtml); kaynaksız bilgi eklenmez. */
  function pageTarih() {
    var W = 'https://tr.wikipedia.org/wiki/';
    var stats = [['800 yıla yakın', 'köprünün tahmini yaşı'], ['113 m', 'köprünün boyu'], ['18,60 m', 'ana kemer açıklığı'], ['50', 'Osmanlı döneminde köprü bekçisi'], ['1972', 'belde oluşu']];
    return band('Tarihimiz', 'Çeşnigir Köprüsü ve Köprüköy\'ün kaynaklı tarihi') +
      '<section class="section alt"><div class="container">' +
      '<div class="stats">' + stats.map(function (s) { return '<div><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="container grid-main"><div>' +
      '<div class="sec-head"><h2>Çeşnigir Köprüsü</h2></div>' +
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
      '<div class="box box-pad"><h3>Kaynaklar nerede ayrılıyor?</h3><ul class="check-list">' +
      '<li><b>Boyu:</b> Yukarıdaki ölçülerde 113,25 m yazar; Cevdet Çulpan ve Wikipedia 110 m verir.' + srcHtml([K.culpan, K.ozkan, K.wikiKopru]) + '</li>' +
      '<li><b>Göz sayısı:</b> Çulpan\'a göre köprü "sivri kemerli tek bir gözden ibaret"tir. Wikipedia ise 12 kemerden söz eder (9 ana, 3 hafifletme gözü). Yukarıdaki ölçüler altı açıklık ve üç gizli göz sayar.' + srcHtml([K.culpan, K.ozkan, K.wikiKopru]) + '</li>' +
      '<li><b>Yapım dönemi:</b> Çoğu kaynak 13. yüzyıl Anadolu Selçuklu dönemini söyler. Avusturyalı K. Ritter (1936) ve 1852 tarihli bir arşiv belgesi ise köprüyü Osmanlı dönemine, Sultan Murad\'a bağlar. Kitabe olmadığı için kesin tarih bilinmiyor.' + srcHtml([K.kure, K.pehl]) + '</li>' +
      '<li><b>Mimar Sinan:</b> Wikipedia, onarımın Yavuz Sultan Selim zamanında Mimar Sinan\'ın gözetiminde yapıldığını kesin bilgi gibi yazar; KÜRE Ansiklopedisi ve Kırıkkale Tanıtım Portalı bunu rivayet olarak aktarır. Bunu doğrulayan bir arşiv belgesine rastlamadık.' + srcHtml([K.wikiKopru, K.kure, K.kkTanitim]) + '</li>' +
      '</ul></div>' +

      biliyorKutu('t-biliyor-tel') +
      '<div class="sec-head" style="margin-top:40px"><h2>Köyümüz Köprüköy</h2></div>' +
      figure('koprukoy-gol.jpg', 'Kapulukaya Baraj Gölü kıyısında Köprüköy: kayalık yamaçta kırmızı çatılı evler, solda Çeşnigir Köprüsü.', 'Göl kıyısından Köprüköy ve Çeşnigir Köprüsü. ' + credit(IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_02.jpg')) +
      para('Kırıkkale\'nin Keskin ilçesine bağlı Köprüköy, adını Kızılırmak üzerindeki tarihi Çeşnigir Köprüsü\'nden alır; halk arasında kısaca "Köprü" de denir. Köy, Ankara–Kırşehir yolunun eski güzergâhında, ırmağın kayalar arasında daraldığı ve en sağlam geçit verdiği yerde kurulmuştur. Yerleşimin Selçuklu döneminde başladığı kabul edilir.') +
      para('Köyümüzün asıl hikâyesi köprüyle birlikte yazılmıştır. Osmanlı döneminde kervanların geçtiği bu kayalık geçidi eşkıyadan korumak için köprünün çevresine derbendciler, yani geçit bekçileri yerleştirildi. Bekçilerin aileleri burada kalıp çoğaldı; han ve cami yapıldı. Böylece bir güvenlik noktası, zamanla kalabalık bir köye dönüştü. Kayıtlarda köyün adı 1777\'de "Çaşnigir Köprüsü", 1815\'te "Çaşnigir Derbendi" olarak geçer.') +

      '<div class="sec-head" style="margin-top:30px"><h2>Köprüyü kim yaptırdı?</h2></div>' +
      para('Kitabesi olmadığı için bu soru hâlâ tartışmalıdır. En yaygın görüş, köprünün 13. yüzyılda Anadolu Selçukluları döneminde, yanındaki hanla birlikte yapıldığıdır. Sanat tarihçisi Fügen İlter, köprünün İslam öncesi döneme ait eski bir köprünün temelleri üzerine kurulduğunu, Osmanlı döneminde yenilenince ilk biçimini yitirdiğini yazar.') +
      para('Öte yandan 1936\'da köprüyü inceleyen Avusturyalı K. Ritter, bugünkü hâliyle Osmanlı öncesine ait olamayacağını ve Sultan Murad zamanında yapıldığını ileri sürmüştür. Tarihçi Prof. Dr. Hamit Pehlivanlı\'nın Osmanlı arşivinde bulduğu 27 Temmuz 1852 tarihli belge de köprüyü "Sultan Murad Han\'ın yaptırdığı Çaşnigir Köprüsü" diye anar. Pehlivanlı, o yıllarda köprünün üzerinde bugün kayıp olan bir kitabenin bulunmuş olabileceğini düşünür.') +

      '<div class="sec-head" style="margin-top:30px"><h2>Derbend: köprünün bekçileri</h2></div>' +
      figure('kopru-merdiven.jpg', 'Çeşnigir Köprüsü\'ne inen taş merdiven ve köprünün kemerleri.', 'Köprüye inen yol. ' + credit(IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_04.jpg')) +
      para('<b>Derbend</b>, Farsça "geçit tutmak" demektir. Osmanlı devleti, bugünkü jandarma ve polisin olmadığı dönemlerde, eşkıyanın sık görüldüğü tehlikeli geçitleri civar köylerin halkına korutur; karşılığında onları bazı vergilerden muaf tutardı. Bekçiler yolcuların canına ve malına zarar gelmeyeceğine söz verir, bir şey olursa zararı öderlerdi. Başlarındaki kişiye <b>derbend ağası</b> denirdi.') +
      para('Çaşnigir Köprüsü, Kırşehir Sancağı\'nın Konur Kazası\'nda, bu düzenin Anadolu\'daki önemli noktalarından biriydi. 17. yüzyıl sonunda başka yerlerde bekçiler dağılırken, burada 19. yüzyılın ortasında hâlâ kalabalık bir nüfus yaşıyordu: 1845 vergi defterine göre köyde 182 Müslüman hane, 1840 defterine göre de 7 Rum hanesi vardı. Hane başına beş kişi sayılırsa nüfus 945 civarındadır.') +
      para('Zamanla düzen bozuldu. Arşiv belgelerinde halktan fazla para isteyen ağalar, vergi muafiyetine rağmen vergi talep eden valiler ve halka zulmettiği için 1822\'de cezalandırılan Deli Battal adlı bir ağa geçer. 1831\'de derbendin muafiyeti kaldırıldı; Tanzimat\'tan sonra yol güvenliğini önce zaptiye, sonra jandarma üstlendi. Derbendden geriye bugün yalnızca köprü kaldı; han ve caminin izi yoktur.') +

      '<div class="sec-head" style="margin-top:30px"><h2>Köprünün komşusu: Büklükale</h2></div>' +
      figure('buklukale.jpg', 'Kızılırmak kıyısında Büklükale ören yerinin kayalık tepesi; sağda Çeşnigir Köprüsü.', 'Büklükale tepesi ve sağda Çeşnigir Köprüsü. ' + credit(IS, 'B%C3%BCkl%C3%BCkale_01.jpg')) +
      para('Köprünün karşı kıyısında, Karakeçili sınırları içindeki Büklükale, Kızılırmak\'ın en dar yerinde kurulmuş eski bir şehirdir. Kazı ekibine göre burada yaklaşık MÖ 3000\'den Osmanlı dönemine kadar yaşanmıştır ve bu dar geçit her çağda önemli bir geçiş noktası olmuştur. Ekip, ırmağın batı kıyısında, yerleşimin kuzeyinde bir Roma köprüsünün kalıntılarını da kaydeder. Bu, köprümüzün yerinde ya da yakınında çok daha eski köprüler bulunduğunu söyleyen kaynaklarla uyuşur.') +
      para('Kazılar 2009\'dan beri Japon arkeolog Kimiyoshi Matsumura başkanlığında sürüyor. Toprağın altından üstüne doğru Eski Tunç Çağı, Hitit, Demir Çağı, Helenistik (Büyük İskender dönemi) ve Osmanlı katmanları çıktı. Hitit dönemine ait çivi yazılı tabletler, bugüne kadar bulunanların en batıdakileri olarak anılıyor. Ekip, büyük sur duvarının Kimmerlere ait olabileceğini düşünüyor; bu henüz kesinleşmiş değil.') +
      '<p class="muted small" style="margin-top:-6px">' + srcHtml([K.ahiEvran, K.hdn23, K.hdnIsk, K.sabah23]).replace('<small class="t-src">', '').replace('</small>', '') + '</p>' +

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
        // Bu sayfada zaten anlatılan yazılar tekrar bağlantı olarak listelenmez (Atatürk'ün geçişi yukarıda anlatılıyor)
        var anlatilan = ['2026-11-22-ataturk-koyumuzden-gecti-26-aralik-1919'];
        var t = data.duyurular.filter(function (p) { return isTarih(p) && anlatilan.indexOf(p.eski_id || p.id) < 0; });
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

      '<div class="sec-head" style="margin-top:30px"><h2>Köprünün rivayetleri</h2></div>' +
      '<div class="pair" style="margin-bottom:0"><div class="box box-pad"><h3>Kan Taşı</h3>' +
      '<p style="margin:0 0 10px">Karakeçili\'den derlenen bir rivayete göre köprü sekiz kez yapılmaya çalışılmış, her seferinde yıkılmıştır. Ustabaşı mimar rüyasında, kızını ve oğlunu kurban edip onların kanına bulanmış iki taşı köprüye koyarsa köprünün ayakta kalacağını görür. Rivayete göre bu taşlar büyük kemere konur ve bugün "Kan Taşı" diye gösterilir.</p>' +
      '<p style="margin:0">Hikâyenin sonunda köprüyü yaptıran hükümdar, mimarın sözüne gücenip köprüden geçmez, ırmağı sığ bir yerden geçer. Benzer "kurban" söylenceleri Anadolu ve Balkanlar\'daki pek çok köprü için anlatılır.</p>' +
      srcHtml([K.ozcelik, K.ozkan]) + '</div>' +
      '<div class="box box-pad"><h3>Türküde Köprüköy</h3>' +
      '<p style="margin:0">Kızılırmak türkülerinden "Nettin Kızılırmak Allı Gelini"nde anlatılan olayın köyümüzde yaşandığı aktarılır. Hikâyeye göre karşı köye götürülen gelin alayı köprüden geçerken köprü yıkılır, gelin ve alaydan pek çok kişi ırmağa kapılır. Ardından Kızılırmak\'a sitem eden ağıtlar yakılır.</p>' +
      srcHtml([['Timeturk, Türkülere ve hikâyelere konu olan Kızılırmak', 'https://www.timeturk.com/kultur/turkulere-hikayelere-konu-olan-kizilirmak/haber-1780026']]) + '</div></div>' +

      '<p class="muted small" style="margin-top:20px">Kaynak: Prof. Dr. Hamit Pehlivanlı, <a href="https://pusulagazetesi.net/kose-yazilari/osmanlilarda_yol_emniyeti-1242" target="_blank" rel="noopener">"Osmanlılarda Yol Emniyetinin Sağlanmasında Derbendlerin Yeri ve Çaşnigir Köprüsü Derbendi"</a> (Yedi Kıta, Aralık 2012; Osmanlı arşiv belgeleri, Cevdet Çulpan ve Fügen İlter\'in çalışmalarına dayanır) · ' +
      '<a href="' + W + 'K%C3%B6pr%C3%BC,_Keskin" target="_blank" rel="noopener">Vikipedi, Köprüköy (Keskin)</a> · <a href="https://en.wikipedia.org/wiki/%C3%87e%C5%9Fnigir_Bridge" target="_blank" rel="noopener">Wikipedia, Çeşnigir Bridge</a> · ' +
      '<a href="https://kureansiklopedi.com/tr/detay/cesnigir-koprusu-7f5c9" target="_blank" rel="noopener">KÜRE Ansiklopedi</a> · <a href="https://www.yeniankara.com.tr/turkiye-haberleri/kirikkale-keskin-tarihi-casnigir-koprusu-keskin-askeri-hastanesi-190184" target="_blank" rel="noopener">Yeni Ankara</a> · ' +
      '<a href="https://www.yeniankara.com.tr/turkiye-haberleri/ankarada-binalari-catlatan-keskini-yikan-deprem-19-nisan-1938in-kayitlara-gecen-agir-bilancosu-188563" target="_blank" rel="noopener">Yeni Ankara (1938 depremi)</a> · <a href="https://www.timeturk.com/kultur/turkulere-hikayelere-konu-olan-kizilirmak/haber-1780026" target="_blank" rel="noopener">Timeturk</a></p>' +

      '</div><aside><div class="box box-pad"><h3>Köy Bilgileri</h3>' +
      rows([['Konum', 'Kapulukaya Baraj Gölü\'nün doğu kıyısı'], ['Uzaklık', 'Keskin 25 km, Kırıkkale 37 km, Ankara yaklaşık 113 km'], ['Rakım', '803 m'], ['Nüfus', '662 (2025, TÜİK)'],
        ['Geçim', 'Buğday, arpa, patates, nohut, fasulye, ayçiçeği, pancar; hayvancılık; tatlı su levreği ve sazan balıkçılığı'], ['Yönetim', 'Muhtar ve ihtiyar heyeti'], ['Posta kodu', '71860']]) +
      '</div>' + biliyorKutu('t-biliyor-masa') +
      '</aside></div></section>';
  }
  /* Biliyor muydunuz? kutusu: masaüstünde yan sütunda, telefonda (tek sütun) "Köyümüz Köprüköy" başlığının hemen üstünde.
     İki kopya yazılır, site.css hangisinin görüneceğini seçer (t-biliyor-masa / t-biliyor-tel). */
  function biliyorKutu(cls) {
    return '<div class="box box-pad ' + cls + '" style="margin-top:20px"><h3>Biliyor muydunuz?</h3><ul class="check-list">' +
      // Kaynaklar burada tekrar yazılmaz: her madde yukarıdaki Tarihçe ve Derbend bölümlerinde kaynağıyla anlatılıyor
      ['Köyümüzün eski adları: 1777\'de devlet kayıtlarında "Çaşnigir Köprüsü karyesi", 1815\'te "Çaşnigir Derbendi". Halk arasında bugün de kısaca "Köprü" denir.',
        'Rivayete göre 1402\'de Timur\'un ordusu Ankara Savaşı\'na giderken köprümüzden geçti.',
        'Rivayete göre 16. yüzyılda Yavuz Sultan Selim\'in Mısır Seferi hazırlıkları sırasında köprü elden geçirildi; onarımın Mimar Sinan\'a ait olduğu söylenir.',
        '1609\'da Sultan I. Ahmed iki ayrı emirle Çaşnigir Köprüsü çevresindeki eşkıyanın araştırılmasını ve "Kırkkeçili kalesi" denen yerdeki eşkıyanın temizlenmesini istedi.',
        '1724\'te Sultan III. Ahmed\'in bir emri, Ankara sancağının sınırını "Çaşnigir" diye anar ve yolların eşkıyaya karşı korunmasını ister.',
        'Köprüyü eşkıyadan koruyan derbendcilerin başındaki ağa, Deli Battal, halka zulmettiği için 1822\'de Sultan II. Mahmud\'un emriyle cezalandırıldı.',
        '1892\'de köprünün başında taştan bir aslan heykeli vardı.',
        '1852\'deki onarım açık eksiltmeyle en ucuz fiyatı veren ustaya verilmişti.'
      ].map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul></div>';
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

  /* Gezilecek yerler haritası (yalnız Gezilecek Yerler sayfasında). Konumlar GEZI ile aynı sırada: [enlem, boylam].
     Köprü ve kanyondaki noktalar yaklaşık konumdur; düzeltmek için buradaki sayıları değiştirmek yeterli. */
  var GEZI_KONUM = [
    [39.5795, 33.4305],   // Çeşnigir Kanyonu Mesire Alanı
    [39.5772, 33.4282],   // Seyir Terasları
    [39.5822, 33.4298],   // Kanyonda Tekne Turu (iskele)
    [39.5802, 33.4312],   // Yürüyüş ve Bisiklet Yolu (köprüye inen merdiven)
    [39.5850, 33.4322],   // Kapulukaya Baraj Gölü Kıyısı
    [39.5835, 33.4255],   // Büklükale Ören Yeri
    [39.6650, 33.5900]    // Sulu Mağara (Keskin, Altıntaş Mahallesi)
  ];
  var KOPRU_YER = { ad: 'Tarihi Çeşnigir Köprüsü', konum: [39.58083, 33.42944], foto: 'kanyon-kopru.jpg', link: '#/tarihimiz', yazi: 'Köprünün tarihçesini oku' };
  var LF = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.', lfYuk = null, gHarita = null;
  function leafletYukle() {
    if (window.L) return Promise.resolve();
    if (lfYuk) return lfYuk;
    lfYuk = new Promise(function (ok, hata) {
      var c = document.createElement('link'); c.rel = 'stylesheet'; c.href = LF + 'css';
      c.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; c.crossOrigin = '';
      document.head.appendChild(c);
      var j = document.createElement('script'); j.src = LF + 'js';
      j.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; j.crossOrigin = '';
      j.onload = ok; j.onerror = function () { lfYuk = null; hata(); };
      document.head.appendChild(j);
    });
    return lfYuk;
  }
  function geziHaritaBolum() {
    var cip = function (i, ad) { return '<button type="button" class="gh-cip" data-gh="' + i + '"><b>' + (i < 0 ? '★' : i + 1) + '</b>' + ad + '</button>'; };
    return '<section class="section"><div class="container"><div class="sec-head"><h2>Haritada Gezilecek Yerler</h2></div>' +
      '<p class="gh-ipucu">Haritadaki bir noktaya ' + (window.matchMedia && matchMedia('(hover: hover)').matches ? 'farenizle gelin, fotoğrafı görünsün; tıklayınca o yerin bilgilerine gidersiniz.' : 'dokunun, fotoğrafı açılsın; "Ayrıntıları gör" ile o yerin bilgilerine gidersiniz.') + '</p>' +
      '<div class="box gh-kutu"><div id="geziHarita" class="gh-harita" role="region" aria-label="Gezilecek yerler haritası"><p class="gh-yukleniyor">Harita yükleniyor…</p></div></div>' +
      '<div class="gh-cipler" role="group" aria-label="Haritada göster">' + cip(-1, 'Çeşnigir Köprüsü') + GEZI.map(function (g, i) { return cip(i, g[0]); }).join('') + '</div>' +
      '</div></section>';
  }
  function geziDetay(i) {
    var el = $('yer-' + (i + 1));
    if (!el) { location.hash = KOPRU_YER.link; return; }
    var hb = document.querySelector('.header'), y = el.getBoundingClientRect().top + window.pageYOffset - (hb ? hb.offsetHeight : 0) - 12;
    window.scrollTo({ top: y, behavior: 'smooth' });
    el.classList.remove('vurgu'); void el.offsetWidth; el.classList.add('vurgu');
  }
  function geziHarita() {
    var kutu = $('geziHarita'); if (!kutu) return;
    leafletYukle().then(function () {
      if (!document.body.contains(kutu)) return;
      kutu.innerHTML = '';
      var L = window.L, hover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
      var m = L.map(kutu, { scrollWheelZoom: false, tap: true, zoomControl: true, attributionControl: true });
      gHarita = m;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, subdomains: 'abc',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m);
      var yerler = [{ i: -1, ad: KOPRU_YER.ad, konum: KOPRU_YER.konum, foto: KOPRU_YER.foto, yazi: KOPRU_YER.yazi }].concat(GEZI.map(function (g, i) {
        return { i: i, ad: g[0], konum: GEZI_KONUM[i], foto: g[2], yazi: 'Ayrıntıları gör' };
      }));
      var isaret = {};
      yerler.forEach(function (y) {
        var ikon = L.divIcon({ className: 'gh-pin' + (y.i < 0 ? ' gh-kopru' : ''), html: '<span><i>' + (y.i < 0 ? '★' : y.i + 1) + '</i></span>', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -38], tooltipAnchor: [0, -40] });
        var resim = '<img src="' + B + 'images/' + y.foto + '" alt="" width="260" height="173">';
        var mk = L.marker(y.konum, { icon: ikon, title: y.ad, alt: y.ad, riseOnHover: true }).addTo(m);
        if (hover) {
          mk.bindTooltip('<div class="gh-onizle">' + resim + '<b>' + esc(y.ad) + '</b><small>Tıklayın: ' + y.yazi.toLocaleLowerCase('tr') + '</small></div>', { direction: 'top', className: 'gh-tip', opacity: 1 });
          mk.on('click', function () { geziDetay(y.i); });
        } else {
          mk.bindPopup('<div class="gh-onizle">' + resim + '<b>' + esc(y.ad) + '</b><button type="button" class="btn gh-git" data-gh-git="' + y.i + '">' + y.yazi + ' ›</button></div>', { className: 'gh-pop', maxWidth: 280, minWidth: 240, autoPanPadding: [16, 16] });
        }
        isaret[y.i] = mk;
      });
      // köy ve kanyondaki noktalar başta görünsün; Sulu Mağara (Keskin) düğmesiyle gidilir
      m.fitBounds(L.latLngBounds(yerler.filter(function (y) { return y.i < 6; }).map(function (y) { return y.konum; })), { padding: [40, 40], maxZoom: 15 });
      kutu.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-gh-git]');
        if (b) { m.closePopup(); geziDetay(+b.getAttribute('data-gh-git')); }
      });
      document.querySelectorAll('[data-gh]').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = +b.getAttribute('data-gh'), mk = isaret[i];
          m.flyTo(mk.getLatLng(), i === 6 ? 14 : 16, { duration: 0.8 });
          m.once('moveend', function () { if (hover) mk.openTooltip(); else mk.openPopup(); });
          var hb = document.querySelector('.header'), y = kutu.getBoundingClientRect().top + window.pageYOffset - (hb ? hb.offsetHeight : 0) - 12;
          if (kutu.getBoundingClientRect().top < 0) window.scrollTo({ top: y, behavior: 'smooth' });
        });
      });
    }).catch(function () {
      kutu.innerHTML = '<p class="gh-yukleniyor">Harita şu an açılamadı. <a href="' + MAP + '" target="_blank" rel="noopener">Google Haritalar\'da açın</a>.</p>';
    });
  }

  function placesSection() {
    return '<section class="section alt"><div class="container"><div class="sec-head"><h2>Görülecek Yerler</h2></div>' +
      '<figure class="fig" style="margin-bottom:24px"><img class="wide" src="' + B + 'images/mesire.jpg" alt="Çeşnigir Kanyonu mesire alanının tepeden görünüşü: Kızılırmak kıyısında seyir terası, yürüyüş yolları ve tekne iskelesi." loading="lazy"></figure>' +
      '<div class="cards">' + GEZI.map(function (g, i) {
        var kredi = g[4] ? credit(g[3], g[4]) : (g[3] ? '<span class="kredi">Fotoğraf: ' + g[3] + '</span>' : '');
        return '<article class="box mk gezi-kart" id="yer-' + (i + 1) + '"><span class="gezi-no" aria-hidden="true">' + (i + 1) + '</span><img src="' + B + 'images/' + g[2] + '" alt="' + esc(g[5] || g[0]) + '" loading="lazy">' +
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
      '<li>Ahşap iskeleden kalkan teknelerle kanyonda tekne turu yapmak</li>' +
      '<li>Kanyon boyunca yaklaşık 6,5 km\'lik yolda yürüyüş yapmak ya da bisiklete binmek</li>' +
      '<li>Mesire alanında piknik yapmak</li>' +
      '<li>Doğada kamp yapmak</li>' +
      '<li>Behrek (Böğrek) Dağı ve çevresindeki tepelerde doğa yürüyüşü (trekking) yapmak</li>' +
      '<li>Gün doğumunu ve gün batımını izlemek</li>' +
      '<li>Özellikle ilkbahar ve sonbaharda tarihi köprüyü, kanyonun ışığını ve nehirdeki yansımaları fotoğraflamak</li>' +
      '<li>Kızılırmak kenarında yöresel kahvaltı yapmak, köylü pazarından alışveriş yapmak</li>' +
      '<li>Göl kıyısında sazan ve tatlı su levreği avlamak</li>' +
      '<li>Karşı kıyıdaki 5 bin yıllık Büklükale ören yerini ve Keskin\'deki Sulu Mağara\'yı görmek</li></ul>' +
      '</div><aside><div class="box box-pad"><h3>Nerede, Nasıl Gidilir?</h3>' +
      rows([['Yer', 'Köprüköy, Keskin / Kırıkkale'], ['Ankara\'dan', 'yaklaşık 113 km'], ['Kırıkkale\'den', '37 km'], ['Keskin\'den', '25 km'], ['Yol', 'Eski Ankara–Kırşehir yolu üzerinde']]) +
      '<p style="margin:14px 0 0"><a class="btn" href="' + MAP + '" target="_blank" rel="noopener">Haritada aç</a></p></div></aside></div></section>' +
      geziHaritaBolum() +
      placesSection() +
      '<section class="section"><div class="container"><div class="sec-head"><h2>Sık Sorulan Sorular</h2></div><div class="box box-pad">' +
      sss('Çeşnigir Köprüsü nerede?', 'Kırıkkale\'nin Keskin ilçesine bağlı Köprüköy\'de, Kızılırmak üzerindedir. Keskin\'e 25 km, Kırıkkale\'ye 37 km, Ankara\'ya yaklaşık 113 km uzaklıktadır.').replace('margin:18px', 'margin:0') +
      sss('Çeşnigir Köprüsü ne zaman yapıldı?', 'Köprü 13. yüzyılda, Anadolu Selçukluları döneminde yapılmıştır. Ayrıntılar için <a href="#/tarihimiz">köyün ve köprünün tarihçesine</a> bakabilirsiniz.') +
      sss('Ankara\'dan günübirlik gidilir mi?', 'Evet. Köprüköy Ankara\'ya yaklaşık 113 km uzaklıktadır; köprü, kanyon, seyir terası ve tekne turu bir günde gezilebilir.') +
      sss('En güzel fotoğraf ne zaman çekilir?', 'Gün batımında köprü sudaki yansımasıyla birlikte görünür. Sisli sabahlarda vadiyi kaplayan sis de görülmeye değerdir.') +
      sss('Yakında başka nereler gezilir?', 'Köprünün karşı kıyısındaki Büklükale ören yeri, Keskin\'deki Sulu Mağara ve yakınındaki Ceritkale Kanyonu.') +
      '</div><div class="btn-row" style="margin-top:20px"><a class="btn btn-light" href="#/tarihimiz">Köyün ve köprünün tarihçesi</a><a class="btn btn-light" href="#/fotograflar">Fotoğraflar</a></div></div></section>';
  }

  /* ---------- Sizden Gelenler (forum) ----------
     Köylülerin yazı paylaşıp birbirine cevap yazdığı bölüm. Yazılar Supabase'de durur (C.sb, kurulum: araclar/supabase-meydan.sql).
     Gönderilen her yazı ve cevap önce onaya düşer; yönetim panelinde onaylanınca burada görünür (yonetim/duzen.js).
     Liste ve yazı sayfası önce bellekteki son listeyle çizilir (geri dönünce kaldığı yerden açılsın), sonra yenisi gelir.
     Yazıya ve cevaba fotoğraf eklenebilir (en çok C.MEYDAN.fotoEnCok): fotoğraf telefonda küçültülür, Supabase deposuna yüklenir,
     yazıyla birlikte yalnız dosya yolu kaydedilir. Veritabanında fotoğraf sütunu henüz yoksa (kurulum çalıştırılmadıysa)
     bölüm fotoğrafsız çalışmaya devam eder (mSel). */
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
    var url = new URL(B || './', location.href.split(/[?#]/)[0]).href + '?m=' + k.id, text = 'SİZDEN GELENLER: ' + k.baslik + '\n' + url;
    return '<div class="share"><span>Paylaş:</span><a class="s-wa" href="https://wa.me/?text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp</a>' +
      '<a class="s-fb" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">' + icon('fb') + 'Facebook</a></div>';
  }
  // Okuma: "fotolar" sütunu henüz yoksa aynı istek sütunsuz yinelenir ve fotoğraf ekleme düğmesi gizlenir
  function mSel(path) {
    var sade = path.replace(',fotolar', '');
    if (C.MEYDAN.fotoYok) return C.sb(sade);
    return C.sb(path).catch(function (e) {
      if (e && e.status === 400 && sade !== path) { C.MEYDAN.fotoYok = true; return C.sb(sade); }
      throw e;
    });
  }
  var KAMERA = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>';
  // zorunlu: fotoğraf gönderme formu (fotoğrafsız gönderilemez, fotoğraf sütunu kontrolüne bağlı değil)
  function mFotoAlan(zorunlu) {
    return '<div class="m-foto"' + (C.MEYDAN.fotoYok && !zorunlu ? ' hidden' : '') + '><div class="m-foto-list" aria-live="polite"></div>' +
      '<label class="btn btn-light m-foto-btn">' + KAMERA + '<span>Fotoğraf ekle</span><input type="file" class="m-file" accept="image/*" multiple></label>' +
      '<p class="muted small m-note">' + (zorunlu ? 'Telefonunuzun galerisinden seçebilir ya da kamerayla çekebilirsiniz. Bir seferde en fazla ' : 'İsterseniz en fazla ') + C.MEYDAN.fotoEnCok + ' fotoğraf ekleyebilirsiniz.</p></div>';
  }
  function mFotoCiz(f) {
    var a = f._fotos || [], list = f.querySelector('.m-foto-list'), btn = f.querySelector('.m-foto-btn');
    list.innerHTML = a.map(function (x, i) {
      return '<div class="m-foto-kutu"><img src="' + x.url + '" alt="Eklenen fotoğraf ' + (i + 1) + '"><button type="button" data-mf-sil="' + i + '" aria-label="Fotoğraf ' + (i + 1) + ' kaldır">' + icon('x') + 'Kaldır</button></div>';
    }).join('');
    btn.hidden = a.length >= C.MEYDAN.fotoEnCok;
    btn.querySelector('span').textContent = a.length ? 'Bir fotoğraf daha ekle' : 'Fotoğraf ekle';
  }
  // Fotoğrafı uzun kenarı 1600 nokta olacak biçimde küçültür (telefon fotoğrafı 5-10 MB'tan 300-400 KB'a iner)
  function mKucult(file) {
    return new Promise(function (ok, no) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight, o = Math.min(1, 1600 / Math.max(w, h)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * o)); c.height = Math.max(1, Math.round(h * o));
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(function (b) { if (b) ok({ blob: b, url: URL.createObjectURL(b) }); else no(); }, 'image/jpeg', 0.82);
      };
      im.onerror = function () { URL.revokeObjectURL(u); no(); };
      im.src = u;
    });
  }
  document.addEventListener('change', function (e) {
    var inp = e.target;
    if (!inp.classList || !inp.classList.contains('m-file')) return;
    var f = inp.closest('form'), err = f.querySelector('.m-err'), a = f._fotos = f._fotos || [], lbl = f.querySelector('.m-foto-btn span');
    var files = Array.prototype.slice.call(inp.files || []).filter(function (x) { return /^image\//.test(x.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(x.name); });
    var bos = C.MEYDAN.fotoEnCok - a.length, fazla = files.length > bos, bozuk = 0;
    inp.value = '';
    if (!files.length) return;
    err.hidden = true; lbl.textContent = 'Fotoğraf hazırlanıyor…';
    files.slice(0, bos).reduce(function (p, file) {
      return p.then(function () { return mKucult(file).then(function (x) { a.push(x); }, function () { bozuk++; }); });
    }, Promise.resolve()).then(function () {
      mFotoCiz(f);
      if (bozuk) { err.textContent = bozuk > 1 ? 'Bazı fotoğraflar açılamadı. Başka fotoğraf seçin.' : 'Bu fotoğraf açılamadı. Başka bir fotoğraf seçin.'; err.hidden = false; }
      else if (fazla) { err.textContent = 'En fazla ' + C.MEYDAN.fotoEnCok + ' fotoğraf eklenebilir; ilk ' + C.MEYDAN.fotoEnCok + ' tanesi alındı.'; err.hidden = false; }
    });
  });
  function mForm(tur, konuId, yk) {
    var yeni = tur === 'konu', L = tur === 'yorum' ? YL[yk] || YL.yorum : null;
    return '<form class="m-form" data-m-form="' + tur + '"' + (konuId ? ' data-konu="' + konuId + '"' : '') + ' novalidate>' +
      (yeni ? '' : '<h3 class="m-form-h">' + (L ? L.h : 'Cevap yazın') + '</h3>') +
      '<label class="m-l">Adınız ve soyadınız<input name="ad" autocomplete="name" maxlength="60" value="' + esc(mAd()) + '"></label>' +
      (yeni ? '<label class="m-l">Ne hakkında?<select name="kategori">' + C.MEYDAN.kategoriler.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') + '</select></label>' +
        '<label class="m-l">Başlık<input name="baslik" maxlength="120" placeholder="Örnek: Eski düğünlerimizden bir hatıra"></label>' : '') +
      '<label class="m-l">' + (yeni ? 'Yazınız' : L ? L.l : 'Cevabınız') + '<textarea name="metin" rows="' + (yeni ? 6 : 4) + '" maxlength="' + (yeni ? 4000 : 2000) + '"></textarea></label>' +
      (L ? '' : mFotoAlan()) +
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
      '<p class="m-ex">' + esc(excerpt(k.metin, 220)) + '</p>' + C.fotolarHtml(k, 3) +
      '<a class="m-replies" href="#/konu/' + k.id + '">' + icon('chat') + (k.cevap_sayisi ? k.cevap_sayisi + ' cevap · Oku ve cevap yaz' : 'Devamını oku ve cevap yaz') + '</a></article>';
  }
  function mListHtml() {
    if (!mCache) return '<p class="loading">Yazılar yükleniyor…</p>';
    var list = mKat === 'Tümü' ? mCache : mCache.filter(function (k) { return k.kategori === mKat; });
    return list.length ? '<div class="m-list">' + list.map(mCard).join('') + '</div>' :
      '<div class="box empty"><b>' + (mCache.length ? 'Bu başlıkta henüz yazı yok' : 'Henüz yazı yok') + '</b>İlk yazıyı siz paylaşın.</div>';
  }
  function mDrawn(sayfa) { realLinks(main);
    if (C.MEYDAN.fotoYok) main.querySelectorAll('.m-foto').forEach(function (x) { x.hidden = true; }); document.dispatchEvent(new CustomEvent('meydan:ciz', { detail: { sayfa: sayfa } })); }
  /* Ana sayfa: "Sizden Gelenler" önizlemesi. Onaylı en yeni 3 yazı (başlık, kısa metin, varsa ilk fotoğraf, ad, zaman);
     dokununca yazı açılır. Altta "Siz de yazın" düğmesi yazı formunu açık hâlde açar (#/meydan/yaz).
     Telefonda açılışı yavaşlatmasın diye yazılar kutu ekrana yaklaşınca yüklenir. */
  var mSon = null;
  function mSonSatir(k) {
    var f = C.fotolar(k)[0];
    return '<a class="m-son-i" href="#/konu/' + k.id + '">' +
      (f ? '<img src="' + esc(C.fotoUrl(f)) + '" alt="" loading="lazy" width="64" height="64">' : '<span class="m-son-ik" aria-hidden="true">' + icon('chat') + '</span>') +
      '<span class="m-son-t"><b>' + esc(k.baslik) + '</b><span class="m-son-ex">' + esc(excerpt(k.metin, 110)) + '</span>' +
      '<span class="m-son-by">' + esc(k.ad) + ' · ' + esc(C.zaman(k.created_at)) + (k.cevap_sayisi ? ' · ' + k.cevap_sayisi + ' cevap' : '') + '</span></span></a>';
  }
  function mSonIc() {
    if (mSon === null) return '<p class="m-son-yuk">Yazılar yükleniyor…</p>';
    if (mSon === false) return '<p class="m-son-yuk">Yazılar şu anda açılamadı.</p>';
    if (!mSon.length) return '<p class="m-son-yuk">Henüz yazı yok. İlk yazıyı siz paylaşın.</p>';
    return mSon.map(mSonSatir).join('');
  }
  function mSonKutu() {
    setTimeout(function () {
      var b = $('mSon'); if (!b || mSon) return;
      var yukle = function () {
        mSel('/forum_konular?select=id,baslik,metin,ad,cevap_sayisi,created_at,fotolar&order=created_at.desc&limit=3')
          .then(function (r) { mSon = C.arr(r); }, function () { mSon = false; })
          .then(function () { var x = $('mSon'); if (x) { x.innerHTML = mSonIc(); realLinks(x); } if (mSon === false) mSon = null; });
      };
      if (!('IntersectionObserver' in window)) return yukle();
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); yukle(); } }, { rootMargin: '600px 0px' });
      io.observe(b);
    }, 0);
    return '<section class="box m-son" aria-labelledby="mSonH"><div class="m-son-head"><h3 id="mSonH">Sizden Gelenler</h3><a href="#/meydan">Tümünü gör ›</a></div>' +
      '<p class="m-son-alt">Hatıranızı, sorunuzu, gurbetten selamınızı paylaşın; köylülerimizle sohbet edin.</p>' +
      '<div id="mSon" class="m-son-list" aria-live="polite">' + mSonIc() + '</div>' +
      '<a class="btn m-son-btn" href="#/meydan/yaz">' + icon('pen') + 'Siz de yazın</a></section>';
  }
  function pageForum(yaz) {
    var seq = ++mSeq;
    setTimeout(function () {
      mSel('/forum_konular?select=id,kategori,baslik,metin,ad,sabit,cevap_sayisi,son_hareket,created_at,fotolar&order=sabit.desc,son_hareket.desc&limit=300')
        .then(function (r) { mCache = C.arr(r); }, function () { if (!mCache) mCache = false; })
        .then(function () {
          var b = $('mList'); if (seq !== mSeq || !b) return;
          b.innerHTML = mCache === false ? mFail() : mListHtml();
          mDrawn('meydan');
        });
    }, 0);
    var kats = ['Tümü'].concat(C.MEYDAN.kategoriler);
    return band('Sizden Gelenler', 'Hatıranızı, sorunuzu, gurbetten selamınızı paylaşın; köylülerimizle sohbet edin.') +
      '<section class="section"><div class="container m-wrap"><div class="m-main">' +
      '<details class="m-new"' + (yaz ? ' open' : '') + '><summary class="btn">' + icon('pen') + 'Yeni yazı paylaş</summary><div class="box box-pad">' + mForm('konu') + '</div></details>' +
      '<div class="filters" role="group" aria-label="Yazıların konusu">' + kats.map(function (t) {
        return '<button type="button" data-m-kat="' + esc(t) + '" aria-pressed="' + (t === mKat) + '">' + esc(t) + '</button>';
      }).join('') + '</div>' +
      '<div id="mList">' + (mCache === false ? '<p class="loading">Yazılar yükleniyor…</p>' : mListHtml()) + '</div></div>' +
      '<aside class="m-side"><div class="box box-pad m-rules"><h3>Paylaşım kuralları</h3><ul>' +
      '<li>Adınızı ve soyadınızı yazın.</li><li>Saygılı bir dil kullanın; kırıcı söz, siyaset ve kavga yok.</li>' +
      '<li>Telefon, adres gibi kişisel bilgileri paylaşmayın.</li><li>Yazınıza ve cevabınıza fotoğraf ekleyebilirsiniz; başkasının fotoğrafını izinsiz paylaşmayın.</li><li>Her yazı ve cevap, dernek yönetimi onayladıktan sonra yayınlanır.</li></ul>' +
      '<p class="small muted" style="margin:10px 0 0">Satılık ve aranan şeyler için <a href="#/pazar">Market</a> sayfasına bakın.</p></div></aside>' +
      '</div></section>';
  }

  function mReply(c) { return '<div class="m-rep" data-m-cevap="' + c.id + '">' + mBy(c) + '<div class="m-rep-text">' + mParas(c.metin) + '</div>' + C.fotolarHtml(c) + '</div>'; }
  function mTopicHtml(k) {
    return '<article class="m-art" data-m-konu="' + k.id + '"' + (k.sabit ? ' data-sabit="1"' : '') + '>' +
      '<div class="news-meta">' + (k.sabit ? '<span class="badge m-pinned">Sabit</span>' : '') + '<span class="badge">' + esc(k.kategori) + '</span></div>' +
      '<h1>' + esc(k.baslik) + '</h1>' + mBy(k) + '<div class="article-text">' + mParas(k.metin) + '</div>' + C.fotolarHtml(k) + mShare(k) + '</article>' +
      '<section class="m-rep-sec"><h2 class="m-rep-h">Cevaplar</h2><div id="mReps"><p class="muted">Cevaplar yükleniyor…</p></div><div id="mPend"></div>' +
      '<div class="box box-pad">' + mForm('cevap', k.id) + '</div></section>' +
      '<p style="margin-top:24px"><a class="btn btn-light" href="#/meydan">‹ Sizden Gelenler</a></p>';
  }
  function pageTopic(id) {
    var seq = ++mSeq, k = /^\d+$/.test(id) && mCache ? mCache.filter(function (x) { return String(x.id) === id; })[0] : null;
    var gone = band('Yazı bulunamadı') + '<section class="section"><div class="container"><p>Bu yazı kaldırılmış ya da henüz onaylanmamış olabilir.</p><a class="btn" href="#/meydan">Sizden Gelenler</a></div></section>';
    if (!/^\d+$/.test(id)) return gone;
    setTimeout(function () {
      Promise.all([
        k ? Promise.resolve([k]) : mSel('/forum_konular?id=eq.' + id + '&select=id,kategori,baslik,metin,ad,sabit,cevap_sayisi,son_hareket,created_at,fotolar'),
        mSel('/forum_cevaplar?konu_id=eq.' + id + '&select=id,metin,ad,created_at,fotolar&order=created_at.asc&limit=500')
      ]).then(function (r) {
        if (seq !== mSeq) return;
        var x = C.arr(r[0])[0], box = $('mTopic');
        if (!box) return;
        if (!x) { main.innerHTML = gone; realLinks(main); return; }
        if (!box.querySelector('[data-m-konu]')) { box.innerHTML = mTopicHtml(x); document.title = x.baslik + ' · Sizden Gelenler · Çeşnigir-Der'; }
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
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/meydan">Sizden Gelenler</a></div></div></div>' +
      '<section class="section"><div class="container"><div class="article m-topic" id="mTopic">' + (k ? mTopicHtml(k) : '<p class="loading">Yükleniyor…</p>') + '</div></div></section>';
  }

  // Formdaki fotoğrafları sırayla yükler, dosya yollarını döndürür (yüklenmiş olan yeniden yüklenmez)
  function mFotoGonder(fotos, btn) {
    return fotos.reduce(function (p, x, i) {
      return p.then(function (yollar) {
        btn.textContent = fotos.length > 1 ? 'Fotoğraflar yükleniyor (' + (i + 1) + ' / ' + fotos.length + ')…' : 'Fotoğraf yükleniyor…';
        return x.yol ? yollar.concat(x.yol) : C.fotoYukle(x.blob).then(function (yol) { x.yol = yol; return yollar.concat(yol); });
      });
    }, Promise.resolve([]));
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
    var fotos = (f._fotos || []).slice();
    var done = function () { fotos.forEach(function (x) { URL.revokeObjectURL(x.url); });
      var t = document.createElement('div'); t.innerHTML = mThanks(tur); f.parentNode.replaceChild(t.firstChild, f); };
    if (v.web) { done(); return; }   // yalnız otomatik programların doldurduğu gizli alan
    var ys = f.closest('.y-sec');
    var body = tur === 'konu' ? { ad: v.ad, kategori: v.kategori, baslik: v.baslik, metin: v.metin } :
      tur === 'yorum' ? { ad: v.ad, metin: v.metin, hedef_tur: ys.getAttribute('data-y'), hedef: ys.getAttribute('data-yh'), hedef_baslik: (ys.getAttribute('data-yb') || '').slice(0, 200) } :
      { ad: v.ad, metin: v.metin, konu_id: +f.getAttribute('data-konu') };
    // Fotoğraflar sırayla yüklenir; hepsi yüklenince yazı, dosya yollarıyla birlikte kaydedilir
    mFotoGonder(fotos, btn).then(function (yollar) {
      if (yollar.length) { body.fotolar = yollar; btn.textContent = 'Gönderiliyor…'; }
      return C.sb({ konu: '/forum_konular', cevap: '/forum_cevaplar', yorum: '/yorumlar' }[tur], { method: 'POST', headers: { Prefer: 'return=minimal' }, body: body });
    }).then(done).catch(function (er) {
        btn.disabled = false; btn.innerHTML = label;
        hata(er && er.status === 'net' ? 'İnternet bağlantısı yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.' :
          er && er.foto ? 'Fotoğraf yüklenemedi. Biraz sonra tekrar deneyin ya da fotoğrafı kaldırıp yazınızı fotoğrafsız gönderin. (Hata F' + er.status + (er.message ? ': ' + er.message : '') + ')' :
          er && /çok fazla/.test(er.message || '') ? er.message : 'Gönderilemedi. Lütfen biraz sonra tekrar deneyin.' + (er && er.status ? ' (Hata ' + er.status + (er.message ? ': ' + String(er.message).slice(0, 120) : '') + ')' : ''));
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
    var mf = e.target.closest('[data-mf]');
    if (mf) {
      e.preventDefault();
      var kutu = mf.closest('[data-mf-list]'), sahip = kutu.closest('.m-card,.m-art,.m-rep,.ed-m-item'), kim = sahip && sahip.querySelector('.m-by b, .ed-m-by b');
      openV(kutu.getAttribute('data-mf-list').split(',').map(function (p) { return { src: C.fotoUrl(p), cap: kim ? kim.textContent : '' }; }), +mf.getAttribute('data-mf'));
      return;
    }
    var sil = e.target.closest('[data-mf-sil]');
    if (sil) {
      var ff = sil.closest('form'), x = ff._fotos.splice(+sil.getAttribute('data-mf-sil'), 1)[0];
      if (x) URL.revokeObjectURL(x.url);
      ff.querySelector('.m-err').hidden = true;
      mFotoCiz(ff); ff.querySelector('.m-file').focus();
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
     Sizden Gelenler ile aynı düzen: yorumlar Supabase'de (yorumlar tablosu), her yorum önce onaya düşer.
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
    var x = null;
    data.galeri.some(function (y) { if (fKey(y) === key) { x = y; return true; } return false; });
    if (!x) return band('Fotoğraf bulunamadı') + '<section class="section"><div class="container"><p>Bu fotoğraf kaldırılmış olabilir.</p><a class="btn" href="#/fotograflar">Tüm fotoğraflar</a></div></section>';
    // önceki / sonraki fotoğraf aynı bölümden (Köyümüzden ya da Derneğimizden)
    var kat = fKat(x), list = data.galeri.filter(function (y) { return fKat(y) === kat; }), i = list.indexOf(x), gi = data.galeri.indexOf(x);
    var n = list.length, prev = list[(i - 1 + n) % n], next = list[(i + 1) % n], cap = x.aciklama || '';
    fotoSekme = kat;
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/fotograflar">Fotoğraflar</a> › <a href="#/fotograflar/' + kat + '">' + FOTO_KAT[kat][1] + '</a></div></div></div>' +
      '<section class="section"><div class="container"><article class="article" data-gk="' + kat + '">' +
      '<button type="button" class="article-img" data-gal="' + gi + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(img(x.foto)) + '" alt="' + esc(fAlt(x)) + '" style="aspect-ratio:auto;object-fit:contain"></button>' +
      (cap ? '<h1 class="f-cap">' + esc(cap) + '</h1>' : '<h1 class="f-cap">' + FOTO_KAT[kat][0] + ' · ' + (i + 1) + ' / ' + n + '</h1>') +
      (x.gonderen ? '<p class="muted">Gönderen: ' + esc(x.gonderen) + '</p>' : '') +
      (n > 1 ? '<div class="btn-row"><a class="btn btn-light" href="#/foto/' + encodeURIComponent(fKey(prev)) + '">‹ Önceki fotoğraf</a>' +
        '<a class="btn btn-light" href="#/foto/' + encodeURIComponent(fKey(next)) + '">Sonraki fotoğraf ›</a></div>' : '') +
      yBox('foto', key, cap || 'Fotoğraf') +
      '<p style="margin-top:24px"><a class="btn btn-light" href="#/fotograflar/' + kat + '">‹ ' + FOTO_KAT[kat][0] + '</a></p></article></div></section>';
  }

  /* ---------- yönlendirme ---------- */
  /* Arama motorları için her sayfanın gerçek bir adresi vardır (hakkimizda/, duyurular/, p/d-…html; araclar/site-sayfalari.js üretir).
     Sayfadaki #/… bağlantıları bu adresleri gösterir (data-h asıl hedefi tutar); dokununca sayfa yenilenmeden geçilir. */
  var REAL = { 'gezilecek-yerler': 1, tarihimiz: 1, hakkimizda: 1, duyurular: 1, etkinlikler: 1, fotograflar: 1 };
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
    tarihimiz: 'Tarihimiz: Çeşnigir Köprüsü ve Köprüköy\'ün tarihi · Çeşnigir-Der',
    hakkimizda: 'Hakkımızda ve iletişim · Çeşnigir-Der, Köprüköy (Keskin, Kırıkkale)',
    'gezilecek-yerler': 'Çeşnigir Köprüsü ve Kanyonu: Kırıkkale\'de gezilecek yerler · Köprüköy',
    duyurular: 'Köprüköy, Keskin ve Kırıkkale haberleri ve duyurular · Çeşnigir-Der',
    etkinlikler: 'Köprüköy etkinlik takvimi: düğün, mevlit ve özel günler · Çeşnigir-Der',
    fotograflar: 'Köprüköy ve Çeşnigir Köprüsü fotoğrafları · Çeşnigir-Der',
    meydan: 'Sizden Gelenler: Köprüköylülerin yazıları, hatıraları ve selamları · Çeşnigir-Der',
    rehber: 'Esnaf Rehberi: Köprüköylülerin dükkân ve işletmeleri · Çeşnigir-Der',
    'bize-ulasin': 'Bize Ulaşın: dernek yönetimine mesaj gönderin · Çeşnigir-Der'
  };
  function route() {
    // adreste #/… yoksa üretilmiş sayfanın kendi içeriği (CD_ROUTE) açılır
    var h = location.hash.indexOf('#/') === 0 ? location.hash.replace(/^#\/?/, '') : (window.CD_ROUTE || ''), p = h.split('/'), html;
    var page = p[0] || '';
    if (page === 'duyuru') html = pageArticle(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'duyurular') html = pageNews();
    else if (page === 'etkinlikler') html = pageEvents();
    else if (page === 'etkinlik') html = pageEvent(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'fotograflar') html = pagePhotos(p[1]);
    else if (page === 'pazar') html = pageMarket();
    else if (page === 'ilan') html = pageListing(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'rehber') html = pageRehber();
    else if (page === 'isletme') html = pageIsletme(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'hakkimizda' || page === 'iletisim') { page = 'hakkimizda'; html = pageAbout(); }   // İletişim, Hakkımızda'ya taşındı
    else if (page === 'bize-ulasin') html = pageAbout();   // mesaj formu Hakkımızda'nın içinde; sayfa forma kayar
    else if (page === 'tarihimiz' || page === 'tarihce' || page === 'koyumuz') { page = 'tarihimiz'; html = pageTarih(); }
    else if (page === 'gezilecek-yerler' || page === 'gezi') { page = 'gezilecek-yerler'; html = pageGezi(); }
    else if (page === 'meydan') html = pageForum(p[1] === 'yaz');
    else if (page === 'foto') html = pagePhoto(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'konu') html = pageTopic(decodeURIComponent(p.slice(1).join('/')));
    else { page = ''; loadWeather(); html = pageHome(); }
    var hash = location.hash, back = !tapped && hash !== curHash && pos[hash] > 0;
    tapped = false; curHash = hash;
    main.innerHTML = html;
    radyoSync();
    realLinks(main);
    if (ilkAcilis) ilkAcilis = false; else { main.classList.remove('gir'); void main.offsetWidth; main.classList.add('gir'); }   // ilk açılışta beklemeden görünsün
    var navKey = page === 'duyuru' ? 'duyurular' : page === 'etkinlik' ? 'etkinlikler' : page === 'ilan' ? 'pazar' : page === 'isletme' ? 'rehber' : page === 'konu' ? 'meydan' : page === 'foto' ? 'fotograflar' : page;
    if (page === 'etkinlik' || page === 'ilan' || page === 'isletme' || page === 'duyuru') { var sp = main.querySelector('[data-share-photo]'); if (sp) C.warmShare(sp.getAttribute('data-share-photo')); }
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
    if (page === 'gezilecek-yerler') geziHarita();
    if (page === 'hakkimizda' || page === 'bize-ulasin') buHazirla();
    if (page === 'bize-ulasin' && !back) { var bu = $('bize-ulasin'); if (bu) bu.scrollIntoView(); }
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
    f += '<div class="f-bu"><a href="#/bize-ulasin">✉ Bize Ulaşın: mesaj gönderin</a></div>';
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

  /* ---------- Keskin FM canlı radyo ---------- */
  // Keskin FM'in (102.1) canlı yayını ana sayfada, canlı görüntünün altındaki düğmeyle dinlenir. Ses yalnızca düğmeye basınca başlar;
  // sayfalar arasında gezerken ve kaydırırken çalmaya devam eder; bir kez açıldıktan sonra sağ altta küçük bir düğme kalır (durdurur / yeniden başlatır).
  // Durdurunca bağlantı kesilir (internet harcamaz); yeniden başlatınca yayın o anki yerinden gelir.
  // RADYO_GOSTER: Keskin FM'den izin gelene kadar radyo kapalı (ana sayfadaki düğme ve sağ alttaki küçük düğme görünmez).
  // İzin gelince true yapın ve sayfalardaki app.js?v= ekini değiştirin.
  var RADYO_GOSTER = true;
  var RADYO = 'https://keskinfm.com/api/stream', RADYO_SITE = 'https://keskinfm.com', rAudio = null, rSt = 'idle', rNo = 0;
  var R_TX = { idle: 'Canlı radyo · dinlemek için dokunun', load: 'Bağlanıyor…', play: 'Çalıyor · durdurmak için dokunun', err: 'Yayına şu an ulaşılamıyor, biraz sonra deneyin' };
  var R_IC = '<svg class="r-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z"/></svg>' +
    '<svg class="r-stop" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>';
  function radyoOn() { return rSt === 'play' || rSt === 'load'; }
  function radyoHtml() {
    if (!RADYO_GOSTER) return '';
    return '<div class="radyo"><button type="button" class="radyo-btn" id="radyoBtn" data-st="' + rSt + '" aria-pressed="' + radyoOn() + '">' +
      '<span class="radyo-ic">' + R_IC + '</span><span class="radyo-tx"><b>Keskin FM 102.1</b><small aria-live="polite">' + R_TX[rSt] + '</small></span></button>' +
      '<a class="radyo-src" href="' + RADYO_SITE + '" target="_blank" rel="noopener">Yayın: keskinfm.com</a></div>';
  }
  // Radyo bir kez açıldıktan sonra sağ alttaki küçük düğme kaybolmaz: çalarken durdurur, durmuşken yeniden başlatır
  // (sayfa yenilense de aynı sekmede kalır).
  var rSeen = false; try { rSeen = sessionStorage.getItem('cd_radyo') === '1'; } catch (e) { /* yok say */ }
  function radyoSync() {
    if (!RADYO_GOSTER) { var op = $('radyoPill'); if (op) op.remove(); document.body.classList.remove('radyo-acik'); return; }
    var b = $('radyoBtn'), p = $('radyoPill'), on = radyoOn();
    if (on && !rSeen) { rSeen = true; try { sessionStorage.setItem('cd_radyo', '1'); } catch (e) { /* yok say */ } }
    if (b) { b.setAttribute('data-st', rSt); b.setAttribute('aria-pressed', String(on)); b.querySelector('small').textContent = R_TX[rSt]; }
    if (rSeen && !p) { document.body.insertAdjacentHTML('beforeend', '<button type="button" id="radyoPill" class="radyo-pill">' + R_IC + '<span>Keskin FM</span><i class="r-bars" aria-hidden="true"><i></i><i></i><i></i></i></button>'); p = $('radyoPill'); }
    if (p) { p.setAttribute('data-st', rSt); p.setAttribute('aria-pressed', String(on));
      p.setAttribute('aria-label', 'Keskin FM radyo: ' + (rSt === 'play' ? 'çalıyor, durdurmak için dokunun' : rSt === 'load' ? 'bağlanıyor' : rSt === 'err' ? 'yayına ulaşılamadı, yeniden denemek için dokunun' : 'dinlemek için dokunun')); }
    document.body.classList.toggle('radyo-acik', rSeen);
  }
  function radyoStop(st) {
    rSt = st || 'idle'; rNo++;
    if (rAudio) { try { rAudio.pause(); rAudio.removeAttribute('src'); rAudio.load(); } catch (e) { /* yok say */ } }
    radyoSync();
  }
  function radyoToggle() {
    if (radyoOn()) { radyoStop(); return; }
    if (!rAudio) {
      rAudio = new Audio(); rAudio.preload = 'none';
      rAudio.addEventListener('playing', function () { if (radyoOn()) { rSt = 'play'; radyoSync(); } });
      rAudio.addEventListener('waiting', function () { if (rSt === 'play') { rSt = 'load'; radyoSync(); } });
      rAudio.addEventListener('error', function () { if (radyoOn()) radyoStop('err'); });
      rAudio.addEventListener('ended', function () { if (radyoOn()) radyoStop('err'); });
    }
    var no = ++rNo;
    rSt = 'load'; radyoSync();
    rAudio.src = RADYO;
    try {
      var pr = rAudio.play();
      if (pr && pr.catch) pr.catch(function () { if (no === rNo && radyoOn()) radyoStop('err'); });
    } catch (e) { radyoStop('err'); }
    // telefonun kilit ekranında ve bildirimde yayının adı görünsün
    try { if ('mediaSession' in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: 'Keskin FM 102.1', artist: 'Canlı yayın', album: 'Çeşnigir-Der' }); } catch (e) { /* yok say */ }
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
    if (!E) {
      if (!$('toTop')) document.body.insertAdjacentHTML('beforeend', '<button type="button" id="toTop" class="to-top" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 15 7-7 7 7"/></svg>Yukarı</button>');
      var ttTick = false;
      window.addEventListener('scroll', function () {
        if (ttTick) return; ttTick = true;
        requestAnimationFrame(function () { ttTick = false; $('toTop').hidden = window.pageYOffset < 1200; });
      }, { passive: true });
    }
    $('menuBtn').addEventListener('click', function () { setMenu(!$('nav').classList.contains('open')); });
    document.addEventListener('click', function (e) {
      // menü açıkken dışına dokunmak yalnızca menüyü kapatır
      if ($('nav').classList.contains('open') && !e.target.closest('.header')) { closeMenu(); e.preventDefault(); return; }
      if (e.target.closest('#liveOpen')) { liveBig(true); return; }
      if (e.target.closest('#radyoBtn')) { radyoToggle(); return; }
      if (e.target.closest('#radyoPill')) { radyoToggle(); return; }
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
      if (e.target.closest('[data-more]')) { var seen = newsShown; newsShown += NEWS_STEP; main.innerHTML = pageNews(); realLinks(main); yBadges();
        var nx = main.querySelectorAll('.news')[seen]; if (nx) nx.focus({ preventScroll: true }); return; }
      var ef = e.target.closest('[data-evf]');
      if (ef) { evFilter = ef.getAttribute('data-evf'); main.innerHTML = pageEvents(); realLinks(main); if (E) E.after('etkinlikler'); yBadges();
        var eb = main.querySelector('[data-evf="' + evFilter + '"]'); if (eb) eb.focus(); return; }
      if (e.target.closest('#toTop')) { window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' }); main.focus({ preventScroll: true }); return; }
      if (f) { filter = f.getAttribute('data-filter'); newsShown = NEWS_STEP; main.innerHTML = pageNews(); realLinks(main); yBadges(); var b = main.querySelector('[data-filter="' + filter + '"]'); if (b) b.focus(); return; }
      var cn = e.target.closest('[data-cal-nav]');
      if (cn) { var dir = +cn.getAttribute('data-cal-nav'), dt = new Date(calY, calM + dir, 1); calY = dt.getFullYear(); calM = dt.getMonth();
        redrawCal('[data-cal-nav="' + dir + '"]'); return; }
      var cd = e.target.closest('[data-cal-day]');
      if (cd) { var ci = cd.getAttribute('data-cal-day'); calSel = calSel === ci ? '' : ci; redrawCal('[data-cal-day="' + ci + '"]'); return; }
      var g = e.target.closest('[data-gal]');
      if (g) {
        // bölüm sayfasında oklarla yalnız o bölümün fotoğrafları gezilir
        var gk = g.closest('[data-gk]'), gkat = gk ? gk.getAttribute('data-gk') : '', gi = +g.getAttribute('data-gal'), gl = [], at = 0;
        data.galeri.forEach(function (x, j) { if (!gkat || fKat(x) === gkat) { if (j === gi) at = gl.length; gl.push(x); } });
        openV(gl.map(function (x) { return { src: img(x.foto), cap: x.aciklama, key: fKey(x) }; }), at); return;
      }
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
    var map = { e: 'etkinlik', i: 'ilan', r: 'isletme', d: 'duyuru', m: 'konu' };
    Object.keys(map).some(function (k) {
      var v = q.get(k); if (!v) return false;
      history.replaceState(null, '', location.pathname + '#/' + map[k] + '/' + encodeURIComponent(v));
      return true;
    });
  })();

  bind();
  Promise.all([load('duyurular', []), load('etkinlikler', []), load('resmi-gunler', {}), load('galeri', []), load('pazar', []), load('dernek', {}), load('rehber', [])])
    .then(function (r) {
      data = {
        duyurular: C.arr(r[0]), etkinlikler: C.arr(r[1]),
        resmi: r[2] && typeof r[2] === 'object' ? r[2] : {},
        galeri: C.arr(r[3]).filter(function (x) { return img(x.foto); }), pazar: C.arr(r[4]), rehber: C.arr(r[6]),
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
        route: route, evRow: evRow, eid: eid, iid: iid, pid: pid, rid: rid
      });
      route();
    });
})();
