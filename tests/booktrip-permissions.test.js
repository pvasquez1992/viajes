import test from 'node:test';
import assert from 'node:assert/strict';
import { createBooktripHandler } from '../server/booktrip/handler.js';
import { createTripStore } from '../server/booktrip/store.js';
import { localTripDatabase } from '../scripts/local-trip-store.mjs';
import { sampleTrip } from './fixtures/trip.js';
import { sealDraft } from '../server/booktrip/drafts.js';
import { sealRemoval } from '../server/booktrip/removals.js';
import { authorizeIdentity } from '../server/booktrip/permissions.js';

// Fictional identities and SQLite only; these tests do not contact Cloudflare.
const admin={id:'admin-qa',email:'admin@example.test',name:'Admin'};
const wife={id:'creator-qa',email:'creator@example.test',name:'Creadora'};
const reader={id:'reader-qa',email:'reader@example.test',name:'Lector'};
const secret='fictional-permissions-secret-more-than-32-characters';
const message=(text,token)=>({messages:[{role:'user',content:text}],...(token?{conversationToken:token}:{})});
function setup(t) {
  const db=localTripDatabase();t.after(()=>db.close());
  const env={BOOKTRIP_DB:db,BOOKTRIP_CREATOR_EMAIL:admin.email,BOOKTRIP_DRAFT_SECRET:secret,ASSETS:{fetch:async()=>Response.json([])}};
  let calls=0;
  const handler=createBooktripHandler({identify:async request=>({admin,wife,reader}[request.headers.get('QA-Identity')]),chat:async(input,current)=>{calls++;const trip=structuredClone(current?.trip || sampleTrip);trip.description=input.messages.at(-1).content;return {trip,research:[],warnings:[]};}});
  const call=(identity,route,body,extra={})=>handler({env,params:{path:route},request:new Request('https://booktrip.test/api/booktrip/'+route,{method:body?'POST':'GET',headers:{Origin:'https://booktrip.test','Content-Type':'application/json','QA-Identity':identity,...extra},...(body?{body:JSON.stringify(body)}:{})})});
  return {env,db,call,calls:()=>calls,store:createTripStore(env)};
}
async function role(call,email,value) {const response=await call('admin','admin',{action:'role',email,role:value});assert.equal(response.status,200);return response.json();}
async function create(call,who,text='Viaje ficticio') {const response=await call(who,'chat',message(text));assert.equal(response.status,200);return (await response.json()).data;}

