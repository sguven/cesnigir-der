/* Fotoğrafı olan bütün duyuru, etkinlik ve ilanların paylaşım sayfalarını (p/…html) baştan üretir.
   Kayıtlar yönetim paneli dışında (doğrudan data/*.json) değiştiğinde ya da sitenin adresi değiştiğinde çalıştırın:
     node araclar/paylasim-sayfalari.js [https://site-adresi/]
   Adres verilmezse index.html içindeki og:image adresinden alınır. */
var fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
require(path.join(root, 'ortak.js'));
var C = globalThis.CD;
var base = process.argv[2] || (/og:image" content="(.*?)images\//.exec(fs.readFileSync(path.join(root, 'index.html'), 'utf8')) || [])[1];
if (!base) throw new Error('Site adresi bulunamadı');
if (!/\/$/.test(base)) base += '/';
var dir = path.join(root, 'p'), n = 0;
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);
Object.keys(C.SHARE_COLS).forEach(function (name) {
  C.arr(JSON.parse(fs.readFileSync(path.join(root, 'data', name + '.json'), 'utf8'))).forEach(function (x) {
    var pg = C.sharePage(C.SHARE_COLS[name], x, base);
    if (pg) { fs.writeFileSync(path.join(root, pg.path), pg.html); n++; }
  });
});
console.log(n + ' paylaşım sayfası yazıldı → ' + base + 'p/');
