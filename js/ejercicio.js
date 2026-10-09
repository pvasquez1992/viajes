import { sportName, colorFor, number, dateLabel, duration, pace, filterActivities, summarize, monthlyDistances, loadActivities, loadSyncStatus, syncCaption } from './exercise-data.js';
import { ActivityMap } from './exercise-map.js';

const $ = id => document.getElementById(id);
let activities = [], filtered = [], page = 0, controller;
const pageSize = 10;
const overviewMap = new ActivityMap($('activitiesMap'), $('mapStatus'), { onSelect: showDetail });
const detailMap = new ActivityMap($('detailMap'), $('detailMapStatus'));
const text = (id, value) => { $(id).textContent = value; };
function node(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}

async function load() {
  controller?.abort();
  const current = controller = new AbortController();
  $('loadingState').hidden = false;
  $('errorState').hidden = true;
  $('refreshButton').disabled = true;
  loadSyncStatus(fetch, { signal: current.signal }).then(status => {
    if (current !== controller) return;
    const caption = syncCaption(status);
    text('syncStatus', caption.text);
    $('syncStatus').dataset.tone = caption.tone;
  }).catch(error => {
    if (current !== controller || error.name === 'AbortError') return;
    const caption = syncCaption(null);
    text('syncStatus', caption.text);
    $('syncStatus').dataset.tone = caption.tone;
  });
  try {
    const result = await loadActivities(fetch, { signal: current.signal });
    if (current !== controller) return;
    activities = result;
    const selected = $('sportFilter').value;
    $('sportFilter').replaceChildren(new Option('Todos los deportes', ''));
    [...new Set(activities.map(a => a.sport))].sort((a, b) => sportName(a).localeCompare(sportName(b), 'es'))
      .forEach(sport => $('sportFilter').add(new Option(sportName(sport), sport)));
    $('sportFilter').value = selected;
    const dates = activities.map(a => a.localDate).sort();
    text('historyRange', activities.length ? `${number(activities.length)} actividades · ${dateLabel(dates[0])} — ${dateLabel(dates.at(-1))}` : 'Tu historial aún no tiene actividades.');
    $('dashboard').hidden = false;
    applyFilters();
  } catch (error) {
    if (current !== controller || error.name === 'AbortError') return;
    $('dashboard').hidden = true;
    $('errorState').hidden = false;
    text('errorTitle', error.status === 401 ? 'Vuelve a iniciar sesión' : 'No pudimos cargar las actividades');
    text('errorMessage', error.message || 'Comprueba tu conexión e inténtalo de nuevo.');
    $('loginLink').hidden = error.status !== 401;
    // A full navigation lets Access renew the session and return here.
    $('loginLink').href = location.pathname;
  } finally {
    if (current === controller) {
      $('loadingState').hidden = true;
      $('refreshButton').disabled = false;
    }
  }
}

function applyFilters() {
  const from = $('dateFrom').value, to = $('dateTo').value;
  $('filterError').hidden = !(from && to && from > to);
  if (!$('filterError').hidden) return;
  filtered = filterActivities(activities, { search: $('activitySearch').value, sport: $('sportFilter').value, from, to });
  page = 0;
  const summary = summarize(filtered);
  text('activityTotal', number(summary.count));
  text('distanceTotal', number(summary.distance / 1000, 1));
  text('durationTotal', duration(summary.seconds, true));
  text('elevationTotal', number(summary.elevation));
  renderChart();
  renderSports();
  renderList();
}

function renderChart() {
  const months = monthlyDistances(filtered), chart = $('distanceChart');
  chart.replaceChildren();
  if (!months.length) { chart.append(node('p', 'empty-state', 'Sin recorrido en este periodo.')); return; }
  const maximum = Math.max(1, ...months.map(m => m.distance));
  const bars = node('div', 'chart-bars');
  for (const month of months) {
    const date = new Date(`${month.month}-01T12:00:00`);
    const label = new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' }).format(date);
    const item = node('div', 'chart-month');
    const bar = node('div', 'chart-bar');
    bar.style.height = `${Math.max(1, month.distance / maximum * 100)}%`;
    bar.title = `${label}: ${number(month.distance, 1)} km`;
    item.setAttribute('aria-label', bar.title);
    const track = node('div', 'chart-track'); track.append(bar);
    item.append(track, node('span', 'chart-label', label)); bars.append(item);
  }
  chart.append(bars);
  chart.append(node('p', 'chart-caption', `Máximo mensual: ${number(Math.max(...months.map(m => m.distance)), 1)} km · ${months.length} meses${months.length > 12 ? ' · Desliza para ver todo el periodo' : ''}`));
}