test('verified identities get global roles; only admins manage roles, strict input and origin protect the panel',async t=>{
  const {call,calls}=setup(t);
  await role(call,wife.email,'creator');
  const config=async who=>(await (await call(who,'config')).json()).data;
  assert.equal((await config('admin')).user.role,'admin');assert.equal((await config('admin')).canAdmin,true);
  assert.equal((await config('wife')).canCreate,true);assert.equal((await config('wife')).canAdmin,false);
  assert.equal((await config('reader')).canChat,false);
  for(const who of ['wife','reader']) {
    assert.equal((await call(who,'admin')).status,403);
    assert.equal((await call(who,'admin',{action:'role',email:reader.email,role:'admin'},{'Cf-Access-Authenticated-User-Email':admin.email})).status,403);
  }
  assert.equal((await call('admin','admin',{action:'role',email:admin.email,role:'viewer'})).status,403);
  assert.equal((await call('admin','admin',{action:'role',email:'creator',role:'creator'})).status,400);
  assert.equal((await call('admin','admin',{action:'role',email:reader.email,role:'admin',html:'evil'})).status,400);
  assert.equal((await call('admin','admin',{action:'role',email:reader.email,role:'creator'},{Origin:'https://evil.test'})).status,403);
  assert.equal(calls(),0);
});
test('creators own their trips, cannot edit others by forged IDs/tokens, and admins preserve ownership when editing',async t=>{
  const {env,call,store,db}=setup(t);await role(call,wife.email,'creator');
  const theirs=await create(call,'wife'),mine=await create(call,'admin','Otro viaje ficticio');
  const trip=await store.get(theirs.trip.id),token=await sealDraft(trip,admin,secret);
  const updated=await (await call('admin','chat',message('Admin ajusta viaje de esposa',token))).json();assert.equal(updated.data.saved,true);
  assert.equal(updated.data.trip.id,theirs.trip.id);
  assert.equal((await db.prepare('SELECT owner_id FROM booktrip_trips WHERE id = ?').bind(trip.id).first()).owner_id,wife.id);
  const fresh=await sealDraft(await store.get(trip.id),wife,secret);
  assert.equal((await call('wife','chat',message('Mi propio ajuste',fresh))).status,200);
  const foreign=await sealDraft(await store.get(mine.trip.id),wife,secret);
  assert.equal((await call('wife','chat',message('Cambiar viaje ajeno',foreign))).status,403);
  assert.equal((await call('wife','chat',{...message('Cambio'),tripId:mine.trip.id,role:'admin'})).status,400);
  assert.equal((await call('wife','chat',message('Token de otro usuario',mine.conversationToken))).status,409);
  const forgedRemoval=await sealRemoval(await store.get(mine.trip.id),wife,secret);
  assert.equal((await call('wife','remove',{confirmationToken:forgedRemoval})).status,409);
  assert.equal((await store.catalog({...wife,role:'creator'})).find(entry=>entry.href===`trips/${mine.trip.id}/`).editable,false);
  assert.equal((await store.catalog({...admin,role:'admin'})).filter(entry=>entry.editable).length,2);
  assert.ok(env.BOOKTRIP_DB);
});
test('per-trip editors can edit assigned trips but cannot create or delete; revocation invalidates old sessions and receipts',async t=>{
  const {call,store,db,calls}=setup(t);const created=await create(call,'admin');
  const grant={action:'trip-access',tripId:created.trip.id,email:reader.email,permission:'edit'};
  assert.equal((await call('admin','admin',grant)).status,200);
  const config=(await (await call('reader','config')).json()).data;assert.equal(config.canCreate,false);assert.equal(config.canChat,true);
  const trip=await store.get(created.trip.id),token=await sealDraft(trip,reader,secret),edit=message('Cambio permitido',token);
  const response=await call('reader','chat',edit);assert.equal(response.status,200);
  const edited=(await response.json()).data;assert.equal(edited.saved,true);assert.equal(edited.trip.id,trip.id);
  const n=calls();assert.equal((await call('reader','chat',edit)).status,200);assert.equal(calls(),n);
  assert.equal((await call('reader','chat',message('Crear sin permiso'))).status,403);
  const removal=await sealRemoval(await store.get(trip.id),reader,secret);
  assert.equal((await call('reader','remove',{confirmationToken:removal})).status,409);
  assert.equal((await db.prepare('SELECT owner_id FROM booktrip_trips WHERE id = ?').bind(trip.id).first()).owner_id,admin.id);
  await role(call,reader.email,'creator'); // May still use chat after grant revoked.
  assert.equal((await call('admin','admin',{...grant,permission:'view'})).status,200);
  const before=calls();assert.equal((await call('reader','chat',edit)).status,403);assert.equal(calls(),before);
  assert.equal((await call('reader','chat',message('Contexto antiguo',edited.conversationToken))).status,403);
  assert.equal((await store.get(trip.id)).description,'Cambio permitido');
  assert.equal((await call('admin','admin',{...grant,tripId:'legacy:harpersferry2026'})).status,400);
});
test('demotion blocks ownership edits, and admins can remove another creator trip without transferring its owner',async t=>{
  const {call,store,db}=setup(t);await role(call,wife.email,'creator');const created=await create(call,'wife');
  await role(call,wife.email,'viewer');assert.equal((await call('wife','chat',message('Intento tras revocar rol',created.conversationToken))).status,403);
  const trip=await store.get(created.trip.id),token=await sealRemoval(trip,admin,secret);
  assert.equal((await call('admin','remove',{confirmationToken:token})).status,200);
  assert.equal((await call('admin','remove',{confirmationToken:token})).status,200);
  assert.equal(await store.get(trip.id),null);
  assert.equal((await db.prepare('SELECT owner_id FROM booktrip_removals WHERE trip_id = ?').bind(trip.id).first()).owner_id,wife.id);
});
test('role and grant revocations during inference are enforced atomically at persistence, even with a stale server identity',async t=>{
  const {env,call,store,db}=setup(t);await role(call,wife.email,'creator');const cached=await authorizeIdentity(wife,env);
  await role(call,wife.email,'viewer');
  const trip=structuredClone(sampleTrip);trip.id='revocation-fictional';
  await assert.rejects(store.save(trip,cached,null,'revoked-create',{reply:'Must never succeed'}));
  assert.equal(await store.get(trip.id),null);
  await role(call,wife.email,'creator');const created=await create(call,'wife');const original=await store.get(created.trip.id);
  const edit=structuredClone(original);edit.description='Must never overwrite';
  await role(call,wife.email,'viewer');
  await assert.rejects(store.save(edit,cached,{trip:original},'revoked-edit',{reply:'Must never succeed'}));
  assert.deepEqual(await store.get(original.id),original);
  await db.prepare("INSERT INTO booktrip_trip_access (trip_id,email,permission) VALUES (?,?,'edit')").bind(original.id,reader.email).run();
  const editor=await authorizeIdentity(reader,env);
  await db.prepare('DELETE FROM booktrip_trip_access WHERE trip_id = ? AND email = ?').bind(original.id,reader.email).run();
  await assert.rejects(store.save(edit,editor,{trip:original},'revoked-grant',{reply:'Must never succeed'}));
  assert.deepEqual(await store.get(original.id),original);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM booktrip_receipts WHERE request_key LIKE 'revoked-%'").first()).n,0);
});
