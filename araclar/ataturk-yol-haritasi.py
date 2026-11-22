#!/usr/bin/env python3
"""Mustafa Kemal Paşa'nın Sivas–Ankara yolculuğu (18-27 Aralık 1919) haritasını çizer.

Çıktı: images/ataturk-yol-haritasi.jpg (1600x960). Konumlar yaklaşık, şema niteliğindedir.
Kullanım: python3 araclar/ataturk-yol-haritasi.py
"""
import math, os
from playwright.sync_api import sync_playwright

W, H = 1600, 960
LON0, LON1, LAT0, LAT1 = 32.30, 35.90, 38.52, 40.08
KX = W / ((LON1 - LON0) * math.cos(math.radians(39.3)))
KY = H / (LAT1 - LAT0)
# İki eksenin ölçeği eşit kalsın diye küçük olanı kullan
K = min(KX, KY)
OX = (W - (LON1 - LON0) * math.cos(math.radians(39.3)) * K) / 2
OY = (H - (LAT1 - LAT0) * K) / 2

def p(lat, lon):
    return (OX + (lon - LON0) * math.cos(math.radians(39.3)) * K, OY + (LAT1 - lat) * K)

def path(points):
    pts = [p(*q) for q in points]
    d = 'M%.1f %.1f' % pts[0]
    # yumuşak çizgi: Catmull-Rom -> Bezier
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += ' C%.1f %.1f %.1f %.1f %.1f %.1f' % (c1 + c2 + p2)
    return d

# Kızılırmak (şematik)
RIVER = [(38.70, 35.90), (38.90, 35.58), (38.88, 35.25), (38.77, 34.95), (38.72, 34.63),
         (38.78, 34.30), (38.93, 33.95), (39.10, 33.66), (39.26, 33.47), (39.40, 33.37),
         (39.58, 33.42), (39.72, 33.47), (39.86, 33.50), (40.08, 33.56)]

KAYSERI, MUCUR, HACIBEKTAS = (38.72, 35.49), (39.06, 34.38), (38.94, 34.56)
KIRSEHIR, KAMAN, KOPRU = (39.15, 34.16), (39.36, 33.72), (39.583, 33.44)
BALA, BEYNAM, GOLBASI, ANKARA = (39.555, 33.12), (39.665, 32.94), (39.79, 32.81), (39.93, 32.86)

ROUTE_A = [(39.20, 35.86), (38.92, 35.68), KAYSERI]                    # Sivas yönünden Kayseri'ye
ROUTE_B = [KAYSERI, (38.95, 35.00), (39.03, 34.62), MUCUR]               # Kayseri - Mucur
ROUTE_C = [MUCUR, (38.99, 34.49), HACIBEKTAS]                            # Mucur - Hacıbektaş (gidiş dönüş)
ROUTE_D = [MUCUR, (39.12, 34.27), KIRSEHIR, (39.27, 33.93), KAMAN,
           (39.47, 33.57), KOPRU, (39.57, 33.28), BALA, (39.61, 33.02), BEYNAM,
           (39.73, 32.86), GOLBASI, (39.87, 32.83), ANKARA]

TOWNS = [
    # ad, konum, alt satır, etiket kaydırma (dx, dy), hizalama
    ('Kayseri', KAYSERI, '19–21 Aralık', (0, 50), 'middle'),
    ('Mucur', MUCUR, '21 ve 23 Aralık', (22, -46), 'start'),
    ('Hacıbektaş', HACIBEKTAS, '22 Aralık', (0, 62), 'middle'),
    ('Kırşehir', KIRSEHIR, '24 Aralık', (-20, 58), 'end'),
    ('Kaman', KAMAN, '25 Aralık', (28, -6), 'start'),
    ('Beynam', BEYNAM, '26 Aralık gecesi', (-28, 44), 'end'),
    ('Ankara', ANKARA, '27 Aralık 1919', (30, 12), 'start'),
]
GREY = [('Keskin', (39.673, 33.613)), ('Kırıkkale', (39.846, 33.515)), ('Bala', BALA), ('Gölbaşı', GOLBASI)]

