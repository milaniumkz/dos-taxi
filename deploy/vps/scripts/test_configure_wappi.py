import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, MagicMock

spec = importlib.util.spec_from_file_location('configure_wappi', Path(__file__).with_name('configure-wappi.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SETTINGS = {'WAPPI_TOKEN': 'dummy-token-for-tests-only', 'WAPPI_PROFILE_ID': 'test-profile'}


class ConfigureWappiTests(unittest.TestCase):
    def test_http_errors_report_only_status_and_fixed_reason(self):
        for body in [json.dumps({'error': 'Token error', 'detail': SETTINGS['WAPPI_TOKEN']}), SETTINGS['WAPPI_TOKEN']]:
            failure = module.urllib.error.HTTPError('https://wappi.pro', 400, 'private reason', {}, io.BytesIO(body.encode()))
            opener = MagicMock()
            opener.open.side_effect = failure
            with patch.object(module.urllib.request, 'build_opener', return_value=opener):
                with self.assertRaisesRegex(ValueError, 'HTTP 400') as error:
                    module.verify_profile(SETTINGS)
            self.assertNotIn(SETTINGS['WAPPI_TOKEN'], str(error.exception))
            self.assertNotIn('private reason', str(error.exception))
            self.assertEqual('token rejected' in str(error.exception), body.startswith('{'))

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.path = self.directory / '.env'
        self.original = '# Preserve secrets\nJWT_SECRET=unchanged\nDATABASE_URL=unchanged\nWAPPI_TOKEN=old\nOTP_DEV_BYPASS=false\n'
        self.path.write_text(self.original)

    def test_invalid_or_missing_credentials_do_not_call_provider_or_change_settings(self):
        with patch.object(module, 'verify_profile') as verify:
            for settings in [{}, {'WAPPI_TOKEN': 'only'}, {**SETTINGS, 'WAPPI_TOKEN': 'bad\nvalue'}, {**SETTINGS, 'WAPPI_PROFILE_ID': 'bad\nprofile'}, {**SETTINGS, 'OTHER_KEY': 'forbidden'}]:
                with self.assertRaises(ValueError): module.configure(self.directory, settings)
            verify.assert_not_called()
        self.assertEqual(self.path.read_text(), self.original)
        self.assertFalse((self.directory / 'backups').exists())

    def test_provider_rejection_leaves_runtime_untouched(self):
        with patch.object(module, 'verify_profile', side_effect=ValueError('verification rejected')):
            with self.assertRaises(ValueError): module.configure(self.directory, SETTINGS)
        self.assertEqual(self.path.read_text(), self.original)
        self.assertFalse((self.directory / 'backups').exists())

    def test_applies_only_after_verification_preserves_other_secrets_and_creates_private_backup(self):
        with patch.object(module, 'verify_profile') as verify, patch.object(module, 'recreate_api') as recreate, patch.object(module, 'wait_ready'):
            module.configure(self.directory, SETTINGS)
            verify.assert_called_once_with(SETTINGS)
            recreate.assert_called_once_with(self.directory)
        content = self.path.read_text()
        self.assertIn('JWT_SECRET=unchanged', content)
        self.assertIn('DATABASE_URL=unchanged', content)
        self.assertEqual(content.count('WAPPI_TOKEN='), 1)
        self.assertIn("OTP_DEV_BYPASS='false'", content)
        self.assertIn("OTP_DEBUG_RESPONSE_ENABLED='false'", content)
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        backup = next((self.directory / 'backups').glob('*/env.backup'))
        self.assertEqual(backup.read_text(), self.original)
        self.assertEqual(backup.stat().st_mode & 0o777, 0o600)
        self.assertEqual(backup.parent.stat().st_mode & 0o777, 0o700)

    def test_failed_readiness_restores_original_runtime_and_rechecks_api(self):
        with patch.object(module, 'verify_profile'), patch.object(module, 'recreate_api') as recreate, patch.object(module, 'wait_ready', side_effect=[RuntimeError('not ready'), None]) as ready:
            with self.assertRaisesRegex(RuntimeError, 'previous settings and API readiness restored'):
                module.configure(self.directory, SETTINGS)
            self.assertEqual(recreate.call_count, 2)
            self.assertEqual(ready.call_count, 2)
        self.assertEqual(self.path.read_text(), self.original)

    def test_profile_validation_requires_matching_open_profile_and_sanitizes_errors(self):
        for payload in [{'error': 'Token error'}, {'profiles': []}, {'profiles': [{'profile_id': 'test-profile', 'app_status': 'closed'}]}]:
            response = MagicMock()
            response.__enter__.return_value.read.return_value = json.dumps(payload).encode()
            opener = MagicMock()
            opener.open.return_value = response
            with patch.object(module.urllib.request, 'build_opener', return_value=opener):
                with self.assertRaises(ValueError) as error: module.verify_profile(SETTINGS)
                self.assertNotIn(SETTINGS['WAPPI_TOKEN'], str(error.exception))
        response.__enter__.return_value.read.return_value = json.dumps({'profiles': [{'profile_id': 'test-profile', 'app_status': 'OPEN'}]}).encode()
        with patch.object(module.urllib.request, 'build_opener', return_value=opener):
            module.verify_profile(SETTINGS)
            request = opener.open.call_args.args[0]
            self.assertEqual(request.get_method(), 'GET')
            self.assertTrue(request.full_url.startswith('https://wappi.pro/api/profile/all/get?'))


if __name__ == '__main__': unittest.main()
