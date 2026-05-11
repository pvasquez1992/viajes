const trips = [
    {
        title: 'Iceland 2026',
        href: 'iceland2026/',
        start: '2026-09-01',
        end: '2026-09-07',
        phase: 'planned',
        description: 'Camper, glaciares, Costa Sur, mapa real y roadbook por día.',
        tags: ['7 días', 'Sep 2026', 'Roadtrip'],
        featured: true
    },
    {
        title: 'Suiza 2025',
        href: 'suiza2025/',
        start: '2025-06-01',
        end: '2025-06-15',
        phase: 'finished',
        description: 'Base lista para sumar trenes, montañas, ciudades y reservas.',
        tags: ['2025', 'Europa', 'Draft']
    },
    {
        title: 'Italia 2025',
        href: 'italia2025/',
        start: '2025-09-01',
        end: '2025-09-15',
        phase: 'finished',
        description: 'Cascarón preparado para itinerario, comidas, hoteles y mapa.',
        tags: ['2025', 'Europa', 'Draft']
    },
    {
        title: 'Irlanda 2026',
        href: 'irlanda2026/',
        start: '2026-04-01',
        end: '2026-04-10',
        phase: 'finished',
        description: 'Listo para una ruta de pueblos, costa, castillos y pubs memorables.',
        tags: ['2026', 'Europa', 'Draft']
    }
];

const today = new Date();
today.setHours(0, 0, 0, 0);

const grid = document.getElementById('tripGrid');
const search = document.getElementById('tripSearch');
const count = document.getElementById('tripCount');
const emptyState = document.getElementById('emptyState');
const filterButtons = document.querySelectorAll('.filter-button');
let activeFilter = 'all';

function getStatus(trip) {
    const phaseLabels = {
        dreaming: 'Soñándolo',
        planned: 'Planificando',
        current: 'Viviéndolo',
        finished: 'Finalizado'
    };
    const startDate = new Date(`${trip.start}T00:00:00`);
    const endDate = new Date(`${trip.end}T00:00:00`);

    if (endDate < today) {
        return { key: 'finished', label: 'Finalizado' };
    }

    if (startDate <= today && today <= endDate) {
        return { key: 'current', label: 'Viviéndolo' };
    }

    const phase = trip.phase || 'dreaming';
    return { key: phase, label: phaseLabels[phase] || phaseLabels.dreaming };
}

function normalize(value) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function renderTrips() {
    const query = normalize(search.value.trim());
    const filtered = trips.filter((trip) => {
        const status = getStatus(trip);
        const haystack = normalize([trip.title, trip.description, ...trip.tags].join(' '));
        const matchesSearch = !query || haystack.includes(query);
        const matchesFilter = activeFilter === 'all' || status.key === activeFilter;
        return matchesSearch && matchesFilter;
    });

    grid.innerHTML = filtered.map((trip) => {
        const status = getStatus(trip);
        const classes = ['trip-card', status.key, trip.featured ? 'active' : ''].filter(Boolean).join(' ');
        const tags = trip.tags.map((tag) => `<span>${tag}</span>`).join('');

        return `
            <a class="${classes}" href="${trip.href}">
                <span class="trip-status">${status.label}</span>
                <h3>${trip.title}</h3>
                <p>${trip.description}</p>
                <div class="trip-meta">${tags}</div>
            </a>
        `;
    }).join('');

    count.textContent = `${filtered.length} ${filtered.length === 1 ? 'viaje' : 'viajes'}`;
    emptyState.hidden = filtered.length > 0;
}

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        filterButtons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        activeFilter = button.dataset.filter;
        renderTrips();
    });
});

search.addEventListener('input', renderTrips);
renderTrips();
