import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTrip } from './fixtures/trip.js';
import { catalogEntry } from '../js/trip-contract.js';
import { createBooktripHandler } from '../server/booktrip/handler.js';
import { createTripStore } from '../server/booktrip/store.js';
import { localTripDatabase } from '../scripts/local-trip-store.mjs';
import { sealDraft } from '../server/booktrip/drafts.js';
import { sealRemoval,openRemoval } from '../server/booktrip/removals.js';

const identity={id:'owner',email:'owner@example.test',name:'Pedro'};
const secret='fictional-private-removal-secret-32-characters';
function setup(t) {
  const db=localTripDatabase();t.after(()=>db.close());let calls=0;
  const env={BOOKTRIP_DB:db,BOOKTRIP_DRAFT_SECRET:secret,BOOKTRIP_CREATOR_EMAIL:identity.email,ASSETS:{fetch:async()=>Response.json([])},AI:{async run(_model,request){calls++;const data=JSON.parse(request.messages.find(message=>message.role==='user').content);const requestText=data.conversation.at(-1).content;return {response:{action:'delete',tripId:requestText.includes('Halloween')?'legacy:harpersferry2026':data.library.find(entry=>entry.editable)?.id || 'missing-id',reply:'No he borrado nada',queries:[]}};}}};
  const handler=createBooktripHandler({identify:async()=>identity});
  const call=(route,input,extraHeaders={})=>handler(context(env,route,input,extraHeaders));
  return {env,call,calls:()=>calls};
}
function context(env,route,input,extraHeaders={}) {const get=route.startsWith('trips');return {request:new Request('https://booktrip.test/api/booktrip/'+route,{method:get?'GET':'POST',headers:{Origin:'https://booktrip.test','Content-Type':'application/json',...extraHeaders},...(get?{}:{body:JSON.stringify(input)})}),params:{path:route},env};}
const message=content=>({messages:[{role:'user',content}]});
async function seed(env,owner=identity) {const trip=structuredClone(sampleTrip);trip.id='boston-fictional';trip.title='Boston ficticio';await env.BOOKTRIP_DB.prepare('INSERT INTO booktrip_trips (id,owner_id,create_key,document) VALUES (?,?,?,?)').bind(trip.id,owner.id,'fixture',JSON.stringify(trip)).run();return trip;}

test('deletion is a proposal until confirmed; a confirmation removes only its owner trip and retries are idempotent',async(t)=>{
  const {env,call,calls}=setup(t);const trip=await seed(env);const store=createTripStore(env);
  const requested=await (await call('chat',message('elimina viaje a boston'))).json();
  assert.equal(requested.data.saved,false);assert.equal(requested.data.pendingRemoval.id,trip.id);
  assert.equal(requested.data.pendingRemoval.title,trip.title);assert.equal(requested.data.pendingRemoval.start,trip.startDate);
  assert.deepEqual(await store.get(trip.id),trip);assert.equal((await store.catalog()).length,1);
  const token=requested.data.pendingRemoval.confirmationToken;
  const removed=await (await call('remove',{confirmationToken:token})).json();assert.equal(removed.data.removed.id,trip.id);assert.ok(removed.data.reply.startsWith('Moví'));
  assert.equal(await store.get(trip.id),null);assert.equal(await store.getEditable(trip.id,identity),null);assert.equal((await store.catalog()).length,0);
  assert.equal((await call('trips/'+trip.id)).status,404);
  env.ASSETS.fetch=async()=>Response.json([catalogEntry(trip)]);
  assert.equal((await (await call('trips')).json()).data.length,8);
  assert.deepEqual(await (await call('remove',{confirmationToken:token})).json(),removed);assert.equal(calls(),0);
  // Retaining the original privately permits recovery; no old link exposes it.
  assert.equal((await env.BOOKTRIP_DB.prepare('SELECT document FROM booktrip_trips WHERE id = ?').bind(trip.id).first()).document,JSON.stringify(trip));
});

