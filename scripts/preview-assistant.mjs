// Local QA only. This script is never copied to Pages and cannot publish to GitHub.
import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createBooktripHandler } from '../functions/api/booktrip/[[path]].js';
import { sampleTrip } from '../tests/fixtures/trip.js';
import { localTripDatabase } from './local-trip-store.mjs';
import { createTripStore } from '../server/booktrip/store.js';
const demo=process.argv.includes('--demo');
const root=path.resolve(import.meta.dirname,'../dist/site');
const port=Number(process.env.BOOKTRIP_PREVIEW_PORT || 8790);
const origin=`http://127.0.0.1:${port}`;
const identity={id:'local-preview',name:'Viajero',email:'preview@example.test'};
const env={BOOKTRIP_DRAFT_SECRET:randomBytes(32).toString('hex'),BOOKTRIP_CREATOR_EMAIL:identity.email,BOOKTRIP_DB:localTripDatabase()};
env.ASSETS={async fetch(request) {
  const pathname=new URL(request.url).pathname;
  if(pathname!=='/trips/catalog.json') return new Response(null,{status:404});
  return new Response(await readFile(path.join(root,'trips','catalog.json')), {headers:{'Content-Type':'application/json'}});
}};
if(!demo) {
  if(!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_AI_TOKEN) throw Error('Define CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_AI_TOKEN para IA real, o utiliza --demo para una demostración explícita sin IA.');
  env.AI={async run(model,input) {
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_AI_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(input)});
    const data=await response.json();if(!response.ok || !data.success) throw Error('Workers AI no respondió correctamente.');return data.result;
  }};
  if(process.env.BOOKTRIP_SEARCH_KEY) env.BOOKTRIP_SEARCH_KEY=process.env.BOOKTRIP_SEARCH_KEY;
} else env.AI={async run(_model,input) {
  // A fixed fixture simulates the model protocol, not a real inference. It uses
  // the production handler, library and persistence exclusively against local DB.
  const data=JSON.parse(input.messages.find(message=>message.role==='user').content);
  const requested=data.conversation.at(-1).content;
  if(/fallo de prueba/i.test(requested)) throw Error('Fallo ficticio para QA.');
  if(input.messages.at(-1).content.startsWith('Decide')) {
    const plan={action:'draft',tripId:null,reply:'Ejemplo ficticio local.',queries:[]};
    if(/listar|lista|qu[eé] viajes|cu[aá]ntos viajes/i.test(requested)) plan.action='list';
    else {
      const entry=data.library.find(entry=>requested.toLowerCase().includes(entry.id.toLowerCase()) || requested.toLowerCase().includes(entry.title.toLowerCase()) || (/halloween/i.test(requested) && entry.url==='/harpersferry2026/') || (/boston/i.test(requested) && /boston/i.test(entry.title)));
      if(entry) {plan.action=/eliminar|elimina|borrar|borra/i.test(requested)?'delete':/a[nñ]ade|agrega|quita|pon/i.test(requested)?'edit':'select';plan.tripId=entry.id;}
      else if(!data.currentDraft && data.conversation.length===1 && !/2026/.test(requested)) {plan.action='clarify';plan.reply='Esta es una demostración sin IA. ¿Qué fechas exactas tienes en mente? Por ejemplo, del 31 de octubre al 1 de noviembre de 2026.';}
    }
    return {response:plan};
  }
  const trip=structuredClone(data.currentDraft || sampleTrip);
  if(data.currentDraft) trip.description='Ejemplo ficticio ajustado durante la conversación. Los cambios de esta demo no utilizan IA.';
  return {response:{reply:'Ejemplo ficticio sin IA; no utilizar como itinerario confirmado.',trip}};
}};
if(process.argv.includes('--seed-library')) {
  const fixture=structuredClone(sampleTrip);fixture.id='boston-fictional-qa';fixture.title='Boston ficticio para QA';
  await env.BOOKTRIP_DB.prepare('INSERT INTO booktrip_trips (id,owner_id,create_key,document) VALUES (?,?,?,?)').bind(fixture.id,identity.id,'local-fixture',JSON.stringify(fixture)).run();
  console.log('Catálogo de prueba: un Boston FICTICIO en SQLite local; no se escribe en D1.');
}
const handler=createBooktripHandler({identify:async()=>identity});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf'};
const server=createServer(async(req,res)=>{
  try {
    if(req.headers.host!==new URL(origin).host) {res.writeHead(403);res.end();return;}
    const url=new URL(req.url,origin);
    if(url.pathname.startsWith('/api/booktrip/')) {
      let count=0;const chunks=[];for await(const chunk of req){count+=chunk.length;if(count>200000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
      const request=new Request(url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
      let response=await handler({request,env,params:{path:url.pathname.slice('/api/booktrip/'.length)}});
      if(demo && url.pathname==='/api/booktrip/config' && response.ok) {const data=await response.json();data.data.demo=true;response=Response.json(data,{headers:response.headers});}
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const tripId=url.pathname.match(/^\/trips\/([a-z0-9][a-z0-9-]{2,63})\/?$/)?.[1];
    if(tripId && await createTripStore(env).isRemoved(tripId)) {res.writeHead(410,{'Cache-Control':'no-store'});res.end('Este viaje fue eliminado del libro.');return;}
    if(tripId && await createTripStore(env).get(tripId)) {
      const body=await readFile(path.join(root,'trip-shell.html'));res.writeHead(200,{'Content-Type':mime['.html'],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);return;
    }
    let pathname=decodeURIComponent(url.pathname);if(pathname.endsWith('/'))pathname+='index.html';
    const target=path.resolve(root,'.'+pathname);
    const resolved=await realpath(target);
    if(!resolved.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const body=await readFile(resolved);res.writeHead(200,{'Content-Type':mime[path.extname(resolved)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
  } catch {res.writeHead(404);res.end('No encontrado.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`${demo?'Demostración SIN IA':'Workers AI real · almacenamiento local'}: ${origin}/?chat=open`));
process.on('SIGINT',()=>server.close(()=>{env.BOOKTRIP_DB.close();process.exit(0);}));
