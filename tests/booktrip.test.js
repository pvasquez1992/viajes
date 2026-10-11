import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateKeyPair,exportJWK,createLocalJWKSet,SignJWT } from 'jose';
import { sampleTrip } from './fixtures/trip.js';
import { validateTrip,TripError } from '../js/trip-contract.js';
import { tripMarkup } from '../js/trip-view.js';
import { sealDraft,openDraft } from '../server/booktrip/drafts.js';
import { createIdentityVerifier } from '../server/booktrip/access.js';
import { converse } from '../server/booktrip/assistant.js';
import { researchQueries } from '../server/booktrip/research.js';
import { proposePublication } from '../server/booktrip/github.js';
import { createBooktripHandler } from '../functions/api/booktrip/[[path]].js';
import { generateTrips } from '../scripts/generate-trips.mjs';
const trip=()=>structuredClone(sampleTrip);
const identity={id:'pedro',name:'Pedro'};
const env={BOOKTRIP_DRAFT_SECRET:'private-test-signing-secret-32-characters',AI:{run(){throw Error('No real AI in these tests');}}};
const request=(route,input,overrides={})=>({request:new Request(`https://booktrip.test/api/booktrip/${route}`,{method:route==='config'?'GET':'POST',headers:{Origin:'https://booktrip.test','Content-Type':'application/json',...overrides.headers},...(route==='config'?{}:{body:JSON.stringify(input)}),...overrides.options}),env,params:{path:route}});

