import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleTrip} from './fixtures/trip.js';
import {localTripDatabase} from '../scripts/local-trip-store.mjs';
import {createBooktripHandler} from '../server/booktrip/handler.js';
import {createTripStore} from '../server/booktrip/store.js';
import {sealDraft} from '../server/booktrip/drafts.js';
import {converse} from '../server/booktrip/assistant.js';
const admin={id:'discussion-admin',email:'admin@example.test',name:'Admin QA'},creator={id:'discussion-creator',email:'creator@example.test',name:'Creator QA'};
function setup(t,respond,who=admin) {
  const db=localTripDatabase();t.after(()=>db.close());let calls=0;
  const trip=structuredClone(sampleTrip),env={BOOKTRIP_DB:db,BOOKTRIP_CREATOR_EMAIL:admin.email,BOOKTRIP_DRAFT_SECRET:'fictional-discussion-secret-more-than-32-characters',ASSETS:{fetch:async()=>Response.json([])},AI:{run:async(_model,request)=>({response:await respond(request,++calls)})}};
  db.prepare("INSERT INTO booktrip_users (email,role,user_id) VALUES (?,'creator',?)").bind(creator.email,creator.id).run();
  db.prepare('INSERT INTO booktrip_trips (id,owner_id,create_key,document) VALUES (?,?,?,?)').bind(trip.id,admin.id,'fixture',JSON.stringify(trip)).run();
  const handler=createBooktripHandler({identify:async()=>who});
  const call=(text,token)=>handler({env,params:{path:'chat'},request:new Request('https://booktrip.test/api/booktrip/chat',{method:'POST',headers:{Origin:'https://booktrip.test','Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:text}],...(token?{conversationToken:token}:{})})})});
  return {db,trip,env,call,store:createTripStore(env),calls:()=>calls};
}
const context=request=>JSON.parse(request.messages.find(message=>message.role==='user').content);
const plan=(action,tripId=null)=>({action,tripId,listScope:'read',reply:'Plan QA',queries:[]});

test('more ideas and itinerary review answer from the selected trip, preserve its context and perform no writes',async t=>{
  const {trip,env,call,store,db,calls}=setup(t,request=>{
    if(request.response_format.json_schema.properties.action)return plan('select',sampleTrip.id);
    const selected=context(request).selectedTrip;assert.equal(selected.destination,'Harpers Ferry');assert.equal(selected.days[0].activities[0].time,'10:00');assert.equal(selected.days[0].activities[0].durationMinutes,60);
    assert.deepEqual(context(request).occupiedTimes[0].intervals[0],{title:'Llegada y café',start:'10:00',end:'11:00'});
    assert.ok(request.messages[0].content.includes('traslados demasiado ajustados'));
    assert.deepEqual(Object.keys(request.response_format.json_schema.properties),['reply']);
    return {reply:'Podrías dedicar las 16:30 a un paseo corto, como alternativa. Confirma condiciones. No he modificado el viaje.',trip:{...selected,description:'Invented write must be ignored'}};
  });
  const token=await sealDraft(trip,admin,env.BOOKTRIP_DRAFT_SECRET);
  for(const text of ['Que más podemos hacer en ese lugar ?','más info','Revisa el itinerario y dime si tiene sentido']) {
    const response=await call(text,token);assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.saved,false);assert.equal(data.trip,null);assert.equal(data.conversationToken,token);assert.ok(data.reply.includes('16:30'));assert.ok(!data.reply.includes('Cargué'));assert.ok(data.warnings.some(value=>value.includes('Sin búsqueda web')));
  }
  assert.equal(calls(),6);assert.deepEqual(await store.get(trip.id),trip);assert.equal((await db.prepare('SELECT count(*) AS n FROM booktrip_receipts').first()).n,0);
});

test('a creator can discuss a visible foreign trip without receiving an editing context or changing its document',async t=>{
  const {trip,call,store}=setup(t,(request,n)=>n===1?plan('discuss',sampleTrip.id):{reply:'El almuerzo está propuesto a las 13:00; puedes valorar otra pausa.'},creator);
  const response=await call('Háblame del almuerzo de ese viaje');assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.trip,null);assert.equal(data.conversationToken,null);assert.equal(data.saved,false);
  assert.deepEqual(await store.get(trip.id),trip);assert.equal(await store.getEditable(trip.id,{...creator,role:'creator'}),null);
});

test('free travel advice without a selected trip does not create one, and unknown trip IDs cannot load data',async t=>{
  let target=null,read=0;
  const env={AI:{run:async(_model,request)=>request.response_format.json_schema.properties.action?{response:plan('discuss',target)}:{response:{reply:'Podrías comparar una escapada con senderos y otra urbana. ¿Qué prefieres?'}}}};
  const options={readTrip:async()=>{read++;return sampleTrip;}};
  const input={messages:[{role:'user',content:'Necesito ideas para una escapada sin fechas todavía'}]};
  const result=await converse(input,null,env,options);assert.equal(result.trip,null);assert.ok(result.reply.includes('escapada'));assert.equal(read,0);
  target='unknown-trip';const unknown=await converse(input,null,env,options);assert.ok(unknown.reply.includes('No encontré'));assert.equal(read,0);
});

test('discussion preserves the selected version for a later explicitly requested edit',async t=>{
  const {trip,env,call,store}=setup(t,request=>{
    if(request.response_format.json_schema.properties.action)return plan('draft');
    if(context(request).selectedTrip)return {reply:'Puedes ampliar el descanso, sin cambiar nada todavía.'};
    const changed=context(request).currentDraft;changed.description='Cambio pedido expresamente';return {reply:'Editado QA',trip:changed};
  });
  const token=await sealDraft(trip,admin,env.BOOKTRIP_DRAFT_SECRET);
  const discussed=(await (await call('¿Qué más podemos hacer?',token)).json()).data;assert.equal(discussed.conversationToken,token);
  const response=await call('Cambia la descripción a Cambio pedido expresamente',discussed.conversationToken);assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.saved,true);assert.equal(data.trip.id,trip.id);assert.equal((await store.get(trip.id)).description,'Cambio pedido expresamente');
});

test('discussion can use research sources and bounds large trip context while preserving known times and dates',async t=>{
  const trip=structuredClone(sampleTrip);trip.notes='Logística ficticia. '.repeat(1100);let calledResearch=false;
  const env={BOOKTRIP_SEARCH_KEY:'fictional-key',AI:{run:async(_model,request)=>{if(request.response_format.json_schema.properties.action)return {response:plan('discuss')};const data=context(request);assert.equal(data.selectedTrip.startDate,trip.startDate);assert.equal(data.selectedTrip.days[0].activities[0].time,'10:00');assert.equal(data.selectedTrip.contextSummarized,true);assert.ok(JSON.stringify(data.selectedTrip).length<19000);assert.equal(data.sources[0].url,'https://example.test/verified');return {response:{reply:'Consulta la fuente recibida; no acredita disponibilidad.'}};}}};
  const result=await converse({messages:[{role:'user',content:'Recomiéndame alternativas'}]},{trip,research:[]},env,{research:async()=>{calledResearch=true;return [{url:'https://example.test/verified',title:'Fuente QA',content:'Datos ficticios'}];}});assert.equal(calledResearch,true);assert.deepEqual(result.warnings,[]);assert.equal(result.trip,null);
});

test('advice replies fit the next chat request history limit and reject excessive model text',async t=>{
  let length=3500;
  const {env,trip,call}=setup(t,request=>request.response_format.json_schema.properties.action?plan('discuss'):{reply:'x'.repeat(length)});
  const token=await sealDraft(trip,admin,env.BOOKTRIP_DRAFT_SECRET);
  const response=await call('Más info',token);assert.equal(response.status,200);assert.equal((await response.json()).data.reply.length,3500);
  length=3501;const oversized=await call('Cuéntame más',token);assert.equal(oversized.status,502);assert.equal((await oversized.json()).error.code,'invalid_ai_output');
});

test('daily AI quota failures in planning and generation preserve trips and save receipts',async t=>{
  for(const failOn of [1,2]) {
    const {env,trip,call,store,db,calls}=setup(t,(_request,n)=>{
      if(n===failOn)throw Error('AiError: you have used up your daily free allocation of 10,000 neurons, private upstream text');
      return plan('draft');
    });
    const token=await sealDraft(trip,admin,env.BOOKTRIP_DRAFT_SECRET);
    const response=await call('Cambia la descripción a tranquila',token),body=await response.json();
    assert.equal(response.status,429);assert.equal(body.error.code,'ai_quota_exceeded');
    assert.ok(body.error.message.includes('00:00 UTC'));assert.ok(!JSON.stringify(body).includes('private upstream'));
    assert.equal(calls(),failOn);assert.deepEqual(await store.get(trip.id),trip);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM booktrip_receipts').first()).n,0);
  }
});

test('AI diagnostics distinguish quota, capacity, other provider errors and invalid JSON without leaking their text',async t=>{
  const records=[];t.mock.method(console,'warn',value=>records.push(JSON.parse(value)));
  const cases=[
    {failure:Object.assign(Error('private quota details'),{code:3036}),status:429,code:'ai_quota_exceeded',kind:'daily_quota'},
    {failure:Error('AiError: 3036: private quota details'),status:429,code:'ai_quota_exceeded',kind:'daily_quota'},
    {failure:Object.assign(Error('Capacity temporarily exceeded; private data'),{code:3040}),status:502,code:'ai_unavailable',kind:'upstream'},
    {failure:Object.assign(Error('Generic private error'),{code:4006}),status:502,code:'ai_unavailable',kind:'upstream'},
    {output:'{"reply":"truncated private data',status:502,code:'invalid_ai_output',kind:'invalid_json'}
  ];
  for(const value of cases) {
    const {env,call}=setup(t,()=>{if(value.failure)throw value.failure;return value.output;});
    const response=await call('hola'),body=await response.json();assert.equal(response.status,value.status);assert.equal(body.error.code,value.code);
    assert.ok(!JSON.stringify(body).includes('private'));assert.deepEqual(records.at(-1),{event:'booktrip_ai_failure',phase:'planner',kind:value.kind});
  }
});
