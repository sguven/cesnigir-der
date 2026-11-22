# Çeşnigir-Der web sitesi

Köprüköy Çeşnigir Kültür Sosyal Yardımlaşma ve Dayanışma Derneği'nin sitesi.
Adres: https://cesnigirder.org/ (alan adı GoDaddy'den; eski https://sguven.github.io/cesnigir-der/ adresi buraya yönlenir)

Sade, telefon öncelikli bir statik site. Alan adı ayarı kökteki `CNAME` dosyasında. Sunucu veya veritabanı yok; GitHub Pages ile yayınlanır.

## Tasarım

Ana adreste Tasarım 3 yayında (klasik dernek sitesi, üstte menü, ayrı sayfalar): `index.html`, `site.css`, `app.js`.

Denenen diğer iki tasarım `arsiv/` klasöründe saklanıyor (`arsiv/site1/`, `arsiv/site2/`); siteden bağlantı verilmez.
Eski `site3/` adresi ana adrese yönlendirir, daha önce paylaşılan bağlantılar çalışmaya devam eder.

## İçerik nasıl değişir?

**Yönetim paneli:** https://cesnigirder.org/yonetim/

- Panel sitenin kendisidir, düzenleme modunda: yönetici siteyi ziyaretçi gibi gezer. Her duyurunun, etkinliğin, market ilanının ve
  fotoğrafın yanında **Düzenle** / **Sil**, her bölümün başında **Yeni … ekle** düğmesi vardır; sağ alttaki **Ekle** düğmesi de her yerden açılır.
  Hakkımızda, İletişim ve ana sayfadaki kutuların (dernek bilgileri, kurullar, kasa, canlı görüntü) köşesindeki **Düzenle** yalnız o kutunun bilgilerini açar.
- Geçmiş etkinlikler sitede görünmez; düzenleme modunda Etkinlikler sayfasının sonunda listelenir.
- Değişiklikler doğrudan bu depodaki `data/` dosyalarına kaydedilir ve sayfada hemen görünür; ziyaretçilere 1-2 dakika içinde yansır.
- Telefondan yüklenen fotoğraflar otomatik küçültülür (en fazla 1600 piksel, 250 KB altı) ve `images/yuklenen/` klasörüne gider.
- Kod: `yonetim/index.html` (sitenin iskeleti), `yonetim/duzen.js`, `yonetim/duzen.css`. `app.js`, `window.CD_EDIT` varsa düzenleme düğmelerinin
  yerlerini işaretler (`data-ek`, `data-ed`); ziyaretçi sitesinde bu işaretler hiç yazılmaz.

