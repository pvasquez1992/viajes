import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTrip } from './fixtures/trip.js';
import { catalogEntry } from '../js/trip-contract.js';
import { legacyTrips } from '../js/trip-library.js';
import { createBooktripHandler } from '../server/booktrip/handler.js';
import { createTripStore } from '../server/booktrip/store.js';
import { readLibrary,libraryReference } from '../server/booktrip/library.js';
import { openDraft,sealDraft } from '../server/booktrip/drafts.js';
import { localTripDatabase } from '../scripts/local-trip-store.mjs';

const identity={id:'owner',email:'owner@example.test',name:'Pedro'};
const secret='private-fictional-library-test-secret-32-characters';
const clone=()=>structuredClone(sampleTrip);
const input=(content,token)=>({messages:[{role:'user',content}],...(token?{conversationToken:token}:{})});
function setup(t,decide) {
  const db=localTripDatabase();t.after(()=>db.close());
  let calls=0;
  const env={BOOKTRIP_DB:db,BOOKTRIP_CREATOR_EMAIL:identity.email,BOOKTRIP_DRAFT_SECRET:secret,ASSETS:{fetch:async()=>Response.json([])},AI:{async run(_model,request){calls++;return {response:await decide(request,calls)};}}};
  const handler=createBooktripHandler({identify:async()=>identity});
  const call=body=>handler({request:new Request('https://booktrip.test/api/booktrip/chat',{method:'POST',headers:{Origin:'https://booktrip.test','Content-Type':'application/json'},body:JSON.stringify(body)}),env,params:{path:'chat'}});
  return {env,call,calls:()=>calls};
}
function seed(env,trip,owner=identity) {
  env.BOOKTRIP_DB.prepare('INSERT INTO booktrip_trips (id,owner_id,create_key,document) VALUES (?,?,?,?)').bind(trip.id,owner.id,'fixture-'+trip.id,JSON.stringify(trip)).run();
}
const plan=(action,tripId=null)=>({action,tripId,reply:'Respuesta del modelo no fiable para la lista',queries:[]});
const context=request=>JSON.parse(request.messages.find(message=>message.role==='user').content);

test('the library combines the same eight legacy entries, reviewed static trips and D1 without duplicates',async(t)=>{
  const {env}=setup(t,()=>{throw Error('No inference');});
  const stored=clone();stored.title='Boston ficticio';seed(env,stored);
  const generated={...clone(),id:'generated-example'};
  env.ASSETS.fetch=async request=>{assert.equal(new URL(request.url).pathname,'/trips/catalog.json');return Response.json([catalogEntry(stored),catalogEntry(generated)]);};
  const library=await readLibrary(env,createTripStore(env),identity);
  assert.equal(legacyTrips.length,8);assert.equal(library.length,10);
  assert.equal(library.find(entry=>entry.title===stored.title).editable,true);
  assert.equal(library.find(entry=>entry.href==='trips/generated-example/').editable,false);
  assert.deepEqual(library.filter(entry=>!entry.href.startsWith('trips/')).map(entry=>entry.title),legacyTrips.map(entry=>entry.title));
  const foreign=await readLibrary(env,createTripStore(env),{id:'another-user'});
  assert.ok(foreign.every(entry=>entry.editable===false));
  assert.equal(await createTripStore(env).getEditable(stored.id,{id:'another-user'}),null);
  env.ASSETS.fetch=async()=>new Response('unavailable',{status:503});
  await assert.rejects(readLibrary(env,createTripStore(env),identity),error=>error.code==='catalog_unavailable');
});

test('listing uses the real catalog even with no selected trip, and performs no writes or research',async(t)=>{
  const {env,call,calls}=setup(t,request=>{
    const data=context(request);assert.equal(data.currentDraft,null);assert.equal(data.library.length,9);
    assert.ok(data.library.some(entry=>entry.title==='Boston ficticio'));
    return plan('list');
  });
  const saved=clone();saved.title='Boston ficticio';seed(env,saved);
  const before=await createTripStore(env).get(saved.id);
  const response=await call(input('¿Puedes listar los viajes que tengo?'));assert.equal(response.status,200);
  const {data}=await response.json();assert.ok(data.reply.startsWith('Tienes 9 viajes'));assert.equal(data.trips.length,9);assert.equal(data.saved,false);assert.equal(data.conversationToken,null);
  assert.ok(data.trips.some(entry=>entry.url==='/harpersferry2026/'));
  assert.ok(!JSON.stringify(data).includes('owner@example.test'));assert.equal(calls(),1);
  assert.deepEqual(await createTripStore(env).get(saved.id),before);
  assert.equal((await env.BOOKTRIP_DB.prepare('SELECT count(*) AS n FROM booktrip_receipts').first()).n,0);
});

