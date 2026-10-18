# NOPAL — Live Demo

**▶ https://charlymigenes-ux.github.io/nopal-demo/**

The real [NOPAL](https://github.com/charlymigenes-ux/nopal) dashboard, running on simulated data. No hardware, no server, no install — open the link and use it.

Two 3D printers, a laser and a CNC that update by themselves, spools losing grams as they print, cameras, the plugin gallery, the job history, the model library and the AI assistant. Pause a print and it pauses. Ask the assistant how much filament is left and it answers with the numbers you see on the cards.

> Nothing shown is real hardware. Reloading the page restores everything.

---

## This is a build, not a fork

**Do not edit the files here expecting to fix NOPAL.** Everything except `static/js/demo-data.js` is copied verbatim from the real project — patches applied here are lost the next time the demo is rebuilt, and never reach anyone's workshop.

Bug in the dashboard? It belongs in [charlymigenes-ux/nopal](https://github.com/charlymigenes-ux/nopal).

Built from core commit **`a5853dc`** (v1.2.0-alpha.1, 2026-10-17).

## How it works

NOPAL's frontend is a single-page app: one HTML file, and `app.js` paints everything by calling `/api/…`. So the backend can be removed entirely and replaced in the browser.

`static/js/demo-data.js` hijacks `window.fetch` and answers those calls from an in-memory workshop that ticks every two seconds. It loads **before** `app.js`, which matters: `app.js` grabs `const ORIGINAL_FETCH = window.fetch.bind(window)` on its line 17, so whatever is installed by then is what it uses for everything.

State lives only in the browser tab. There is no database, no session, and no way for one visitor to affect another.

### What is simulated

Machines, spools, cameras, jobs, library files, workshop sensors, the ESP32 board with its LED strip, and the AI assistant — whose answers are a keyword-driven script reading the same live state the cards show, in Spanish, English, German, French and Portuguese.

### What is blocked

Every write that isn't part of the tour returns `403`: no saving settings, installing plugins, restarting services or entering API keys. The AI never contacts an external provider, so there is no key to burn.

## Rebuilding it

One command does it. From the root of this repository:

```bash
python build.py --core ../nopal --plugins ..
```

- `--core` is a checkout of NOPAL (`main`).
- `--plugins` is the folder that holds the plugin repositories (`matriz-led`, `nopal-plugin-arduino-accessories`, …).
- It needs Python 3.9+ and Pillow, which the core already lists in its `requirements.txt`.

Then **test it locally** (for example `python -m http.server` in this folder) and commit. The script is idempotent: running it twice changes nothing.

### What the script does

| From the core | To here |
| --- | --- |
| `backend/templates/index.html` | `index.html` |
| `backend/static/{css,js,img,audio}` | `static/` |
| `backend/plugin_catalog.json` | `plugin_catalog.json` |
| `<plugin repo>/frontend` and `nopal-plugin.json` | `plugins-static/<id>/` |

1. **Rewrites asset paths to relative.** `"/static/…"` → `"static/…"`, and `url('/static/…')` in CSS → `url('../…')`. The site lives in a subfolder; a leading slash points outside it.
2. **Inserts `demo-data.js`** before `app.js`, with a `?v=` taken from the file's hash so browsers never serve a stale copy.
3. **Converts images to WebP.** Only new or changed images are re-encoded; `build-cache.json` records the hash of every source image.
4. **Trims the font catalogue** to six families, or the page weighs 58 MB instead of 12.
5. **Patches `app.js`** in two places: `applyThemeWallpaper()` and the plugin gallery banner resolve their URL with `new URL(…, document.baseURI)`. A relative path inside a CSS custom property is resolved against the *stylesheet* that uses the variable, not the page — without this, every wallpaper and banner returns 404.

If the core changes one of the lines the script patches, it stops with a message instead of producing a broken demo.

### After rebuilding

`demo-data.js` answers every `/api/…` call the dashboard makes, so a new core feature that calls a new route needs a handler there. Anything unhandled gets an empty reply with the usual shape (the screens show "no data" instead of an error). To find what is missing, open each section with the browser's network tab and look for empty replies.

Keep `demo-data.js`, `static/demo/`, `build.py`, `build-cache.json` and this README: they are the only things authored here.

### Planned

Rebuilding is still a manual step. The next one is a GitHub Actions workflow that checks out the core and the plugins, runs `build.py` and opens a pull request, on demand and once a week.

## Credits and licence

Same licence as the project it demonstrates: **GPL-3.0** (see [LICENSE](./LICENSE)).

Bundled plugin frontends belong to their own repositories (`nopal-plugin-*`). `three.js` is MIT. The six typefaces under `plugins-static/font-library/fonts/` are OFL-1.1 and keep their licence files alongside them.

The camera footage is **synthetic** — a generated animation, not a real workshop.

---

If NOPAL is useful to you, it is free and stays that way: [☕ ko-fi.com/nopal_dash](https://ko-fi.com/nopal_dash)
