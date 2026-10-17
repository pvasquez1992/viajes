// Photo-postcard covers for the original BookTrip trips.
// New destinations deliberately use a designed fallback instead of showing a wrong city.
const commons = file => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file) + '?width=960';
const page = file => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file).replace(/%20/g, '_');
export const tripCovers = Object.freeze({
  'harpersferry2026/': {
    src: commons('Harpers Ferry & Potomac River Overlook - HDR (21647594852).jpg'),
    alt: 'Vista de Harpers Ferry y el río Potomac desde Maryland Heights',
    credit: 'Nicolas Raymond', license: 'CC BY 3.0',
    source: page('Harpers Ferry & Potomac River Overlook - HDR (21647594852).jpg'),
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/'
  },
  'nyc2026/': {
    src: commons('Empire State Building at Sunset, New York.jpg'),
    alt: 'Manhattan y el Empire State Building al atardecer',
    credit: 'S J Pinkney', license: 'CC BY 2.0',
    source: page('Empire State Building at Sunset, New York.jpg'),
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/'
  },
  'elsalvador2026/': {
    src: commons('CATEDRAL DE SANTA ANA, EL SALVADOR.JPG'),
    alt: 'Catedral de Santa Ana, El Salvador',
    credit: 'Lacalderonjr', license: 'CC BY-SA 3.0',
    source: page('CATEDRAL DE SANTA ANA, EL SALVADOR.JPG'),
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
  },
  'shenandoah2026/': {
    src: commons('Sunset - Moormans River Overlook (1a00cb34-155d-451f-67fa-ebbbd1773fb9).jpg'),
    alt: 'Atardecer sobre las montañas de Shenandoah National Park',
    credit: 'National Park Service', license: 'Dominio público (EE. UU.)',
    source: page('Sunset - Moormans River Overlook (1a00cb34-155d-451f-67fa-ebbbd1773fb9).jpg')
  },
  'iceland2026/': {
    src: '/iceland2026/img/hero-aurora.jpg',
    alt: 'Aurora boreal sobre el paisaje de Islandia'
  },
  'irlanda2026/': {
    src: '/irlanda2026/img/Irlanda/1592795968644459.jpg',
    alt: 'Fotografía del viaje a Irlanda'
  },
  'suiza2025/': {
    src: commons('Matterhorn-EastAndNorthside-viewedFromZermatt landscapeformat.jpg'),
    alt: 'El Matterhorn visto desde Zermatt, Suiza',
    credit: 'Marcel Wiesweg', license: 'CC BY-SA 3.0',
    source: page('Matterhorn-EastAndNorthside-viewedFromZermatt landscapeformat.jpg'),
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
  },
  'italia2025/': {
    src: commons('Colosseum Rome at evening.JPG'),
    alt: 'El Coliseo de Roma iluminado al anochecer',
    credit: 'JuventusTorin', license: 'CC BY-SA 4.0',
    source: page('Colosseum Rome at evening.JPG'),
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
  }
});
export function getTripCover(trip) {
  return tripCovers[trip?.href] || null;
}
