// Explicitly invoked preview: only ten dedicated test passengers and normal ride APIs.
const { createHash, createHmac } = require('node:crypto');
function uuid(label) {
  const b = createHash('sha256').update('dos-jetekshi-preview-v1:' + label).digest().subarray(0, 16);
  b[6] = (b[6] & 15) | 80; b[8] = (b[8] & 63) | 128;
  const s = b.toString('hex'); return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
function fixtures() {
  return Array.from({length:10}, (_,i) => ({
    userId:uuid('passenger-'+i), key:uuid('request-'+i), phone:`TEST_JETEKSHI_${String(i+1).padStart(2,'0')}`,
    name:`[ТЕСТ] Лента Жетекши ${i+1}`,
    data:{serviceType:'taxi',passengerCount:1+i%3,priceSteps:i%4,paymentMethod:'cash',
      pickupEntrance:String(1+i%3),pickupComment:`ТЕСТОВАЯ ЗАЯВКА ${i+1}/10 — проверка ленты. Не выполнять реальную поездку.`,
      needsChildSeat:false,sharedRide:false,
      routePoints:[
        {lat:52.323064+(i%5)*.00055,lng:77.127874+Math.floor(i/5)*.0018,address:`ТЕСТ — Жетекши, подача №${i+1}`},
        {lat:52.3263+(i%3)*.00025,lng:77.1321+(i%4)*.0003,address:`ТЕСТ — Жетекши, назначение №${i+1}`}
      ]}
  }));
}
async function seed(db,request) {
  const results=[];
  for(const f of fixtures()) {
    await db.query('INSERT INTO users(id,phone,name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[f.userId,f.phone,f.name]);
    const user=(await db.query('SELECT phone,name,is_blocked FROM users WHERE id=$1',[f.userId])).rows[0];
    if(!user || user.phone!==f.phone || user.name!==f.name || user.is_blocked) throw new Error('Reserved test identity collision; stopped');
    const existing=(await db.query('SELECT id,status,estimated_price FROM orders WHERE client_id=$1 AND ride_request_key=$2',[f.userId,f.key])).rows[0];
    if(existing) {
      if(existing.status!=='searching') throw new Error('Preview request already closed; no replacement created');
      results.push({id:existing.id,total:existing.estimated_price,existing:true});continue;
    }
    const quote=await request('/ride-requests/quote',{serviceType:f.data.serviceType,passengerCount:f.data.passengerCount,routePoints:f.data.routePoints},f.userId);
    if(quote.currency!=='KZT' || Number(quote.minimumUnitPrice)<500) throw new Error('Unexpected preview pricing; stopped');
    const order=await request('/ride-requests',{...f.data,termsKey:quote.termsKey},f.userId,f.key);
    if(!order.id || order.status!=='searching') throw new Error('Preview request was not left open');
    results.push({id:order.id,total:order.estimatedPrice,existing:false});
  }
  if(results.length!==10) throw new Error('Expected exactly ten preview requests');
  return results;
}
async function main() {
  if(!process.env.JWT_SECRET || !process.env.DATABASE_URL) throw new Error('Required runtime configuration missing');
  const {Client}=require('pg');const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  const request=async(path,data,userId,key)=>{
    const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
    const now=Math.floor(Date.now()/1000), unsigned=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:userId,role:'client',iat:now,exp:now+600});
    const token=unsigned+'.'+createHmac('sha256',process.env.JWT_SECRET).update(unsigned).digest('base64url');
    const response=await fetch('http://127.0.0.1:3000/api/v1'+path,{method:'POST',signal:AbortSignal.timeout(30000),headers:{'content-type':'application/json',authorization:'Bearer '+token,...(key?{'x-idempotency-key':key}:{})},body:JSON.stringify(data)});
    const body=await response.json();if(!response.ok) throw new Error('Preview API failed: '+response.status+' '+String(body.code||''));return body;
  };
  try {const results=await seed(db,request);console.log(JSON.stringify({preview:'Жетекши',count:results.length,orders:results}));} finally {await db.end();}
}
module.exports={fixtures,seed};
if(require.main===module || !process.argv[1]) main().catch(e=>{console.error(e.message);process.exitCode=1;});
