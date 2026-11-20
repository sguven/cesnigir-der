/* Çeşnigir-Der sitesi
   Sayfadaki değişken içerik data/ klasöründeki JSON dosyalarından okunur.
   İçeriği değiştirmek için bu dosyaya dokunmaya gerek yok. */
(function () {
  'use strict';

  var MN = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var KIND = {
    koy: ['Köy etkinliği', 'var(--accent)'],
    resmi: ['Resmî bayram', '#2E2118'],
    dini: ['Dinî gün', '#7A5514'],
    milli: ['Millî ve özel gün', '#4F5B2E']
  };

  /* ---------- yardımcılar ---------- */
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Fotoğraf yolu: images/x.jpg, /images/x.jpg veya https://... kabul edilir.
  function imgSrc(p) {
    p = String(p == null ? '' : p).trim();
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(p) || p.indexOf('//') === 0) return '';
    return '../' + p.replace(/^\/+/, '');
  }

  // Dış bağlantı: sadece http(s)
  function linkUrl(u) {
    u = String(u == null ? '' : u).trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }

  function paras(s) {
    return String(s == null ? '' : s).split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function items(d) {
    var a = Array.isArray(d) ? d : (d && Array.isArray(d.items) ? d.items : []);
    return a.filter(function (x) { return x && typeof x === 'object'; });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // "2026-11-7" veya "2026-11-07T00:00:00Z" -> "2026-11-07"; geçersizse ''
  function normIso(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s == null ? '' : s).trim());
    return m ? m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]) : '';
  }

  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? (+m[3]) + ' ' + MN[+m[2] - 1] + ' ' + m[1] : '';
  }

  function todayIso() {
    var t = new Date();
    return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }

  function load(name) {
    return fetch('../data/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(name);
      return r.json();
    });
  }

  function fail(targetId) {
    var el = $(targetId);
    if (el) el.innerHTML = '<p class="muted">Bu bölüm şu anda yüklenemedi. Lütfen sayfayı yenileyin.</p>';
  }

  function section(name, targetId, render) {
    load(name).then(render).catch(function () { fail(targetId); });
  }

  /* ---------- haberler ---------- */
  function renderNews(d) {
    var list = items(d), el = $('haber-icerik');
    if (!list.length) { el.innerHTML = '<p class="muted">Henüz haber yok.</p>'; return; }
    var f = list[0], rest = list.slice(1);

    function meta(n) { return [longDate(normIso(n.tarih)) || n.tarih, n.kaynak].filter(Boolean).join(' · '); }
    function more(n) {
      var u = linkUrl(n.link);
      return u ? '<a class="more" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Kaynağında oku</a>' : '';
    }

    var src = imgSrc(f.foto);
    var main = '<article class="card news-main">' +
      (src ? '<img src="' + esc(src) + '" alt="' + esc(f.foto_aciklama) + '" loading="lazy">' : '') +
      '<div class="news-body"><span class="meta">' + esc(meta(f)) + '</span>' +
      '<h3>' + esc(f.baslik) + '</h3>' +
      '<p class="muted">' + esc(f.metin) + '</p>' + more(f) + '</div></article>';

    var side = '';
    if (rest.length) {
      side = '<div class="card news-side"><h3>Diğer haberler</h3>' + rest.map(function (n) {
        return '<article class="news-item"><span class="meta">' + esc(meta(n)) + '</span>' +
          '<h4>' + esc(n.baslik) + '</h4><p>' + esc(n.metin) + '</p>' + more(n) + '</article>';
      }).join('') + '</div>';
    }
    el.innerHTML = '<div class="news-wrap">' + main + side + '</div>';
  }

  /* ---------- fotoğraf galerisi ve büyütme penceresi ---------- */
  var gal = [], galOpen = false, lbIdx = null, lastFocus = null;

  function renderGallery(d) {
    gal = items(d).filter(function (x) { return imgSrc(x.foto); });
    var el = $('galeri-icerik');
    if (!gal.length) { el.innerHTML = '<p class="muted">Henüz fotoğraf yok.</p>'; return; }
    drawGallery();
  }

  function drawGallery() {
    var el = $('galeri-icerik');
    var h = gal[0];
    var thumbs = galOpen ? gal.slice(1) : gal.slice(1, 7);
    var html = '<button type="button" class="hero-btn" data-i="0" aria-label="Fotoğrafı büyüt: ' + esc(h.aciklama) + '">' +
      '<img src="' + esc(imgSrc(h.foto)) + '" alt="' + esc(h.aciklama) + '"></button>';
    if (thumbs.length) {
      html += '<div class="thumbs">' + thumbs.map(function (x, k) {
        var i = k + 1;
        return '<button type="button" class="thumb-btn" data-i="' + i + '" aria-label="Fotoğrafı büyüt: ' + esc(x.aciklama) + '">' +
          '<img src="' + esc(imgSrc(x.foto)) + '" alt="' + esc(x.aciklama) + '" loading="lazy"></button>';
      }).join('') + '</div>';
    }
    html += '<div class="gal-bar">';
    if (gal.length > 7) {
      html += '<button type="button" id="galToggle" aria-expanded="' + galOpen + '">' +
        (galOpen ? 'Daha az göster' : 'Tüm fotoğrafları göster (' + gal.length + ')') + '</button>';
    }
    html += '<span class="small muted">Büyütmek için fotoğrafa dokunun.</span></div>';
    el.innerHTML = html;
  }

  function lbShow(i) {
    var n = gal.length;
    lbIdx = (i + n) % n;
    var x = gal[lbIdx];
    $('lbImg').src = imgSrc(x.foto);
    $('lbImg').alt = x.aciklama || '';
    $('lbCount').textContent = (lbIdx + 1) + ' / ' + n;
  }

  function lbOpen(i) {
    lastFocus = document.activeElement;
    lbShow(i);
    $('lb').hidden = false;
    document.body.style.overflow = 'hidden';
    $('lbClose').focus();
  }

  function lbClose() {
    $('lb').hidden = true;
    $('lbImg').removeAttribute('src');
    lbIdx = null;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) { /* yok say */ }
    }
  }

  function bindGallery() {
    $('galeri-icerik').addEventListener('click', function (e) {
      var t = e.target.closest('[data-i]');
      if (t) { lbOpen(+t.getAttribute('data-i')); return; }
      if (e.target.closest('#galToggle')) { galOpen = !galOpen; drawGallery(); var b = $('galToggle'); if (b) b.focus(); }
    });
    $('lbClose').addEventListener('click', lbClose);
    $('lbPrev').addEventListener('click', function () { lbShow(lbIdx - 1); });
    $('lbNext').addEventListener('click', function () { lbShow(lbIdx + 1); });
    $('lb').addEventListener('click', function (e) { if (e.target === $('lb')) lbClose(); });
    document.addEventListener('keydown', function (e) {
      if ($('lb').hidden) return;
      if (e.key === 'Escape') { lbClose(); }
      else if (e.key === 'ArrowLeft') { lbShow(lbIdx - 1); }
      else if (e.key === 'ArrowRight') { lbShow(lbIdx + 1); }
      else if (e.key === 'Tab') {
        var f = [$('lbClose'), $('lbPrev'), $('lbNext')];
        var k = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(k + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
  }

  /* ---------- ilanlar ---------- */
  function renderIlanlar(d) {
    var list = items(d), el = $('ilan-icerik');
    if (!list.length) { el.innerHTML = '<p class="muted">Şu anda ilan yok.</p>'; return; }
    el.innerHTML = list.map(function (n) {
      return '<article class="card ilan"><div class="ilan-top"><strong>' + esc(n.tur) + '</strong><span>' + esc(longDate(normIso(n.tarih))) + '</span></div>' +
        '<h3>' + esc(n.baslik) + '</h3>' +
        (n.metin ? '<p>' + esc(n.metin) + '</p>' : '') + '</article>';
    }).join('');
  }

  function renderPazar(d) {
    var list = items(d), el = $('pazar-icerik');
    if (!list.length) { el.innerHTML = '<p class="muted">Şu anda pazar veya yardım ilanı yok.</p>'; return; }
    el.innerHTML = list.map(function (n) {
      var src = imgSrc(n.foto);
      return '<article class="card pz">' +
        (src ? '<img src="' + esc(src) + '" alt="' + esc(n.baslik) + '" loading="lazy">' : '') +
        '<div class="pz-body"><div class="ilan-top"><strong>' + esc(n.tur) + '</strong><span>' + esc(longDate(normIso(n.tarih))) + '</span></div>' +
        '<h3>' + esc(n.baslik) + '</h3>' +
        (n.fiyat ? '<div class="pz-price">' + esc(n.fiyat) + ' ₺</div>' : '') +
        (n.aciklama ? '<p class="muted" style="margin:0">' + esc(n.aciklama) + '</p>' : '') +
        ([n.kisi, n.telefon].filter(Boolean).length ? '<div class="pz-contact">' + esc([n.kisi, n.telefon].filter(Boolean).join(' · ')) + '</div>' : '') +
        '</div></article>';
    }).join('');
  }

  /* ---------- gezilecek yerler ---------- */
  var GEZI = [
    { baslik: 'Çeşnigir Köprüsü Mesire Alanı', aciklama: 'Yayalara açık tarihi köprü ve çevresinde Kırıkkale Valiliği\'nin düzenlediği dinlenme alanı.', foto: 'images/mesire.jpg' },
    { baslik: 'Kapulukaya Baraj Gölü Kıyısı', aciklama: 'Köyün batısında uzanan göl kıyısı; sazan ve tatlı su levreği avlanır.' },
    { baslik: 'Seyir Terası', aciklama: 'Kızılırmak\'ın kayalık kanyonuna bakan seyir terasından nehir ve karşı kıyıdaki tarlalar yukarıdan izlenir. Fotoğraf: Hadi Mousavi.', foto: 'images/seyir-terasi.jpg' },
    { baslik: 'Tekne İskelesi', aciklama: 'Ahşap iskeleden kalkan tekne turlarıyla Kızılırmak\'ın kayalık kanyonunu su üzerinden gezmek mümkün.', foto: 'images/tekne-iskelesi.jpg' },
    { baslik: 'Yürüyüş ve Bisiklet Rotası', aciklama: 'Çeşnigir Köprüsü\'nden başlayıp Köprüköy üzerinden Hasandede\'ye uzanan parkur.' }
  ];
  function renderGezi(d) {
    var list = items(d), el = $('gezi-icerik');
    if (!list.length) { el.innerHTML = ''; return; }
    el.innerHTML = list.map(function (n) {
      var src = imgSrc(n.foto);
      return '<article class="card gz">' +
        (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<div class="gz-ph">Fotoğraf eklenecek</div>') +
        '<div class="gz-body"><h3>' + esc(n.baslik) + '</h3><p>' + esc(n.aciklama) + '</p></div></article>';
    }).join('');
  }

  /* ---------- genel bilgiler (hakkımızda, iletişim) ---------- */
  function renderGenel(d) {
    d = d || {};
    $('hk-ek').innerHTML = paras(d.hakkimizda).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    $('baskan').textContent = d.baskan || '';
    $('baskan-wrap').hidden = !d.baskan;

    var h = '<span class="ft-h">İletişim</span>';
    if (d.adres) h += '<span>' + esc(d.adres) + '</span>';
    if (d.telefon) {
      var tel = String(d.telefon).replace(/[^\d+]/g, '');
      h += /^\+?\d{7,}$/.test(tel)
        ? '<a href="tel:' + esc(tel) + '">' + esc(d.telefon) + '</a>'
        : '<span>' + esc(d.telefon) + '</span>';
    }
    if (d.eposta) {
      h += /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(d.eposta)
        ? '<a href="mailto:' + esc(d.eposta) + '">' + esc(d.eposta) + '</a>'
        : '<span>' + esc(d.eposta) + '</span>';
    }
    $('ft-iletisim').innerHTML = h;
  }

  /* ---------- finansal durum ---------- */
  function renderFinans(d) {
    d = d || {};
    function money(v) { return v ? esc(v) + ' ₺' : '—'; }
    if (!d.kasa && !d.gelir && !d.gider) { $('finans-icerik').innerHTML = '<p class="muted">Henüz bilgi girilmedi.</p>'; return; }
    $('finans-icerik').innerHTML =
      (d.kasa_donem ? '<p class="muted fin-note">' + esc(d.kasa_donem) + '</p>' : '') +
      '<div class="fin-grid">' +
      '<div class="card fin"><div class="l">Bu ayki gelir</div><div class="v">' + money(d.gelir) + '</div></div>' +
      '<div class="card fin"><div class="l">Bu ayki gider</div><div class="v">' + money(d.gider) + '</div></div>' +
      '<div class="fin dark"><div class="l">Kasadaki tutar</div><div class="v">' + money(d.kasa) + '</div></div>' +
      '</div>';
  }

  /* ---------- takvim ---------- */
  var official = { sabit: [], tarihli: [] };
  var village = [];
  var cal = { y: 2026, m: 10 };
  var MIN = { y: 2026, m: 0 };
  var MAX = { y: 2027, m: 11 };

  function ym(o) { return o.y * 12 + o.m; }

  function eventsFor(y, m, d) {
    var iso = y + '-' + pad(m + 1) + '-' + pad(d), out = [];
    village.forEach(function (e) {
      if (e._iso === iso) {
        var det = [e.saat, e.yer].filter(Boolean).join(' · ');
        out.push({ kisa: e.tur || e.kisa || 'Etkinlik', ad: e.ad || '', det: det, tur: 'koy' });
      }
    });
    official.tarihli.forEach(function (e) {
      if (normIso(e.tarih) === iso) out.push({ kisa: e.kisa, ad: e.ad, det: '', tur: e.tur });
    });
    official.sabit.forEach(function (e) {
      if (+e.ay === m + 1 && +e.gun === d) out.push({ kisa: e.kisa, ad: e.ad, det: '', tur: e.tur });
    });
    return out;
  }

  function drawCalendar() {
    var y = cal.y, m = cal.m;
    var offset = (new Date(y, m, 1).getDay() + 6) % 7;
    var dim = new Date(y, m + 1, 0).getDate();
    var today = todayIso();
    var cells = '', list = '', any = false, i, d, k;

    for (i = 0; i < offset; i++) cells += '<div class="day pad"></div>';
    for (d = 1; d <= dim; d++) {
      var evs = eventsFor(y, m, d);
      var iso = y + '-' + pad(m + 1) + '-' + pad(d);
      var kind = evs.length ? (KIND[evs[0].tur] || KIND.koy) : null;
      cells += '<div class="day' + (iso === today ? ' today' : '') + '"><b>' + d + '</b>' +
        (evs.length ? '<span class="chip" style="background:' + kind[1] + '">' + esc(evs[0].kisa) + '</span>' : '') + '</div>';
      for (k = 0; k < evs.length; k++) {
        any = true;
        var kd = KIND[evs[k].tur] || KIND.koy;
        list += '<div class="ev"><i aria-hidden="true" style="background:' + kd[1] + '"></i><strong>' + d + ' ' + MN[m] + '</strong>' +
          '<span class="nm">' + esc(evs[k].ad) + (evs[k].det ? ' <span class="small muted">· ' + esc(evs[k].det) + '</span>' : '') + '</span>' +
          '<span class="kd">' + esc(kd[0]) + '</span></div>';
      }
    }
    for (i = (offset + dim) % 7; i !== 0 && i < 7; i++) cells += '<div class="day pad"></div>';

    $('calGrid').innerHTML = cells;
    $('calList').innerHTML = any ? list : '<p class="muted" style="margin:0">Bu ay için kayıtlı bir gün yok.</p>';
    $('calTitle').textContent = MN[m] + ' ' + y;
    $('calPrev').disabled = ym(cal) <= ym(MIN);
    $('calNext').disabled = ym(cal) >= ym(MAX);
  }

  function drawUpcoming() {
    var today = todayIso();
    var up = village.filter(function (e) { return e._iso && e._iso >= today; })
      .sort(function (a, b) { return a._iso < b._iso ? -1 : a._iso > b._iso ? 1 : 0; })
      .slice(0, 6);
    $('yaklasan').innerHTML = up.length ? up.map(function (e) {
      var det = [longDate(e._iso), e.saat, e.yer].filter(Boolean).join(' · ');
      return '<div class="up"><strong>' + esc(e.tur || e.kisa || 'Etkinlik') + '</strong> · ' + esc(e.ad) +
        '<br><span class="small muted">' + esc(det) + '</span></div>';
    }).join('') : '<p class="muted" style="margin:0">Yaklaşan bir etkinlik yok.</p>';
  }

  function initCalendar() {
    Promise.all([load('resmi-gunler'), load('etkinlikler')]).then(function (r) {
      official = { sabit: r[0].sabit || [], tarihli: r[0].tarihli || [] };
      village = items(r[1]).map(function (e) { e._iso = normIso(e.tarih); return e; }).filter(function (e) { return e._iso; });

      village.forEach(function (e) {
        var y = +e._iso.slice(0, 4), m = +e._iso.slice(5, 7) - 1, o = { y: y, m: m };
        if (ym(o) > ym(MAX)) MAX = o;
        if (ym(o) < ym(MIN)) MIN = o;
      });

      var t = new Date(), now = { y: t.getFullYear(), m: t.getMonth() };
      cal = ym(now) < ym(MIN) ? { y: MIN.y, m: MIN.m } : ym(now) > ym(MAX) ? { y: MAX.y, m: MAX.m } : now;

      $('calPrev').addEventListener('click', function () {
        if (ym(cal) <= ym(MIN)) return;
        cal = cal.m === 0 ? { y: cal.y - 1, m: 11 } : { y: cal.y, m: cal.m - 1 };
        drawCalendar();
      });
      $('calNext').addEventListener('click', function () {
        if (ym(cal) >= ym(MAX)) return;
        cal = cal.m === 11 ? { y: cal.y + 1, m: 0 } : { y: cal.y, m: cal.m + 1 };
        drawCalendar();
      });
      drawCalendar();
      drawUpcoming();
    }).catch(function () {
      $('calGrid').innerHTML = '<p class="muted" style="grid-column:1/-1;padding:12px">Takvim şu anda yüklenemedi. Lütfen sayfayı yenileyin.</p>';
      $('yaklasan').innerHTML = '';
    });
  }

  /* ---------- başlat ---------- */
  $('yil').textContent = new Date().getFullYear();
  bindGallery();
  function byDateDesc(list) {
    return items(list).slice().sort(function (a, b) {
      var x = normIso(a.tarih), y = normIso(b.tarih);
      return x < y ? 1 : x > y ? -1 : 0;
    });
  }
  load('duyurular').then(function (d) {
    var all = byDateDesc(d);
    renderNews(all.filter(function (x) { return x.tur === 'Haber'; }));
    renderIlanlar(all.filter(function (x) { return x.tur !== 'Haber'; }));
  }).catch(function () { fail('haber-icerik'); fail('ilan-icerik'); });
  section('galeri', 'galeri-icerik', renderGallery);
  load('pazar').then(function (d) { renderPazar(byDateDesc(d)); }).catch(function () { fail('pazar-icerik'); });
  renderGezi(GEZI);
  load('dernek').then(function (d) {
    renderGenel(d); renderFinans(d);
    var live = window.CD && window.CD.ytEmbed(d && d.canli_yayin);
    if (live) { $('canli-icerik').innerHTML = window.CD.ytFrame(live); $('canli').hidden = false; $('nav-canli').hidden = false; }
  })
    .catch(function () { $('ft-iletisim').innerHTML = ''; fail('finans-icerik'); });
  initCalendar();
})();
