#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = ROOT / "deploy" / "hosting-public"

ROLES = {
    "passenger": {
        "name": "DOS Taxi",
        "short_name": "DOS Taxi",
        "description": "DOS Taxi для пассажиров",
        "theme_color": "#FFCC00",
        "background_color": "#F8F7F2",
        "icon": ROOT / "apps" / "mobile" / "assets" / "images" / "passenger_logo.png",
        "subdir": "/passenger/",
    },
    "driver": {
        "name": "DOS Driver",
        "short_name": "DOS Driver",
        "description": "DOS Driver для водителей и курьеров",
        "theme_color": "#0F1319",
        "background_color": "#0A0D10",
        "icon": ROOT / "apps" / "mobile" / "assets" / "images" / "driver_logo.png",
        "subdir": "/driver/",
    },
}


INSTALL_JS = r"""
(function () {
  var deferredPrompt = null;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isStandalone || localStorage.getItem('dosPwaInstallDismissed') === '1') {
    return;
  }

  function createPrompt(mode) {
    if (document.getElementById('dos-pwa-install')) return;

    var box = document.createElement('div');
    box.id = 'dos-pwa-install';
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;background:#101216;color:#fff;border-radius:18px;padding:14px 14px 12px;box-shadow:0 18px 48px rgba(0,0,0,.28);font:600 14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;';
    box.innerHTML = '<div style="display:flex;gap:12px;align-items:center"><img src="icons/Icon-192.png" alt="" style="width:40px;height:40px;border-radius:12px"><div style="flex:1"><div>Добавьте приложение на главный экран</div><div style="opacity:.72;font-weight:500;font-size:12px;margin-top:2px">' + (mode === 'ios' ? 'Нажмите «Поделиться» и выберите «На экран Домой».' : 'Иконка будет открывать приложение сразу.') + '</div></div><button type="button" data-install style="border:0;border-radius:999px;background:#ffcc00;color:#111;padding:10px 12px;font-weight:800">' + (mode === 'ios' ? 'ОК' : 'Установить') + '</button><button type="button" data-close style="border:0;background:transparent;color:#fff;font-size:22px;line-height:1">×</button></div>';
    document.body.appendChild(box);

    box.querySelector('[data-close]').addEventListener('click', function () {
      localStorage.setItem('dosPwaInstallDismissed', '1');
      box.remove();
    });
    box.querySelector('[data-install]').addEventListener('click', async function () {
      if (mode === 'ios' || !deferredPrompt) {
        localStorage.setItem('dosPwaInstallDismissed', '1');
        box.remove();
        return;
      }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(function () {});
      deferredPrompt = null;
      box.remove();
    });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    createPrompt('android');
  });

  var ua = window.navigator.userAgent || '';
  var isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  if (isIos) {
    window.addEventListener('load', function () {
      setTimeout(function () { createPrompt('ios'); }, 1200);
    });
  }
})();
""".strip()


def run_sips(src: Path, dst: Path, size: int) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["sips", "-z", str(size), str(size), str(src), "--out", str(dst)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def write_manifest(target: Path, role: str, cfg: dict[str, str]) -> None:
    manifest = {
        "name": cfg["name"],
        "short_name": cfg["short_name"],
        "description": cfg["description"],
        "start_url": ".",
        "scope": ".",
        "display": "standalone",
        "display_override": ["window-controls-overlay", "standalone"],
        "orientation": "portrait-primary",
        "background_color": cfg["background_color"],
        "theme_color": cfg["theme_color"],
        "prefer_related_applications": False,
        "categories": ["travel", "navigation", "utilities"],
        "icons": [
            {"src": "icons/Icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icons/Icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "icons/Icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
            {"src": "icons/Icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
        "shortcuts": [{"name": cfg["short_name"], "url": ".", "icons": [{"src": "icons/Icon-192.png", "sizes": "192x192"}]}],
    }
    (target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def update_index(target: Path, cfg: dict[str, str], base_href: str) -> None:
    path = target / "index.html"
    html = path.read_text()
    html = html.replace('<base href="/passenger/">', f'<base href="{base_href}">')
    html = html.replace('<base href="/driver/">', f'<base href="{base_href}">')
    html = html.replace('<base href="$FLUTTER_BASE_HREF">', f'<base href="{base_href}">')
    html = html.replace('content="A new Flutter project."', f'content="{cfg["description"]}"')
    html = html.replace('content="dos_mobile"', f'content="{cfg["short_name"]}"')
    html = html.replace("<title>dos_mobile</title>", f"<title>{cfg['name']}</title>")
    if 'name="apple-mobile-web-app-capable"' not in html:
        html = html.replace(
            '<meta name="mobile-web-app-capable" content="yes">',
            '<meta name="mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-capable" content="yes">',
        )
    if 'name="theme-color"' not in html:
        html = html.replace(
            '<meta content="IE=Edge" http-equiv="X-UA-Compatible">',
            f'<meta content="IE=Edge" http-equiv="X-UA-Compatible">\n  <meta name="theme-color" content="{cfg["theme_color"]}">',
        )
    if "pwa-install.js" not in html:
        html = html.replace(
            '<script src="flutter_bootstrap.js" async></script>',
            '<script src="pwa-install.js" defer></script>\n  <script src="flutter_bootstrap.js" async></script>',
        )
    path.write_text(html)


def prepare_target(target: Path, role: str, cfg: dict[str, str], base_href: str) -> None:
    write_manifest(target, role, cfg)
    run_sips(Path(cfg["icon"]), target / "icons" / "Icon-512.png", 512)
    run_sips(Path(cfg["icon"]), target / "icons" / "Icon-maskable-512.png", 512)
    run_sips(Path(cfg["icon"]), target / "icons" / "Icon-192.png", 192)
    run_sips(Path(cfg["icon"]), target / "icons" / "Icon-maskable-192.png", 192)
    run_sips(Path(cfg["icon"]), target / "favicon.png", 32)
    (target / "pwa-install.js").write_text(INSTALL_JS + "\n")
    update_index(target, cfg, base_href)


def main() -> None:
    for role, cfg in ROLES.items():
        source = PUBLIC_ROOT / role
        if not source.exists():
            raise SystemExit(f"Missing web build: {source}")

        prepare_target(source, role, cfg, cfg["subdir"])

        standalone = ROOT / "deploy" / f"hosting-{role}"
        if standalone.exists():
            shutil.rmtree(standalone)
        shutil.copytree(source, standalone)
        prepare_target(standalone, role, cfg, "/")

    print("PWA web artifacts prepared")


if __name__ == "__main__":
    main()
