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
