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

- Panel değişiklikleri doğrudan bu depodaki `data/` dosyalarına kaydeder. Site 1-2 dakika içinde güncellenir.
- Telefondan yüklenen fotoğraflar otomatik küçültülür (en fazla 1600 piksel) ve `images/yuklenen/` klasörüne gider.
- Panel, her telefona bir kez girilen bir GitHub erişim anahtarıyla çalışır (aşağıya bakın).

**Yedek:** Pages CMS (https://app.pagescms.org) aynı dosyaları düzenleyebilir. Ayarı `.pages.yml` içinde.

## Panel için giriş anahtarı

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Repository access: **Only select repositories** → `sguven/cesnigir-der`
3. Permissions → Repository permissions → **Contents: Read and write** (başka izin gerekmez)
4. Oluşan anahtarı panelin "Giriş anahtarı" kutusuna bir kez yapıştırın.

Anahtar yalnızca o telefonun tarayıcısında saklanır. Telefon kaybolursa GitHub'dan anahtarı silmeniz yeterli; panel o telefonda çalışmayı bırakır.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html`, `site.css`, `app.js` | Site |
| `style.css`, `ortak.js` | Site ve panelin ortak görünümü ve yardımcıları |
| `yonetim/` | Yönetim paneli |
| `data/duyurular.json` | Duyurular, vefat/düğün ilanları, haberler (sitede dosyadaki sırayla görünür: en son eklenen en üstte) |
| `data/etkinlikler.json` | Takvimdeki köy etkinlikleri |
| `data/resmi-gunler.json` | Resmî bayramlar ve dinî günler (2026-2027) |
| `data/galeri.json` | Fotoğraflar |
| `data/pazar.json` | Pazar ve yardımlaşma ilanları |
| `data/dernek.json` | Hakkımızda, başkan, yönetim ve denetim kurulu, iletişim, kasa durumu |

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
