import { activityLocations, dateLabel, sportName } from './exercise-data.js';

export class ActivityMap {
  constructor(container, status, { onSelect } = {}) {
    this.container = container;
    this.status = status;
    this.onSelect = onSelect;
    this.map = null;
    this.markers = null;
    this.renderVersion = 0;
  }

  render(activities) {
    const version = ++this.renderVersion;
    const located = activities.map((activity, index) => ({ activity, index, points: activityLocations(activity) }))
      .filter(item => item.points.length);
    this.markers?.clearLayers();
    this.container.hidden = !located.length;
    this.status.textContent = located.length
      ? `${located.length} de ${activities.length} actividades con ubicación.`
      : 'Estas actividades no tienen coordenadas registradas.';
    if (!located.length) return;
    if (!window.L) {
      this.container.hidden = true;
      this.status.textContent = 'No pudimos cargar el mapa. Actualiza la página para volver a intentar.';
      return;
    }
    const L = window.L;
    if (!this.map) {
      this.map = L.map(this.container, { scrollWheelZoom: false, zoomControl: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.map).on('tileerror', () => {
        this.status.textContent = 'No pudimos cargar el fondo del mapa. Los puntos de tus actividades siguen disponibles.';
      });
      this.map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(this.map);
      this.markers = L.featureGroup().addTo(this.map);
    }
    const bounds = [];
    for (const { activity, index, points } of located) {
      for (const point of points) {
        const label = point.kind === 'start' ? 'Inicio' : point.kind === 'end' ? 'Llegada' : 'Inicio y llegada';
        const iconElement = document.createElement('span');
        iconElement.className = `activity-map-pin ${point.kind === 'end' ? 'pin-end' : 'pin-start'}`;
        iconElement.textContent = point.kind === 'end' ? '' : String(index + 1);
        const icon = L.divIcon({ className: 'activity-map-icon', html: iconElement,
          iconSize: point.kind === 'end' ? [14, 14] : [30, 30],
          iconAnchor: point.kind === 'end' ? [7, 7] : [15, 15] });
        const popup = document.createElement('div'); popup.className = 'activity-map-popup';
        const heading = document.createElement('strong'); heading.textContent = activity.name;
        const detail = document.createElement('p'); detail.textContent = `${label} · ${sportName(activity.sport)} · ${dateLabel(activity.localDate)}`;
        popup.append(heading, detail);
        if (this.onSelect) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Ver actividad';
          button.addEventListener('click', () => this.onSelect(activity)); popup.append(button);
        }
        const coordinates = [point.latitude, point.longitude]; bounds.push(coordinates);
        L.marker(coordinates, { icon, title: `${index + 1}. ${label}: ${activity.name}`, alt: `${label}: ${activity.name}`,
          zIndexOffset: point.kind === 'end' ? 0 : 1000 }).bindPopup(popup).addTo(this.markers);
      }
    }
    requestAnimationFrame(() => {
      if (version !== this.renderVersion || this.container.hidden || !this.container.isConnected) return;
      this.map.invalidateSize();
      this.map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15, animate: false });
    });
  }
}
