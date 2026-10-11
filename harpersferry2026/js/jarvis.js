(()=>{'use strict';const overlay=document.getElementById('jarvisOverlay');if(!overlay)return;const days=[
[{time:'08:00–09:00',name:'🚗 Hertz · DCA',lat:38.8521,lng:-77.0402,desc:'Salir desde Arlington y recoger el vehículo reservado a las 9:00 a. m. Revisar transmisión, fotos, combustible y contrato.',parking:'Oficina Hertz · Ronald Reagan Washington National Airport',nav:'Hertz Ronald Reagan Washington National Airport'},
{time:'09:15–11:15',name:'🛣️ Camino a Harpers Ferry',lat:39.3255,lng:-77.757,desc:'Conducir hacia West Virginia. Comprobar tráfico en Google Maps antes de salir.',parking:'Ir al estacionamiento del parque o área de acceso señalizada',nav:'Harpers Ferry National Historical Park Visitor Center'},
{time:'11:15–13:30',name:'🏛️ Lower Town y John Brown’s Fort',lat:39.323059,lng:-77.729559,desc:'Calles históricas y confluencia de los ríos. Caminata tranquila, con paradas y atención a cuestas y adoquines.',parking:'Preferir estacionamiento oficial NPS y transporte al centro según disponibilidad',nav:'John Browns Fort Harpers Ferry WV'},
{time:'13:30–14:30',name:'🍽️ Almuerzo · The Rabbit Hole',lat:39.324,lng:-77.731,desc:'Restaurante para almorzar; confirmar horario especial y posibles esperas.',parking:'Área histórica: no asumir aparcamiento frente al restaurante',nav:'The Rabbit Hole 186 High St Harpers Ferry'},
{time:'15:00–16:00',name:'🛎️ Check-in · Quality Inn',lat:39.317,lng:-77.75,desc:'Entrada desde las 3 p. m. Habitación King y descanso antes de Halloween.',parking:'Estacionamiento del hotel, confirmar en recepción',nav:'Quality Inn 25 Union St Harpers Ferry WV'},
{time:'16:00–17:30',name:'🎪 Festival o descanso',lat:39.337,lng:-77.76,desc:'Festival de Bakerton como opción solo si se confirma con el organizador; alternativa: descansar en el hotel.',parking:'Preguntar al organizador por estacionamiento',nav:'Bakerton Market 834 Carter Ave West Virginia'},
{time:'18:00–19:20',name:'🍬 Trick-or-treat · Bolivar',lat:39.324,lng:-77.754,desc:'Pasear y ver decoración durante el horario municipal confirmado de 6 a 8 p. m. Mantenerse en aceras y respetar casas.',parking:'Estacionar solo en zonas autorizadas de Bolivar; no bloquear entradas',nav:'Bolivar West Virginia'},
{time:'20:00–21:30',name:'👻 Ghost Tour (opcional)',lat:39.325,lng:-77.732,desc:'Solo si reservan y prefieren tour nocturno; la salida debe verificarse. Alternativa: paseo y descanso. Compite con el trick-or-treat.',parking:'Consultar punto de reunión cerca de St Peters Catholic Church; verificar accesos',nav:'St Peters Catholic Church Harpers Ferry WV'}],
[{time:'08:00–09:00',name:'🥐 Desayuno en Quality Inn',lat:39.317,lng:-77.75,desc:'Desayuno incluido; preparar equipaje.',parking:'Estacionamiento del hotel',nav:'Quality Inn 25 Union St Harpers Ferry WV'},
{time:'09:00–10:30',name:'🍂 Fotos y paseo histórico',lat:39.323059,lng:-77.729559,desc:'Visita relajada a Lower Town y puntos del río. Evitar rutas exigentes como Maryland Heights.',parking:'Acceso oficial NPS; revisar la disponibilidad',nav:'Harpers Ferry Lower Town'},
{time:'10:30–11:00',name:'🛎️ Check-out',lat:39.317,lng:-77.75,desc:'Entregar habitación antes de las 11:00 a. m.',parking:'Estacionamiento del hotel',nav:'Quality Inn 25 Union St Harpers Ferry WV'},
{time:'11:00–12:00',name:'☕ Café o almuerzo ligero',lat:39.3235,lng:-77.731,desc:'Última comida sencilla sin largas esperas. Salir temprano para mantener margen hacia DCA.',parking:'Comprobar estacionamiento disponible',nav:'Harpers Ferry WV cafes'},
{time:'12:00–15:30',name:'🚗 Regreso y devolución · DCA',lat:38.8521,lng:-77.0402,desc:'Regresar con tiempo para tráfico y combustible. Devolución Hertz reservada para las 3:30 p. m.',parking:'Hertz Car Rental Return DCA',nav:'Hertz Car Rental Return DCA'}]];
const $=id=>document.getElementById(id);let day=0,index=0,map,marker,route,routeAbort;const routeCache=new Map();const mapsUrl=s=>'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(s.nav)+'&travelmode=driving';
function render(){const stops=days[day],s=stops[index];$('jarvisTime').textContent='DÍA '+(day+1)+' · '+s.time;$('jarvisName').textContent=s.name;$('jarvisDesc').textContent=s.desc;$('jarvisParking').textContent=s.parking;$('jarvisNavigate').href=mapsUrl(s);$('jarvisCounter').textContent=(index+1)+' / '+stops.length;$('jarvisPrev').disabled=index===0;$('jarvisNext').disabled=index===stops.length-1;for(let d=0;d<2;d++)$('jarvisDay'+d).classList.toggle('selected',day===d);if(map){if(routeAbort)routeAbort.abort();if(route)map.removeLayer(route);route=null;loadRoadRoute(day);if(marker)marker.setLatLng([s.lat,s.lng]);else marker=L.marker([s.lat,s.lng]).addTo(map);map.setView([s.lat,s.lng],index===0?11:13,{animate:false});}}
async function loadRoadRoute(requestDay){
 if(!map)return;
 const list=days[requestDay];
 if(routeCache.has(requestDay)){drawRoadRoute(routeCache.get(requestDay),requestDay);return;}
 routeAbort=new AbortController();
 const signal=routeAbort.signal;
 // Public OSRM service returns actual drivable road geometry. Never draw straight lines as a substitute.
 const coordinates=list.map(s=>s.lng+','+s.lat).join(';');
 try{
 const res=await fetch('https://router.project-osrm.org/route/v1/driving/'+coordinates+'?overview=full&geometries=geojson',{signal});
 if(!res.ok)throw Error('Routing service unavailable');
 const data=await res.json();
 if(!data.routes?.[0]?.geometry?.coordinates?.length)throw Error('No road geometry');
 const latlngs=data.routes[0].geometry.coordinates.map(p=>[p[1],p[0]]);
 routeCache.set(requestDay,latlngs);
 drawRoadRoute(latlngs,requestDay);
 }catch(error){if(error.name!=='AbortError'){const hint=$('jarvisRouteStatus');if(hint)hint.textContent='Ruta vial no disponible ahora. Se muestran las paradas; abre Google Maps para navegación real.';}}
}
function drawRoadRoute(latlngs,requestDay){if(day!==requestDay||!map)return;if(route)map.removeLayer(route);
 route=L.polyline(latlngs,{color:'#ff9f46',weight:5,opacity:.9}).addTo(map);
 const hint=$('jarvisRouteStatus');if(hint)hint.textContent='Ruta por carreteras (OSRM/OpenStreetMap). Revisa tráfico y restricciones en Google Maps.';
}
function open(){overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('jarvis-open');if(!map&&window.L){map=L.map('jarvisMap',{zoomControl:true}).setView([39.32,-77.73],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(map);}render();if(map)requestAnimationFrame(()=>map.invalidateSize());}
function close(){overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('jarvis-open');}
document.querySelectorAll('[data-jarvis-open]').forEach(x=>x.addEventListener('click',open));$('jarvisClose').addEventListener('click',close);$('jarvisPrev').addEventListener('click',()=>{index=Math.max(0,index-1);render();});$('jarvisNext').addEventListener('click',()=>{index=Math.min(days[day].length-1,index+1);render();});for(let d=0;d<2;d++)$('jarvisDay'+d).addEventListener('click',()=>{day=d;index=0;render();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('is-open'))close();});})();