test('selecting a stored trip in a new chat signs its saved version, then editing keeps its ID and is idempotent',async(t)=>{
  let selectedId;
  const {env,call,calls}=setup(t,(request,number)=>{
    if(number===1) {selectedId=context(request).library.find(entry=>entry.editable).id;return plan('select',selectedId);}
    if(request.messages.at(-1).content.startsWith('Decide')) {assert.equal(context(request).currentDraft.id,selectedId);return plan('draft');}
    const value=context(request).currentDraft;value.description='Boston ficticio con una pausa '+number;return {reply:'Modificado',trip:value};
  });
  const saved=clone();saved.title='Boston ficticio';seed(env,saved);
  const first=await (await call(input('Quiero cambiar Boston'))).json();
  assert.ok(first.data.reply.startsWith('Cargué'));assert.equal(first.data.saved,false);assert.equal(first.data.trip.id,saved.id);
  assert.deepEqual((await openDraft(first.data.conversationToken,identity,secret)).trip,saved);
  assert.deepEqual(await createTripStore(env).get(saved.id),saved);
  const edit=input('Añade una pausa',first.data.conversationToken);
  const edited=await (await call(edit)).json();assert.equal(edited.data.trip.id,saved.id);assert.equal(edited.data.saved,true);assert.ok(edited.data.reply.startsWith('Actualicé'));
  assert.equal((await createTripStore(env).catalog()).length,1);
  assert.equal((await createTripStore(env).get(saved.id)).description,'Boston ficticio con una pausa 3');
  assert.deepEqual(await (await call(edit)).json(),edited);assert.equal(calls(),3);
  assert.equal((await call(input('Otro cambio desde una versión antigua',first.data.conversationToken))).status,409);
});

test('a concrete named edit loads the saved document in one turn, can switch trips, and preserves existing sources',async(t)=>{
  const selected=clone();selected.id='boston-fictional';selected.title='Boston ficticio';selected.days[0].activities[0].sourceUrls=['https://example.test/retained'];
  const previous=clone();previous.id='other-fictional';
  const {env,call}=setup(t,request=>{
    if(request.messages.at(-1).content.startsWith('Decide')) return plan('edit',selected.id);
    const data=context(request);assert.equal(data.currentDraft.id,selected.id);
    assert.ok(request.messages.at(-1).content.includes('Enlace guardado'));
    data.currentDraft.description='Cambio solicitado para Boston';return {reply:'Listo',trip:data.currentDraft};
  });
  seed(env,selected);seed(env,previous);
  const token=await sealDraft(previous,identity,secret);
  const response=await call(input('En Boston añade una pausa',token));assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.data.trip.id,selected.id);assert.ok(result.data.reply.startsWith('Actualicé'));
  assert.deepEqual(await createTripStore(env).get(previous.id),previous);
  assert.equal((await createTripStore(env).get(selected.id)).description,'Cambio solicitado para Boston');
});

test('legacy selections open the original page and clear another selected trip without creating copies',async(t)=>{
  const halloween=libraryReference(legacyTrips.find(entry=>entry.href==='harpersferry2026/'));
  const {env,call,calls}=setup(t,()=>plan('edit',halloween.id));
  const saved=clone();seed(env,saved);const token=await sealDraft(saved,identity,secret);
  const {data}=await (await call(input('Cambia Halloween',token))).json();
  assert.equal(data.trip.url,'/harpersferry2026/');assert.equal(data.conversationToken,null);assert.equal(data.saved,false);assert.ok(data.reply.includes('aún no se puede editar'));
  assert.equal(calls(),1);assert.deepEqual(await createTripStore(env).get(saved.id),saved);assert.equal((await createTripStore(env).catalog()).length,1);
});

test('unknown, ambiguous, read-only and deletion requests do not create, update or remove trips',async(t)=>{
  const {env,call}=setup(t,request=>{
    const last=context(request).conversation.at(-1).content;
    if(last.includes('elimina')) return plan('unsupported');
    if(last.includes('ambiguo')) return {...plan('clarify'),reply:'¿Cuál de los dos viajes a Boston quieres ajustar?'};
    return plan('edit',last.includes('ajeno')?'foreign-fictional':'invented-id');
  });
  env.BOOKTRIP_CREATOR_EMAIL='bootstrap-admin@example.test';
  await env.BOOKTRIP_DB.prepare("INSERT INTO booktrip_users (email,role) VALUES (?,'creator')").bind(identity.email).run();
  const saved=clone();seed(env,saved);
  const foreign={...clone(),id:'foreign-fictional'};seed(env,foreign,{id:'another-owner'});
  for(const request of ['elimina Boston','Boston ambiguo','editar viaje ajeno','editar un viaje inexistente']) {
    const response=await call(input(request));assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.saved,false);assert.ok(!data.reply.includes('Creé') && !data.reply.includes('Actualicé'));
  }
  assert.equal((await createTripStore(env).catalog()).length,2);assert.deepEqual(await createTripStore(env).get(saved.id),saved);assert.deepEqual(await createTripStore(env).get(foreign.id),foreign);
});

test('an incomplete catalog fails before inference rather than claiming the book is empty',async(t)=>{
  const {env,call,calls}=setup(t,()=>{throw Error('No inference');});
  env.ASSETS.fetch=async()=>new Response('Access redirect',{status:302});
  const response=await call(input('Lista mis viajes'));assert.equal(response.status,503);assert.equal((await response.json()).error.code,'catalog_unavailable');assert.equal(calls(),0);
});
