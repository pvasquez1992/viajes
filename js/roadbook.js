import { renderTrip } from './trip-view.js';
const container=document.getElementById('roadbook');
try {
  const response=await fetch('./trip.json',{credentials:'same-origin'});
  if(!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw Error('No pudimos cargar el viaje. Vuelve al libro e inténtalo de nuevo.');
  const trip=await response.json();renderTrip(container,trip,['Horarios propuestos. Comprueba disponibilidad y reservas antes de viajar.']);document.title=`${trip.title} · BookTrip`;container.removeAttribute('role');
} catch(error){container.textContent=error.message;}
