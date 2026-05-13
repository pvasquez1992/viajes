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
    { day: 1, name: 'KEF / Reykjavik', coords: [64.1466, -21.9426], anchor: 'day-1' },
    { day: 2, name: 'Golden Circle', coords: [64.2559, -21.1295], anchor: 'day-2' },
    { day: 3, name: 'Costa Sur / Vik', coords: [63.4186, -19.0060], anchor: 'day-3' },
    { day: 4, name: 'Skaftafell / Jokulsarlon', coords: [64.0481, -16.1794], anchor: 'day-4', critical: true },
    { day: 5, name: 'Vestrahorn / Hofn', coords: [64.2720, -14.9970], anchor: 'day-5' },
    { day: 6, name: 'Regreso por Ring Road', coords: [63.5321, -19.5114], anchor: 'day-6' },
    { day: 7, name: 'Salida por KEF', coords: [63.9850, -22.6056], anchor: 'day-7' }
];
const routeLine = [
    [63.9850, -22.6056],
    [64.1466, -21.9426],
    [64.2559, -21.1295],
    [64.3138, -20.3008],
    [64.3271, -20.1199],
    [63.9331, -20.9971],
    [63.6156, -19.9896],
    [63.5321, -19.5114],
    [63.4186, -19.0060],
    [63.7713, -18.1718],
    [64.0167, -16.9667],
    [64.0481, -16.1794],
    [64.2720, -14.9970],
    [64.2440, -15.2082],
    [64.0481, -16.1794],
    [63.4186, -19.0060],
    [63.9850, -22.6056]
];
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
L.polyline(routeLine.slice(0, 13), {
    color: '#77d8ff',
    weight: 4,
    opacity: .9,
    lineJoin: 'round'
}).addTo(map);
L.polyline(routeLine.slice(12), {
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
        day: 1, name: 'Llegada + Reykjavik', date: '01-sept-2026',
        stops: [
            { time: '06:25', icon: '🛬', title: 'Llegada a KEF', coords: [63.9850, -22.6056] },
            { time: '07:30', icon: '🚐', title: 'Recoger camper', sub: 'Ventana 07:30–08:30. Revisar tanque de gas e inventario.', coords: [63.9920, -22.5500] },
            { time: '09:30', icon: '😴', title: 'Siesta estratégica', sub: '09:30–12:30. Zona Grindavík. No negociable.', coords: [63.8424, -22.4328] },
            { time: '14:30', icon: '🏙️', title: '⭐ Hallgrímskirkja · Harpa · Sun Voyager', sub: 'Hasta 17:30. Ciudad entera en 3 horas.', star: true, coords: [64.1420, -21.9264] },
            { time: '17:30', icon: '🛒', title: 'Supermercado Bónus', sub: 'Compra para 2–3 días. Alternativa: Krónan.', coords: [64.1366, -21.9344] },
            { time: '18:30', icon: '🏕️', title: 'Reykjavík Eco Campsite', coords: [64.0830, -21.9070] }
        ],
        tip: 'Compra para 3 días aquí. La próxima parada estratégica para reabastecer es Selfoss, mañana.',
        wow: 'Hallgrímskirkja parece un cohete vikingo. Desde arriba ves Reykjavik completa con techos de colores y el Atlántico detrás. Entrada oficial a Islandia.'
    },
    {
        day: 2, name: 'Golden Circle', date: '02-sept-2026',
        stops: [
            { time: '09:00', icon: '🌋', title: '⭐ Þingvellir National Park', sub: 'Hasta 10:30. Ruta 36.', star: true, coords: [64.2559, -21.1295] },
            { time: '11:30', icon: '💧', title: 'Geysir', sub: 'Strokkur erupciona cada 5–8 min.', coords: [64.3138, -20.3008] },
            { time: '12:30', icon: '💧', title: 'Gullfoss Waterfall', coords: [64.3271, -20.1199] },
            { time: '15:30', icon: '🌊', title: 'Kerið Crater', sub: 'Cráter volcánico con lago azul-verde. 30 min.', coords: [64.0416, -20.8859] },
            { time: '17:00', icon: '🛒', title: 'Selfoss — IMPORTANTE', sub: 'Bónus + gasolinera N1. Última parada antes de Vík.', coords: [63.9331, -20.9971] },
            { time: '18:30', icon: '🏕️', title: 'Selfoss Campsite', coords: [63.9280, -21.0060] }
        ],
        tip: 'Recarga gasolina SÍ O SÍ en N1 Selfoss. No hay nada útil entre Selfoss y Vík. Esto es crítico para el Día 3.',
        wow: 'Þingvellir — caminarás entre las placas tectónicas de América y Europa. Uno de los lugares más épicos del planeta.'
    },
    {
        day: 3, name: 'Costa Sur', date: '03-sept-2026',
        stops: [
            { time: '09:00', icon: '💧', title: 'Seljalandsfoss + Gljúfrabúi', sub: 'Puedes rodear Seljalandsfoss. Gljúfrabúi está escondida 5 min caminando.', coords: [63.6156, -19.9896] },
            { time: '11:00', icon: '🌊', title: '⭐ Skógafoss', sub: 'La cascada más brutal de la Costa Sur.', star: true, coords: [63.5322, -19.5114] },
            { time: '13:30', icon: '🦜', title: 'Dyrhólaey', sub: 'Arco de roca sobre el mar. Vista 360°.', coords: [63.4031, -19.1288] },
            { time: '14:30', icon: '🏖️', title: '⭐ Reynisfjara Beach', sub: 'Arena negra + columnas basálticas.', star: true, coords: [63.4062, -19.0442] },
            { time: '16:00', icon: '🛒', title: 'Vík í Mýrdal', sub: 'Krónan + N1. Última gasolinera antes de territorio glaciar.', coords: [63.4186, -19.0060] },
            { time: '17:30', icon: '🏕️', title: 'Vik Campsite', coords: [63.4150, -18.9800] }
        ],
        tip: '⚠️ Reynisfjara: nunca le des la espalda al mar. Las sneaker waves son reales y peligrosas. En serio.',
        wow: 'Skógafoss — el sonido del agua retumba en el pecho. Arcoíris casi constantes. El sendero sube 370 escalones hasta la cima y vale cada uno.'
    },
    {
        day: 4, name: 'Glaciares + Jökulsárlón', date: '04-sept-2026',
        critical: true,
        stops: [
            { time: '09:00', icon: '🏞️', title: 'Fjaðrárgljúfur', sub: '30 min máximo. Cañón verde surrealista.', coords: [63.7715, -18.1718] },
            { time: '10:30', icon: '🧊', title: 'Skaftafell Visitor Center', coords: [64.0167, -16.9667] },
            { time: '11:00', icon: '🧊', title: '⭐ Glacier Hike', sub: '11:00–14:00. Tour guiado sobre Vatnajökull. Reserva previa obligatoria.', star: true, crit: true, coords: [64.0700, -16.8500] },
            { time: '15:30', icon: '🧊', title: '⭐⭐ Jökulsárlón', sub: 'EL momento del viaje. Icebergs en silencio absoluto.', star: true, crit: true, coords: [64.0481, -16.1794] },
            { time: '16:30', icon: '💎', title: '⭐ Diamond Beach', sub: 'Hielo transparente sobre arena negra. 20 min caminando.', star: true, coords: [64.0393, -16.1869] },
            { time: '18:30', icon: '🏕️', title: 'Skaftafell Campground', coords: [64.0100, -16.9800] }
        ],
        tip: 'Jökulsárlón antes de las 16:00 tiene la mejor luz. No sacrifiques ni un minuto aquí. El Glacier Hike necesita reserva previa.',
        wow: 'Jökulsárlón — icebergs flotando en silencio absoluto. Los colores del hielo cambian del blanco al azul profundo. Uno de los 10 lugares más impresionantes del planeta.'
    },
    {
        day: 5, name: 'Vestrahorn', date: '05-sept-2026',
        stops: [
            { time: '10:30', icon: '⛰️', title: '⭐ Vestrahorn + Stokksnes', sub: 'Hasta 13:00. Incluye Viking Village (tarifa local).', star: true, coords: [64.2440, -15.2082] },
            { time: '13:30', icon: '🍔', title: 'Höfn', sub: 'Comida + gasolina. Buena langosta local.', coords: [64.2520, -15.2080] },
            { time: '14:30', icon: '🏕️', title: 'Camping Vestrahorn / Höfn', coords: [64.2480, -15.1500] },
            { time: 'Tarde', icon: '🕐', title: 'Tarde libre', sub: 'Sin agenda. Uno de los mejores momentos del viaje.', coords: [64.2440, -15.2082] }
        ],
        tip: 'Golden hour en Vestrahorn es entre 19:00–21:00 en septiembre. Si hay reflejo de agua en la playa, la foto es nivel National Geographic.',
        wow: 'Vestrahorn — montañas negras gigantes reflejadas en agua tranquila. Stokksnes en luz dorada es surrealista. Portada de National Geographic.'
    },
    {
        day: 6, name: 'Regreso por Ring Road', date: '06-sept-2026',
        stops: [
            { time: '10:00', icon: '☕', title: 'Pausa en Skaftafell', sub: 'Café, vistas. Sin prisa.', coords: [64.0167, -16.9667] },
            { time: '13:00', icon: '🍔', title: 'Vík', sub: 'Comida + gasolina.', coords: [63.4186, -19.0060] },
            { time: '15:00', icon: '🦜', title: 'Dyrhólaey', sub: 'Opcional. 30 min rápidos.', coords: [63.4031, -19.1288] },
            { time: '17:30', icon: '🏕️', title: 'Hvolsvöllur Campsite', coords: [63.5321, -20.2379] }
        ],
        tip: 'Día largo de roadtrip. Ya no hay presión de llegar a nada crítico. Pon música, disfruta el Ring Road y el paisaje. Es parte del viaje.',
        wow: 'El Ring Road en sentido contrario tiene otra energía. Reconoces los paisajes pero todo se ve diferente. El viaje ya está ganado.'
    },
    {
        day: 7, name: 'Salida — KEF', date: '07-sept-2026',
        stops: [
            { time: '08:30', icon: '🌅', title: 'Salida hacia el aeropuerto', coords: [63.5321, -20.2379] },
            { time: '10:30', icon: '✈️', title: 'KEF — Devolución camper + vuelo', sub: 'Deja el camper limpio y con gas. Llega 2h30 antes del vuelo.', coords: [63.9850, -22.6056] }
        ],
        tip: 'Deja el camper limpio, con el tanque lleno y sin basura. Evita cargos extra. 2h30 antes del vuelo mínimo.',
        wow: 'Islandia desde el aire. Volcanes, glaciares, lava negra y el Atlántico Norte. Siete días que no se olvidan.'
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
        html: `<span class="${cls}">${d.day}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -20]
    });
}

function renderJarvisDay(idx) {
    const d = jarvisData[idx];
    const body = document.getElementById('jarvisBody');
    body.scrollTop = 0;

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
  <span class="j-day-num">DÍA ${d.day}</span>
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
        jarvisMarkers.forEach((m, i) => m.marker.setIcon(jarvisMarkerIcon(i, i === idx)));
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
            return `<button class="j-tab${critClass}" data-idx="${i}">DÍA ${d.day}</button>`;
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
        L.polyline(routeLine.slice(0, 13), { color: '#77d8ff', weight: 2, opacity: .35, lineJoin: 'round' }).addTo(jarvisMap);
        L.polyline(routeLine.slice(12), { color: '#d9e8f5', weight: 1.5, opacity: .2, dashArray: '6 8' }).addTo(jarvisMap);
        jarvisMarkers = jarvisData.map((d, i) => {
            const stop = routeStops.find((s) => s.day === d.day);
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
