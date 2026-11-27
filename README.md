# Çeşnigir-Der web sitesi

Köprüköy Çeşnigir Kültür Sosyal Yardımlaşma ve Dayanışma Derneği'nin sitesi.
Adres: https://cesnigirder.org/ (alan adı GoDaddy'den; eski https://sguven.github.io/cesnigir-der/ adresi buraya yönlenir)

Sade, telefon öncelikli bir statik site. Alan adı ayarı kökteki `CNAME` dosyasında. GitHub Pages ile yayınlanır; sunucu yok.
Tek veritabanı Sizden Gelenler (forum) ve yorumlar içindir: Supabase'de durur (aşağıda).

## Tasarım

Ana adreste Tasarım 3 yayında (klasik dernek sitesi, üstte menü, ayrı sayfalar): `index.html`, `site.css`, `app.js`.

Denenen diğer iki tasarım `arsiv/` klasöründe saklanıyor (`arsiv/site1/`, `arsiv/site2/`); siteden bağlantı verilmez.
Eski `site3/` adresi ana adrese yönlendirir, daha önce paylaşılan bağlantılar çalışmaya devam eder.

## İçerik nasıl değişir?

**Yönetim paneli:** https://cesnigirder.org/yonetim/

- Panel sitenin kendisidir, düzenleme modunda: yönetici siteyi ziyaretçi gibi gezer. Her duyurunun, etkinliğin, market ilanının ve
  fotoğrafın yanında **Düzenle** / **Sil**, her bölümün başında **Yeni … ekle** düğmesi vardır; sağ alttaki **Ekle** düğmesi de her yerden açılır.
  Hakkımızda ve ana sayfadaki kutuların (dernek bilgileri, kurullar, kasa, canlı görüntü) köşesindeki **Düzenle** yalnız o kutunun bilgilerini açar.
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

