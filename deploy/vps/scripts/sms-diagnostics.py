"""Read-only OTP diagnostics. Never sends messages or prints raw application logs."""
import collections
import json
import re
import subprocess

COMPOSE = ['docker', 'compose', '--env-file', '.env', '-f', 'docker-compose.yml']


def summarize(text):
    statuses = collections.Counter()
    signals = collections.Counter()
    failures = 0
    provider_terms = collections.Counter()
    for line in text.splitlines():
        if not re.search(r'OTP delivery failed|Wappi delivery failed|SMSC rejected|auth/send-otp.*(?:503|429)|OTP_RATE_LIMITED', line, re.I):
            continue
        failures += 1
        if 'Wappi delivery failed with status' in line:
            # A fixed vocabulary reveals validation failures without printing payloads,
            # identifiers, arbitrary provider text, credentials, phone numbers or OTPs.
            allowed = set('bot bapi id uuid invalid valid required missing not found exist exists profile recipient number format parameter parameters message body length empty subscription balance expired token authorized authenticated phone whatsapp limit exceeded status error bad request type disabled'.split())
            response = line.split('Wappi delivery failed with status', 1)[1]
            words = [word.lower() for word in re.findall(r'[A-Za-z]+', response)]
            terms = ' '.join(word for word in words if word in allowed)
            if terms:
                provider_terms[terms] += 1
        status = re.search(r'Wappi delivery failed with status (\d{3})', line)
        if status:
            statuses[status.group(1)] += 1
        patterns = {
            'subscription_or_payment': r'tariff|subscription|expired|payment|тариф|подписк|оплат|ист[её]к',
            'insufficient_balance': r'balance|insufficient|баланс|недостаточ',
            'authorization': r'unauthori[sz]ed|forbidden|invalid.token|авторизац',
            'profile_or_connection': r'profile|disconnect|not.connected|профил|подключ',
            'credentials_missing': r'WAPPI_TOKEN and WAPPI_PROFILE_ID are required|SMSC_LOGIN and SMSC_PASSWORD are required',
            'network_timeout': r'timeout|timed.out|fetch failed|ENOTFOUND|ECONN',
            'rate_limit': r'OTP_RATE_LIMITED|Too many|rate.limit',
        }
        for key, pattern in patterns.items():
            if re.search(pattern, line, re.I):
                signals[key] += 1
    return {'matchedFailureLines': failures, 'wappiHttpStatuses': dict(statuses), 'reasonSignals': dict(signals), 'providerValidationTerms': dict(provider_terms)}


def main():
    # Only configured names and booleans; never serialize environment values.
    code = '''console.log(JSON.stringify({smsProvider:process.env.NOTIFICATIONS_SMS_PROVIDER,
      wappiTokenConfigured:Boolean(process.env.WAPPI_TOKEN),
      wappiProfileConfigured:Boolean(process.env.WAPPI_PROFILE_ID),
      smscLoginConfigured:Boolean(process.env.SMSC_LOGIN),
      smscPasswordConfigured:Boolean(process.env.SMSC_PASSWORD),
      otpBypass:process.env.OTP_DEV_BYPASS === "true",
      otpDebug:process.env.OTP_DEBUG_RESPONSE_ENABLED === "true"}));'''
    config = subprocess.run(COMPOSE + ['exec', '-T', 'api', 'node', '-e', code], capture_output=True, text=True, check=True)
    print('SMS_CONFIGURATION', json.dumps(json.loads(config.stdout)))
    # Official read-only profile endpoint; no send/QR/login/logout endpoints.
    probe = r"""(async () => {
      const token = process.env.WAPPI_TOKEN, profile = process.env.WAPPI_PROFILE_ID;
      const url = new URL('/api/profile/all/get', process.env.WAPPI_API_BASE_URL || 'https://wappi.pro');
      if (!token || !profile || url.protocol !== 'https:' || url.hostname !== 'wappi.pro') {
        console.log(JSON.stringify({skipped: true, reason: 'missing_configuration_or_nonstandard_target'})); return;
      }
      url.searchParams.set('profile_id', profile);
      try {
        const response = await fetch(url, {headers: {Authorization: token}, redirect: 'error', signal: AbortSignal.timeout(10000)});
        const payload = await response.json().catch(() => ({}));
        const values = [payload.error, payload.message, payload.detail].filter(value => typeof value === 'string');
        console.log(JSON.stringify({httpStatus: response.status,
          tokenError: values.some(value => /token[ _-]*error|invalid[ _-]*token/i.test(value)),
          profilesReturned: Array.isArray(payload.profiles),
          configuredProfilePresent: Array.isArray(payload.profiles) ? payload.profiles.some(item => item.profile_id === profile) : null}));
      } catch { console.log(JSON.stringify({networkError: true})); }
    })();"""
    result = subprocess.run(COMPOSE + ['exec', '-T', 'api', 'node', '-e', probe], capture_output=True, text=True, check=True)
    print('WAPPI_READ_ONLY_PROFILE_CHECK', json.dumps(json.loads(result.stdout)))
    logs = subprocess.run(COMPOSE + ['logs', '--no-color', '--since', '48h', '--tail=20000', 'api'], capture_output=True, text=True, check=True)
    print('OTP_FAILURE_SUMMARY_48H', json.dumps(summarize(logs.stdout + logs.stderr)))


if __name__ == '__main__':
    main()
