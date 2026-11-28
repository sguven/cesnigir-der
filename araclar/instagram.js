/* Sitedeki yeni kayıtları (duyuru, haber, vefat/düğün ilanı, etkinlik, pazar ilanı) Instagram için hazırlar.
   Günde üç kez çalışan "Çeşnigir-Der · Instagram paylaşımı" zamanlanmış görevi kullanır.

     node araclar/instagram.js bekleyen            bu çalışmada paylaşılabilecek kayıtları listeler (JSON)
     node araclar/instagram.js hazirla [kimlik]    sıradaki TEK kaydı (ya da verilen kaydı) seçer, görsellerini üretir, açıklamayı yazar (JSON)
     node araclar/instagram.js isaretle <kimlik>…  kayıtları paylaşıldı diye işaretler (data/instagram.json)

   Kural (Serhat, 27 Kasım 2026): her çalışmada tek kayıt paylaşılır. Yalnızca yeni eklenenler paylaşılır: bir kayıt ilk görüldüğü
   andan sonra TAZE_SAAT saat içinde paylaşılmazsa bir daha paylaşılmaz (eski kayıtlar akışa dökülmez). Önce panelden girilenler
   (dosyadaki sırayla), panel kaydı yoksa bölge haberlerinden rastgele biri seçilir. Örnek: sabah 4 haber ve 1 panel kaydı varsa
   sabah panel kaydı, öğlen 4 haberden biri, akşam kalan 3 haberden biri paylaşılır; kalan 2 haber paylaşılmaz.

   Görseller images/instagram/ altına yazılır: <kimlik>-gonderi.jpg (1080x1350, akış) ve <kimlik>-hikaye.jpg (1080x1920, hikâye).
   Instagram görseli raw.githubusercontent.com adresinden çeker: dosyalar main'e gönderildikten sonra paylaşılır. */
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
require(path.join(root, 'ortak.js'));
var C = globalThis.CD;
var SITE = 'https://' + fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() + '/';
// Instagram görseli buradan çeker: push'tan hemen sonra hazırdır (Pages yayınını beklemez)
var HAM = 'https://raw.githubusercontent.com/sguven/cesnigir-der/main/';
var STATE = path.join(root, 'data', 'instagram.json'), OUT = path.join(root, 'images', 'instagram');
var AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function read(f, d) { try { return JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')); } catch (e) { return d; } }
function state() { var s = read('instagram.json', null) || {}; s.paylasilan = s.paylasilan || {}; return s; }
function bugun() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()); }
function tarihYazi(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? (+m[3]) + ' ' + AYLAR[+m[2] - 1] + ' ' + m[1] : ''; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function kisalt(s, n) {
  s = String(s || '').split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  var cut = s.slice(0, n), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return i > n * 0.5 ? cut.slice(0, i + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

function kayitlar() {
  var out = [], t = bugun();
  read('duyurular.json', []).forEach(function (x) { if (x && x.baslik) out.push({ key: 'd', x: x, panel: !x.link }); });
  read('etkinlikler.json', []).forEach(function (x) { if (x && x.ad && String(x.tarih || '') >= t) out.push({ key: 'e', x: x, panel: true }); });
  read('pazar.json', []).forEach(function (x) { if (x && x.baslik) out.push({ key: 'i', x: x, panel: true }); });
  out.forEach(function (k) {
    k.kimlik = k.key + '-' + C.shareId(k.key, k.x);
    k.adres = SITE.replace(/^https:\/\//, '') + k.key + '/' + C.shortCode(k.key, C.shareId(k.key, k.x), k.x.foto);
  });
  return out;
}
var TAZE_SAAT = 20;   // sabah görülen kayıt ertesi sabahki çalışmada artık eski sayılır
function kaydet(s) { fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n'); }
// Yeni kayıtların ilk görülme anını yazar; paylaşılmamış ve hâlâ taze olanları döndürür: önce panel kayıtları, sonra haberler.
function bekleyen() {
  var s = state(), now = Date.now(), all = kayitlar(), degisti = false;
  s.gorulen = s.gorulen || {};
  all.forEach(function (k) { if (!s.paylasilan[k.kimlik] && !s.gorulen[k.kimlik]) { s.gorulen[k.kimlik] = new Date(now).toISOString(); degisti = true; } });
  Object.keys(s.gorulen).forEach(function (id) {            // dosya büyümesin: paylaşılanları ve 30 günden eskileri at
    if (s.paylasilan[id] || now - Date.parse(s.gorulen[id]) > 30 * 864e5) { delete s.gorulen[id]; degisti = true; }
  });
  if (degisti) kaydet(s);
  var taze = all.filter(function (k) { return !s.paylasilan[k.kimlik] && now - Date.parse(s.gorulen[k.kimlik]) < TAZE_SAAT * 36e5; });
  return taze.filter(function (k) { return k.panel; }).concat(taze.filter(function (k) { return !k.panel; }));
}
function sec() {
  var b = bekleyen(), panel = b.filter(function (k) { return k.panel; });
  if (panel.length) return [panel[0]];
  return b.length ? [b[Math.floor(Math.random() * b.length)]] : [];
}

function etiketler(k) {
  var x = k.x, t = String(x.tur || '').toLocaleLowerCase('tr'), e = ['#Köprüköy', '#Keskin', '#Kırıkkale', '#ÇeşnigirDer'];
  e.push(k.key === 'e' ? '#köyetkinlikleri' : k.key === 'i' ? '#köypazarı' : t === 'vefat' ? '#vefat' : t === 'tarihten' ? '#tarih' : '#köyhaberleri');
  return e.join(' ');
}
// Instagram açıklamasında bağlantıya dokunulamaz: okuyanı profildeki (biyografideki) bağlantıya yönlendiririz,
// elle yazılabilsin diye sitenin kısa, yalın adresi de verilir (Serhat, 27 Kasım 2026)
var DETAY = 'Ayrıntılar profildeki linkte 👉 cesnigirder.org';         // etkinlik, pazar ilanı
var DETAY_HABER = 'Haberin tamamı profildeki linkte 👉 cesnigirder.org';   // duyuru, haber, vefat…
function metin(k) {
  var x = k.x, tur = String(x.tur || (k.key === 'i' ? 'İlan' : '')).toLocaleUpperCase('tr'), a = [];
  if (k.key === 'e') {
    a.push((tur ? tur + ': ' : '') + x.ad);
    a.push([tarihYazi(x.tarih), x.saat, x.yer].filter(Boolean).join(' · '));
    a.push(DETAY);
  } else if (k.key === 'i') {
    a.push((tur ? tur + ': ' : '') + x.baslik + (x.fiyat ? ' · ' + x.fiyat + ' ₺' : ''));
    if (x.aciklama) a.push(kisalt(x.aciklama, 400));
    a.push(DETAY);
  } else {
    a.push((tur ? tur + ': ' : '') + x.baslik);
    if (x.metin) a.push(kisalt(x.metin, 520));
    a.push((x.kaynak && x.link ? 'Kaynak: ' + x.kaynak + '\n' : '') + DETAY_HABER);
  }
  return a.join('\n\n');
}
function aciklama(list) {
  var govde = list.map(metin).join('\n\n· · ·\n\n');
  var et = []; list.forEach(function (k) { etiketler(k).split(' ').forEach(function (e) { if (et.indexOf(e) < 0) et.push(e); }); });
  return (govde + '\n\n' + et.slice(0, 6).join(' ')).slice(0, 2150);
}

var LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'images', 'logo-160.png')).toString('base64');   // derneğin sarı logosu
function kartHtml(k, hikaye) {
  var x = k.x, baslik = k.key === 'e' ? x.ad : x.baslik, tur = String(x.tur || (k.key === 'i' ? 'İlan' : 'Duyuru')).toLocaleUpperCase('tr');
  var alt = k.key === 'e' ? [tarihYazi(x.tarih), x.saat, x.yer].filter(Boolean).join(' · ')
    : k.key === 'i' ? (x.fiyat ? x.fiyat + ' ₺' : '') : x.olay_tarihi ? x.olay_tarihi   // "Tarihten" yazıları: olayın tarihi
    : [tarihYazi(x.tarih), x.link ? x.kaynak : ''].filter(Boolean).join(' · ');
  var fp = x.foto && fs.existsSync(path.join(root, x.foto)) ? path.join(root, x.foto) : path.join(root, 'images', 'kapak-paylasim.jpg');
  var foto = 'data:image/' + (/\.png$/i.test(fp) ? 'png' : /\.webp$/i.test(fp) ? 'webp' : 'jpeg') + ';base64,' + fs.readFileSync(fp).toString('base64');
  var n = String(baslik || '').length, fs0 = hikaye ? (n > 90 ? 58 : n > 60 ? 66 : 76) : (n > 90 ? 50 : n > 60 ? 58 : 68);
  var H = hikaye ? 1920 : 1350, fotoH = hikaye ? 760 : 700, ust = hikaye ? 250 : 0;
  return '<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>' +
    '*{box-sizing:border-box;margin:0;padding:0}body{width:1080px;height:' + H + 'px;background:#FAF6EF;color:#231A14;font-family:"Poppins","Source Sans 3",Arial,sans-serif;overflow:hidden;position:relative}' +
    '.ust{height:' + ust + 'px;background:#7A2E1C}' +
    '.foto{height:' + fotoH + 'px;background:#EFE6D6;position:relative;overflow:hidden}' +
    '.foto .bg{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(28px) brightness(.85)}' +
    '.foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.foto img.dol{object-fit:cover}' +
    '.govde{padding:44px 64px 0}' +
    '.tur{display:inline-block;background:#7A2E1C;color:#fff;font-weight:700;font-size:30px;letter-spacing:.06em;padding:10px 26px;border-radius:999px}' +
    'h1{font-family:"Lora",Merriweather,Georgia,serif;font-weight:700;font-size:' + fs0 + 'px;line-height:1.18;margin-top:28px;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}' +
    '.alt{margin-top:24px;font-size:34px;color:#5A4C40;font-weight:500}' +
    '.ayak{position:absolute;left:0;right:0;bottom:' + (hikaye ? 350 : 0) + 'px;height:118px;background:#7A2E1C;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 64px;font-size:34px}' +
    '.ayak .ad{display:flex;align-items:center;gap:22px}.ayak img{width:92px;height:92px;display:block}' +
    '.ayak b{font-family:"Lora",Georgia,serif;font-size:42px;letter-spacing:.02em}' +
    '.dip{position:absolute;left:0;right:0;bottom:0;height:' + (hikaye ? 350 : 0) + 'px;background:#5A1F12}' +
    '</style></head><body><div class="ust"></div><div class="foto"><div class="bg" style="background-image:url(\'' + foto + '\')"></div>' +
    '<img src="' + foto + '" onload="if(this.naturalWidth/this.naturalHeight>1.25)this.className=\'dol\'"></div>' +
    '<div class="govde"><span class="tur">' + esc(tur) + '</span><h1>' + esc(baslik) + '</h1>' + (alt ? '<div class="alt">' + esc(alt) + '</div>' : '') + '</div>' +
    '<div class="ayak"><div class="ad"><img src="' + LOGO + '"><b>ÇEŞNİGİR-DER</b></div><span>cesnigirder.org</span></div><div class="dip"></div></body></html>';
}

// kimlik verilirse sıradan bağımsız o kaydı hazırlar (elle yeniden paylaşım için, ör. Atatürk 1919 yazısı)
async function hazirla(kimlik) {
  var list = kimlik ? kayitlar().filter(function (k) { return k.kimlik === kimlik; }) : sec();
  if (!list.length) { console.log(JSON.stringify({ kayitlar: [] })); return; }
  fs.mkdirSync(OUT, { recursive: true });
  var { chromium } = require('playwright'), br = await chromium.launch();
  for (var k of list) {
    for (var hik of [false, true]) {
      var pg = await br.newPage({ viewport: { width: 1080, height: hik ? 1920 : 1350 } });
      await pg.setContent(kartHtml(k, hik), { waitUntil: 'load' });
      await pg.waitForTimeout(250);
      var ad = k.kimlik + (hik ? '-hikaye' : '-gonderi') + '.jpg';
      await pg.screenshot({ path: path.join(OUT, ad), type: 'jpeg', quality: 88 });
      await pg.close();
      k[hik ? 'hikaye' : 'gonderi'] = HAM + 'images/instagram/' + ad;
    }
  }
  await br.close();
  console.log(JSON.stringify({
    aciklama: aciklama(list),
    kayitlar: list.map(function (k) {
      return { kimlik: k.kimlik, tur: k.x.tur || '', baslik: k.key === 'e' ? k.x.ad : k.x.baslik, gonderi: k.gonderi, hikaye: k.hikaye,
        dosyalar: ['images/instagram/' + k.kimlik + '-gonderi.jpg', 'images/instagram/' + k.kimlik + '-hikaye.jpg'] };
    })
  }, null, 2));
}

var cmd = process.argv[2];
if (cmd === 'bekleyen') {
  console.log(JSON.stringify(bekleyen().map(function (k) { return { kimlik: k.kimlik, tur: k.x.tur || '', baslik: k.key === 'e' ? k.x.ad : k.x.baslik, panel: k.panel }; }), null, 2));
} else if (cmd === 'hazirla') {
  hazirla(process.argv[3]).catch(function (e) { console.error(e); process.exit(1); });
} else if (cmd === 'isaretle') {
  var s = state(), now = new Date().toISOString();
  process.argv.slice(3).forEach(function (id) { s.paylasilan[id] = s.paylasilan[id] || now; });
  if (s.gorulen) process.argv.slice(3).forEach(function (id) { delete s.gorulen[id]; });
  kaydet(s);
  console.log(Object.keys(s.paylasilan).length + ' kayıt işaretli');
} else {
  console.log('Kullanım: node araclar/instagram.js bekleyen | hazirla [kimlik] | isaretle <kimlik>…');
}
