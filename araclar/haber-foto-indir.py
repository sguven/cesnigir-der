#!/usr/bin/env python3
"""Haberlerin fotoğrafını kaynak siteden indirip sitenin kendi klasörüne koyar.

GitHub Actions'ta çalışır (.github/workflows/haber-fotolari.yml): data/duyurular.json değişince
"foto_indir": true olan kayıtları bulur ve

  1. fotoğraf adresini alır: kayıtta "foto_url" varsa onu, yoksa haber sayfasındaki (link) og:image'ı,
  2. fotoğrafı indirir, en fazla 1200 piksel genişliğe küçültür, 250 KB altında JPEG olarak
     images/haber/<ad>.jpg dosyasına kaydeder,
  3. kaydın "foto" alanını bu dosyaya çevirir, "foto_aciklama"ya kaynağı yazar,
     "foto_indir" ve "foto_url" alanlarını siler.

İndirilemezse (site engeller, fotoğraf çok küçük ya da logo çıkarsa) kaydın eski kapak görseli
olduğu gibi kalır ve yalnızca "foto_indir" alanı silinir; hata özet olarak yazdırılır.

Bilgisayarda denemek:  python3 araclar/haber-foto-indir.py
"""
import html
import io
import json
import os
import re
import sys
import unicodedata
import urllib.parse
import urllib.request

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "duyurular.json")
OUT_DIR = os.path.join(ROOT, "images", "haber")
MAX_W, MAX_KB, MIN_W = 1200, 250, 400
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")


def fetch(url, referer=None, limit=15_000_000):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,image/avif,image/webp,image/*,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9",
        **({"Referer": referer} if referer else {}),
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read(limit), r.headers.get_content_charset() or "utf-8", r.geturl()


def og_image(page_url):
    body, charset, final = fetch(page_url, limit=3_000_000)
    text = body.decode(charset, "replace")
    for pat in (r'<meta[^>]+(?:property|name)=["\'](?:og:image|og:image:url|twitter:image)["\'][^>]*>',):
        for tag in re.findall(pat, text, re.I):
            m = re.search(r'content=["\']([^"\']+)["\']', tag, re.I)
            if m:
                return urllib.parse.urljoin(final, html.unescape(m.group(1).strip()))
    m = re.search(r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)', text, re.I)
    if m:
        return urllib.parse.urljoin(final, html.unescape(m.group(1)))
    raise ValueError("haber sayfasında og:image yok")


def slug(s):
    s = s.replace("ı", "i").replace("İ", "i")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:50] or "haber"


def file_name(x):
    old = os.path.basename(x.get("foto") or "")
    base = re.sub(r"^gorsel-", "", os.path.splitext(old)[0]) if old.startswith("gorsel-") else slug(x.get("baslik", ""))
    name, i = base, 2
    while os.path.exists(os.path.join(OUT_DIR, name + ".jpg")):
        name = f"{base}-{i}"
        i += 1
    return name + ".jpg"


def save_jpeg(data, path):
    im = Image.open(io.BytesIO(data))
    im = ImageOps.exif_transpose(im)
    if im.width < MIN_W or im.height < MIN_W * 0.4:
        raise ValueError(f"fotoğraf çok küçük ({im.width}x{im.height}), büyük ihtimalle logo")
    if im.mode != "RGB":
        bg = Image.new("RGB", im.size, (255, 255, 255))
        im = im.convert("RGBA")
        bg.paste(im, mask=im.split()[-1])
        im = bg
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    for q in (85, 78, 70, 62, 55, 48):
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
        if buf.tell() <= MAX_KB * 1024:
            break
    with open(path, "wb") as f:
        f.write(buf.getvalue())
    return im.size, buf.tell() // 1024


def main():
    with open(DATA, encoding="utf-8") as f:
        items = json.load(f)
    todo = [x for x in items if isinstance(x, dict) and x.get("foto_indir")]
    if not todo:
        print("İndirilecek haber fotoğrafı yok.")
        return 0
    os.makedirs(OUT_DIR, exist_ok=True)
    ok = fail = 0
    for x in todo:
        title = x.get("baslik", "?")
        try:
            src = x.get("foto_url") or og_image(x["link"])
            data, _, _ = fetch(src, referer=x.get("link"))
            name = file_name(x)
            size, kb = save_jpeg(data, os.path.join(OUT_DIR, name))
            x["foto"] = "images/haber/" + name
            if x.get("kaynak"):
                x["foto_aciklama"] = "Fotoğraf: " + x["kaynak"]
            ok += 1
            print(f"✓ {title}\n    {src}\n    → images/haber/{name} ({size[0]}x{size[1]}, {kb} KB)")
        except Exception as e:  # noqa: BLE001 — her hata için kapak görseli yerinde kalır
            fail += 1
            print(f"✗ {title}: {e} — eski kapak görseli kaldı ({x.get('foto') or 'yok'})")
        x.pop("foto_indir", None)
        x.pop("foto_url", None)
    with open(DATA, "w", encoding="utf-8") as f:
        f.write(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
    print(f"\n{ok} fotoğraf indirildi, {fail} indirilemedi.")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(f"### Haber fotoğrafları\n{ok} indirildi, {fail} indirilemedi.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
