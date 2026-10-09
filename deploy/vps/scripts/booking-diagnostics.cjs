// Read-only database inspection; API estimates use only the existing review account.
const { Client } = require('pg');
async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query('BEGIN READ ONLY');
  const cities = (await db.query('SELECT id, name_ru, is_active, currency, service_zone FROM cities ORDER BY created_at')).rows;
  const promos = (await db.query("SELECT code, discount_type, discount_value, is_active, valid_to, max_uses, (SELECT count(*) FROM orders WHERE promo_code_id = promo_codes.id) AS uses FROM promo_codes WHERE upper(code) = 'DOSTAXI2026'")).rows;
  console.log('PROMO', JSON.stringify(promos));
  const tariffs = (await db.query('SELECT city_id, service_type, vehicle_class, currency, is_active FROM tariffs WHERE is_active = true')).rows;
  console.log('CITIES', JSON.stringify(cities.map(city => ({ ...city, tariffs: tariffs.filter(t => t.city_id === city.id) }))));
  const versions = (await db.query("SELECT t.id, c.name_ru AS city, t.vehicle_class, t.name_ru, t.currency, t.is_active, t.deleted_at, t.created_at FROM tariffs t JOIN cities c ON c.id=t.city_id WHERE t.service_type='taxi' ORDER BY c.name_ru, t.vehicle_class, t.created_at DESC")).rows;
  console.log('TARIFF_VERSIONS', JSON.stringify(versions));
  const pool = (await db.query("SELECT e.city_id, e.executor_type, e.is_online, e.verification_status, count(*) AS accounts, count(*) FILTER (WHERE NOT u.is_blocked AND e.balance >= 100) AS eligible_accounts FROM executors e JOIN users u ON u.id = e.user_id GROUP BY e.city_id, e.executor_type, e.is_online, e.verification_status")).rows;
  console.log('DISPATCH_POOL', JSON.stringify(pool));
  const statuses = (await db.query("SELECT status, count(*) AS orders FROM orders WHERE created_at > now() - interval '1 day' GROUP BY status")).rows;
  console.log('RECENT_ORDER_STATUSES', JSON.stringify(statuses));
  const phone = (process.env.APP_REVIEW_PHONE_NUMBERS || '+77000000001,+77000000002').split(',')[0].trim();
  const reviewerExists = (await db.query('SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1) AS present', [phone])).rows[0].present;
  await db.query('ROLLBACK');
  await db.end();
  if (!reviewerExists) { console.log('Review account missing; API preview skipped'); return; }
  async function request(path, body, token) {
    const res = await fetch('http://127.0.0.1:3000/api/v1' + path, {method: 'POST', headers: {'content-type':'application/json', ...(token ? {authorization:'Bearer '+token} : {})}, body: JSON.stringify(body)});
    return {status: res.status, body: await res.json()};
  }
  const sent = await request('/auth/send-otp', {phone});
  if (sent.status !== 201) throw new Error('Review OTP request failed');
  const login = await request('/auth/verify-otp', {phone, code: process.env.APP_REVIEW_OTP_CODE || '2468', role:'client'});
  if (!login.body.accessToken) throw new Error('Review login failed');
  for (const city of cities.filter(c => c.is_active)) {
    const response = await request('/orders/estimate', {cityId:city.id, serviceType:'taxi', carClass:'economy', distanceMeters:3000, durationSeconds:180, promoCode:'DOSTAXI2026'}, login.body.accessToken);
    console.log('PROMO_PREVIEW', city.name_ru, JSON.stringify(response));
  }
}
main().catch(() => { console.error('Booking diagnostics failed; credentials and account data suppressed'); process.exitCode=1; });
