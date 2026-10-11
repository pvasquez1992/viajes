import { legacyTrips } from './trip-library.js';
const trips = structuredClone(legacyTrips);

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


// New entries live privately in Cloudflare; static trips remain in the library.
async function loadNewTrips() {
  try {
    const responses=[await fetch('/api/booktrip/trips',{credentials:'same-origin',cache:'no-store'})];
    const catalogs=await Promise.all(responses.map(async response=>{
      if(!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw Error('Catalog unavailable');
      const body=await response.json();return Array.isArray(body)?body:body.data;
    }));
    const received=new Set();
    for(const catalog of catalogs) {
      if(!Array.isArray(catalog)) throw Error('Invalid catalog');
      for(const trip of catalog) {
        if (!trip || typeof trip.title !== 'string' || typeof trip.description !== 'string' || !(legacyTrips.some(entry=>entry.href===trip.href) || /^trips\/[a-z0-9][a-z0-9-]{2,63}\/$/.test(trip.href)) || !/^20\d{2}-\d{2}-\d{2}$/.test(trip.start) || !/^20\d{2}-\d{2}-\d{2}$/.test(trip.end) || !['city','forest','ice','halloween','christmas','alpine','italy','ireland'].includes(trip.theme) || !Array.isArray(trip.tags) || !trip.tags.every(tag => typeof tag === 'string')) continue;
        received.add(trip.href);
        const index=trips.findIndex(existing=>existing.href===trip.href);
        const entry={...trip,phase:trip.phase || 'planned',featured:trip.featured===true};
        if(index<0) trips.push(entry);else trips[index]=entry;
      }
    }
    for(let index=trips.length-1;index>=0;index--) if(!received.has(trips[index].href)) trips.splice(index,1);
    document.getElementById('catalog-error')?.remove();renderTrips();
  } catch {
    if(document.getElementById('catalog-error')) return;
    const notice=document.createElement('p');notice.id='catalog-error';notice.className='empty-state';
    notice.textContent='No pudimos cargar los viajes nuevos. Vuelve a cargar la página para reintentar.';
    document.querySelector('.library-panel').append(notice);
  }
}
loadNewTrips();
window.addEventListener('booktrip:saved',loadNewTrips);
window.addEventListener('booktrip:removed',loadNewTrips);