def build():
    svg = []
    rx, ry = p(39.42, 33.36)
    svg.append('<path d="%s" fill="none" stroke="#9CC3D9" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>' % path(RIVER))
    svg.append('<path d="%s" fill="none" stroke="#3C7FA6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' % path(RIVER))
    lx, ly = p(39.12, 33.40)
    svg.append('<text x="%.0f" y="%.0f" class="river" transform="rotate(52 %.0f %.0f)" text-anchor="middle">Kızılırmak</text>' % (lx, ly, lx, ly))

    for name, (lat, lon) in GREY:
        x, y = p(lat, lon)
        svg.append('<circle cx="%.0f" cy="%.0f" r="7" fill="#A3978A"/>' % (x, y))
        dx = -16 if name in ('Bala', 'Gölbaşı') else 16
        anchor = 'end' if dx < 0 else 'start'
        dy = 30 if name == 'Bala' else 9
        svg.append('<text x="%.0f" y="%.0f" class="grey" text-anchor="%s">%s</text>' % (x + dx, y + dy, anchor, name))

    for pts, dash in ((ROUTE_A, '2 16'), (ROUTE_B, ''), (ROUTE_C, ''), (ROUTE_D, '')):
        svg.append('<path d="%s" fill="none" stroke="#FAF6EF" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' % path(pts))
        extra = ' stroke-dasharray="%s"' % dash if dash else ''
        svg.append('<path d="%s" fill="none" stroke="#7A2E1C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"%s marker-mid="url(#ok)"/>' % (path(pts), extra))

    # yön okları: rotanın birkaç noktasında
    def arrow(a, b):
        (x1, y1), (x2, y2) = p(*a), p(*b)
        ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        return '<path d="M-13 -11 L9 0 L-13 11 Z" fill="#7A2E1C" stroke="#FAF6EF" stroke-width="3" transform="translate(%.0f %.0f) rotate(%.0f)"/>' % (mx, my, ang)
    for a, b in ((KAYSERI, (38.95, 35.00)), ((39.03, 34.62), MUCUR), (KIRSEHIR, (39.27, 33.93)),
                 (KAMAN, (39.47, 33.57)), (KOPRU, (39.57, 33.28)), ((39.61, 33.02), BEYNAM), (GOLBASI, (39.87, 32.83))):
        svg.append(arrow(a, b))

    sx, sy = p(39.20, 35.86)
    svg.append('<text x="%.0f" y="%.0f" class="lbl" text-anchor="end">Sivas\'tan</text>' % (sx - 44, sy - 34))
    svg.append('<text x="%.0f" y="%.0f" class="sub" text-anchor="end">18 Aralık</text>' % (sx - 44, sy - 6))

    for name, (lat, lon), sub, (dx, dy), anchor in TOWNS:
        x, y = p(lat, lon)
        svg.append('<circle cx="%.0f" cy="%.0f" r="13" fill="#FAF6EF" stroke="#7A2E1C" stroke-width="6"/>' % (x, y))
        svg.append('<text x="%.0f" y="%.0f" class="lbl" text-anchor="%s">%s</text>' % (x + dx, y + dy - 26, anchor, name))
        svg.append('<text x="%.0f" y="%.0f" class="sub" text-anchor="%s">%s</text>' % (x + dx, y + dy + 4, anchor, sub))

    # Köprüköy: öne çıkan işaret ve bilgi kutusu
    x, y = p(*KOPRU)
    svg.append('<circle cx="%.0f" cy="%.0f" r="34" fill="#B8862E" opacity=".25"/>' % (x, y))
    svg.append('<circle cx="%.0f" cy="%.0f" r="19" fill="#B8862E" stroke="#5A1F12" stroke-width="6"/>' % (x, y))
    bx, by = x + 230, y - 90
    svg.append('<path d="M%.0f %.0f L%.0f %.0f" stroke="#5A1F12" stroke-width="4"/>' % (x + 20, y - 4, bx, by + 70))
    svg.append('<rect x="%.0f" y="%.0f" width="500" height="140" rx="14" fill="#5A1F12"/>' % (bx, by))
    svg.append('<text x="%.0f" y="%.0f" class="kb">KÖPRÜKÖY</text>' % (bx + 26, by + 50))
    svg.append('<text x="%.0f" y="%.0f" class="ks">Çeşnigir Köprüsü · 26 Aralık 1919</text>' % (bx + 26, by + 90))
    svg.append('<text x="%.0f" y="%.0f" class="kn">Keskinli süvarilerin korumasında</text>' % (bx + 26, by + 123))

    # kuzey oku
    nx, ny = W - 80, 330
    svg.append('<path d="M%d %d l-16 40 l16 -10 l16 10 z" fill="#5A4C40"/>' % (nx, ny))
    svg.append('<text x="%d" y="%d" class="grey" text-anchor="middle">K</text>' % (nx, ny - 12))
    return '\n'.join(svg)

