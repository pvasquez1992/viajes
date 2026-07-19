const isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
function openDay(anchor) {
    const target = document.getElementById(anchor);
    if (!target) {
        return;
    }
    if (target.tagName.toLowerCase() === 'details') {
        target.open = true;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('.timeline-day').forEach((day) => {
    day.addEventListener('toggle', () => {
        if (day.open) {
            day.classList.add('is-open');
        } else {
            day.classList.remove('is-open');
        }
    });
});

const routeStops = [
    { day: 1, name: 'Dormir primero + Reykjavík', coords: [64.1466, -21.9426], anchor: 'day-1' },
    { day: 2, name: 'Golden Circle + Reykjadalur', coords: [64.0416, -20.8859], anchor: 'day-2' },
    { day: 3, name: 'Costa Sur + camping por decidir', coords: [63.5322, -19.5114], anchor: 'day-3' },
    { day: 4, name: 'S1 + Jökulsárlón + Zodiac', coords: [64.0481, -16.1794], anchor: 'day-4', critical: true },
    { day: 5, name: 'Vestrahorn + Viking Set', coords: [64.2440, -15.2082], anchor: 'day-5' },
    { day: 6, name: 'Regreso + camping alterno', coords: [63.4186, -19.0060], anchor: 'day-6' },
    { day: 7, name: 'Camper return + FI645', coords: [63.9850, -22.6056], anchor: 'day-7' }
];
const routeLine = [
    [63.9850, -22.6056],
    [63.8424, -22.4328],
    [64.1466, -21.9426],
    [64.2559, -21.1295],
    [64.3138, -20.3008],
    [64.3271, -20.1199],
    [64.0416, -20.8859],
    [64.0169, -21.2110],
    [63.9331, -20.9971],
    [63.6156, -19.9896],
    [63.6210, -19.9848],
    [63.5321, -19.5114],
    [63.4031, -19.1288],
    [63.7713, -18.1718],
    [64.0167, -16.9667],
    [64.0250, -16.9140],
    [64.0164, -16.3725],
    [64.0481, -16.1794],
    [64.0393, -16.1869],
    [64.0100, -16.9800],
    [64.2440, -15.2082],
    [64.2468, -15.2022],
    [64.2478, -15.1850],
    [64.2480, -15.1500],
    [63.7897, -18.0630],
    [63.4062, -19.0442],
    [63.4031, -19.1288],
    [63.7529, -20.2243],
    [63.9850, -22.6056]
];
const returnRouteStartIndex = 23;
const map = L.map('routeMap', {
    zoomControl: !isSmallScreen,
    scrollWheelZoom: false,
    dragging: !isSmallScreen,
    touchZoom: !isSmallScreen,
    doubleClickZoom: !isSmallScreen,
    tap: true
});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
L.polyline(routeLine.slice(0, returnRouteStartIndex + 1), {
    color: '#77d8ff',
    weight: 4,
    opacity: .9,
    lineJoin: 'round'
}).addTo(map);
L.polyline(routeLine.slice(returnRouteStartIndex), {
    color: '#d9e8f5',
    weight: 2,
    opacity: .55,
    dashArray: '7 8'
}).addTo(map);
routeStops.forEach((stop) => {
    const icon = L.divIcon({
        className: '',
        html: `<span class="route-marker${stop.critical ? ' route-marker-critical' : ''}">${stop.day}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14]
    });
    const marker = L.marker(stop.coords, { icon }).addTo(map);
    marker.bindPopup(`<strong>Dia ${stop.day}</strong><br>${stop.name}`);
    marker.on('click', () => {
        openDay(stop.anchor);
    });
});
map.fitBounds(L.latLngBounds(routeLine), {
    padding: isSmallScreen ? [18, 18] : [28, 28]
});

// ===== JARVIS MODE =====
const jarvisData = [
    {
        day: 0, label: 'SALIDA', tab: 'SALIDA', name: 'Washington → Iceland', date: '31-ago-2026',
        stops: [
            { time: 'Inicio', icon: '🏠', title: '1201 S Eads St' },
            { time: 'Metro', icon: '🚇', title: 'Pentagon City Metro Station' },
            { time: 'IAD', icon: '✈️', title: 'Aeropuerto Washington-Dulles' },
            { time: '20:30', icon: '🛫', title: 'Icelandair FI644', sub: 'Noche en el avión rumbo a Keflavík.' }
        ],
        tip: 'Día de transición. Lleva batería, abrigo ligero y lo necesario para dormir algo en el vuelo.',
        wow: 'El viaje empieza antes de Islandia: salir de noche desde Washington y amanecer en Keflavík ya cambia el chip completo.'
    },
    {
        day: 1, name: 'Dormir primero + Reykjavík', date: '01-sept-2026',
        stops: [
            { time: '06:25', icon: '🛬', title: 'Llegada a Keflavík', coords: [63.9850, -22.6056] },
            { time: '07:30', icon: '🚐', title: 'Recoger Go Camper', coords: [63.9920, -22.5500] },
            { time: '08:30', icon: '😴', title: 'Dormir / descanso obligatorio', sub: 'Ir directo a Grindavík Campsite o punto permitido. La Ruta 43 va después de dormir.', coords: [63.8424, -22.4328] },
            { time: 'Opcional', icon: '🛣️', title: 'Ruta 43 / Svartsengi', sub: 'Solo si despiertas completamente bien.', coords: [63.8804, -22.4495] },
            { time: 'Opcional', icon: '♨️', title: 'Blue Lagoon', sub: 'Solo si finalmente reservas; no es plan fijo.', coords: [63.8790, -22.4450] },
            { time: 'Opcional', icon: '🥾', title: 'Úlfarsfell hike', sub: '1–2 h cerca de Reykjavík, solo si despiertas 10/10.', coords: [64.1518, -21.7546] },
            { time: 'Ciudad', icon: '⛪', title: '⭐ Hallgrímskirkja', star: true, coords: [64.1420, -21.9266] },
            { time: 'Ciudad', icon: '🌊', title: 'Viajero del Sol', coords: [64.1475, -21.9220] },
            { time: 'Ciudad', icon: '🎵', title: 'Harpa', coords: [64.1503, -21.9328] },
            { time: 'Noche', icon: '🏕️', title: 'Reykjavík Eco Campsite', coords: [64.0830, -21.9070] }
        ],
        tip: 'Conducción indicada: 1 h 13 min / 57 km. Primero dormir. Ruta 43, Blue Lagoon o Úlfarsfell solo después de descansar y si el cuerpo está claro.',
        wow: 'Hallgrímskirkja, el Viajero del Sol y Harpa hacen una entrada limpia a Reykjavík sin quemar energía el primer día.'
    },
    {
        day: 2, name: 'Golden Circle + Reykjadalur', date: '02-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Reykjavík Eco Campsite', coords: [64.0830, -21.9070] },
            { time: 'Ruta', icon: '🌋', title: '⭐ Þingvellir', star: true, coords: [64.2559, -21.1295] },
            { time: 'Ruta', icon: '💦', title: 'Geysir / Strokkur', sub: 'Strokkur suele erupcionar cada pocos minutos.', coords: [64.3138, -20.3008] },
            { time: 'Ruta', icon: '💧', title: 'Gullfoss Waterfall', coords: [64.3271, -20.1199] },
            { time: 'Ruta', icon: '🌋', title: 'Kerið Crater', coords: [64.0416, -20.8859] },
            { time: 'Ruta', icon: '♨️', title: '⭐ Reykjadalur Hot Spring Thermal River', sub: 'Cambio importante agregado oficialmente al plan.', star: true, coords: [64.0169, -21.2110] },
            { time: 'Noche', icon: '🏕️', title: 'Camping Selfoss', coords: [63.9280, -21.0060] }
        ],
        tip: 'Conducción indicada: 3 h 45 min / 234 km. Reykjadalur agrega caminata y baño termal: deja margen real de tiempo.',
        wow: 'Reykjadalur convierte el Golden Circle en algo más que paradas rápidas: termal, montaña y vapor saliendo del valle.'
    },
    {
        day: 3, name: 'Costa Sur + camping por decidir', date: '03-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Camping Selfoss', coords: [63.9280, -21.0060] },
            { time: 'Ruta', icon: '💧', title: 'Seljalandsfoss', coords: [63.6156, -19.9896] },
            { time: 'Ruta', icon: '💧', title: 'Gljúfrabúi', sub: 'Cascada escondida junto a Seljalandsfoss.', coords: [63.6210, -19.9848] },
            { time: 'Ruta', icon: '🌊', title: '⭐ Skógafoss', star: true, coords: [63.5322, -19.5114] },
            { time: 'Ruta', icon: '🪨', title: 'Dyrhólaey', coords: [63.4031, -19.1288] },
            { time: 'Decidir', icon: '🏕️', title: 'Skógar Campsite / Vík Camping', sub: 'Wanderlog marca Skógar como cerrado temporalmente; Vík queda como alternativa práctica.', coords: [63.5277, -19.5120] }
        ],
        tip: 'Conducción indicada: 2 h 33 min / 155 km. Revisa Skógar Campsite antes del viaje; si sigue raro, mueve la noche a Vík Camping.',
        wow: 'Seljalandsfoss, Gljúfrabúi y Skógafoss en el mismo día: este es el primer bloque grande de cascadas.'
    },
    {
        day: 4, name: 'S1 + Jökulsárlón + Zodiac', date: '04-sept-2026',
        critical: true,
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Skógar Campsite', coords: [63.5277, -19.5120] },
            { time: 'Ruta', icon: '🏞️', title: 'Fjaðrárgljúfur', coords: [63.7715, -18.1718] },
            { time: 'Ruta', icon: '🧊', title: 'Skaftafell Terminal – Tour Center', coords: [64.0167, -16.9667] },
            { time: 'Suave', icon: '🥾', title: '⭐ Skaftafellsjökull S1 Glacier Trail', sub: 'Ruta por libre; sustituye el tour de Tröll.', star: true, coords: [64.0250, -16.9140] },
            { time: 'Opcional', icon: '🧊', title: 'Fjallsárlón', sub: 'Recomendado si el horario va bien antes del Zodiac.', coords: [64.0164, -16.3725] },
            { time: '15:50', icon: '🚤', title: '⭐ Zodiac Boat Tour en Jökulsárlón', sub: 'Mejor horario disponible para el tour.', star: true, crit: true, coords: [64.0481, -16.1794] },
            { time: 'Después', icon: '🅿️', title: 'Jökulsárlón Glacier Lagoon Parking', coords: [64.0478, -16.1782] },
            { time: 'Después', icon: '💎', title: '⭐ Diamond Beach', star: true, coords: [64.0393, -16.1869] },
            { time: 'Noche', icon: '🏕️', title: 'Skaftafell Campground', sub: 'Wanderlog vuelve 52 min / 57 km desde Diamond Beach.', coords: [64.0100, -16.9800] }
        ],
        tip: 'Conducción indicada: 4 h 33 min / 298 km. El plan ya no tiene Glacier Hike: S1 por libre, Fjallsárlón opcional y horario 15:50 protegido para el Zodiac.',
        wow: 'Jökulsárlón + Zodiac + Diamond Beach es el centro emocional del viaje: hielo azul, laguna glaciar y arena negra en una sola tarde.'
    },
    {
        day: 5, name: 'Vestrahorn y pueblo vikingo', date: '05-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Skaftafell Campground', coords: [64.0100, -16.9800] },
            { time: 'Ruta', icon: '⛰️', title: '⭐ Vestrahorn', star: true, coords: [64.2440, -15.2082] },
            { time: 'Ruta', icon: '🪞', title: 'Stokksnes Mirror Beach', coords: [64.2468, -15.2022] },
            { time: 'Ruta', icon: '🎬', title: '⭐ Viking Village Film Set', sub: 'Este era el sitio missing del sábado 05.', star: true, coords: [64.2478, -15.1850] },
            { time: 'Opcional', icon: '🍔', title: 'Höfn', sub: 'Comida, supermercado o combustible si hace falta.', coords: [64.2520, -15.2080] },
            { time: 'Noche', icon: '🏕️', title: 'Vestrahorn Camping', coords: [64.2480, -15.1500] }
        ],
        tip: 'Conducción indicada: 3 h 1 min / 147 km. Ya queda separado Vestrahorn, Stokksnes Mirror Beach y Viking Village Film Set.',
        wow: 'Vestrahorn es la montaña dramática; Stokksnes es el espejo; el Viking Village Film Set es el detalle cinematográfico que faltaba.'
    },
    {
        day: 6, name: 'Regreso + camping alterno', date: '06-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Vestrahorn Camping', coords: [64.2480, -15.1500] },
            { time: 'Ruta', icon: '☕', title: 'Kirkjubæjarklaustur', coords: [63.7897, -18.0630] },
            { time: 'Ruta', icon: '🏖️', title: '⭐ Reynisfjara Beach', star: true, coords: [63.4062, -19.0442] },
            { time: 'Ruta', icon: '🪨', title: 'Dyrhólaey', coords: [63.4031, -19.1288] },
            { time: 'Noche', icon: '🏕️', title: 'Hvolsvöllur Camp Site', sub: 'Wanderlog lo marca como cerrado temporalmente. Tener alternativa cercana: Hella / Hellishólar.', coords: [63.7529, -20.2243] }
        ],
        tip: 'Conducción indicada: 5 h 38 min / 383 km. Es día largo; confirma Hvolsvöllur Camp Site o ten alternativa.',
        wow: 'El regreso por la Costa Sur repite paisajes con otra luz: Reynisfjara y Dyrhólaey vuelven como cierre fuerte.'
    },
    {
        day: 7, name: 'Regreso a Washington', date: '07-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Hvolsvöllur Camp Site', coords: [63.7529, -20.2243] },
            { time: 'Ruta', icon: '🚐', title: 'Manejo hacia Keflavík', coords: [63.9850, -22.6056] },
            { time: 'Antes', icon: '⛽', title: 'Cargar combustible', coords: [63.9950, -22.5500] },
            { time: 'Antes', icon: '🧹', title: 'Ordenar y limpiar la camper', sub: 'Basura, interiores y pertenencias listas antes de devolver.' },
            { time: '12:00', icon: '🔑', title: 'Devolver Go Camper', coords: [63.9920, -22.5500] },
            { time: '16:50', icon: '🛫', title: 'Icelandair FI645', sub: 'Salida de Keflavík.' },
            { time: '19:20', icon: '🛬', title: 'Llegada a Washington' }
        ],
        tip: 'Conducción indicada: 2 h 15 min / 147 km. Antes de devolver: gasolina, limpieza, basura y pertenencias. Devolución Go Camper a las 12:00.',
        wow: 'Última mirada a Islandia antes de despegar: lava negra, costa y Atlántico Norte en la memoria.'
    }
];

let jarvisActiveDay = 0;
let jarvisMap = null;
let jarvisMarkers = [];
let jarvisStopMarkers = [];
let jarvisDayRoute = null;
let selectedStopMarker = null;

function makePinIcon(s, selected) {
    const dotClass = ['j-pin-dot', s.star ? 'j-pin-star' : '', s.crit ? 'j-pin-crit' : ''].filter(Boolean).join(' ');
    const subHtml = s.sub ? `<small>${s.sub}</small>` : '';
    if (selected) {
        const selClass = s.crit ? 'j-pin-sel j-pin-crit-sel' : 'j-pin-sel';
        return L.divIcon({
            className: '',
            html: `<div class="j-pin ${selClass}"><div class="j-pin-caret">▼</div><div class="j-pin-dot-wrap"><span class="j-ring j-ring-1"></span><span class="j-ring j-ring-2"></span><div class="${dotClass}">${s.icon}</div></div><div class="j-pin-time">${s.time}</div></div>`,
            iconSize: [36, 68],
            iconAnchor: [18, 36],
            popupAnchor: [0, -38]
        });
    }
    return L.divIcon({
        className: '',
        html: `<div class="j-pin"><div class="${dotClass}">${s.icon}</div><div class="j-pin-time">${s.time}</div></div>`,
        iconSize: [36, 46],
        iconAnchor: [18, 15],
        popupAnchor: [0, -16]
    });
}

function selectStopMarker(marker, s) {
    if (selectedStopMarker && selectedStopMarker !== marker) {
        selectedStopMarker.setIcon(makePinIcon(selectedStopMarker._stopData, false));
    }
    selectedStopMarker = marker;
    marker.setIcon(makePinIcon(s, true));
    jarvisMap.flyTo(s.coords, 13, { animate: true, duration: 1.0 });
}

function jarvisMarkerIcon(idx, isActive) {
    const d = jarvisData[idx];
    const cls = ['j-jmarker', isActive ? 'j-jmarker-active' : '', d.critical ? 'j-jmarker-crit' : ''].filter(Boolean).join(' ');
    const size = isActive ? 34 : 26;
    return L.divIcon({
        className: '',
        html: `<span class="${cls}">${d.markerLabel || d.day}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -20]
    });
}

function renderJarvisDay(idx) {
    const d = jarvisData[idx];
    const body = document.getElementById('jarvisBody');
    body.scrollTop = 0;
    const dayLabel = d.label || `DÍA ${d.day}`;

    const stopsHtml = d.stops.map((s) => {
        const clickable = s.coords ? ' j-entry-clickable' : '';
        const coordsAttr = s.coords ? ` data-lat="${s.coords[0]}" data-lng="${s.coords[1]}"` : '';
        const entryClass = ['j-entry', s.star ? 'star' : '', s.crit ? 'crit-stop' : ''].filter(Boolean).join(' ') + clickable;
        const titleClass = s.star ? 'j-entry-title star-title' : 'j-entry-title';
        const subHtml = s.sub ? `<div class="j-entry-sub">${s.sub}</div>` : '';
        return `<div class="${entryClass}"${coordsAttr}><div class="j-entry-top"><span class="j-time">${s.time}</span><div class="j-entry-content"><div class="${titleClass}">${s.icon} ${s.title}</div>${subHtml}</div></div></div>`;
    }).join('');

    const critLabel = d.critical
        ? '<span style="font-size:11px;font-weight:800;color:#ffb060;letter-spacing:.08em;text-transform:uppercase;font-family:monospace;">⚡ DÍA CRÍTICO</span>'
        : '';

    body.innerHTML = `
<div class="j-day-title">
  <span class="j-day-num">${dayLabel}</span>
  <span class="j-day-name">${d.name}</span>
  ${critLabel}
  <span class="j-day-date">${d.date}</span>
</div>
<div class="j-timeline">${stopsHtml}</div>
<div class="j-tip">
  <div class="j-tip-label">🧠 JARVIS</div>
  <div class="j-tip-text" id="jarvisTipText"></div>
</div>
<div class="j-wow">
  <div class="j-wow-label">💥 SENSACIÓN WOW</div>
  <div class="j-wow-text">${d.wow}</div>
</div>`;

    body.querySelectorAll('.j-entry-clickable').forEach((el) => {
        el.addEventListener('click', () => {
            if (!jarvisMap) return;
            const lat = +el.dataset.lat;
            const lng = +el.dataset.lng;
            const match = jarvisStopMarkers.find((m) => {
                const ll = m.getLatLng();
                return Math.abs(ll.lat - lat) < 0.001 && Math.abs(ll.lng - lng) < 0.001;
            });
            if (match) {
                selectStopMarker(match, match._stopData);
                setTimeout(() => match.openPopup(), 800);
            }
        });
    });

    let i = 0;
    const text = d.tip;
    const tipEl = document.getElementById('jarvisTipText');
    tipEl.textContent = '';
    const timer = setInterval(() => {
        tipEl.textContent += text[i++];
        if (i >= text.length) clearInterval(timer);
    }, 18);
}

function clearDayMarkers() {
    jarvisStopMarkers.forEach((m) => m.remove());
    jarvisStopMarkers = [];
    if (jarvisDayRoute) { jarvisDayRoute.remove(); jarvisDayRoute = null; }
    selectedStopMarker = null;
}

function drawDayMarkers(idx) {
    const d = jarvisData[idx];
    const dayColor = d.critical ? '#ffb060' : '#77d8ff';
    const stopsWithCoords = d.stops.filter((s) => s.coords);

    if (stopsWithCoords.length > 1) {
        jarvisDayRoute = L.polyline(stopsWithCoords.map((s) => s.coords), {
            color: dayColor, weight: 2.5, opacity: .7, dashArray: '6 5', lineJoin: 'round'
        }).addTo(jarvisMap);
    }

    stopsWithCoords.forEach((s) => {
        const marker = L.marker(s.coords, { icon: makePinIcon(s, false) }).addTo(jarvisMap);
        marker._stopData = s;
        const subHtml = s.sub ? `<small>${s.sub}</small>` : '';
        marker.bindPopup(`<strong>${s.icon} ${s.title}</strong>${subHtml ? '<br>' + subHtml : ''}`);
        marker.on('click', () => { selectStopMarker(marker, s); setTimeout(() => marker.openPopup(), 600); });
        jarvisStopMarkers.push(marker);
    });

    if (stopsWithCoords.length) {
        const bounds = L.latLngBounds(stopsWithCoords.map((s) => s.coords));
        const isMobile = window.innerWidth <= 640;
        jarvisMap.flyToBounds(bounds, { padding: isMobile ? [32, 32] : [60, 60], maxZoom: 12, duration: 0.9 });
    }
}

function switchJarvisDay(idx) {
    jarvisActiveDay = idx;
    document.querySelectorAll('.j-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
    if (jarvisMarkers.length) {
        jarvisMarkers.forEach((m, i) => {
            if (m) {
                m.marker.setIcon(jarvisMarkerIcon(i, i === idx));
            }
        });
    }
    clearDayMarkers();
    if (jarvisMap) drawDayMarkers(idx);
    renderJarvisDay(idx);
}

function buildJarvisUI() {
    const tabs = document.getElementById('jarvisTabs');
    if (!tabs.children.length) {
        tabs.innerHTML = jarvisData.map((d, i) => {
            const critClass = d.critical ? ' j-tab-crit' : '';
            const tabLabel = d.tab || `DÍA ${d.day}`;
            return `<button class="j-tab${critClass}" data-idx="${i}">${tabLabel}</button>`;
        }).join('');
        tabs.querySelectorAll('.j-tab').forEach((t) => {
            t.addEventListener('click', () => switchJarvisDay(+t.dataset.idx));
        });

        document.getElementById('jarvisSidebarToggle').addEventListener('click', () => {
            const sb = document.getElementById('jarvisSidebar');
            const hidden = sb.classList.toggle('j-hidden');
            const isMobile = window.innerWidth <= 640;
            document.getElementById('jarvisSidebarToggle').textContent = isMobile
                ? (hidden ? '▲' : '▼')
                : (hidden ? '▶' : '◀');
            document.getElementById('jarvisTabs').classList.toggle('j-tabs-expanded', hidden);
            if (jarvisMap) setTimeout(() => jarvisMap.invalidateSize(), 320);
        });
    }

    if (!jarvisMap) {
        jarvisMap = L.map('jarvisMap', {
            zoomControl: !isSmallScreen,
            scrollWheelZoom: false,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: false,
            tap: true,
            attributionControl: false
        });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(jarvisMap);
        L.polyline(routeLine.slice(0, returnRouteStartIndex + 1), { color: '#77d8ff', weight: 2, opacity: .35, lineJoin: 'round' }).addTo(jarvisMap);
        L.polyline(routeLine.slice(returnRouteStartIndex), { color: '#d9e8f5', weight: 1.5, opacity: .2, dashArray: '6 8' }).addTo(jarvisMap);
        jarvisMarkers = jarvisData.map((d, i) => {
            const stop = routeStops.find((s) => s.day === d.day);
            if (!stop) {
                return null;
            }
            const marker = L.marker(stop.coords, { icon: jarvisMarkerIcon(i, false) }).addTo(jarvisMap);
            marker.on('click', () => switchJarvisDay(i));
            return { marker, coords: stop.coords };
        });
        jarvisMap.fitBounds(L.latLngBounds(routeLine), { padding: [24, 24] });
    }
    setTimeout(() => jarvisMap.invalidateSize(), 60);
}

const jarvisOverlay = document.getElementById('jarvisOverlay');

document.getElementById('jarvisOpen').addEventListener('click', () => {
    jarvisOverlay.classList.add('active');
    jarvisOverlay.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    buildJarvisUI();
    switchJarvisDay(jarvisActiveDay);
});

document.getElementById('jarvisClose').addEventListener('click', () => {
    jarvisOverlay.classList.remove('active');
    jarvisOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
});

document.addEventListener('keydown', (e) => {
    if (!jarvisOverlay.classList.contains('active')) return;
    if (e.key === 'Escape') {
        jarvisOverlay.classList.remove('active');
        jarvisOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
    if (e.key === 'ArrowRight') switchJarvisDay(Math.min(jarvisActiveDay + 1, jarvisData.length - 1));
    if (e.key === 'ArrowLeft') switchJarvisDay(Math.max(jarvisActiveDay - 1, 0));
});
