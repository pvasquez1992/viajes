import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { validateTrip, catalogEntry } from '../js/trip-contract.js';
export async function generateTrips(root, output) {
  const directory=path.join(root,'trips'); const catalog=[];
  // Only remove this generator's output, after checking its resolved boundary.
  const outputRoot=path.resolve(output);
  const generated=path.resolve(outputRoot,'trips');
  if(path.dirname(generated)!==outputRoot || path.basename(generated)!=='trips' || path.resolve(root)===outputRoot) throw Error('Directorio de salida inválido.');
  await rm(generated,{recursive:true,force:true});
  let entries; try {entries=await readdir(directory,{withFileTypes:true});} catch(error){if(error.code==='ENOENT') entries=[];else throw error;}
  for(const entry of entries) {
    if(!entry.isDirectory()) continue;
    const source=path.join(directory,entry.name,'trip.json');
    // Ignore no directories silently: incomplete generated trips must fail the build.
    const trip=JSON.parse(await readFile(source,'utf8')); validateTrip(trip);
    if(trip.id!==entry.name) throw Error('El identificador del viaje no coincide con su carpeta.');
    const target=path.join(output,'trips',trip.id); await mkdir(target,{recursive:true});
    await writeFile(path.join(target,'trip.json'),JSON.stringify(trip,null,2)+'\n');
    await writeFile(path.join(target,'index.html'),await readFile(path.join(root,'templates','trip.html'),'utf8'));
    catalog.push(catalogEntry(trip));
  }
  await mkdir(path.join(output,'trips'),{recursive:true});
  await writeFile(path.join(output,'trips','catalog.json'),JSON.stringify(catalog,null,2)+'\n');
  return catalog;
}
