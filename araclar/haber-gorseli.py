#!/usr/bin/env python3
"""Bölge haberleri için sitenin tarzında kapak görseli üretir (1200x675 JPEG, images/gorsel-<ad>.jpg).

Kullanım:
  python3 araclar/haber-gorseli.py <ad> <tema> "<ETİKET>" "<alt satır>"
Örnek:
  python3 araclar/haber-gorseli.py ankara-yolu yol "YOL DURUMU" "Ankara–Kırıkkale"

Temalar (renk + simge):
  yol     koyu kahve, yol        (yol çalışması, ulaşım, trafik)
  tarim   yeşil, başak           (tarım desteği, hasat, hayvancılık)
  belge   hardal, belge          (başvuru, son gün, resmî duyuru)
  ev      kiremit, ev            (vergi, belediye, konut, tapu)
  su      mavi, su damlası       (su, baraj, sulama, kesinti)
  elektrik koyu mavi, şimşek     (elektrik kesintisi, enerji)
  saglik  koyu kırmızı, artı     (sağlık, aşı, hastane)
  egitim  mor, kitap             (okul, burs, kurs)
  kultur  turuncu-kahve, yıldız  (festival, şenlik, kültür, spor)
  hava    gri-mavi, bulut        (hava durumu, kar, don uyarısı)
  duyuru  lacivert, hoparlör     (genel duyuru, diğer)
  pazar   zeytin yeşili, sepet  (Market, alışveriş, ilan)
Etiket kısa ve BÜYÜK harf (en fazla ~20 karakter), alt satır en fazla ~40 karakter.
"""
import os, sys, html
from playwright.sync_api import sync_playwright

ICONS = {
    'yol': '<path d="M8.5 4L6 20"/><path d="M15.5 4L18 20"/><path d="M12 5v2.5M12 10.5v2.5M12 16v2.5"/>',
    'tarim': '<path d="M12 21V8"/><path d="M12 8c-1.4-1.6-1.4-3.6 0-5.2 1.4 1.6 1.4 3.6 0 5.2z"/>'
             '<path d="M12 12c-2.2 0-3.8-.9-4.2-2 2.2-.6 3.8-.2 4.2 2zM12 12c2.2 0 3.8-.9 4.2-2-2.2-.6-3.8-.2-4.2 2z"/>'
             '<path d="M12 15.5c-2.2 0-3.8-.9-4.2-2 2.2-.6 3.8-.2 4.2 2zM12 15.5c2.2 0 3.8-.9 4.2-2-2.2-.6-3.8-.2-4.2 2z"/>',
    'belge': '<path d="M7 3h7.5L18 6.5V21H7z"/><path d="M14.5 3v3.5H18"/><path d="M9.5 12h6M9.5 15.5h6"/>',
    'ev': '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5.5h4V20"/>',
    'su': '<path d="M12 3.5c3.5 4.3 5.5 7.6 5.5 10.3a5.5 5.5 0 0 1-11 0c0-2.7 2-6 5.5-10.3z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.5"/>',
    'elektrik': '<path d="M13 3L6 13.5h5.5L10.5 21 18 10.5h-5.5z"/>',
    'saglik': '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
    'egitim': '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/>',
    'kultur': '<path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    'hava': '<path d="M7 18h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z"/>',
    'duyuru': '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    'pazar': '<path d="M3.5 10h17l-1.8 9.2a1.5 1.5 0 0 1-1.5 1.3H6.8a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M8 10l3-6M16 10l-3-6"/><path d="M9 13.5v4M12 13.5v4M15 13.5v4"/>',
}
# (orta ton, kenar tonu) — mevcut görsellerle aynı aile
COLORS = {
    'yol': ('#463B34', '#30291F'), 'tarim': ('#0E7A55', '#085E40'), 'belge': ('#84601F', '#6A4B16'),
    'ev': ('#7E3020', '#5C2013'), 'su': ('#1D5F86', '#123F5E'), 'elektrik': ('#2B3E6B', '#1A2849'),
    'saglik': ('#8A2433', '#651823'), 'egitim': ('#5A3A78', '#3F2757'), 'kultur': ('#8E4A1E', '#6A3413'),
    'hava': ('#4B6072', '#334452'), 'duyuru': ('#20365A', '#14233D'),
    'pazar': ('#5B6B2A', '#414D1C'),
}

def main():
    if len(sys.argv) != 5 or sys.argv[2] not in ICONS:
        sys.exit(__doc__)
    ad, tema, etiket, alt = sys.argv[1:]
    mid, edge = COLORS[tema]
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    out = os.path.join(root, 'images', 'gorsel-%s.jpg' % ad)
    page = f'''<html><body style="margin:0">
<div style="width:1200px;height:675px;background:radial-gradient(ellipse at 50% 45%,{mid} 0%,{mid} 35%,{edge} 100%);
 display:flex;flex-direction:column;align-items:center;font-family:'DejaVu Sans',Arial,sans-serif;color:#FAF5EF">
 <div style="margin-top:107px;width:298px;height:298px;border-radius:50%;background:rgba(250,245,239,.22);display:flex;align-items:center;justify-content:center">
  <div style="width:270px;height:270px;border-radius:50%;background:#FAF5EF;display:flex;align-items:center;justify-content:center">
   <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="{mid}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{ICONS[tema]}</svg>
  </div></div>
 <div style="margin-top:28px;font-weight:700;font-size:56px;letter-spacing:.09em">{html.escape(etiket)}</div>
 <div style="margin-top:10px;font-size:33px;opacity:.95">{html.escape(alt)}</div>
</div></body></html>'''
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1200, 'height': 675})
        pg.set_content(page)
        pg.wait_for_timeout(150)
        pg.screenshot(path=out, type='jpeg', quality=88)
        b.close()
    print(os.path.relpath(out, root))

if __name__ == '__main__':
    main()
