// Human-readable, calendar-aware countdown for every BookTrip card.
// All trip dates are date-only values; use local midnight as the neutral target.
const DAY = 86400000;
const HOUR = 3600000;
const MINUTE = 60000;

export function parseTripDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

const plural = (number, singular, pluralForm) => number + ' ' + (number === 1 ? singular : pluralForm);
const dateOnly = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysBetween = (from, to) => Math.round((
  Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
  Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
) / DAY);

function addCalendarMonths(from, amount) {
  const year = from.getFullYear();
  const month = from.getMonth() + amount;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(from.getDate(), lastDay),
    from.getHours(), from.getMinutes(), from.getSeconds(), from.getMilliseconds());
}

function calendarMonthsUntil(from, target) {
  let months = (target.getFullYear() - from.getFullYear()) * 12 +
    target.getMonth() - from.getMonth();
  while (months > 0 && addCalendarMonths(from, months) > target) months--;
  return Math.max(months, 0);
}

export function getTripCountdown(trip, now = new Date()) {
  const start = parseTripDate(trip?.start);
  const end = parseTripDate(trip?.end);
  if (!start || !end || end < start) {
    return { state: 'unknown', label: 'FECHA PENDIENTE', value: 'Por definir' };
  }
  const today = dateOnly(now);
  if (end < today) {
    return { state: 'finished', label: 'RECUERDOS', value: 'Viaje realizado' };
  }
  if (start <= today) {
    return { state: 'current', label: 'EN MARCHA', value: '¡Ya comenzó!' };
  }
  const timeLeft = start.getTime() - now.getTime();
  if (timeLeft <= 0) {
    return { state: 'current', label: 'EN MARCHA', value: '¡Ya comenzó!' };
  }

  let readable;
  // Less than 24 hours: hours (and minutes when helpful). No premature "one day".
  if (timeLeft < DAY) {
    const totalMinutes = Math.ceil(timeLeft / MINUTE);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours >= 1) {
      readable = plural(hours, 'hora', 'horas') +
        (minutes > 0 ? ' y ' + plural(minutes, 'minuto', 'minutos') : '');
    } else if (timeLeft >= MINUTE) {
      readable = plural(Math.ceil(timeLeft / MINUTE), 'minuto', 'minutos');
    } else {
      readable = 'menos de 1 minuto';
    }
  } else {
    // Trips have dates but no departure times, so "one month" uses calendar dates.
    const months = calendarMonthsUntil(today, start);
    if (months < 1) {
      // Preserve civil days across DST changes instead of dividing milliseconds by 24h.
      readable = plural(daysBetween(today, start), 'día', 'días');
    } else {
      const years = Math.floor(months / 12);
      const extraMonths = months % 12;
      readable = years
        ? plural(years, 'año', 'años') +
          (extraMonths ? ' y ' + plural(extraMonths, 'mes', 'meses') : '')
        : plural(months, 'mes', 'meses');
    }
  }
  return { state: timeLeft < DAY ? 'soon' : 'future', label: 'CUENTA REGRESIVA', value: 'Faltan ' + readable };
}
