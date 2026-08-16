#!/usr/bin/env python3
"""
Replace every app icon across web (public/icons/), Android (mipmap-*/),
and the favicon, from a single 512x512 source.

Source icon must be at .audit/source-app-icon.png (square, ideally with
some natural margin around the artwork — the existing icon has gold-frame
padding which is fine).

Strategy:
  - Legacy ic_launcher.png + ic_launcher_round.png + every public/icons/*.png:
    full-bleed resize. The icon already has visible margin around the gold
    arch frame, so a full-bleed scale looks correct in app drawers.
  - Adaptive ic_launcher_foreground.png: centered at ~70% scale on a
    transparent canvas. This puts the icon inside Android 8+'s 66%
    safe-zone so the launcher's circle/square/squircle mask doesn't crop
    into the gold frame.
  - Favicon: multi-resolution .ico containing 16/32/48 sizes, plus a
    standalone 32x32 PNG for browsers that prefer that.
"""
import os
from pathlib import Path
from PIL import Image

ROOT = Path(r"C:\Users\lmao\TAROT")
SOURCE = ROOT / ".audit" / "source-app-icon.png"

# ── Web icon sizes (public/icons/) ──────────────────────────────────
WEB_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
SHORTCUT_NAMES = ["shortcut-journal.png", "shortcut-ritual.png", "shortcut-tarot.png"]

# ── Android density × file matrix ───────────────────────────────────
ANDROID_DENSITIES = {
    "mipmap-mdpi":    {"legacy": 48,  "foreground": 108},
    "mipmap-hdpi":    {"legacy": 72,  "foreground": 162},
    "mipmap-xhdpi":   {"legacy": 96,  "foreground": 216},
    "mipmap-xxhdpi":  {"legacy": 144, "foreground": 324},
    "mipmap-xxxhdpi": {"legacy": 192, "foreground": 432},
}

# ── Favicon sizes ───────────────────────────────────────────────────
FAVICON_ICO_SIZES = [16, 32, 48]


def load_source() -> Image.Image:
    if not SOURCE.exists():
        raise SystemExit(f"Source icon not found at {SOURCE}")
    im = Image.open(SOURCE).convert("RGBA")
    if im.size[0] != im.size[1]:
        raise SystemExit(f"Source must be square, got {im.size}")
    print(f"Source: {SOURCE.name}  {im.size}  {im.mode}")
    return im


def write_resized(src: Image.Image, target_size: int, out_path: Path) -> None:
    """Full-bleed resize with high-quality LANCZOS resampling."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    resized = src.resize((target_size, target_size), Image.LANCZOS)
    resized.save(out_path, "PNG", optimize=True)
    print(f"  -> {out_path.relative_to(ROOT)}  ({target_size}x{target_size})")


def write_safe_zone(src: Image.Image, target_size: int, out_path: Path, scale: float = 0.70) -> None:
    """
    Adaptive-icon foreground: center the source at `scale` * target_size
    on a transparent canvas, so the inner content sits inside Android's
    66% safe zone.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    inner = int(target_size * scale)
    resized = src.resize((inner, inner), Image.LANCZOS)
    offset = (target_size - inner) // 2
    canvas.paste(resized, (offset, offset), resized)
    canvas.save(out_path, "PNG", optimize=True)
    print(f"  -> {out_path.relative_to(ROOT)}  ({target_size}x{target_size}, content at {scale*100:.0f}%)")


def write_favicon_ico(src: Image.Image, out_path: Path) -> None:
    """Multi-resolution .ico with 16/32/48 entries."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    src.save(
        out_path,
        format="ICO",
        sizes=[(s, s) for s in FAVICON_ICO_SIZES],
    )
    print(f"  -> {out_path.relative_to(ROOT)}  (multi-size .ico {FAVICON_ICO_SIZES})")


def main():
    src = load_source()

    # ── 1. Web icons (PWA / manifest) ──
    print("\n[1/4] Web icons (public/icons/)")
    for size in WEB_SIZES:
        write_resized(src, size, ROOT / "public" / "icons" / f"icon-{size}x{size}.png")
    # PWA shortcut icons — these are currently identical copies of the icon.
    # Keep them as such until you create distinct shortcut artwork.
    for name in SHORTCUT_NAMES:
        write_resized(src, 192, ROOT / "public" / "icons" / name)

    # ── 2. Android launcher icons ──
    print("\n[2/4] Android launcher icons (mipmap-*)")
    for density, sizes in ANDROID_DENSITIES.items():
        density_dir = ROOT / "android" / "app" / "src" / "main" / "res" / density
        # Legacy icons — full-bleed
        write_resized(src, sizes["legacy"], density_dir / "ic_launcher.png")
        write_resized(src, sizes["legacy"], density_dir / "ic_launcher_round.png")
        # Adaptive foreground — safe-zone padded
        write_safe_zone(src, sizes["foreground"], density_dir / "ic_launcher_foreground.png", scale=0.70)

    # ── 3. Favicon (web) ──
    print("\n[3/4] Favicon (public/)")
    write_favicon_ico(src, ROOT / "public" / "favicon.ico")
    write_resized(src, 32, ROOT / "public" / "favicon-32x32.png")
    write_resized(src, 16, ROOT / "public" / "favicon-16x16.png")
    write_resized(src, 180, ROOT / "public" / "apple-touch-icon.png")

    # ── 4. Summary ──
    print("\n[4/4] Done.")
    written = (
        len(WEB_SIZES) + len(SHORTCUT_NAMES)
        + len(ANDROID_DENSITIES) * 3
        + 4  # favicon.ico + 32 + 16 + apple-touch
    )
    print(f"  Total files written: {written}")


if __name__ == "__main__":
    main()
