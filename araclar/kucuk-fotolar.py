"""Fotoğrafların telefon için küçük kopyalarını üretir: images/kucuk/ altında, aynı adla (en uzun kenar 800 piksel).

Site, listelerde ve kartlarda (duyurular, fotoğraflar, market, esnaf rehberi, gezilecek yerler) bu küçük kopyayı gösterir;
fotoğrafa dokununca büyük hâli açılır. Küçük kopya henüz yoksa site kendiliğinden büyük fotoğrafı gösterir.

Yalnız eksik kopyaları üretir; tekrar tekrar çalıştırmak güvenlidir. Var olan bir fotoğrafı aynı adla değiştirdiyseniz
hepsini yeniden üretin:

    python3 araclar/kucuk-fotolar.py            # eksikler
    python3 araclar/kucuk-fotolar.py --hepsi    # hepsi

Panelden yeni fotoğraf yüklenince GitHub'daki "Küçük fotoğraflar" görevi bunu kendiliğinden çalıştırır."""
import os
import sys
from PIL import Image, ImageOps

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RESIM = os.path.join(KOK, 'images')
HEDEF = os.path.join(RESIM, 'kucuk')
UZUN = 800
HEPSI = '--hepsi' in sys.argv

yeni = 0
for klasor, alt, dosyalar in os.walk(RESIM):
    if os.path.abspath(klasor).startswith(os.path.abspath(HEDEF)):
        continue
    for ad in dosyalar:
        if not ad.lower().endswith(('.jpg', '.jpeg')):
            continue
        kaynak = os.path.join(klasor, ad)
        hedef = os.path.join(HEDEF, os.path.relpath(kaynak, RESIM))
        if os.path.exists(hedef) and not HEPSI:
            continue
        try:
            im = ImageOps.exif_transpose(Image.open(kaynak)).convert('RGB')
        except Exception as e:  # bozuk dosya: atla, büyük hâli gösterilir
            print('atlandı:', kaynak, e, file=sys.stderr)
            continue
        im.thumbnail((UZUN, UZUN), Image.LANCZOS)
        os.makedirs(os.path.dirname(hedef), exist_ok=True)
        im.save(hedef, 'JPEG', quality=74, optimize=True, progressive=True)
        yeni += 1
print(yeni, 'küçük fotoğraf üretildi')
