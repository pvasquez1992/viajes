export const THEMES = ['city', 'forest', 'ice', 'halloween', 'christmas', 'alpine', 'italy', 'ireland'];
export const PERIODS = ['morning', 'afternoon', 'evening'];
const text = (max = 500) => ({ type: 'string', maxLength: max });
const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
export const tripSchema = {
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'id', 'title', 'destination', 'startDate', 'endDate', 'timezone', 'description', 'theme', 'reservations', 'days'],
  properties: {
    schemaVersion: { type: 'integer', const: 1 }, id: text(64), title: text(120), destination: text(120),
    startDate: text(10), endDate: text(10), timezone: text(80), description: text(1200), theme: { type: 'string', enum: THEMES },
    notes: text(12000),
    reservations: { type: 'array', maxItems: 12, items: {
      type: 'object', additionalProperties: false,
      required: ['type', 'provider', 'startDate', 'startTime', 'endDate', 'endTime', 'notes', 'status'],
      properties: { type: { type: 'string', enum: ['hotel', 'car', 'flight', 'other'] }, provider: text(120), startDate: text(10), startTime: nullable(text(5)), endDate: text(10), endTime: nullable(text(5)), notes: text(800), status: { type: 'string', enum: ['proposed', 'user-provided'] } },
    } },
    days: { type: 'array', minItems: 1, maxItems: 31, items: {
      type: 'object', additionalProperties: false, required: ['date', 'title', 'activities'],
      properties: { date: text(10), title: text(120), activities: { type: 'array', minItems: 0, maxItems: 32, items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'time', 'durationMinutes', 'period', 'title', 'description', 'location', 'kind', 'sourceUrls'],
        properties: { id: text(64), time: nullable(text(5)), durationMinutes: nullable({ type: 'integer', minimum: 5, maximum: 720 }), period: { type: 'string', enum: PERIODS }, title: text(120), description: text(1200), location: nullable(text(200)), kind: { type: 'string', enum: ['walk', 'food', 'visit', 'transport', 'rest'] }, sourceUrls: { type: 'array', maxItems: 3, items: text(1000) } },
      } } },
    } },
  },
};

