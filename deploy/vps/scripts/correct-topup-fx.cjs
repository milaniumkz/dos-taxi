// One inspected legacy topup only. Run exclusively through DOS Production Ops.
async function correctTopupFx(db, expected, convert) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(expected.topupId || '') || !uuid.test(expected.executorId || '') ||
      !/^\d{1,10}\.\d{2}$/.test(expected.amount || '') || !/^\d+(\.\d{1,4})?$/.test(expected.rate || '') || Number(expected.rate) <= 0) throw Error('Exact inspected topup, executor, KZT amount and rate required');
  await db.query('BEGIN');
  try {
    const topup = (await db.query('SELECT * FROM executor_balance_topups WHERE id=$1 FOR UPDATE', [expected.topupId])).rows[0];
    if (!topup || topup.executor_id !== expected.executorId || topup.amount !== expected.amount || topup.status !== 'confirmed' || !topup.confirmed_at) throw Error('Topup does not match inspected confirmed payment');
    const executor = (await db.query('SELECT id,city_id,balance FROM executors WHERE id=$1 FOR UPDATE', [expected.executorId])).rows[0];
    const city = executor && (await db.query('SELECT currency,ride_exchange_rate,ride_manual_price_policy FROM cities WHERE id=$1 FOR SHARE', [executor.city_id])).rows[0];
    if (!city || city.currency !== 'RUB' || !city.ride_manual_price_policy || Number(city.ride_exchange_rate) !== Number(expected.rate)) throw Error('Inspected Baikonur RUB wallet and exchange rate required');
    const credit = convert(topup.amount, city.currency, city.ride_exchange_rate);
    if (topup.fx_corrected_at) {
      if (topup.credited_amount !== credit.creditedAmount || topup.credited_currency !== credit.creditedCurrency || Number(topup.exchange_rate) !== Number(expected.rate)) throw Error('Prior correction differs');
      await db.query('COMMIT');
      return { topupId: topup.id, alreadyCorrected: true, balance: executor.balance };
    }
    if (topup.credited_amount !== null || topup.payment_currency !== null || topup.credited_currency !== null || topup.exchange_rate !== null) throw Error('Only legacy unsnapshotted payments may be corrected');
    const delta = ((Math.round(Number(credit.creditedAmount) * 100) - Math.round(Number(topup.amount) * 100)) / 100).toFixed(2);
    const balance = (await db.query('UPDATE executors SET balance=balance+$1::numeric WHERE id=$2 RETURNING balance::text', [delta, executor.id])).rows[0].balance;
    await db.query("UPDATE executor_balance_topups SET payment_currency='KZT',credited_amount=$1,credited_currency='RUB',exchange_rate=$2,fx_corrected_at=now(),updated_at=now() WHERE id=$3", [credit.creditedAmount, credit.exchangeRate, topup.id]);
    const metadata = { source: 'topup_fx_correction', topupId: topup.id, paymentAmount: topup.amount, paymentCurrency: 'KZT', priorCreditedAmount: topup.amount, creditedAmount: credit.creditedAmount, creditedCurrency: 'RUB', exchangeRate: credit.exchangeRate, delta, balanceBefore: executor.balance, balanceAfter: balance, runId: expected.runId || null };
    await db.query("INSERT INTO admin_activity_logs(id,actor_id,action,entity_type,entity_id,metadata) VALUES($1,NULL,'executor.updated','executor',$2,$3::jsonb)", [require('node:crypto').randomUUID(), executor.id, JSON.stringify(metadata)]);
    await db.query('COMMIT');
    return { topupId: topup.id, alreadyCorrected: false, delta, creditedAmount: credit.creditedAmount, creditedCurrency: 'RUB', balance };
  } catch (error) { await db.query('ROLLBACK'); throw error; }
}
module.exports = { correctTopupFx };
if (require.main === module || process.env.TOPUP_FX_ID) {
  const { Client } = require('pg');
  const { balanceTopUpCredit } = require(process.cwd() + '/dist/apps/api/src/modules/executors/balance-top-up-credit.js');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  (async () => {
    try {
      await db.connect();
      console.log('TOPUP_FX_CORRECTION', JSON.stringify(await correctTopupFx(db, { topupId: process.env.TOPUP_FX_ID, executorId: process.env.TOPUP_FX_EXECUTOR, amount: process.env.TOPUP_FX_AMOUNT, rate: process.env.TOPUP_FX_RATE, runId: process.env.TOPUP_FX_RUN_ID }, balanceTopUpCredit)));
    } finally { await db.end(); }
  })().catch(() => { console.error('Topup correction refused or rolled back; no account credentials printed'); process.exitCode = 1; });
}
