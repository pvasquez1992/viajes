import { presentTrip } from './trip-presentation.js';
const container=document.getElementById('roadbook');
try {
  const id=location.pathname.match(/^\/trips\/([a-z0-9][a-z0-9-]{2,63})\/?$/)?.[1];
  if(!id) throw Error('No pudimos identificar el viaje.');
  let response=await fetch(`/api/booktrip/trips/${id}`,{credentials:'same-origin',cache:'no-store'});
  const stored=response.ok;
  if(response.status===404) response=await fetch('./trip.json',{credentials:'same-origin'});
  if(!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw Error('No pudimos cargar el viaje. Vuelve al libro e inténtalo de nuevo.');
  const body=await response.json();const trip=stored?body.data:body;
  await presentTrip(container,trip,['Horarios propuestos. Comprueba disponibilidad y reservas antes de viajar.']);
  document.title=`${trip.title} · BookTrip`;
} catch(error){container.textContent=error.message;}
