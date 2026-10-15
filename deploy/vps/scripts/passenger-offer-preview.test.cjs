const {test}=require('node:test');const assert=require('node:assert/strict');const {seed}=require('./passenger-offer-preview.cjs');
function database(orders=[{id:'passenger-order',city_id:'city',passenger_count:2,needs_child_seat:true,ride_minimum_driver_balance:100}]){
 const changes=[];
 return {changes,query:async(sql,args)=>{
  if(sql.includes('JOIN cities'))return {rows:orders};
  if(sql.startsWith('SELECT status'))return {rows:[{status:'searching',executor_id:null}]};
  if(sql.startsWith('SELECT'))return {rows:[]};
  changes.push({sql,args});return {rows:[]};
 }};
}
test('requires exactly one real open request and refuses to guess',async()=>{
 for(const count of [0,2]){
  const db=database(Array.from({length:count},()=>({id:'order'})));let calls=0;
  await assert.rejects(seed(db,async()=>calls++),/Exactly one/);assert.equal(calls,0);assert.equal(db.changes.length,0);
 }
});
test('uses five marked drivers, submits normal offers five seconds apart and takes test drivers offline',async()=>{
 const db=database(),waits=[],calls=[],events=[];
 const result=await seed(db,async(path,body,user)=>{calls.push({path,body,user});return {id:'offer-'+calls.length,totalPrice:500,expiresAt:'expiry'};},async ms=>waits.push(ms),e=>events.push(e));
 assert.equal(result.count,5);assert.equal(calls.length,5);assert.equal(new Set(calls.map(c=>c.user)).size,5);assert.deepEqual(waits,[5000,5000,5000,5000,35000]);
 calls.forEach((c,i)=>{assert.equal(c.path,'/ride-requests/passenger-order/offers');assert.deepEqual(c.body,{priceSteps:i,hasChildSeat:true});});
 assert.equal(db.changes.filter(x=>x.sql.startsWith('UPDATE executors SET is_online=false')).length,5);
 for(const row of db.changes.filter(x=>x.sql.startsWith('INSERT INTO users'))){assert.match(row.args[1],/^TEST_OFFER_DRIVER_/);assert.match(row.args[2],/^\[ТЕСТ\]/);}
 assert.equal(events.length,5);
});
test('stops if passenger order was assigned before offer submission',async()=>{
 const db=database();const query=db.query;db.query=async(sql,args)=>sql.startsWith('SELECT status')?{rows:[{status:'accepted',executor_id:'real-driver'}]}:query(sql,args);
 let calls=0;await assert.rejects(seed(db,async()=>calls++),/no longer open/);assert.equal(calls,0);assert.equal(db.changes.length,0);
});
