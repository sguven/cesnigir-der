/* Çeşnigir-Der · yönetim: sitenin kendisi, düzenleme modunda.
   Yönetici siteyi ziyaretçi gibi gezer; her duyurunun, etkinliğin, ilanın ve fotoğrafın yanında "Düzenle" ve "Sil" düğmeleri,
   her bölümün başında "Yeni ekle" düğmesi vardır. Değişiklikler doğrudan GitHub'daki site dosyalarına (data/*.json) kaydedilir
   ve sayfada hemen görünür; ziyaretçilere 1-2 dakika içinde yansır.

   Giriş: GitHub erişim anahtarı. Anahtar iki yerde durur:
   1) adres çubuğunda (giriş bağlantısı: https://cesnigirder.org/yonetim/?k=ANAHTAR). Bağlantıya dokunan, ana ekrana ya da yer imine
      ekleyen her seferinde kendiliğinden girer; tarayıcı belleği silinse bile.
   2) tarayıcı belleğinde (localStorage). iPhone Safari bu belleği bir hafta girilmeyen sitelerde, gizli sekmede ya da
      WhatsApp/Facebook içinden açılan tarayıcıda kapanınca siler: eskiden anahtarın her girişte yeniden istenmesinin sebebi buydu.
   app.js bu dosyadan sonra yüklenir ve window.CD_EDIT üzerinden buraya bağlanır. */
