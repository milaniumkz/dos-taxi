const {test}=require('node:test');const assert=require('node:assert/strict');
const {fixtures,seed}=require('./seed-jetekshi-rides.cjs');
test('preview uses ten unique test identities and marked routes inside Jetekshi',()=>{
 const rows=fixtures();assert.equal(rows.length,10);assert.equal(new Set(rows.map(x=>x.userId)).size,10);assert.equal(new Set(rows.map(x=>x.key)).size,10);
 for(const row of rows){assert.match(row.phone,/^TEST_/);assert.match(row.data.pickupComment,/ТЕСТОВАЯ/);for(const p of row.data.routePoints){assert.ok(p.lat>52.32&&p.lat<52.34&&p.lng>77.12&&p.lng<77.15);}}
});
test('creates through normal quote/create APIs and retries without duplicating open requests',async()=>{
 const users=new Map(),orders=new Map();let creates=0;
 const db={query:async(sql,args)=>{
  if(sql.startsWith('INSERT')){users.set(args[0],{phone:args[1],name:args[2],is_blocked:false});return {rows:[]};}
  if(sql.startsWith('SELECT phone'))return {rows:[users.get(args[0])]};
  return {rows:orders.has(args[1])?[orders.get(args[1])]:[]};
 }};
 const request=async(path,data,user,key)=>{
  if(path.endsWith('/quote')){assert.deepEqual(Object.keys(data).sort(),['passengerCount','routePoints','serviceType']);return {termsKey:'terms',currency:'KZT',minimumUnitPrice:'500.00'};}
  creates++;assert.equal(data.termsKey,'terms');const order={id:'order-'+key,status:'searching',estimatedPrice:500*data.passengerCount};orders.set(key,{id:order.id,status:order.status,estimated_price:order.estimatedPrice});return order;
 };
 assert.equal((await seed(db,request)).length,10);assert.equal(creates,10);assert.equal((await seed(db,request)).length,10);assert.equal(creates,10);
});
test('refresh cancels only marked waiting fixtures and creates ten requests 30 seconds apart',async()=>{
 const {refreshPreview}=require('./seed-jetekshi-rides.cjs');const rows=fixtures();const waits=[],events=[],calls=[];
 const db={query:async(sql,args)=>{
  const f=rows.find(x=>x.userId===args[0]);
  if(sql.startsWith('SELECT phone')) return {rows:[{phone:f.phone,name:f.name,is_blocked:false}]};
  if(sql.startsWith('SELECT id FROM orders')){assert.match(sql,/executor_id IS NULL/);assert.match(sql,/status='searching'/);assert.equal(args[1],f.data.pickupComment);return {rows:[{id:'old-'+f.userId}]};}
  return {rows:[]};
 }};
 const request=async(path,data,user,key,method)=>{
  calls.push({path,method,key});
  if(method==='PATCH')return {status:'cancelled_client'};
  if(path.endsWith('/quote'))return {termsKey:'terms',currency:'KZT',minimumUnitPrice:500};
  assert.ok(key);return {id:'new-'+key,status:'searching',estimatedPrice:500};
 };
 const result=await refreshPreview(db,request,'12345',async ms=>waits.push(ms),event=>events.push(event));
 assert.equal(result.length,10);assert.equal(calls.filter(x=>x.method==='PATCH').length,10);assert.equal(waits.length,9);assert.ok(waits.every(x=>x===30000));assert.equal(events[0].event,'test_orders_cleared');assert.equal(events.filter(x=>x.event==='test_order_created').length,10);
 assert.ok(calls.slice(0,10).every(x=>x.method==='PATCH'));
});
test('refresh refuses reserved identity collisions before cancelling any orders',async()=>{
 const {refreshPreview}=require('./seed-jetekshi-rides.cjs');let calls=0;
 await assert.rejects(refreshPreview({query:async()=>({rows:[{phone:'real',name:'real'}]})},async()=>{calls++;},'12345'),/collision/);
 assert.equal(calls,0);
});
