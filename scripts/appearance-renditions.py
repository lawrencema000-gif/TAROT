#!/usr/bin/env python3
"""
Display-sized WebP renditions of the stock appearance images.

The card back and the seven backgrounds in Storage are 1024x1536 (one
2048x3072) PNGs of 2.6-9.6 MB, served max-age=0. src/utils/imageUrl.ts maps
a stored URL to the rendition written here, by file name:

  public/card-backs/r/<stem>-200.webp, <stem>-480.webp   (card back)
  public/backgrounds/full/<stem>.webp                    (900 px wide)

The stored URL (the member's choice) is never touched. Run after adding a
stock file to either bucket, and add its stem to STOCK_* in imageUrl.ts.

  python scripts/appearance-renditions.py

Needs Pillow. Reads the public bucket URLs, so no key is required.
"""
import io
import os
import sys
import urllib.request

from PIL import Image

STORAGE = 'https://ulzlthhkqjuohzjangcq.supabase.co/storage/v1/object/public'
FOLDER = '7bc78b43-0626-4dae-856b-baa1e22ff315'

CARD_BACKS = ['card_back_1768047025411']
BACKGROUNDS = [
    'background_1768048475356',
    'background_1768048480582',
    'background_1768048488103',
    'background_1768048493449',
    'background_1768048497998',
    'background_1768048502487',
    'background_1768048506937',
]
CARD_BACK_WIDTHS = [(200, 80), (480, 78)]  # (width px, WebP quality)
BACKGROUND_WIDTH, BACKGROUND_QUALITY = 900, 55  # under an 85% scrim

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')


def fetch(bucket: str, stem: str) -> Image.Image:
    url = f'{STORAGE}/{bucket}/{FOLDER}/{stem}.png'
    with urllib.request.urlopen(url, timeout=60) as r:
        return Image.open(io.BytesIO(r.read())).convert('RGB')


def write(im: Image.Image, width: int, quality: int, out: str) -> None:
    height = round(im.height * width / im.width)
    resized = im.resize((width, height), Image.LANCZOS)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    resized.save(out, 'WEBP', quality=quality, method=6)
    print(f'{os.path.relpath(out, ROOT)}  {width}x{height}  {os.path.getsize(out) // 1024} KB')


def main() -> int:
    for stem in CARD_BACKS:
        im = fetch('card-backs', stem)
        for width, quality in CARD_BACK_WIDTHS:
            write(im, width, quality, os.path.join(ROOT, 'card-backs', 'r', f'{stem}-{width}.webp'))
    for stem in BACKGROUNDS:
        im = fetch('backgrounds', stem)
        write(im, BACKGROUND_WIDTH, BACKGROUND_QUALITY, os.path.join(ROOT, 'backgrounds', 'full', f'{stem}.webp'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
