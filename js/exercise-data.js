export const sportNames = {
  running: 'Carrera', treadmill_running: 'Caminadora', elliptical: 'Elíptica',
  walking: 'Caminata', cycling: 'Ciclismo', hiking: 'Senderismo',
  indoor_cycling: 'Ciclismo indoor', lap_swimming: 'Natación',
};
export const sportColors = {
  running: '#77d8ff', treadmill_running: '#a1a7ff', elliptical: '#d6a9ff',
  walking: '#8ef2c4', cycling: '#ffd166', hiking: '#b3d985',
  indoor_cycling: '#ffad83', lap_swimming: '#75e2dd',
};
export const sportName = value => sportNames[value] || value.replaceAll('_', ' ');
export const colorFor = value => sportColors[value] || '#b9cadf';
export const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const number = (value, digits = 0) => Number.isFinite(value)
  ? new Intl.NumberFormat('es', { maximumFractionDigits: digits }).format(value) : '—';
export const dateLabel = value => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
  .format(new Date(`${value}T12:00:00`));

export function duration(seconds, compact = false) {
  if (!Number.isFinite(seconds)) return '—';
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  if (compact) return hours ? `${number(hours)} h ${minutes} min` : `${minutes} min`;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function pace(activity) {
  if (!(activity.averageSpeedMps > 0)) return '—';
  if (activity.sport.includes('cycling')) return `${number(activity.averageSpeedMps * 3.6, 1)} km/h`;
  const seconds = Math.round(1000 / activity.averageSpeedMps / (activity.sport === 'lap_swimming' ? 10 : 1));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /${activity.sport === 'lap_swimming' ? '100 m' : 'km'}`;
}

export function filterActivities(activities, { search = '', sport = '', from = '', to = '' } = {}) {
  const query = normalize(search.trim());
  return activities.filter(a => (!sport || a.sport === sport) && (!from || a.localDate >= from) && (!to || a.localDate <= to)
    && (!query || normalize(`${a.name} ${sportName(a.sport)}`).includes(query)));
}

export function summarize(activities) {
  const sum = key => activities.reduce((total, a) => total + (Number.isFinite(a[key]) ? a[key] : 0), 0);
  const elevationCount = activities.filter(a => Number.isFinite(a.elevationGainMeters)).length;
  return { count: activities.length, distance: sum('distanceMeters'), seconds: sum('durationSeconds'),
    elevation: activities.length && !elevationCount ? null : sum('elevationGainMeters') };
}

export function monthlyDistances(activities) {
  if (!activities.length) return [];
  const sums = new Map();
  for (const a of activities) {
    const month = a.localDate.slice(0, 7);
    sums.set(month, (sums.get(month) || 0) + a.distanceMeters / 1000);
  }
  const keys = [...sums.keys()].sort();
  const current = new Date(`${keys[0]}-01T12:00:00Z`);
  const last = keys.at(-1);
  const result = [];
  while (current.toISOString().slice(0, 7) <= last) {
    const month = current.toISOString().slice(0, 7);
    result.push({ month, distance: sums.get(month) || 0 });
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return result;
}

export async function loadActivities(fetcher = fetch, { signal } = {}) {
  const activities = [];
  let offset = 0;
  do {
    const response = await fetcher(`/api/ejercicio/activities?limit=100&offset=${offset}`, {
      credentials: 'same-origin', headers: { Accept: 'application/json' }, signal,
    });
    if (response.redirected || !response.headers.get('Content-Type')?.includes('application/json')) {
      throw Object.assign(new Error('Tu sesión ha terminado. Vuelve a iniciar sesión.'), { status: 401 });
    }
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.error?.message || 'No pudimos consultar las actividades.'), { status: response.status });
    if (!Array.isArray(body.data) || !body.pagination || !Number.isInteger(body.pagination.total)) {
      throw new Error('La respuesta de actividades no tiene el formato esperado.');
    }
    for (const a of body.data) {
      if (typeof a.id !== 'string' || typeof a.name !== 'string' || typeof a.sport !== 'string' || typeof a.startedAt !== 'string' || !Number.isFinite(Date.parse(a.startedAt))
        || !/^\d{4}-\d{2}-\d{2}$/.test(a.localDate) || !Number.isFinite(a.distanceMeters) || !Number.isFinite(a.durationSeconds)) {
        throw new Error('Una actividad no tiene el formato esperado.');
      }
    }
    activities.push(...body.data);
    const next = body.pagination.nextOffset;
    if (next === null) break;
    if (!Number.isInteger(next) || next <= offset || !body.data.length || next > 100000) {
      throw new Error('No pudimos completar la lista de actividades.');
    }
    offset = next;
  } while (true);
  const unique = [...new Map(activities.map(a => [a.id, a])).values()];
  return unique.sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id));
}

export function syncCaption(status, now = Date.now()) {
  if (!status || !['not_configured', 'ok', 'failed', 'reauth_required'].includes(status.state)) {
    return { tone: 'warning', text: 'No pudimos comprobar la última sincronización.' };
  }
  const last = Date.parse(status.lastSuccessAt);
  const suffix = Number.isFinite(last) ? ` Última actualización: ${new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(last)}.` : '';
  if (status.state === 'reauth_required') return { tone: 'warning', text: `Hay que volver a conectar la cuenta de Garmin.${suffix}` };
  if (status.state === 'failed') return { tone: 'warning', text: `La última sincronización falló. Se volverá a intentar.${suffix}` };
  if (status.state === 'not_configured' || !Number.isFinite(last)) return { tone: 'warning', text: 'La sincronización automática aún no ha completado su primera actualización.' };
  if (now - last > 2 * 60 * 60 * 1000) return { tone: 'warning', text: `La sincronización lleva más de dos horas sin actualizarse.${suffix}` };
  return { tone: 'ok', text: `Sincronización automática.${suffix} Se comprueban nuevas actividades aproximadamente cada 30 minutos.` };
}

export async function loadSyncStatus(fetcher = fetch, { signal } = {}) {
  const response = await fetcher('/api/ejercicio/sync-status', {
    credentials: 'same-origin', headers: { Accept: 'application/json' }, signal,
  });
  if (!response.ok || response.redirected || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('No se pudo comprobar la sincronización.');
  }
  return (await response.json()).data;
}

export function activityLocations(activity) {
  const locations = [];
  for (const [field, kind] of [['startPosition', 'start'], ['endPosition', 'end']]) {
    const point = activity[field];
    if (point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180) {
      locations.push({ kind, latitude: point.latitude, longitude: point.longitude });
    }
  }
  if (locations.length === 2 && locations[0].latitude === locations[1].latitude && locations[0].longitude === locations[1].longitude) {
    return [{ ...locations[0], kind: 'both' }];
  }
  return locations;
}
