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
