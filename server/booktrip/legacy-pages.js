import { verifyIdentity } from './access.js';
import { authorizeIdentity } from './permissions.js';
import { createTripStore } from './store.js';
import { legacyTrips } from '../../js/trip-library.js';
export function createLegacyPageHandler({identify=verifyIdentity}={}) {
  return async context=>{
    const {request,env}=context,url=new URL(request.url),archived=url.pathname.match(/^\/eliminados\/(originales|trips)\/([a-z0-9][a-z0-9-]{2,63})\/([a-z0-9-]+\.html)?$/);
    const folder=url.pathname.match(/^\/([^/]+)\/(?:index\.html|jarvis\.html)?$/)?.[1];
    if(!archived && !legacyTrips.some(entry=>entry.href===folder+'/')) return context.next();
    const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
    if(!['GET','HEAD'].includes(request.method))return new Response('Método no permitido.',{status:405,headers});
    try {
      const verified=await identify(request,env);if(!verified)return new Response('Inicia sesión.',{status:401,headers});
      const storage=createTripStore(env);let id,source;
      if(archived) {
        const identity=await authorizeIdentity(verified,env),entries=await storage.archived(identity,archived[2]);
        if(!entries.length)return new Response('Este viaje no está disponible en Eliminados.',{status:404,headers});
        id=archived[2];
        if(archived[1]==='trips')source='/trip-shell.html';
        else {const original=await storage.legacyInfo(id);if(!original || !legacyTrips.some(entry=>entry.href===original.original_href))return new Response('No hay página original.',{status:404,headers});source='/'+original.original_href+(archived[3] || 'index.html');}
      } else {
        const entry=await storage.original(folder+'/');if(!entry)return context.next();id=entry.id;
        if(await storage.isRemoved(id))return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Viaje archivado</title><body><h1>Este viaje está en Eliminados</h1><p>Su página y sus archivos originales están conservados.</p><a href="/eliminados/">Abrir Eliminados</a> · <a href="/">Volver al libro</a></body></html>',{status:410,headers});
        if(entry.modified && url.searchParams.get('original')!=='1') return new Response(null,{status:302,headers:{...headers,Location:`/trips/${id}/`}});
        if(url.searchParams.get('original')!=='1')return context.next();source='/'+folder+'/index.html';
      }
      const response=await env.ASSETS.fetch(new URL(source,request.url));if(!response.ok)return new Response('No pudimos abrir el viaje.',{status:503,headers});
      let html=await response.text();
      if(source!=='/trip-shell.html') {
        const href='/'+(await storage.legacyInfo(id)).original_href;
        html=html.replace(/<head\b[^>]*>/i,match=>match+`<base href="${href}">`);
        if(archived)html=html.replace(/href="([a-z0-9-]+\.html)"/gi,(_match,file)=>`href="/eliminados/originales/${id}/${file}"`);
        html=html.replace(/<body\b[^>]*>/i,match=>match+`<aside style="padding:16px;background:#101e21;color:#eff8f4;font:14px Arial">Página original conservada · <a style="color:#adebd3" href="${archived?'/eliminados/':`/trips/${id}/`}">${archived?'Volver a Eliminados':'Abrir viaje editable'}</a></aside>`);
      }
      return new Response(request.method==='HEAD'?null:html,{headers});
    }catch{return new Response('No pudimos abrir el viaje. Reintenta.',{status:503,headers});}
  };
}
export const onRequest=createLegacyPageHandler();
