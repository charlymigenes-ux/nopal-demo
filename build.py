#!/usr/bin/env python3
"""Reconstruye el demo en vivo a partir de un checkout del core y de los repos de los plugins.

Uso (desde la raíz de nopal-demo):

    python build.py --core ../nopal --plugins ..

    --core     checkout de NOPAL (rama main).
    --plugins  carpeta que contiene los repos de los plugins oficiales
               (matriz-led, nopal-plugin-arduino-accessories, ...).

Hace lo que describe el README ("Rebuilding it"):

  1. Copia index.html, static/{css,js,img,audio}, plugin_catalog.json y los frontends de los plugins.
  2. Reescribe las rutas absolutas ("/static/...") a relativas: el sitio vive en una subcarpeta.
  3. Inserta demo-data.js antes de app.js (subiendo su ?v= para saltarse cachés viejas).
  4. Convierte las imágenes a WebP y recorta el catálogo de tipografías.
  5. Parchea applyThemeWallpaper() para absolutizar la URL contra el documento.

Lo que NO toca: static/js/demo-data.js, static/demo/, README.md, LICENSE y .nojekyll. Son lo único
que se escribe a mano en este repositorio. `build-cache.json` guarda el hash de cada imagen del core
para no recodificar las que no cambiaron.

Necesita Python 3.9+ y Pillow (el core ya lo tiene en su requirements.txt).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Falta Pillow: pip install pillow (el core ya lo incluye en requirements.txt)")

ROOT = Path(__file__).resolve().parent
WEBP_QUALITY = 82
IMG_EXT = re.compile(r"(img/[A-Za-z0-9_./-]+?)\.(?:png|jpe?g)(?![A-Za-z0-9])")

# id del plugin -> carpeta del repositorio
PLUGINS = {
    "arduino-accessories": "nopal-plugin-arduino-accessories",
    "camera-viewer": "nopal-plugin-camera-viewer",
    "cotizador": "nopal-plugin-cotizador",
    "font-library": "nopal-plugin-font-library",
    "matriz-led": "matriz-led",
    "shape-creator": "nopal-plugin-shape-creator",
    "spoolman": "nopal-plugin-spoolman",
    "svg-toolkit": "nopal-plugin-svg-toolkit",
}

# Tipografías que se conservan (el catálogo completo pesa decenas de MB).
DEMO_FONTS = ["bebas-neue", "cinzel", "orbitron", "pacifico", "poppins", "stardos-stencil"]

# Lo escrito a mano: nunca se borra.
KEEP_JS = {"demo-data.js"}


def read(path: Path) -> str:
    # Sin traducir saltos de línea: lo que no cambia debe quedar idéntico byte a byte.
    return path.read_bytes().decode("utf-8")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = text.encode("utf-8")
    if path.exists() and path.read_bytes() == data:
        return
    path.write_bytes(data)


def to_webp_refs(text: str) -> str:
    """img/x.png -> img/x.webp (las imágenes se convierten más abajo)."""
    return IMG_EXT.sub(r"\1.webp", text)


# import("/static/js/x.js") -> import("./x.js"): un import dinámico con "static/js/x.js" sería un
# especificador "desnudo" y el navegador lo rechaza ("Failed to resolve module specifier").
DYNAMIC_IMPORT = re.compile(r"""import\((["'])/static/js/([^"']+)\1\)""")


def relative_html(text: str) -> str:
    text = DYNAMIC_IMPORT.sub(lambda m: f"import({m.group(1)}./{m.group(2)}{m.group(1)})", text)
    return to_webp_refs(text.replace("/static/", "static/"))


def relative_css(text: str) -> str:
    # style.css vive en static/css/: "/static/img/x" -> "../img/x"
    return to_webp_refs(text.replace("/static/", "../"))


def clean() -> None:
    """Borra lo generado, conservando lo escrito a mano."""
    for name in ("index.html", "plugin_catalog.json"):
        (ROOT / name).unlink(missing_ok=True)
    # static/img se conserva: las imágenes ya convertidas no se vuelven a codificar (ver build_static).
    for sub in ("css", "audio"):
        shutil.rmtree(ROOT / "static" / sub, ignore_errors=True)
    js = ROOT / "static" / "js"
    if js.exists():
        for f in js.iterdir():
            if f.is_file() and f.name not in KEEP_JS:
                f.unlink()
            elif f.is_dir():
                shutil.rmtree(f)
    shutil.rmtree(ROOT / "plugins-static", ignore_errors=True)


def demo_data_version() -> str:
    """?v= del script: hash de demo-data.js, así cambia solo cuando cambia (y salta cachés viejas)."""
    return hashlib.sha256((ROOT / "static" / "js" / "demo-data.js").read_bytes()).hexdigest()[:8]


def build_index(core: Path, version: str) -> None:
    html = relative_html(read(core / "backend" / "templates" / "index.html"))
    html = re.sub(r"<title>[^<]*</title>", "<title>NOPAL — Live Demo</title>", html, count=1)
    tag = f'<script src="static/js/demo-data.js?v={version}"></script>'
    # Antes de app.js, que captura window.fetch en su arranque.
    new, n = re.subn(r'(\s*)(<script src="static/js/app\.js[^"]*"></script>)', rf"\1{tag}\1\2", html, count=1)
    if n != 1:
        sys.exit('No se encontró <script src="static/js/app.js…"> en index.html del core')
    write(ROOT / "index.html", new)


WALLPAPER_OLD = "document.documentElement.style.setProperty(config.cssVar, `url('${getThemeWallpaperUrl(theme)}')`);"
WALLPAPER_NEW = """// La URL se absolutiza contra el documento antes de inyectarla. Una
    // ruta relativa dentro de una custom property la resuelve el navegador
    // contra la hoja de estilos donde se USA la variable (style.css, dentro
    // de static/css/), no contra la página: "static/img/x.webp" terminaba
    // pidiendo /static/css/static/img/x.webp y devolvía 404.
    const url = new URL(getThemeWallpaperUrl(theme), document.baseURI).href;
    document.documentElement.style.setProperty(config.cssVar, `url('${url}')`);"""


def patch_wallpaper(text: str) -> str:
    if WALLPAPER_OLD not in text:
        sys.exit("applyThemeWallpaper() cambió en el core: actualiza WALLPAPER_OLD en build.py")
    return text.replace(WALLPAPER_OLD, WALLPAPER_NEW, 1)


# El banner de la galería de plugins también va en una custom property (--plugins-featured-image): una
# ruta relativa ahí se resuelve contra style.css, no contra la página.
BANNER_OLD = "`url('${featured.banner_image.replace(/'/g, \"%27\")}')`"
BANNER_NEW = "`url('${new URL(featured.banner_image, document.baseURI).href.replace(/'/g, \"%27\")}')`"


def patch_banner(text: str) -> str:
    if BANNER_OLD not in text:
        sys.exit("El banner de la galería cambió en el core: actualiza BANNER_OLD en build.py")
    return text.replace(BANNER_OLD, BANNER_NEW, 1)


def build_static(core: Path) -> None:
    src = core / "backend" / "static"
    for f in (src / "css").glob("*.css"):
        write(ROOT / "static" / "css" / f.name, relative_css(read(f)))
    # También las subcarpetas (static/js/visor/: el visor 2D del editor, que app.js carga con import()).
    for f in sorted((src / "js").rglob("*.js")):
        text = relative_html(read(f))
        if f.name == "app.js":
            text = patch_banner(patch_wallpaper(text))
        write(ROOT / "static" / "js" / f.relative_to(src / "js"), text)
    # Sonidos de alerta (opcionales en la interfaz)
    shutil.copytree(src / "audio", ROOT / "static" / "audio")
    build_images(src / "img")


def build_images(src: Path) -> None:
    """Solo se convierten las imágenes nuevas o las que cambiaron en el core."""
    cache_path = ROOT / "build-cache.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    out_dir = ROOT / "static" / "img"
    out_dir.mkdir(parents=True, exist_ok=True)
    converted = kept = 0
    expected = set()
    for f in sorted(src.iterdir()):
        if not f.is_file():
            continue
        digest = hashlib.sha256(f.read_bytes()).hexdigest()
        if f.suffix.lower() in (".png", ".jpg", ".jpeg"):
            out = out_dir / (f.stem + ".webp")
            expected.add(out.name)
            if out.exists() and cache.get(f.name) == digest:
                kept += 1
                continue
            if out.exists() and f.name not in cache:
                # Primera ejecución con el demo ya construido: se adopta si las dimensiones coinciden.
                with Image.open(f) as a, Image.open(out) as b:
                    if a.size == b.size:
                        cache[f.name] = digest
                        kept += 1
                        continue
            with Image.open(f) as im:
                im.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
            cache[f.name] = digest
            converted += 1
        else:
            out = out_dir / f.name
            expected.add(out.name)
            if not out.exists() or out.read_bytes() != f.read_bytes():
                shutil.copyfile(f, out)
    for stale in out_dir.iterdir():
        if stale.is_file() and stale.name not in expected:
            stale.unlink()
    cache_path.write_text(json.dumps(dict(sorted(cache.items())), indent=2) + "\n", encoding="utf-8")
    print(f"  imágenes: {converted} convertidas, {kept} sin cambios")


def build_catalog(core: Path) -> None:
    write(ROOT / "plugin_catalog.json", relative_html(read(core / "backend" / "plugin_catalog.json")))


def build_plugins(plugins_dir: Path) -> None:
    for pid, repo in PLUGINS.items():
        src = plugins_dir / repo
        if not src.is_dir():
            sys.exit(f"Falta el repo del plugin {pid}: {src}")
        dest = ROOT / "plugins-static" / pid
        shutil.copytree(src / "frontend", dest / "frontend")
        shutil.copyfile(src / "nopal-plugin.json", dest / "nopal-plugin.json")
        # Las referencias a imágenes del core dentro de los plugins también pasan a WebP.
        for f in (dest / "frontend").rglob("*"):
            if f.is_file() and f.suffix in (".js", ".css", ".html") and "vendor" not in f.parts:
                text = f.read_bytes().decode("utf-8")
                fixed = to_webp_refs(text)
                if fixed != text:
                    f.write_bytes(fixed.encode("utf-8"))
        if pid == "font-library":
            trim_fonts(src / "fonts", dest / "fonts")


def trim_fonts(src: Path, dest: Path) -> None:
    catalog = json.loads((src / "catalog.json").read_text(encoding="utf-8"))
    keep = [e for e in catalog if e["id"] in DEMO_FONTS]
    missing = set(DEMO_FONTS) - {e["id"] for e in keep}
    if missing:
        sys.exit(f"Tipografías del demo que ya no están en el catálogo: {sorted(missing)}")
    dest.mkdir(parents=True, exist_ok=True)
    write(dest / "catalog.json", json.dumps(keep, indent=2, ensure_ascii=False) + "\n")
    for e in keep:
        shutil.copytree(src / e["directory"], dest / e["directory"])


def core_commit(core: Path) -> str:
    try:
        return subprocess.check_output(["git", "-C", str(core), "rev-parse", "--short", "HEAD"], text=True).strip()
    except Exception:
        return "desconocido"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--core", required=True, type=Path, help="checkout de NOPAL")
    ap.add_argument("--plugins", required=True, type=Path, help="carpeta con los repos de los plugins")
    args = ap.parse_args()
    core, plugins = args.core.resolve(), args.plugins.resolve()
    if not (core / "backend" / "templates" / "index.html").exists():
        sys.exit(f"{core} no parece un checkout de NOPAL")
    if not (ROOT / "static" / "js" / "demo-data.js").exists():
        sys.exit("Falta static/js/demo-data.js: ejecuta el script desde la raíz de nopal-demo")

    version = demo_data_version()
    print(f"Reconstruyendo el demo (demo-data.js?v={version})…")
    clean()
    build_index(core, version)
    build_static(core)
    build_catalog(core)
    build_plugins(plugins)
    print(f"Listo. Core: {core_commit(core)}. Revisa `git status` y prueba el demo en local antes de subirlo.")


if __name__ == "__main__":
    main()