test('confirmation tokens bind purpose, owner, target, version and ten-minute expiry',async(t)=>{
  const {env,call}=setup(t);const trip=await seed(env);
  const token=await sealRemoval(trip,identity,secret,1000);
  assert.deepEqual(await openRemoval(token,identity,secret,2000),trip);
  await assert.rejects(openRemoval(token,{id:'other-user'},secret,2000),error=>error.code==='confirmation_expired');
  await assert.rejects(openRemoval(token,identity,secret,601000),error=>error.code==='confirmation_expired');
  await assert.rejects(openRemoval(token.slice(0,-20)+'aaaaaaaaaaaaaaaaaaaa',identity,secret,2000),error=>error.code==='confirmation_expired');
  const conversation=await sealDraft(trip,identity,secret);
  assert.equal((await call('remove',{confirmationToken:conversation})).status,409);
  assert.equal((await call('remove',{id:trip.id})).status,400);
  assert.equal((await call('remove',{confirmationToken:await sealRemoval(trip,identity,secret),trip})).status,400);
  assert.deepEqual(await createTripStore(env).get(trip.id),trip);
});

test('reader, forged email, cross-origin and foreign-owner confirmations cannot remove a trip',async(t)=>{
  const {env,call}=setup(t);const trip=await seed(env);const token=await sealRemoval(trip,identity,secret);
  const reader=createBooktripHandler({identify:async()=>({id:'wife',email:'wife@example.test'})});
  assert.equal((await reader(context(env,'remove',{confirmationToken:token},{'Cf-Access-Authenticated-User-Email':identity.email}))).status,403);
  assert.equal((await createBooktripHandler({identify:async()=>null})(context(env,'remove',{confirmationToken:token}))).status,401);
  assert.equal((await call('remove',{confirmationToken:token},{Origin:'https://evil.test'})).status,403);
  const forged=await sealRemoval(trip,{id:'another-owner'},secret);
  assert.equal((await call('remove',{confirmationToken:forged})).status,409);
  await assert.rejects(createTripStore(env).remove(trip,{id:'another-owner'}),error=>error.code==='trip_changed');
  assert.deepEqual(await createTripStore(env).get(trip.id),trip);
});

test('a changed trip invalidates the pending deletion instead of deleting a newer itinerary',async(t)=>{
  const {env,call}=setup(t);const trip=await seed(env);const token=await sealRemoval(trip,identity,secret);
  const updated=structuredClone(trip);updated.description='Cambio desde otra conversación';
  await env.BOOKTRIP_DB.prepare('UPDATE booktrip_trips SET document = ? WHERE id = ?').bind(JSON.stringify(updated),trip.id).run();
  const response=await call('remove',{confirmationToken:token});assert.equal(response.status,409);
  assert.deepEqual(await createTripStore(env).get(trip.id),updated);
});

test('removed entries cannot return through old save receipts, signed contexts, edits or creation retries',async(t)=>{
  const {env,call}=setup(t);const trip=structuredClone(sampleTrip);const store=createTripStore(env);
  const response={trip:{id:trip.id,title:trip.title,url:'/trips/'+trip.id+'/'},reply:'Creé el viaje'};
  await store.save(trip,identity,null,'old-key',response);
  const conversationToken=await sealDraft(trip,identity,secret);
  await store.remove(trip,identity);
  await assert.rejects(store.receipt('old-key',identity),error=>error.code==='trip_removed');
  await assert.rejects(store.save(trip,identity,null,'old-key',response),error=>error.code==='trip_removed');
  const changed=structuredClone(trip);changed.description='Intento de restaurarlo';
  await assert.rejects(store.save(changed,identity,{trip},'edit-key',response),error=>error.code==='trip_changed');
  assert.equal((await call('chat',{...message('Ajusta el viaje'),conversationToken})).status,410);
  assert.equal(await store.get(trip.id),null);assert.equal((await store.catalog()).length,0);
});

test('legacy deletion requests only offer the original link and produce no confirmation token',async(t)=>{
  const {env,call}=setup(t);const trip=await seed(env);
  const {data}=await (await call('chat',message('elimina Halloween'))).json();
  assert.equal(data.pendingRemoval,undefined);assert.equal(data.trip.url,'/harpersferry2026/');assert.ok(data.reply.includes('ni eliminar'));
  assert.deepEqual(await createTripStore(env).get(trip.id),trip);
});
