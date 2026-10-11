
const trips = [
    {
        title: 'Halloween Harpers Ferry 2026 🎃',
        theme: 'halloween',
        href: 'harpersferry2026/',
        start: '2026-10-31',
        end: '2026-11-01',
        phase: 'planned',
        description: 'Una noche de Halloween: hotel y Hertz confirmados, pueblo histórico, trick-or-treat en Bolivar y ghost tour opcional.',
        tags: ['31 oct–1 nov', 'Halloween', 'West Virginia']
    },
    {
        title: 'Shenandoah National Park 2026',
        theme: 'forest',
        href: 'shenandoah2026/',
        start: '2026-10-10',
        end: '2026-10-10',
        phase: 'planned',
        description: 'Unos 5–6 km caminando: Limberlost, Story of the Forest, almuerzo en Skyland y Big Meadows.',
        tags: ['10 oct 2026', '5–6 km', 'Senderismo']
    },
    {
        title: 'Navidad Familiar El Salvador 2026',
        theme: 'christmas',
        href: 'elsalvador2026/',
        start: '2026-12-18',
        end: '2027-01-03',
        phase: 'planned',
        description: 'Ocho familiares, Santa Ana, Soyapango, Casa Itzé en Río Chiquito y El Pital como propuesta.',
        tags: ['18 dic–3 ene', 'Chalatenango', 'Familia']
    },
    {
        title: 'Iceland 2026',
        theme: 'ice',
        href: 'iceland2026/',
        start: '2026-08-31',
        end: '2026-09-07',
        phase: 'planned',
        description: 'Vuelo, camper, descanso primero, Reykjadalur, S1, Zodiac, Vestrahorn y Viking Set.',
        tags: ['31 ago-7 sept', 'S1 + Zodiac', 'Roadtrip'],
        featured: true
    },
    {
        title: 'NYC Thanksgiving 2026',
        theme: 'city',
        href: 'nyc2026/',
        start: '2026-11-26',
        end: '2026-11-27',
        phase: 'planned',
        description: 'Macy’s Parade 100, Katz’s, Roosevelt Island de noche, 10K y Central Park.',
        tags: ['26-27 nov', 'Thanksgiving', 'NYC']
    },
    {
        title: 'Suiza 2025',
        theme: 'alpine',
        href: 'suiza2025/',
        start: '2025-06-01',
        end: '2025-06-15',
        phase: 'finished',
        description: 'Base lista para sumar trenes, montañas, ciudades y reservas.',
        tags: ['2025', 'Europa', 'Draft']
    },
    {
        title: 'Italia 2025',
        theme: 'italy',
        href: 'italia2025/',
        start: '2025-09-01',
        end: '2025-09-15',
        phase: 'finished',
        description: 'Cascarón preparado para itinerario, comidas, hoteles y mapa.',
        tags: ['2025', 'Europa', 'Draft']
    },
    {
        title: 'Irlanda 2026',
        theme: 'ireland',
        href: 'irlanda2026/',
        start: '2026-03-11',
        end: '2026-03-18',
        phase: 'finished',
        description: 'Belfast, Calzada del Gigante, Cliffs of Moher y el Día de San Patricio en Dublín.',
        tags: ['8 días', 'Mar 2026', 'Belfast · Dublín']
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

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function renderTrips() {
    const query = normalize(search.value.trim());
    const filtered = trips.filter((trip) => {
        const status = getStatus(trip);
        const haystack = normalize([trip.title, trip.description, ...trip.tags].join(' '));
        const matchesSearch = !query || haystack.includes(query);
        const matchesFilter = activeFilter === 'all' || status.key === activeFilter;
        return matchesSearch && matchesFilter;
    }).sort((a, b) => {
        const rank = {current: 0, planned: 1, dreaming: 2, finished: 3};
        const diff = rank[getStatus(a).key] - rank[getStatus(b).key];
        return diff || (getStatus(a).key === "finished"
            ? b.start.localeCompare(a.start)
            : a.start.localeCompare(b.start));
    });

    grid.innerHTML = filtered.map((trip) => {
        const status = getStatus(trip);
        const classes = ['trip-card', status.key, trip.theme ? `theme-${trip.theme}` : '', trip.featured ? 'active' : ''].filter(Boolean).join(' ');
        const tags = trip.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');

        return `
            <a class="${classes}" href="${escapeHtml(trip.href)}">
                <span class="trip-status">${status.label}</span>
                <h3>${escapeHtml(trip.title)}</h3>
                <p>${escapeHtml(trip.description)}</p>
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


// New trips are generated from reviewed JSON; existing destination pages remain intact.
fetch('/trips/catalog.json', { credentials: 'same-origin' }).then(response => {
    if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw Error('Catalog unavailable');
    return response.json();
}).then(catalog => {
    if (!Array.isArray(catalog)) return;
    for (const trip of catalog) {
        if (!trip || typeof trip.title !== 'string' || typeof trip.description !== 'string' || !/^trips\/[a-z0-9][a-z0-9-]{2,63}\/$/.test(trip.href) || !/^20\d{2}-\d{2}-\d{2}$/.test(trip.start) || !/^20\d{2}-\d{2}-\d{2}$/.test(trip.end) || !['city','forest','ice','halloween','christmas','alpine','italy','ireland'].includes(trip.theme) || !Array.isArray(trip.tags) || !trip.tags.every(tag => typeof tag === 'string')) continue;
        if (!trips.some(existing => existing.href === trip.href)) trips.push({ ...trip, phase: 'planned', featured: false });
    }
    renderTrips();
}).catch(() => {
    const notice = document.createElement('p'); notice.className = 'empty-state';
    notice.textContent = 'No pudimos cargar los viajes nuevos. Los anteriores siguen disponibles; vuelve a cargar la página para reintentar.';
    document.querySelector('.library-panel').append(notice);
});
