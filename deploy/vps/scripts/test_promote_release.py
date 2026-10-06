"""Exercise runtime secret handoff across an stdin-consuming backup command."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class PromotionTests(unittest.TestCase):
    def test_runtime_payload_survives_interactive_docker_backup(self):
        scripts = Path(__file__).resolve().parent
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "target"
            incoming = root / "incoming"
            runtime = target / "deploy/vps"
            runtime.mkdir(parents=True)
            (runtime / ".env").write_text("RUN_DB_MIGRATIONS=false\nDATABASE_URL=unchanged\n")
            (runtime / "docker-compose.yml").write_text("services: {}\n")
            release_scripts = incoming / "deploy/vps/scripts"
            release_scripts.mkdir(parents=True)
            shutil.copyfile(scripts / "configure-smsc.py", release_scripts / "configure-smsc.py")
            binaries = root / "bin"
            binaries.mkdir()
            # Docker exec consumes stdin even when the command does not need it.
            (binaries / "docker").write_text("#!/bin/sh\ncat >/dev/null\n")
            (binaries / "rsync").write_text(
                "#!/usr/bin/env python3\nimport sys, shutil\n"
                "shutil.copytree(sys.argv[-2], sys.argv[-1], dirs_exist_ok=True)\n"
            )
            if sys.platform == "darwin" and shutil.which("flock") is None:
                # macOS has flock(2), but no flock command. Keep real locking
                # for this fixture; production and Linux still use their CLI.
                (binaries / "flock").write_text(
                    f"#!{sys.executable}\nimport fcntl, sys\n"
                    "assert len(sys.argv) == 3 and sys.argv[1] == '-n'\n"
                    "try:\n"
                    "    fcntl.flock(int(sys.argv[2]), fcntl.LOCK_EX | fcntl.LOCK_NB)\n"
                    "except BlockingIOError:\n"
                    "    sys.exit(1)\n"
                )
            for binary in binaries.iterdir():
                binary.chmod(0o755)
            credentials = {"SMSC_LOGIN": "test account", "SMSC_PASSWORD": "test$password!"}
            result = subprocess.run(
                ["bash", str(scripts / "ci-promote-release.sh"), str(incoming), str(target), "test-sha", "--runtime-config-stdin"],
                input=json.dumps(credentials), text=True, capture_output=True,
                env={**os.environ, "PATH": str(binaries) + os.pathsep + os.environ["PATH"]},
                timeout=20,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            content = (runtime / ".env").read_text()
            self.assertIn("SMSC_LOGIN='test account'", content)
            self.assertIn("SMSC_PASSWORD='test$password!'", content)
            self.assertIn("NOTIFICATIONS_SMS_PROVIDER='smsc'", content)
            self.assertIn("DATABASE_URL=unchanged", content)
            self.assertNotIn(credentials["SMSC_PASSWORD"], result.stdout + result.stderr)
            self.assertIn("commit=test-sha", (runtime / "DEPLOYED_VERSION").read_text())


if __name__ == "__main__":
    unittest.main()
