/* Çeşnigir-Der · yönetim paneli
   Değişiklikler doğrudan GitHub'daki site dosyalarına kaydedilir.
   Bu telefona bir kez girilen "anahtar" (GitHub erişim anahtarı) ile çalışır. */
(function () {
  'use strict';
  var C = window.CD, esc = C.esc;
  var REPO = 'sguven/cesnigir-der', BRANCH = 'main';
  var API = 'https://api.github.com/repos/' + REPO;
  var RAW = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';
  var KEY = 'cesnigir_yonetim_anahtar';
  var app = document.getElementById('app');

  /* ---------------- bölümler ---------------- */
  var ORNEK = {
    'Vefat': ['Örnek: Köyümüzden Ahmet Yılmaz vefat etmiştir', 'Örnek: Cenazesi yarın öğle namazına müteakip köy camiinden kaldırılacaktır. Merhuma Allah\'tan rahmet, ailesine başsağlığı dileriz.'],
    'Düğün': ['Örnek: Ali ile Ayşe evleniyor', 'Örnek: Düğünümüz 12 Temmuz Cumartesi günü köy meydanında yapılacaktır. Tüm köylülerimiz davetlidir.'],
    'Nişan': ['Örnek: Mehmet ile Zeynep nişanlanıyor', 'Nişanın yeri, günü ve saati…'],
    'Mevlit': ['Örnek: Merhum Hasan Kaya için mevlit', 'Örnek: Cuma günü ikindi namazından sonra köy camiinde okunacaktır.'],
    'Toplantı': ['Örnek: Dernek genel kurul toplantısı', 'Toplantının yeri, saati ve konuşulacak konular…'],
    'Duyuru': ['Örnek: Köy yolu bakım çalışması', 'Duyurunun ayrıntıları…'],
    'Haber': ['Haberin başlığı', 'Haberin kısa özeti…']
  };

  var COLS = {
    duyurular: {
      file: 'data/duyurular.json', title: 'Duyurular ve İlanlar', one: 'duyuru', icon: 'news',
      addLabel: 'Yeni Duyuru Ekle', help: 'Vefat, düğün, toplantı ve diğer duyurular. Sitede en yenisi en üstte görünür.',
      fields: [
        { name: 'tur', label: 'Ne duyuruyorsunuz?', type: 'choice', opts: C.DUYURU_TURLERI, required: true, def: 'Duyuru' },
        { name: 'tarih', label: 'Tarih', type: 'date', required: true, def: 'today' },
        { name: 'baslik', label: 'Başlık', type: 'text', required: true },
        { name: 'metin', label: 'Açıklama', type: 'textarea' },
        { name: 'foto', label: 'Fotoğraf', type: 'photo', help: 'İsterseniz bir fotoğraf ekleyin.' },
        { name: 'kaynak', label: 'Haberin kaynağı', type: 'text', extra: true, placeholder: 'Örnek: Kırıkkale Haber' },
        { name: 'link', label: 'Haberin internet adresi', type: 'url', extra: true, placeholder: 'https://…' }
      ],
      sort: 'desc', thumb: true
    },
    etkinlikler: {
      file: 'data/etkinlikler.json', title: 'Takvim', one: 'etkinlik', icon: 'cal',
      addLabel: 'Yeni Etkinlik Ekle', help: 'Düğün, nişan, mevlit ve toplantılar. Sitede "Yaklaşan Günler" bölümünde görünür; WhatsApp\'ta paylaşılabilir.',
      fields: [
        { name: 'tur', label: 'Ne olacak?', type: 'choice', opts: C.ETKINLIK_TURLERI, required: true, def: 'Düğün' },
        { name: 'tarih', label: 'Hangi gün?', type: 'date', required: true, def: 'today' },
        { name: 'ad', label: 'Kimin / neyin?', type: 'text', required: true, placeholder: 'Örnek: Ali ile Ayşe\'nin düğünü' },
        { name: 'saat', label: 'Saat', type: 'text', placeholder: 'Örnek: 14:00 veya ikindiden sonra' },
        { name: 'yer', label: 'Yer', type: 'text', placeholder: 'Örnek: Köy meydanı' },
        { name: 'foto', label: 'Fotoğraf', type: 'photo', help: 'İsterseniz bir fotoğraf ekleyin (davetiye, afiş ya da bir resim).' }
      ],
      sort: 'asc', thumb: true
    },
    pazar: {
      file: 'data/pazar.json', title: 'Market ve Yardımlaşma', one: 'ilan', icon: 'bag',
      addLabel: 'Yeni Market İlanı Ekle', help: 'Satılık ürünler, aranan şeyler ve yardım istekleri.',
      fields: [
        { name: 'tur', label: 'İlan türü', type: 'choice', opts: C.PAZAR_TURLERI, required: true, def: 'Satılık' },
        { name: 'baslik', label: 'Ne satılıyor / aranıyor?', type: 'text', required: true, placeholder: 'Örnek: Köy yumurtası' },
        { name: 'fiyat', label: 'Fiyat (TL)', type: 'text', inputmode: 'numeric', placeholder: 'Örnek: 150', help: 'Fiyat yoksa boş bırakın.' },
        { name: 'aciklama', label: 'Açıklama', type: 'textarea' },
        { name: 'kisi', label: 'İlan sahibi', type: 'text', placeholder: 'Örnek: Ahmet Yılmaz' },
        { name: 'telefon', label: 'Telefon', type: 'tel', placeholder: '0555 123 45 67', help: 'Sitede "Ara" ve "WhatsApp" düğmesi olarak görünür.' },
        { name: 'foto', label: 'Fotoğraf', type: 'photo' }
      ],
      sort: 'desc', thumb: true, autoDate: true
    }
  };

  var DERNEK_FIELDS = [
    { name: 'hakkimizda', label: 'Hakkımızda yazısı', type: 'textarea', help: 'Paragrafları boş bir satırla ayırın.' },
    { name: 'baskan', label: 'Dernek başkanı', type: 'text', placeholder: 'Ad Soyad' },
    { name: 'telefon', label: 'Başkanın telefonu', type: 'tel', placeholder: '0555 123 45 67', help: 'Sitede ismin yanında görünür. "Derneği Ara" düğmesi de bu numarayı arar.' },
    { name: 'baskan2', label: 'Başkan yardımcısı', type: 'text', placeholder: 'Ad Soyad', help: 'Sitede başkanın altında görünür. Yoksa boş bırakın.' },
    { name: 'telefon2', label: 'Başkan yardımcısının telefonu', type: 'tel', placeholder: '0555 123 45 67' },
    { name: 'whatsapp', label: 'WhatsApp numarası', type: 'tel', help: 'Telefonla aynıysa boş bırakın.' },
    { name: 'eposta', label: 'E-posta', type: 'email' },
    { name: 'adres', label: 'Adres', type: 'text' },
    { name: 'yonetim_kurulu', label: 'Yönetim kurulu', type: 'textarea', placeholder: 'Ahmet Yılmaz - Başkan\nMehmet Demir - Sayman\nAli Kaya', group: 'Kurullar',
      groupHelp: 'Her satıra bir isim yazın. Görevi varsa isimden sonra tire koyup yazın (Ahmet Yılmaz - Sayman). Sitede "Hakkımızda" sayfasında görünür. Boş bırakırsanız görünmez.' },
    { name: 'denetim_kurulu', label: 'Denetim kurulu', type: 'textarea', placeholder: 'Hasan Çelik\nVeli Şahin\nOsman Kurt' },
    { name: 'canli_yayin', label: 'YouTube canlı yayın adresi', type: 'url', placeholder: 'https://www.youtube.com/live/…', group: 'Canlı Yayın',
      groupHelp: 'YouTube\'daki canlı yayının adresini yapıştırın. Sitenin ana sayfasında "Köyden Canlı Görüntü" olarak oynar. Boş bırakırsanız görünmez.' },
    { name: 'kasa_donem', label: 'Kasa durumu: hangi ay?', type: 'text', placeholder: 'Örnek: Kasım 2026', group: 'Kasa Durumu', groupHelp: 'Doldurursanız sitede "Kasa Durumu" kutusu çıkar. Boş bırakırsanız görünmez.' },
    { name: 'gelir', label: 'Bu ayki gelir (TL)', type: 'text', inputmode: 'numeric' },
    { name: 'gider', label: 'Bu ayki gider (TL)', type: 'text', inputmode: 'numeric' },
    { name: 'kasa', label: 'Kasadaki para (TL)', type: 'text', inputmode: 'numeric' }
  ];

  /* ---------------- küçük yardımcılar ---------------- */
  function icon(n) { return '<svg aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function thumbSrc(p) { return C.imgSrc(p, /^https?:/i.test(p || '') ? '' : RAW); }

  function getKey() { try { return localStorage.getItem(KEY) || memKey; } catch (e) { return memKey; } }
  var memKey = '';
  function setKey(k) { memKey = k; try { if (k) localStorage.setItem(KEY, k); else localStorage.removeItem(KEY); } catch (e) { /* bellekte kalır */ } }

  var dirty = false;
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------------- pencereler ---------------- */
  function busy(text) {
    var b = document.getElementById('busy');
    if (text === false) { b.hidden = true; return; }
    document.getElementById('busyText').textContent = text;
    b.hidden = false;
  }

  function dialog(title, text, yes, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var d = document.getElementById('ask'), y = document.getElementById('askYes'), n = document.getElementById('askNo');
      document.getElementById('askTitle').textContent = title;
      document.getElementById('askText').textContent = text || '';
      y.textContent = yes;
      y.className = 'btn btn-wide ' + (opts.danger ? 'btn-red' : 'btn-blue');
      n.hidden = !!opts.single;
      d.hidden = false;
      var last = document.activeElement;
      y.focus();
      function done(v) {
        d.hidden = true; y.onclick = n.onclick = null; document.removeEventListener('keydown', key);
        if (last && last.focus) { try { last.focus(); } catch (e) { /* yok say */ } }
        resolve(v);
      }
      function key(e) {
        if (e.key === 'Escape') done(false);
        if (e.key === 'Tab' && !opts.single) { e.preventDefault(); (document.activeElement === y ? n : y).focus(); }
      }
      y.onclick = function () { done(true); };
      n.onclick = function () { done(false); };
      document.addEventListener('keydown', key);
    });
  }

  function errText(e) {
    var s = e && e.status;
    if (s === 401) return 'Giriş anahtarı geçersiz ya da süresi dolmuş. Serhat\'tan yeni bir anahtar isteyin.';
    if (s === 403 || s === 404) return 'Bu anahtarın siteyi değiştirme izni yok. Serhat\'a haber verin.';
    if (s === 409 || s === 422) return 'Aynı anda başka bir değişiklik yapıldı. Lütfen tekrar deneyin.';
    if (s === 'net') return 'İnternet bağlantısı yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.';
    if (s === 'photo') return 'Bu fotoğraf açılamadı. Başka bir fotoğraf deneyin.';
    if (s === 'gone') return 'Bu kayıt başka bir yerden değiştirilmiş ya da silinmiş. Listeye dönüp tekrar deneyin.';
    return 'Bir sorun çıktı, kaydedilemedi. Biraz sonra tekrar deneyin.';
  }

  /* ---------------- GitHub ---------------- */
  function api(method, path, body) {
    return fetch(API + path, {
      method: method,
      cache: 'no-store',
      headers: {
        'Authorization': 'Bearer ' + getKey(),
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
    var body = { message: message, content: b64, branch: BRANCH };
    if (sha) body.sha = sha;
    return api('PUT', '/contents/' + path, body);
  }

  // Dosyayı taze okuyup değiştirir; çakışmada bir kez daha dener.
  function updateJson(file, change, message, tries) {
    tries = tries == null ? 2 : tries;
    return getJson(file).then(function (f) {
      var next = change(f.data);
      return putFile(file, textToB64(JSON.stringify(next, null, 2) + '\n'), f.sha, message);
    }).catch(function (e) {
      if ((e.status === 409 || e.status === 422) && tries > 0) return updateJson(file, change, message, tries - 1);
      throw e;
    });
  }

  /* ---------------- fotoğraf ---------------- */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        var dataUrl = cv.toDataURL('image/jpeg', 0.82);
        resolve({ preview: dataUrl, b64: dataUrl.split(',')[1] });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject({ status: 'photo' }); };
      img.src = url;
    });
  }

  var upSeq = 0;
  function uploadPhoto(b64) {
    var t = new Date();
    var name = 'images/yuklenen/' + t.getFullYear() + '-' + C.pad(t.getMonth() + 1) + '-' + C.pad(t.getDate()) + '-' +
      C.pad(t.getHours()) + C.pad(t.getMinutes()) + C.pad(t.getSeconds()) + '-' + (++upSeq) + Math.random().toString(36).slice(2, 6) + '.jpg';
    return putFile(name, b64, null, 'Panel: fotoğraf yüklendi').then(function () { return name; });
  }

  /* ---------------- form parçaları ---------------- */
  var form = null; // { fields, photo: {path, b64, preview}, multi: [] }

  function fieldHtml(f, val) {
    var id = 'f-' + f.name, h = '';
    var req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
    if (f.group) h += '<h2 style="font-size:22px;margin:30px 0 4px">' + esc(f.group) + '</h2><p class="muted small" style="margin:0 0 16px">' + esc(f.groupHelp || '') + '</p>';
    h += '<div class="field" data-field="' + f.name + '">';
    if (f.type === 'choice') {
      h += '<span class="label" id="' + id + '-l">' + esc(f.label) + req + '</span><div class="choices" role="radiogroup" aria-labelledby="' + id + '-l">' +
        f.opts.map(function (o) {
          return '<label class="choice"><input type="radio" name="' + f.name + '" value="' + esc(o) + '"' + (o === val ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
        }).join('') + '</div>';
    } else if (f.type === 'photo') {
      h += '<span class="label">' + esc(f.label) + '</span>' + (f.help ? '<span class="help">' + esc(f.help) + '</span>' : '') +
        '<div class="photo-box" id="' + id + '">' + photoInner() + '</div>';
    } else {
      h += '<label for="' + id + '">' + esc(f.label) + req + '</label>' + (f.help ? '<span class="help">' + esc(f.help) + '</span>' : '');
      var ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';
      if (f.type === 'textarea') h += '<textarea id="' + id + '" name="' + f.name + '"' + ph + '>' + esc(val) + '</textarea>';
      else h += '<input id="' + id + '" name="' + f.name + '" type="' + (f.type === 'date' ? 'date' : f.type) + '"' + ph +
        (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') + ' value="' + esc(val) + '" autocomplete="off">';
    }
    h += '<span class="err" hidden></span></div>';
    return h;
  }

  function photoInner() {
    var p = form.photo, src = p.preview || (p.path ? thumbSrc(p.path) : '');
    return (src ? '<img src="' + esc(src) + '" alt="Seçilen fotoğraf">' : '') +
      '<div class="btn-row">' +
      '<label class="btn btn-blue photo-pick">' + icon('camera') + (src ? 'Fotoğrafı Değiştir' : 'Fotoğraf Seç') +
      '<input type="file" accept="image/*" data-photo-input aria-label="Fotoğraf seç"></label>' +
      (src ? '<button type="button" class="btn btn-red" data-photo-clear>' + icon('trash') + 'Kaldır</button>' : '') + '</div>';
  }

  function bindForm(root) {
    function clearErr(t) {
      var box = t.closest && t.closest('.field');
      if (!box || !box.classList.contains('bad')) return;
      box.classList.remove('bad');
      var er = box.querySelector('.err'); if (er) er.hidden = true;
    }
    root.addEventListener('input', function (e) { dirty = true; clearErr(e.target); });
    root.addEventListener('change', function (e) {
      dirty = true;
      var t = e.target;
      clearErr(t);
      if (t.name === 'tur' && root.getAttribute('data-col') === 'duyurular') applyExamples(root, t.value);
      if (t.matches('[data-photo-input]') && t.files && t.files[0]) {
        busy('Fotoğraf hazırlanıyor…');
        shrink(t.files[0]).then(function (r) {
          form.photo.preview = r.preview; form.photo.b64 = r.b64;
          busy(false); redrawPhoto(root);
        }).catch(function (er) { busy(false); dialog('Fotoğraf açılamadı', errText(er), 'Tamam', { single: true }); });
      }
    });
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-photo-clear]')) {
        form.photo = { path: '', b64: '', preview: '' }; dirty = true; redrawPhoto(root);
      }
    });
  }
  function redrawPhoto(root) { var b = root.querySelector('.photo-box'); if (b) b.innerHTML = photoInner(); }

  function applyExamples(root, tur) {
    var ex = ORNEK[tur]; if (!ex) return;
    var b = root.querySelector('#f-baslik'), m = root.querySelector('#f-metin');
    if (b) b.placeholder = ex[0];
    if (m) m.placeholder = ex[1];
    var dt = root.querySelector('[data-field="kaynak"]');
    var det = dt && dt.closest('details');
    if (det && tur === 'Haber') det.open = true;
  }

  function readForm(root, fields) {
    var out = {}, bad = null;
    fields.forEach(function (f) {
      var box = root.querySelector('[data-field="' + f.name + '"]');
      var err = box && box.querySelector('.err');
      var v = '';
      if (f.type === 'choice') { var c = root.querySelector('input[name="' + f.name + '"]:checked'); v = c ? c.value : ''; }
      else if (f.type === 'photo') v = form.photo.path || '';
      else { var el = root.querySelector('[name="' + f.name + '"]'); v = el ? el.value.trim() : ''; }
      if (f.type === 'date') v = C.normIso(v);
      if (f.type === 'url' && v && !C.linkUrl(v)) v = 'https://' + v.replace(/^\/+/, '');
      var msg = '';
      if (f.required && !v && !(f.type === 'photo' && form.photo.b64)) msg = f.type === 'choice' ? 'Lütfen birini seçin.' : 'Bu alanı doldurun.';
      if (box) box.classList.toggle('bad', !!msg);
      if (err) { err.textContent = msg; err.hidden = !msg; }
      if (msg && !bad) bad = box;
      out[f.name] = v;
    });
    if (bad) { bad.scrollIntoView({ block: 'center' }); var inp = bad.querySelector('input,textarea'); if (inp) inp.focus(); return null; }
    return out;
  }

  /* ---------------- ekranlar ---------------- */
  function head(title, backTo) {
    return '<div class="screen-head">' + (backTo ? '<a class="back" href="' + backTo + '" data-back>' + icon('back') + 'Geri</a>' : '') +
      '<h1>' + esc(title) + '</h1></div>';
  }

  function failScreen(e, again) {
    app.innerHTML = '<div class="note bad">' + icon('warn') + '<div>' + esc(errText(e)) + '</div></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-blue" id="again">Tekrar Dene</button><a class="btn btn-gray" href="#/">Ana Ekran</a></div>' +
      (e && e.status === 401 ? '<p style="margin-top:16px"><button type="button" class="btn btn-wide" id="relogin">Yeni anahtar gir</button></p>' : '');
    document.getElementById('again').onclick = again;
    var rl = document.getElementById('relogin');
    if (rl) rl.onclick = function () { setKey(''); go('#/kurulum'); };
  }

  // Kurulum: anahtarı bu telefona kaydet
  function screenSetup() {
    app.innerHTML = '<div class="card form"><h1 style="font-size:26px;margin-bottom:8px">Yönetici Girişi</h1>' +
      '<p class="muted">Bu telefonu dernek yöneticisi olarak tanıtmak için Serhat\'ın verdiği giriş anahtarını aşağıya yapıştırın. Bunu yalnızca bir kez yapmanız yeterli.</p>' +
      '<div class="field"><label for="key">Giriş anahtarı</label><input id="key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…">' +
      '<span class="err" hidden></span></div>' +
      '<button type="button" class="btn btn-blue btn-wide" id="keyOk" style="min-height:62px;font-size:21px">Giriş Yap</button></div>';
    var inp = document.getElementById('key'), err = app.querySelector('.err');
    document.getElementById('keyOk').onclick = function () {
      var k = inp.value.trim();
      if (!k) { err.textContent = 'Anahtarı yapıştırın.'; err.hidden = false; inp.focus(); return; }
      setKey(k); busy('Kontrol ediliyor…');
      api('GET', '').then(function (r) {
        busy(false);
        if (r && r.permissions && r.permissions.push === false) throw { status: 403 };
        go('#/');
      }).catch(function (e) {
        busy(false); setKey('');
        err.textContent = e.status === 'net' ? errText(e) : 'Bu anahtar çalışmadı. Doğru kopyaladığınızdan emin olun.';
        err.hidden = false;
      });
    };
  }

  // Ana ekran
  function screenHome() {
    app.innerHTML = '<p class="hello">Hoş geldiniz</p><p class="hello-sub">Ne yapmak istersiniz?</p>' +
      '<a class="btn btn-blue big-add" href="#/yeni/duyurular">' + icon('plus') + 'Yeni Duyuru Ekle</a>' +
      '<div class="tiles">' +
      '<a class="tile" href="#/liste/duyurular">' + icon('news') + 'Duyurular<small id="n-duyurular">&nbsp;</small></a>' +
      '<a class="tile" href="#/liste/etkinlikler">' + icon('cal') + 'Takvim<small id="n-etkinlikler">&nbsp;</small></a>' +
      '<a class="tile" href="#/galeri">' + icon('photo') + 'Fotoğraflar<small id="n-galeri">&nbsp;</small></a>' +
      '<a class="tile" href="#/liste/pazar">' + icon('bag') + 'Market<small id="n-pazar">&nbsp;</small></a>' +
      '<a class="tile wide" href="#/dernek">' + icon('people') + '<span>Dernek Bilgileri<small>Başkan, kurullar, telefon, kasa</small></span></a>' +
      '</div>' +
      '<div class="note">' + icon('warn') + '<div>Kaydettiğiniz her şey <b>1-2 dakika içinde</b> sitede görünür.</div></div>' +
      '<p style="text-align:center;margin-top:28px"><button type="button" class="btn btn-gray" id="logout">Bu telefondan çıkış yap</button></p>';
    document.getElementById('logout').onclick = function () {
      dialog('Çıkış yapılsın mı?', 'Tekrar girmek için giriş anahtarına ihtiyacınız olacak.', 'Evet, çıkış yap', { danger: true }).then(function (ok) {
        if (ok) { setKey(''); go('#/kurulum'); }
      });
    };
    var map = { duyurular: ['duyuru', 'duyuru'], etkinlikler: ['etkinlik', 'etkinlik'], pazar: ['ilan', 'ilan'], galeri: ['fotoğraf', 'fotoğraf'] };
    Object.keys(map).forEach(function (k) {
      var file = k === 'galeri' ? 'data/galeri.json' : COLS[k].file;
      getJson(file).then(function (f) {
        var n = C.arr(f.data).length, el = document.getElementById('n-' + k);
        if (el) el.textContent = n ? n + ' ' + map[k][0] : 'Henüz yok';
      }).catch(function (e) {
        if (e.status === 401) { setKey(''); go('#/kurulum'); }
      });
    });
  }

  function sorted(col, list) {
    return list.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) {
      var x = C.normIso(a.x.tarih), y = C.normIso(b.x.tarih);
      var r = x < y ? -1 : x > y ? 1 : 0;
      return col.sort === 'desc' ? -r : r;
    });
  }

  // Liste ekranı
  var lastList = {};
  function screenList(name) {
    var col = COLS[name];
    app.innerHTML = head(col.title, '#/') + '<div class="card empty">Yükleniyor…</div>';
    getJson(col.file).then(function (f) {
      var list = C.arr(f.data);
      lastList[name] = list;
      var today = C.todayIso();
      var h = head(col.title, '#/') + '<p class="muted" style="margin:-6px 4px 14px">' + esc(col.help) + '</p>' +
        '<a class="btn btn-blue big-add" href="#/yeni/' + name + '">' + icon('plus') + esc(col.addLabel) + '</a>';
      if (!list.length) h += '<div class="card empty"><b>Henüz ' + esc(col.one) + ' yok</b>Yukarıdaki mavi düğmeyle ekleyebilirsiniz.</div>';
      else {
        h += '<div class="card">' + sorted(col, list).map(function (o) {
          var x = o.x, iso = C.normIso(x.tarih);
          var past = name === 'etkinlikler' && iso && iso < today;
          var title = x.baslik || x.ad || '(başlıksız)';
          var sub = [x.tur, iso ? C.longDate(iso, name === 'etkinlikler') : '', past ? 'geçti' : ''].filter(Boolean).join(' · ');
          var th = col.thumb && x.foto ? '<img class="row-thumb" src="' + esc(thumbSrc(x.foto)) + '" alt="">' : '';
          return '<div class="item"><div class="row">' + th + '<div class="row-main"><b>' + esc(title) + '</b><span class="muted">' + esc(sub) + '</span></div></div>' +
            '<div class="row-btns"><a class="btn" href="#/duzenle/' + name + '/' + o.i + '">' + icon('edit') + 'Düzenle</a>' +
            '<button type="button" class="btn btn-red" data-del="' + o.i + '">' + icon('trash') + 'Sil</button></div></div>';
        }).join('') + '</div>';
      }
      app.innerHTML = h;
      app.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () { removeItem(name, +b.getAttribute('data-del')); };
      });
    }).catch(function (e) { failScreen(e, function () { screenList(name); }); });
  }

  function removeItem(name, i) {
    var col = COLS[name], item = lastList[name][i];
    if (!item) return;
    var orig = JSON.stringify(item);
    dialog('Silinsin mi?', '"' + (item.baslik || item.ad || '') + '" siteden kaldırılacak.', 'Evet, sil', { danger: true }).then(function (ok) {
      if (!ok) return;
      busy('Siliniyor…');
      updateJson(col.file, function (data) {
        var list = C.arr(data), k = list.findIndex(function (x) { return JSON.stringify(x) === orig; });
        if (k < 0) throw { status: 'gone' };
        list.splice(k, 1);
        return list;
      }, 'Panel: ' + col.one + ' silindi – ' + (item.baslik || item.ad || '')).then(function () {
        busy(false); screenList(name);
      }).catch(function (e) { busy(false); dialog('Silinemedi', errText(e), 'Tamam', { single: true }); });
    });
  }

  // Ekle / düzenle ekranı
  function screenForm(name, idx) {
    var col = COLS[name], isNew = idx == null;
    var start = function (item) {
      var orig = item ? JSON.stringify(item) : null;
      item = item || {};
      form = { photo: { path: item.foto || '', b64: '', preview: '' } };
      var mainF = col.fields.filter(function (f) { return !f.extra; }), extraF = col.fields.filter(function (f) { return f.extra; });
      var val = function (f) { var v = item[f.name]; if (v == null || v === '') v = isNew ? (f.def === 'today' ? C.todayIso() : (f.def || '')) : ''; return f.type === 'date' ? C.normIso(v) : v; };
      app.innerHTML = head(isNew ? col.addLabel : 'Düzenle', '#/liste/' + name) +
        '<div class="card form" data-col="' + name + '">' + mainF.map(function (f) { return fieldHtml(f, val(f)); }).join('') +
        (extraF.length ? '<details class="extra"' + ((item.kaynak || item.link) ? ' open' : '') + '><summary>Başka bir siteden haber mi? (isteğe bağlı)</summary>' +
          extraF.map(function (f) { return fieldHtml(f, val(f)); }).join('') + '</details>' : '') + '</div>' +
        '<div class="savebar"><div class="savebar-in"><a class="btn btn-gray" href="#/liste/' + name + '" data-back>Vazgeç</a>' +
        '<button type="button" class="btn btn-blue" id="saveBtn">' + icon('check') + 'Yayınla</button></div></div>';
      var root = app.querySelector('.form');
      dirty = false;
      bindForm(root);
      if (name === 'duyurular') applyExamples(root, val(col.fields[0]));
      document.getElementById('saveBtn').onclick = function () {
        var v = readForm(root, col.fields);
        if (!v) return;
        if (col.autoDate) v.tarih = isNew ? C.todayIso() : (item.tarih || C.todayIso());
        saveItem(name, v, orig);
      };
    };
    if (isNew) { start(null); return; }
    app.innerHTML = head('Düzenle', '#/liste/' + name) + '<div class="card empty">Yükleniyor…</div>';
    var have = lastList[name];
    (have ? Promise.resolve(have) : getJson(col.file).then(function (f) { return (lastList[name] = C.arr(f.data)); }))
      .then(function (list) {
        if (!list[idx]) { go('#/liste/' + name); return; }
        start(list[idx]);
      }).catch(function (e) { failScreen(e, function () { screenForm(name, idx); }); });
  }

  function clean(v) {
    var o = {};
    Object.keys(v).forEach(function (k) { if (v[k] !== '' && v[k] != null) o[k] = v[k]; });
    return o;
  }

  function saveItem(name, v, orig) {
    var col = COLS[name];
    var step = form.photo.b64 ? (busy('Fotoğraf yükleniyor…'), uploadPhoto(form.photo.b64)) : Promise.resolve(form.photo.path);
    step.then(function (path) {
      v.foto = path || '';
      busy('Kaydediliyor…');
      return updateJson(col.file, function (data) {
        var list = C.arr(data), item = clean(v);
        if (!col.fields.some(function (f) { return f.name === 'foto'; })) delete item.foto;
        if (orig) {
          var k = list.findIndex(function (x) { return JSON.stringify(x) === orig; });
          if (k < 0) throw { status: 'gone' };
          list[k] = item;
        } else list.unshift(item);
        return list;
      }, 'Panel: ' + col.one + (orig ? ' düzenlendi – ' : ' eklendi – ') + (v.baslik || v.ad || ''));
    }).then(function () {
      busy(false); dirty = false; lastList[name] = null;
      doneScreen(orig ? 'Değişiklik kaydedildi' : 'Yayınlandı', '#/liste/' + name);
    }).catch(function (e) { busy(false); dialog('Kaydedilemedi', errText(e), 'Tamam', { single: true }); });
  }

  function doneScreen(title, back) {
    app.innerHTML = '<div class="card done"><div class="tick">' + icon('check') + '</div><h1>' + esc(title) + '</h1>' +
      '<p class="muted">1-2 dakika içinde sitede görünecek.</p>' +
      '<a class="btn btn-blue btn-wide" href="' + back + '">Tamam</a>' +
      '<a class="btn btn-wide" href="../" target="_blank" rel="noopener">' + icon('eye') + 'Siteyi Gör</a></div>';
    window.scrollTo(0, 0);
  }

  // Fotoğraf galerisi
  var galList = [];
  function screenGallery() {
    app.innerHTML = head('Fotoğraflar', '#/') + '<div class="card empty">Yükleniyor…</div>';
    getJson('data/galeri.json').then(function (f) {
      galList = C.arr(f.data);
      var h = head('Fotoğraflar', '#/') + '<p class="muted" style="margin:-6px 4px 14px">Sitedeki "Fotoğraflar" bölümü. Yeni eklenenler en başta görünür.</p>' +
        '<a class="btn btn-blue big-add" href="#/galeri/ekle">' + icon('plus') + 'Fotoğraf Ekle</a>';
      h += galList.length ? '<div class="gal-admin">' + galList.map(function (x, i) {
        return '<figure><img src="' + esc(thumbSrc(x.foto)) + '" alt="' + esc(x.aciklama) + '" loading="lazy"><figcaption>' +
          '<button type="button" class="btn btn-red" data-gdel="' + i + '">' + icon('trash') + 'Sil</button></figcaption></figure>';
      }).join('') + '</div>' : '<div class="card empty"><b>Henüz fotoğraf yok</b></div>';
      app.innerHTML = h;
      app.querySelectorAll('[data-gdel]').forEach(function (b) {
        b.onclick = function () {
          var x = galList[+b.getAttribute('data-gdel')], orig = JSON.stringify(x);
          dialog('Fotoğraf silinsin mi?', 'Bu fotoğraf sitedeki galeriden kaldırılacak.', 'Evet, sil', { danger: true }).then(function (ok) {
            if (!ok) return;
            busy('Siliniyor…');
            updateJson('data/galeri.json', function (data) {
              var list = C.arr(data), k = list.findIndex(function (y) { return JSON.stringify(y) === orig; });
              if (k < 0) throw { status: 'gone' };
              list.splice(k, 1); return list;
            }, 'Panel: galeriden fotoğraf silindi').then(function () { busy(false); screenGallery(); })
              .catch(function (e) { busy(false); dialog('Silinemedi', errText(e), 'Tamam', { single: true }); });
          });
        };
      });
    }).catch(function (e) { failScreen(e, screenGallery); });
  }

  function screenGalleryAdd() {
    var picked = [];
    app.innerHTML = head('Fotoğraf Ekle', '#/galeri') + '<div class="card form">' +
      '<div class="field"><span class="label">Fotoğraflar</span><span class="help">Birden fazla fotoğraf seçebilirsiniz.</span>' +
      '<div class="photo-box"><div class="previews" id="prev"></div>' +
      '<label class="btn btn-blue photo-pick btn-wide">' + icon('camera') + '<span id="pickTxt">Fotoğraf Seç</span>' +
      '<input type="file" accept="image/*" multiple id="gfiles" aria-label="Fotoğraf seç"></label></div><span class="err" hidden></span></div>' +
      '<div class="field"><label for="gcap">Fotoğraflarda ne var?</label><span class="help">İsteğe bağlı. Örnek: 2026 bayramlaşması</span>' +
      '<input id="gcap" type="text" autocomplete="off"></div></div>' +
      '<div class="savebar"><div class="savebar-in"><a class="btn btn-gray" href="#/galeri" data-back>Vazgeç</a>' +
      '<button type="button" class="btn btn-blue" id="gsave">' + icon('check') + 'Yükle</button></div></div>';
    dirty = false;
    var err = app.querySelector('.err');
    document.getElementById('gfiles').onchange = function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (!files.length) return;
      dirty = true; busy('Fotoğraflar hazırlanıyor…');
      files.reduce(function (p, file) {
        return p.then(function () { return shrink(file).then(function (r) { picked.push(r); }).catch(function () { /* açılmayanı atla */ }); });
      }, Promise.resolve()).then(function () {
        busy(false);
        document.getElementById('prev').innerHTML = picked.map(function (r) { return '<img src="' + r.preview + '" alt="">'; }).join('');
        document.getElementById('pickTxt').textContent = picked.length ? 'Daha Fazla Seç (' + picked.length + ' seçildi)' : 'Fotoğraf Seç';
        err.hidden = true;
        e.target.value = '';
      });
    };
    document.getElementById('gsave').onclick = function () {
      if (!picked.length) { err.textContent = 'Önce fotoğraf seçin.'; err.hidden = false; return; }
      var cap = document.getElementById('gcap').value.trim(), paths = [];
      picked.reduce(function (p, r, i) {
        return p.then(function () {
          busy('Fotoğraf yükleniyor… (' + (i + 1) + ' / ' + picked.length + ')');
          return uploadPhoto(r.b64).then(function (path) { paths.push(path); });
        });
      }, Promise.resolve()).then(function () {
        busy('Kaydediliyor…');
        return updateJson('data/galeri.json', function (data) {
          var list = C.arr(data);
          return paths.map(function (pth) { return cap ? { foto: pth, aciklama: cap } : { foto: pth }; }).concat(list);
        }, 'Panel: galeriye ' + paths.length + ' fotoğraf eklendi');
      }).then(function () {
        busy(false); dirty = false;
        doneScreen(paths.length + ' fotoğraf eklendi', '#/galeri');
      }).catch(function (e) { busy(false); dialog('Yüklenemedi', errText(e), 'Tamam', { single: true }); });
    };
  }

  // Dernek bilgileri
  function screenDernek() {
    app.innerHTML = head('Dernek Bilgileri', '#/') + '<div class="card empty">Yükleniyor…</div>';
    getJson('data/dernek.json').then(function (f) {
      var d = f.data && typeof f.data === 'object' && !Array.isArray(f.data) ? f.data : {};
      form = { photo: { path: '', b64: '', preview: '' } };
      app.innerHTML = head('Dernek Bilgileri', '#/') + '<div class="card form">' +
        DERNEK_FIELDS.map(function (fl) { return fieldHtml(fl, d[fl.name] || ''); }).join('') + '</div>' +
        '<div class="savebar"><div class="savebar-in"><a class="btn btn-gray" href="#/" data-back>Vazgeç</a>' +
        '<button type="button" class="btn btn-blue" id="saveBtn">' + icon('check') + 'Kaydet</button></div></div>';
      var root = app.querySelector('.form');
      dirty = false; bindForm(root);
      document.getElementById('saveBtn').onclick = function () {
        var v = readForm(root, DERNEK_FIELDS);
        if (!v) return;
        if (v.canli_yayin && !C.ytEmbed(v.canli_yayin)) {
          var box = root.querySelector('[data-field="canli_yayin"]'), er = box.querySelector('.err');
          box.classList.add('bad'); er.textContent = 'Bu bir YouTube video ya da canlı yayın adresi değil gibi görünüyor.'; er.hidden = false;
          box.scrollIntoView({ block: 'center' }); return;
        }
        busy('Kaydediliyor…');
        updateJson('data/dernek.json', function (data) {
          var o = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
          DERNEK_FIELDS.forEach(function (fl) { o[fl.name] = v[fl.name]; });
          return o;
        }, 'Panel: dernek bilgileri güncellendi').then(function () {
          busy(false); dirty = false; doneScreen('Bilgiler kaydedildi', '#/');
        }).catch(function (e) { busy(false); dialog('Kaydedilemedi', errText(e), 'Tamam', { single: true }); });
      };
    }).catch(function (e) { failScreen(e, screenDernek); });
  }

  /* ---------------- yönlendirme ---------------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, ''), p = h.split('/');
    window.scrollTo(0, 0);
    if (!getKey()) { if (p[0] !== 'kurulum') { location.replace('#/kurulum'); return; } screenSetup(); return; }
    if (p[0] === 'kurulum') { screenSetup(); return; }
    if (p[0] === 'liste' && COLS[p[1]]) return screenList(p[1]);
    if (p[0] === 'yeni' && COLS[p[1]]) return screenForm(p[1], null);
    if (p[0] === 'duzenle' && COLS[p[1]] && /^\d+$/.test(p[2] || '')) return screenForm(p[1], +p[2]);
    if (p[0] === 'galeri' && p[1] === 'ekle') return screenGalleryAdd();
    if (p[0] === 'galeri') return screenGallery();
    if (p[0] === 'dernek') return screenDernek();
    screenHome();
  }

  // Kaydedilmemiş yazı varken "Geri"ye basılırsa sor
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-back]');
    if (!a || !dirty) return;
    e.preventDefault();
    dialog('Kaydetmeden çıkılsın mı?', 'Yazdıklarınız kaybolacak.', 'Evet, çık', { danger: true }).then(function (ok) {
      if (ok) { dirty = false; location.hash = a.getAttribute('href'); }
    });
  });

  window.addEventListener('hashchange', function () { dirty = false; route(); });
  route();
})();
