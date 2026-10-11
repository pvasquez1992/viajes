import { TripError } from '../../../js/trip-contract.js';
import { verifyIdentity } from '../../../server/booktrip/access.js';
import { converse } from '../../../server/booktrip/assistant.js';
import { sealDraft, openDraft } from '../../../server/booktrip/drafts.js';
import { proposePublication } from '../../../server/booktrip/github.js';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export function createBooktripHandler({identify=verifyIdentity,chat=converse,publish=proposePublication}={}) {
  return async ({request,env,params}) => {
    try {
      const route=Array.isArray(params.path)?params.path.join('/'):params.path || '';
      if(!['config','chat','publish'].includes(route)) return error(404,'not_found','Consulta no encontrada.');
      const method=route==='config'?'GET':'POST';
      if(request.method!==method) return error(405,'method_not_allowed','Método no permitido.',{Allow:method});
      const identity=await identify(request,env);
      if(!identity) return error(401,'unauthorized','Inicia sesión para usar BookTrip Assistant.');
      if(route==='config') return Response.json({data:{user:{id:identity.id,name:identity.name},aiReady:Boolean(env.AI?.run),draftsReady:typeof env.BOOKTRIP_DRAFT_SECRET==='string' && env.BOOKTRIP_DRAFT_SECRET.length>=32,researchReady:Boolean(env.BOOKTRIP_SEARCH_KEY),publishingReady:Boolean(env.BOOKTRIP_GITHUB_TOKEN && env.BOOKTRIP_GITHUB_REPOSITORY),publicSourceAllowed:env.BOOKTRIP_ALLOW_PUBLIC_SOURCE==='true'}},{headers});
      if(request.headers.get('Origin')!==new URL(request.url).origin || request.headers.get('Sec-Fetch-Site')==='cross-site') return error(403,'invalid_origin','Solicita los cambios desde BookTrip.');
      if(!request.headers.get('Content-Type')?.startsWith('application/json')) return error(415,'invalid_content_type','Envía una solicitud JSON.');
      const contentLength=Number(request.headers.get('Content-Length') || 0);
      if(contentLength>200000) return error(413,'too_large','La conversación es demasiado larga.');
      const reader=request.body?.getReader(); const chunks=[]; let size=0;
      if(!reader) throw new TripError('Solicitud vacía.');
      while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>200000) {await reader.cancel();throw new TripError('La conversación es demasiado larga.',413,'too_large');} chunks.push(value); }
      const buffer=new Uint8Array(size); let offset=0; for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
      let input; try {input=JSON.parse(new TextDecoder().decode(buffer));} catch {throw new TripError('Solicitud JSON inválida.');}
      if(!input || typeof input!=='object' || Array.isArray(input)) throw new TripError('Solicitud inválida.');
      const current=input.draftToken ? await openDraft(input.draftToken,identity,env.BOOKTRIP_DRAFT_SECRET) : null;
      if(route==='publish') {
        if(!current || input.approved!==true || input.privacyReviewed!==true) throw new TripError('Revisa el borrador y confirma la publicación primero.');
        if(Object.keys(input).some(key=>!['draftToken','approved','privacyReviewed'].includes(key))) throw new TripError('Solicitud de publicación inválida.');
        const result=await publish(current.trip,identity,input.draftToken,env);
        return Response.json({data:result},{headers});
      }
      if(typeof env.BOOKTRIP_DRAFT_SECRET!=='string' || env.BOOKTRIP_DRAFT_SECRET.length<32) throw new TripError('El asistente todavía necesita configurar la protección de borradores.',503,'not_configured');
      if(Object.keys(input).some(key=>!['messages','draftToken'].includes(key)) || !Array.isArray(input.messages) || input.messages.length<1 || input.messages.length>20 || input.messages.at(-1)?.role!=='user' || !input.messages.every(message=>message && Object.keys(message).length===2 && ['user','assistant'].includes(message.role) && typeof message.content==='string' && message.content.trim() && message.content.length<=4000)) throw new TripError('La conversación contiene mensajes inválidos.');
      const result=await chat(input,current,env);
      const draftToken=result.trip ? await sealDraft(result.trip,identity,env.BOOKTRIP_DRAFT_SECRET,result.research) : input.draftToken || null;
      return Response.json({data:{...result,draftToken}},{headers});
    } catch(cause) {
      if(cause instanceof TripError) return error(cause.status,cause.code,cause.message);
      return error(502,'service_unavailable','El asistente no está disponible ahora. Tu borrador se conserva.');
    }
  };
}
function error(status,code,message,extra={}) {return Response.json({error:{code,message}},{status,headers:{...headers,...extra}});}
export const onRequest=createBooktripHandler();
