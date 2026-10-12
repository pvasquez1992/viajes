import test from 'node:test';
import assert from 'node:assert/strict';
import {localTripDatabase} from '../scripts/local-trip-store.mjs';
import {createBooktripHandler} from '../server/booktrip/handler.js';
import {createTripStore} from '../server/booktrip/store.js';
import {sealDraft} from '../server/booktrip/drafts.js';
import {sampleTrip} from './fixtures/trip.js';

// Fictional identities, local SQLite; no production data or hosted inference.
const people={admin:{id:'qa-admin',email:'admin@example.test',name:'Admin'},creator:{id:'qa-creator',email:'creator@example.test',name:'Creador'},reader:{id:'qa-reader',email:'reader@example.test',name:'Lector'}};
function setup(t) {
  const db=localTripDatabase();t.after(()=>db.close());let calls=0,nextScope='read';
  const env={BOOKTRIP_DB:db,BOOKTRIP_CREATOR_EMAIL:people.admin.email,BOOKTRIP_DRAFT_SECRET:'fictional-capability-secret-at-least-32-characters',ASSETS:{fetch:async()=>Response.json([])},AI:{run:async()=>{calls++;return {response:{action:'list',reply:'Puedes ajustar todos, texto del modelo que no se debe usar.',queries:[],tripId:null,listScope:nextScope}};}}};
  for(const [person,role] of [['admin','admin'],['creator','creator'],['reader','viewer']])db.prepare('INSERT INTO booktrip_users (email,role,user_id) VALUES (?,?,?)').bind(people[person].email,role,people[person].id).run();
  const handler=createBooktripHandler({identify:async request=>people[request.headers.get('QA-Identity')]});
  const call=(who,route,body)=>handler({env,params:{path:route},request:new Request('https://booktrip.test/api/booktrip/'+route,{method:body?'POST':'GET',headers:{Origin:'https://booktrip.test','Content-Type':'application/json','QA-Identity':who},...(body?{body:JSON.stringify(body)}:{})})});
  const chat=async(who,text,token)=>{const response=await call(who,'chat',{messages:[{role:'user',content:text}],...(token?{conversationToken:token}:{})});assert.equal(response.status,200);return (await response.json()).data;};
  const seed=(id,owner)=>{const trip={...structuredClone(sampleTrip),id,title:'Viaje ficticio '+id};db.prepare('INSERT INTO booktrip_trips (id,owner_id,create_key,document) VALUES (?,?,?,?)').bind(id,people[owner].id,'fixture-'+id,JSON.stringify(trip)).run();return trip;};
  const grant=(id,who)=>db.prepare("INSERT INTO booktrip_trip_access (trip_id,email,permission) VALUES (?,?,'edit')").bind(id,people[who].email).run();
  return {db,env,call,chat,seed,grant,calls:()=>calls,scope:value=>nextScope=value};
}

test('a creator with no owned or assigned trip receives no editable suggestions and cannot write a foreign trip',async t=>{
  const {env,call,chat,seed,calls}=setup(t),foreign=seed('foreign-trip','admin');
  const config=(await (await call('creator','config')).json()).data;
  assert.equal(config.canCreate,true);assert.equal(config.canEdit,false);assert.equal(config.canChat,true);
  for(const question of ['¿Qué viajes puedo ajustar?','qué viajes puedo editar','Lista los viajes que puedo modificar','¿Cuáles puedo cambiar?']) {
    const result=await chat('creator',question);assert.deepEqual(result.trips,[]);assert.match(result.reply,/No tienes permiso/);assert.equal(result.saved,false);assert.equal(result.conversationToken,null);
  }
  assert.equal(calls(),0);
  const general=await chat('creator','Muéstrame el libro');assert.ok(general.trips.length>0);assert.ok(general.trips.every(entry=>entry.editable===false));assert.match(general.reply,/No tienes permiso para ajustar/);
  const forged=await sealDraft(foreign,people.creator,env.BOOKTRIP_DRAFT_SECRET);
  const response=await call('creator','chat',{messages:[{role:'user',content:'Cambiar descripción ajena'}],conversationToken:forged});assert.equal(response.status,403);
  assert.deepEqual(await createTripStore(env).get(foreign.id),foreign);
});

test('editable lists contain owned and granted trips; removable lists exclude invited editing and update on revocation',async t=>{
  const {db,call,chat,seed,grant,calls}=setup(t);
  seed('own-trip','creator');seed('granted-trip','admin');seed('foreign-trip','admin');grant('granted-trip','creator');
  assert.equal((await (await call('creator','config')).json()).data.canEdit,true);
  const editable=await chat('creator','¿Qué viajes puedo ajustar?');assert.deepEqual(editable.trips.map(entry=>entry.id).sort(),['granted-trip','own-trip']);assert.ok(editable.trips.every(entry=>entry.editable));
  const removable=await chat('creator','¿Qué viajes puedo eliminar?');assert.deepEqual(removable.trips.map(entry=>entry.id),['own-trip']);assert.equal(removable.pendingRemoval,undefined);
  db.prepare('DELETE FROM booktrip_trip_access WHERE trip_id = ?').bind('granted-trip').run();
  assert.deepEqual((await chat('creator','¿Qué viajes puedo editar?')).trips.map(entry=>entry.id),['own-trip']);assert.equal(calls(),0);
});

test('admins list all manageable trips and a viewer with one grant sees only that editable trip',async t=>{
  const {call,chat,seed,grant}=setup(t);seed('first-trip','admin');seed('second-trip','creator');grant('second-trip','reader');
  assert.equal((await chat('admin','¿Qué viajes puedo ajustar?')).trips.length,2);
  const result=await chat('reader','¿Qué viajes puedo ajustar?');assert.deepEqual(result.trips.map(entry=>entry.id),['second-trip']);
  assert.deepEqual((await chat('reader','¿Qué viajes puedo borrar?')).trips,[]);
  const config=(await (await call('reader','config')).json()).data;assert.equal(config.canCreate,false);assert.equal(config.canEdit,true);
});

test('planner scopes filter paraphrased lists by actual permissions and reject invalid scopes',async t=>{
  const {call,chat,seed,scope}=setup(t);seed('own-trip','creator');seed('foreign-trip','admin');scope('edit');
  const result=await chat('creator','Muéstrame lo que puedo gestionar');assert.deepEqual(result.trips.map(entry=>entry.id),['own-trip']);assert.ok(!result.reply.includes('ajustar todos'));
  scope('everyone');const response=await call('creator','chat',{messages:[{role:'user',content:'Mis opciones'}]});assert.equal(response.status,502);
});
