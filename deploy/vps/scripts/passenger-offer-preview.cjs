// Explicitly invoked by the owner; no real driver profiles or order assignment are modified.
const {createHash,createHmac}=require('node:crypto');
function uuid(label){const b=createHash('sha256').update('dos-passenger-offer-preview-v1:'+label).digest().subarray(0,16);b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;const s=b.toString('hex');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
async function inspect(db){
 const orders=(await db.query("SELECT o.id,o.city_id,o.passenger_count,o.needs_child_seat,o.ride_unit_price,o.ride_price_step,o.currency,c.ride_minimum_driver_balance,(SELECT count(*)::int FROM notification_device_tokens d WHERE d.user_id=o.client_id AND d.is_active) AS push_devices FROM orders o JOIN users u ON u.id=o.client_id JOIN cities c ON c.id=o.city_id WHERE o.status='searching' AND o.executor_id IS NULL AND o.is_negotiated AND u.phone NOT LIKE 'TEST_%' ORDER BY o.created_at DESC LIMIT 2")).rows;
 return orders;
}
async function seed(db,request,wait=ms=>new Promise(r=>setTimeout(r,ms)),report=()=>{},expectedOrderId){
 const active=await inspect(db);if(active.length!==1)throw new Error('Exactly one open non-test passenger request is required');
 const order=active[0];if(expectedOrderId && order.id!==expectedOrderId)throw new Error('Active request changed; stopped');if(!order.city_id)throw new Error('Request has no service city');
 const ids=[];
 try{
  for(let i=0;i<5;i++){
   if(i)await wait(5000);
   const live=(await db.query("SELECT status,executor_id FROM orders WHERE id=$1",[order.id])).rows[0];
   if(live?.status!=='searching'||live.executor_id)throw new Error('Request no longer open; stopped');
   const user=uuid('user-'+i),executor=uuid('executor-'+i),phone=`TEST_OFFER_DRIVER_${i+1}`,name=`[ТЕСТ] Водитель ${i+1}`;
   const existing=(await db.query('SELECT phone,name,is_blocked FROM users WHERE id=$1',[user])).rows[0];
   if(existing&&(existing.phone!==phone||existing.name!==name||existing.is_blocked))throw new Error('Reserved test identity collision');
   await db.query('INSERT INTO users(id,phone,name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[user,phone,name]);
   const profile=(await db.query('SELECT id,user_id FROM executors WHERE id=$1 OR user_id=$2',[executor,user])).rows;
   if(profile.some(x=>x.user_id!==user||x.id!==executor)||profile.length>1)throw new Error('Reserved executor identity collision');
   await db.query("INSERT INTO executors(id,user_id,executor_type,city_id,is_online,verification_status,balance,passenger_capacity,vehicle_make,vehicle_model,vehicle_color,vehicle_plate,rating) VALUES($1,$2,'driver',$3,true,'verified',$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET city_id=EXCLUDED.city_id,is_online=true,balance=EXCLUDED.balance,passenger_capacity=EXCLUDED.passenger_capacity",[executor,user,order.city_id,String(Math.max(1000,Number(order.ride_minimum_driver_balance))),Math.max(4,order.passenger_count),['Toyota','Hyundai','Kia','Chevrolet','Skoda'][i],['Camry','Elantra','Rio','Cobalt','Octavia'][i],['Белый','Серебристый','Чёрный','Синий','Серый'][i],`TEST ${i+1}`,String(4.6+i*.1)]);
   ids.push(executor);
   const offer=await request(`/ride-requests/${order.id}/offers`,{priceSteps:i,hasChildSeat:!!order.needs_child_seat},user);
   report({event:'test_offer_created',number:i+1,orderId:order.id,offerId:offer.id,total:offer.totalPrice,expiresAt:offer.expiresAt,at:new Date().toISOString()});
  }
  // Leave all five offers visible together until their normal expiry; no lifetime override.
  await wait(35000);
 }finally{
  for(const id of ids)await db.query('UPDATE executors SET is_online=false WHERE id=$1',[id]);
 }
 return {count:ids.length,orderId:order.id};
}
async function main(){
 const {Client}=require('pg');const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try{
  if(process.env.SEED_PASSENGER_OFFERS!=='1'){
   const orders=await inspect(db);
   console.log(JSON.stringify({activeRequests:orders.map(o=>({id:o.id,cityId:o.city_id,pushDevices:o.push_devices})),pushConfiguration:{projectConfigured:!!process.env.FIREBASE_PROJECT_ID,serviceAccountConfigured:!!process.env.FIREBASE_CLIENT_EMAIL&&!!process.env.FIREBASE_PRIVATE_KEY,stubEnabled:process.env.NOTIFICATIONS_PUSH_STUB==='true'}}));return;
  }
  if(!process.env.JWT_SECRET)throw new Error('Required runtime configuration missing');
  if(!/^[0-9a-f-]{36}$/i.test(process.env.PREVIEW_ORDER_ID||''))throw new Error('Explicit preview request ID required');
  const request=async(path,data,userId)=>{
   const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const now=Math.floor(Date.now()/1000);const unsigned=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:userId,role:'executor',iat:now,exp:now+300});const token=unsigned+'.'+createHmac('sha256',process.env.JWT_SECRET).update(unsigned).digest('base64url');
   const response=await fetch('http://127.0.0.1:3000/api/v1'+path,{method:'POST',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(data)});const body=await response.json();if(!response.ok)throw new Error('Preview API failed: '+response.status+' '+String(body.code||''));return body;
  };
  console.log(JSON.stringify(await seed(db,request,undefined,event=>console.log(JSON.stringify(event)),process.env.PREVIEW_ORDER_ID)));
 }finally{await db.end();}
}
module.exports={inspect,seed};
if(require.main===module||!process.argv[1])main().catch(e=>{console.error(e.message);process.exitCode=1;});
