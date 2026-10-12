import { TripError, validateTrip } from '../../js/trip-contract.js';
import { verifyIdentity } from './access.js';
import { authorizeIdentity, permissionPanel, changePermission } from './permissions.js';
import { converse } from './assistant.js';
import { sealDraft, openDraft } from './drafts.js';
import { createTripStore, requestKey } from './store.js';
import { readLibrary, libraryReference } from './library.js';
import { sealRemoval, openRemovalState, sealRestore, openRestore } from './removals.js';

const headers = {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export function createBooktripHandler({identify=verifyIdentity,chat=converse,store=createTripStore,library=readLibrary}={}) {
  return async ({request,env,params}) => {
    try {
      const route = Array.isArray(params.path) ? params.path.join('/') : params.path || '';
      const tripId = route.match(/^trips\/([a-z0-9][a-z0-9-]{2,63})$/)?.[1];
      const archivedId=route.match(/^archive\/([a-z0-9][a-z0-9-]{2,63})$/)?.[1];
      if (!['config','chat','publish','trips','remove','restore','archive','admin'].includes(route) && !tripId && !archivedId) return error(404,'not_found','Consulta no encontrada.');
      const method = ['chat','publish','remove','restore'].includes(route) ? 'POST' : 'GET';
      if (route==='admin'?!['GET','POST'].includes(request.method):request.method !== method) return error(405,'method_not_allowed','Método no permitido.',{Allow:route==='admin'?'GET, POST':method});
      const verified = await identify(request,env);
      if (!verified) return error(401,'unauthorized','Inicia sesión para usar BookTrip.');
      const identity=await authorizeIdentity(verified,env);
      const creator = identity.canCreate;
      if (route === 'config') return Response.json({data:{user:{id:identity.id,name:identity.name,role:identity.role},canCreate:creator,canChat:identity.canChat,canAdmin:identity.role==='admin',aiReady:Boolean(env.AI?.run),storageReady:Boolean(env.BOOKTRIP_DB?.prepare),sessionReady:typeof env.BOOKTRIP_DRAFT_SECRET==='string' && env.BOOKTRIP_DRAFT_SECRET.length>=32,researchReady:Boolean(env.BOOKTRIP_SEARCH_KEY)}},{headers});
      if(route==='admin') {
        if(identity.role!=='admin') return error(403,'admin_forbidden','Solo un administrador puede asignar permisos.');
        if(request.method==='GET') return Response.json({data:await permissionPanel(env,identity)},{headers});
      }
      if (route === 'trips') return Response.json({data:await library(env,store(env),identity)},{headers});
      if(route==='archive' || archivedId) {
        const storage=store(env),entries=await storage.archived(identity,archivedId);
        if(archivedId) {
          if(!entries.length) return error(404,'not_found','Este viaje no está disponible en Eliminados.');
          const original=await storage.legacyInfo(archivedId);
          return Response.json({data:entries[0].trip,...(original?{originalUrl:`/eliminados/originales/${archivedId}/`}:{})},{headers});
        }
        const data=await Promise.all(entries.map(async entry=>({id:entry.trip.id,title:entry.trip.title,start:entry.trip.startDate,end:entry.trip.endDate,removedAt:entry.removedAt,url:`/eliminados/trips/${entry.trip.id}/`,originalUrl:await storage.legacyInfo(entry.trip.id)?`/eliminados/originales/${entry.trip.id}/`:null,restoreToken:await sealRestore(entry.trip.id,await storage.generation(entry.trip.id),entry.removedAt,identity,env.BOOKTRIP_DRAFT_SECRET)})));
        return Response.json({data},{headers});
      }
      if (tripId) {
        const trip = await store(env).get(tripId);
        const original=trip?await store(env).legacyInfo?.(tripId):null;
        return trip ? Response.json({data:trip,...(original?{originalUrl:`/${original.original_href}?original=1`}:{})},{headers}) : error(404,'not_found','Este viaje no está en tu libro.');
      }
      if (!identity.canChat && route!=='admin') return error(403,'creation_forbidden','Tu cuenta tiene acceso de lectura. Un administrador puede asignarte permiso para crear o editar viajes.');
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
      if(route==='admin') return Response.json({data:await changePermission(input,env,identity)},{headers});
      if(route==='restore') {
        if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length!==1 || typeof input.restoreToken!=='string') throw new TripError('Restaura el viaje desde Eliminados.');
        const state=await openRestore(input.restoreToken,identity,env.BOOKTRIP_DRAFT_SECRET);
        const trip=await store(env).restore(state.id,identity,state.generation,state.removedAt);
        return Response.json({data:{id:trip.id,title:trip.title,url:`/trips/${trip.id}/`}},{headers});
      }
      if(route==='remove') {
        if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length!==1 || typeof input.confirmationToken!=='string') throw new TripError('Confirma la eliminación desde el chat.');
        const {trip,generation}=await openRemovalState(input.confirmationToken,identity,env.BOOKTRIP_DRAFT_SECRET);
        await store(env).remove(trip,identity,generation);
        return Response.json({data:{reply:`Moví «${trip.title}» a Eliminados. Puedes restaurarlo desde esa carpeta.`,conversationToken:null,trip:null,saved:false,removed:{id:trip.id,url:`/trips/${trip.id}/`},warnings:[]}},{headers});
      }
      if (!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(key=>!['messages','conversationToken'].includes(key)) || !Array.isArray(input.messages) || input.messages.length<1 || input.messages.length>20 || input.messages.at(-1)?.role!=='user' || !input.messages.every(message=>message && Object.keys(message).length===2 && ['user','assistant'].includes(message.role) && typeof message.content==='string' && message.content.trim() && message.content.length<=4000)) throw new TripError('La conversación contiene mensajes inválidos.');
      if(typeof env.BOOKTRIP_DRAFT_SECRET!=='string' || env.BOOKTRIP_DRAFT_SECRET.length<32) throw new TripError('El chat todavía necesita configurar su protección.',503,'not_configured');
      let current = input.conversationToken ? await openDraft(input.conversationToken,identity,env.BOOKTRIP_DRAFT_SECRET) : null;
      const storage=store(env), key=await requestKey(input,identity);
      if(current && (current.generation || 0)!==(await storage.generation?.(current.trip.id) || 0)) throw new TripError('El viaje fue restaurado después de abrir este chat. Selecciónalo en una conversación nueva.',409,'trip_restored');
      const previous=await storage.receipt(key,identity);
      if(previous) return Response.json({data:previous},{headers});
      if(current && await storage.isRemoved?.(current.trip.id)) throw new TripError('Este viaje fue eliminado del libro. Empieza una conversación nueva.',410,'trip_removed');
      if(current && storage.getEditable && !await storage.getEditable(current.trip.id,identity)) throw new TripError('Ya no tienes permiso para editar este viaje. Empieza otra conversación.',403,'editing_forbidden');
      const catalog=await library(env,storage,identity);
      const result=await chat(input,current,env,{library:catalog,canCreate:creator,loadTrip:async id=>{
        if(!catalog.some(entry=>entry.editable && libraryReference(entry).id===id)) return null;
        const trip=await storage.getEditable(id,identity);
        if(!trip) return null;
        const urls=[...new Set(trip.days.flatMap(day=>day.activities.flatMap(activity=>activity.sourceUrls)))];
        return {trip,generation:await storage.generation?.(id) || 0,research:urls.slice(-12).map(url=>({url,title:'Referencia conservada del viaje',content:'Enlace guardado; no se ha consultado nuevamente ni verifica disponibilidad.'}))};
      }});
      if(Object.hasOwn(result,'current')) current=result.current;
      if(!result.trip) {
        if(result.removal) {
          const entry=catalog.find(entry=>libraryReference(entry).id===result.removal.id);
          if(!entry || !libraryReference(entry).removable) throw new TripError('No tienes permiso para eliminar este viaje.',403,'removal_forbidden');
        }
        const selectionToken=result.selection && current?await sealDraft(current.trip,identity,env.BOOKTRIP_DRAFT_SECRET,current.research,Date.now(),current.generation || 0):null;
        const pendingRemoval=result.removal?{id:result.removal.id,title:result.removal.title,start:result.removal.startDate,end:result.removal.endDate,confirmationToken:await sealRemoval(result.removal,identity,env.BOOKTRIP_DRAFT_SECRET,Date.now(),await storage.generation?.(result.removal.id) || 0)}:null;
        return Response.json({data:{reply:result.reply,conversationToken:result.selection?selectionToken:input.conversationToken || null,trip:result.selection || null,...(result.trips?{trips:result.trips}:{}),...(pendingRemoval?{pendingRemoval}:{}),saved:false,warnings:[]}},{headers});
      }
      const trip=validateTrip(result.trip).trip;
      if(!current && !creator) throw new TripError('Puedes editar los viajes asignados, pero tu rol no permite crear otros.',403,'creation_forbidden');
      if(current && trip.id!==current.trip.id) throw new TripError('La IA cambió el viaje que estabas ajustando.',502,'invalid_ai_output');
      if(!current) trip.id=`${trip.id.slice(0,50).replace(/-+$/,'')}-${key.slice(0,12)}`;
      const conversationToken=await sealDraft(trip,identity,env.BOOKTRIP_DRAFT_SECRET,result.research,Date.now(),current?.generation || 0);
      const response={reply:`${current?'Actualicé':'Creé'} «${trip.title}» en tu libro. ${trip.days.length} días, del ${trip.startDate} al ${trip.endDate}. Puedes abrirlo o pedirme ajustes aquí.`,conversationToken,trip:{id:trip.id,title:trip.title,url:`/trips/${trip.id}/`},saved:true,warnings:result.warnings};
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
