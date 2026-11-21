/* Çeşnigir-Der · Tasarım 3
   Sayfalar: Ana Sayfa, Duyurular (ve ayrıntı), Etkinlikler, Fotoğraflar, Market, Hakkımızda, İletişim.
   İçerik data/ klasöründen okunur; yönetim panelinden değişir. */
(function () {
  'use strict';
  var C = window.CD, esc = C.esc, B = '';
  var MAP = 'https://www.google.com/maps?q=39.5765122,33.4357454';
  var data = null;
  var main = document.getElementById('icerik');
  var pos = {}, curHash = location.hash, tapped = false;   // sayfaların kaydırma yeri (geri dönünce kaldığı yerden)

  function $(id) { return document.getElementById(id); }
  function icon(n) { return '<svg aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function img(p) { return C.imgSrc(p, B); }
  function load(name, fb) {
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
  function pid(p) { return (C.normIso(p.tarih) || 'x') + '-' + (C.slug(p.baslik).slice(0, 50) || 'duyuru'); }
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
  function peopleRows(d) {
    return ((d.baskan || d.telefon) ? '<li><span>Dernek Başkanı</span>' + person(d.baskan, d.telefon) + '</li>' : '') +
      ((d.baskan2 || d.telefon2) ? '<li><span>Başkan Yardımcısı</span>' + person(d.baskan2, d.telefon2) + '</li>' : '');
  }
  function people(d) {
    return ((d.baskan || d.telefon) ? person(d.baskan, d.telefon) : '') + ((d.baskan2 || d.telefon2) ? person(d.baskan2, d.telefon2) : '');
  }
  function contactButtons(d, wide) {
    var tel = C.telHref(d.telefon), wa = C.waHref(d.whatsapp || d.telefon), h = '';
    if (tel) h += '<a class="btn" href="tel:' + esc(tel) + '">' + icon('phone') + 'Derneği Ara</a>';
    if (wa) h += '<a class="btn btn-green" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp</a>';
    return '<div class="btn-row"' + (wide ? '' : '') + '>' + h + '</div>';
  }

  /* ---------- parçalar ---------- */
  function newsCard(p) {
    var src = img(p.foto);
    return '<a class="news" href="#/duyuru/' + esc(pid(p)) + '">' +
      '<div class="news-img' + (src ? '' : ' noimg') + '">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<img class="ph" src="' + B + 'images/logo-160.png" alt="">') + '</div>' +
      '<div class="news-body"><div class="news-meta">' + (p.tur ? '<span class="' + C.badgeClass(p.tur) + '">' + esc(p.tur) + '</span>' : '') +
      '<span>' + esc(C.longDate(p.tarih)) + '</span></div>' +
      '<h3>' + esc(p.baslik) + '</h3>' + (p.metin ? '<p>' + esc(excerpt(p.metin, 150)) + '</p>' : '') +
      '<span class="read">Devamını oku ›</span></div></a>';
  }

  function upcoming(days) {
    var today = C.todayIso(), end = C.addDays(today, days), out = [];
    data.etkinlikler.forEach(function (e) {
      var iso = C.normIso(e.tarih);
      if (iso && iso >= today) out.push({ iso: iso, ad: e.ad, tur: e.tur, saat: e.saat, yer: e.yer, foto: e.foto, id: eid(e), koy: true });
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
  function shareUrl(o) { return location.href.split(/[?#]/)[0] + '?' + o.key + '=' + encodeURIComponent(o.id); }
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
    return '<div class="ev' + (e.koy ? ' koy' : ' official') + '"><div class="ev-date" aria-hidden="true"><span>' + C.AY_KISA[p.m] + '</span><b>' + p.d +
      '</b><small>' + C.GUN[p.wd] + '</small></div><div class="ev-info">' + (until ? '<div class="ev-when">' + esc(until) + '</div>' : '') +
      (e.tur ? '<span class="' + C.badgeClass(e.tur) + '">' + esc(e.tur) + '</span> ' : '') +
      (e.koy ? '<a class="ev-link" href="#/etkinlik/' + esc(e.id) + '"><b>' + esc(e.ad) + '</b></a>' : '<b>' + esc(e.ad) + '</b>') +
      '<div class="muted">' + esc(C.longDate(e.iso, true)) + (det ? ' · ' + esc(det) : '') + '</div>' + evExtras(e, det) + '</div></div>';
  }

  function galleryGrid(list, cls) {
    return '<div class="gal ' + (cls || '') + '">' + list.map(function (x) {
      var i = data.galeri.indexOf(x);
      return '<button type="button" data-gal="' + i + '" aria-label="Fotoğrafı büyüt: ' + esc(x.aciklama) + '"><img src="' + esc(img(x.foto)) + '" alt="' + esc(x.aciklama) + '" loading="lazy"></button>';
    }).join('') + '</div>';
  }

  /* ---------- ana sayfa takvimi ----------
     Ay görünümü: köy etkinliği olan günler bordo, resmî ve dinî günler altın çerçeveli. Renkli güne dokununca
     o günün ayrıntısı takvimin altında açılır (evRow: saat, yer, fotoğraf, paylaş düğmeleri). */
  var calY = null, calM = null, calSel = '';
  function dayItems(iso) {
    var p = C.parts(iso), out = [];
    data.etkinlikler.forEach(function (e) {
      if (C.normIso(e.tarih) === iso) out.push({ iso: iso, ad: e.ad, tur: e.tur, saat: e.saat, yer: e.yer, foto: e.foto, id: eid(e), koy: true });
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
    var d = data.dernek, news = byDate(data.duyurular, -1).slice(0, 4), ev = upcoming(45).slice(0, 4);
    var h = '<section class="hero"><img src="' + B + 'images/banner.jpg" width="1800" height="675" decoding="async" alt=""Gün batımında Çeşnigir Köprüsü ve Türk bayrağı, üzerinde Çeşnigir-Der yazısı."></section>' +
      '<div class="welcome"><div class="container welcome-in" style="padding:22px 18px"><div><h1>Köprüköy\'e hoş geldiniz</h1>' +
      '<p>Köyümüzden duyurular, vefat ve düğün haberleri, etkinlikler ve fotoğraflar.</p></div></div></div>';
    var live = C.ytEmbed(d.canli_yayin);
    if (live) h += '<section class="section alt"><div class="container" style="max-width:960px"><div class="sec-head"><h2><span class="live-dot" aria-hidden="true"></span>Köyden Canlı Görüntü</h2></div>' +
      '<div class="box" style="position:relative;aspect-ratio:16/9;background:#000">' + C.ytFrame(live) + '</div></div></section>';

    h += '<section class="section"><div class="container grid-main"><div>' +
      '<div class="sec-head"><h2>Son Duyurular</h2><a href="#/duyurular">Tüm duyurular ›</a></div>' +
      (news.length ? '<div class="news-list">' + news.map(newsCard).join('') + '</div>' : '<div class="box empty"><b>Henüz duyuru yok</b></div>') +
      '</div><aside>' +
      '<div class="sec-head"><h2>Yaklaşan Günler</h2></div>' + calendar() +
      '<div class="box" style="margin-top:14px">' + (ev.length ? ev.map(evRow).join('') : '<div class="empty">Yaklaşan bir gün yok.</div>') + '</div>' +
      '<p style="margin:10px 0 0"><a href="#/etkinlikler" style="font-weight:700">Tüm takvim ›</a></p>' +
      '</aside></div></section>';

    var g = data.galeri.slice(0, 6);
    if (g.length) h += '<section class="section alt"><div class="container"><div class="sec-head"><h2>Fotoğraflardan</h2><a href="#/fotograflar">Tüm fotoğraflar (' + data.galeri.length + ') ›</a></div>' +
      galleryGrid(g, 'strip') + '</div></section>';

    h += '<section class="section"><div class="container village"><img src="' + B + 'images/koprukoy-gol.jpg" alt="Göl kıyısından Köprüköy ve Çeşnigir Köprüsü." loading="lazy">' +
      '<div><div class="sec-head"><h2>Köyümüz Köprüköy</h2></div>' +
      '<p>Köyümüz adını Kızılırmak üzerindeki tarihi Çeşnigir Köprüsü\'nden alır. Selçuklu döneminden kalan on iki gözlü bu taş köprü, yüzyıllarca Ankara ile Kırşehir arasındaki yolun geçiş noktası oldu.</p>' +
      '<p class="muted">Kapulukaya Baraj Gölü kıyısında, Keskin\'e 25 km, Kırıkkale\'ye 37 km uzaklıktayız.</p>' +
      '<a class="btn btn-light" href="#/hakkimizda">Köyümüz, tarihçe ve gezilecek yerler</a></div></div></section>';
    return h;
  }

  var filter = 'Tümü';
  function pageNews() {
    var all = byDate(data.duyurular, -1);
    var types = ['Tümü'].concat(C.DUYURU_TURLERI.filter(function (t) { return all.some(function (p) { return p.tur === t; }); }));
    if (types.indexOf(filter) < 0) filter = 'Tümü';
    var list = filter === 'Tümü' ? all : all.filter(function (p) { return p.tur === filter; });
    return band('Duyurular', 'Vefat, düğün ve toplantı ilanları ile köyümüzden haberler.') +
      '<section class="section"><div class="container">' +
      (types.length > 2 ? '<div class="filters" role="group" aria-label="Duyuru türü">' + types.map(function (t) {
        return '<button type="button" data-filter="' + esc(t) + '" aria-pressed="' + (t === filter) + '">' + esc(t) + '</button>';
      }).join('') + '</div>' : '') +
      (list.length ? '<div class="news-list">' + list.map(newsCard).join('') + '</div>' : '<div class="box empty"><b>Henüz duyuru yok</b>Yeni duyurular burada görünecek.</div>') +
      '</div></section>';
  }

  function pageArticle(id) {
    var p = data.duyurular.filter(function (x) { return pid(x) === id; })[0];
    if (!p) return band('Duyuru bulunamadı') + '<section class="section"><div class="container"><p>Bu duyuru kaldırılmış olabilir.</p><a class="btn" href="#/duyurular">Tüm duyurular</a></div></section>';
    var src = img(p.foto), link = C.linkUrl(p.link);
    var paras = String(p.metin || '').split(/\n\s*\n|\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    return '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/duyurular">Duyurular</a></div></div></div>' +
      '<section class="section"><div class="container"><article class="article">' +
      '<div class="news-meta">' + (p.tur ? '<span class="' + C.badgeClass(p.tur) + '">' + esc(p.tur) + '</span>' : '') + '<span>' + esc(C.longDate(p.tarih, true)) + '</span></div>' +
      '<h1>' + esc(p.baslik) + '</h1>' +
      (src ? '<button type="button" class="article-img" data-photo="' + esc(src) + '" data-cap="' + esc(p.baslik) + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(src) + '" alt="' + esc(p.foto_aciklama || p.baslik) + '"></button>' : '') +
      '<div class="article-text">' + paras.map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' +
      (p.kaynak ? '<p class="muted small">Kaynak: ' + esc(p.kaynak) + '</p>' : '') +
      '<div class="btn-row">' + shareButtons({ key: 'd', id: id, tur: p.tur, title: p.baslik, photo: src }, true) +
      (link ? '<a class="btn btn-light" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + 'Haberin kaynağı</a>' : '') +
      '<a class="btn btn-light" href="#/duyurular">‹ Tüm duyurular</a></div>' +
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
      '<section class="section"><div class="container" style="max-width:860px">' + (h || '<div class="box empty"><b>Yaklaşan bir gün yok</b></div>') + '</div></section>';
  }

  // Tek etkinliğin sayfası: paylaşılan bağlantı buraya gelir (geçmiş etkinlikler de açılır)
  function pageEvent(id) {
    var x = data.etkinlikler.filter(function (v) { return eid(v) === id; })[0];
    var crumb = '<div class="page-band"><div class="container"><div class="crumb"><a href="#/">Ana Sayfa</a> › <a href="#/etkinlikler">Etkinlikler</a></div></div></div>';
    if (!x) return band('Etkinlik bulunamadı') + '<section class="section"><div class="container"><p>Bu etkinlik kaldırılmış olabilir.</p><a class="btn" href="#/etkinlikler">Tüm etkinlikler</a></div></section>';
    var e = { iso: C.normIso(x.tarih), ad: x.ad, tur: x.tur, saat: x.saat, yer: x.yer, foto: x.foto, id: id, koy: true };
    var src = img(e.foto), until = C.untilText(e.iso), det = [e.saat, e.yer].filter(Boolean).join(' · ');
    return crumb + '<section class="section"><div class="container"><article class="article">' +
      '<div class="news-meta">' + (e.tur ? '<span class="' + C.badgeClass(e.tur) + '">' + esc(e.tur) + '</span>' : '') +
      (until ? '<span class="ev-when">' + esc(until) + '</span>' : '') + '</div>' +
      '<h1>' + esc(e.ad) + '</h1>' +
      '<div class="box box-pad" style="margin-bottom:18px"><ul class="facts"><li><span>Gün</span>' + esc(C.longDate(e.iso, true)) + '</li>' +
      (e.saat ? '<li><span>Saat</span>' + esc(e.saat) + '</li>' : '') + (e.yer ? '<li><span>Yer</span>' + esc(e.yer) + '</li>' : '') + '</ul></div>' +
      (src ? '<button type="button" class="article-img" data-photo="' + esc(src) + '" data-cap="' + esc(e.ad) + '" aria-label="Fotoğrafı büyüt"><img src="' + esc(src) + '" alt="' + esc(e.ad) + '"></button>' : '') +
      '<div class="btn-row">' + shareButtons(evShare(e, det), true) + '<a class="btn btn-light" href="#/etkinlikler">‹ Tüm etkinlikler</a></div>' +
      '</article></div></section>';
  }

  function pagePhotos() {
    return band('Fotoğraflar', 'Büyütmek için fotoğrafa dokunun.') + '<section class="section"><div class="container">' +
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
      '<section class="section"><div class="container"><article class="article">' +
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
      return '<article class="box mk">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(x.baslik) + '" loading="lazy">' : '') +
        '<div class="box-pad"><div class="news-meta">' + (x.tur ? '<span class="' + C.badgeClass(x.tur) + '">' + esc(x.tur) + '</span>' : '') + '<span>' + esc(C.longDate(x.tarih)) + '</span></div>' +
        '<h3><a class="ev-link" href="#/ilan/' + esc(iid(x)) + '"><b>' + esc(x.baslik) + '</b></a></h3>' + (x.fiyat ? '<div class="mk-price">' + esc(x.fiyat) + ' ₺</div>' : '') +
        (x.aciklama ? '<p>' + esc(x.aciklama) + '</p>' : '') + (x.kisi ? '<p class="muted">' + esc(x.kisi) + '</p>' : '') +
        mkContact(x) + shareButtons(mkShare(x)) +
        '</div></article>';
    }).join('') + '</div>' : '<div class="box empty"><b>Şu anda ilan yok</b>İlan vermek isterseniz derneği arayın.' +
      (dtel ? '<p style="margin:14px 0 0"><a class="btn" href="tel:' + esc(dtel) + '">' + icon('phone') + 'Derneği Ara</a></p>' : '') + '</div>';
    return band('Market ve Yardımlaşma', 'Köyümüzden satılık ürünler, aranan şeyler ve yardım istekleri.') +
      '<section class="section"><div class="container">' + body + '</div></section>';
  }

  function credit(who, file) {
    return '<span class="kredi">Fotoğraf: <a href="https://commons.wikimedia.org/wiki/File:' + file + '" target="_blank" rel="noopener">' + who + '</a></span>';
  }
  var EG = 'Egeasln, CC BY-SA 4.0', IS = 'Ingeborg Simon, CC BY-SA 3.0', VH = 'Volker Höhfeld, CC BY-SA 4.0';

  function pageAbout() {
    var d = data.dernek;
    var paras = String(d.hakkimizda || '').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var kasa = (d.kasa || d.gelir || d.gider) ? '<div class="box box-pad" style="margin-top:20px"><h3>Kasa Durumu</h3>' +
      (d.kasa_donem ? '<p class="muted small" style="margin:-4px 0 10px">' + esc(d.kasa_donem) + '</p>' : '') + '<div class="kasa">' +
      (d.gelir ? '<div><span>Gelir</span><b>' + esc(d.gelir) + ' ₺</b></div>' : '') +
      (d.gider ? '<div><span>Gider</span><b>' + esc(d.gider) + ' ₺</b></div>' : '') +
      (d.kasa ? '<div class="total"><span>Kasadaki para</span><b>' + esc(d.kasa) + ' ₺</b></div>' : '') + '</div></div>' : '';
    return band('Hakkımızda', 'Köprüköy Çeşnigir Kültür Sosyal Yardımlaşma ve Dayanışma Derneği') +
      '<section class="section"><div class="container grid-main"><div>' +
      '<div class="box box-pad" style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap"><img src="' + B + 'images/logo.png" alt="Çeşnigir-Der logosu" width="120" height="120" style="flex:none">' +
      '<div style="flex:1 1 260px">' + paras.map(function (s) { return '<p style="margin:0 0 12px">' + esc(s) + '</p>'; }).join('') + '</div></div>' +
      '<div class="sec-head" style="margin-top:30px"><h2>Neler yapıyoruz?</h2></div>' +
      '<ul class="check-list">' +
      '<li>Köyden haberleri ve duyuruları herkese ulaştırıyoruz.</li>' +
      '<li>Düğün, nişan, mevlit ve cenaze gibi özel günleri takvimde duyuruyoruz.</li>' +
      '<li>Köylülerin alım satım ve yardımlaşma ilanlarına aracılık ediyoruz.</li>' +
      '<li>Çeşnigir Köprüsü\'nü ve Köprüköy\'ün tarihini tanıtıyoruz.</li>' +
      '<li>Köyde yaşayanla gurbetteki hemşehrilerimiz arasındaki bağı canlı tutuyoruz.</li></ul>' +
      '</div><aside><div class="box box-pad"><h3>Dernek Bilgileri</h3><ul class="facts">' +
      peopleRows(d) +
      '<li><span>Kuruluş</span>Aralık 2025</li>' +
      '<li><span>Açılış töreni</span>6 Eylül 2026</li>' +
      '<li><span>Merkez</span>Ankara Caddesi, Çarşı Merkezi</li>' +
      '<li><span>Adres</span>' + esc(d.adres || 'Köprüköy, Keskin / Kırıkkale') + '</li>' +
      '</ul></div>' + kasa + '</aside></div></section>' +
      boardsSection(d) + villageSection() + placesSection();
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
    if (!y && !n) return '';
    return '<section class="section"><div class="container"><div class="sec-head"><h2>Dernek Kurulları</h2></div><div class="pair" style="margin-bottom:0">' +
      (y ? '<div class="box box-pad"><h3>Yönetim Kurulu</h3><ol class="kurul">' + y + '</ol></div>' : '') +
      (n ? '<div class="box box-pad"><h3>Denetim Kurulu</h3><ol class="kurul">' + n + '</ol></div>' : '') +
      '</div></div></section>';
  }

  function villageSection() {
    var W = 'https://tr.wikipedia.org/wiki/';
    return '<section class="section alt"><div class="container"><div class="sec-head"><h2>Köyümüz Köprüköy</h2></div></div><div class="container grid-main"><div>' +
      '<figure class="fig"><img src="' + B + 'images/koprukoy-gol.jpg" alt="Kapulukaya Baraj Gölü kıyısında Köprüköy: kayalık yamaçta kırmızı çatılı evler, solda Çeşnigir Köprüsü." loading="lazy">' +
      '<figcaption>Göl kıyısından Köprüköy ve Çeşnigir Köprüsü. ' + credit(IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_02.jpg') + '</figcaption></figure>' +
      '<p>Kırıkkale\'nin Keskin ilçesine bağlı Köprüköy, adını Kızılırmak üzerindeki tarihi Çeşnigir Köprüsü\'nden alır. Köyün Selçuklu döneminde kurulduğu kabul edilir. Kayıtlarda 1777\'de "Çaşnigir Köprüsü", 1815\'te "Çaşnigir Derbendi" adıyla geçer. Kızılırmak türkülerinden "Nettin Kızılırmak Allı Gelini"nde anlatılan olayın köyümüzde yaşandığı aktarılır.</p>' +
      '<div class="sec-head" style="margin-top:30px"><h2>Çeşnigir Köprüsü</h2></div>' +
      '<div class="pair"><figure class="fig"><img src="' + B + 'images/kopru-1972.jpg" alt="1972\'de Çeşnigir Köprüsü: baraj öncesi, kemerlerin altından akan turkuaz Kızılırmak." loading="lazy">' +
      '<figcaption>15 Eylül 1972, baraj suları yükselmeden önce. ' + credit(VH, 'K%C3%B6pr%C3%BCk%C3%B6y_15_09_1972_historischen_%C3%87e%C5%9Fnigir-Br%C3%BCcke_%C3%BCber_den_K%C4%B1z%C4%B1l%C4%B1rmak.jpg') + '</figcaption></figure>' +
      '<figure class="fig"><img src="' + B + 'images/kopru-bugun.jpg" alt="Bugün Çeşnigir Köprüsü: kemerlerin yarısı baraj suyunda." loading="lazy">' +
      '<figcaption>Bugün: su kemerlerin yarısına ulaşıyor. ' + credit(EG, 'Cesnigir_paradise3_(cropped).jpg') + '</figcaption></figure></div>' +
      '<p>Köprü kesme taştan yapılmıştır: 110 metre uzunluğunda, 6 metre genişliğindedir, orta açıklığı 18,60 metredir. Dokuzu aşağıda, üçü yukarıda on iki gözü vardır; nehre sağlam oturması için ortası belirgin biçimde yükselir. "Çeşnigir", Osmanlı sarayında padişahın yemeklerini tadan görevlinin unvanıdır. Osmanlı döneminde köprü, yol güvenliği için kurulan derbend (geçit tutma) düzeninin önemli noktalarından biriydi.</p>' +
      '<div class="sec-head" style="margin-top:30px"><h2>Tarihçe</h2></div>' +
      '<ul class="timeline">' +
      '<li><b>13. yüzyıl</b>Köprü Anadolu Selçuklu döneminde yapılır. Kesin yapım tarihi ve yaptıranı bilinmiyor.</li>' +
      '<li><b>1402</b>Rivayete göre Timur\'un ordusu Ankara Savaşı\'na giderken köprüden geçer.</li>' +
      '<li><b>16. yüzyıl</b>Yavuz Sultan Selim, Mısır Seferi sırasında köprüyü Mimar Sinan\'a yeniden yaptırır.</li>' +
      '<li><b>1777</b>Köy, kayıtlarda "Çaşnigir Köprüsü" adıyla geçer.</li>' +
      '<li><b>1815</b>Kayıtlardaki adı "Çaşnigir Derbendi" olur.</li>' +
      '<li><b>29 Şubat 1972</b>Köprüköy belediye kurularak belde olur.</li>' +
      '<li><b>1985–2000</b>Belde en kalabalık yıllarını yaşar: 1985\'te 3.020, 2000\'de 3.836 kişi.</li>' +
      '<li><b>1989</b>Kapulukaya Barajı\'nın suları yükselir, köprü araç trafiğine kapanır.</li>' +
      '<li><b>2010</b>Cumhuriyet döneminde birkaç kez onarılan köprüyü son olarak Karayolları 4. Bölge Müdürlüğü restore eder; bugün yayalara açıktır.</li>' +
      '<li><b>2013</b>Nüfus 2.000\'in altına düşünce belediye kapanır, Köprüköy yeniden köy olur.</li>' +
      '<li><b>2019–2020</b>Kırıkkale Valiliği çalışmalarıyla Çeşnigir Kanyonu turizme kazandırılır.</li></ul>' +
      '<div class="pair" style="margin-top:28px"><div class="box box-pad"><h3>Nüfusun seyri</h3>' +
      rows([['1985', '3.020'], ['1990', '2.914'], ['2000', '3.836'], ['2010', '1.638'], ['2013', '1.023'], ['2020', '604'], ['2024', '720']]) + '</div>' +
      '<div class="box box-pad"><h3>Belde dönemi belediye başkanları</h3>' +
      rows([['1973', 'Mehmet Güven'], ['1977', 'M. Dede Köprülü'], ['1984', 'Şerafettin Güven'], ['1989', 'Şerafettin Güven'], ['1994', 'Muzaffer Büken'], ['1999', 'Selahattin Güven'], ['2004', 'Oğuzhan Köprülü'], ['2009', 'Hasan Taşpınar']]) + '</div></div>' +
      '<p class="muted small" style="margin-top:20px">Kaynak: <a href="' + W + 'K%C3%B6pr%C3%BCk%C3%B6y,_Keskin" target="_blank" rel="noopener">Vikipedi, Köprüköy (Keskin)</a> · <a href="' + W + '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC" target="_blank" rel="noopener">Vikipedi, Çeşnigir Köprüsü</a> · <a href="https://kureansiklopedi.com/tr/detay/cesnigir-koprusu-7f5c9" target="_blank" rel="noopener">KÜRE Ansiklopedi</a> · <a href="https://www.yeniankara.com.tr/turkiye-haberleri/kirikkale-keskin-tarihi-casnigir-koprusu-keskin-askeri-hastanesi-190184" target="_blank" rel="noopener">Yeni Ankara</a></p>' +
      '</div><aside><div class="box box-pad"><h3>Köy Bilgileri</h3>' +
      rows([['Konum', 'Kapulukaya Baraj Gölü\'nün doğu kıyısı, Karakeçili\'nin karşısı'], ['Uzaklık', 'Keskin 25 km, Kırıkkale 37 km, Ankara yaklaşık 113 km'], ['Rakım', '803 m'], ['Nüfus', '720 (2024)'],
        ['Geçim', 'Buğday, arpa, patates, nohut, fasulye, ayçiçeği, pancar; hayvancılık; tatlı su levreği ve sazan balıkçılığı'], ['Yönetim', 'Muhtar ve ihtiyar heyeti'], ['Posta kodu', '71860']]) +
      '</div></aside></div></section>';
  }

  var GEZI = [
    ['Çeşnigir Kanyonu Mesire Alanı', 'Kırıkkale Valiliği\'nin 2019-2020\'de yaklaşık 500 bin metrekarelik alanda düzenlediği kanyon: tarihi köprü, dinlenme ve piknik alanları, göl kenarında yürüyüş yolları.', 'mesire-parki.jpg', EG, 'Cesnigir_paradise.jpg'],
    ['Seyir Terasları', 'Kanyona bakan iki seyir terası var; biri cam zeminli. Kızılırmak\'ı ve karşı kıyıdaki tarlaları yukarıdan görmek için en iyi yer.', 'seyir-terasi.jpg', 'Hadi Mousavi', ''],
    ['Kanyonda Tekne Turu', 'Ahşap iskeleden kalkan teknelerle Kızılırmak\'ın kayalık kanyonu su üzerinden gezilir.', 'tekne-iskelesi.jpg', '', ''],
    ['Yürüyüş ve Bisiklet Yolu', 'Kanyon boyunca yaklaşık 6,5 km\'lik yürüyüş ve bisiklet yolu. Daha uzun rota Büklükale\'den başlar, köprüyü geçip Köprüköy\'den Behrek (Böğrek) Dağı eteklerine, Haydar Sultan Türbesi ve Deliler Kuyusu\'na uzanır. Yanınıza su ve atıştırmalık alın.', 'kopru-merdiven.jpg', IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_04.jpg'],
    ['Kapulukaya Baraj Gölü Kıyısı', 'Köyün batısında uzanan göl kıyısı; sazan ve tatlı su levreği avlanır. Sisli sabahlarda vadiyi kaplayan sis görülmeye değer.', 'kopru-gol.jpg', IS, '%C3%87e%C5%9Fnigir_K%C3%B6pr%C3%BCs%C3%BC_01.jpg'],
    ['Büklükale Ören Yeri', 'Köprünün karşı kıyısında, Karakeçili yakınında 5 bin yıllık yerleşim. Japon arkeolog Kimiyoshi Matsumura başkanlığında 2009\'dan beri kazılıyor; 7 metre yüksekliğinde sur ve 2010\'da bulunan Hitit çivi yazılı tablet en bilinen buluntuları.', 'buklukale.jpg', IS, 'B%C3%BCkl%C3%BCkale_01.jpg'],
    ['Sulu Mağara (Keskin)', 'Keskin\'de üç katlı, 285 metrelik mağara; içi yıl boyu 18 derece civarında. Yakınındaki Ceritkale Kanyonu\'nda yaklaşık 10 km\'lik doğa yürüyüşü yapılabiliyor.', 'sulu-magara.jpg', '', '']
  ];

  function placesSection() {
    return '<section class="section"><div class="container"><div class="sec-head"><h2>Gezilecek Yerler</h2></div>' +
      '<figure class="fig" style="margin-bottom:24px"><img class="wide" src="' + B + 'images/mesire.jpg" alt="Kızılırmak kıyısındaki mesire alanının tepeden görünüşü: seyir terası, yürüyüş yolları ve tekne iskelesi." loading="lazy"></figure>' +
      '<div class="cards">' + GEZI.map(function (g) {
        var kredi = g[4] ? credit(g[3], g[4]) : (g[3] ? '<span class="kredi">Fotoğraf: ' + g[3] + '</span>' : '');
        return '<article class="box mk"><img src="' + B + 'images/' + g[2] + '" alt="' + esc(g[0]) + '" loading="lazy">' +
          '<div class="box-pad"><h3>' + g[0] + '</h3><p>' + g[1] + '</p>' + kredi + '</div></article>';
      }).join('') + '</div>' +
      '<div class="pair" style="margin-top:28px">' +
      '<figure class="fig"><img src="' + B + 'images/kanyon-kopru.jpg" alt="Çeşnigir Köprüsü, yeşil sudaki yansımasıyla." loading="lazy"><figcaption>Köprünün kıyıdan görünüşü. ' + credit(EG, 'Cesnigir_paradise3.jpg') + '</figcaption></figure>' +
      '<figure class="fig"><img src="' + B + 'images/kanyon-teras.jpg" alt="Kızılırmak\'ın kayalar arasından geçtiği kanyon ve seyir terası." loading="lazy"><figcaption>Kanyon ve seyir terası. ' + credit(EG, 'Cesnigir_paradise2.jpg') + '</figcaption></figure></div>' +
      '<p class="muted small" style="margin-top:20px">Kaynak: <a href="https://www.turkiyegazetesi.com.tr/gundem/bakan-kurumdan-tarihi-bolgede-tekne-turu-717166" target="_blank" rel="noopener">Türkiye Gazetesi</a> · <a href="https://www.discovercappadocia.com/hiking/cesnigir-bridge-koprukoy-hasandede/85" target="_blank" rel="noopener">Discover Cappadocia</a> · <a href="https://en.wikipedia.org/wiki/B%C3%BCkl%C3%BCkale" target="_blank" rel="noopener">Vikipedi, Büklükale</a> · <a href="https://cnnturk.com/yasam/galeri/dogal-agri-kesici-etkisini-duyan-buraya-kosuyor-turkiyenin-her-yerinden-ziyaretci-akini-var-hem-sifa-dagitiyor-hem-de-tarihi-sulu-magara-2182485" target="_blank" rel="noopener">CNN Türk</a></p>' +
      '</div></section>';
  }

  function pageContact() {
    var d = data.dernek, mail = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(d.eposta || '') ? d.eposta : '';
    return band('İletişim', 'Bize telefonla, WhatsApp\'tan ya da dernek binasında ulaşabilirsiniz.') +
      '<section class="section"><div class="container grid-main"><div class="box"><iframe class="map" title="Çeşnigir-Der haritası" loading="lazy" ' +
      'src="https://www.google.com/maps?q=39.5765122,33.4357454&z=17&output=embed"></iframe></div>' +
      '<aside><div class="box box-pad"><h3>Bize Ulaşın</h3><ul class="facts" style="margin-bottom:14px">' +
      peopleRows(d) +
      (mail ? '<li><span>E-posta</span><a href="mailto:' + esc(mail) + '">' + esc(mail) + '</a></li>' : '') +
      '<li><span>Adres</span>' + esc(d.adres || 'Köprüköy, Keskin / Kırıkkale') + '</li></ul>' +
      contactButtons(d) + '</div></aside></div></section>';
  }

  /* ---------- yönlendirme ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, ''), p = h.split('/'), html;
    var page = p[0] || '';
    if (page === 'duyuru') html = pageArticle(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'duyurular') html = pageNews();
    else if (page === 'etkinlikler') html = pageEvents();
    else if (page === 'etkinlik') html = pageEvent(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'fotograflar') html = pagePhotos();
    else if (page === 'pazar') html = pageMarket();
    else if (page === 'ilan') html = pageListing(decodeURIComponent(p.slice(1).join('/')));
    else if (page === 'hakkimizda') html = pageAbout();
    else if (page === 'koyumuz' || page === 'gezi') { page = 'hakkimizda'; html = pageAbout(); }
    else if (page === 'iletisim') html = pageContact();
    else { page = ''; html = pageHome(); }
    var hash = location.hash, back = !tapped && hash !== curHash && pos[hash] > 0;
    tapped = false; curHash = hash;
    main.innerHTML = html;
    main.classList.remove('gir'); void main.offsetWidth; main.classList.add('gir');
    var navKey = page === 'duyuru' ? 'duyurular' : page === 'etkinlik' ? 'etkinlikler' : page === 'ilan' ? 'pazar' : page;
    if (page === 'etkinlik' || page === 'ilan' || page === 'duyuru') { var sp = main.querySelector('[data-share-photo]'); if (sp) C.warmShare(sp.getAttribute('data-share-photo')); }
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    closeMenu();
    // geri tuşuyla dönülen sayfa kaldığı yerden açılır; bağlantıya dokunulunca en baştan
    var y = back ? pos[hash] : 0;
    window.scrollTo(0, y);
    if (back) requestAnimationFrame(function () { window.scrollTo(0, y); });
    headerPhoto();
    var t = main.querySelector('h1');
    document.title = (page && t ? t.textContent + ' · ' : '') + 'Çeşnigir-Der · Köprüköy';
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
    $('vImg').src = x.src; $('vImg').alt = x.cap || ''; $('vCap').textContent = x.cap || ''; $('vCount').textContent = n > 1 ? (vIdx + 1) + ' / ' + n : ''; }
  function closeV() { $('viewer').hidden = true; $('vImg').removeAttribute('src'); document.body.style.overflow = '';
    if (last && last.focus) { try { last.focus(); } catch (e) { /* yok say */ } } }

  function bind() {
    window.addEventListener('hashchange', route);
    C.bindShare();
    window.addEventListener('scroll', headerPhoto, { passive: true }); window.addEventListener('resize', headerPhoto);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('scroll', function () { pos[curHash] = window.pageYOffset; }, { passive: true });
    $('menuBtn').addEventListener('click', function () { setMenu(!$('nav').classList.contains('open')); });
    document.addEventListener('click', function (e) {
      // menü açıkken dışına dokunmak yalnızca menüyü kapatır
      if ($('nav').classList.contains('open') && !e.target.closest('.header')) { closeMenu(); e.preventDefault(); return; }
      if (e.target.closest('a[href^="#/"]')) { tapped = true; setTimeout(function () { tapped = false; }, 600); }
      var f = e.target.closest('[data-filter]');
      if (f) { filter = f.getAttribute('data-filter'); main.innerHTML = pageNews(); var b = main.querySelector('[data-filter="' + filter + '"]'); if (b) b.focus(); return; }
      var cn = e.target.closest('[data-cal-nav]');
      if (cn) { var dir = +cn.getAttribute('data-cal-nav'), dt = new Date(calY, calM + dir, 1); calY = dt.getFullYear(); calM = dt.getMonth();
        redrawCal('[data-cal-nav="' + dir + '"]'); return; }
      var cd = e.target.closest('[data-cal-day]');
      if (cd) { var ci = cd.getAttribute('data-cal-day'); calSel = calSel === ci ? '' : ci; redrawCal('[data-cal-day="' + ci + '"]'); return; }
      var g = e.target.closest('[data-gal]');
      if (g) { openV(data.galeri.map(function (x) { return { src: img(x.foto), cap: x.aciklama }; }), +g.getAttribute('data-gal')); return; }
      var ph = e.target.closest('[data-photo]');
      if (ph) openV([{ src: ph.getAttribute('data-photo'), cap: ph.getAttribute('data-cap') }], 0);
    });
    $('vClose').addEventListener('click', closeV);
    $('vPrev').addEventListener('click', function () { showV(vIdx - 1); });
    $('vNext').addEventListener('click', function () { showV(vIdx + 1); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('nav').classList.contains('open')) { closeMenu(); $('menuBtn').focus(); return; }
      if ($('viewer').hidden) return;
      if (e.key === 'Escape') closeV();
      else if (e.key === 'ArrowLeft' && vList.length > 1) showV(vIdx - 1);
      else if (e.key === 'ArrowRight' && vList.length > 1) showV(vIdx + 1);
      else if (e.key === 'Tab') { var fs = [$('vClose'), $('vPrev'), $('vNext')].filter(function (b) { return !b.hidden; });
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
    var map = { e: 'etkinlik', i: 'ilan', d: 'duyuru' };
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
      route();
    });
})();
