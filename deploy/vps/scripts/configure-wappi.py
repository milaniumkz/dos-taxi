#!/usr/bin/env python3
"""Validate Wappi using a read-only API, then apply credentials from SSH stdin.
No messages are sent. Secret values are never printed or passed as CLI arguments.
"""
import datetime
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

COMPOSE = ['docker', 'compose', '--env-file', '.env', '-f', 'docker-compose.yml']


def validate_settings(settings):
    if not isinstance(settings, dict) or set(settings) != {'WAPPI_TOKEN', 'WAPPI_PROFILE_ID'}:
        raise ValueError('Both Wappi credentials are required')
    token, profile = settings['WAPPI_TOKEN'], settings['WAPPI_PROFILE_ID']
    if not isinstance(token, str) or not re.fullmatch(r'[A-Za-z0-9._-]{16,1024}', token):
        raise ValueError('Invalid Wappi token format; use the raw API token')
    if not isinstance(profile, str) or not re.fullmatch(r'[A-Za-z0-9_-]{6,128}', profile):
        raise ValueError('Invalid Wappi profile format')
    return settings


def verify_profile(settings):
    url = 'https://wappi.pro/api/profile/all/get?' + urllib.parse.urlencode({'profile_id': settings['WAPPI_PROFILE_ID']})
    request = urllib.request.Request(url, headers={'Authorization': settings['WAPPI_TOKEN']})
    # Do not follow redirects carrying an Authorization header to another host.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=15) as response:
            payload = json.load(response)
        profiles = payload.get('profiles') if isinstance(payload, dict) else None
        profile = next((item for item in profiles if isinstance(item, dict) and item.get('profile_id') == settings['WAPPI_PROFILE_ID']), None) if isinstance(profiles, list) else None
    except Exception:
        raise ValueError('Wappi credential verification failed; runtime unchanged') from None
    if not profile:
        raise ValueError('Configured Wappi profile not returned; runtime unchanged')
    if str(profile.get('app_status', '')).lower() != 'open':
        raise ValueError('Wappi WhatsApp profile is not OPEN; runtime unchanged')


def atomic_write(path, content):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, prefix='.wappi-env-', delete=False) as stream:
            temporary = stream.name
            os.chmod(temporary, 0o600)
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary:
            os.unlink(temporary)


def updated_content(content, settings):
    updates = {**settings, 'WAPPI_API_BASE_URL': 'https://wappi.pro', 'NOTIFICATIONS_SMS_PROVIDER': 'wappi',
               'NOTIFICATIONS_SMS_STUB': 'false', 'OTP_DEV_BYPASS': 'false', 'OTP_DEBUG_RESPONSE_ENABLED': 'false'}
    lines = [line for line in content.splitlines() if line.split('=', 1)[0].strip() not in updates]
    # Validated credentials and fixed settings contain no dotenv metacharacters.
    lines.extend(key + "='" + value + "'" for key, value in updates.items())
    return '\n'.join(lines) + '\n'


def recreate_api(directory):
    subprocess.run(COMPOSE + ['up', '-d', '--no-deps', '--force-recreate', 'api'], cwd=directory, capture_output=True, check=True, timeout=120)


def wait_ready(directory):
    code = "fetch('http://127.0.0.1:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
    for _ in range(20):
        try:
            result = subprocess.run(COMPOSE + ['exec', '-T', 'api', 'node', '-e', code], cwd=directory, capture_output=True, timeout=15)
            if result.returncode == 0:
                return
        except subprocess.TimeoutExpired:
            pass
        time.sleep(2)
    raise RuntimeError('API readiness failed')


def configure(directory, settings):
    validate_settings(settings)
    verify_profile(settings)
    env_path = directory / '.env'
    original = env_path.read_text()
    backup_root = directory / 'backups'
    backup_root.mkdir(exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    backup = Path(tempfile.mkdtemp(prefix='wappi-' + stamp + '-', dir=backup_root))
    os.chmod(backup, 0o700)
    shutil.copy2(env_path, backup / 'env.backup')
    os.chmod(backup / 'env.backup', 0o600)
    try:
        atomic_write(env_path, updated_content(original, settings))
        recreate_api(directory)
        wait_ready(directory)
    except Exception:
        atomic_write(env_path, original)
        try:
            recreate_api(directory)
            wait_ready(directory)
        except Exception:
            raise RuntimeError('Wappi update failed; previous settings restored but API readiness requires inspection') from None
        raise RuntimeError('Wappi update failed; previous settings and API readiness restored') from None
    print('Wappi credentials applied; profile OPEN; API ready; no messages sent')


if __name__ == '__main__':
    try:
        settings = json.load(sys.stdin)
        with open('/tmp/dos-production-deploy.lock', 'a') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise ValueError('Production deployment is active; runtime unchanged') from None
            configure(Path(sys.argv[1]), settings)
    except (ValueError, RuntimeError) as error:
        # Only fixed, secret-free messages raised by this script.
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Wappi configuration failed; credentials were not logged', file=sys.stderr)
        sys.exit(1)