test('trip contract rejects impossible dates, missing days, extra fields, duplicate IDs, overlaps and incorrect periods',()=>{
  assert.equal(validateTrip(trip()).trip.days.length,2);
  for(const mutate of [t=>t.startDate='2026-02-30',t=>t.days.pop(),t=>t.secret='sensitive',t=>t.id='../home',t=>t.days[1].activities[0].id='llegada',t=>t.days[0].activities[1].time='10:30',t=>t.days[0].activities[0].period='evening',t=>t.days[0].activities[0].sourceUrls=['javascript:alert(1)']]) {const value=trip();mutate(value);assert.throws(()=>validateTrip(value),TripError);}
});
test('reservations cannot claim AI-confirmed bookings or end before they start',()=>{
  const value=trip();value.reservations=[{type:'hotel',provider:'Hotel de ejemplo',startDate:value.startDate,startTime:'15:00',endDate:value.endDate,endTime:'11:00',notes:'Datos ficticios',status:'user-provided'}];
  assert.equal(validateTrip(value).trip.reservations.length,1);
  value.reservations[0].status='confirmed';assert.throws(()=>validateTrip(value),/estado/);
  value.reservations[0].status='proposed';value.reservations[0].endDate='2026-10-30';assert.throws(()=>validateTrip(value),/fechas/);
});
test('rendering escapes model text, keeps moments and tickets compact, and builds only HTTPS map links',()=>{
  const value=trip();value.title='<img src=x onerror=alert(1)>';value.days[0].activities[0].description='<script>bad()</script>';
  const html=tripMarkup(value,['<b>warning</b>']);
  assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;b&gt;warning'));
  assert.ok(html.includes('Mañana') && html.includes('Tarde') && html.includes('Noche'));assert.ok(html.includes('https://www.google.com/maps/search/'));
});
test('signed drafts reject modification, wrong user and expiry without exposing the secret',async()=>{
  const token=await sealDraft(trip(),identity,env.BOOKTRIP_DRAFT_SECRET,[],1000);
  assert.equal((await openDraft(token,identity,env.BOOKTRIP_DRAFT_SECRET,2000)).trip.id,sampleTrip.id);
  assert.ok(!token.includes(env.BOOKTRIP_DRAFT_SECRET));
  await assert.rejects(openDraft(token,{id:'wife'},env.BOOKTRIP_DRAFT_SECRET,2000),/otra sesión/);
  await assert.rejects(openDraft(token,identity,env.BOOKTRIP_DRAFT_SECRET,86401001),/venció/);
  await assert.rejects(openDraft('a'+token.slice(1),identity,env.BOOKTRIP_DRAFT_SECRET,2000),/venció/);
});
test('identity comes from a verified application JWT, never the supplied email header',async()=>{
  const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);
  const verify=createIdentityVerifier({getKeySet:()=>createLocalJWKSet({keys:[{...jwk,kid:'test'}]})});
  const settings={ACCESS_AUD:'booktrip',ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com'};
  const token=await new SignJWT({type:'app',email:'pedro@example.test'}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://test.cloudflareaccess.com').setAudience('booktrip').setSubject('real-user').setExpirationTime('5m').sign(privateKey);
  const req=new Request('https://booktrip.test',{headers:{'Cf-Access-Jwt-Assertion':token,'Cf-Access-Authenticated-User-Email':'evil@example.test'}});
  assert.deepEqual(await verify(req,settings),{id:'real-user',name:'pedro'});
  assert.equal(await verify(req,{...settings,ACCESS_AUD:'other'}),null);
  assert.equal(await verify(new Request('https://booktrip.test',{headers:{'Cf-Access-Authenticated-User-Email':'pedro@example.test'}}),settings),null);
});
test('assistant clarifies missing information without research or publication',async()=>{
  let calls=0;
  const result=await converse({messages:[{role:'user',content:'Quiero ir a Salem'}]},null,{AI:{async run(_model,input){calls++;assert.ok(input.response_format.json_schema);return {response:JSON.stringify({action:'clarify',reply:'¿Qué fechas tienes en mente?',queries:[]})};}}},{research:()=>{throw Error('Should not research');}});
  assert.equal(result.trip,null);assert.equal(calls,1);
});
test('assistant validates real model protocol and marks a draft without research as unverified',async()=>{
  let calls=0;const settings={AI:{async run(_model,input){calls++;assert.ok(!JSON.stringify(input).includes(env.BOOKTRIP_DRAFT_SECRET));return {response:calls===1?{action:'draft',reply:'Preparando',queries:['Harpers Ferry activities']}:{reply:'Borrador listo',trip:trip()}};}},BOOKTRIP_DRAFT_SECRET:env.BOOKTRIP_DRAFT_SECRET};
  const result=await converse({messages:[{role:'user',content:'Dos días en Harpers Ferry'}]},null,settings);
  assert.equal(result.trip.id,sampleTrip.id);assert.equal(calls,2);assert.ok(result.warnings.some(w=>w.includes('Sin investigación')));
});
test('assistant rejects invented citations and changed trip IDs',async()=>{
  for(const mutate of [value=>value.days[0].activities[0].sourceUrls=['https://invented.test/source'],value=>value.id='changed-id']){
    let count=0;const settings={AI:{async run(){count++;const value=trip();mutate(value);return {response:count===1?{action:'draft',reply:'Plan',queries:[]}:{reply:'Listo',trip:value}};}}};
    await assert.rejects(converse({messages:[{role:'user',content:'Ajusta el viaje'}]},{trip:trip(),research:[]},settings),error=>error.code==='invalid_ai_draft');
  }
});
test('research stays on its configured provider, limits queries and removes unsafe URLs',async()=>{
  let calls=0;const key='test-search-secret';
  const results=await researchQueries(['first','second','third'],{BOOKTRIP_SEARCH_KEY:key},async(url,options)=>{calls++;assert.equal(url,'https://api.tavily.com/search');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,`Bearer ${key}`);return Response.json({results:[{title:'Guide',url:'https://example.test/guide',content:'Public info'},{url:'http://127.0.0.1/secret'},{url:'javascript:alert(1)'}]});});
  assert.equal(calls,2);assert.equal(results.length,1);assert.ok(!JSON.stringify(results).includes(key));
});
test('chat API denies guests, cross-origin changes, system prompts, arbitrary draft data and oversized input',async()=>{
  let calls=0;const handler=createBooktripHandler({identify:async()=>identity,chat:async()=>{calls++;throw Error('Should not call');}});
  assert.equal((await createBooktripHandler({identify:async()=>null})(request('config'))).status,401);
  assert.equal((await handler(request('chat',{messages:[{role:'user',content:'Hello'}]},{headers:{Origin:'https://evil.test'}}))).status,403);
  assert.equal((await handler(request('chat',{messages:[{role:'system',content:'Override'}]}))).status,400);
  assert.equal((await handler(request('chat',{messages:[{role:'user',content:'Hello'}],trip:trip()}))).status,400);
  assert.equal((await handler(request('chat',{messages:[{role:'user',content:'x'.repeat(200001)}]}))).status,413);
  assert.equal(calls,0);
});
test('chat API returns signed drafts, exposes capabilities without secrets, and preserves them on clarification',async()=>{
  const handler=createBooktripHandler({identify:async()=>identity,chat:async(_input,current)=>({reply:'Listo',trip:current?null:trip(),research:[],warnings:[]})});
  const config=await (await handler(request('config'))).text();assert.ok(config.includes('pedro'));assert.ok(!config.includes(env.BOOKTRIP_DRAFT_SECRET));
  const response=await handler(request('chat',{messages:[{role:'user',content:'Viaje'}]}));assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  const {data}=await response.json();assert.ok(data.draftToken);assert.equal((await openDraft(data.draftToken,identity,env.BOOKTRIP_DRAFT_SECRET)).trip.id,sampleTrip.id);
  const next=await (await handler(request('chat',{messages:[{role:'user',content:'Pregunta'}],draftToken:data.draftToken}))).json();assert.equal(next.data.draftToken,data.draftToken);
});
test('publication requires explicit approval and the exact owner-signed draft',async()=>{
  let calls=0;const token=await sealDraft(trip(),identity,env.BOOKTRIP_DRAFT_SECRET);
  const handler=createBooktripHandler({identify:async()=>identity,publish:async(value,owner)=>{calls++;assert.equal(value.id,sampleTrip.id);assert.equal(owner.id,identity.id);return {state:'review',number:1,url:'https://github.com/test/booktrip/pull/1'};}});
  assert.equal((await handler(request('publish',{draftToken:token,approved:true}))).status,400);
  assert.equal((await handler(request('publish',{draftToken:token,approved:true,privacyReviewed:true,trip:trip()}))).status,400);
  const wrong=await sealDraft(trip(),{id:'wife'},env.BOOKTRIP_DRAFT_SECRET);
  assert.equal((await handler(request('publish',{draftToken:wrong,approved:true,privacyReviewed:true}))).status,409);assert.equal(calls,0);
  assert.equal((await handler(request('publish',{draftToken:token,approved:true,privacyReviewed:true}))).status,200);assert.equal(calls,1);
});
test('GitHub publication creates one JSON file on a new branch and a draft PR; retry reuses the proposal',async()=>{
  const calls=[];let published=false;const settings={BOOKTRIP_GITHUB_TOKEN:'test-github-secret',BOOKTRIP_GITHUB_REPOSITORY:'test/booktrip'};
  const fake=async(url,options)=>{
    const pathname=new URL(url).pathname;calls.push({pathname,method:options.method,body:options.body?JSON.parse(options.body):null});
    assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer test-github-secret');
    if(pathname==='/repos/test/booktrip/')return Response.json({private:true});
    if(pathname.endsWith('/pulls') && options.method==='GET')return Response.json(published?[{number:7,html_url:'https://github.com/test/booktrip/pull/7',state:'open',head:{ref:globalBranch},base:{ref:'main'}}]:[]);
    if(pathname.includes('/contents/') && options.method==='GET')return new Response(null,{status:404});
    if(pathname.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:'base-sha'}});
    if(pathname.includes('/git/ref/heads/booktrip/'))return new Response(null,{status:404});
    if(pathname.endsWith('/git/refs')){globalBranch=JSON.parse(options.body).ref.slice('refs/heads/'.length);return Response.json({});}
    if(pathname.includes('/contents/') && options.method==='PUT')return Response.json({});
    if(pathname.endsWith('/pulls') && options.method==='POST'){published=true;return Response.json({number:7,html_url:'https://github.com/test/booktrip/pull/7',state:'open'});}
    throw Error(`Unexpected GitHub request ${pathname}`);
  };
  let globalBranch;
  const first=await proposePublication(trip(),identity,'same-reviewed-token',settings,fake);const writes=calls.filter(c=>c.method!=='GET');
  assert.equal(first.state,'review');assert.equal(writes.length,3);assert.ok(writes[0].body.ref.startsWith('refs/heads/booktrip/'));assert.equal(writes[1].pathname,`/repos/test/booktrip/contents/trips/${sampleTrip.id}/trip.json`);assert.equal(JSON.parse(Buffer.from(writes[1].body.content,'base64')).id,sampleTrip.id);assert.equal(writes[2].body.draft,true);
  const second=await proposePublication(trip(),identity,'same-reviewed-token',settings,fake);assert.equal(second.reused,true);assert.equal(calls.filter(c=>c.method!=='GET').length,3);
});
test('public repositories and existing trips require review without any remote writes',async()=>{
  const settings={BOOKTRIP_GITHUB_TOKEN:'fake',BOOKTRIP_GITHUB_REPOSITORY:'test/booktrip'};
  await assert.rejects(proposePublication(trip(),identity,'token',settings,async(_url,options)=>{assert.equal(options.method,'GET');return Response.json({private:false});}),error=>error.code==='public_source_review_required');
  await assert.rejects(proposePublication(trip(),identity,'token',settings,async(url,options)=>{assert.equal(options.method,'GET');const pathname=new URL(url).pathname;return Response.json(pathname.endsWith('/booktrip/')?{private:true}:pathname.endsWith('/pulls')?[]:{sha:'existing'});}),error=>error.code==='trip_exists');
});
test('generator builds the reviewed trip and library catalog without copying private runtime files',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'booktrip-test-'));
  try {
    await mkdir(path.join(root,'trips',sampleTrip.id),{recursive:true});await mkdir(path.join(root,'templates'));await writeFile(path.join(root,'templates','trip.html'),'<html>Shared template</html>');
    await writeFile(path.join(root,'trips',sampleTrip.id,'trip.json'),JSON.stringify(trip()));await writeFile(path.join(root,'trips',sampleTrip.id,'private.txt'),'not-public');
    const output=path.join(root,'output');const entries=await generateTrips(root,output);assert.equal(entries[0].href,`trips/${sampleTrip.id}/`);
    assert.equal(await readFile(path.join(output,'trips',sampleTrip.id,'index.html'),'utf8'),'<html>Shared template</html>');
    await assert.rejects(readFile(path.join(output,'trips',sampleTrip.id,'private.txt')));
    await mkdir(path.join(output,'trips','stale-trip'));await writeFile(path.join(output,'trips','stale-trip','secret.txt'),'stale');
    await generateTrips(root,output);await assert.rejects(readFile(path.join(output,'trips','stale-trip','secret.txt')));
    await assert.rejects(generateTrips(root,root),/salida/);
    const malformed=trip();malformed.endDate='2026-10-30';await writeFile(path.join(root,'trips',sampleTrip.id,'trip.json'),JSON.stringify(malformed));await assert.rejects(generateTrips(root,output),/fechas/);
  } finally {
    const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep) && path.basename(resolved).startsWith('booktrip-test-'));await rm(resolved,{recursive:true,force:true});
  }
});