def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    out = os.path.join(root, 'images', 'ataturk-yol-haritasi.jpg')
    page = '''<html><head><style>
body{margin:0}
.map{width:%dpx;height:%dpx;position:relative;background:radial-gradient(ellipse at 45%% 50%%,#FBF7F0 0%%,#F3EAD9 75%%,#E9DCC4 100%%);
 font-family:"Source Sans 3","DejaVu Sans",sans-serif;overflow:hidden}
.map:after{content:"";position:absolute;inset:14px;border:3px solid #7A2E1C;border-radius:6px;pointer-events:none}
svg{position:absolute;inset:0}
.lbl{font-size:38px;font-weight:800;fill:#231A14;paint-order:stroke;stroke:#FAF6EF;stroke-width:8px;stroke-linejoin:round}
.sub{font-size:28px;font-weight:600;fill:#7A2E1C;paint-order:stroke;stroke:#FAF6EF;stroke-width:7px;stroke-linejoin:round}
.grey{font-size:27px;font-weight:600;fill:#7C7064;paint-order:stroke;stroke:#FAF6EF;stroke-width:6px;stroke-linejoin:round}
.river{font-size:30px;font-style:italic;font-weight:600;fill:#2F6F96;paint-order:stroke;stroke:#FAF6EF;stroke-width:6px}
.kb{font-size:44px;font-weight:800;fill:#F3D79A;letter-spacing:.06em}
.ks{font-size:31px;font-weight:700;fill:#FAF6EF}
.kn{font-size:25px;font-weight:600;fill:#E9D9C2}
.title{position:absolute;right:52px;top:44px;text-align:right;color:#231A14}
.title h1{margin:0;font-family:"DejaVu Serif",Georgia,serif;font-size:40px;line-height:1.2;color:#5A1F12}
.title p{margin:8px 0 0;font-size:31px;font-weight:700;color:#7A2E1C}
.foot{position:absolute;left:44px;bottom:36px;font-size:22px;color:#5A4C40;line-height:1.4;max-width:620px}
.foot b{color:#231A14}
</style></head><body><div class="map">
<svg viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg">%s</svg>
<div class="title"><h1>Mustafa Kemal Paşa'nın<br>Sivas'tan Ankara'ya yolculuğu</h1><p>18–27 Aralık 1919</p></div>
<div class="foot"><b>Çeşnigir-Der</b> · Kaynak: Atatürk Ansiklopedisi; ATAM Dergisi (G. Çaykıran);
yerel kaynaklar (İğdebeli–Köprüköy yolu). Konumlar yaklaşıktır.</div>
</div></body></html>''' % (W, H, W, H, build())
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
        pg.set_content(page)
        pg.wait_for_timeout(300)
        pg.screenshot(path=out, type='jpeg', quality=88, clip={'x': 0, 'y': 0, 'width': W, 'height': H})
        b.close()
    print(out)

if __name__ == '__main__':
    main()
