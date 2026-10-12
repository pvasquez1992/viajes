import test from 'node:test';
import assert from 'node:assert/strict';
import {localTripDatabase} from '../scripts/local-trip-store.mjs';
import {importLegacy} from '../scripts/import-legacy.mjs';
import {legacyTrips} from '../js/trip-library.js';
import {validateTrip} from '../js/trip-contract.js';
import {sampleTrip} from './fixtures/trip.js';
import {createTripStore} from '../server/booktrip/store.js';
import {readLibrary,libraryReference} from '../server/booktrip/library.js';
import {createBooktripHandler} from '../server/booktrip/handler.js';
import {createLegacyPageHandler} from '../server/booktrip/legacy-pages.js';
import {sealDraft} from '../server/booktrip/drafts.js';
import {sealRemoval,sealRestore} from '../server/booktrip/removals.js';
import {applyChanges,converse} from '../server/booktrip/assistant.js';
const admin={id:'fictional-admin',email:'admin@example.test',role:'admin',bootstrapAdmin:true},wife={id:'fictional-creator',email:'creator@example.test',role:'creator'},viewer={id:'fictional-viewer',email:'viewer@example.test',role:'viewer'};
const secret='fictional-archive-test-secret-more-than-32-characters';
function fixtureEntries(){return legacyTrips.map(meta=>{const days=[];for(let value=Date.parse(meta.start);value<=Date.parse(meta.end);value+=86400000)days.push({date:new Date(value).toISOString().slice(0,10),title:'Jornada ficticia pendiente',activities:[]});return {trip:{...structuredClone(sampleTrip),id:meta.href.slice(0,-1),title:meta.title,startDate:meta.start,endDate:meta.end,days,reservations:[]},catalog:meta,sourceHash:'a'.repeat(64)};});}
async function setup(t){const db=localTripDatabase();t.after(()=>db.close());const env={BOOKTRIP_DB:db,BOOKTRIP_CREATOR_EMAIL:admin.email,BOOKTRIP_DRAFT_SECRET:secret,ASSETS:{fetch:async url=>new URL(typeof url==='string'?url:url.url || url).pathname.endsWith('catalog.json')?Response.json([]):new Response('<html><head></head><body><h1>Original ficticio</h1><a href="jarvis.html">Mapa</a><img src="img/test.png"></body></html>')}};await db.prepare("INSERT INTO booktrip_users (email,role,user_id) VALUES (?,'creator',?)").bind(wife.email,wife.id).run();await importLegacy(db,fixtureEntries(),admin.id);const store=createTripStore(env);return {db,env,store};}
const input=(text,token)=>({messages:[{role:'user',content:text}],...(token?{conversationToken:token}:{})});
function call(handler,env,route,body){return handler({env,params:{path:route},request:new Request('https://booktrip.test/api/booktrip/'+route,{method:body?'POST':'GET',headers:{Origin:'https://booktrip.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})});}

test('eight legacy IDs migrate to their verified owner, preserve original metadata, and repeated import never overwrites edits or revives archived trips',async t=>{
  const {db,env,store}=await setup(t);assert.equal((await readLibrary(env,store,admin)).length,8);
  const catalog=await readLibrary(env,store,admin);assert.ok(catalog.every(entry=>entry.editable && entry.removable));assert.equal(libraryReference(catalog.find(entry=>entry.href==='suiza2025/')).id,'suiza2025');
  const permissions=await call(createBooktripHandler({identify:async()=>admin}),env,'admin');assert.equal((await permissions.json()).data.trips.length,8);
  assert.ok((await readLibrary(env,store,wife)).every(entry=>!entry.editable));
  const trip=await store.get('suiza2025'),changed=structuredClone(trip);changed.description='Cambio ficticio';await store.save(changed,admin,{trip},'edit-fictional',{reply:'Listo'});
  await store.remove(await store.get('italia2025'),admin);await importLegacy(db,fixtureEntries(),admin.id);
  assert.equal((await store.get('suiza2025')).description,'Cambio ficticio');assert.equal(await store.get('italia2025'),null);assert.equal((await readLibrary(env,store,admin)).length,7);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM booktrip_trips WHERE owner_id = ?').bind(admin.id).first()).n,8);
  const invalid=fixtureEntries();invalid[7].trip.id='unexpected-id';await assert.rejects(importLegacy(db,invalid,admin.id));
});
test('a migrated trip can be selected, edited and proposed for archive through the actual AI protocol with no filesystem deletion',async t=>{
  const {env,store}=await setup(t);let action='select';env.AI={async run(){return {response:{action,tripId:'suiza2025',reply:'Plan ficticio',queries:[]}};}};
  const handler=createBooktripHandler({identify:async()=>admin});let result=await (await call(handler,env,'chat',input('Abre Suiza'))).json();assert.equal(result.data.trip.id,'suiza2025');
  action='delete';result=await (await call(handler,env,'chat',input('Elimina Suiza'))).json();assert.ok(result.data.pendingRemoval);assert.ok(await store.get('suiza2025'));
  const removal=await call(handler,env,'remove',{confirmationToken:result.data.pendingRemoval.confirmationToken});assert.equal(removal.status,200);assert.equal(await store.get('suiza2025'),null);
  assert.ok(!(await readLibrary(env,store,admin)).some(entry=>entry.href==='suiza2025/'));
  assert.equal((await store.legacyInfo('suiza2025')).original_href,'suiza2025/');assert.equal((await call(handler,env,'archive')).status,200);
});
test('Eliminados only exposes restorable trips to their owner or admin; restore preserves ID/permissions and invalidates old tokens after every cycle',async t=>{
  const {env,store,db}=await setup(t),trip=await store.get('suiza2025');await db.prepare("INSERT INTO booktrip_trip_access VALUES (?,?,'edit')").bind(trip.id,wife.email).run();
  const before=await sealDraft(trip,admin,secret),removeToken=await sealRemoval(trip,admin,secret);await store.remove(trip,admin);
  const handler=createBooktripHandler({identify:async()=>admin}),other=createBooktripHandler({identify:async()=>wife});
  assert.deepEqual((await (await call(other,env,'archive')).json()).data,[]);assert.equal((await call(other,env,'archive/'+trip.id)).status,404);
  const listing=(await (await call(handler,env,'archive')).json()).data;assert.equal(listing.length,1);assert.ok(listing[0].originalUrl);
  const response=await call(handler,env,'restore',{restoreToken:listing[0].restoreToken});assert.equal(response.status,200);assert.equal((await store.get(trip.id)).id,trip.id);
  assert.equal((await call(handler,env,'restore',{restoreToken:listing[0].restoreToken})).status,200);
  assert.equal((await store.catalog(wife)).find(entry=>entry.id===trip.id).editable,true);
  assert.equal((await call(handler,env,'remove',{confirmationToken:removeToken})).status,409);
  assert.equal((await call(handler,env,'chat',input('Contexto anterior',before))).status,409);
  const changed=structuredClone(trip);changed.description='Versión anterior nunca debe sobrescribir';await assert.rejects(store.save(changed,admin,{trip,generation:0},'stale-cycle',{reply:'Incorrecto'}));
  await store.remove(trip,admin,1);assert.equal((await call(handler,env,'restore',{restoreToken:listing[0].restoreToken})).status,409);
  const archived=(await store.archived(admin,trip.id))[0];const token=await sealRestore(trip.id,1,archived.removedAt,admin,secret);
  assert.equal((await call(other,env,'restore',{restoreToken:token})).status,409);
  assert.equal((await call(handler,env,'restore',{restoreToken:token})).status,200);assert.equal(await store.generation(trip.id),2);
});
test('old HTML routes block archived entries while original HTML and attachments remain accessible in Eliminados for owners; modified active trips open updated data',async t=>{
  const {env,store}=await setup(t),handler=createLegacyPageHandler({identify:async()=>admin});
  const route=(path,who=handler)=>who({env,request:new Request('https://booktrip.test'+path),next:async()=>new Response('Original asset untouched')});
  assert.equal(await (await route('/suiza2025/')).text(),'Original asset untouched');const trip=await store.get('suiza2025'),changed=structuredClone(trip);changed.description='Nueva descripción';await store.save(changed,admin,{trip},'changed-link',{reply:'Listo'});
  assert.equal((await route('/suiza2025/')).headers.get('Location'),'/trips/suiza2025/');assert.ok((await (await route('/suiza2025/?original=1')).text()).includes('Página original conservada'));
  await store.remove(changed,admin);assert.equal((await route('/suiza2025/')).status,410);
  const original=await route('/eliminados/originales/suiza2025/');assert.equal(original.status,200);const html=await original.text();assert.ok(html.includes('<base href="/suiza2025/">'));assert.ok(html.includes('/eliminados/originales/suiza2025/jarvis.html'));assert.ok(html.includes('img/test.png'));
  assert.equal(await (await route('/suiza2025/img/test.png')).text(),'Original asset untouched');
  assert.equal((await route('/eliminados/originales/suiza2025/',createLegacyPageHandler({identify:async()=>viewer}))).status,404);
  assert.equal((await route('/eliminados/trips/suiza2025/')).status,200);const archived=(await store.archived(admin,trip.id))[0];await store.restore(trip.id,admin,0,archived.removedAt);assert.equal((await route('/suiza2025/')).status,302);
});
test('long existing itineraries use bounded changes, preserving untouched days, original notes, unknown durations and all retained sources',async()=>{
  const trip=structuredClone(sampleTrip);trip.notes='Nota ficticia '.repeat(750);trip.days[0].activities[0].durationMinutes=null;validateTrip(trip);
  const changes={description:'Nueva descripción ficticia'};assert.equal(applyChanges(trip,changes).notes,trip.notes);assert.deepEqual(applyChanges(trip,changes).days,trip.days);assert.throws(()=>applyChanges(trip,{owner_id:'another-user'}));
  let n=0;const env={AI:{async run(_model,request){n++;if(n===1)return {response:{action:'draft',tripId:null,reply:'Ficticio',queries:[]}};assert.ok(request.response_format.json_schema.properties.changes);return {response:{reply:'Cambio ficticio',changes}};}}};
  const result=await converse(input('Cambia solo descripción'),{trip,research:[]},env);assert.equal(result.trip.description,changes.description);assert.deepEqual(result.trip.days,trip.days);assert.equal(result.trip.notes,trip.notes);
});
