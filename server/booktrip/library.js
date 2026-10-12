import { legacyTrips } from '../../js/trip-library.js';
import { TripError } from '../../js/trip-contract.js';

export function libraryReference(entry) {
  return {id:entry.id || (entry.href.startsWith('trips/')?'':'legacy:')+entry.href.replace(/^trips\//,'').replace(/\/$/,''),title:entry.title,url:'/'+entry.href,start:entry.start,end:entry.end,editable:entry.editable===true,removable:entry.removable ?? entry.editable===true};
}

// The same legacy catalog drives the home page and the assistant. Generated
// static trips remain read-only; only their reviewed metadata is needed here.
export async function readLibrary(env, storage, identity) {
  let generated=[];
  if(env.ASSETS?.fetch) {
    const response=await env.ASSETS.fetch(new Request('https://booktrip-assets.invalid/trips/catalog.json'));
    if(!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw new TripError('No pudimos consultar el catálogo completo. Inténtalo de nuevo.',503,'catalog_unavailable');
    generated=await response.json();
    if(!Array.isArray(generated) || !generated.every(entry=>entry && /^trips\/[a-z0-9][a-z0-9-]{2,63}\/$/.test(entry.href) && typeof entry.title==='string' && typeof entry.description==='string' && typeof entry.start==='string' && typeof entry.end==='string')) throw new TripError('El catálogo de viajes no está disponible.',503,'catalog_unavailable');
  }
  if(storage.isRemoved) {
    const available=await Promise.all(generated.map(async entry=>await storage.isRemoved(libraryReference(entry).id)?null:entry));
    generated=available.filter(Boolean);
  }
  const registered=new Set(await storage.legacyHrefs?.() || []);
  const entries=new Map([...legacyTrips,...generated].filter(entry=>!registered.has(entry.href)).map(entry=>[entry.href,{...entry,editable:false}]));
  for(const entry of await storage.catalog(identity)) entries.set(entry.href,entry);
  return [...entries.values()];
}
