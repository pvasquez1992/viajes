import { verifyAccess } from '../ejercicio/[[path]].js';
export async function onRequest({request,env,params}) {
 const fail=(status,message)=>Response.json({error:{message}},{status,headers:{'Cache-Control':'no-store'}});
 if(!env.GARMIN_API_KEY || !env.GARMIN_API) return fail(503,'API no configurada');
 if(!await verifyAccess(request,env)) return fail(401,'Inicia sesión');
 const id=Array.isArray(params.path)?params.path.join('/'):params.path||'';
 const put=request.method==='PUT';
 if(!(request.method==='GET'&&!id)&&!(put&&/^[a-z0-9-]{1,80}$/.test(id))) return fail(405,'Método no permitido');
 if(put&&request.headers.get('Origin')!==new URL(request.url).origin) return fail(403,'Origen inválido');
 try {
 const body=put?await request.json():undefined;
 if(put&&typeof body?.watched!=='boolean') return fail(400,'Valor inválido');
 const res=await env.GARMIN_API.fetch('https://my-garmin-api.pvasquez1992.workers.dev/api/movies'+(id?'/'+id:''),{method:request.method,headers:{Authorization:'Bearer '+env.GARMIN_API_KEY,'Content-Type':'application/json'},body:put?JSON.stringify(body):undefined,redirect:'manual'});
 if(!res.headers.get('Content-Type')?.includes('application/json')) return fail(502,'Respuesta inválida');
 return new Response(res.body,{status:res.status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return fail(502,'No se pudo sincronizar');}
}
