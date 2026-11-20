# Çeşnigir-Der web sitesi

Köprüköy Çeşnigir Kültür Sosyal Yardımlaşma ve Dayanışma Derneği'nin sitesi.
Sade bir statik sitedir: sunucu, veritabanı veya derleme adımı yoktur. GitHub Pages ile yayınlanır.

## Klasörler

| Dosya veya klasör | Ne işe yarar |
|---|---|
| `index.html` | Sayfanın iskeleti ve değişmeyen metinler (tarihçe, köy bilgileri, harita) |
| `style.css` | Görünüm |
| `app.js` | `data/` içindeki dosyaları okuyup sayfaya yerleştirir |
| `data/` | Değişen tüm içerik burada |
| `images/` | Fotoğraflar |

## İçerik nerede değişir?

| Sayfadaki bölüm | Dosya |
|---|---|
| Haberler | `data/haberler.json` |
| Açılışımızdan Fotoğraflar | `data/galeri.json` |
| Köyden İlanlar | `data/ilanlar.json` |
| Köy takvimi ve yaklaşan günler | `data/takvim.json` |
| Pazar ve Yardım İlanları | `data/pazar.json` |
| Gezilecek Yerler | `data/gezi.json` |
| Hakkımızda (başkan, ek metin) ve İletişim | `data/genel.json` |
| Finansal Durum | `data/finans.json` |
| Resmî bayramlar ve dinî günler | `data/resmi-gunler.json` (nadiren değişir) |

Kurallar:

- Listelerdeki sıra sayfadaki sıradır. Haberlerde ilk kayıt büyük kart olur, diğerleri yandaki listeye girer. Yeni haber en üste eklenir.
- Takvimde tarih `2026-12-05` biçiminde yazılır (yıl-ay-gün).
- Fotoğraflar `images/` klasörüne konur, dosyaya `images/dosya-adi.jpg` diye başvurulur. Telefondan çekilen fotoğrafları yüklemeden önce küçültmek (en fazla 1800 piksel genişlik) siteyi hızlı tutar.
- Bir kutuyu boş bırakmak o satırı gizler (örneğin fotoğrafsız haber).

## Yayına almadan önce

Şu an veri dosyalarında köşeli parantezli yer tutucular var, örneğin `[TARİH]`, `[AD SOYAD]`, `[TUTAR]`. Bunlar önceki tasarımdan aynen taşındı. Site halka açılmadan önce gerçek bilgilerle değiştirilmeli veya silinmelidir. Takvimdeki "(örnek)" etkinlikleri de öyle.

## Bilgisayarda denemek

Tarayıcıda `index.html` dosyasına çift tıklamak yetmez, çünkü sayfa veri dosyalarını `fetch` ile okur. Klasörde şunu çalıştırın:

```
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini açın.
