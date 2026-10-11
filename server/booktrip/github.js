import { TripError, validateTrip } from '../../js/trip-contract.js';
const encode = value => {
  const bytes=new TextEncoder().encode(value);let raw='';
  for(let offset=0;offset<bytes.length;offset+=32768)raw+=String.fromCharCode(...bytes.subarray(offset,offset+32768));
  return btoa(raw);
};
export async function proposePublication(trip, identity, token, env, fetcher = fetch) {
  validateTrip(trip);
  if (!env.BOOKTRIP_GITHUB_TOKEN || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(env.BOOKTRIP_GITHUB_REPOSITORY || '')) throw new TripError('La publicación necesita conectar el repositorio de BookTrip.',503,'publishing_not_configured');
  const repository=env.BOOKTRIP_GITHUB_REPOSITORY;
  const base=env.BOOKTRIP_GITHUB_BRANCH || 'main';
  if (!/^[a-zA-Z0-9_.\/-]+$/.test(base) || base.includes('..')) throw new TripError('Rama de publicación inválida.',503,'not_configured');
  async function call(path, method='GET', body, missing=false) {
    const response=await fetcher(`https://api.github.com/repos/${repository}/${path}`,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.BOOKTRIP_GITHUB_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'BookTrip-Assistant','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    if(missing && response.status===404) return null;
    if(!response.ok) throw new TripError('No pudimos preparar la publicación en GitHub. Conserva el borrador y vuelve a intentarlo.',502,'publishing_unavailable');
    return response.json();
  }
  const info=await call('');
  if(!info.private && env.BOOKTRIP_ALLOW_PUBLIC_SOURCE !== 'true') throw new TripError('El repositorio es público. Activa explícitamente la publicación de contenido revisado o utiliza un repositorio privado.',409,'public_source_review_required');
  const file=`trips/${trip.id}/trip.json`;
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
  const branch=`booktrip/${trip.id}-${digest}`;
  const head=`${repository.split('/')[0]}:${branch}`;
  const pulls=await call(`pulls?state=all&head=${encodeURIComponent(head)}&base=${encodeURIComponent(base)}`);
  const existing=pulls.find(pr=>pr.head?.ref===branch && pr.base?.ref===base);
  if(existing) return publicationResult(existing, true);
  if(await call(`contents/${file}?ref=${encodeURIComponent(base)}`,'GET',undefined,true)) throw new TripError('Ya existe un viaje con ese identificador. Esta versión crea viajes nuevos sin reemplazar los anteriores.',409,'trip_exists');
  const ref=await call(`git/ref/heads/${base}`);
  if(!await call(`git/ref/heads/${branch}`,'GET',undefined,true)) await call('git/refs','POST',{ref:`refs/heads/${branch}`,sha:ref.object.sha});
  const content=JSON.stringify(trip,null,2)+'\n';
  const branchFile=await call(`contents/${file}?ref=${encodeURIComponent(branch)}`,'GET',undefined,true);
  if(branchFile && branchFile.content?.replace(/\s/g,'')!==encode(content)) throw new TripError('La propuesta remota cambió. Prepara un nuevo borrador.',409,'proposal_changed');
  if(!branchFile) await call(`contents/${file}`,'PUT',{message:`Añadir viaje ${trip.title}`,branch,content:encode(content)});
  const pr=await call('pulls','POST',{title:`BookTrip: ${trip.title}`,head:branch,base,draft:true,body:`Nuevo viaje preparado desde BookTrip y revisado por ${identity.name}.\n\nContiene únicamente datos del viaje; las páginas y la biblioteca se generan con los componentes compartidos. Los horarios son propuestas y las reservas aportadas requieren comprobación.\n\nRevisar el contenido y la vista previa antes de integrar. La IA no ha realizado compras ni reservas.`});
  return publicationResult(pr,false);
}
function publicationResult(pr,reused) {
  if(!Number.isInteger(pr.number) || !/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/pull\/\d+$/.test(pr.html_url || '')) throw new TripError('GitHub no confirmó la propuesta de publicación.',502,'publishing_unavailable');
  return {state:pr.merged_at?'merged':pr.state==='closed'?'closed':'review',number:pr.number,url:pr.html_url,reused};
}
