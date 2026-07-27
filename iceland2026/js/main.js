const smallScreenQuery = window.matchMedia('(max-width: 640px)');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isSmallScreen = smallScreenQuery.matches;

function openDay(anchor) {
    const target = document.getElementById(anchor);
    if (!target) {
        return;
    }
    if (target.tagName.toLowerCase() === 'details') {
        target.open = true;
    }
    target.scrollIntoView({
        behavior: reduceMotionQuery.matches ? 'auto' : 'smooth',
        block: 'start'
    });
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

const scrollProgress = document.getElementById('scrollProgress');
function updateScrollProgress() {
    if (!scrollProgress) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    scrollProgress.style.width = `${progress}%`;
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress);
updateScrollProgress();

const dayLinks = [...document.querySelectorAll('[data-day-target]')];
dayLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        openDay(link.dataset.dayTarget);
        history.replaceState(null, '', `#${link.dataset.dayTarget}`);
    });
});

if ('IntersectionObserver' in window && dayLinks.length) {
    const dayObserver = new IntersectionObserver((entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        dayLinks.forEach((link) => {
            const active = link.dataset.dayTarget === visible.target.id;
            link.classList.toggle('is-active', active);
            if (active) link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    }, { rootMargin: '-24% 0px -62% 0px', threshold: [0, .2, .6] });
    document.querySelectorAll('.timeline-day').forEach((day) => dayObserver.observe(day));
}

const toggleDays = document.getElementById('toggleDays');
if (toggleDays) {
    toggleDays.addEventListener('click', () => {
        const days = [...document.querySelectorAll('.timeline-day')];
        const shouldOpen = days.some((day) => !day.open);
        days.forEach((day) => { day.open = shouldOpen; });
        toggleDays.setAttribute('aria-pressed', String(shouldOpen));
        toggleDays.textContent = shouldOpen ? 'Cerrar todos' : 'Abrir todos';
    });
}

document.querySelectorAll('.card-gallery').forEach((gallery) => {
    const dots = [...gallery.querySelectorAll('.carousel-hint span')];
    const images = [...gallery.querySelectorAll('img')];
    if (!dots.length || !images.length) return;

    const updateGalleryDots = () => {
        const galleryCenter = gallery.scrollLeft + gallery.clientWidth / 2;
        let closestIndex = 0;
        let closestDistance = Infinity;
        images.forEach((image, index) => {
            const imageCenter = image.offsetLeft + image.offsetWidth / 2;
            const distance = Math.abs(imageCenter - galleryCenter);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        dots.forEach((dot, index) => dot.classList.toggle('is-active', index === closestIndex));
    };

    dots[0].classList.add('is-active');
    gallery.addEventListener('scroll', updateGalleryDots, { passive: true });
});

if ('IntersectionObserver' in window) {
    const navLinks = [...document.querySelectorAll('[data-nav]')];
    const sectionObserver = new IntersectionObserver((entries) => {
        const activeEntry = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!activeEntry) return;
        navLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.nav === activeEntry.target.id));
    }, { rootMargin: '-18% 0px -70% 0px', threshold: [0, .1, .35] });
    ['library', 'logistics', 'highlights'].forEach((id) => {
        const section = document.getElementById(id);
        if (section) sectionObserver.observe(section);
    });
}

const routeStops = [
    { day: 1, name: 'Llegada + Reykjavík', coords: [64.0830, -21.9070], anchor: 'day-1' },
    { day: 2, name: 'Golden Circle + Reykjadalur', coords: [64.0416, -20.8859], anchor: 'day-2' },
    { day: 3, name: 'Costa Sur + Skógar', coords: [63.5322, -19.5114], anchor: 'day-3' },
    { day: 4, name: 'Tröll S1 + Jökulsárlón + bote 15:50', coords: [64.0481, -16.1794], anchor: 'day-4', critical: true },
    { day: 5, name: 'Höfn + termales + Vestrahorn', coords: [64.2440, -14.9650], anchor: 'day-5' },
    { day: 6, name: 'Fjaðrárgljúfur + Vík + Dyrhólaey', coords: [63.7715, -18.1718], anchor: 'day-6' },
    { day: 7, name: 'Devolución + FI645', coords: [63.9850, -22.6056], anchor: 'day-7' }
];
const routeLine = [
    [63.9850, -22.6056],
    [63.8424, -22.4328],
    [64.1420, -21.9266],
    [64.1475, -21.9220],
    [64.1503, -21.9328],
    [64.1467, -21.8730],
    [64.0830, -21.9070],
    [64.2559, -21.1295],
    [64.2610, -21.1210],
    [64.3138, -20.3008],
    [64.1760, -20.4850],
    [64.3271, -20.1199],
    [64.0416, -20.8859],
    [64.0169, -21.2110],
    [63.9331, -20.9971],
    [63.9280, -21.0060],
    [63.7529, -20.2243],
    [63.6156, -19.9896],
    [63.6210, -19.9848],
    [63.5322, -19.5114],
    [63.5269, -19.5060],
    [63.5277, -19.5120],
    [63.7897, -18.0630],
    [64.0167, -16.9667],
    [64.0481, -16.1794],
    [64.0393, -16.1869],
    [64.0100, -16.9800],
    [64.2520, -15.2080],
    [64.3970, -15.3420],
    [64.2520, -15.2080],
    [64.2490, -14.9720],
    [64.2440, -14.9650],
    [64.2468, -14.9600],
    [64.2478, -14.9580],
    [64.2480, -14.9820],
    [63.7897, -18.0630],
    [63.7715, -18.1718],
    [63.4186, -19.0060],
    [63.4062, -19.0442],
    [63.4031, -19.1288],
    [63.7529, -20.2243],
    [63.9980, -22.5630],
    [63.9920, -22.5500],
    [63.9850, -22.6056]
];
const returnRouteStartIndex = 34;
const routeMapElement = document.getElementById('routeMap');
let map = null;

function addBaseMap(targetMap, theme = 'dark') {
    if (theme === 'street') {
        return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(targetMap);
    }

    return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(targetMap);
}

if (window.L && routeMapElement) {
    map = L.map(routeMapElement, {
        zoomControl: !smallScreenQuery.matches,
        scrollWheelZoom: false,
        dragging: !smallScreenQuery.matches,
        touchZoom: !smallScreenQuery.matches,
        doubleClickZoom: !smallScreenQuery.matches,
        tap: true
    });
    addBaseMap(map);
    L.polyline(routeLine.slice(0, returnRouteStartIndex + 1), {
        color: '#72d9c2',
        weight: 4,
        opacity: .92,
        lineJoin: 'round'
    }).addTo(map);
    L.polyline(routeLine.slice(returnRouteStartIndex), {
        color: '#c4d4ce',
        weight: 2,
        opacity: .55,
        dashArray: '7 8'
    }).addTo(map);
    routeStops.forEach((stop) => {
        const icon = L.divIcon({
            className: '',
            html: `<span class="route-marker${stop.critical ? ' route-marker-critical' : ''}">${stop.day}</span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -16]
        });
        const marker = L.marker(stop.coords, { icon }).addTo(map);
        marker.bindPopup(`<strong>Día ${stop.day}</strong><br>${stop.name}`);
        marker.on('click', () => openDay(stop.anchor));
    });
    map.fitBounds(L.latLngBounds(routeLine), {
        padding: smallScreenQuery.matches ? [18, 18] : [28, 28]
    });
} else if (routeMapElement) {
    routeMapElement.classList.add('map-unavailable');
    routeMapElement.innerHTML = '<p>El mapa no está disponible sin conexión. El itinerario completo sigue visible debajo.</p>';
}

// ===== JARVIS MODE =====
const jarvisData = [
    {
        day: 0, label: 'SALIDA', tab: 'SALIDA', name: 'Washington → Islandia', date: '31-ago-2026',
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
        day: 1, name: 'Llegada + Reykjavík', date: '01-sept-2026',
        stops: [
            { time: '06:25', icon: '🛬', title: 'Llegada a Keflavík', coords: [63.9850, -22.6056] },
            { time: '07:30', icon: '🚐', title: 'Recoger Go Camper', coords: [63.9920, -22.5500] },
            { time: 'Descanso', icon: '😴', title: 'Grindavík Campsite', sub: 'Parada opcional para dormir unas horas después del vuelo.', coords: [63.8424, -22.4328] },
            { time: 'Ciudad', icon: '⛪', title: '⭐ Hallgrímskirkja', star: true, coords: [64.1420, -21.9266] },
            { time: 'Ciudad', icon: '🌊', title: 'Viajero del Sol', coords: [64.1475, -21.9220] },
            { time: 'Ciudad', icon: '🎵', title: 'Harpa', coords: [64.1503, -21.9328] },
            { time: '⛽ Gas', icon: '⛽', title: 'Orkan Kleppsvegur', sub: 'Parada técnica antes del camping.', coords: [64.1467, -21.8730] },
            { time: 'Noche', icon: '🏕️', title: 'Reykjavík Eco Campsite', coords: [64.0830, -21.9070] }
        ],
        tip: 'Orden refinado: Go Campers, descanso opcional en Grindavík, Hallgrímskirkja, Viajero del Sol, Harpa, Orkan Kleppsvegur y Reykjavík Eco Campsite.',
        wow: 'Hallgrímskirkja, el Viajero del Sol y Harpa hacen una entrada limpia a Reykjavík sin quemar energía el primer día.'
    },
    {
        day: 2, name: 'Golden Circle + Reykjadalur', date: '02-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Reykjavík Eco Campsite', coords: [64.0830, -21.9070] },
            { time: 'Ruta', icon: '🌋', title: '⭐ Þingvellir', star: true, coords: [64.2559, -21.1295] },
            { time: 'Ruta', icon: '🪨', title: 'Almannagjá', sub: 'Caminar por la falla tectónica dentro de Þingvellir.', coords: [64.2610, -21.1210] },
            { time: 'Ruta', icon: '💦', title: 'Geysir / Strokkur', sub: 'Strokkur suele erupcionar cada pocos minutos.', coords: [64.3138, -20.3008] },
            { time: 'Parada', icon: '🐴', title: 'Brú Horsefarm', sub: 'Caballos islandeses; compras opcionales.', coords: [64.1760, -20.4850] },
            { time: 'Ruta', icon: '💧', title: 'Gullfoss Waterfall', coords: [64.3271, -20.1199] },
            { time: 'Ruta', icon: '🌋', title: 'Kerið', sub: 'Caminar el borde; bajar al lago es opcional.', coords: [64.0416, -20.8859] },
            { time: 'Termal', icon: '♨️', title: '⭐ Reykjadalur Hot Spring Thermal River', sub: 'Hiking, baño termal, descanso y regreso caminando.', star: true, coords: [64.0169, -21.2110] },
            { time: '⛽ Gas', icon: '⛽', title: 'Orkan Suðurlandsvegur, Selfoss', coords: [63.9331, -20.9971] },
            { time: 'Noche', icon: '🏕️', title: 'Camping Selfoss', coords: [63.9280, -21.0060] }
        ],
        tip: 'Orden refinado: Þingvellir, Almannagjá, Geysir, Brú Horsefarm, Gullfoss, Kerið, Reykjadalur, Orkan Selfoss y Camping Selfoss.',
        wow: 'Reykjadalur convierte el Golden Circle en algo más que paradas rápidas: termal, montaña y vapor saliendo del valle.'
    },
    {
        day: 3, name: 'Costa Sur + Skógar', date: '03-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Camping Selfoss', coords: [63.9280, -21.0060] },
            { time: '⛽ Gas', icon: '⛽', title: 'N1 Hvolsvöllur', sub: 'Repostar, baños, café o snacks antes de continuar.', coords: [63.7529, -20.2243] },
            { time: 'Ruta', icon: '💧', title: 'Seljalandsfoss', coords: [63.6156, -19.9896] },
            { time: 'Ruta', icon: '💧', title: 'Gljúfrabúi', sub: 'Cascada escondida junto a Seljalandsfoss.', coords: [63.6210, -19.9848] },
            { time: 'Ruta', icon: '🌊', title: '⭐ Skógafoss', star: true, coords: [63.5322, -19.5114] },
            { time: 'Pausa', icon: '☕', title: 'Skógar', sub: 'Almuerzo, café, baños o descanso.', coords: [63.5269, -19.5060] },
            { time: 'Noche', icon: '🏕️', title: 'Skógar Campsite', sub: 'Instalarse temprano y preparar el equipo del glaciar.', coords: [63.5277, -19.5120] }
        ],
        tip: 'Orden refinado: Camping Selfoss, N1 Hvolsvöllur, Seljalandsfoss, Gljúfrabúi, Skógafoss, Skógar y Skógar Campsite.',
        wow: 'Seljalandsfoss, Gljúfrabúi y Skógafoss en el mismo día: este es el primer bloque grande de cascadas.'
    },
    {
        day: 4, name: 'Tröll S1 + Jökulsárlón + bote', date: '04-sept-2026',
        critical: true,
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Skógar Campsite', coords: [63.5277, -19.5120] },
            { time: '⛽ Rápido', icon: '⛽', title: 'N1 Kirkjubæjarklaustur', sub: 'Repostar breve y continuar; actividad con horario fijo.', coords: [63.7897, -18.0630] },
            { time: '09:30', icon: '🥾', title: '⭐ Tröll Expeditions Skaftafell', sub: 'Hiking guiado Skaftafellsjökull S1, aprox. 9:30 a 12:30.', star: true, crit: true, coords: [64.0167, -16.9667] },
            { time: 'Almuerzo', icon: '🧊', title: 'Jökulsárlón', sub: 'Laguna, icebergs y comida antes del bote.', coords: [64.0481, -16.1794] },
            { time: 'Después', icon: '🅿️', title: 'Jökulsárlón Glacier Lagoon Parking', coords: [64.0478, -16.1782] },
            { time: '15:50', icon: '🚤', title: '⭐ Glacier Lagoon Trip Boat', sub: 'Paseo en bote reservado.', star: true, crit: true, coords: [64.0481, -16.1794] },
            { time: 'Después', icon: '💎', title: '⭐ Diamond Beach', star: true, coords: [64.0393, -16.1869] },
            { time: 'Noche', icon: '🏕️', title: 'Skaftafell Campground', sub: 'Regresar, cenar, ducharse y descansar.', coords: [64.0100, -16.9800] }
        ],
        tip: 'La parada en N1 Kirkjubæjarklaustur debe ser rápida: Tröll S1 va de 9:30 a 12:30 y el bote de Jökulsárlón está reservado para las 15:50.',
        wow: 'Jökulsárlón + bote + Diamond Beach es el centro emocional del viaje: hielo azul, laguna glaciar y arena negra en una sola tarde.'
    },
    {
        day: 5, name: 'Höfn + termales + Vestrahorn', date: '05-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Skaftafell Campground', coords: [64.0100, -16.9800] },
            { time: '⛽ Höfn', icon: '⛽', title: 'N1 Höfn', sub: 'Repostar, baños y revisar aire de llantas si hace falta.', coords: [64.2520, -15.2080] },
            { time: 'Compras', icon: '🛒', title: 'Nettó', sub: 'Comida, agua, snacks y provisiones.', coords: [64.2530, -15.2090] },
            { time: 'Termal', icon: '♨️', title: 'Hoffell Hot Tubs', sub: 'Baño termal con vistas a las montañas.', coords: [64.3970, -15.3420] },
            { time: 'Acceso', icon: '☕', title: 'Viking Cafe & Guesthouse', sub: 'Comprar acceso a Stokksnes; café o comida opcional.', coords: [64.2490, -14.9720] },
            { time: 'Ruta', icon: '⛰️', title: '⭐ Vestrahorn', star: true, coords: [64.2440, -14.9650] },
            { time: 'Ruta', icon: '🪞', title: 'Stokksnes Mirror Beach', coords: [64.2468, -14.9600] },
            { time: 'Ruta', icon: '🎬', title: '⭐ Viking Village Film Set', star: true, coords: [64.2478, -14.9580] },
            { time: 'Noche', icon: '🏕️', title: 'Vestrahorn Camping', coords: [64.2480, -14.9820] }
        ],
        tip: 'Orden refinado: Skaftafell, N1 Höfn, Nettó, Hoffell Hot Tubs, Viking Cafe, Vestrahorn, Mirror Beach, Viking Village y Vestrahorn Camping.',
        wow: 'Vestrahorn es la montaña dramática; Stokksnes es el espejo; el Viking Village Film Set es el detalle cinematográfico que faltaba.'
    },
    {
        day: 6, name: 'Fjaðrárgljúfur + Vík + Dyrhólaey', date: '06-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Vestrahorn Camping', coords: [64.2480, -14.9820] },
            { time: 'Ruta', icon: '☕', title: 'Kirkjubæjarklaustur', coords: [63.7897, -18.0630] },
            { time: 'Cañón', icon: '🏞️', title: '⭐ Fjaðrárgljúfur', star: true, coords: [63.7715, -18.1718] },
            { time: '⛽ Vík', icon: '⛽', title: 'Orkan Vík', sub: 'Repostar antes de Reynisfjara y Dyrhólaey.', coords: [63.4186, -19.0060] },
            { time: 'Ruta', icon: '🏖️', title: '⭐ Reynisfjara Beach', star: true, coords: [63.4062, -19.0442] },
            { time: 'Ruta', icon: '🪨', title: 'Dyrhólaey', coords: [63.4031, -19.1288] },
            { time: 'Opcional', icon: '🌋', title: 'LAVA Centre', sub: 'Museo interactivo sobre volcanes si queda energía.', coords: [63.7532, -20.2241] },
            { time: 'Noche', icon: '🏕️', title: 'Hvolsvöllur Camp Site', sub: 'Última noche: cenar, ducharse, ordenar y limpiar la camper.', coords: [63.7529, -20.2243] }
        ],
        tip: 'Día largo. El nuevo orden mete Fjaðrárgljúfur antes de Vík; luego Orkan Vík, Reynisfjara, Dyrhólaey, LAVA Centre opcional y Hvolsvöllur.',
        wow: 'El regreso por la Costa Sur repite paisajes con otra luz: Fjaðrárgljúfur, Reynisfjara y Dyrhólaey hacen un cierre fuerte.'
    },
    {
        day: 7, name: 'Regreso a Washington', date: '07-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Hvolsvöllur Camp Site', coords: [63.7529, -20.2243] },
            { time: '⛽ Final', icon: '⛽', title: 'Orkan Fitjar, Reykjanesbær', sub: 'Llenar completamente el tanque y guardar el recibo.', coords: [63.9980, -22.5630] },
            { time: '12:00', icon: '🔑', title: 'Go Campers Iceland', sub: 'Entregar la camper y completar inspección final.', coords: [63.9920, -22.5500] },
            { time: 'KEF', icon: '🛂', title: 'Aeropuerto Internacional de Keflavík', sub: 'Check-in, seguridad y comida antes del vuelo.', coords: [63.9850, -22.6056] },
            { time: '16:50', icon: '🛫', title: 'Icelandair FI645', sub: 'Salida de Keflavík hacia Washington.' },
            { time: '19:20', icon: '🛬', title: 'Llegada a Washington' }
        ],
        tip: 'Orden refinado: Hvolsvöllur, Orkan Fitjar para llenar tanque, Go Campers 12:00, aeropuerto de Keflavík y FI645 16:50.',
        wow: 'Última mirada a Islandia antes de despegar: lava negra, costa y Atlántico Norte en la memoria.'
    }
];

let jarvisActiveDay = 0;
let jarvisMap = null;
let jarvisMarkers = [];
let jarvisStopMarkers = [];
let jarvisDayRoute = null;
let selectedStopMarker = null;
let jarvisTipTimer = null;
let lastJarvisTrigger = null;

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
    const markerPoint = marker.getLatLng();
    const detailZoom = smallScreenQuery.matches ? 15 : 16;
    jarvisMap.flyTo(markerPoint, detailZoom, {
        animate: !reduceMotionQuery.matches,
        duration: reduceMotionQuery.matches ? 0 : 1
    });
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

    const stopsHtml = d.stops.map((s, stopIndex) => {
        const clickable = s.coords ? ' j-entry-clickable' : '';
        const coordsAttr = s.coords ? ` data-lat="${s.coords[0]}" data-lng="${s.coords[1]}" data-stop-index="${stopIndex}"` : '';
        const entryClass = ['j-entry', s.star ? 'star' : '', s.crit ? 'crit-stop' : ''].filter(Boolean).join(' ') + clickable;
        const titleClass = s.star ? 'j-entry-title star-title' : 'j-entry-title';
        const subHtml = s.sub ? `<div class="j-entry-sub">${s.sub}</div>` : '';
        const entryContent = `<div class="j-entry-top"><span class="j-time">${s.time}</span><div class="j-entry-content"><div class="${titleClass}">${s.icon} ${s.title}</div>${subHtml}</div></div>`;
        if (!s.coords) return `<div class="${entryClass}">${entryContent}</div>`;
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.coords[0]},${s.coords[1]}`;
        return `<div class="${entryClass}">
            <button class="j-entry-map" type="button"${coordsAttr} aria-label="Ver ${s.title.replace('⭐ ', '')} en el mapa">${entryContent}</button>
            <div class="j-entry-actions"><a class="j-navigate" href="${directionsUrl}" target="_blank" rel="noopener">Navegar ↗</a></div>
        </div>`;
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

    body.querySelectorAll('.j-entry-map').forEach((el) => {
        el.addEventListener('click', () => {
            if (!jarvisMap) return;
            const stopIndex = Number(el.dataset.stopIndex);
            const match = jarvisStopMarkers.find((m) => m._stopIndex === stopIndex);
            if (match) {
                selectStopMarker(match, match._stopData);
                setTimeout(() => match.openPopup(), 800);
            }
        });
    });

    if (jarvisTipTimer) clearInterval(jarvisTipTimer);
    let i = 0;
    const text = d.tip;
    const tipEl = document.getElementById('jarvisTipText');
    if (reduceMotionQuery.matches) {
        tipEl.textContent = text;
        return;
    }
    tipEl.textContent = '';
    jarvisTipTimer = setInterval(() => {
        tipEl.textContent += text[i++];
        if (i >= text.length) {
            clearInterval(jarvisTipTimer);
            jarvisTipTimer = null;
        }
    }, 18);
}

function clearDayMarkers() {
    jarvisStopMarkers.forEach((m) => m.remove());
    jarvisStopMarkers = [];
    if (jarvisDayRoute) { jarvisDayRoute.remove(); jarvisDayRoute = null; }
    selectedStopMarker = null;
}

function distanceKm(a, b) {
    const radiusKm = 6371;
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function maxSpreadKm(coords) {
    let max = 0;
    coords.forEach((coord, index) => {
        coords.slice(index + 1).forEach((candidate) => {
            max = Math.max(max, distanceKm(coord, candidate));
        });
    });
    return max;
}

function findTightCluster(stops) {
    if (stops.length < 3) return null;
    let bestCluster = null;
    const clusterRadiusKm = 2.6;

    stops.forEach((stop) => {
        const cluster = stops.filter((candidate) => distanceKm(stop.coords, candidate.coords) <= clusterRadiusKm);
        if (cluster.length >= 3 && (!bestCluster || cluster.length > bestCluster.length)) {
            bestCluster = cluster;
        }
    });

    if (!bestCluster || bestCluster.length === stops.length) return null;
    return bestCluster;
}

function coordKey(coords) {
    return `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
}

function displayCoordsForStop(stop, index, total) {
    if (total <= 1) return stop.coords;
    const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
    const radius = 0.00042;
    return [
        stop.coords[0] + Math.sin(angle) * radius,
        stop.coords[1] + Math.cos(angle) * radius
    ];
}

function buildPlottedStops(stops) {
    const counts = new Map();
    stops.forEach((stop) => {
        const key = coordKey(stop.coords);
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    const seen = new Map();
    return stops.map((stop) => {
        const key = coordKey(stop.coords);
        const index = seen.get(key) || 0;
        seen.set(key, index + 1);
        return {
            stop,
            coords: displayCoordsForStop(stop, index, counts.get(key))
        };
    });
}

function drawDayMarkers(idx) {
    const d = jarvisData[idx];
    const dayColor = d.critical ? '#ffb060' : '#77d8ff';
    const stopsWithCoords = d.stops.filter((s) => s.coords);
    const plottedStops = buildPlottedStops(stopsWithCoords);

    if (stopsWithCoords.length > 1) {
        jarvisDayRoute = L.polyline(stopsWithCoords.map((s) => s.coords), {
            color: dayColor, weight: 2.5, opacity: .7, dashArray: '6 5', lineJoin: 'round'
        }).addTo(jarvisMap);
    }

    plottedStops.forEach(({ stop: s, coords }) => {
        const marker = L.marker(coords, { icon: makePinIcon(s, false) }).addTo(jarvisMap);
        marker._stopData = s;
        marker._baseCoords = s.coords;
        marker._stopIndex = d.stops.indexOf(s);
        const subHtml = s.sub ? `<small>${s.sub}</small>` : '';
        marker.bindPopup(`<strong>${s.icon} ${s.title}</strong>${subHtml ? '<br>' + subHtml : ''}`);
        marker.on('click', () => { selectStopMarker(marker, s); setTimeout(() => marker.openPopup(), 600); });
        jarvisStopMarkers.push(marker);
    });

    if (stopsWithCoords.length) {
        const clusterStops = findTightCluster(stopsWithCoords);
        const viewportStops = clusterStops || stopsWithCoords;
        const viewportCoords = plottedStops
            .filter(({ stop }) => viewportStops.includes(stop))
            .map(({ coords }) => coords);
        const bounds = L.latLngBounds(viewportCoords);
        const isMobile = window.innerWidth <= 640;
        const clusterZoom = isMobile ? 15 : 16;
        const canUseDetailZoom = clusterStops && maxSpreadKm(viewportCoords) <= .8;
        if (canUseDetailZoom) {
            jarvisMap.flyTo(bounds.getCenter(), clusterZoom, {
                animate: !reduceMotionQuery.matches,
                duration: reduceMotionQuery.matches ? 0 : .9
            });
        } else {
            jarvisMap.flyToBounds(bounds, {
                padding: clusterStops ? (isMobile ? [54, 54] : [92, 92]) : (isMobile ? [32, 32] : [60, 60]),
                maxZoom: clusterStops ? clusterZoom : 12,
                animate: !reduceMotionQuery.matches,
                duration: reduceMotionQuery.matches ? 0 : .9
            });
        }
    }
}

function switchJarvisDay(idx) {
    jarvisActiveDay = idx;
    document.querySelectorAll('.j-tab').forEach((tab, i) => {
        const active = i === idx;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
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
            return `<button class="j-tab${critClass}" type="button" role="tab" aria-selected="false" tabindex="-1" data-idx="${i}">${tabLabel}</button>`;
        }).join('');
        tabs.querySelectorAll('.j-tab').forEach((t) => {
            t.addEventListener('click', () => switchJarvisDay(+t.dataset.idx));
            t.addEventListener('keydown', (event) => {
                if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                let next = +t.dataset.idx;
                if (event.key === 'ArrowRight') next = Math.min(next + 1, jarvisData.length - 1);
                if (event.key === 'ArrowLeft') next = Math.max(next - 1, 0);
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = jarvisData.length - 1;
                switchJarvisDay(next);
                tabs.querySelector(`[data-idx="${next}"]`)?.focus();
            });
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

    if (!jarvisMap && window.L) {
        jarvisMap = L.map('jarvisMap', {
            zoomControl: !smallScreenQuery.matches,
            scrollWheelZoom: false,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: false,
            tap: true,
            attributionControl: true
        });
        addBaseMap(jarvisMap, 'street');
        L.polyline(routeLine.slice(0, returnRouteStartIndex + 1), { color: '#0f766e', weight: 3, opacity: .82, lineJoin: 'round' }).addTo(jarvisMap);
        L.polyline(routeLine.slice(returnRouteStartIndex), { color: '#475569', weight: 2, opacity: .5, dashArray: '6 8' }).addTo(jarvisMap);
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
    } else if (!window.L) {
        document.getElementById('jarvisMap').innerHTML = '<p class="j-map-fallback">Mapa no disponible sin conexión.</p>';
    }
    if (jarvisMap) setTimeout(() => jarvisMap.invalidateSize(), 60);
}

const jarvisOverlay = document.getElementById('jarvisOverlay');
const jarvisPanel = jarvisOverlay?.querySelector('.j-panel');

function setPageInert(inert) {
    document.querySelectorAll('.site-header, main, .site-footer').forEach((element) => {
        element.inert = inert;
    });
}

function openJarvis(event) {
    if (!jarvisOverlay || !jarvisPanel) return;
    lastJarvisTrigger = event?.currentTarget || document.activeElement;
    jarvisOverlay.classList.add('active');
    jarvisOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setPageInert(true);
    buildJarvisUI();
    switchJarvisDay(jarvisActiveDay);
    requestAnimationFrame(() => jarvisPanel.focus());
}

function closeJarvis() {
    if (!jarvisOverlay) return;
    jarvisOverlay.classList.remove('active');
    jarvisOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setPageInert(false);
    if (jarvisTipTimer) {
        clearInterval(jarvisTipTimer);
        jarvisTipTimer = null;
    }
    if (lastJarvisTrigger instanceof HTMLElement) lastJarvisTrigger.focus();
}

document.querySelectorAll('[data-jarvis-open]').forEach((button) => {
    button.addEventListener('click', openJarvis);
});
document.getElementById('jarvisClose')?.addEventListener('click', closeJarvis);

document.addEventListener('keydown', (e) => {
    if (!jarvisOverlay?.classList.contains('active')) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        closeJarvis();
    }
    if (e.key !== 'Tab' || !jarvisPanel) return;

    const focusable = [...jarvisPanel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => !element.closest('[aria-hidden="true"]'));
    if (!focusable.length) {
        e.preventDefault();
        jarvisPanel.focus();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
});
