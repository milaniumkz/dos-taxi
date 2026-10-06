import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("configure_smsc", Path(__file__).with_name("configure-smsc.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / ".env"
        self.path.write_text("# Keep other settings\nDATABASE_URL=unchanged\nNOTIFICATIONS_SMS_PROVIDER=wappi\nOTP_DEV_BYPASS=true\n")

    def test_switch_preserves_other_settings_and_permissions(self):
        self.assertTrue(module.configure(self.path, {"SMSC_LOGIN": "test account", "SMSC_PASSWORD": "literal$password!"}))
        content = self.path.read_text()
        self.assertIn("DATABASE_URL=unchanged", content)
        self.assertIn("SMSC_PASSWORD='literal$password!'", content)
        self.assertIn("NOTIFICATIONS_SMS_PROVIDER='smsc'", content)
        self.assertIn("OTP_DEV_BYPASS='false'", content)
        self.assertEqual(content.count("NOTIFICATIONS_SMS_PROVIDER="), 1)
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)

    def test_absent_credentials_do_not_modify_runtime(self):
        original = self.path.read_bytes()
        self.assertFalse(module.configure(self.path, {}))
        self.assertEqual(self.path.read_bytes(), original)

    def test_existing_credentials_enable_smsc_without_replacing_them(self):
        with self.path.open("a") as stream:
            stream.write("SMSC_LOGIN='existing account'\nSMSC_PASSWORD='existing-password'\n")
        self.assertTrue(module.configure(self.path, {}))
        self.assertIn("SMSC_PASSWORD='existing-password'", self.path.read_text())

    def test_invalid_settings_leave_original_untouched(self):
        original = self.path.read_bytes()
        for settings in [{"SMSC_LOGIN": "only one"}, {"DATABASE_URL": "forbidden"}, {"SMSC_LOGIN": "account", "SMSC_PASSWORD": "bad\nvalue"}]:
            with self.assertRaises(ValueError):
                module.configure(self.path, settings)
            self.assertEqual(self.path.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
