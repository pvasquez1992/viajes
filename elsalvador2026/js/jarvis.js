/* JARVIS Navidad El Salvador 2026 — map-first day navigation.
 * Geography is intentionally approximate where the reservation address is unverified.
 * Only routing API road geometries are drawn as real-road routes.
 */
(() => {
  'use strict';
  const overlay = document.getElementById('jarvisOverlay');
  const panel = overlay?.querySelector('.j-panel');
  const tabs = document.getElementById('jarvisTabs');
  const body = document.getElementById('jarvisBody');
  const title = document.getElementById('jarvisSideTitle');
  const subtitle = document.getElementById('jarvisSideSubtitle');
  const banner = document.getElementById('jarvisMapStatus');
  const routeInfo = document.getElementById('jarvisRouteStatus');
  const toggle = document.getElementById('jarvisSidebarToggle');
  const workspace = overlay?.querySelector('.j-workspace');
  if (!overlay || !tabs || !body) return;

  const DAYS = [...document.querySelectorAll('article.day[data-day]')];
  const LOC = Object.freeze({
    santaAna: [13.9942, -89.5597],
    soyapango: [13.7105, -89.1395],
    multiplaza: [13.675, -89.255],
    rioChiquito: [14.319, -89.127],
    elPital: [14.381, -89.123],
    airport: [13.4409, -89.0557]
  });
  const TAJUMULCO_MAPS = 'https://maps.app.goo.gl/gELn2eGH1Jhhe1GS6';
  const DEFAULT_VIEW = [13.92, -89.30];

  /* Place indexes refer to the event rows already present in the HTML roadbook.
     Confirmed trip facts are separate from approximate map pins and tentative routes. */
  const MISSION = {
    '18': {
      tab:'18 DIC', type:'✈️ Vuelo', label:'Llegada · Santa Ana',
      tip:'Llegada programada 12:46, hora salvadoreña. Migración y equipaje no tienen hora de término confirmada.',
      wow:'Reencuentro familiar y descanso tras el vuelo.',
      points:{0:{at:LOC.airport,icon:'🛬',place:'Aeropuerto SAL',note:'Pin del aeropuerto; hora de aterrizaje programada'}},
      route:false
    },
    '19': {
      tab:'19 DIC', type:'☕ Descanso', label:'Recuperación',
      tip:'Reservar este día para recuperarse del viaje; las actividades siguen flexibles.',
      wow:'Tiempo para convivir sin carreras ni horarios forzados.',
      points:{0:{at:LOC.santaAna,icon:'🏠',place:'Santa Ana',note:'Referencia general de la base familiar'}}, route:false
    },
    '25': {
      tab:'25 DIC', type:'🚌 Microbús', label:'Santa Ana → Tajumulco',
      tip:'Se viaja EN MICROBÚS desde Santa Ana. El enlace compartido necesita identificación exacta antes de dibujar la ruta.',
      wow:'Comienza una escapada de tres días; regreso el 27 por la noche.',
      points:{0:{at:LOC.santaAna,icon:'🚌',place:'Salida desde Santa Ana',note:'Punto exacto de abordaje por confirmar'}},
      external:{label:'Ver destino de Tajumulco en Google Maps',url:TAJUMULCO_MAPS},
      route:false
    },
    '26': {
      tab:'26 DIC', type:'🚌 Tajumulco', label:'Estancia en Tajumulco',
      tip:'Segundo día de estancia. Aún no se dispone de la ubicación precisa ni del plan de actividades.',
      wow:'Jornada libre para organizar según el destino real y las condiciones del grupo.',
      points:{},
      external:{label:'Abrir ubicación compartida',url:TAJUMULCO_MAPS},route:false
    },
    '27': {
      tab:'27 DIC', type:'🚌 Regreso', label:'Tajumulco → Santa Ana',
      tip:'Regreso EN MICROBÚS el domingo por la noche. No se inventa hora ni ruta de llegada.',
      wow:'Última noche del recorrido de Tajumulco: retorno a Santa Ana.',
      points:{1:{at:LOC.santaAna,icon:'🏠',place:'Regreso a Santa Ana',note:'Destino general; llegada nocturna prevista'}},
      external:{label:'Ver ubicación compartida de origen',url:TAJUMULCO_MAPS},route:false
    },
    '29': {
      tab:'29 DIC', type:'🚙 Recogida', label:'Vehículo en San Salvador',
      tip:'Recoger la Chevrolet Traverse a las 10:00 en Multiplaza o alrededores. Traslado previo sin medio confirmado.',
      wow:'Revisar ocho cinturones y documentar el estado del vehículo antes de salir.',
      points:{1:{at:LOC.multiplaza,icon:'🚙',place:'Multiplaza · zona aproximada',note:'Punto exacto de entrega pendiente de confirmar'}},route:false
    },
    '30': {
      tab:'30 DIC', type:'🚙 Carretera', label:'Santa Ana → Soyapango → Río Chiquito',
      tip:'Ocho adultos en una Traverse. Consultar tiempos y tráfico reales antes de fijar la salida. El destino Casa Itzé es una ubicación zonal aproximada.',
      wow:'La familia completa viaja junta hacia Río Chiquito. Llegada deseada alrededor de las 15:00.',
      points:{
        0:{at:LOC.santaAna,icon:'🏠',place:'Santa Ana · salida',note:'Referencia urbana; domicilio no publicado'},
        1:{at:LOC.soyapango,icon:'👨‍👩‍👧‍👦',place:'Soyapango · recogida',note:'Jardines del Pepeto 3; ubicación del sector, no puerta exacta'},
        3:{at:LOC.rioChiquito,icon:'🏡',place:'Río Chiquito · Casa Itzé',note:'Zona aproximada, no dirección verificada'}
      },
      route:true, vehicle:'🚙'
    },
    '31': {
      tab:'31 DIC', type:'🌲 Opcional', label:'El Pital · Año Nuevo',
      tip:'El Pital es OPCIONAL. Verificar acceso, pendientes, estado de vía y autorización de la arrendadora antes de salir.',
      wow:'Paisajes de montaña, regreso temprano y celebración familiar por la noche.',
      points:{
        0:{at:LOC.elPital,icon:'🌲',place:'El Pital · ubicación zonal',note:'Propuesta pendiente de confirmación'},
        2:{at:LOC.rioChiquito,icon:'🏡',place:'Casa Itzé · regreso',note:'Zona aproximada, no dirección exacta'}
      },route:true,vehicle:'🚙',optional:true
    },
    '1': {
      tab:'01 ENE', type:'☕ Descanso', label:'Año Nuevo en familia',
      tip:'Evitar desplazamientos innecesarios; priorizar la comodidad y movilidad del grupo.',
      wow:'Día de convivencia, descanso y fotografías.',
      points:{0:{at:LOC.rioChiquito,icon:'🏡',place:'Río Chiquito · Casa Itzé',note:'Referencia zonal aproximada'}},route:false
    },
    '2': {
      tab:'02 ENE', type:'🚙 Regreso', label:'Fin de la estancia',
      tip:'Salida prevista cerca de las 09:00. Sin ruta final confirmada para la distribución familiar.',
      wow:'Cierre de la escapada familiar.',
      points:{0:{at:LOC.rioChiquito,icon:'🧳',place:'Casa Itzé · salida',note:'Zona aproximada'}},route:false
    },
    '3': {
      tab:'03 ENE', type:'✈️ Vuelo', label:'SAL → Washington-Dulles',
      tip:'⚠️ ALERTA: devolver la Traverse a las 11:00 deja solo 2 h 35 min antes de un vuelo internacional a las 13:35. Solicitar devolución más temprana.',
      wow:'Regreso a Washington. Vuelo programado 13:35–18:55 (horas locales).',
      points:{1:{at:LOC.airport,icon:'🔑',place:'Aeropuerto SAL · devolución',note:'Punto exacto de la arrendadora pendiente de confirmar'},2:{at:LOC.airport,icon:'✈️',place:'Aeropuerto SAL · salida',note:'Vuelo internacional programado 13:35'}},route:false
    }
  };

  let map = null, activeIndex = 0, selectedRow = null, previousFocus = null;
  let activeMarkers = new Map(), markerLayer = null, routeLayer = null;
  let traveler = null, currentRoute = null, selectedMarker = null;
  let pendingRequest = null, animationFrame = null, requestToken = 0;
  const routeCache = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function geoKey(coords){return coords.map(v=>v.toFixed(5)).join(',')}
  function samePlace(a,b){return !!a && !!b && geoKey(a)===geoKey(b)}
  function iconOf(point,selected=false,stamp='') {
    return L.divIcon({className:'',
      html:'<div class="j-pin'+(selected?' selected':'')+'"><span class="j-pin-icon">'+point.icon+'</span><span class="j-pin-label">'+(stamp||'UBICACIÓN')+'</span></div>',
      iconSize:[85,55],iconAnchor:[42,19],popupAnchor:[0,-13]});
  }
  function travelerIcon(symbol) {
    return L.divIcon({className:'',html:'<span class="j-traveler">'+symbol+'</span>',iconSize:[33,33],iconAnchor:[16,16]});
  }
  function createExternal(label,url) {
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a;
  }
  function roadUrl(coords){
    return 'https://router.project-osrm.org/route/v1/driving/'+coords.map(([lat,lng])=>lng+','+lat).join(';')+'?overview=full&geometries=geojson&steps=false';
  }
  async function getRoadGeometry(coords, signal){
    const key=coords.map(geoKey).join('|');
    if(routeCache.has(key))return routeCache.get(key);
    const res=await fetch(roadUrl(coords),{signal});
    if(!res.ok)throw new Error('Routing unavailable');
    const data=await res.json();
    if(data.code!=='Ok'||!data.routes?.[0]?.geometry?.coordinates?.length)throw new Error('No road geometry');
    const geom=data.routes[0].geometry.coordinates.map(([lng,lat])=>[lat,lng]);
    routeCache.set(key,geom);return geom;
  }
  function clearMotion() {
    if(animationFrame!==null)cancelAnimationFrame(animationFrame);
    animationFrame=null;
    if(traveler){traveler.remove();traveler=null}
  }
  function resetMapDay(){
    requestToken++;
    pendingRequest?.abort();pendingRequest=null;clearMotion();
    if(markerLayer){markerLayer.remove();markerLayer=null}
    if(routeLayer){routeLayer.remove();routeLayer=null}
    activeMarkers=new Map();selectedMarker=null;currentRoute=null;selectedRow=null;
  }
  function setRouteNote(value){if(routeInfo)routeInfo.textContent=value}
  function fitPins(pins) {
    if(!map)return;
    if(pins.length>1)map.flyToBounds(L.latLngBounds(pins),{padding:[55,65],maxZoom:12,duration:reducedMotion.matches?0:.65});
    else if(pins.length===1)map.flyTo(pins[0],11,{duration:reducedMotion.matches?0:.65});
    else map.flyTo(DEFAULT_VIEW,8,{duration:reducedMotion.matches?0:.65});
  }
  function plotRoad(path,actual) {
    if(!map)return;
    routeLayer=L.layerGroup();
    const common={lineJoin:'round',lineCap:'round'};
    if(actual){
      L.polyline(path,{...common,color:'#361628',weight:8,opacity:.85}).addTo(routeLayer);
      L.polyline(path,{...common,color:'#f7af6e',weight:5,opacity:.96}).addTo(routeLayer);
    } else {
      L.polyline(path,{...common,color:'#f5c18f',weight:3,opacity:.7,dashArray:'3 10'}).addTo(routeLayer);
    }
    routeLayer.addTo(map);
  }
  function plotDay(idx) {
    resetMapDay();
    const day=DAYS[idx],data=MISSION[day.dataset.day];
    if(!map||!data)return;
    markerLayer=L.layerGroup().addTo(map);
    const mapped=Object.entries(data.points).map(([row,p])=>({row:Number(row),...p}));
    const coords=[]; const usage=new Map();
    mapped.forEach(p=>{
      let coord=p.at;
      const key=geoKey(coord),index=usage.get(key)||0;usage.set(key,index+1);
      if(index){coord=[coord[0]+index*.00028,coord[1]+index*.00028]}
      const marker=L.marker(coord,{icon:iconOf(p,false,p.place.split(' · ')[0].slice(0,16))}).addTo(markerLayer);
      const popup=document.createElement('div');
      const head=document.createElement('b');head.textContent=p.place;popup.append(head);
      const desc=document.createElement('p');desc.textContent=p.note+' · Referencia de mapa.';popup.append(desc);
      const nav=createExternal('Abrir Maps ↗','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.at.join(',')));
      popup.append(nav);marker.bindPopup(popup);
      marker.on('click',()=>selectStop(p.row));
      activeMarkers.set(p.row,{marker,point:p});
      coords.push(p.at);
    });
    fitPins(coords);
    if(data.route && coords.length>1) {
      const routePts=mapped.map(p=>p.at).filter((p,i,a)=>!i||!samePlace(p,a[i-1]));
      if(routePts.length>1){
        plotRoad(routePts,false);
        setRouteNote('⌁ Conexión esquemática · consultando trazado de carretera…');
        const thisToken=requestToken;
        const ctrl=new AbortController();pendingRequest=ctrl;
        getRoadGeometry(routePts,ctrl.signal).then(geometry=>{
          if(thisToken!==requestToken)return;
          routeLayer?.remove();routeLayer=null;
          currentRoute=geometry;plotRoad(geometry,true);
          setRouteNote((data.optional?'Ruta opcional · ':'')+'Ruta por carretera · referencia cartográfica, no tiempos validados');
          fitPins(coords);
        }).catch(err=>{
          if(err.name==='AbortError'||thisToken!==requestToken)return;
          setRouteNote('⚠ Conexión punteada ESQUEMÁTICA: no hay ruta por carretera validada.');
        }).finally(()=>{if(pendingRequest===ctrl)pendingRequest=null});
      }
    } else {
      setRouteNote(data.external?'📍 Destino exacto sin identificar · no se dibuja un recorrido inventado':'📍 Referencias de ubicación · sin ruta carretera verificada');
    }
  }
  function showSelected(row) {
    body.querySelectorAll('.j-entry').forEach(el=>el.classList.toggle('selected',Number(el.dataset.row)===row));
    const entry=body.querySelector('.j-entry[data-row="'+row+'"]');
    entry?.scrollIntoView({block:'nearest',behavior:reducedMotion.matches?'instant':'smooth'});
    if(selectedMarker){const original=activeMarkers.get(selectedRow);if(original)original.marker.setIcon(iconOf(original.point,false,original.point.place.split(' · ')[0].slice(0,16)))}
    const destination=activeMarkers.get(row);
    if(destination){
      destination.marker.setIcon(iconOf(destination.point,true,destination.point.place.split(' · ')[0].slice(0,16)));
      selectedMarker=destination.marker;
    }
  }
  function finishMarker(marker) {
    if(!map||!marker)return;
    map.flyTo(marker.getLatLng(),14,{duration:reducedMotion.matches?0:.55});
    window.setTimeout(()=>{if(overlay.classList.contains('is-open')&&map.hasLayer(marker))marker.openPopup()},reducedMotion.matches?0:550);
  }
  function greatCircle(a,b) {
    const toRad=Math.PI/180;const R=6371;
    const da=(b[0]-a[0])*toRad,db=(b[1]-a[1])*toRad;
    const h=Math.sin(da/2)**2+Math.cos(a[0]*toRad)*Math.cos(b[0]*toRad)*Math.sin(db/2)**2;
    return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }
  function drive(path,symbol,marker,token) {
    clearMotion();
    if(!map||!path?.length||token!==requestToken)return;
    const distances=[0];for(let i=1;i<path.length;i++)distances.push(distances[i-1]+greatCircle(path[i-1],path[i]));
    const total=distances[distances.length-1]||1;
    traveler=L.marker(path[0],{icon:travelerIcon(symbol),zIndexOffset:1000}).addTo(map);
    map.fitBounds(L.latLngBounds(path),{padding:[90,90],maxZoom:12,duration:.35});
    const start=performance.now()+250,duration=2050;
    const tick=now=>{
      if(token!==requestToken){clearMotion();return}
      const progress=Math.max(0,Math.min(1,(now-start)/duration));
      const eased=progress<.5?2*progress*progress:1-((-2*progress+2)**2)/2;
      const target=eased*total;let seg=1;
      while(seg<distances.length-1 && distances[seg]<target)seg++;
      const ratio=(target-distances[seg-1])/(distances[seg]-distances[seg-1]||1);
      traveler?.setLatLng([path[seg-1][0]+(path[seg][0]-path[seg-1][0])*ratio,path[seg-1][1]+(path[seg][1]-path[seg-1][1])*ratio]);
      if(progress<1)animationFrame=requestAnimationFrame(tick);
      else{clearMotion();finishMarker(marker)}
    };
    animationFrame=requestAnimationFrame(tick);
  }
  async function selectStop(row) {
    const d=MISSION[DAYS[activeIndex].dataset.day];if(!d)return;
    const target=activeMarkers.get(row);
    const from=activeMarkers.get(selectedRow);
    const former=selectedRow;
    showSelected(row);selectedRow=row;
    if(!target)return;
    // Motion requires both geolocated points AND road geometry. Never animate across a speculative link.
    if(d.route&&d.vehicle&&from&&former!==row&&!samePlace(from.point.at,target.point.at)){
      const thisToken=requestToken;
      pendingRequest?.abort();const ctrl=new AbortController();pendingRequest=ctrl;
      try{
        setRouteNote('⌁ Calculando carretera para animar el '+(d.vehicle==='🚙'?'vehículo':'microbús')+'…');
        const road=await getRoadGeometry([from.point.at,target.point.at],ctrl.signal);
        if(thisToken!==requestToken||selectedRow!==row)return;
        setRouteNote('🚙 Desplazamiento visual sobre carretera · no equivale a tiempo real de viaje');
        if(reducedMotion.matches){finishMarker(target.marker);return}
        drive(road,d.vehicle,target.marker,thisToken);
      }catch(e){
        if(e.name==='AbortError')return;
        setRouteNote('⚠ Tramo no disponible para animación. Se muestra la parada; no se inventa carretera.');
        finishMarker(target.marker);
      }finally{if(pendingRequest===ctrl)pendingRequest=null}
    }else{clearMotion();finishMarker(target.marker)}
  }
  function renderDay(idx) {
    const day=DAYS[idx],data=MISSION[day.dataset.day];
    if(!day||!data)return;
    const header=day.querySelector('h3')?.textContent||'Jornada';
    const note=day.querySelector('.day-header p')?.textContent||'';
    if(title)title.textContent=header;if(subtitle)subtitle.textContent=data.type+' · '+data.label;
    if(banner){banner.querySelector('strong').textContent=data.label;banner.querySelector('span').textContent=data.tip}
    body.replaceChildren();
    const dayHeader=document.createElement('div');dayHeader.className='j-day-title';
    const kicker=document.createElement('div');kicker.className='j-kicker';kicker.textContent='MISIÓN · '+data.type;
    const h3=document.createElement('h3');h3.textContent=header;
    const p=document.createElement('p');p.textContent=note;
    dayHeader.append(kicker,h3,p);body.append(dayHeader);
    const listNote=document.createElement('div');listNote.className='j-density';
    const events=[...day.querySelectorAll('.event')];
    const span=document.createElement('span');span.textContent=events.length+' PARADAS / EVENTOS';
    const count=document.createElement('span');count.textContent='Confirmado · tentativo · pendiente';
    listNote.append(span,count);body.append(listNote);
    const timeline=document.createElement('div');timeline.className='j-timeline';
    events.forEach((event,row)=>{
      const div=document.createElement('div');div.className='j-entry';div.dataset.row=String(row);
      const time=event.querySelector('time')?.textContent||'Por definir';
      const raw=event.querySelector('p');
      const titleText=[...raw?.childNodes||[]].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim()||'Actividad';
      const noteText=raw?.querySelector('small')?.textContent||'';
      const point=data.points[row];
      div.dataset.status=point?'mapped':'pending';
      const btn=document.createElement('button');btn.type='button';btn.className='j-entry-focus';
      const t=document.createElement('span');t.className='j-entry-time';t.textContent=time;
      const content=document.createElement('span');
      const h=document.createElement('strong');h.className='j-entry-title';h.textContent=titleText;
      const small=document.createElement('small');small.className='j-entry-note';small.textContent=noteText;
      content.append(h,small);btn.append(t,content);
      if(point)btn.addEventListener('click',()=>selectStop(row));
      else{btn.disabled=true;btn.title='Ubicación todavía no confirmada'}
      div.append(btn);
      if(point){
        const actions=document.createElement('div');actions.className='j-entry-actions';
        actions.append(createExternal('NAVEGAR ↗','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(point.at.join(','))));
        const approx=document.createElement('span');approx.textContent=point.note.includes('aproxim')||point.note.includes('zonal')||point.note.includes('sector')?'PIN APROX.':'VER MAPA';
        actions.append(approx);div.append(actions);
      }
      if(data.external&&row===0){
        const actions=document.createElement('div');actions.className='j-entry-actions';
        actions.append(createExternal('📍 DESTINO COMPARTIDO ↗',data.external.url));div.append(actions);
      }
      timeline.append(div);
    });body.append(timeline);
    const tip=document.createElement('div');tip.className='j-mission-tip';
    const strong=document.createElement('strong');strong.textContent='🧠 ANÁLISIS JARVIS';
    const desc=document.createElement('p');desc.textContent=data.tip;
    tip.append(strong,desc);body.append(tip);
    const wow=document.createElement('div');wow.className='j-mission-wow';
    const whats=document.createElement('strong');whats.textContent='✦ EXPERIENCIA DEL DÍA';
    const wowp=document.createElement('p');wowp.textContent=data.wow;wow.append(whats,wowp);body.append(wow);
    if(data.external){const link=createExternal('Abrir destino compartido de Tajumulco ↗',data.external.url);link.style.display='inline-block';link.style.margin='0 8px 18px';body.append(link)}
    body.scrollTop=0;
  }
  function switchDay(index) {
    if(!DAYS[index])return;
    activeIndex=index;
    tabs.querySelectorAll('button').forEach((b,i)=>{
      b.setAttribute('aria-selected',String(i===index));
      b.tabIndex=i===index?0:-1;
      if(i===index)b.scrollIntoView({block:'nearest',inline:'nearest'});
    });
    plotDay(index);renderDay(index);
    const mapped=Object.keys(MISSION[DAYS[index].dataset.day]?.points||{});
    if(mapped.length){
      const first=Number(mapped[0]);selectedRow=first;
      showSelected(first);
      // showSelected only highlights selected stop; keep overview until user selects an entry.
    }
  }
  function initialize() {
    if(!tabs.children.length){
      DAYS.forEach((d,i)=>{
        const data=MISSION[d.dataset.day];if(!data)return;
        const btn=document.createElement('button');btn.type='button';
        btn.className='j-tab'+(['30','3'].includes(d.dataset.day)?' j-tab-critical':'');
        btn.textContent=data.tab;btn.dataset.index=String(i);
        btn.setAttribute('role','tab');
        btn.addEventListener('click',()=>switchDay(i));
        btn.addEventListener('keydown',e=>{
          if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
          e.preventDefault();
          let next=e.key==='Home'?0:e.key==='End'?DAYS.length-1:Math.min(DAYS.length-1,Math.max(0,i+(e.key==='ArrowRight'?1:-1)));
          switchDay(next);tabs.children[next]?.focus();
        });tabs.append(btn);
      });
    }
    if(!map&&window.L){
      map=L.map('jarvisMap',{scrollWheelZoom:false,zoomControl:true,attributionControl:true,preferCanvas:true}).setView(DEFAULT_VIEW,9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,attribution:'© OpenStreetMap contributors'
      }).addTo(map);
    }else if(!window.L){
      document.getElementById('jarvisMap').textContent='Mapa no disponible sin conexión a Leaflet.';
    }
  }
  function open(){
    previousFocus=document.activeElement;
    initialize();
    overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('jarvis-open');
    workspace?.classList.remove('sidebar-hidden');
    document.getElementById('jarvisSidebar')?.classList.remove('j-hidden');
    toggle?.setAttribute('aria-expanded','true');
    switchDay(activeIndex);
    requestAnimationFrame(()=>map?.invalidateSize());
    panel?.focus();
  }
  function close(){
    resetMapDay();
    overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('jarvis-open');
    previousFocus?.focus();
  }
  document.querySelectorAll('[data-jarvis-open]').forEach(btn=>btn.addEventListener('click',open));
  document.getElementById('jarvisClose')?.addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  toggle?.addEventListener('click',()=>{
    const hidden=workspace?.classList.toggle('sidebar-hidden')||false;
    document.getElementById('jarvisSidebar')?.classList.toggle('j-hidden',hidden);
    toggle.textContent=hidden?'◀':'▶';toggle.setAttribute('aria-expanded',String(!hidden));
    setTimeout(()=>map?.invalidateSize(),80);
  });
  document.addEventListener('keydown',e=>{
    if(!overlay.classList.contains('is-open'))return;
    if(e.key==='Escape'){e.preventDefault();close();return}
    if(e.key==='Tab'&&panel){
      const controls=[...panel.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);
      if(!controls.length)return;
      if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1).focus()}
      else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus()}
    }
  });
})();