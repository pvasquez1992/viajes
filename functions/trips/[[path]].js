import { verifyIdentity } from '../../server/booktrip/access.js';
import { createTripStore } from '../../server/booktrip/store.js';
export async function onRequest(context) {
  const {request,env,params}=context;
  if(request.method!=='GET' && request.method!=='HEAD') return new Response('Método no permitido.',{status:405,headers:{Allow:'GET, HEAD'}});
  const identity=await verifyIdentity(request,env);
  if(!identity) return new Response('Inicia sesión para consultar tu libro.',{status:401,headers:{'Cache-Control':'private, no-store'}});
  const route=(Array.isArray(params.path)?params.path.join('/'):params.path || '').replace(/\/$/,'');
  if(!/^[a-z0-9][a-z0-9-]{2,63}$/.test(route)) return context.next();
  try {
    const storage=createTripStore(env);
    if(await storage.isRemoved(route)) return new Response('Este viaje fue eliminado del libro.',{status:410,headers:{'Cache-Control':'private, no-store'}});
    const trip=await storage.get(route);
    if(!trip) return context.next();
    const template=await env.ASSETS.fetch(new URL('/trip-shell.html',request.url));
    if(!template.ok) return new Response('No pudimos abrir el viaje.',{status:503});
    return new Response(request.method==='HEAD'?null:await template.text(),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  } catch {return new Response('No pudimos abrir el viaje. Vuelve a intentarlo.',{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