**Yedek:** Pages CMS (https://app.pagescms.org) aynı dosyaları düzenleyebilir. Ayarı `.pages.yml` içinde.

## Panel için giriş

Panel bir GitHub erişim anahtarıyla çalışır. Anahtar yöneticiye **giriş bağlantısı** olarak verilir:

    https://cesnigirder.org/yonetim/?k=ANAHTAR

Bağlantıya dokunan doğrudan girer. Anahtar adres çubuğunda durduğu için bu sayfa ana ekrana ya da yer imlerine eklenince anahtar da onunla gider;
tarayıcı belleği silinse bile bir daha sorulmaz. (Eskiden anahtar yalnız tarayıcı belleğinde duruyordu. iPhone Safari bu belleği bir hafta
girilmeyen sitelerde, gizli sekmede ve WhatsApp/Facebook içinden açılan tarayıcıda kapanınca siliyordu: anahtarın her girişte yeniden
istenmesinin sebebi buydu.) Panelde üstteki **Giriş** düğmesinden bağlantı kopyalanabilir ya da çıkış yapılabilir.

Anahtar oluşturmak:

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Expiration: en uzun süreyi seçin (süresi dolunca panel "süresi dolmuş" der, yeni bağlantı gerekir)
3. Repository access: **Only select repositories** → `sguven/cesnigir-der`
4. Permissions → Repository permissions → **Contents: Read and write** (başka izin gerekmez)

Bağlantı anahtarı taşır: yalnızca yöneticiye gönderin. Telefon kaybolursa ya da bağlantı başkasına gittiyse GitHub'dan anahtarı silmeniz yeterli;
panel sayfası adres çubuğundaki anahtarı başka sitelere göndermez (`referrer` kapalı).

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html`, `site.css`, `app.js` | Site |
| `style.css`, `ortak.js` | Site ve panelin ortak görünümü ve yardımcıları |
| `yonetim/` | Yönetim paneli (sitenin düzenleme modu) |
| `data/duyurular.json` | Duyurular, vefat/düğün ilanları, haberler ve "Tarihten" yazıları (sitede dosyadaki sırayla görünür: en son eklenen en üstte). Tarihten yazılarında `olay_tarihi` kartta yayın tarihinin yerine gösterilir; `fotolar` ek fotoğraflardır (`ust: true` olan kapağın altında çıkar) |
| `data/etkinlikler.json` | Takvimdeki köy etkinlikleri |
| `data/resmi-gunler.json` | Resmî bayramlar ve dinî günler (2026-2027) |
| `data/galeri.json` | Fotoğraflar |
| `data/pazar.json` | Pazar ve yardımlaşma ilanları |
| `data/dernek.json` | Hakkımızda, başkan, yönetim ve denetim kurulu, iletişim, kasa durumu |

## Kısa paylaşım bağlantıları

WhatsApp ve Facebook'ta paylaşılan bağlantı kısadır: `https://cesnigirder.org/d/k3f9xa` (duyuru), `/e/…` (etkinlik), `/i/…` (pazar ilanı).
Her kodun dosyası (`d/k3f9xa.html`) önizleme başlığını ve fotoğrafını taşır, açanı doğrudan kayda götürür.
Dosyaları panel kaydederken ve gece görevi (`node araclar/site-sayfalari.js`) yazar; eski kodlar silinmez.
Dosyası henüz yazılmamış bir kod açılırsa `404.html` kaydı bulup ona gider.

Telefonda "WhatsApp'ta paylaş": Android'de paylaşım ekranı fotoğraf ve yazıyla birlikte açılır. iPhone'da WhatsApp paylaşım ekranından tek mesajda ikisini birden almadığı için doğrudan WhatsApp açılır: başlık, bilgiler ve bağlantı tek mesajda gider, fotoğraf bağlantının önizlemesinde çıkar (kısa bağlantı sayfasındaki og:image; boyutu da yazılır). Önizleme fotoğrafları 300 KB'ı geçmemeli (WhatsApp sınırı); fotoğrafı olmayan kayıtlarda `images/kapak-paylasim.jpg` kullanılır.

## Sürüm eki

Sayfalardaki `site.css?v=…`, `app.js?v=…` gibi ekler, yeni sürüm yayınlanınca telefonda eski dosyanın kalmamasını sağlar.
Bir `.js` ya da `.css` dosyası değişince o sayfanın `index.html` dosyasındaki `?v=` değerini de değiştirin.

## Bilgisayarda denemek

```
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini açın.

## Arama motorları (Google) ve paylaşım sayfaları

Her bölümün ve her kaydın gerçek bir adresi vardır; arama motorları içeriği bu sayfalardan okur, WhatsApp ve Facebook da önizlemedeki
fotoğrafı ve başlığı buradan alır:

- `gezilecek-yerler/`, `hakkimizda/`, `duyurular/`, `etkinlikler/`, `fotograflar/`, `iletisim/`: bölüm sayfaları
- `p/d-….html` duyuru ve haberler, `p/e-….html` etkinlikler (aramaya açık); `p/i-….html` pazar ilanları (telefon içerdiği için aramaya kapalı)
- `sitemap.xml` sayfa ve fotoğraf listesi, `robots.txt` bu listeyi arama motorlarına gösterir

Bu dosyalar elle düzenlenmez; hepsini şu komut üretir (içerik, `index.html`, `app.js` ya da `site.css` değişince çalıştırın):

    node araclar/site-sayfalari.js

Gece çalışan bölge haberleri görevi komutu her gece çalıştırır. Yönetim paneli yeni bir kaydı yayınlarken yalnızca basit bir paylaşım
sayfası yazar; kaydın aramaya açık tam sayfası o gece üretilir.

## Bölge haberleri ve kapak görselleri

Her gece bir zamanlanmış görev Köprüköy, Keskin, Kırıkkale ve Ankara'dan köylüyü ilgilendiren yeni haber ve duyuruları `data/duyurular.json`'a ekler
(her birinde `kaynak` ve `link` alanı olur). Gazete fotoğrafları kullanılmaz; kapak görseli sitenin tarzında üretilir:

    python3 araclar/haber-gorseli.py <ad> <tema> "<ETİKET>" "<alt satır>"

Görsel `images/gorsel-<ad>.jpg` olarak kaydedilir. Temalar ve renkleri dosyanın başında yazılı (yol, tarim, belge, ev, su, elektrik, saglik, egitim, kultur, hava, duyuru).

## Ziyaretçi istatistikleri

Sayaç GoatCounter ile çalışır: https://cesnifirder.goatcounter.com (giriş Serhat'ın hesabıyla).
Kod `app.js` dosyasının başında; yalnız cesnigirder.org adresinde sayar, yönetim paneli sayılmaz.
Kısa paylaşım bağlantısından gelenler "Paylaşılan bağlantı (WhatsApp/Facebook)" kaynağıyla görünür.
