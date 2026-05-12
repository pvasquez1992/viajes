const isSmallScreen = window.matchMedia('(max-width: 640px)').matches;

function openDay(anchor) {
    const target = document.getElementById(anchor);
    if (!target) return;
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
    { day: 1, name: 'Dublin Airport — Llegada', coords: [53.4264, -6.2499], anchor: 'day-1' },
    { day: 2, name: 'Drogheda + Belfast', coords: [54.6066, -5.9283], anchor: 'day-2' },
    { day: 3, name: 'Calzada del Gigante', coords: [55.2408, -6.5116], anchor: 'day-3', critical: true },
    { day: 4, name: 'Exploración Dublín', coords: [53.3498, -6.2603], anchor: 'day-4' },
    { day: 5, name: 'Cliffs of Moher', coords: [52.9719, -9.4264], anchor: 'day-5' },
    { day: 6, name: 'Wicklow / Glendalough', coords: [53.0085, -6.3289], anchor: 'day-6' },
    { day: 7, name: 'Festival San Patricio ☘️', coords: [53.3386, -6.2710], anchor: 'day-7' },
];

const routeLine = [
    [53.4264, -6.2499],
    [53.7174, -6.3531],
    [54.6066, -5.9283],
    [55.2408, -6.5116],
    [54.6066, -5.9283],
    [53.3498, -6.2603],
    [52.9719, -9.4264],
    [53.3498, -6.2603],
    [53.0085, -6.3289],
    [53.3498, -6.2603],
    [53.4264, -6.2499],
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

L.polyline(routeLine.slice(0, 6), {
    color: '#6ee7b7',
    weight: 4,
    opacity: .9,
    lineJoin: 'round'
}).addTo(map);

L.polyline(routeLine.slice(5), {
    color: '#a7f3d0',
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
    marker.bindPopup(`<strong>Día ${stop.day}</strong><br>${stop.name}`);
    marker.on('click', () => {
        openDay(stop.anchor);
    });
});

map.fitBounds(L.latLngBounds(routeLine), {
    padding: isSmallScreen ? [18, 18] : [28, 28]
});
