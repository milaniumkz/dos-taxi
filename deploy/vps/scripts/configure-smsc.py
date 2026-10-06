#!/usr/bin/env python3
"""Apply only SMSC settings from the encrypted SSH stdin channel."""
import json
import os
from pathlib import Path
import sys
import tempfile


def configure(path: Path, settings: dict) -> bool:
    if set(settings) - {"SMSC_LOGIN", "SMSC_PASSWORD"}:
        raise ValueError("Unsupported runtime configuration keys")
    if settings and (not settings.get("SMSC_LOGIN") or not settings.get("SMSC_PASSWORD")):
        raise ValueError("Both SMSC credentials are required")
    for value in settings.values():
        if not isinstance(value, str) or any(c in value for c in "\r\n\0"):
            raise ValueError("Invalid SMSC credential format")
    content = path.read_text()
    existing = {}
    for line in content.splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            existing[key.strip()] = value.strip().strip("\"'")
    if not settings and not all(existing.get(k) and not existing[k].startswith("CHANGE_ME") for k in ("SMSC_LOGIN", "SMSC_PASSWORD")):
        return False
    updates = {**settings, "NOTIFICATIONS_SMS_PROVIDER": "smsc", "NOTIFICATIONS_SMS_STUB": "false", "OTP_DEV_BYPASS": "false", "OTP_DEBUG_RESPONSE_ENABLED": "false"}
    # Compose dotenv single quotes preserve literal dollars and spaces.
    def quote(value):
        return "'" + value.replace("'", "\\'") + "'"
    lines = [line for line in content.splitlines() if line.split("=", 1)[0].strip() not in updates]
    lines.extend(key + "=" + quote(value) for key, value in updates.items())
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, prefix=".smsc-env-", delete=False) as stream:
            temporary = stream.name
            os.chmod(temporary, 0o600)
            stream.write("\n".join(lines) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary:
            os.unlink(temporary)
    return True


if __name__ == "__main__":
    try:
        configured = configure(Path(sys.argv[1]), json.load(sys.stdin))
    except Exception:
        print("SMSC runtime configuration failed; credentials were not logged", file=sys.stderr)
        sys.exit(1)
    print("SMSC runtime configured" if configured else "SMSC credentials absent; existing SMS runtime preserved")