export class TripError extends Error {
  constructor(message, status = 400, code = 'invalid_request') { super(message); this.status = status; this.code = code; }
}
function check(condition, message) { if (!condition) throw new TripError(message); }
function shape(value, keys, label) {
  check(value && typeof value === 'object' && !Array.isArray(value), `${label}: formato inválido.`);
  check(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), `${label}: campos inválidos.`);
}
function string(value, max, label, empty = false) {
  check(typeof value === 'string' && value.length <= max && (empty || value.trim().length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), `${label}: texto inválido.`);
}
export function isDate(value) {
  return typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function time(value) { return value === null || typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && !/^(localhost|.*\.localhost|.*\.local|[\d.]+|\[.*\])$/.test(url.hostname); } catch { return false; }
}
export function validateTrip(trip) {
  check(JSON.stringify(trip)?.length <= 60000, 'El borrador es demasiado extenso; reduce las descripciones.');
  check(trip && typeof trip==='object' && !Array.isArray(trip) && tripSchema.required.every(key=>Object.hasOwn(trip,key)) && Object.keys(trip).every(key=>Object.hasOwn(tripSchema.properties,key)), 'Viaje: campos inválidos.');
  check(trip.schemaVersion === 1, 'Versión de viaje desconocida.');
  check(typeof trip.id === 'string' && /^[a-z0-9][a-z0-9-]{2,63}$/.test(trip.id), 'Identificador de viaje inválido.');
  for (const [key, max] of [['title',120], ['destination',120], ['timezone',80], ['description',1200]]) string(trip[key], max, key);
  if(Object.hasOwn(trip,'notes'))string(trip.notes,12000,'Notas',true);
  check(THEMES.includes(trip.theme), 'Tema de viaje inválido.');
  try { new Intl.DateTimeFormat('es', { timeZone: trip.timezone }); } catch { throw new TripError('Zona horaria inválida.'); }
  check(isDate(trip.startDate) && isDate(trip.endDate) && trip.endDate >= trip.startDate, 'Revisa las fechas del viaje.');
  const length = (Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000 + 1;
  check(length <= 31, 'El libro admite viajes de hasta 31 días.');
  check(Array.isArray(trip.days) && trip.days.length === length, 'El itinerario debe cubrir todos los días del viaje.');
  const ids = new Set(); const warnings = [];
  trip.days.forEach((day, index) => {
    shape(day, ['date','title','activities'], 'Día'); string(day.title, 120, 'Título del día');
    check(day.date === new Date(Date.parse(trip.startDate) + index * 86400000).toISOString().slice(0,10), 'Los días deben estar ordenados y dentro del viaje.');
    check(Array.isArray(day.activities) && day.activities.length <= 32, 'Cada día admite hasta 32 actividades.');
    let previousEnd = -1;
    for (const activity of day.activities) {
      shape(activity, ['id','time','durationMinutes','period','title','description','location','kind','sourceUrls'], 'Actividad');
      check(typeof activity.id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(activity.id) && !ids.has(activity.id), 'Identificador de actividad inválido o repetido.'); ids.add(activity.id);
      check(time(activity.time), 'Hora de actividad inválida.');
      check(activity.durationMinutes===null || Number.isInteger(activity.durationMinutes) && activity.durationMinutes >= 5 && activity.durationMinutes <= 720, 'Duración de actividad inválida.');
      check(PERIODS.includes(activity.period) && ['walk','food','visit','transport','rest'].includes(activity.kind), 'Tipo de actividad inválido.');
      string(activity.title,120,'Actividad'); string(activity.description,1200,'Descripción',true);
      if (activity.location !== null) string(activity.location,200,'Ubicación');
      check(Array.isArray(activity.sourceUrls) && activity.sourceUrls.length <= 3 && activity.sourceUrls.every(url => typeof url === 'string' && url.length <= 1000 && safeUrl(url)), 'Enlace de fuente inválido.');
      if (activity.time) {
        const minutes = Number(activity.time.slice(0,2)) * 60 + Number(activity.time.slice(3));
        check(minutes >= previousEnd, `Hay actividades solapadas o desordenadas el ${day.date}.`);
        check(minutes + (activity.durationMinutes || 0) <= 1440, 'Una actividad cruza la medianoche; sepárala en dos días.');
        const period = minutes < 12*60 ? 'morning' : minutes < 18*60 ? 'afternoon' : 'evening';
        check(activity.period === period, 'El momento del día no coincide con la hora.');
        previousEnd = minutes + (activity.durationMinutes || 0);
      } else warnings.push(`Hora pendiente: ${activity.title}.`);
    }
  });
  check(Array.isArray(trip.reservations) && trip.reservations.length <= 12, 'Reservas inválidas.');
  for (const reservation of trip.reservations) {
    shape(reservation, ['type','provider','startDate','startTime','endDate','endTime','notes','status'], 'Reserva');
    check(['hotel','car','flight','other'].includes(reservation.type) && ['proposed','user-provided'].includes(reservation.status), 'Tipo o estado de reserva inválido.');
    string(reservation.provider,120,'Proveedor'); string(reservation.notes,800,'Notas',true);
    check(isDate(reservation.startDate) && isDate(reservation.endDate) && reservation.startDate >= trip.startDate && reservation.endDate <= trip.endDate && reservation.endDate >= reservation.startDate && time(reservation.startTime) && time(reservation.endTime), 'Revisa las fechas y horas de la reserva.');
    check(reservation.startDate !== reservation.endDate || !reservation.startTime || !reservation.endTime || reservation.endTime >= reservation.startTime, 'La reserva termina antes de empezar.');
  }
  return { trip: structuredClone(trip), warnings: [...new Set(warnings)] };
}
export function catalogEntry(trip) {
  validateTrip(trip);
  return { title: trip.title, href: `trips/${trip.id}/`, start: trip.startDate, end: trip.endDate, phase: 'planned', theme: trip.theme, description: trip.description, tags: [trip.destination, `${trip.days.length} días`] };
}
export function mapSearch(location, destination = '') {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([location, destination].filter(Boolean).join(', '))}`;
}
