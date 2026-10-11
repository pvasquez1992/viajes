// Presentation belongs to the reader. The chat and saved trip schema do not select layouts.
import { validateTrip } from './trip-contract.js';
import { renderTrip } from './trip-view.js';
export const DEFAULT_TRIP_TEMPLATE = 'halloween';
const templates = new Map([
  ['halloween', { load: () => import('../templates/halloween/index.js'), styles: [
    '/templates/halloween/theme.css', '/templates/halloween/tickets.css', '/templates/halloween/moments.css'
  ] }]
]);
const loadedStyles = new Map();
function loadStyle(href) {
  if (!loadedStyles.has(href)) loadedStyles.set(href, new Promise((resolve,reject) => {
    const link = document.createElement('link');link.rel='stylesheet';link.href=href;
    const timer=setTimeout(()=>{link.remove();loadedStyles.delete(href);reject(Error('Stylesheet timed out'));},8000);
    link.onload=()=>{clearTimeout(timer);resolve();};
    link.onerror=()=>{clearTimeout(timer);link.remove();loadedStyles.delete(href);reject(Error('Stylesheet unavailable'));};
    document.head.append(link);
  }));
  return loadedStyles.get(href);
}
export async function presentTrip(container, trip, warnings=[], {template=DEFAULT_TRIP_TEMPLATE,registry=templates,ensureStyle=loadStyle}={}) {
  validateTrip(trip);
  const selected=registry.get(template);
  if(selected) {
    try {
      const renderer=await selected.load();
      await Promise.all((selected.styles||[]).map(ensureStyle));
      if(typeof renderer.render!=='function') throw Error('Renderer unavailable');
      renderer.render(container,trip,warnings);
      container.dataset.template=template;
      return {template,fallback:false};
    } catch {
      // A missing module, broken layout or unavailable CSS cannot prevent reading a saved trip.
    }
  }
  renderTrip(container,trip,warnings);
  container.dataset.template='basic';
  return {template:'basic',fallback:template!=='basic'};
}
