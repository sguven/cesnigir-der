/* Arama motorları (Google, Bing, Yandex) ve paylaşım önizlemeleri için sitenin gerçek adresli sayfalarını üretir:

     hakkimizda/  duyurular/  etkinlikler/  fotograflar/  iletisim/     her bölümün kendi sayfası
     p/d-….html                                                        her duyuru ve haberin kendi sayfası
     p/e-….html                                                        her köy etkinliğinin kendi sayfası
     p/i-….html                                                        fotoğraflı pazar ilanlarının paylaşım sayfası (aramaya kapalı)
     sitemap.xml                                                       arama motorlarına sayfa listesi

   Her sayfa, sitenin o bölümünün hazır (içeriği yazılı) hâlidir: arama motoru metni doğrudan okur, ziyaretçi için site aynen çalışır.
   İçerik (data/*.json), index.html, app.js ya da site.css değişince yeniden çalıştırın:

     node araclar/site-sayfalari.js

   Gece çalışan bölge haberleri görevi bunu her gece çalıştırır; yönetim panelinden girilen yeni kayıtlar da o zaman sayfasına kavuşur. */
var fs = require('fs'), path = require('path'), http = require('http');
var root = path.join(__dirname, '..');
require(path.join(root, 'ortak.js'));
var C = globalThis.CD;
var { chromium } = require('playwright');

var SITE = 'https://' + fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() + '/';
var ORG = 'Köprüköy Çeşnigir Kültür Sosyal Yardımlaşma ve Dayanışma Derneği';
var PAGES = {
  hakkimizda: 'Köprüköy (Keskin, Kırıkkale) ve Çeşnigir Köprüsü: köyün tarihi, gezilecek yerler, Çeşnigir Kanyonu ve Çeşnigir-Der derneği hakkında bilgiler.',
  duyurular: 'Köprüköy, Keskin ve Kırıkkale\'den güncel haberler, duyurular, vefat ve düğün ilanları. Çeşnigir-Der derneğinin haber sayfası.',
  etkinlikler: 'Köprüköy etkinlik takvimi: düğünler, mevlitler, toplantılar, resmî bayramlar ve dinî günler.',
  fotograflar: 'Köprüköy, Çeşnigir Köprüsü ve Kızılırmak kıyısından fotoğraflar.',
  iletisim: 'Çeşnigir-Der iletişim bilgileri: dernek başkanı, yönetim kurulu, adres ve Köprüköy\'ün haritadaki konumu.'
};
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function esc(s) { return C.esc(s); }
function short(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }
function read(name) { return C.arr(JSON.parse(fs.readFileSync(path.join(root, 'data', name + '.json'), 'utf8'))); }
function ld(o) { return '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>\n'; }
function abs(p) { return C.imgSrc(p, SITE); }

// Üretilen sayfa bir alt klasörde durduğu için sayfadaki bütün göreli adreslerin başına ../ gelir
function deepen(html) {
  return html.replace(/\b(href|src|data-photo|data-share-photo)="(?!https?:|#|\/|mailto:|tel:|data:|\.\.\/|javascript:)([^"]*)"/g, '$1="../$2"');
}
function setMeta(html, attr, name, value) {
  var re = new RegExp('(<meta ' + attr + '="' + name + '" content=")[^"]*(")');
  return re.test(html) ? html.replace(re, '$1' + esc(value).replace(/\$/g, '$$$$') + '$2') : html;
}
function build(dom, o) {
  var h = deepen(dom);
  h = setMeta(h, 'name', 'description', o.desc);
  h = setMeta(h, 'property', 'og:title', o.ogTitle || o.title);
  h = setMeta(h, 'property', 'og:description', o.ogDesc || o.desc);
  h = setMeta(h, 'property', 'og:type', o.type || 'website');
  h = setMeta(h, 'property', 'og:image', o.image || SITE + 'images/kapak.jpg');
  h = h.replace(/<link rel="canonical"[^>]*>\n?/, '').replace(/<meta property="og:url"[^>]*>\n?/, '');
  // kayıt sayfası kendi yapılandırılmış verisini taşır; bölüm sayfalarında derneğin bilgisi kalır
  if (o.ld) h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '');
  h = h.replace('</title>', '</title>\n<link rel="canonical" href="' + esc(o.url) + '">\n<meta property="og:url" content="' + esc(o.url) + '">');
  h = h.replace('</head>', (o.ld ? ld(o.ld) : '') + '</head>');
  h = h.replace(/<script src="\.\.\/ortak\.js/, '<script>window.CD_BASE="../";window.CD_ROUTE=' + JSON.stringify(o.route).replace(/</g, '\\u003c') + ';</script>\n<script src="../ortak.js');
  return '<!doctype html>\n' + h + '\n';
}

