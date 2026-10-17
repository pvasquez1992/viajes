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

test('more than 24 hours remaining uses calendar days, never hours', () => {
  const value = getTripCountdown(trip('2026-10-31'), new Date(2026, 9, 29, 12)).value;
  assert.equal(value, 'Faltan 2 días');
});

test('less than one month always displays days instead of weeks', () => {
  const value = getTripCountdown(trip('2026-11-26'), new Date(2026, 10, 6, 9)).value;
  assert.equal(value, 'Faltan 20 días');
});

test('exactly one calendar month displays months', () => {
  assert.equal(getTripCountdown(trip('2026-11-17'), new Date(2026, 9, 17, 0)).value, 'Faltan 1 mes');
});

test('month boundaries use trip dates, not unspecified departure hours', () => {
  assert.equal(getTripCountdown(trip('2026-11-17'), new Date(2026, 9, 17, 19)).value, 'Faltan 1 mes');
  assert.equal(getTripCountdown(trip('2026-11-17'), new Date(2026, 9, 18, 0)).value, 'Faltan 30 días');
});

test('one week always displays days', () => {
  assert.equal(getTripCountdown(trip('2026-10-24'), new Date(2026, 9, 17, 0)).value, 'Faltan 7 días');
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
