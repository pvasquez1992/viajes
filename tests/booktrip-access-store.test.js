import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTrip } from './fixtures/trip.js';
import { isBootstrapAdmin } from '../server/booktrip/access.js';
import { createBooktripHandler } from '../server/booktrip/handler.js';
import { createTripStore } from '../server/booktrip/store.js';
import { localTripDatabase } from '../scripts/local-trip-store.mjs';
const identity={id:'pedro',email:'pvasquez1992@outlook.com',name:'Pedro'};
const env={BOOKTRIP_DRAFT_SECRET:'private-test-signing-secret-32-characters',BOOKTRIP_CREATOR_EMAIL:identity.email,AI:{run(){throw Error('No real AI');}}};
const trip=()=>structuredClone(sampleTrip);
function context(settings,route,input,headers={}) {
  const get=route==='config' || route.startsWith('trips');
  return {request:new Request(`https://booktrip.test/api/booktrip/${route}`,{method:get?'GET':'POST',headers:{Origin:'https://booktrip.test','Content-Type':'application/json',...headers},...(get?{}:{body:JSON.stringify(input)})}),env:settings,params:{path:route}};
}
test('bootstrap admin requires the full verified email; unassigned readers cannot spoof a header or trigger AI',async()=>{
  assert.equal(isBootstrapAdmin(identity,env),true);assert.equal(isBootstrapAdmin(identity,{}),false);
  for(const email of ['wife@example.test','pvasquez1992@other.test','']) {
    const viewer={id:'reader',name:'pvasquez1992',email};let calls=0;
    const handler=createBooktripHandler({identify:async()=>viewer,chat:()=>{calls++;},store:()=>{calls++;throw Error('No writes');}});
    const config=await (await handler(context(env,'config'))).json();assert.equal(config.data.canCreate,false);
    for(const route of ['chat','publish']) assert.equal((await handler(context(env,route,{messages:[{role:'user',content:'Crea un viaje'}]},{'Cf-Access-Authenticated-User-Email':identity.email}))).status,403);
    assert.equal(calls,0);
  }
});
test('saving is durable, retries are idempotent, edits preserve ID and stale edits cannot overwrite a newer trip',async(t)=>{
  const db=localTripDatabase();t.after(()=>db.close());const settings={...env,BOOKTRIP_DB:db};let calls=0;
  const handler=createBooktripHandler({identify:async()=>identity,chat:async(_input,current)=>{calls++;const value=structuredClone(current?.trip || trip());value.description='Cambio '+calls;return {reply:'schemaVersion: 1',trip:value,research:[],warnings:[]};}});
  const call=async(input)=>handler(context(settings,'chat',input));
  const input={messages:[{role:'user',content:'Crea mi viaje'}]};
  const first=await (await call(input)).json();const again=await (await call(input)).json();assert.deepEqual(again,first);assert.equal(calls,1);assert.ok(!first.data.reply.includes('schemaVersion'));
  assert.equal((await createTripStore(settings).catalog()).length,1);
  const edit={messages:[{role:'user',content:'Añade una pausa'}],conversationToken:first.data.conversationToken};
  const updated=await (await call(edit)).json();assert.equal(updated.data.trip.id,first.data.trip.id);assert.ok(updated.data.reply.startsWith('Actualicé'));
  const retry=await (await call(edit)).json();assert.deepEqual(retry,updated);assert.equal(calls,2);
  assert.equal((await call({messages:[{role:'user',content:'Un cambio desde otra pestaña'}],conversationToken:first.data.conversationToken})).status,409);
  assert.equal((await createTripStore(settings).get(first.data.trip.id)).description,'Cambio 2');
  const newTrip=await (await call({messages:[{role:'user',content:'Otro viaje'}]})).json();assert.notEqual(newTrip.data.trip.id,first.data.trip.id);assert.equal((await createTripStore(settings).catalog()).length,2);
  const reader=createBooktripHandler({identify:async()=>({id:'wife',email:'wife@example.test'})});
  assert.equal((await reader(context(settings,'trips'))).status,200);
  assert.equal((await reader(context(settings,'trips/'+first.data.trip.id))).status,200);
  assert.equal((await createBooktripHandler({identify:async()=>null})(context(settings,'trips'))).status,401);
});
test('storage failure does not report a saved trip or silently generate an unsaved proposal',async()=>{
  const handler=createBooktripHandler({identify:async()=>identity,chat:async()=>({trip:trip(),research:[],warnings:[]}),store:()=>({receipt:async()=>null,save:async()=>{throw Error('Database unavailable');}})});
  const response=await handler(context(env,'chat',{messages:[{role:'user',content:'Falla al guardar'}]}));assert.equal(response.status,502);assert.ok(!(await response.text()).includes('Creé'));
  const unconfigured=createBooktripHandler({identify:async()=>identity,chat:()=>{throw Error('Must not call AI');}});
  assert.equal((await unconfigured(context(env,'chat',{messages:[{role:'user',content:'Sin almacenamiento'}]}))).status,503);
});
