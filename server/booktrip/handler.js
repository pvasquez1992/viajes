import { TripError, validateTrip } from '../../js/trip-contract.js';
import { verifyIdentity, canCreate } from './access.js';
import { converse } from './assistant.js';
import { sealDraft, openDraft } from './drafts.js';
import { createTripStore, requestKey } from './store.js';

const headers = {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export function createBooktripHandler({identify=verifyIdentity,chat=converse,store=createTripStore}={}) {
  return async ({request,env,params}) => {
    try {
      const route = Array.isArray(params.path) ? params.path.join('/') : params.path || '';
      const tripId = route.match(/^trips\/([a-z0-9][a-z0-9-]{2,63})$/)?.[1];
      if (!['config','chat','publish','trips'].includes(route) && !tripId) return error(404,'not_found','Consulta no encontrada.');
      const method = ['chat','publish'].includes(route) ? 'POST' : 'GET';
      if (request.method !== method) return error(405,'method_not_allowed','Método no permitido.',{Allow:method});
      const identity = await identify(request,env);
      if (!identity) return error(401,'unauthorized','Inicia sesión para usar BookTrip.');
      const creator = canCreate(identity,env);
      if (route === 'config') return Response.json({data:{user:{id:identity.id,name:identity.name},canCreate:creator,aiReady:Boolean(env.AI?.run),storageReady:Boolean(env.BOOKTRIP_DB?.prepare),sessionReady:typeof env.BOOKTRIP_DRAFT_SECRET==='string' && env.BOOKTRIP_DRAFT_SECRET.length>=32,researchReady:Boolean(env.BOOKTRIP_SEARCH_KEY)}},{headers});
      if (route === 'trips') return Response.json({data:await store(env).catalog()},{headers});
      if (tripId) {
        const trip = await store(env).get(tripId);
        return trip ? Response.json({data:trip},{headers}) : error(404,'not_found','Este viaje no está en tu libro.');
      }
      if (!creator) return error(403,'creation_forbidden','Por ahora solo Pedro puede crear y modificar viajes. Puedes consultar el libro.');
      if (route === 'publish') return error(410,'route_retired','Los viajes se guardan directamente desde el chat.');
      if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return error(403,'invalid_origin','Solicita los cambios desde BookTrip.');
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return error(415,'invalid_content_type','Envía una solicitud JSON.');
      if (Number(request.headers.get('Content-Length') || 0)>200000) return error(413,'too_large','La conversación es demasiado larga.');
      const reader = request.body?.getReader(), chunks=[]; let size=0;
      if (!reader) throw new TripError('Solicitud vacía.');
      while (true) {
        const {done,value}=await reader.read(); if(done) break;
        size+=value.length;
        if(size>200000) {await reader.cancel();throw new TripError('La conversación es demasiado larga.',413,'too_large');}
        chunks.push(value);
      }
      const buffer=new Uint8Array(size); let offset=0;
      for(const chunk of chunks) {buffer.set(chunk,offset);offset+=chunk.length;}
      let input;
      try {input=JSON.parse(new TextDecoder().decode(buffer));} catch {throw new TripError('Solicitud JSON inválida.');}
      if (!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(key=>!['messages','conversationToken'].includes(key)) || !Array.isArray(input.messages) || input.messages.length<1 || input.messages.length>20 || input.messages.at(-1)?.role!=='user' || !input.messages.every(message=>message && Object.keys(message).length===2 && ['user','assistant'].includes(message.role) && typeof message.content==='string' && message.content.trim() && message.content.length<=4000)) throw new TripError('La conversación contiene mensajes inválidos.');
      if(typeof env.BOOKTRIP_DRAFT_SECRET!=='string' || env.BOOKTRIP_DRAFT_SECRET.length<32) throw new TripError('El chat todavía necesita configurar su protección.',503,'not_configured');
      const current = input.conversationToken ? await openDraft(input.conversationToken,identity,env.BOOKTRIP_DRAFT_SECRET) : null;
      const storage=store(env), key=await requestKey(input,identity);
      const previous=await storage.receipt(key,identity);
      if(previous) return Response.json({data:previous},{headers});
      const result=await chat(input,current,env);
      if(!result.trip) return Response.json({data:{reply:result.reply,conversationToken:input.conversationToken || null,trip:null,warnings:[]}},{headers});
      const trip=validateTrip(result.trip).trip;
      if(current && trip.id!==current.trip.id) throw new TripError('La IA cambió el viaje que estabas ajustando.',502,'invalid_ai_output');
      if(!current) trip.id=`${trip.id.slice(0,50).replace(/-+$/,'')}-${key.slice(0,12)}`;
      const conversationToken=await sealDraft(trip,identity,env.BOOKTRIP_DRAFT_SECRET,result.research);
      const response={reply:`${current?'Actualicé':'Creé'} «${trip.title}» en tu libro. ${trip.days.length} días, del ${trip.startDate} al ${trip.endDate}. Puedes abrirlo o pedirme ajustes aquí.`,conversationToken,trip:{id:trip.id,title:trip.title,url:`/trips/${trip.id}/`},warnings:result.warnings};
      const saved=await storage.save(trip,identity,current,key,response);
      return Response.json({data:saved},{headers});
    } catch(cause) {
      if(cause instanceof TripError) return error(cause.status,cause.code,cause.message);
      return error(502,'service_unavailable','No pudimos completar la solicitud. Reintenta el mismo mensaje para comprobar si se guardó.');
    }
  };
}
function error(status,code,message,extra={}) {return Response.json({error:{code,message}},{status,headers:{...headers,...extra}});}
export const onRequest=createBooktripHandler();
