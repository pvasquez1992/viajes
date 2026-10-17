import test from 'node:test';
import assert from 'node:assert/strict';
import { getTripCountdown, parseTripDate } from '../js/trip-countdown.js';

const trip = (start, end = start) => ({ start, end });

test('distant trips show calendar months, not hundreds of days', () => {
  const value = getTripCountdown(trip('2027-04-16'), new Date(2026, 9, 16, 12)).value;
  assert.equal(value, 'Faltan 6 meses');
});

test('travels tomorrow show hours rather than one day', () => {
  const value = getTripCountdown(trip('2026-10-31'), new Date(2026, 9, 30, 12)).value;
  assert.equal(value, 'Faltan 12 horas');
});

test('upcoming 36-hour window remains hours', () => {
  const value = getTripCountdown(trip('2026-10-31'), new Date(2026, 9, 29, 12)).value;
  assert.equal(value, 'Faltan 36 horas');
});

test('middle distances select weeks and days', () => {
  const value = getTripCountdown(trip('2026-11-26'), new Date(2026, 10, 6, 9)).value;
  assert.equal(value, 'Faltan 2 semanas y 6 días');
});

test('minutes never round to 60 alongside the hour', () => {
  const value = getTripCountdown(trip('2026-10-31'), new Date(2026, 9, 30, 22, 0, 1)).value;
  assert.doesNotMatch(value, /y 60 minutos/);
});

test('current and finished trips do not show negative remaining time', () => {
  assert.equal(getTripCountdown(trip('2026-10-31', '2026-11-01'), new Date(2026, 9, 31, 17)).value, '¡Ya comenzó!');
  assert.equal(getTripCountdown(trip('2026-10-10'), new Date(2026, 9, 16, 10)).value, 'Viaje realizado');
});

test('parse rejects malformed or impossible calendar dates', () => {
  assert.equal(parseTripDate('2026-02-30'), null);
  assert.equal(parseTripDate('no-date'), null);
  assert.notEqual(parseTripDate('2028-02-29'), null);
});

test('year-plus trips show years and months', () => {
  const value = getTripCountdown(trip('2028-04-16'), new Date(2026, 9, 16, 12)).value;
  assert.equal(value, 'Faltan 1 año y 6 meses');
});
