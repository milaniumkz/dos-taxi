#!/usr/bin/env python3
"""Prepare a checked Flutter web build for its VPS role path."""
from pathlib import Path
import shutil
import sys

from prepare_mobile_web_pwa import INSTALL_JS, ROLES, update_index, write_manifest

role = sys.argv[1]
if role not in ROLES:
    raise SystemExit("Use passenger or driver")
target = Path(__file__).resolve().parents[1] / "apps/mobile/build/web"
cfg = ROLES[role]
write_manifest(target, role, cfg)
update_index(target, cfg, f"/{role}/")
(target / "pwa-install.js").write_text(INSTALL_JS + "\n")
for name in ("Icon-512.png", "Icon-maskable-512.png"):
    shutil.copyfile(cfg["icon"], target / "icons" / name)
launcher = Path(__file__).resolve().parents[1] / f"apps/mobile/android/app/src/{role}/res/mipmap-xxxhdpi/ic_launcher.png"
for name in ("Icon-192.png", "Icon-maskable-192.png"):
    shutil.copyfile(launcher, target / "icons" / name)
