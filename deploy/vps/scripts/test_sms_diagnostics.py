import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('sms_diagnostics', Path(__file__).with_name('sms-diagnostics.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SmsDiagnosticsTest(unittest.TestCase):
    def test_summarizes_failures_without_echoing_phone_otp_or_provider_payload(self):
        result = module.summarize('OTP delivery failed for +77012345678: Wappi delivery failed with status 402: {"message":"Subscription expired", "token":"secret-token", "code":"2468"}\nGET /health -> 200\nOTP delivery failed: fetch failed')
        self.assertEqual(result['matchedFailureLines'], 2)
        self.assertEqual(result['wappiHttpStatuses'], {'402': 1})
        self.assertEqual(result['reasonSignals'], {'subscription_or_payment': 1, 'network_timeout': 1})
        for secret in ['77012345678', '2468', 'secret-token', 'Subscription expired']:
            self.assertNotIn(secret, str(result))
