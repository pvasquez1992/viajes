import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTrip } from './fixtures/trip.js';
import { markup } from '../templates/halloween/index.js';
import { presentTrip } from '../js/trip-presentation.js';
import { validateTrip } from '../js/trip-contract.js';
import { createBooktripHandler } from '../server/booktrip/handler.js';
import { localTripDatabase } from '../scripts/local-trip-store.mjs';
import { createTripStore } from '../server/booktrip/store.js';

test('Halloween renders generic data, moments and safe tickets without copying real Harpers Ferry bookings',()=>{
  const trip=structuredClone(sampleTrip);
  trip.title='<img src=x onerror=alert(1)>';
  trip.reservations=[{type:'hotel',provider:'Hotel de ejemplo',startDate:trip.startDate,startTime:'15:00',endDate:trip.endDate,endTime:'11:00',notes:'<script>bad()</script>',status:'user-provided'}];
  const html=markup(trip,['<b>warning</b>']);
  assert.ok(html.includes('moment-grid') && html.includes('Mañana') && html.includes('Tarde') && html.includes('Noche'));
  assert.ok(html.includes('booking-ticket-hotel') && html.includes('CHECK-IN'));
  assert.ok(html.includes('Datos aportados') && !html.includes('Confirmado'));
  assert.ok(html.includes('&lt;img') && html.includes('&lt;script&gt;') && html.includes('&lt;b&gt;warning'));
  assert.ok(!html.includes('<script>') && !html.includes('Hertz') && !html.includes('Quality Inn'));
  assert.ok(html.includes('href="#day-1"') && html.includes('href="#day-2"'));
  assert.ok(html.includes('https://www.google.com/maps/search/'));
  trip.reservations=[];assert.ok(!markup(trip).includes('booking-ticket'));
  trip.theme='city';assert.ok(markup(trip).includes('template-halloween'));
});

test('a missing registry entry, module, stylesheet or failing renderer uses the basic reader without changing data',async()=>{
  const trip=structuredClone(sampleTrip),original=JSON.stringify(trip);
  const failures=[new Map(),new Map([['halloween',{load:async()=>{throw Error('Missing module');}}]]),new Map([['halloween',{load:async()=>({render(){throw Error('Broken renderer');}})}]]),new Map([['halloween',{styles:['/missing.css'],load:async()=>({render(){throw Error('Must not render');}})}]])];
  for(const registry of failures) {
    const container={innerHTML:'',dataset:{}};
    const result=await presentTrip(container,trip,[],{registry,ensureStyle:async()=>{throw Error('Missing CSS');}});
    assert.equal(result.template,'basic');assert.equal(container.dataset.template,'basic');
    assert.ok(container.innerHTML.includes(trip.title));assert.equal(JSON.stringify(trip),original);
  }
  const container={innerHTML:'',dataset:{}};
  const result=await presentTrip(container,trip,[],{ensureStyle:async()=>{}});
  assert.equal(result.template,'halloween');assert.ok(container.innerHTML.includes('moment-grid'));assert.equal(JSON.stringify(trip),original);
});

test('chat saves and edits the same data while a reader has no optional templates',async(t)=>{
  const db=localTripDatabase();t.after(()=>db.close());
  const identity={id:'owner',name:'Pedro',email:'owner@example.test'};
  const env={BOOKTRIP_DB:db,BOOKTRIP_CREATOR_EMAIL:identity.email,BOOKTRIP_DRAFT_SECRET:'fictional-signing-secret-at-least-32-characters'};
  const handler=createBooktripHandler({identify:async()=>identity,chat:async(input,current)=>{
    assert.ok(!Object.hasOwn(input,'templateId'));
    const trip=structuredClone(current?.trip || sampleTrip);if(current)trip.description='Ajustado sin plantilla';
    return {trip,research:[],warnings:[]};
  }});
  async function call(body) {return handler({request:new Request('https://booktrip.test/api/booktrip/chat',{method:'POST',headers:{Origin:'https://booktrip.test','Content-Type':'application/json'},body:JSON.stringify(body)}),env,params:{path:'chat'}});}
  const first=await (await call({messages:[{role:'user',content:'Crear viaje'}]})).json();
  const container={innerHTML:'',dataset:{}};
  await presentTrip(container,await createTripStore(env).get(first.data.trip.id),[],{registry:new Map()});
  assert.equal(container.dataset.template,'basic');
  const edited=await (await call({messages:[{role:'user',content:'Ajustar viaje'}],conversationToken:first.data.conversationToken})).json();
  assert.equal(edited.data.trip.id,first.data.trip.id);
  assert.equal((await createTripStore(env).get(edited.data.trip.id)).description,'Ajustado sin plantilla');
  const invalid=structuredClone(sampleTrip);invalid.templateId='halloween';assert.throws(()=>validateTrip(invalid));
});
