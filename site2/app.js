/* Çeşnigir-Der sitesi
   İçerik data/ klasöründeki dosyalardan okunur. İçerik yönetim panelinden (/yonetim/) değiştirilir. */
(function () {
  'use strict';
  var C = window.CD, esc = C.esc;
  var TABS = ['anasayfa', 'takvim', 'fotograflar', 'pazar', 'dernek'];
  var SITE_URL = location.origin + location.pathname;
  var data = { duyurular: [], etkinlikler: [], resmi: { sabit: [], tarihli: [] }, galeri: [], pazar: [], dernek: {} };

  function $(id) { return document.getElementById(id); }
  function icon(name) { return '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }

  function load(name) {
    return fetch('../data/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(name);
      return r.json();
    });
  }
  function soft(name, fallback) { return load(name).catch(function () { return fallback; }); }

  /* ---------------- sekmeler ---------------- */
  function showTab(fromHash) {
    var h = (location.hash || '').replace('#', '');
    var tab = TABS.indexOf(h) >= 0 ? h : 'anasayfa';
    var postId = /^d-/.test(h) ? h : '';
    TABS.forEach(function (t) { $(t).hidden = t !== tab; });
    document.querySelectorAll('.tab').forEach(function (a) {
      if (a.getAttribute('data-tab') === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (postId) {
      var el = $(postId);
      if (el) { el.scrollIntoView({ block: 'start' }); return; }
    }
    if (fromHash) window.scrollTo(0, 0);
  }

  /* ---------------- ana sayfa ---------------- */
  function renderHomeActions() {
    var d = data.dernek, h = '';
    var tel = C.telHref(d.telefon), wa = C.waHref(d.whatsapp || d.telefon);
    if (tel) h += '<a class="btn btn-blue" href="tel:' + esc(tel) + '">' + icon('phone') + 'Derneği Ara</a>';
    if (wa) h += '<a class="btn btn-green" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp</a>';
    h += '<a class="btn" href="https://www.google.com/maps?q=39.5808,33.4294" target="_blank" rel="noopener">' + icon('pin') + 'Köye Yol Tarifi</a>';
    $('home-actions').innerHTML = h;
  }

  function renderLive() {
    var src = C.ytEmbed(data.dernek.canli_yayin);
    $('live').innerHTML = src ? '<div class="card"><div class="up-head"><h2><span class="live-dot" aria-hidden="true"></span>Köyden Canlı Görüntü</h2></div>' +
      '<div style="position:relative;aspect-ratio:16/9;background:#000">' + C.ytFrame(src) + '</div></div>' : '';
  }

  function postId(p, i) { return 'd-' + (C.normIso(p.tarih) || 'x') + '-' + (C.slug(p.baslik).slice(0, 40) || i); }

  function renderFeed() {
    var list = data.duyurular.slice().sort(function (a, b) {
      var x = C.normIso(a.tarih), y = C.normIso(b.tarih);
      return x < y ? 1 : x > y ? -1 : 0;
    });
    var el = $('feed');
    if (!list.length) {
      el.innerHTML = '<div class="card empty"><b>Henüz duyuru yok</b>Yeni duyurular burada görünecek.</div>';
      return;
    }
    el.innerHTML = list.map(function (p, i) {
      var id = postId(p, i);
      var src = C.imgSrc(p.foto, '../'), link = C.linkUrl(p.link);
      var text = String(p.metin || '').trim();
      var long = text.length > 320;
      var shareText = (p.tur ? p.tur + ': ' : '') + (p.baslik || '') + '\n' + SITE_URL + '#' + id;
      var h = '<article class="card post" id="' + esc(id) + '">' +
        '<div class="post-head"><img src="../images/logo-160.png" alt=""><div class="post-who"><b>Çeşnigir-Der</b>' +
        '<span>' + esc(C.relDate(p.tarih)) + '</span></div></div>' +
        '<div class="post-body">' + (p.tur ? '<span class="' + C.badgeClass(p.tur) + '">' + esc(p.tur) + '</span>' : '') +
        '<h3>' + esc(p.baslik) + '</h3>';
      if (text) {
        h += '<p class="post-text" data-full="' + esc(text) + '">' + esc(long ? text.slice(0, 280).replace(/\s+\S*$/, '') + '…' : text) + '</p>';
        if (long) h += '<button type="button" class="more-btn" data-more>Devamını gör</button>';
      }
      if (p.kaynak) h += '<p class="post-src">Kaynak: ' + esc(p.kaynak) + '</p>';
      h += '</div>';
      if (src) h += '<button type="button" class="post-img" data-photo="' + esc(src) + '" data-cap="' + esc(p.baslik) + '" aria-label="Fotoğrafı büyüt">' +
        '<img src="' + esc(src) + '" alt="' + esc(p.foto_aciklama || p.baslik) + '" loading="lazy"></button>';
      h += '<div class="post-actions">' +
        '<a class="wa" href="https://wa.me/?text=' + encodeURIComponent(shareText) + '" target="_blank" rel="noopener" aria-label="WhatsApp\'ta paylaş">' + icon('wa') + 'Paylaş</a>' +
        (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + 'Haberi aç</a>' : '') +
        '</div></article>';
      return h;
    }).join('');
  }

  /* ---------------- takvim ---------------- */
  function upcoming(limitDays) {
    var today = C.todayIso(), end = C.addDays(today, limitDays), out = [];
    data.etkinlikler.forEach(function (e) {
      var iso = C.normIso(e.tarih);
      if (iso && iso >= today) out.push({ iso: iso, ad: e.ad, tur: e.tur, saat: e.saat, yer: e.yer, koy: true });
    });
    (data.resmi.tarihli || []).forEach(function (e) {
      var iso = C.normIso(e.tarih);
      if (iso && iso >= today && iso <= end) out.push({ iso: iso, ad: e.ad, tur: '', koy: false });
    });
    var y0 = +today.slice(0, 4);
    [y0, y0 + 1].forEach(function (y) {
      (data.resmi.sabit || []).forEach(function (e) {
        var iso = y + '-' + C.pad(+e.ay) + '-' + C.pad(+e.gun);
        if (iso >= today && iso <= end) out.push({ iso: iso, ad: e.ad, tur: '', koy: false });
      });
    });
    out.sort(function (a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : (a.koy ? -1 : 1); });
    return out;
  }

  function evRow(e) {
    var p = C.parts(e.iso), until = C.untilText(e.iso);
    var det = [e.saat, e.yer].filter(Boolean).join(' · ');
    return '<div class="ev' + (e.koy ? '' : ' official') + '">' +
      '<div class="ev-date" aria-hidden="true"><span>' + C.AY_KISA[p.m] + '</span><b>' + p.d + '</b><small>' + C.GUN[p.wd] + '</small></div>' +
      '<div class="ev-info">' + (until ? '<div class="ev-when">' + esc(until) + '</div>' : '') +
      (e.tur ? '<span class="' + C.badgeClass(e.tur) + '">' + esc(e.tur) + '</span> ' : '') +
      '<b>' + esc(e.ad) + '</b>' +
      '<div class="muted">' + esc(C.longDate(e.iso, true)) + (det ? ' · ' + esc(det) : '') + '</div></div></div>';
  }

  function renderEvents() {
    var list = upcoming(120);
    $('events').innerHTML = list.length
      ? '<div class="card">' + list.map(evRow).join('') + '</div>'
      : '<div class="card empty"><b>Yaklaşan bir gün yok</b>Düğün, mevlit ve toplantılar burada görünecek.</div>';

    var next = upcoming(30).slice(0, 3);
    $('home-upcoming').innerHTML = next.length
      ? '<div class="card"><div class="up-head"><h2>Yaklaşan Günler</h2><a href="#takvim">Tümünü gör</a></div>' + next.map(evRow).join('') + '</div>'
      : '';
  }

  /* ---------------- fotoğraflar ---------------- */
  var viewerList = [], viewerIdx = 0, lastFocus = null;

  function renderGallery() {
    var list = data.galeri.filter(function (x) { return C.imgSrc(x.foto, '../'); });
    var el = $('gallery');
    if (!list.length) { el.className = 'card empty'; el.innerHTML = '<b>Henüz fotoğraf yok</b>'; return; }
    el.innerHTML = list.map(function (x, i) {
      return '<button type="button" data-gal="' + i + '" aria-label="Fotoğrafı büyüt: ' + esc(x.aciklama) + '">' +
        '<img src="' + esc(C.imgSrc(x.foto, '../')) + '" alt="' + esc(x.aciklama) + '" loading="lazy"></button>';
    }).join('');
  }

  function openViewer(list, i) {
    viewerList = list; lastFocus = document.activeElement;
    $('viewer').hidden = false;
    document.body.style.overflow = 'hidden';
    var single = list.length < 2;
    $('vPrev').hidden = single; $('vNext').hidden = single;
    showPhoto(i);
    $('vClose').focus();
  }
  function showPhoto(i) {
    var n = viewerList.length;
    viewerIdx = (i + n) % n;
    var x = viewerList[viewerIdx];
    $('vImg').src = x.src; $('vImg').alt = x.cap || '';
    $('vCap').textContent = x.cap || '';
    $('vCount').textContent = n > 1 ? (viewerIdx + 1) + ' / ' + n : '';
  }
  function closeViewer() {
    $('viewer').hidden = true;
    $('vImg').removeAttribute('src');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* yok say */ } }
  }

  /* ---------------- pazar ---------------- */
  function renderMarket() {
    var list = data.pazar.slice().sort(function (a, b) {
      var x = C.normIso(a.tarih), y = C.normIso(b.tarih);
      return x < y ? 1 : x > y ? -1 : 0;
    });
    var el = $('market');
    var dtel = C.telHref(data.dernek.telefon);
    if (!list.length) {
      el.innerHTML = '<div class="card empty"><b>Şu anda ilan yok</b>İlan vermek isterseniz derneği arayın.' +
        (dtel ? '<div style="margin-top:14px"><a class="btn btn-blue" href="tel:' + esc(dtel) + '">' + icon('phone') + 'Derneği Ara</a></div>' : '') + '</div>';
      return;
    }
    el.innerHTML = list.map(function (x) {
      var src = C.imgSrc(x.foto, '../'), tel = C.telHref(x.telefon), wa = C.waHref(x.telefon, (x.baslik || '') + ' ilanı için yazıyorum.');
      return '<article class="card">' +
        (src ? '<button type="button" class="post-img" data-photo="' + esc(src) + '" data-cap="' + esc(x.baslik) + '" aria-label="Fotoğrafı büyüt"><img class="mk-img" src="' + esc(src) + '" alt="' + esc(x.baslik) + '" loading="lazy"></button>' : '') +
        '<div class="mk-body"><div class="mk-top">' + (x.tur ? '<span class="' + C.badgeClass(x.tur) + '">' + esc(x.tur) + '</span>' : '<span></span>') +
        '<span class="muted small">' + esc(C.relDate(x.tarih)) + '</span></div>' +
        '<h3>' + esc(x.baslik) + '</h3>' +
        (x.fiyat ? '<p class="mk-price">' + esc(x.fiyat) + ' ₺</p>' : '') +
        (x.aciklama ? '<p>' + esc(x.aciklama) + '</p>' : '') +
        (x.kisi ? '<p class="mk-who">' + esc(x.kisi) + '</p>' : '') +
        ((tel || wa) ? '<div class="btn-row">' +
          (tel ? '<a class="btn btn-blue" href="tel:' + esc(tel) + '">' + icon('phone') + 'Ara</a>' : '') +
          (wa ? '<a class="btn btn-green" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp</a>' : '') +
          '</div>' : '') +
        '</div></article>';
    }).join('');
  }

  /* ---------------- dernek ---------------- */
  function renderAbout() {
    var d = data.dernek, h = '';
    h += '<div class="card card-pad about-card"><h3>Hakkımızda</h3>';
    String(d.hakkimizda || '').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean)
      .forEach(function (p) { h += '<p>' + esc(p) + '</p>'; });
    if (d.baskan) h += '<ul class="facts"><li><span>Dernek Başkanı</span>' + esc(d.baskan) + '</li></ul>';
    h += '</div>';

    var tel = C.telHref(d.telefon), wa = C.waHref(d.whatsapp || d.telefon);
    var mail = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(d.eposta || '') ? d.eposta : '';
    h += '<div class="card card-pad about-card"><h3>Bize Ulaşın</h3>';
    if (tel || wa || mail) {
      h += '<div class="btn-row" style="margin-bottom:10px">' +
        (tel ? '<a class="btn btn-blue" href="tel:' + esc(tel) + '">' + icon('phone') + 'Ara</a>' : '') +
        (wa ? '<a class="btn btn-green" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp</a>' : '') +
        (mail ? '<a class="btn" href="mailto:' + esc(mail) + '">' + icon('mail') + 'E-posta</a>' : '') + '</div>';
    }
    h += '<ul class="facts">' +
      (d.telefon ? '<li><span>Telefon</span>' + esc(d.telefon) + '</li>' : '') +
      (d.adres ? '<li><span>Adres</span>' + esc(d.adres) + '</li>' : '') + '</ul>' +
      '<a class="btn btn-wide" style="margin-top:10px" href="https://www.google.com/maps?q=39.5808,33.4294" target="_blank" rel="noopener">' + icon('pin') + 'Haritada Göster</a></div>';

    if (d.kasa || d.gelir || d.gider) {
      h += '<div class="card card-pad about-card"><h3>Kasa Durumu</h3>' +
        (d.kasa_donem ? '<p class="muted small">' + esc(d.kasa_donem) + '</p>' : '') + '<div class="kasa">' +
        (d.gelir ? '<div><span>Gelir</span><b>' + esc(d.gelir) + ' ₺</b></div>' : '') +
        (d.gider ? '<div><span>Gider</span><b>' + esc(d.gider) + ' ₺</b></div>' : '') +
        (d.kasa ? '<div class="total"><span>Kasadaki para</span><b>' + esc(d.kasa) + ' ₺</b></div>' : '') + '</div></div>';
    }

    h += '<div class="card about-card"><button type="button" class="post-img" data-photo="../images/kopru.jpg" data-cap="Çeşnigir Köprüsü" aria-label="Fotoğrafı büyüt">' +
      '<img class="photo-wide" src="../images/kopru.jpg" alt="Çeşnigir Köprüsü\'nün taş kemerleri ve Kızılırmak." loading="lazy"></button>' +
      '<div class="card-pad"><h3>Köyümüz Köprüköy</h3>' +
      '<p>Köyümüz adını Kızılırmak üzerindeki tarihi Çeşnigir Köprüsü\'nden alır. Selçuklu döneminden kalan bu taş köprü on iki gözlüdür ve yüzyıllarca Ankara ile Kırşehir arasındaki yolun geçiş noktası olmuştur.</p>' +
      '<p class="muted small" style="margin:0">Kapulukaya Baraj Gölü kıyısında, Keskin\'e yaklaşık 30 km uzaklıktayız.</p></div></div>';

    h += '<p class="footer-note">© ' + new Date().getFullYear() + ' Çeşnigir-Der · <a href="../yonetim/">Yönetici girişi</a></p>';
    $('about').innerHTML = h;
  }

  /* ---------------- olaylar ---------------- */
  function bind() {
    window.addEventListener('hashchange', function () { showTab(true); });
    document.addEventListener('click', function (e) {
      var more = e.target.closest('[data-more]');
      if (more) {
        var p = more.previousElementSibling;
        p.textContent = p.getAttribute('data-full');
        more.remove();
        return;
      }
      var g = e.target.closest('[data-gal]');
      if (g) {
        var list = data.galeri.filter(function (x) { return C.imgSrc(x.foto, '../'); })
          .map(function (x) { return { src: C.imgSrc(x.foto, '../'), cap: x.aciklama }; });
        openViewer(list, +g.getAttribute('data-gal'));
        return;
      }
      var ph = e.target.closest('[data-photo]');
      if (ph) openViewer([{ src: ph.getAttribute('data-photo'), cap: ph.getAttribute('data-cap') }], 0);
    });
    $('vClose').addEventListener('click', closeViewer);
    $('vPrev').addEventListener('click', function () { showPhoto(viewerIdx - 1); });
    $('vNext').addEventListener('click', function () { showPhoto(viewerIdx + 1); });
    document.addEventListener('keydown', function (e) {
      if ($('viewer').hidden) return;
      if (e.key === 'Escape') closeViewer();
      else if (e.key === 'ArrowLeft' && viewerList.length > 1) showPhoto(viewerIdx - 1);
      else if (e.key === 'ArrowRight' && viewerList.length > 1) showPhoto(viewerIdx + 1);
      else if (e.key === 'Tab') {
        var f = [$('vClose'), $('vPrev'), $('vNext')].filter(function (b) { return !b.hidden; });
        var k = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(k + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
    // parmakla kaydırma
    var sx = null;
    $('vImg').parentNode.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    $('vImg').parentNode.addEventListener('touchend', function (e) {
      if (sx === null || viewerList.length < 2) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) showPhoto(viewerIdx + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------------- başlat ---------------- */
  bind();
  showTab(false);
  Promise.all([
    soft('duyurular', []), soft('etkinlikler', []), soft('resmi-gunler', { sabit: [], tarihli: [] }),
    soft('galeri', []), soft('pazar', []), soft('dernek', {})
  ]).then(function (r) {
    data.duyurular = C.arr(r[0]);
    data.etkinlikler = C.arr(r[1]);
    data.resmi = r[2] && typeof r[2] === 'object' ? r[2] : { sabit: [], tarihli: [] };
    data.galeri = C.arr(r[3]);
    data.pazar = C.arr(r[4]);
    data.dernek = r[5] && typeof r[5] === 'object' && !Array.isArray(r[5]) ? r[5] : {};
    renderHomeActions();
    renderLive();
    renderFeed();
    renderEvents();
    renderGallery();
    renderMarket();
    renderAbout();
    if (/^#d-/.test(location.hash)) showTab(false);
  });
})();