(function () {
  'use strict';
  var C = window.CD, esc = C.esc;
  var REPO = 'sguven/cesnigir-der', BRANCH = 'main';
  var API = 'https://api.github.com/repos/' + REPO;
  var RAW = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';
  var KEY = 'cesnigir_yonetim_anahtar';
  window.CD_BASE = '../';

  var site = null;          // app.js'in verdiği arayüz: data(), set(), route(), evRow(), eid(), iid(), pid()
  var fresh = {};           // bu oturumda yüklenen fotoğraflar: yol -> önizleme (GitHub'a ulaşana kadar da görünsün)
  var authBad = false;

  /* ---------------- bölümler ---------------- */
  var ORNEK = {
    'Vefat': ['Örnek: Ahmet YILMAZ Hakk\'ın rahmetine kavuşmuştur', 'Örnek: Cenazesi yarın öğle namazına müteakip köy camiinden kaldırılacaktır. Merhuma Allah\'tan rahmet, ailesine başsağlığı dileriz.'],
    'Düğün': ['Örnek: Ali ile Ayşe evleniyor', 'Örnek: Düğünümüz 12 Temmuz Cumartesi günü köy meydanında yapılacaktır. Tüm köylülerimiz davetlidir.'],
    'Nişan': ['Örnek: Mehmet ile Zeynep nişanlanıyor', 'Nişanın yeri, günü ve saati…'],
    'Mevlit': ['Örnek: Merhum Hasan Kaya için mevlit', 'Örnek: Cuma günü ikindi namazından sonra köy camiinde okunacaktır.'],
    'Toplantı': ['Örnek: Dernek genel kurul toplantısı', 'Toplantının yeri, saati ve konuşulacak konular…'],
    'Duyuru': ['Örnek: Köy yolu bakım çalışması', 'Duyurunun ayrıntıları…'],
    'Haber': ['Haberin başlığı', 'Haberin kısa özeti…'],
    'Tarihten': ['Örnek: Köprümüzün 1852 onarımı', 'Ne oldu, ne zaman oldu, nereden biliyoruz? Kaynağını aşağıya yazın.']
  };

  var COLS = {
    duyurular: {
      file: 'data/duyurular.json', one: 'duyuru', edit: 'Duyuruyu Düzenle', big: 'Bu duyuruyu düzenle', addLabel: 'Yeni Duyuru Ekle', page: 'duyuru', list: 'duyurular',
      fields: [
        { name: 'tur', label: 'Ne duyuruyorsunuz?', type: 'choice', opts: C.DUYURU_TURLERI, required: true, def: 'Duyuru' },
        { name: 'tarih', label: 'Tarih', type: 'date', required: true, def: 'today' },
        { name: 'baslik', label: 'Başlık', type: 'text', required: true },
        { name: 'metin', label: 'Açıklama', type: 'textarea' },
        { name: 'foto', label: 'Fotoğraf', type: 'photo', help: 'İsterseniz bir fotoğraf ekleyin.' },
        { name: 'olay_tarihi', label: 'Olayın tarihi (Tarihten yazıları için)', type: 'text', extra: true, placeholder: 'Örnek: 26 Aralık 1919' },
        { name: 'kaynak', label: 'Haberin kaynağı', type: 'text', extra: true, placeholder: 'Örnek: Kırıkkale Haber' },
        { name: 'link', label: 'Haberin internet adresi', type: 'url', extra: true, placeholder: 'https://…' }
      ]
    },
    etkinlikler: {
      file: 'data/etkinlikler.json', one: 'etkinlik', edit: 'Etkinliği Düzenle', big: 'Bu etkinliği düzenle', addLabel: 'Yeni Etkinlik Ekle', page: 'etkinlik', list: 'etkinlikler',
      fields: [
        { name: 'tur', label: 'Ne olacak?', type: 'choice', opts: C.ETKINLIK_TURLERI, required: true, def: 'Düğün' },
        { name: 'tarih', label: 'Hangi gün?', type: 'date', required: true, def: 'today' },
        { name: 'ad', label: 'Kimin / neyin?', type: 'text', required: true, placeholder: 'Örnek: Ali ile Ayşe\'nin düğünü' },
        { name: 'saat', label: 'Saat', type: 'text', placeholder: 'Örnek: 14:00 veya ikindiden sonra' },
        { name: 'yer', label: 'Yer', type: 'text', placeholder: 'Örnek: Köy meydanı' },
        { name: 'foto', label: 'Fotoğraf', type: 'photo', help: 'İsterseniz bir fotoğraf ekleyin (davetiye, afiş ya da bir resim).' }
      ]
    },
    pazar: {
      file: 'data/pazar.json', one: 'ilan', edit: 'İlanı Düzenle', big: 'Bu ilanı düzenle', addLabel: 'Yeni Market İlanı Ekle', page: 'ilan', list: 'pazar', autoDate: true,
      fields: [
        { name: 'tur', label: 'İlan türü', type: 'choice', opts: C.PAZAR_TURLERI, required: true, def: 'Satılık' },
        { name: 'baslik', label: 'Ne satılıyor / aranıyor?', type: 'text', required: true, placeholder: 'Örnek: Köy yumurtası' },
        { name: 'fiyat', label: 'Fiyat (TL)', type: 'text', inputmode: 'numeric', placeholder: 'Örnek: 150', help: 'Fiyat yoksa boş bırakın.' },
        { name: 'aciklama', label: 'Açıklama', type: 'textarea' },
        { name: 'kisi', label: 'İlan sahibi', type: 'text', placeholder: 'Örnek: Ahmet Yılmaz' },
        { name: 'telefon', label: 'Telefon', type: 'tel', placeholder: '0555 123 45 67', help: 'Sitede "Ara" ve "WhatsApp" düğmesi olarak görünür.' },
        { name: 'foto', label: 'Fotoğraf', type: 'photo' }
      ]
    }
  };

  // Dernek bilgileri parça parça düzenlenir: sitede hangi kutunun yanındaki "Düzenle"ye dokunulduysa yalnız o kutunun bilgileri açılır
  var DERNEK = {
    kisiler: { title: 'Dernek Bilgileri', help: 'Başkan ve yardımcısı Hakkımızda ve İletişim sayfalarında, telefonlarıyla birlikte görünür.', fields: [
      { name: 'baskan', label: 'Dernek başkanı', type: 'text', placeholder: 'Ad Soyad' },
      { name: 'telefon', label: 'Başkanın telefonu', type: 'tel', placeholder: '0555 123 45 67' },
      { name: 'baskan2', label: 'Başkan yardımcısı', type: 'text', placeholder: 'Ad Soyad', help: 'Yoksa boş bırakın.' },
      { name: 'telefon2', label: 'Başkan yardımcısının telefonu', type: 'tel', placeholder: '0555 123 45 67' },
      { name: 'whatsapp', label: 'WhatsApp numarası', type: 'tel', help: 'Telefonla aynıysa boş bırakın.' },
      { name: 'eposta', label: 'E-posta', type: 'email' },
      { name: 'adres', label: 'Adres', type: 'text' }
    ] },
    hakkimizda: { title: 'Hakkımızda Yazısı', help: 'Paragrafları boş bir satırla ayırın.', fields: [
      { name: 'hakkimizda', label: 'Hakkımızda yazısı', type: 'textarea', tall: true }
    ] },
    kurullar: { title: 'Dernek Kurulları', help: 'Her satıra bir isim yazın. Görevi varsa isimden sonra tire koyup yazın (Ahmet Yılmaz - Sayman). Boş bırakılan kurul sitede görünmez.', fields: [
      { name: 'yonetim_kurulu', label: 'Yönetim kurulu', type: 'textarea', placeholder: 'Ahmet Yılmaz - Başkan\nMehmet Demir - Sayman\nAli Kaya' },
      { name: 'denetim_kurulu', label: 'Denetim kurulu', type: 'textarea', placeholder: 'Hasan Çelik\nVeli Şahin\nOsman Kurt' }
    ] },
    kasa: { title: 'Kasa Durumu', help: 'Hakkımızda sayfasında görünür. Hepsini boş bırakırsanız kutu görünmez.', fields: [
      { name: 'kasa_donem', label: 'Hangi ay?', type: 'text', placeholder: 'Örnek: Kasım 2026' },
      { name: 'gelir', label: 'Bu ayki gelir (TL)', type: 'text', inputmode: 'numeric' },
      { name: 'gider', label: 'Bu ayki gider (TL)', type: 'text', inputmode: 'numeric' },
      { name: 'kasa', label: 'Kasadaki para (TL)', type: 'text', inputmode: 'numeric' }
    ] },
    canli: { title: 'Köyden Canlı Görüntü', help: 'Ana sayfanın sağ üstündeki küçük video. Adresi boş bırakırsanız görünmez.', fields: [
      { name: 'canli_yayin', label: 'YouTube canlı yayın adresi', type: 'url', placeholder: 'https://www.youtube.com/live/…' },
      { name: 'canli_not', label: 'Canlı yayın notu', type: 'text', placeholder: 'Örnek: Yakında',
        help: 'Yayın henüz başlamadıysa "Yakında" yazın: başlığın yanında görünür, CANLI etiketi kalkar. Yayın başlayınca boş bırakın.' }
    ] }
  };

  /* ---------------- küçük yardımcılar ---------------- */
  var ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',
    warn: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5M12 18h.01"/>',
    news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5M8 16h3"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    bag: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    out: '<path d="M10 4H5v16h5"/><path d="m15 8 4 4-4 4M19 12H9"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
    pin: '<path d="M9 3h6l-1 6 4 3v2H6v-2l4-3-1-6Z"/><path d="M12 14v7"/>'
  };
  function icon(n) {
    return '<svg class="ed-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
  }
  function $(id) { return document.getElementById(id); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  /* ---------------- giriş anahtarı ---------------- */
  function param(n) { try { return new URLSearchParams(location.search).get(n) || ''; } catch (e) { return ''; } }
  function cleanKey(k) { return String(k || '').replace(/\s+/g, ''); }   // WhatsApp'tan kopyalarken araya giren boşluk ve satır sonları
  function urlKey() { return cleanKey(param('k')); }
  /* Her yöneticinin kendi bağlantısı olabilir: …/yonetim/?k=ANAHTAR&ad=Sedat. Ad, GitHub'daki değişiklik kaydına yazılır
     ("Panel (Sedat): duyuru eklendi"), böylece kimin neyi değiştirdiği görünür. */
  var AD = 'cesnigir_yonetim_ad';
  function who() {
    var a = param('ad').trim();
    if (a) { try { localStorage.setItem(AD, a); } catch (e) { /* yok say */ } return a; }
    try { return localStorage.getItem(AD) || ''; } catch (e) { return ''; }
  }
  var memKey = '';
  function storedKey() { try { return localStorage.getItem(KEY) || memKey; } catch (e) { return memKey; } }
  function getKey() { return urlKey() || storedKey(); }
  function storeKey(k) { memKey = k; try { if (k) localStorage.setItem(KEY, k); else localStorage.removeItem(KEY); } catch (e) { /* bellekte kalır */ } }
  // Anahtar adres çubuğuna yazılır: bu sayfa ana ekrana ya da yer imine eklenince anahtar da onunla gider
  function keyInUrl(k) {
    var a = who();
    try { history.replaceState(null, '', location.pathname + (k ? '?k=' + encodeURIComponent(k) + (a ? '&ad=' + encodeURIComponent(a) : '') : '') + location.hash); } catch (e) { /* yok say */ }
  }
  function loginLink(k) { var a = who(); return location.href.split(/[?#]/)[0] + '?k=' + encodeURIComponent(k) + (a ? '&ad=' + encodeURIComponent(a) : ''); }

  /* ---------------- GitHub ---------------- */
  function api(method, path, body, key) {
    return fetch(API + path, {
      method: method,
      cache: 'no-store',
      headers: {
        'Authorization': 'Bearer ' + (key || getKey()),
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    }).catch(function () { throw { status: 'net' }; }).then(function (r) {
      if (!r.ok) throw { status: r.status };
      return r.json();
    });
  }
  function b64ToText(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  function bytesToB64(bytes) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function textToB64(t) { return bytesToB64(new TextEncoder().encode(t)); }
  function getJson(file) {
    return api('GET', '/contents/' + file + '?ref=' + BRANCH).then(function (r) {
      var data;
      try { data = JSON.parse(b64ToText(r.content)); } catch (e) { data = null; }
      return { sha: r.sha, data: data };
    }).catch(function (e) {
      if (e && e.status === 404) return { sha: null, data: null };
      throw e;
    });
  }
  function putFile(path, b64, sha, message) {
    var a = who();
    var body = { message: a ? message.replace(/^Panel: /, 'Panel (' + a + '): ') : message, content: b64, branch: BRANCH };
    if (sha) body.sha = sha;
    return api('PUT', '/contents/' + path, body);
  }
  // Dosyayı taze okuyup değiştirir; çakışmada bir kez daha dener. Kaydedilen yeni içerikle döner.
  function updateJson(file, change, message, tries) {
    tries = tries == null ? 2 : tries;
    var next;
    return getJson(file).then(function (f) {
      next = change(f.data);
      return putFile(file, textToB64(JSON.stringify(next, null, 2) + '\n'), f.sha, message);
    }).then(function () { return next; }).catch(function (e) {
      if ((e.status === 409 || e.status === 422) && tries > 0) return updateJson(file, change, message, tries - 1);
      throw e;
    });
  }
  function errText(e) {
    var s = e && e.status;
    if (s === 401) return 'Giriş kodunun süresi dolmuş ya da kod silinmiş. Lütfen yeni giriş kodunu girin.';
    if (s === 403 || s === 404) return 'Bu giriş kodunun siteyi değiştirme izni yok. Site yöneticisine haber verin.';
    if (s === 409 || s === 422) return 'Aynı anda başka bir değişiklik yapıldı. Lütfen tekrar deneyin.';
    if (s === 'net') return 'İnternet bağlantısı yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.';
    if (s === 'photo') return 'Bu fotoğraf açılamadı. Başka bir fotoğraf deneyin.';
    if (s === 'gone') return 'Bu kayıt bu arada başka bir yerden değiştirilmiş ya da silinmiş. Sayfa yenilendi, lütfen tekrar deneyin.';
    return 'Bir sorun çıktı, kaydedilemedi. Biraz sonra tekrar deneyin.';
  }

  /* ---------------- app.js ile bağlantı ---------------- */
  function pub(name, fb) {
    return fetch('../data/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return fb; });
  }
  // Düzenleme modunda içerik GitHub'dan taze okunur (yayındaki site 1-2 dakika geriden gelir)
  function load(name, fb) {
    if (!getKey() || name === 'resmi-gunler') return pub(name, fb);
    return getJson('data/' + name + '.json').then(function (f) { return f.data == null ? fb : f.data; })
      .catch(function (e) { if (e && e.status === 401) authBad = true; return pub(name, fb); });
  }
  function img(p) {
    p = String(p == null ? '' : p).trim();
    if (!p) return '';
    if (fresh[p]) return fresh[p];
    if (/^https?:\/\//i.test(p)) return C.imgSrc(p, '');
    // yeni yüklenen fotoğraf yayındaki siteye birkaç dakika sonra ulaşır; o zamana kadar doğrudan GitHub'dan gösterilir
    if (/^\/?images\/yuklenen\//.test(p)) return C.imgSrc(p, RAW);
    return C.imgSrc(p, '../');
  }
  function rerender() { E.keep = true; try { site.route(); } finally { E.keep = false; } }
  function refresh(col) {
    var file = col === 'galeri' ? 'data/galeri.json' : col === 'dernek' ? 'data/dernek.json' : COLS[col].file;
    return getJson(file).then(function (f) { site.set(col, f.data); rerender(); }).catch(function () { /* yok say */ });
  }
  function flash(col, ix) {
    var t = document.querySelector('#icerik [data-ek="' + col + '"][data-ix="' + ix + '"]');
    if (!t) return;
    var box = t.closest('.ed-wrap') || t;
    box.classList.add('ed-flash');
    var r = box.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 90) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(function () { box.classList.remove('ed-flash'); }, 2600);
  }

  /* ---------------- sayfaya düğmeleri yerleştir ---------------- */
  function itemBar(col, ix, big) {
    var c = COLS[col];
    return el('<div class="ed-bar' + (big ? ' big' : '') + '">' +
      '<button type="button" class="ed-btn" data-act="edit" data-col="' + col + '" data-ix="' + ix + '">' + icon('edit') + (big ? c.big : 'Düzenle') + '</button>' +
      '<button type="button" class="ed-btn red" data-act="del" data-col="' + col + '" data-ix="' + ix + '">' + icon('trash') + 'Sil</button></div>');
  }
  var ADD = { duyurular: 'Yeni duyuru ekle', etkinlikler: 'Yeni etkinlik ekle', pazar: 'Yeni market ilanı ekle', galeri: 'Fotoğraf ekle' };
  var DERNEK_ADD = { kasa: 'Kasa durumu ekle', kurullar: 'Yönetim ve denetim kurulu ekle', canli: 'Canlı görüntü ekle' };

  function after(page) {
    var main = $('icerik');
    main.querySelectorAll('[data-ek]').forEach(function (t) {
      var col = t.getAttribute('data-ek'), ix = +t.getAttribute('data-ix');
      if (!COLS[col]) return;
      if (t.tagName === 'A') {                       // duyuru kartı bir bağlantı: düğmeler kartın hemen altına
        var w = el('<div class="ed-wrap"></div>');
        t.parentNode.insertBefore(w, t); w.appendChild(t); w.appendChild(itemBar(col, ix));
      } else if (t.classList.contains('article')) {  // ayrıntı sayfası: üstte büyük düğmeler
        t.insertBefore(itemBar(col, ix, true), t.firstChild);
      } else if (t.classList.contains('ev')) {
        (t.querySelector('.ev-info') || t).appendChild(itemBar(col, ix));
      } else {
        (t.querySelector('.box-pad') || t).appendChild(itemBar(col, ix));
      }
    });
    main.querySelectorAll('[data-ed="galeri"]').forEach(function (g) {
      g.querySelectorAll('[data-gal]').forEach(function (b) {
        var w = el('<div class="ed-gal"></div>');
        b.parentNode.insertBefore(w, b); w.appendChild(b);
        w.appendChild(el('<button type="button" class="ed-gdel" data-act="gdel" data-gi="' + b.getAttribute('data-gal') + '" aria-label="Bu fotoğrafı sil">' + icon('trash') + 'Sil</button>'));
      });
      g.insertBefore(el('<button type="button" class="ed-gadd" data-act="add" data-col="galeri">' + icon('plus') + '<span>Fotoğraf ekle</span></button>'), g.firstChild);
    });
    main.querySelectorAll('[data-ed^="ekle:"]').forEach(function (t) {
      var col = t.getAttribute('data-ed').slice(5);
      if (col === 'galeri' && t.classList.contains('container') && t.querySelector('[data-ed="galeri"]')) return;   // ızgaranın içinde zaten var
      var b = '<button type="button" class="ed-add" data-act="add" data-col="' + col + '">' + icon('plus') + esc(ADD[col]) + '</button>';
      if (t.classList.contains('sec-head')) t.appendChild(el(b.replace('ed-add', 'ed-add sm')));
      else t.insertBefore(el(b), t.firstChild);
    });
    main.querySelectorAll('[data-ed^="dernek:"]').forEach(function (t) {
      var g = t.getAttribute('data-ed').slice(7);
      if (!t.children.length) { t.appendChild(el('<button type="button" class="ed-add" data-act="dernek" data-g="' + g + '">' + icon('plus') + esc(DERNEK_ADD[g] || 'Ekle') + '</button>')); return; }
      var b = el('<button type="button" class="ed-btn ed-corner" data-act="dernek" data-g="' + g + '">' + icon('edit') + 'Düzenle</button>');
      if (g === 'canli') { var lab = t.querySelector('.live-label'); if (lab) { b.className = 'ed-btn ed-inline'; lab.appendChild(b); } return; }
      t.classList.add('ed-rel');
      if (t.classList.contains('sec-head')) { b.className = 'ed-add sm'; b.innerHTML = icon('edit') + 'Kurulları düzenle'; t.appendChild(b); return; }
      t.appendChild(b);
    });
    if (page === 'etkinlikler') pastEvents(main);
    mAdmin(page);
  }

  // Geçmiş etkinlikler sitede görünmez; düzenleme modunda sayfanın sonunda listelenir (düzeltmek ya da silmek için)
  function pastEvents(main) {
    var d = site.data(), today = C.todayIso(), past = [];
    d.etkinlikler.forEach(function (e, ix) {
      var iso = C.normIso(e.tarih);
      if (iso && iso < today) past.push({ iso: iso, ad: e.ad, tur: e.tur, saat: e.saat, yer: e.yer, foto: e.foto, id: site.eid(e), koy: true, ix: ix });
    });
    if (!past.length) return;
    past.sort(function (a, b) { return a.iso < b.iso ? 1 : -1; });
    var box = el('<details class="ed-past"><summary>Geçmiş etkinlikler (' + past.length + ') · yalnız sizin gördüğünüz liste</summary><div class="box"></div></details>');
    box.querySelector('.box').innerHTML = past.map(site.evRow).join('');
    var c = main.querySelector('.section .container'); if (c) c.appendChild(box);
    box.querySelectorAll('[data-ek]').forEach(function (t) { (t.querySelector('.ev-info') || t).appendChild(itemBar('etkinlikler', +t.getAttribute('data-ix'))); });
  }

  /* ---------------- Köy Meydanı ve yorumlar: onay ----------------
     Ziyaretçilerin yazıları, cevapları ve haber/etkinlik/fotoğraf yorumları onaya düşer. Hepsi ana sayfanın en üstünde
     "Onay bekleyenler" kutusunda "Onayla" / "Sil" düğmeleriyle görünür; üst şeritte sayısı yazar ("Onay bekleyen: 3").
     Ayrıca Köy Meydanı sayfasında forum yazıları, her kaydın kendi sayfasında da o kayda gelenler görünür.
     Yayındaki yazılarda "En üste sabitle" ve "Sil", cevaplarda ve yorumlarda "Sil" vardır.
     Yetki: giriş anahtarı veritabanına gönderilir, veritabanı GitHub'a sorar (araclar/supabase-meydan.sql: forum_yetki). */
  var mPend = null, mPendT = 0, mPendP = null;
  function mRpc(fn, body) { body.anahtar = getKey(); return C.sb('/rpc/' + fn, { method: 'POST', body: body }); }
  function mPendLoad(force) {
    if (!force && mPend && Date.now() - mPendT < 15000) return Promise.resolve(mPend);
    if (mPendP) return mPendP;
    mPendP = mRpc('forum_bekleyenler', {}).then(function (r) {
      mPend = { konular: C.arr(r && r.konular), cevaplar: C.arr(r && r.cevaplar), yorumlar: C.arr(r && r.yorumlar) }; mPendT = Date.now(); mBadge(); return mPend;
    }).then(function (x) { mPendP = null; return x; }, function (e) { mPendP = null; throw e; });
    return mPendP;
  }
  function mBadge() {
    var a = document.querySelector('.nav [data-nav="meydan"]'), n = mPend ? mPend.konular.length + mPend.cevaplar.length : 0;
    var all = mPend ? n + mPend.yorumlar.length : 0, pill = $('edPendPill');
    if (pill) { pill.hidden = !all; pill.querySelector('b').textContent = all; }
    if (!a) return;
    var b = a.querySelector('.ed-count');
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = el('<span class="ed-count"></span>'); a.appendChild(b); }
    b.textContent = n; b.title = n + ' yazı onay bekliyor';
  }
  var Y_TUR = { duyuru: ['Haber yorumu', 'duyuru'], etkinlik: ['Etkinlik yorumu', 'etkinlik'], foto: ['Fotoğraf yorumu', 'foto'] };
  function mPendItem(x, tur, link) {
    var yt = tur === 'yorum' ? Y_TUR[x.hedef_tur] || ['Yorum', ''] : null;
    var where = tur === 'konu' ? '' : tur === 'cevap' ? (x.konu_baslik ? 'Köy Meydanı: "' + x.konu_baslik + '" yazısına cevap' : '') : (x.hedef_baslik ? '"' + x.hedef_baslik + '"' : '');
    var href = tur === 'cevap' ? '#/konu/' + x.konu_id : yt && yt[1] ? '#/' + yt[1] + '/' + encodeURIComponent(x.hedef) : '';
    return '<div class="ed-m-item">' +
      '<div class="news-meta"><span class="badge">' + esc(tur === 'konu' ? 'Köy Meydanı · ' + x.kategori : tur === 'cevap' ? 'Köy Meydanı · Cevap' : yt[0]) + '</span><span>' + esc(C.zaman(x.created_at)) + '</span></div>' +
      (tur === 'konu' ? '<h3>' + esc(x.baslik) + '</h3>' : where ? '<p class="small muted" style="margin:0 0 6px">' + esc(where) +
        (link && href ? ' · <a href="' + href + '">Sayfasını aç</a>' : '') + '</p>' : '') +
      '<p class="ed-m-by"><b>' + esc(x.ad) + '</b></p><div class="ed-m-text">' + esc(x.metin) + '</div>' + C.fotolarHtml(x) +
      '<div class="ed-bar"><button type="button" class="ed-btn green" data-fm="onayla" data-tur="' + tur + '" data-id="' + x.id + '">' + icon('check') + 'Onayla, yayınla</button>' +
      '<button type="button" class="ed-btn red" data-fm="sil" data-tur="' + tur + '" data-id="' + x.id + '">' + icon('trash') + 'Sil</button></div></div>';
  }
  var mScroll = false;
  function mAdmin(page) {
    if (!getKey()) return;
    var main = $('icerik');
    main.querySelectorAll('[data-m-konu]:not([data-m-ed])').forEach(function (t) {
      t.setAttribute('data-m-ed', '');
      var id = t.getAttribute('data-m-konu'), pin = t.hasAttribute('data-sabit');
      t.appendChild(el('<div class="ed-bar"><button type="button" class="ed-btn" data-fm="sabitle" data-tur="konu" data-id="' + id + '">' + icon('pin') +
        (pin ? 'Sabitlemeyi kaldır' : 'En üste sabitle') + '</button><button type="button" class="ed-btn red" data-fm="sil" data-tur="konu" data-id="' + id + '">' + icon('trash') + 'Yazıyı sil</button></div>'));
    });
    main.querySelectorAll('[data-m-cevap]:not([data-m-ed])').forEach(function (t) {
      t.setAttribute('data-m-ed', '');
      t.appendChild(el('<div class="ed-bar"><button type="button" class="ed-btn red" data-fm="sil" data-tur="cevap" data-id="' + t.getAttribute('data-m-cevap') + '">' + icon('trash') + 'Cevabı sil</button></div>'));
    });
    main.querySelectorAll('[data-y-id]:not([data-m-ed])').forEach(function (t) {
      t.setAttribute('data-m-ed', '');
      t.appendChild(el('<div class="ed-bar"><button type="button" class="ed-btn red" data-fm="sil" data-tur="yorum" data-id="' + t.getAttribute('data-y-id') + '">' + icon('trash') + 'Yorumu sil</button></div>'));
    });
    var ys = main.querySelector('.y-sec');
    if (page !== '' && page !== 'meydan' && page !== 'konu' && !ys) return;
    mPendLoad().then(function (p) {
      var konu = main.querySelector('[data-m-konu]'), kid = konu ? +konu.getAttribute('data-m-konu') : 0;
      var host = null, konular = [], cevaplar = [], yorumlar = [];
      if (page === '') { konular = p.konular; cevaplar = p.cevaplar; yorumlar = p.yorumlar; }
      else if (page === 'meydan') { host = main.querySelector('.m-main'); konular = p.konular; cevaplar = p.cevaplar; }
      else if (page === 'konu') { host = $('mPend'); cevaplar = p.cevaplar.filter(function (c) { return c.konu_id === kid; }); }
      else if (ys) {
        host = ys.querySelector('.y-pend');
        yorumlar = p.yorumlar.filter(function (y) { return y.hedef_tur === ys.getAttribute('data-y') && y.hedef === ys.getAttribute('data-yh'); });
      }
      var n = konular.length + cevaplar.length + yorumlar.length, old = $('edMPend'), oldW = $('edMPendWrap');
      if (old) old.remove();
      if (oldW) oldW.remove();
      if (page === '') {
        if (!n) return;
        var sec = main.querySelector('.section');
        if (!sec) return;
        host = el('<div class="container" id="edMPendWrap" style="padding-top:22px"></div>');
        sec.parentNode.insertBefore(host, sec);
      }
      if (!host || (!n && page !== 'meydan')) return;
      var home = page === '';
      host.insertBefore(el('<div id="edMPend" class="ed-m-pend"><h2>' + (n ? 'Onay bekleyenler (' + n + ')' : 'Onay bekleyen yazı yok') + '</h2>' +
        (n ? '<p class="small muted">Bunları yalnız siz görüyorsunuz. Onaylarsanız sitede görünür; uygun değilse silin.</p>' : '<p class="small muted">Yeni yazı ve cevaplar gelince burada görünecek.</p>') +
        konular.map(function (k) { return mPendItem(k, 'konu', home); }).join('') + cevaplar.map(function (c) { return mPendItem(c, 'cevap', home); }).join('') +
        yorumlar.map(function (y) { return mPendItem(y, 'yorum', home); }).join('') + '</div>'), host.firstChild);
      if (home && mScroll) { mScroll = false; $('edMPend').scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    }).catch(function () {
      var host = page === 'meydan' ? main.querySelector('.m-main') : null;
      if (host && !$('edMPend')) host.insertBefore(el('<div id="edMPend" class="ed-m-pend"><h2>Onay bekleyenler açılamadı</h2><p class="small muted">İnternet bağlantınızı kontrol edip sayfayı yenileyin. Sorun sürerse site yöneticisine haber verin.</p></div>'), host.firstChild);
    });
  }
  document.addEventListener('meydan:ciz', function (e) { if (site) mAdmin(e.detail && e.detail.sayfa); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fm]');
    if (!b || !site) return;
    e.preventDefault(); e.stopPropagation();
    var islem = b.getAttribute('data-fm'), tur = b.getAttribute('data-tur'), id = +b.getAttribute('data-id');
    var ask = islem !== 'sil' ? Promise.resolve(true) :
      dialog('Silinsin mi?', tur === 'konu' ? 'Bu yazı ve altındaki bütün cevaplar silinecek. Geri alınamaz.' : tur === 'cevap' ? 'Bu cevap silinecek. Geri alınamaz.' : 'Bu yorum silinecek. Geri alınamaz.', 'Evet, sil', { danger: true });
    ask.then(function (ok) {
      if (!ok) return;
      busy(islem === 'onayla' ? 'Yayınlanıyor…' : islem === 'sil' ? 'Siliniyor…' : 'Kaydediliyor…');
      mRpc('forum_islem', { tur: tur, kayit: id, islem: islem }).then(function () {
        busy(false);
        toast(islem === 'onayla' ? 'Yayınlandı' : islem === 'sil' ? 'Silindi' : 'Kaydedildi', islem === 'onayla' ? 'Artık sitede herkes görüyor.' : '');
        mPendT = 0;
        if (islem === 'sil' && tur === 'konu' && curPage() === 'konu') location.hash = '#/meydan'; else rerender();
      }).catch(function (er) {
        busy(false);
        dialog('Yapılamadı', er && er.status === 'net' ? errText(er) : er && er.status === 401 ? 'Yetkiniz doğrulanamadı. Giriş bağlantınızla yeniden girin; sorun sürerse site yöneticisine haber verin.' :
          'Bir sorun çıktı. Biraz sonra tekrar deneyin.', 'Tamam', { single: true });
      });
    });
  }, true);

  /* ---------------- pencereler ---------------- */
  function busy(text) {
    var b = $('edBusy');
    if (text === false) { b.hidden = true; return; }
    $('edBusyText').textContent = text;
    b.hidden = false;
  }
  function dialog(title, text, yes, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var d = $('edAsk'), y = $('edAskYes'), n = $('edAskNo');
      $('edAskTitle').textContent = title;
      $('edAskText').textContent = text || '';
      y.textContent = yes;
      y.className = 'btn btn-wide' + (opts.danger ? ' ed-red' : '');
      n.hidden = !!opts.single;
      d.hidden = false;
      var last = document.activeElement;
      y.focus();
      function done(v) {
        d.hidden = true; y.onclick = n.onclick = null; document.removeEventListener('keydown', key, true);
        if (last && last.focus) { try { last.focus(); } catch (e) { /* yok say */ } }
        resolve(v);
      }
      function key(e) {
        if (e.key === 'Escape') { e.stopPropagation(); done(false); }
        if (e.key === 'Tab' && !opts.single) { e.preventDefault(); (document.activeElement === y ? n : y).focus(); }
      }
      y.onclick = function () { done(true); };
      n.onclick = function () { done(false); };
      document.addEventListener('keydown', key, true);
    });
  }
  var toastT = null;
  function toast(title, sub) {
    var t = $('edToast');
    t.innerHTML = '<span class="ed-tick">' + icon('check') + '</span><div><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
    t.hidden = false; t.classList.remove('out');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.hidden = true; }, 400); }, 4500);
  }
  function fail(title, e) {
    return dialog(title, errText(e), e && e.status === 401 ? 'Yeniden giriş yap' : 'Tamam', { single: e && e.status !== 401 }).then(function (ok) {
      if (ok && e && e.status === 401) { closeSheet(true); showLogin('Giriş kodunun süresi dolmuş. Lütfen yeni giriş kodunu girin.'); }
      if (e && e.status === 'gone') return 'gone';
    });
  }

  /* Alttan açılan form penceresi */
  var sheetDirty = false, sheetLast = null;
  function openSheet(title, bodyHtml, saveLabel, onSave) {
    var s = $('edSheet');
    sheetLast = document.activeElement;
    s.innerHTML = '<div class="ed-sheet-box" role="dialog" aria-modal="true" aria-labelledby="edSheetTitle">' +
      '<div class="ed-sheet-head"><h2 id="edSheetTitle">' + esc(title) + '</h2>' +
      '<button type="button" class="ed-x" data-sheet-close>' + icon('x') + 'Kapat</button></div>' +
      '<div class="ed-sheet-body">' + bodyHtml + '</div>' +
      (saveLabel ? '<div class="ed-sheet-foot"><button type="button" class="btn btn-light" data-sheet-close>Vazgeç</button>' +
        '<button type="button" class="btn" id="edSave">' + icon('check') + esc(saveLabel) + '</button></div>' : '') + '</div>';
    s.hidden = false;
    document.documentElement.classList.add('ed-lock');
    sheetDirty = false;
    var body = s.querySelector('.ed-sheet-body');
    body.addEventListener('input', function () { sheetDirty = true; });
    body.addEventListener('change', function () { sheetDirty = true; });
    if (onSave) $('edSave').onclick = onSave;
    s.querySelector('.ed-sheet-box').focus && setTimeout(function () { var h = $('edSheetTitle'); if (h) { h.tabIndex = -1; h.focus(); } }, 30);
    return body;
  }
  function closeSheet(force) {
    var s = $('edSheet');
    if (s.hidden) return Promise.resolve(true);
    var go = (!force && sheetDirty) ? dialog('Kaydetmeden kapatılsın mı?', 'Yazdıklarınız kaybolacak.', 'Evet, kapat', { danger: true }) : Promise.resolve(true);
    return go.then(function (ok) {
      if (!ok) return false;
      s.hidden = true; s.innerHTML = ''; sheetDirty = false;
      document.documentElement.classList.remove('ed-lock');
      if (sheetLast && sheetLast.focus && document.body.contains(sheetLast)) { try { sheetLast.focus(); } catch (e) { /* yok say */ } }
      return true;
    });
  }

  /* ---------------- fotoğraf ---------------- */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        // WhatsApp, paylaşım önizlemesinde ~300 KB'tan büyük fotoğrafı göstermiyor: 250 KB altına inene kadar küçült
        var LIMIT = 250 * 1024, w = im.naturalWidth, h = im.naturalHeight, dataUrl = '';
        var steps = [[1600, 0.82], [1400, 0.78], [1280, 0.74], [1100, 0.7], [960, 0.66], [800, 0.62]];
        for (var i = 0; i < steps.length; i++) {
          var k = Math.min(1, steps[i][0] / Math.max(w, h)), cv = document.createElement('canvas');
          cv.width = Math.round(w * k); cv.height = Math.round(h * k);
          var ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(im, 0, 0, cv.width, cv.height);
          dataUrl = cv.toDataURL('image/jpeg', steps[i][1]);
          if ((dataUrl.length - 23) * 3 / 4 <= LIMIT) break;
        }
        URL.revokeObjectURL(url);
        resolve({ preview: dataUrl, b64: dataUrl.split(',')[1] });
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject({ status: 'photo' }); };
      im.src = url;
    });
  }
  var upSeq = 0;
  function uploadPhoto(r) {
    var t = new Date();
    var name = 'images/yuklenen/' + t.getFullYear() + '-' + C.pad(t.getMonth() + 1) + '-' + C.pad(t.getDate()) + '-' +
      C.pad(t.getHours()) + C.pad(t.getMinutes()) + C.pad(t.getSeconds()) + '-' + (++upSeq) + Math.random().toString(36).slice(2, 6) + '.jpg';
    return putFile(name, r.b64, null, 'Panel: fotoğraf yüklendi').then(function () { fresh[name] = r.preview; return name; });
  }

  /* ---------------- form parçaları ---------------- */
  var form = null;   // { photo: { path, b64, preview } }

  function fieldHtml(f, val) {
    var id = 'ef-' + f.name, h = '';
    var req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
    h += '<div class="ed-field" data-field="' + f.name + '">';
    if (f.type === 'choice') {
      h += '<span class="ed-label" id="' + id + '-l">' + esc(f.label) + req + '</span><div class="ed-choices" role="radiogroup" aria-labelledby="' + id + '-l">' +
        f.opts.map(function (o) {
          return '<label class="ed-choice"><input type="radio" name="' + f.name + '" value="' + esc(o) + '"' + (o === val ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
        }).join('') + '</div>';
    } else if (f.type === 'photo') {
      h += '<span class="ed-label">' + esc(f.label) + '</span>' + (f.help ? '<span class="ed-help">' + esc(f.help) + '</span>' : '') +
        '<div class="ed-photo" id="' + id + '">' + photoInner() + '</div>';
    } else {
      h += '<label class="ed-label" for="' + id + '">' + esc(f.label) + req + '</label>' + (f.help ? '<span class="ed-help">' + esc(f.help) + '</span>' : '');
      var ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';
      if (f.type === 'textarea') h += '<textarea id="' + id + '" name="' + f.name + '"' + ph + (f.tall ? ' class="tall"' : '') + '>' + esc(val) + '</textarea>';
      else h += '<input id="' + id + '" name="' + f.name + '" type="' + (f.type === 'date' ? 'date' : f.type) + '"' + ph +
        (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') + ' value="' + esc(val) + '" autocomplete="off">';
    }
    h += '<span class="ed-err" hidden></span></div>';
    return h;
  }
  function photoInner() {
    var p = form.photo, src = p.preview || (p.path ? img(p.path) : '');
    return (src ? '<img src="' + esc(src) + '" alt="Seçilen fotoğraf">' : '') +
      '<div class="ed-row">' +
      '<label class="btn ed-pick">' + icon('camera') + (src ? 'Fotoğrafı Değiştir' : 'Fotoğraf Seç') +
      '<input type="file" accept="image/*" data-photo-input aria-label="Fotoğraf seç"></label>' +
      (src ? '<button type="button" class="btn btn-light ed-redline" data-photo-clear>' + icon('trash') + 'Kaldır</button>' : '') + '</div>';
  }
  function redrawPhoto(root) { var b = root.querySelector('.ed-photo'); if (b) b.innerHTML = photoInner(); }
  var VEFAT_FOTO = 'images/vefat.jpg';
  function applyVefatPhoto(root, tur) {
    var p = form.photo;
    if (tur === 'Vefat' && !p.path && !p.b64) form.photo = { path: VEFAT_FOTO, b64: '', preview: '' };
    else if (tur !== 'Vefat' && p.path === VEFAT_FOTO && !p.b64) form.photo = { path: '', b64: '', preview: '' };
    else return;
    redrawPhoto(root);
  }
  function applyExamples(root, tur) {
    applyVefatPhoto(root, tur);
    var ex = ORNEK[tur]; if (!ex) return;
    var b = root.querySelector('#ef-baslik'), m = root.querySelector('#ef-metin');
    if (b) b.placeholder = ex[0];
    if (m) m.placeholder = ex[1];
    var det = root.querySelector('details.ed-extra');
    if (det && (tur === 'Haber' || tur === 'Tarihten')) det.open = true;
  }
  function bindForm(root, col) {
    function clearErr(t) {
      var box = t.closest && t.closest('.ed-field');
      if (!box || !box.classList.contains('bad')) return;
      box.classList.remove('bad');
      var er = box.querySelector('.ed-err'); if (er) er.hidden = true;
    }
    root.addEventListener('input', function (e) { clearErr(e.target); });
    root.addEventListener('change', function (e) {
      var t = e.target;
      clearErr(t);
      if (t.name === 'tur' && col === 'duyurular') applyExamples(root, t.value);
      if (t.matches('[data-photo-input]') && t.files && t.files[0]) {
        busy('Fotoğraf hazırlanıyor…');
        shrink(t.files[0]).then(function (r) {
          form.photo.preview = r.preview; form.photo.b64 = r.b64;
          busy(false); redrawPhoto(root);
        }).catch(function (er) { busy(false); dialog('Fotoğraf açılamadı', errText(er), 'Tamam', { single: true }); });
      }
    });
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-photo-clear]')) { form.photo = { path: '', b64: '', preview: '' }; sheetDirty = true; redrawPhoto(root); }
    });
  }
  function readForm(root, fields) {
    var out = {}, bad = null;
    fields.forEach(function (f) {
      var box = root.querySelector('[data-field="' + f.name + '"]');
      var err = box && box.querySelector('.ed-err');
      var v = '';
      if (f.type === 'choice') { var c = root.querySelector('input[name="' + f.name + '"]:checked'); v = c ? c.value : ''; }
      else if (f.type === 'photo') v = form.photo.path || '';
      else { var x = root.querySelector('[name="' + f.name + '"]'); v = x ? x.value.trim() : ''; }
      if (f.type === 'date') v = C.normIso(v);
      if (f.type === 'url' && v && !C.linkUrl(v)) v = 'https://' + v.replace(/^\/+/, '');
      var msg = '';
      if (f.required && !v && !(f.type === 'photo' && form.photo.b64)) msg = f.type === 'choice' ? 'Lütfen birini seçin.' : 'Bu alanı doldurun.';
      if (box) box.classList.toggle('bad', !!msg);
      if (err) { err.textContent = msg; err.hidden = !msg; }
      if (msg && !bad) bad = box;
      out[f.name] = v;
    });
    if (bad) {
      var det = bad.closest('details'); if (det) det.open = true;
      bad.scrollIntoView({ block: 'center' });
      var inp = bad.querySelector('input,textarea'); if (inp) inp.focus();
      return null;
    }
    return out;
  }
  function clean(v) {
    var o = {};
    Object.keys(v).forEach(function (k) { if (v[k] !== '' && v[k] != null) o[k] = v[k]; });
    return o;
  }

  /* ---------------- ekle / düzenle / sil ---------------- */
  function curPage() { return (location.hash.indexOf('#/') === 0 ? location.hash.slice(2) : '').split('/')[0]; }

  function openForm(col, ix) {
    var c = COLS[col], d = site.data(), item = ix == null ? null : d[col][ix];
    if (ix != null && !item) return;
    var isNew = !item, orig = item ? JSON.stringify(item) : null;
    item = item || {};
    form = { photo: { path: item.foto || '', b64: '', preview: '' } };
    var val = function (f) { var v = item[f.name]; if (v == null || v === '') v = isNew ? (f.def === 'today' ? C.todayIso() : (f.def || '')) : ''; return f.type === 'date' ? C.normIso(v) : v; };
    var mainF = c.fields.filter(function (f) { return !f.extra; }), extraF = c.fields.filter(function (f) { return f.extra; });
    var root = openSheet(isNew ? c.addLabel : c.edit,
      mainF.map(function (f) { return fieldHtml(f, val(f)); }).join('') +
      (extraF.length ? '<details class="ed-extra"' + ((item.kaynak || item.link || item.olay_tarihi) ? ' open' : '') + '><summary>Başka bir siteden haber ya da tarihten bir yazı mı? (isteğe bağlı)</summary>' +
        extraF.map(function (f) { return fieldHtml(f, val(f)); }).join('') + '</details>' : ''),
      isNew ? 'Yayınla' : 'Kaydet', function () {
        var v = readForm(root, c.fields);
        if (!v) return;
        if (c.autoDate) v.tarih = isNew ? C.todayIso() : (item.tarih || C.todayIso());
        saveItem(col, v, orig);
      });
    bindForm(root, col);
    if (col === 'duyurular') applyExamples(root, val(c.fields[0]));
  }

  /* Paylaşım sayfalarını (p/…html ve kısa bağlantı d/…html) yazar; yazılamazsa kayıt yine yayınlanır. */
  function writeSharePage(col, item) {
    var key = C.SHARE_COLS[col], base = location.href.split(/[?#]/)[0].replace(/yonetim\/[^\/]*$/, '');
    if (!key) return Promise.resolve();
    function put(pg) {
      if (!pg) return Promise.resolve();
      return api('GET', '/contents/' + pg.path + '?ref=' + BRANCH).then(function (r) { return r.sha; }, function () { return null; })
        .then(function (sha) { return putFile(pg.path, textToB64(pg.html), sha, 'Panel: paylaşım sayfası – ' + (item.baslik || item.ad || '')); })
        .catch(function () { /* önemli değil */ });
    }
    return put(C.sharePage(key, item, base)).then(function () { return put(C.shortPage(key, item, base)); });
  }

  function saveItem(col, v, orig) {
    var c = COLS[col], saved, at = 0;
    var step = form.photo.b64 ? (busy('Fotoğraf yükleniyor…'), uploadPhoto(form.photo)) : Promise.resolve(form.photo.path);
    step.then(function (path) {
      v.foto = path || '';
      busy(orig ? 'Kaydediliyor…' : 'Yayınlanıyor…');
      return updateJson(c.file, function (data) {
        var list = C.arr(data), item = clean(v);
        // formda alanı olmayan bilgiler (ek fotoğraflar vb.) düzenlemede kaybolmasın
        if (orig) {
          var eski = JSON.parse(orig);
          Object.keys(eski).forEach(function (k) {
            if (!(k in item) && !c.fields.some(function (f) { return f.name === k; })) item[k] = eski[k];
          });
        }
        saved = item;
        if (orig) {
          at = list.findIndex(function (x) { return JSON.stringify(x) === orig; });
          if (at < 0) throw { status: 'gone' };
          list[at] = item;
        } else list.unshift(item);
        return list;
      }, 'Panel: ' + c.one + (orig ? ' düzenlendi – ' : ' eklendi – ') + (v.baslik || v.ad || ''));
    }).then(function (list) {
      site.set(col, list);
      return writeSharePage(col, saved);
    }).then(function () {
      busy(false);
      closeSheet(true);
      // ayrıntı sayfasındaysak (başlık ya da tarih değişince adresi de değişir) yeni adrese geç
      var page = curPage();
      if (page === c.page) {
        var id = col === 'duyurular' ? site.pid(saved) : col === 'etkinlikler' ? site.eid(saved) : site.iid(saved);
        var to = '#/' + c.page + '/' + encodeURIComponent(id);
        if (location.hash !== to) location.hash = to; else rerender();
      } else rerender();
      flash(col, at);
      toast(orig ? 'Değişiklik kaydedildi' : 'Yayınlandı', 'Herkes 1-2 dakika içinde görecek.');
    }).catch(function (e) {
      busy(false);
      fail('Kaydedilemedi', e).then(function (r) { if (r === 'gone') { closeSheet(true); refresh(col); } });
    });
  }

  function removeItem(col, ix) {
    var c = COLS[col], item = site.data()[col][ix];
    if (!item) return;
    var orig = JSON.stringify(item), title = item.baslik || item.ad || '';
    dialog('Silinsin mi?', '"' + title + '" siteden kaldırılacak.', 'Evet, sil', { danger: true }).then(function (ok) {
      if (!ok) return;
      busy('Siliniyor…');
      updateJson(c.file, function (data) {
        var list = C.arr(data), k = list.findIndex(function (x) { return JSON.stringify(x) === orig; });
        if (k < 0) throw { status: 'gone' };
        list.splice(k, 1);
        return list;
      }, 'Panel: ' + c.one + ' silindi – ' + title).then(function (list) {
        busy(false);
        site.set(col, list);
        if (curPage() === c.page) location.hash = '#/' + c.list; else rerender();
        toast('Silindi', 'Siteden 1-2 dakika içinde kalkar.');
      }).catch(function (e) { busy(false); fail('Silinemedi', e).then(function (r) { if (r === 'gone') refresh(col); }); });
    });
  }

  /* ---------------- fotoğraflar ---------------- */
  function openGalleryAdd() {
    var picked = [];
    var root = openSheet('Fotoğraf Ekle',
      '<div class="ed-field"><span class="ed-label">Fotoğraflar</span><span class="ed-help">Birden fazla fotoğraf seçebilirsiniz.</span>' +
      '<div class="ed-photo"><div class="ed-previews" id="edPrev"></div>' +
      '<label class="btn ed-pick ed-wide">' + icon('camera') + '<span id="edPickTxt">Fotoğraf Seç</span>' +
      '<input type="file" accept="image/*" multiple id="edFiles" aria-label="Fotoğraf seç"></label></div><span class="ed-err" hidden></span></div>' +
      '<div class="ed-field"><label class="ed-label" for="edCap">Fotoğraflarda ne var?</label><span class="ed-help">İsteğe bağlı. Örnek: 2026 bayramlaşması</span>' +
      '<input id="edCap" type="text" autocomplete="off"></div>',
      'Yükle', function () {
        var err = root.querySelector('.ed-err');
        if (!picked.length) { err.textContent = 'Önce fotoğraf seçin.'; err.hidden = false; return; }
        var cap = $('edCap').value.trim(), paths = [];
        picked.reduce(function (p, r, i) {
          return p.then(function () {
            busy('Fotoğraf yükleniyor… (' + (i + 1) + ' / ' + picked.length + ')');
            return uploadPhoto(r).then(function (path) { paths.push(path); });
          });
        }, Promise.resolve()).then(function () {
          busy('Kaydediliyor…');
          return updateJson('data/galeri.json', function (data) {
            return paths.map(function (pth) { return cap ? { foto: pth, aciklama: cap } : { foto: pth }; }).concat(C.arr(data));
          }, 'Panel: galeriye ' + paths.length + ' fotoğraf eklendi');
        }).then(function (list) {
          busy(false); site.set('galeri', list); closeSheet(true); rerender();
          toast(paths.length + ' fotoğraf eklendi', 'Herkes 1-2 dakika içinde görecek.');
        }).catch(function (e) { busy(false); fail('Yüklenemedi', e); });
      });
    $('edFiles').onchange = function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (!files.length) return;
      busy('Fotoğraflar hazırlanıyor…');
      files.reduce(function (p, file) {
        return p.then(function () { return shrink(file).then(function (r) { picked.push(r); }).catch(function () { /* açılmayanı atla */ }); });
      }, Promise.resolve()).then(function () {
        busy(false); sheetDirty = true;
        $('edPrev').innerHTML = picked.map(function (r) { return '<img src="' + r.preview + '" alt="">'; }).join('');
        $('edPickTxt').textContent = picked.length ? 'Daha Fazla Seç (' + picked.length + ' seçildi)' : 'Fotoğraf Seç';
        root.querySelector('.ed-err').hidden = true;
        e.target.value = '';
      });
    };
  }
  function removePhoto(gi) {
    var x = site.data().galeri[gi];
    if (!x) return;
    var orig = JSON.stringify(x);
    dialog('Fotoğraf silinsin mi?', 'Bu fotoğraf sitedeki fotoğraflardan kaldırılacak.', 'Evet, sil', { danger: true }).then(function (ok) {
      if (!ok) return;
      busy('Siliniyor…');
      updateJson('data/galeri.json', function (data) {
        var list = C.arr(data), k = list.findIndex(function (y) { return JSON.stringify(y) === orig; });
        if (k < 0) throw { status: 'gone' };
        list.splice(k, 1); return list;
      }, 'Panel: galeriden fotoğraf silindi').then(function (list) {
        busy(false); site.set('galeri', list); rerender(); toast('Fotoğraf silindi');
      }).catch(function (e) { busy(false); fail('Silinemedi', e).then(function (r) { if (r === 'gone') refresh('galeri'); }); });
    });
  }

  /* ---------------- dernek bilgileri ---------------- */
  function openDernek(g) {
    var grp = DERNEK[g]; if (!grp) return;
    var d = site.data().dernek || {};
    form = { photo: { path: '', b64: '', preview: '' } };
    var root = openSheet(grp.title, '<p class="ed-intro">' + esc(grp.help) + '</p>' +
      grp.fields.map(function (f) { return fieldHtml(f, d[f.name] || ''); }).join(''), 'Kaydet', function () {
        var v = readForm(root, grp.fields);
        if (!v) return;
        if (v.canli_yayin && !C.ytEmbed(v.canli_yayin)) {
          var box = root.querySelector('[data-field="canli_yayin"]'), er = box.querySelector('.ed-err');
          box.classList.add('bad'); er.textContent = 'Bu bir YouTube video ya da canlı yayın adresi değil gibi görünüyor.'; er.hidden = false;
          box.scrollIntoView({ block: 'center' }); return;
        }
        busy('Kaydediliyor…');
        updateJson('data/dernek.json', function (data) {
          var o = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
          grp.fields.forEach(function (f) { o[f.name] = v[f.name]; });
          return o;
        }, 'Panel: ' + grp.title.toLocaleLowerCase('tr') + ' güncellendi').then(function (o) {
          busy(false); site.set('dernek', o); closeSheet(true); rerender();
          toast('Bilgiler kaydedildi', 'Herkes 1-2 dakika içinde görecek.');
        }).catch(function (e) { busy(false); fail('Kaydedilemedi', e); });
      });
    bindForm(root, 'dernek');
  }

  /* ---------------- "Ekle" seçimi (alttaki çubuk) ---------------- */
  function openChooser() {
    var opts = [['duyurular', 'news', 'Duyuru', 'Vefat, düğün, toplantı, haber'], ['etkinlikler', 'cal', 'Etkinlik', 'Takvime düğün, nişan, mevlit'],
      ['galeri', 'photo', 'Fotoğraf', 'Fotoğraflar bölümüne'], ['pazar', 'bag', 'Market ilanı', 'Satılık, aranıyor, yardım']];
    var root = openSheet('Ne eklemek istersiniz?', '<div class="ed-choose">' + opts.map(function (o) {
      return '<button type="button" data-pick="' + o[0] + '">' + icon(o[1]) + '<b>' + o[2] + '</b><small>' + o[3] + '</small></button>';
    }).join('') + '</div>', '', null);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick]'); if (!b) return;
      var col = b.getAttribute('data-pick');
      closeSheet(true).then(function () { if (col === 'galeri') openGalleryAdd(); else openForm(col, null); });
    });
  }

  /* ---------------- giriş ekranı ---------------- */
  function showLogin(msg) {
    document.documentElement.classList.add('ed-out');
    var s = $('edLogin');
    s.hidden = false;
    s.innerHTML = '<div class="ed-login-box"><img src="../images/logo-160.png" alt="" width="84" height="84">' +
      '<h1>Yönetici Girişi</h1>' +
      (msg ? '<p class="ed-login-msg">' + icon('warn') + '<span>' + esc(msg) + '</span></p>' : '') +
      '<p class="muted">Lütfen giriş kodunu girin.</p>' +
      '<div class="ed-login-form"><div class="ed-field"><label class="ed-label" for="edKey">Giriş kodu</label>' +
      '<input id="edKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="ed-err" hidden></span></div>' +
      '<button type="button" class="btn btn-wide" id="edKeyOk">Giriş Yap</button></div>' +
      '<p class="small" style="margin-top:22px"><a href="../">‹ Siteye dön</a></p></div>';
    var inp = $('edKey'), err = s.querySelector('.ed-err');
    $('edKeyOk').onclick = function () {
      var k = cleanKey(inp.value).replace(/^.*[?&]k=/, '').replace(/[&#].*$/, '');   // bağlantının tamamı yapıştırılırsa da olur
      try { k = decodeURIComponent(k); } catch (e) { /* olduğu gibi */ }
      if (!k) { err.textContent = 'Lütfen giriş kodunu girin.'; err.hidden = false; inp.focus(); return; }
      busy('Kontrol ediliyor…');
      checkKey(k).then(function () {
        storeKey(k); keyInUrl(k);
        location.reload();
      }).catch(function (e) {
        busy(false);
        err.textContent = keyErr(e, k);
        err.hidden = false;
      });
    };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') $('edKeyOk').click(); });
  }
  // Giriş olmadıysa sebebi açıkça yazılır (Serhat'a iletilebilsin diye hata kodu da)
  function keyErr(e, k) {
    var s = e && e.status;
    if (s === 'net') return errText(e);
    if (k && !/^(github_pat_|ghp_)/.test(k)) return 'Bu geçerli bir giriş kodu değil gibi görünüyor. Kodun tamamını girdiğinizden emin olun.';
    if (s === 401) return 'Giriş kodu tanınmadı: eksik girilmiş, silinmiş ya da süresi dolmuş olabilir. (Hata 401)';
    if (s === 403 || s === 404) return 'Anahtar geçerli ama siteyi değiştirme izni yok. GitHub\'da anahtarda "Only select repositories → cesnigir-der" ve "Contents: Read and write" seçili olmalı. (Hata ' + s + ')';
    return 'Bu giriş kodu çalışmadı. (Hata ' + s + ')';
  }
  function checkKey(k) {
    return api('GET', '', null, k).then(function (r) {
      if (r && r.permissions && r.permissions.push === false) throw { status: 403 };
      return r;
    });
  }

  /* ---------------- iskelet ---------------- */
  function chrome() {
    document.body.insertAdjacentHTML('afterbegin',
      '<div class="ed-ribbon"><div class="container ed-ribbon-in">' +
      '<span class="ed-mode">' + icon('edit') + '<b>Düzenleme modu' + (who() ? ' · ' + esc(who()) : '') + '</b><span class="ed-hint">Değiştirmek istediğiniz şeyin yanındaki düğmeye dokunun.</span></span>' +
      '<span class="ed-ribbon-btns"><a href="#/" id="edPendPill" class="ed-pill" hidden><span class="ed-long">Onay bekleyen:</span><span class="ed-short">Onay</span><b>0</b></a><a href="../" target="_blank" rel="noopener">' + icon('eye') + '<span class="ed-long">Ziyaretçi gibi gör</span><span class="ed-short">Siteyi gör</span></a>' +
      '<button type="button" id="edMenuBtn" aria-expanded="false">' + icon('key') + 'Giriş</button></span></div>' +
      '<div class="container ed-menu" id="edMenu" hidden>' +
      '<p class="small">Bu telefonda giriş açık. Bu sayfayı ana ekrana eklerseniz giriş kodu bir daha sorulmaz.</p>' +
      '<div class="ed-row"><button type="button" class="btn btn-light" id="edCopy">Giriş bağlantısını kopyala</button>' +
      '<button type="button" class="btn btn-light ed-redline" id="edLogout">' + icon('out') + 'Bu telefondan çıkış yap</button></div>' +
      '<p class="small muted" id="edCopyNote" hidden>Kopyalandı. Bu bağlantıyı yalnızca yönetici olacak kişiye gönderin: bağlantıya sahip olan herkes siteyi değiştirebilir.</p></div></div>');
    document.body.insertAdjacentHTML('beforeend',
      '<div class="ed-dock"><button type="button" class="btn ed-dock-add" id="edAdd">' + icon('plus') + 'Ekle</button></div>' +
      '<div id="edSheet" class="ed-sheet" hidden></div>' +
      '<div id="edLogin" class="ed-login" hidden></div>' +
      '<div id="edToast" class="ed-toast" role="status" aria-live="polite" hidden></div>' +
      '<div id="edBusy" class="ed-over" hidden><div class="ed-over-box"><div class="ed-spin" aria-hidden="true"></div><p id="edBusyText">Kaydediliyor…</p>' +
      '<p class="muted small">Lütfen bu sayfayı kapatmayın.</p></div></div>' +
      '<div id="edAsk" class="ed-over" role="alertdialog" aria-modal="true" aria-labelledby="edAskTitle" hidden><div class="ed-over-box">' +
      '<h2 id="edAskTitle"></h2><p id="edAskText" class="muted"></p><div class="ed-ask-btns">' +
      '<button type="button" id="edAskYes" class="btn btn-wide"></button><button type="button" id="edAskNo" class="btn btn-light btn-wide">Vazgeç</button></div></div></div>');

    $('edAdd').onclick = openChooser;
    $('edPendPill').onclick = function (e) {
      if (curPage() === '' && $('edMPend')) { e.preventDefault(); $('edMPend').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      mScroll = true;
    };
    $('edMenuBtn').onclick = function () {
      var m = $('edMenu'), open = m.hidden; m.hidden = !open; this.setAttribute('aria-expanded', String(open));
    };
    $('edCopy').onclick = function () {
      var link = loginLink(getKey()), note = $('edCopyNote');
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { note.hidden = false; })
        .catch(function () { window.prompt('Giriş bağlantısı:', link); });
    };
    $('edLogout').onclick = function () {
      dialog('Çıkış yapılsın mı?', 'Tekrar girmek için giriş bağlantısına ihtiyacınız olacak.', 'Evet, çıkış yap', { danger: true }).then(function (ok) {
        if (!ok) return;
        storeKey(''); keyInUrl('');
        location.reload();
      });
    };
    $('edSheet').addEventListener('click', function (e) {
      if (e.target.closest('[data-sheet-close]') || e.target === $('edSheet')) closeSheet();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('edSheet').hidden && $('edAsk').hidden && $('edBusy').hidden) { e.stopPropagation(); closeSheet(); }
    }, true);
    window.addEventListener('beforeunload', function (e) { if (sheetDirty && !$('edSheet').hidden) { e.preventDefault(); e.returnValue = ''; } });

    // sayfadaki düzenle / sil / ekle düğmeleri
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b || !site) return;
      e.preventDefault(); e.stopPropagation();
      var act = b.getAttribute('data-act'), col = b.getAttribute('data-col'), ix = +b.getAttribute('data-ix');
      if (act === 'edit') openForm(col, ix);
      else if (act === 'del') removeItem(col, ix);
      else if (act === 'add') { if (col === 'galeri') openGalleryAdd(); else openForm(col, null); }
      else if (act === 'gdel') removePhoto(+b.getAttribute('data-gi'));
      else if (act === 'dernek') openDernek(b.getAttribute('data-g'));
    }, true);
  }

  /* ---------------- başlangıç ---------------- */
  var E = window.CD_EDIT = {
    keep: false, img: img, load: load, after: after,
    ready: function (s) {
      site = s;
      if (!getKey()) { showLogin(''); return; }
      if (authBad) { showLogin('Giriş kodunun süresi dolmuş ya da kod silinmiş. Lütfen yeni giriş kodunu girin.'); return; }
      // anahtar geçerli: belleğe de yaz; adres çubuğunda yoksa ekle (ana ekrana eklenen sayfa anahtarı taşısın)
      storeKey(getKey());
      if (!urlKey()) keyInUrl(getKey());
      mPendLoad(true).catch(function () { /* menüde sayı görünmez, o kadar */ });
    }
  };
  chrome();
  if (!getKey()) document.documentElement.classList.add('ed-out');
  else checkKey(getKey()).catch(function (e) {
    if (e && e.status !== 'net') showLogin(keyErr(e, getKey()));
  });
})();
