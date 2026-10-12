import { presentTrip } from './trip-presentation.js';
const container=document.getElementById('roadbook');
try {
  const archived=location.pathname.startsWith('/eliminados/');
  const id=location.pathname.match(/^\/(?:eliminados\/)?trips\/([a-z0-9][a-z0-9-]{2,63})\/?$/)?.[1];
  if(!id) throw Error('No pudimos identificar el viaje.');
  let response=await fetch(`/api/booktrip/${archived?'archive':'trips'}/${id}`,{credentials:'same-origin',cache:'no-store'});
  const stored=response.ok;
  if(response.status===404 && !archived) response=await fetch('./trip.json',{credentials:'same-origin'});
  if(!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw Error('No pudimos cargar el viaje. Vuelve al libro e inténtalo de nuevo.');
  const body=await response.json();const trip=stored?body.data:body;
  await presentTrip(container,trip,['Horarios propuestos. Comprueba disponibilidad y reservas antes de viajar.']);
  if(archived || body.originalUrl){const note=document.createElement('p'),link=document.createElement('a');link.style.color='#adebd3';if(archived){note.textContent='Este viaje está archivado. ';link.href='/eliminados/';link.textContent='Volver a Eliminados para restaurarlo';}else{link.href=body.originalUrl;link.textContent='Ver página original conservada';}note.append(link);container.prepend(note);if(archived && body.originalUrl){const original=document.createElement('a');original.href=body.originalUrl;original.textContent='Página original';original.style.color='#adebd3';note.append(' · ',original);}}
  document.title=`${trip.title} · BookTrip`;
} catch(error){container.textContent=error.message;}