(async function () {
  var server = http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    var f = path.join(root, p);
    if (f.indexOf(root) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(function (ok) { server.listen(0, '127.0.0.1', ok); });
  var origin = 'http://127.0.0.1:' + server.address().port + '/';
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  // yalnızca sitenin kendi dosyaları: canlı yayın, yazı tipi gibi dış istekler sayfaya girmez
  await ctx.route(function (u) { return u.origin + '/' !== origin; }, function (r) { return r.abort(); });

  async function snap(route) {
    var pg = await ctx.newPage();
    await pg.goto(origin + '#/' + route, { waitUntil: 'load' });
    await pg.waitForFunction(function () { var m = document.getElementById('icerik'); return m && !m.querySelector('.loading'); });
    var out = await pg.evaluate(function () {
      document.getElementById('icerik').classList.remove('gir');
      document.body.removeAttribute('style'); document.documentElement.removeAttribute('style');
      return { html: document.documentElement.outerHTML, title: document.title, h1: (document.querySelector('#icerik h1') || {}).textContent || '' };
    });
    await pg.close();
    return out;
  }
  function write(rel, html) {
    var f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, html);
  }

  var duyurular = read('duyurular'), etkinlikler = read('etkinlikler'), pazar = read('pazar');
  var urls = [], n = 0;
  var newest = duyurular.map(function (x) { return C.normIso(x.tarih); }).filter(Boolean).sort().pop() || '';
  urls.push({ loc: SITE, lastmod: newest });

  // bölüm sayfaları
  for (var name of Object.keys(PAGES)) {
    var s = await snap(name);
    write(name + '/index.html', build(s.html, { route: name, url: SITE + name + '/', title: s.title, desc: PAGES[name] }));
    urls.push({ loc: SITE + name + '/', lastmod: name === 'duyurular' ? newest : '' });
    n++;
  }

  // kayıt sayfaları
  fs.rmSync(path.join(root, 'p'), { recursive: true, force: true });
  fs.mkdirSync(path.join(root, 'p'));
  var seen = {};
  async function item(key, routeName, x) {
    var id = C.shareId(key, x), rel = C.sharePath(key, id);
    if (seen[rel] || !/^[a-z0-9-]+$/.test(id)) return;
    seen[rel] = 1;
    var s = await snap(routeName + '/' + id);
    if (/bulunamadı/.test(s.h1)) return;
    var name = key === 'e' ? x.ad : x.baslik, iso = C.normIso(x.tarih), foto = abs(x.foto);
    var tur = x.tur ? String(x.tur).toLocaleUpperCase('tr') + ': ' : '';
    var det = key === 'e' ? [C.longDate(x.tarih, true), x.saat, x.yer].filter(Boolean).join(' · ') : short(x.metin, 180);
    var url = SITE + rel, data = null;
    if (key === 'd' && x.tur !== 'Vefat') data = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: short(name, 110),
      datePublished: iso || undefined, dateModified: iso || undefined, image: foto ? [foto] : undefined, description: short(x.metin, 200),
      mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Çeşnigir-Der', url: SITE },
      publisher: { '@type': 'Organization', name: 'Çeşnigir-Der', logo: { '@type': 'ImageObject', url: SITE + 'images/logo.png' } } };
    if (key === 'e' && iso) data = { '@context': 'https://schema.org', '@type': 'Event', name: name, startDate: iso, image: foto ? [foto] : undefined,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: x.yer || 'Köprüköy', address: { '@type': 'PostalAddress', addressLocality: 'Köprüköy, Keskin', addressRegion: 'Kırıkkale', addressCountry: 'TR' } },
      organizer: { '@type': 'Organization', name: 'Çeşnigir-Der', url: SITE } };
    write(rel, build(s.html, { route: routeName + '/' + id, url: url, title: s.title, type: 'article',
      desc: (key === 'e' ? det : short(x.metin, 155)) || name, ogTitle: tur + name, ogDesc: det || 'Çeşnigir-Der · Köprüköy', image: foto, ld: data }));
    urls.push({ loc: url, lastmod: key === 'd' ? iso : '' });
    n++;
  }
  for (var d of duyurular) await item('d', 'duyuru', d);
  for (var e of etkinlikler) await item('e', 'etkinlik', e);
  // pazar ilanları (telefon numarası içerir): yalnızca paylaşım önizlemesi, aramaya kapalı
  pazar.forEach(function (x) { var pg = C.sharePage('i', x, SITE); if (pg) { write(pg.path, pg.html); n++; } });

  await browser.close();
  server.close();

  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(function (u) { return '<url><loc>' + esc(u.loc) + '</loc>' + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '') + '</url>'; }).join('\n') + '\n</urlset>\n');
  console.log(n + ' sayfa yazıldı, sitemap.xml: ' + urls.length + ' adres → ' + SITE);
})().catch(function (err) { console.error(err); process.exit(1); });