Birden fazla yönetici için her kişiye ayrı bağlantı verin; sonuna adını ekleyin: `…/yonetim/?k=ANAHTAR&ad=Sedat`.
Ad, GitHub'daki değişiklik kaydına yazılır ("Panel (Sedat): duyuru eklendi"). En iyisi her kişiye ayrı anahtar oluşturmaktır
(GitHub'da anahtarın adına kişinin adını yazın): biri bırakınca yalnız onun anahtarı silinir, diğerleri çalışmaya devam eder.

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
| `data/rehber.json` | Esnaf Rehberi: işletme kartları |
| `data/dernek.json` | Hakkımızda, başkan, yönetim ve denetim kurulu, iletişim, kasa durumu |
| `araclar/supabase-meydan.sql` | Sizden Gelenler, yorumlar, Market ve Esnaf Rehberi istekleri veritabanı (Supabase) kurulumu |

## Sizden Gelenler (forum)

Sitedeki **Sizden Gelenler** sayfasında (`#/meydan`, yazı sayfası `#/konu/12`) ziyaretçiler adını ve soyadını yazarak yazı paylaşır,
birbirlerinin yazısına cevap yazar. Konular: Genel Sohbet, Hatıralar, Gurbettekiler, Soru-Cevap.

- **Her yazı ve cevap önce onaya düşer.** Yönetim panelinde Sizden Gelenler sayfasının en üstünde "Onay bekleyenler" kutusu çıkar
  (cevaplar ayrıca kendi yazısının sayfasında); menüde Sizden Gelenler'in yanında kırmızı sayı görünür. **Onayla, yayınla** ya da **Sil**.
  Yayındaki yazılarda **En üste sabitle** ve **Yazıyı sil**, cevaplarda **Cevabı sil** düğmesi vardır.
- Yazılar Supabase'de durur: proje `cesnigir-der` (https://supabase.com/dashboard/project/hdztvyindbhhpveukvox), ücretsiz plan.
  Ücretsiz planda proje 7 gün hiç kullanılmazsa duraklatılır; panelden tek tıkla açılır, yazılar silinmez.
- Veritabanı kurulumu ve kuralları: `araclar/supabase-meydan.sql` (Supabase → SQL Editor'de çalıştırılır; tekrar çalıştırmak zararsızdır).
  Ziyaretçi yalnız yayındakileri okur ve yalnız "bekliyor" olarak yazabilir. Onay, silme ve sabitleme için panel yöneticinin GitHub giriş
  anahtarını veritabanına gönderir; veritabanı GitHub'a bu anahtarın siteye yazma izni olup olmadığını sorar. Anahtar saklanmaz.
- **Fotoğraf:** yazıya ve cevaba en çok 4 fotoğraf eklenebilir. Fotoğraf telefonda küçültülür (uzun kenar 1600, JPEG), Supabase deposundaki
  herkese açık `meydan` kovasına yüklenir; tabloda yalnız dosya yolu durur (`fotolar` sütunu). Onay bekleyenler kutusunda fotoğraflar da görünür.
  Yazı silinince dosyası depoda kalır (sitede görünmez); yer açmak gerekirse Supabase → Storage → meydan'dan elle silinir (ücretsiz plan 1 GB).
  Kurulum çalıştırılmadıysa (sütun yoksa) site fotoğraf düğmesini gizler, bölüm fotoğrafsız çalışır.
- Sitedeki bağlantı bilgisi (herkese açık "publishable" anahtar) `ortak.js` içinde `MEYDAN`. Supabase'in **secret** anahtarı hiçbir yere yazılmaz.
- Paylaşılan bağlantı `https://cesnigirder.org/?m=12` yazının sayfasını açar.
- Kod: `app.js` (Sizden Gelenler bölümü), panel tarafı `yonetim/duzen.js` (Sizden Gelenler: onay).

## Yorumlar (haberler, etkinlikler, fotoğraflar)

Her duyurunun/haberin, etkinliğin ve fotoğrafın sayfasının altında yorum bölümü vardır; ziyaretçi adını ve soyadını yazarak yorum bırakır.
Vefat ilanlarında bölümün adı **Başsağlığı dilekleri**, düğün ve nişanda **Tebrik ve dilekler**dir.

- Fotoğrafların kendi sayfası var: `#/foto/<dosya adı>` (örnek `#/foto/galeri-01`). Galeride fotoğrafı büyütünce üstteki **Yorumlar** düğmesi oraya götürür.
- Yorumu olan haber kartlarında, etkinliklerde ve galeri fotoğraflarında küçük bir yorum sayısı görünür.
- Yorumlar da önce onaya düşer. Panelde üst şeritte kırmızı **Onay bekleyen** sayısı çıkar; ana sayfanın en üstündeki "Onay bekleyenler"
  kutusunda Sizden Gelenler yazıları, cevaplar ve bütün yorumlar birlikte listelenir (her kaydın kendi sayfasında da o kayda gelenler görünür).
- Yorumlar `yorumlar` tablosunda; kaydın kimliğiyle (duyuru ve etkinlikte adresindeki kimlik, fotoğrafta dosya adı) bağlanır.
  Bir duyurunun başlığı ya da tarihi değişirse adresi de değişir; eski yorumları o kayıtta görünmez olur (silinmez).

## Market: ziyaretçinin ilan isteği

Market sayfasındaki **İlan ver** düğmesiyle ziyaretçi kendi ilanını gönderir: tür, başlık, fiyat, açıklama, en çok 4 fotoğraf, adı ve telefonu.

- İstek önce onaya düşer (Supabase, `pazar_istekleri` tablosu). Ziyaretçiler bu tabloyu okuyamaz; telefonlar onaydan önce yalnız yöneticiye görünür.
- Panelde üst şeritteki **Onay bekleyen** sayısına ve menüde Market'in yanındaki kırmızı sayıya eklenir; ana sayfadaki ve Market sayfasındaki
  "Onay bekleyenler" kutusunda **Onayla, yayınla** / **Sil** ile görünür.
- Onaylanınca panel fotoğrafları `images/yuklenen/` klasörüne aktarır, ilanı öteki ilanlar gibi `data/pazar.json`'a yazar (ilk fotoğraf kapak,
  kalanı `fotolar`; ilanın sayfasında küçük kareler olarak çıkar), paylaşım sayfasını üretir ve isteği veritabanından siler.
  Yayınlanan ilan sıradan bir ilandır: **Düzenle** / **Sil** ile değiştirilir.
- Kurulum `araclar/supabase-meydan.sql` içinde. Dosya Supabase'de çalıştırılmadıysa (tablo yoksa) site **İlan ver** düğmesini göstermez.
- Kod: `app.js` (Market: ziyaretçinin ilan isteği), panel tarafı `yonetim/duzen.js` (`ilanYayinla`).

## Esnaf Rehberi (işletme kartları)

**Esnaf Rehberi** sayfasında (`#/rehber`, kaydın sayfası `#/isletme/<kimlik>`) köylülerin dükkân, restoran, sanayi, okul ve hizmet işletmeleri
kartvizit ya da dükkân fotoğrafıyla, adresi, telefonu (Ara / WhatsApp) ve varsa web ya da Instagram adresiyle yer alır. Kayıtlar `data/rehber.json`'da durur.

- Ziyaretçi sayfadaki **İşletmenizi ekleyin** formuyla kendi kaydını gönderir; düzen Market ilan isteğiyle aynıdır: istek Supabase'de
  `rehber_istekleri` tablosunda bekler, panelde "Onay bekleyenler" kutusunda **Onayla, yayınla** / **Sil** ile görünür, onaylanınca `data/rehber.json`'a yazılır.
- Yönetici panelden de doğrudan ekleyebilir (**Yeni işletme ekle**), yayındaki kaydı **Düzenle** / **Sil** ile değiştirir.
- Paylaşım bağlantısı `https://cesnigirder.org/r/…` (WhatsApp ve Facebook önizlemesinde kartvizit çıkar).
- Türler `ortak.js` içinde `REHBER_TURLERI`; değişirse `araclar/supabase-meydan.sql`'deki liste de değişmeli.
  Kasım 2026'da türler işe göre yenilendi (Otomotiv, Sanayi & İnşaat, Tarım & Hayvancılık, Gıda & Yeme-İçme, Hizmetler, Diğer); eski türler `C.rehberTur` ile yenisine çevrilir.
  Var olan veritabanında bir kez `araclar/supabase-rehber-turleri.sql` çalıştırılmalı.

## Kısa paylaşım bağlantıları

WhatsApp ve Facebook'ta paylaşılan bağlantı kısadır: `https://cesnigirder.org/d/k3f9xa` (duyuru), `/e/…` (etkinlik), `/i/…` (pazar ilanı), `/r/…` (Esnaf Rehberi kaydı).
Her kodun dosyası (`d/k3f9xa.html`) önizleme başlığını ve fotoğrafını taşır, açanı doğrudan kayda götürür.
Dosyaları panel kaydederken ve gece görevi (`node araclar/site-sayfalari.js`) yazar; eski kodlar silinmez.
Dosyası henüz yazılmamış bir kod açılırsa `404.html` kaydı bulup ona gider.

Telefonda "WhatsApp'ta paylaş": Android'de paylaşım ekranı fotoğraf ve yazıyla birlikte açılır. iPhone'da WhatsApp paylaşım ekranından tek mesajda ikisini birden almadığı için doğrudan WhatsApp açılır: başlık, bilgiler ve bağlantı tek mesajda gider, fotoğraf bağlantının önizlemesinde çıkar (kısa bağlantı sayfasındaki og:image; boyutu da yazılır). Önizleme fotoğrafları 300 KB'ı geçmemeli (WhatsApp sınırı); fotoğrafı olmayan kayıtlarda `images/kapak-paylasim.jpg` kullanılır.

## Keskin FM canlı radyo

Ana sayfada canlı görüntünün altındaki "Keskin FM 102.1" düğmesi, radyonun canlı yayınını çalar (`app.js` içinde `RADYO` adresi:
`https://keskinfm.com/api/stream`). Ses yalnızca düğmeye basınca başlar; kaydırırken ve sayfalar arasında gezerken sürer; bir kez açıldıktan sonra sağ altta küçük bir düğme kalır: çalarken durdurur, durmuşken yeniden başlatır.
Bu adres Keskin FM'in kendi sitesinin kullandığı adrestir; radyo adresi değiştirirse düğme "Yayına şu an ulaşılamıyor" der, `RADYO` değerini
yeni adresle değiştirmek yeter. Düğmeyi kaldırmak için `pageHome` içindeki `radyoHtml()` çağrısını silin.

## Telefon hızı

- Listelerde ve kartlarda fotoğrafların küçük kopyaları (`images/kucuk/`, en uzun kenar 800 px) gösterilir; dokununca büyük hâli açılır.
  Kopyaları `python3 araclar/kucuk-fotolar.py` üretir; panelden fotoğraf yüklenince GitHub'daki "Küçük fotoğraflar" görevi kendiliğinden çalıştırır.
  Kopya henüz yoksa site büyük fotoğrafı gösterir.
- `sw.js` (telefon hafızası) yalnız fotoğrafları ve yazı tiplerini telefonda saklar; sayfalara, `data/` dosyalarına, `app.js` ve `site.css`'e dokunmaz.
  Kapatma yolu dosyanın başında yazılı.

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

- `gezilecek-yerler/`, `tarihimiz/`, `hakkimizda/`, `duyurular/`, `etkinlikler/`, `fotograflar/`: bölüm sayfaları (`iletisim/` eski bağlantılar için Hakkımızda'ya yönlendirir)
- `p/d-….html` duyuru ve haberler, `p/e-….html` etkinlikler (aramaya açık); `p/i-….html` pazar ilanları (telefon içerdiği için aramaya kapalı)
- `sitemap.xml` sayfa ve fotoğraf listesi, `robots.txt` bu listeyi arama motorlarına gösterir

Bu dosyalar elle düzenlenmez; hepsini şu komut üretir (içerik, `index.html`, `app.js` ya da `site.css` değişince çalıştırın):

    node araclar/site-sayfalari.js

Gece çalışan bölge haberleri görevi komutu her gece çalıştırır. Yönetim paneli yeni bir kaydı yayınlarken yalnızca basit bir paylaşım
sayfası yazar; kaydın aramaya açık tam sayfası o gece üretilir.

## Instagram paylaşımı

Derneğin Instagram hesabına sitedeki yeni kayıtlar (duyuru, haber, vefat ve düğün ilanı, etkinlik, pazar ilanı) otomatik paylaşılır:
bir zamanlanmış görev Türkiye saatiyle 08.40, 12.40 ve 20.40'ta çalışır, her seferinde en çok 2 kaydı akışa (tek görsel ya da kaydırmalı gönderi)
ve hikâyeye atar. Önce panelden girilenler, sonra bölge haberleri paylaşılır.

- `node araclar/instagram.js bekleyen` paylaşılmamış kayıtları listeler; `hazirla [adet]` görselleri (`images/instagram/`, akış 1080x1350 ve
  hikâye 1080x1920) ve açıklamayı üretir; `isaretle <kimlik>…` paylaşılanı `data/instagram.json`'a yazar.
- Bir kaydın paylaşılmasını istemiyorsanız kimliğini `isaretle` ile önceden işaretleyin. Başlığı ya da tarihi değişen kayıt yeni sayılır.
- Paylaşım Windsor.ai bağlantısıyla yapılır (Instagram hesap kimliği `17841441974005717`).

## Bölge haberleri ve kapak görselleri

Her gece bir zamanlanmış görev Köprüköy, Keskin, Kırıkkale ve Ankara'dan köylüyü ilgilendiren yeni haber ve duyuruları `data/duyurular.json`'a ekler
(her birinde `kaynak` ve `link` alanı olur).

**Haberin kendi fotoğrafı:** kayda `"foto_indir": true` yazılırsa (isteğe bağlı `"foto_url"` ile doğrudan fotoğraf adresi; yoksa haber sayfasındaki
og:image alınır) GitHub Actions'taki **Haber fotoğrafları** iş akışı (`.github/workflows/haber-fotolari.yml`, `araclar/haber-foto-indir.py`)
fotoğrafı indirir, küçültür (en fazla 1200 piksel, 250 KB altı), `images/haber/` klasörüne kaydeder, kaydın `foto` alanını ona çevirir,
`foto_aciklama`ya "Fotoğraf: <kaynak>" yazar ve paylaşım sayfalarını yeniden üretip yayınlar (2-4 dakika). İndirilemezse eski kapak görseli kalır.
Elle çalıştırmak: GitHub → Actions → Haber fotoğrafları → Run workflow.

**Yedek kapak görseli** (her habere önce bu konur, fotoğraf indirilemezse o kalır) sitenin tarzında üretilir:

    python3 araclar/haber-gorseli.py <ad> <tema> "<ETİKET>" "<alt satır>"

Görsel `images/gorsel-<ad>.jpg` olarak kaydedilir. Temalar ve renkleri dosyanın başında yazılı (yol, tarim, belge, ev, su, elektrik, saglik, egitim, kultur, hava, duyuru).

## Ziyaretçi istatistikleri

Sayaç GoatCounter ile çalışır: https://cesnifirder.goatcounter.com (giriş Serhat'ın hesabıyla).
Kod `app.js` dosyasının başında; yalnız cesnigirder.org adresinde sayar, yönetim paneli sayılmaz.
Kısa paylaşım bağlantısından gelenler "Paylaşılan bağlantı (WhatsApp/Facebook)" kaynağıyla görünür.