function renderSports() {
  const groups = new Map();
  for (const activity of filtered) {
    const group = groups.get(activity.sport) || { count: 0, distance: 0 };
    group.count++; group.distance += activity.distanceMeters; groups.set(activity.sport, group);
  }
  $('sportsBreakdown').replaceChildren();
  if (!groups.size) { $('sportsBreakdown').append(node('p', 'empty-state', 'Sin deportes en este periodo.')); return; }
  for (const [sport, group] of [...groups].sort((a, b) => b[1].count - a[1].count)) {
    const row = node('div', 'sport-summary'); row.style.setProperty('--sport-color', colorFor(sport));
    const heading = node('div', 'sport-summary-heading');
    heading.append(node('span', '', sportName(sport)), node('span', '', `${number(group.count)} · ${number(group.distance / 1000, 1)} km`));
    const track = node('div', 'sport-track'), fill = node('span');
    fill.style.width = `${group.count / filtered.length * 100}%`; track.append(fill);
    row.append(heading, track); $('sportsBreakdown').append(row);
  }
}

function renderList() {
  const start = page * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const hasFilters = $('activitySearch').value.trim() || $('sportFilter').value || $('dateFrom').value || $('dateTo').value;
  text('activitiesHeading', page === 0 && !hasFilters ? 'Tus 10 últimas actividades' : 'Tus actividades');
  text('filteredCount', `${number(visible.length)} de ${number(filtered.length)}`);
  $('activityList').replaceChildren();
  for (const [index, activity] of visible.entries()) {
    const li = node('li'), button = node('button', 'activity-row'); button.type = 'button';
    button.setAttribute('aria-label', `Ver ${activity.name}, ${dateLabel(activity.localDate)}`);
    const identity = node('span', 'activity-identity'), tag = node('span', 'sport-tag', sportName(activity.sport));
    tag.style.setProperty('--sport-color', colorFor(activity.sport));
    identity.append(tag, node('strong', 'activity-name', `${index + 1}. ${activity.name}`), node('span', 'activity-date', dateLabel(activity.localDate)));
    button.append(identity);
    for (const [label, value] of [['Distancia', `${number(activity.distanceMeters / 1000, 2)} km`], ['Duración', duration(activity.durationSeconds)], ['Ritmo / velocidad', pace(activity)], ['Pulso medio', `${number(activity.averageHeartRateBpm)}${Number.isFinite(activity.averageHeartRateBpm) ? ' lpm' : ''}`]]) {
      const cell = node('span', 'activity-value', value); cell.dataset.label = label; button.append(cell);
    }
    button.addEventListener('click', () => showDetail(activity)); li.append(button); $('activityList').append(li);
  }
  $('emptyActivities').hidden = !!filtered.length;
  text('pageInfo', filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} de ${number(filtered.length)}` : '0 actividades');
  $('previousPage').disabled = page === 0;
  $('nextPage').disabled = start + pageSize >= filtered.length;
  overviewMap.render(visible);
}

function showDetail(activity) {
  text('detailTitle', activity.name); text('detailSport', sportName(activity.sport)); text('detailDate', dateLabel(activity.localDate));
  $('detailSport').style.setProperty('--sport-color', colorFor(activity.sport));
  $('detailMetrics').replaceChildren();
  const quantity = (value, unit, digits = 0) => Number.isFinite(value) ? `${number(value, digits)} ${unit}` : '—';
  const metrics = [
    ['Distancia', quantity(activity.distanceMeters / 1000, 'km', 2)], ['Duración', duration(activity.durationSeconds)],
    ['Tiempo en movimiento', duration(activity.movingSeconds)], ['Tiempo transcurrido', duration(activity.elapsedSeconds)],
    ['Ritmo / velocidad', pace(activity)], ['Pulso medio', quantity(activity.averageHeartRateBpm, 'lpm')],
    ['Pulso máximo', quantity(activity.maxHeartRateBpm, 'lpm')], ['Desnivel positivo', quantity(activity.elevationGainMeters, 'm')],
    ['Desnivel negativo', quantity(activity.elevationLossMeters, 'm')], ['Calorías', quantity(activity.caloriesKcal, 'kcal')],
    ['Pasos', number(activity.steps)], ['Potencia media', quantity(activity.averagePowerWatts, 'W')],
    ['Efecto aeróbico', number(activity.aerobicTrainingEffect, 1)], ['Carga de entrenamiento', number(activity.trainingLoad, 1)],
  ];
  for (const [label, value] of metrics) {
    const card = node('div', 'detail-metric'); card.append(node('span', '', label), node('strong', '', value)); $('detailMetrics').append(card);
  }
  $('activityDialog').showModal();
  detailMap.render([activity]);
}

$('filterForm').addEventListener('submit', event => event.preventDefault());
$('filterForm').addEventListener('input', applyFilters);
$('resetFilters').addEventListener('click', () => { $('filterForm').reset(); applyFilters(); });
$('previousPage').addEventListener('click', () => { if (page > 0) { page--; renderList(); } });
$('nextPage').addEventListener('click', () => { if ((page + 1) * pageSize < filtered.length) { page++; renderList(); } });
$('closeDetail').addEventListener('click', () => $('activityDialog').close());
$('activityDialog').addEventListener('click', event => { if (event.target === $('activityDialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
$('refreshButton').addEventListener('click', load);
$('retryButton').addEventListener('click', load);
load();
