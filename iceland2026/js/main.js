const smallScreenQuery = window.matchMedia('(max-width: 640px)');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isSmallScreen = smallScreenQuery.matches;

function openDay(anchor) {
    const target = document.getElementById(anchor);
    if (!target) {
        return;
    }
    if (target.tagName.toLowerCase() === 'details') {
        target.open = true;
    }
    target.scrollIntoView({
        behavior: reduceMotionQuery.matches ? 'auto' : 'smooth',
        block: 'start'
    });
}

document.querySelectorAll('.timeline-day').forEach((day) => {
    day.addEventListener('toggle', () => {
        if (day.open) {
            day.classList.add('is-open');
        } else {
            day.classList.remove('is-open');
        }
    });
});

const scrollProgress = document.getElementById('scrollProgress');
function updateScrollProgress() {
    if (!scrollProgress) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    scrollProgress.style.width = `${progress}%`;
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress);
updateScrollProgress();

const dayLinks = [...document.querySelectorAll('[data-day-target]')];
dayLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        openDay(link.dataset.dayTarget);
        history.replaceState(null, '', `#${link.dataset.dayTarget}`);
    });
});

if ('IntersectionObserver' in window && dayLinks.length) {
    const dayObserver = new IntersectionObserver((entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        dayLinks.forEach((link) => {
            const active = link.dataset.dayTarget === visible.target.id;
            link.classList.toggle('is-active', active);
            if (active) link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    }, { rootMargin: '-24% 0px -62% 0px', threshold: [0, .2, .6] });
    document.querySelectorAll('.timeline-day').forEach((day) => dayObserver.observe(day));
}

const toggleDays = document.getElementById('toggleDays');
if (toggleDays) {
    toggleDays.addEventListener('click', () => {
        const days = [...document.querySelectorAll('.timeline-day')];
        const shouldOpen = days.some((day) => !day.open);
        days.forEach((day) => { day.open = shouldOpen; });
        toggleDays.setAttribute('aria-pressed', String(shouldOpen));
        toggleDays.textContent = shouldOpen ? 'Cerrar todos' : 'Abrir todos';
    });
}

document.querySelectorAll('.card-gallery').forEach((gallery) => {
    const dots = [...gallery.querySelectorAll('.carousel-hint span')];
    const images = [...gallery.querySelectorAll('img')];
    if (!dots.length || !images.length) return;

    const updateGalleryDots = () => {
        const galleryCenter = gallery.scrollLeft + gallery.clientWidth / 2;
        let closestIndex = 0;
        let closestDistance = Infinity;
        images.forEach((image, index) => {
            const imageCenter = image.offsetLeft + image.offsetWidth / 2;
            const distance = Math.abs(imageCenter - galleryCenter);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        dots.forEach((dot, index) => dot.classList.toggle('is-active', index === closestIndex));
    };

    dots[0].classList.add('is-active');
    gallery.addEventListener('scroll', updateGalleryDots, { passive: true });
});

if ('IntersectionObserver' in window) {
    const navLinks = [...document.querySelectorAll('[data-nav]')];
    const sectionObserver = new IntersectionObserver((entries) => {
        const activeEntry = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!activeEntry) return;
        navLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.nav === activeEntry.target.id));
    }, { rootMargin: '-18% 0px -70% 0px', threshold: [0, .1, .35] });
    ['library', 'logistics', 'highlights'].forEach((id) => {
        const section = document.getElementById(id);
        if (section) sectionObserver.observe(section);
    });
}

const routeStops = [
    { day: 1, name: 'Llegada + Reykjavík', coords: [64.0830, -21.9070], anchor: 'day-1' },
    { day: 2, name: 'Golden Circle + Reykjadalur', coords: [64.0416, -20.8859], anchor: 'day-2' },
    { day: 3, name: 'Costa Sur + Skógar', coords: [63.5322, -19.5114], anchor: 'day-3' },
    { day: 4, name: 'Tröll Skaftafell 3 h + Jökulsárlón + bote 15:50', coords: [64.0481, -16.1794], anchor: 'day-4', critical: true },
    { day: 5, name: 'Höfn + termales + Vestrahorn', coords: [64.2440, -14.9650], anchor: 'day-5' },
    { day: 6, name: 'Fjaðrárgljúfur + Vík + Dyrhólaey', coords: [63.7715, -18.1718], anchor: 'day-6' },
    { day: 7, name: 'Devolución + FI645', coords: [63.9850, -22.6056], anchor: 'day-7' }
];
const routeLine = [
    [63.9850, -22.6056],
    [63.8424, -22.4328],
    [64.1420, -21.9266],
    [64.1475, -21.9220],
    [64.1503, -21.9328],
    [64.1467, -21.8730],
    [64.0830, -21.9070],
    [64.2559, -21.1295],
    [64.2610, -21.1210],
    [64.3138, -20.3008],
    [64.1760, -20.4850],
    [64.3271, -20.1199],
    [64.0416, -20.8859],
    [64.0169, -21.2110],
    [63.9331, -20.9971],
    [63.9280, -21.0060],
    [63.7529, -20.2243],
    [63.6156, -19.9896],
    [63.6210, -19.9848],
    [63.5322, -19.5114],
    [63.5269, -19.5060],
    [63.5277, -19.5120],
    [63.7897, -18.0630],
    [64.0167, -16.9667],
    [64.0481, -16.1794],
    [64.0393, -16.1869],
    [64.0100, -16.9800],
    [64.2520, -15.2080],
    [64.3970, -15.3420],
    [64.2520, -15.2080],
    [64.2490, -14.9720],
    [64.2440, -14.9650],
    [64.2468, -14.9600],
    [64.2478, -14.9580],
    [64.2480, -14.9820],
    [63.7897, -18.0630],
    [63.7715, -18.1718],
    [63.4186, -19.0060],
    [63.4062, -19.0442],
    [63.4031, -19.1288],
    [63.7529, -20.2243],
    [63.9980, -22.5630],
    [63.9920, -22.5500],
    [63.9850, -22.6056]
];
const returnRouteStartIndex = 34;
const routeMapElement = document.getElementById('routeMap');
let map = null;

function addBaseMap(targetMap, theme = 'dark') {
    if (theme === 'street') {
        return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(targetMap);
    }

    return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(targetMap);
}

if (window.L && routeMapElement) {
    map = L.map(routeMapElement, {
        zoomControl: !smallScreenQuery.matches,
        scrollWheelZoom: false,
        dragging: !smallScreenQuery.matches,
        touchZoom: !smallScreenQuery.matches,
        doubleClickZoom: !smallScreenQuery.matches,
        tap: true
    });
    addBaseMap(map, 'street');
    L.polyline(routeLine.slice(0, returnRouteStartIndex + 1), {
        color: '#0f766e',
        weight: 4,
        opacity: .92,
        lineJoin: 'round'
    }).addTo(map);
    L.polyline(routeLine.slice(returnRouteStartIndex), {
        color: '#475569',
        weight: 2,
        opacity: .55,
        dashArray: '7 8'
    }).addTo(map);
    routeStops.forEach((stop) => {
        const icon = L.divIcon({
            className: '',
            html: `<span class="route-marker${stop.critical ? ' route-marker-critical' : ''}">${stop.day}</span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -16]
        });
        const marker = L.marker(stop.coords, { icon }).addTo(map);
        marker.bindPopup(`<strong>Día ${stop.day}</strong><br>${stop.name}`);
        marker.on('click', () => openDay(stop.anchor));
    });
    map.fitBounds(L.latLngBounds(routeLine), {
        padding: smallScreenQuery.matches ? [18, 18] : [28, 28]
    });
} else if (routeMapElement) {
    routeMapElement.classList.add('map-unavailable');
    routeMapElement.innerHTML = '<p>El mapa no está disponible sin conexión. El itinerario completo sigue visible debajo.</p>';
}

function makeReview({ eyebrow, title, verdict, stats, feel, route, level, jarvis, sources = [] }) {
    return {
        eyebrow,
        title,
        verdict,
        stats,
        blocks: [
            { label: 'Cómo se siente', text: feel },
            { label: 'Qué se hace', text: route },
            { label: 'Nivel realista', text: level },
            { label: 'Equipo mental Jarvis', text: jarvis }
        ],
        sources
    };
}

const reviewData = {
    'hallgrimskirkja': makeReview({
        eyebrow: 'Review · Día 1 · Reykjavík',
        title: 'Hallgrímskirkja',
        verdict: 'La entrada ceremonial a Reykjavík: arquitectura rara, limpia, casi volcánica. Vale por el golpe visual y por orientarte mentalmente en la ciudad.',
        stats: [['Tipo', 'Ciudad'], ['Tiempo', '30–60 min'], ['Esfuerzo', 'Bajo'], ['Extra', 'Torre opcional']],
        feel: 'Se siente como llegar a una capital pequeña pero con carácter propio: concreto claro, líneas de basalto y una plaza abierta para respirar después del vuelo.',
        route: 'Entrar a la iglesia es rápido; la torre es el plus si quieren ver Reykjavík desde arriba y ubicar mar, montañas y techos de colores.',
        level: 'Muy fácil. Lo único que decide el plan es energía post-vuelo y clima para la vista desde la torre.',
        jarvis: 'Si están cansados, hagan exterior + interior y sigan. La torre es premio, no obligación.',
        sources: [{ label: 'Hallgrímskirkja oficial', url: 'https://www.hallgrimskirkja.is/en' }]
    }),
    'sun-voyager': makeReview({
        eyebrow: 'Review · Día 1 · Costa urbana',
        title: 'Viajero del Sol',
        verdict: 'Una parada corta pero poética: escultura frente al mar, viento, horizonte y esa primera foto que dice “ya estamos en Islandia”.',
        stats: [['Tipo', 'Foto / paseo'], ['Tiempo', '10–20 min'], ['Esfuerzo', 'Bajo'], ['Mejor', 'Luz lateral']],
        feel: 'No es una caminata grande; es un gesto. Atlántico Norte, metal brillante y montañas al fondo si el día ayuda.',
        route: 'Llegar, caminar el borde marítimo, foto rápida y continuar hacia Harpa o el camping.',
        level: 'Muy fácil, pero puede sentirse frío por el viento junto al agua.',
        jarvis: 'Perfecto si necesitan “despertar” sin gastar piernas. No lo conviertan en parada larga.',
        sources: [{ label: 'Visit Reykjavík', url: 'https://visitreykjavik.is/service/sun-voyager' }]
    }),
    'harpa': makeReview({
        eyebrow: 'Review · Día 1 · Arquitectura',
        title: 'Harpa',
        verdict: 'Cristal, geometría y reflejos. Es una pausa urbana elegante antes de entrar de lleno al paisaje salvaje.',
        stats: [['Tipo', 'Arquitectura'], ['Tiempo', '20–40 min'], ['Esfuerzo', 'Bajo'], ['Costo', 'Áreas públicas']],
        feel: 'El edificio se siente como una cueva de vidrio: luz fría, patrones, mar cerca y mucha textura para fotos.',
        route: 'Recorrer áreas públicas, mirar el lobby, fachada y vistas hacia el puerto.',
        level: 'Fácil y bajo riesgo; ideal para un día de llegada.',
        jarvis: 'Úsenlo como parada de transición: bonito, cubierto y sin exigir energía.',
        sources: [{ label: 'Harpa oficial', url: 'https://www.harpa.is/en' }]
    }),
    'iceland-camping-equipment': makeReview({
        eyebrow: 'Día 1 · Equipo · BSÍ Reykjavík',
        title: 'Iceland Camping Equipment',
        verdict: 'Primera parada de equipo: recoger bastones y rain pants para los dos antes de comenzar la ruta.',
        stats: [['Para', '2 personas'], ['Recoger', '09:00'], ['Lugar', 'Terminal BSÍ'], ['Horario', '09:00–17:00']],
        feel: 'Parada práctica y corta dentro de la terminal BSÍ.',
        route: 'Recoger dos pares de bastones ajustables y rain pants reservados para ambos.',
        level: 'Fácil; estacionar, comprobar tallas y revisar el equipo antes de salir.',
        jarvis: 'Reservar antes del viaje. Confirmen dos pares de bastones, las dos tallas de rain pants y el método de devolución.',
        sources: [
            { label: 'Sitio oficial', url: 'https://www.iceland-camping-equipment.com/' },
            { label: 'Hiking & trekking gear', url: 'https://www.iceland-camping-equipment.com/collections/iceland-hiking-trekking-gear' }
        ]
    }),
    'thingvellir': makeReview({
        eyebrow: 'Review · Día 2 · Golden Circle',
        title: 'Þingvellir',
        verdict: 'Aquí el viaje cambia de ciudad a geología: caminar entre placas tectónicas le da peso real al mapa.',
        stats: [['Tipo', 'Parque nacional'], ['Tiempo', '60–90 min'], ['Esfuerzo', 'Bajo–medio'], ['Clave', 'Miradores']],
        feel: 'Amplio, histórico y mineral. No es solo “ver una vista”: es caminar dentro de una fractura del planeta.',
        route: 'Combinar miradores con Almannagjá; caminar lo suficiente para sentir la falla sin comerse todo el día.',
        level: 'Fácil si se quedan en senderos principales. Puede alargarse por fotos y desvíos.',
        jarvis: 'Mantenerlo compacto: el Día 2 todavía tiene Geysir, Gullfoss, Kerið y Reykjadalur.',
        sources: [{ label: 'Þingvellir oficial', url: 'https://www.thingvellir.is/en/' }]
    }),
    'almannagja': makeReview({
        eyebrow: 'Review · Día 2 · Falla tectónica',
        title: 'Almannagjá',
        verdict: 'La parte más caminable y narrativa de Þingvellir: paredes de roca, sendero claro y sensación de grieta continental.',
        stats: [['Tipo', 'Sendero corto'], ['Tiempo', '20–45 min'], ['Esfuerzo', 'Bajo'], ['Terreno', 'Marcado']],
        feel: 'Es un pasillo de roca; sobrio, fotogénico y muy “Islandia sin filtro”.',
        route: 'Caminar por la garganta y conectar con miradores cercanos si el clima acompaña.',
        level: 'Fácil. El reto real es no quedarse demasiado si el calendario va apretado.',
        jarvis: 'Hagan la caminata como núcleo de Þingvellir y sigan; el día tiene demasiadas piezas buenas.',
        sources: [{ label: 'Þingvellir oficial', url: 'https://www.thingvellir.is/en/' }]
    }),
    'geysir': makeReview({
        eyebrow: 'Review · Día 2 · Geotermia',
        title: 'Geysir / Strokkur',
        verdict: 'La parada de “espera y explosión”: vapor, olor mineral y Strokkur disparando agua cada pocos minutos.',
        stats: [['Tipo', 'Geotérmico'], ['Tiempo', '30–45 min'], ['Esfuerzo', 'Bajo'], ['Ritmo', 'Ciclos cortos']],
        feel: 'Es turística, sí, pero tiene teatro natural: todo el mundo mirando un charco hasta que el suelo decide respirar.',
        route: 'Caminar el área geotérmica, esperar 1–2 erupciones de Strokkur y continuar.',
        level: 'Muy fácil; mantenerse en senderos y respetar áreas calientes.',
        jarvis: 'No esperen la “erupción perfecta” diez veces. Una buena y seguimos.',
        sources: [{ label: 'Visit Iceland · Geysir', url: 'https://www.visiticeland.com/article/geysir-geothermal-area/' }]
    }),
    'gullfoss': makeReview({
        eyebrow: 'Review · Día 2 · Cascada',
        title: 'Gullfoss',
        verdict: 'Una cascada grande de verdad: dos niveles, niebla, ruido y una escala que empieza a preparar el ojo para la Costa Sur.',
        stats: [['Tipo', 'Cascada'], ['Tiempo', '35–60 min'], ['Esfuerzo', 'Bajo–medio'], ['Clave', 'Miradores']],
        feel: 'Poderosa, amplia, con sensación de cañón abierto. En días de sol puede regalar arcoíris.',
        route: 'Mirador superior + sendero hacia la zona baja si está abierto y seguro.',
        level: 'Fácil, aunque el spray y el viento pueden hacerla más intensa.',
        jarvis: 'Impermeable a mano. Fotos rápidas si el viento está agresivo.',
        sources: [{ label: 'Visit Iceland · Gullfoss', url: 'https://www.visiticeland.com/article/gullfoss-waterfall/' }]
    }),
    'kerid': makeReview({
        eyebrow: 'Review · Día 2 · Cráter',
        title: 'Kerið',
        verdict: 'Un cierre visual compacto del Golden Circle: cráter rojo, lago azul y una caminata corta que no rompe el día.',
        stats: [['Tipo', 'Cráter'], ['Tiempo', '25–45 min'], ['Esfuerzo', 'Bajo'], ['Ruta', 'Borde + lago']],
        feel: 'Color y forma. Después de cascadas y geotermia, Kerið se siente más gráfico, casi como una postal de geología.',
        route: 'Caminar el borde; bajar al lago solo si hay energía y buen clima.',
        level: 'Fácil. Ojo con viento en el borde.',
        jarvis: 'Si Reykjadalur sigue en pie, Kerið debe ser eficiente: una vuelta corta y listo.',
        sources: [{ label: 'Guide to Iceland · Kerið', url: 'https://guidetoiceland.is/travel-iceland/drive/kerid' }]
    }),
    'reykjadalur': makeReview({
        eyebrow: 'Review · Día 2 · Hiking termal',
        title: 'Reykjadalur',
        verdict: 'Esta sí cuenta como experiencia grande: subir por un valle humeante y terminar metido en un río caliente. Cansa, pero paga.',
        stats: [['Tipo', 'Hike + baño'], ['Distancia', '3.5 km ida aprox.'], ['Tiempo', '2.5–4 h'], ['Esfuerzo', 'Medio']],
        feel: 'Vapor, montaña, barro si llueve y recompensa termal. Es de esas paradas que convierten el día en memoria, no solo checklist.',
        route: 'Desde Hveragerði se sube por sendero marcado hacia el río termal; bañarse y volver por el mismo camino.',
        level: 'Moderado por desnivel, clima y duración. No técnico, pero no es “bajar del carro y ya”.',
        jarvis: 'Llevar traje de baño accesible, toalla rápida y bolsa para ropa mojada. Si llegan tarde, recorten antes otra parada.',
        sources: [{ label: 'Arctic Adventures · Reykjadalur', url: 'https://adventures.is/iceland/attractions/reykjadalur/' }]
    }),
    'seljalandsfoss': makeReview({
        eyebrow: 'Review · Día 3 · Cascada',
        title: 'Seljalandsfoss',
        verdict: 'La cascada de caminar detrás. Muy fotogénica, muy húmeda, muy fácil de subestimar hasta que sales empapado.',
        stats: [['Tipo', 'Cascada'], ['Tiempo', '30–45 min'], ['Esfuerzo', 'Bajo'], ['Riesgo', 'Resbaloso']],
        feel: 'El wow está en pasar detrás de la cortina de agua: ruido, spray y pared verde alrededor.',
        route: 'Ver desde el frente y, si el sendero está seguro, hacer el circuito detrás de la caída.',
        level: 'Fácil pero mojado. Piedras resbalosas y viento pueden cambiarlo todo.',
        jarvis: 'Ponchos/impermeable antes de acercarse. Cámara protegida.',
        sources: [{ label: 'South Iceland · Seljalandsfoss', url: 'https://www.south.is/en/place/seljalandsfoss-waterfall' }]
    }),
    'gljufrabui': makeReview({
        eyebrow: 'Review · Día 3 · Cascada escondida',
        title: 'Gljúfrabúi',
        verdict: 'Pequeña, escondida y teatral: entrar al cañóncito la hace sentirse más secreta que Seljalandsfoss.',
        stats: [['Tipo', 'Cascada corta'], ['Tiempo', '20–35 min'], ['Esfuerzo', 'Bajo'], ['Clave', 'Zapatos mojables']],
        feel: 'Es más aventura de bolsillo: roca, agua, entrada estrecha y una cascada escondida al final.',
        route: 'Caminar desde Seljalandsfoss y entrar solo si el paso por agua/rocas está razonable.',
        level: 'Fácil, pero los pies pueden mojarse y las rocas resbalan.',
        jarvis: 'No gastar demasiado tiempo: vale mucho, pero Skógafoss espera.',
        sources: [{ label: 'South Iceland · Gljúfrabúi', url: 'https://www.south.is/en/place/gljufrabui' }]
    }),
    'skogafoss': makeReview({
        eyebrow: 'Review · Día 3 · Cascada grande',
        title: 'Skógafoss',
        verdict: 'Uno de los golpes visuales fuertes del viaje: una pared de agua de 60 m, niebla, arcoíris posible y escaleras si quieren mirar desde arriba.',
        stats: [['Tipo', 'Cascada'], ['Caída', '60 m'], ['Tiempo', '30–60 min'], ['Extra', 'Escaleras arriba']],
        feel: 'Desde abajo se siente brutal y simple: agua cayendo como una sábana gigante. Desde arriba cambia a paisaje de río y acantilado.',
        route: 'Base de la cascada primero; subir escaleras solo si piernas/clima lo justifican.',
        level: 'Base muy fácil. Escaleras: cardio corto y posiblemente resbaloso con lluvia.',
        jarvis: 'El día siguiente es crítico; disfruten Skógafoss, pero no quemen piernas absurdamente.',
        sources: [{ label: 'South Iceland · Skógafoss', url: 'https://www.south.is/en/place/skogafoss-waterfall' }]
    }),
    'troll-skaftafell': makeReview({
        eyebrow: 'Review · Día 4 · Glaciar guiado',
        title: 'Tröll Skaftafell · 3 h',
        verdict: 'No lo leería como una “caminata larga”, sino como una mini expedición sobre hielo: crampones, guía, grietas, morrena, viento frío y esa sensación rara de estar pisando un ser vivo que se mueve lento.',
        stats: [['Reserva', '3 h'], ['Wikiloc ref.', '3 mi / +512 ft'], ['Track', '3 h 30 min'], ['Dificultad', 'Fácil']],
        feel: 'La parte memorable no es la distancia: es el cambio de textura. Sales de la carretera, te equipan y de pronto estás sobre hielo con piolet y crampones.',
        route: 'El Wikiloc que pasaste registra una experiencia con Tröll: bus corto al parking del glaciar, inicio a nivel de laguna, subida progresiva, crampones y recorrido entre grietas/moulins.',
        level: 'Fácil–moderado si van descansados y con botas correctas. El cansancio del Día 4 viene más por salida temprana + manejo + bote 15:50.',
        jarvis: 'N1 Kirkjubæjarklaustur es parada express; nada de desayuno largo. Capas, guantes, gorro, agua pequeña y cero jeans.',
        sources: [
            { label: 'Tröll · tour oficial 3 h', url: 'https://troll.is/tour/skaftafell-3-hour-glacier-hike/' },
            { label: 'Wikiloc · Iceland 05 Skaftafell Glacier Travelling', url: 'https://www.wikiloc.com/snowshoeing-trails/iceland-05-skaftafell-glacier-travelling-148975965' }
        ]
    }),
    'jokulsarlon': makeReview({
        eyebrow: 'Review · Día 4 · Laguna glaciar',
        title: 'Jökulsárlón',
        verdict: 'El centro emocional del viaje: icebergs flotando, silencio frío y una escala azul que no se parece a las cascadas ni a las playas.',
        stats: [['Tipo', 'Laguna'], ['Tiempo', '45–90 min'], ['Esfuerzo', 'Bajo'], ['Clave', 'No correr']],
        feel: 'Se siente lento y enorme. Es una parada para bajar revoluciones después del glaciar y antes del bote.',
        route: 'Miradores junto a la laguna, comida rápida si toca, fotos y conexión con el parking/punto del bote.',
        level: 'Muy fácil; lo importante es proteger tiempo para el tour de las 15:50.',
        jarvis: 'Llegar con margen. Jökulsárlón no se disfruta mirando el reloj cada 12 segundos.',
        sources: [{ label: 'Visit Iceland · Jökulsárlón', url: 'https://www.visiticeland.com/article/jokulsarlon-glacier-lagoon/' }]
    }),
    'glacier-lagoon-boat': makeReview({
        eyebrow: 'Review · Día 4 · Bote 15:50',
        title: 'Glacier Lagoon Trip',
        verdict: 'La versión inmersiva de Jökulsárlón: ya no miras los icebergs desde fuera, te metes entre ellos.',
        stats: [['Tipo', 'Bote'], ['Hora', '15:50'], ['Esfuerzo', 'Bajo'], ['Riesgo', 'Puntualidad']],
        feel: 'Frío, azul y cinematográfico. El bote convierte la laguna en algo cercano, no solo panorámico.',
        route: 'Parking, check-in, equipo si aplica, salida al agua y regreso con margen para Diamond Beach.',
        level: 'Fácil físicamente. Logísticamente sensible: si se atrasa el glaciar, este bloque sufre.',
        jarvis: 'Este horario manda. Todo el Día 4 debe proteger el 15:50.',
        sources: [{ label: 'Jökulsárlón oficial', url: 'https://icelagoon.is/' }]
    }),
    'diamond-beach': makeReview({
        eyebrow: 'Review · Día 4 · Playa negra',
        title: 'Diamond Beach',
        verdict: 'Hielo transparente sobre arena negra: simple, absurdo y precioso. Es el epílogo perfecto después de la laguna.',
        stats: [['Tipo', 'Playa / fotos'], ['Tiempo', '25–45 min'], ['Esfuerzo', 'Bajo'], ['Clave', 'Oleaje']],
        feel: 'La playa parece una mesa de obsidiana con cristales gigantes. Cada bloque de hielo cambia con la luz.',
        route: 'Caminar por la zona segura, buscar bloques interesantes, mantener distancia del agua.',
        level: 'Fácil, pero nunca confiarse con el mar islandés.',
        jarvis: 'Ideal después del bote. Si están fundidos, hagan una visita corta y memorable.',
        sources: [{ label: 'Visit Iceland · Diamond Beach', url: 'https://www.visiticeland.com/article/diamond-beach/' }]
    }),
    'hoffell': makeReview({
        eyebrow: 'Review · Día 5 · Termales',
        title: 'Hoffell Hot Tubs',
        verdict: 'La pausa de recuperación: agua caliente, montañas y el cuerpo diciendo “gracias” después del día glaciar.',
        stats: [['Tipo', 'Baño termal'], ['Tiempo', '60–90 min'], ['Esfuerzo', 'Bajo'], ['Función', 'Recuperar']],
        feel: 'Menos turístico que una laguna grande; más íntimo, práctico y perfecto para resetear piernas.',
        route: 'Llegar, pagar si aplica, baño, ducha/orden y seguir hacia Vestrahorn.',
        level: 'Fácil. El valor está en bajar el ritmo.',
        jarvis: 'No lo saltes si el cuerpo viene cargado. Este baño compra energía para Vestrahorn.',
        sources: [{ label: 'Hoffell Hot Tubs', url: 'https://www.hoffell.com/hot-tubs/' }]
    }),
    'vestrahorn': makeReview({
        eyebrow: 'Review · Día 5 · Montaña',
        title: 'Vestrahorn',
        verdict: 'La montaña dramática del viaje: negra, afilada, cinematográfica. Si hay reflejos, puede ser top 3 del roadbook.',
        stats: [['Tipo', 'Miradores'], ['Tiempo', '60–120 min'], ['Esfuerzo', 'Bajo'], ['Mejor', 'Luz baja']],
        feel: 'Dunas, mar, montaña oscura y sensación de estar en una película cara.',
        route: 'Comprar acceso en Viking Cafe, recorrer puntos de Stokksnes, buscar composiciones con dunas/reflejos.',
        level: 'Fácil; depende más de clima, viento y visibilidad que de piernas.',
        jarvis: 'Si el cielo abre, no tengan prisa. Este es lugar de paciencia fotográfica.',
        sources: [{ label: 'Viking Cafe / Stokksnes', url: 'https://www.vikingcafe.is/' }]
    }),
    'mirror-beach': makeReview({
        eyebrow: 'Review · Día 5 · Stokksnes',
        title: 'Mirror Beach',
        verdict: 'La búsqueda del reflejo: Vestrahorn duplicado en arena mojada. Si marea/luz ayudan, magia silenciosa.',
        stats: [['Tipo', 'Foto / playa'], ['Tiempo', '30–60 min'], ['Esfuerzo', 'Bajo'], ['Clave', 'Marea / luz']],
        feel: 'Minimalista: agua fina, arena oscura, montaña enorme. Muy de caminar lento mirando el suelo.',
        route: 'Explorar la playa de Stokksnes y moverse hasta encontrar charcos/reflejos limpios.',
        level: 'Fácil, con viento posible.',
        jarvis: 'No forzar si el clima está cerrado. Vestrahorn también funciona con nubes dramáticas.',
        sources: [{ label: 'Viking Cafe / Stokksnes', url: 'https://www.vikingcafe.is/' }]
    }),
    'viking-village': makeReview({
        eyebrow: 'Review · Día 5 · Film set',
        title: 'Viking Village',
        verdict: 'No es naturaleza pura, es textura cinematográfica: un set vikingo abandonado que suma una capa rara al día de Vestrahorn.',
        stats: [['Tipo', 'Set / paseo'], ['Tiempo', '25–45 min'], ['Esfuerzo', 'Bajo'], ['Acceso', 'Viking Cafe']],
        feel: 'Madera, pasto, montañas y una vibra de “esto parece real pero no del todo”.',
        route: 'Entrar con el acceso de Stokksnes y recorrer el set sin convertirlo en actividad larga.',
        level: 'Muy fácil.',
        jarvis: 'Buen complemento, no plato principal. El plato principal sigue siendo Vestrahorn.',
        sources: [{ label: 'Viking Cafe / Stokksnes', url: 'https://www.vikingcafe.is/' }]
    }),
    'fjadrargljufur': makeReview({
        eyebrow: 'Review · Día 6 · Cañón',
        title: 'Fjaðrárgljúfur',
        verdict: 'Un cañón serpenteante, verde y extraño. Es corto, potente y perfecto para romper el regreso largo.',
        stats: [['Tipo', 'Miradores'], ['Longitud', '2 km aprox.'], ['Tiempo', '45–75 min'], ['Esfuerzo', 'Bajo–medio']],
        feel: 'Paredes altas, río abajo y curvas suaves. Parece diseñado por alguien con buen gusto excesivo.',
        route: 'Caminar por los miradores autorizados, sin salirse a zonas cerradas o frágiles.',
        level: 'Moderado suave por pendiente y clima; técnicamente sencillo.',
        jarvis: 'Va antes de Vík: llegar, caminar miradores, fotos y seguir. No improvisar senderos.',
        sources: [{ label: 'South Iceland · Fjaðrárgljúfur', url: 'https://www.south.is/en/place/fjadrargljufur-canyon' }]
    }),
    'reynisfjara': makeReview({
        eyebrow: 'Review · Día 6 · Playa negra',
        title: 'Reynisfjara',
        verdict: 'Bellísima y seria. Arena negra, columnas basálticas y Reynisdrangar; pero aquí el mar no es decoración, es peligro real.',
        stats: [['Tipo', 'Playa / basalto'], ['Tiempo', '30–50 min'], ['Esfuerzo', 'Bajo'], ['Clave', 'Lejos del agua']],
        feel: 'Oscura, ruidosa, poderosa. Una de las playas más memorables del viaje si se respeta.',
        route: 'Columnas basálticas, vistas de la playa y fotos desde distancia segura del oleaje.',
        level: 'Fácil físicamente; alta atención por sneaker waves.',
        jarvis: 'Nunca dar la espalda al mar. Si hay alerta o mal oleaje, se mira desde lejos y ya.',
        sources: [{ label: 'Visit Iceland · seguridad Reynisfjara', url: 'https://www.visiticeland.com/article/reynisfjara-black-sand-beach-is-dangerous/' }]
    }),
    'dyrholaey': makeReview({
        eyebrow: 'Review · Día 6 · Acantilados',
        title: 'Dyrhólaey',
        verdict: 'El mirador que ordena la Costa Sur: arco natural, acantilados, mar negro y vista larga hacia Reynisfjara.',
        stats: [['Tipo', 'Mirador'], ['Tiempo', '30–60 min'], ['Esfuerzo', 'Bajo'], ['Clave', 'Viento']],
        feel: 'Más aéreo que Reynisfjara. Aquí la costa se entiende desde arriba.',
        route: 'Subir a miradores habilitados, fotos del arco y vistas hacia playas negras.',
        level: 'Fácil, pero viento fuerte puede hacerlo incómodo.',
        jarvis: 'Después de Reynisfjara, este es cierre panorámico. Si el clima está feo, hacerlo corto.',
        sources: [{ label: 'South Iceland · Dyrhólaey', url: 'https://www.south.is/en/place/dyrholaey' }]
    }),
    'lava-centre': makeReview({
        eyebrow: 'Review · Día 6 · Opcional cubierto',
        title: 'LAVA Centre',
        verdict: 'Plan B inteligente: si el cuerpo o el clima fallan, volcanes bajo techo y contexto para todo lo que viste afuera.',
        stats: [['Tipo', 'Museo'], ['Tiempo', '45–90 min'], ['Esfuerzo', 'Bajo'], ['Uso', 'Opcional']],
        feel: 'Interactivo, cómodo y educativo. Cambia lava/montañas de “paisaje bonito” a sistema vivo.',
        route: 'Entrar solo si queda energía o si el clima castiga demasiado las paradas exteriores.',
        level: 'Muy fácil.',
        jarvis: 'No es obligación. Es carta comodín para cerrar el día con cabeza y sin mojarse más.',
        sources: [{ label: 'LAVA Centre oficial', url: 'https://lavacentre.is/' }]
    })
};

const reviewOverlay = document.getElementById('reviewOverlay');
const reviewPanel = reviewOverlay?.querySelector('.review-panel');
const reviewBody = document.getElementById('reviewBody');
let lastReviewTrigger = null;
let reviewPreservedBodyLock = false;

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const reviewMatchers = [
    { key: 'hallgrimskirkja', patterns: ['hallgrimskirkja', 'hallgrímskirkja'] },
    { key: 'sun-voyager', patterns: ['viajero del sol', 'sun voyager'] },
    { key: 'harpa', patterns: ['harpa'] },
    { key: 'iceland-camping-equipment', patterns: ['iceland camping equipment'] },
    { key: 'thingvellir', patterns: ['thingvellir', 'þingvellir'] },
    { key: 'almannagja', patterns: ['almannagja', 'almannagjá'] },
    { key: 'geysir', patterns: ['geysir', 'strokkur'] },
    { key: 'gullfoss', patterns: ['gullfoss'] },
    { key: 'kerid', patterns: ['kerid', 'kerið'] },
    { key: 'reykjadalur', patterns: ['reykjadalur', 'thermal river', 'rio termal', 'río termal'] },
    { key: 'seljalandsfoss', patterns: ['seljalandsfoss'] },
    { key: 'gljufrabui', patterns: ['gljufrabui', 'gljúfrabúi'] },
    { key: 'skogafoss', patterns: ['skogafoss', 'skógafoss'] },
    { key: 'troll-skaftafell', patterns: ['troll expeditions skaftafell', 'tröll expeditions skaftafell', 'troll skaftafell', 'tröll skaftafell'] },
    { key: 'glacier-lagoon-boat', patterns: ['glacier lagoon trip boat'] },
    { key: 'jokulsarlon', patterns: ['jokulsarlon', 'jökulsárlón'] },
    { key: 'diamond-beach', patterns: ['diamond beach'] },
    { key: 'hoffell', patterns: ['hoffell hot tubs'] },
    { key: 'viking-village', patterns: ['viking village film set'] },
    { key: 'mirror-beach', patterns: ['stokksnes mirror beach', 'mirror beach'] },
    { key: 'vestrahorn', patterns: ['vestrahorn'] },
    { key: 'fjadrargljufur', patterns: ['fjadrargljufur', 'fjaðrárgljúfur'] },
    { key: 'reynisfjara', patterns: ['reynisfjara'] },
    { key: 'dyrholaey', patterns: ['dyrholaey', 'dyrhólaey'] },
    { key: 'lava-centre', patterns: ['lava centre'] }
];

const reviewSkipPatterns = [
    'gas',
    'orkan',
    'n1 ',
    'camping',
    'campsite',
    'campground',
    'parking',
    'go campers',
    'aeropuerto',
    'airport',
    'vuelo',
    'metro',
    'netto',
    'nettó',
    'guesthouse'
];

function normalizeReviewText(value) {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9þðæø\s]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findReviewKey(value) {
    const text = normalizeReviewText(value);
    if (reviewSkipPatterns.some((pattern) => text.includes(normalizeReviewText(pattern)))) {
        return null;
    }
    const match = reviewMatchers.find(({ patterns }) => (
        patterns.some((pattern) => text.includes(normalizeReviewText(pattern)))
    ));
    return match?.key || null;
}

function getStopReviewKey(stop) {
    return stop.review || findReviewKey(`${stop.title || ''} ${stop.sub || ''}`);
}

function enhanceRoadbookReviews() {
    document.querySelectorAll('.event').forEach((eventEl) => {
        if (eventEl.querySelector('[data-review]')) return;
        const textEl = eventEl.querySelector('p');
        if (!textEl) return;
        const reviewKey = findReviewKey(textEl.textContent);
        if (!reviewKey) return;

        const button = document.createElement('button');
        button.className = 'event-inline-review';
        button.type = 'button';
        button.dataset.review = reviewKey;
        button.textContent = 'Review →';
        textEl.appendChild(button);
        eventEl.classList.add('event-has-review');
    });
}

const reviewImages = {
    'hallgrimskirkja': 'img/hallgrimskirkja-1.jpg',
    'sun-voyager': 'img/hallgrimskirkja-2.jpg',
    'harpa': 'img/hallgrimskirkja-3.jpg',
    'iceland-camping-equipment': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/BSI_bus_terminal_(Reykjavik)_in_2020.02.jpg?width=1600',
    'thingvellir': 'img/thingvellir-1.jpg',
    'almannagja': 'img/thingvellir-2.jpg',
    'geysir': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Strokkur%2C_%C3%81rea_geot%C3%A9rmica_de_Geysir%2C_Su%C3%B0urland%2C_Islandia%2C_2014-08-16%2C_DD_086.JPG/1920px-Strokkur%2C_%C3%81rea_geot%C3%A9rmica_de_Geysir%2C_Su%C3%B0urland%2C_Islandia%2C_2014-08-16%2C_DD_086.JPG',
    'gullfoss': 'img/gullfoss.jpg',
    'kerid': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Crater_volc%C3%A1nico_Keri%C3%B0%2C_Su%C3%B0urland%2C_Islandia%2C_2014-08-16%2C_DD_151.jpg/1920px-Crater_volc%C3%A1nico_Keri%C3%B0%2C_Su%C3%B0urland%2C_Islandia%2C_2014-08-16%2C_DD_151.jpg',
    'reykjadalur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Hot_spring%2C_Reykjadalur_Valley%2C_Iceland%2C_20230502_1415_4243.jpg/1920px-Hot_spring%2C_Reykjadalur_Valley%2C_Iceland%2C_20230502_1415_4243.jpg',
    'seljalandsfoss': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Seljalandsfoss_Waterfall%2C_Iceland%2C_20240720_1500_3093.jpg/1920px-Seljalandsfoss_Waterfall%2C_Iceland%2C_20240720_1500_3093.jpg',
    'gljufrabui': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Glj%C3%BAfrab%C3%BAi-pjt1.jpg/1920px-Glj%C3%BAfrab%C3%BAi-pjt1.jpg',
    'skogafoss': 'img/skogafoss-1.jpg',
    'troll-skaftafell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/View_from_Skaftafell_National_Park_July_2014_-2.JPG/1920px-View_from_Skaftafell_National_Park_July_2014_-2.JPG',
    'jokulsarlon': 'img/jokulsarlon-1.jpg',
    'glacier-lagoon-boat': 'img/jokulsarlon-3.jpg',
    'diamond-beach': 'img/diamond-beach-1.jpg',
    'hoffell': 'img/vestrahorn-2.jpg',
    'vestrahorn': 'img/vestrahorn-1.jpg',
    'mirror-beach': 'img/vestrahorn-3.jpg',
    'viking-village': 'img/vestrahorn-2.jpg',
    'fjadrargljufur': 'img/fjadrargljufur-1.jpg',
    'reynisfjara': 'img/reynisfjara-1.jpg',
    'dyrholaey': 'img/reynisfjara-3.jpg',
    'lava-centre': 'img/fjadrargljufur-3.jpg'
};

function renderReview(review, key) {
    const statsHtml = review.stats.map(([label, value]) => `
        <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
    `).join('');
    const sources = review.sources || [];
    const sourcesHtml = sources.map((source) => `
        <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.label)} ↗</a>
    `).join('');
    const sourcesBlock = sources.length
        ? `<div class="review-sources"><span>Fuentes usadas</span>${sourcesHtml}</div>`
        : '';

    const image = reviewImages[key] || 'img/hero-aurora.jpg';

    reviewBody.innerHTML = `
        <div class="review-visual">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(review.title)}" loading="eager">
            <div class="review-visual-shade"></div>
            <div class="review-heading">
                <p class="review-eyebrow">${escapeHtml(review.eyebrow)}</p>
                <h2 id="reviewTitle">${escapeHtml(review.title)}</h2>
            </div>
        </div>
        <details class="review-more">
            <summary>Información <span aria-hidden="true">＋</span></summary>
            <p class="review-verdict">${escapeHtml(review.verdict)}</p>
            <div class="review-stats">${statsHtml}</div>
            <div class="review-essential">
                <span>Jarvis recomienda</span>
                <p>${escapeHtml(review.blocks[3]?.text || '')}</p>
            </div>
        </details>
    `;
}

function openReview(key, event) {
    const review = reviewData[key];
    if (!review || !reviewOverlay || !reviewPanel || !reviewBody) return;
    lastReviewTrigger = event?.target?.closest('[data-review]') || document.activeElement;
    reviewPreservedBodyLock = document.body.style.overflow === 'hidden';
    renderReview(review, key);
    reviewOverlay.classList.add('active');
    reviewOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => reviewPanel.focus());
}

function closeReview() {
    if (!reviewOverlay) return;
    reviewOverlay.classList.remove('active');
    reviewOverlay.setAttribute('aria-hidden', 'true');
    if (!reviewPreservedBodyLock) document.body.style.overflow = '';
    if (lastReviewTrigger instanceof HTMLElement) lastReviewTrigger.focus();
}

enhanceRoadbookReviews();

document.addEventListener('click', (event) => {
    const closeTrigger = event.target.closest('[data-review-close]');
    if (closeTrigger) {
        event.preventDefault();
        closeReview();
        return;
    }

    const reviewTrigger = event.target.closest('[data-review]');
    if (!reviewTrigger) return;
    event.preventDefault();
    event.stopPropagation();
    openReview(reviewTrigger.dataset.review, event);
});

document.addEventListener('keydown', (event) => {
    if (!reviewOverlay?.classList.contains('active')) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeReview();
        return;
    }
    if (event.key !== 'Tab' || !reviewPanel) return;

    const focusable = [...reviewPanel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )];
    if (!focusable.length) {
        event.preventDefault();
        reviewPanel.focus();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}, true);

// ===== JARVIS MODE =====
const jarvisData = [
    {
        day: 0, label: 'SALIDA', tab: 'SALIDA', name: 'Washington → Islandia', date: '31-ago-2026',
        stops: [
            { time: 'Inicio', icon: '🏠', title: '1201 S Eads St' },
            { time: 'Metro', icon: '🚇', title: 'Pentagon City Metro Station' },
            { time: 'IAD', icon: '✈️', title: 'Aeropuerto Washington-Dulles' },
            { time: '20:30', icon: '🛫', title: 'Icelandair FI644', sub: 'Noche en el avión rumbo a Keflavík.' }
        ],
        tip: 'Día de transición. Lleva batería, abrigo ligero y lo necesario para dormir algo en el vuelo.',
        wow: 'El viaje empieza antes de Islandia: salir de noche desde Washington y amanecer en Keflavík ya cambia el chip completo.'
    },
    {
        day: 1, name: 'Llegada + Reykjavík', date: '01-sept-2026',
        stops: [
            { time: '06:25', icon: '🛬', title: 'Llegada a Keflavík', coords: [63.9850, -22.6056] },
            { time: '07:30', icon: '🚐', title: 'Recoger Go Camper', coords: [63.9920, -22.5500] },
            { time: '09:00', icon: '🥾', title: 'Iceland Camping Equipment', sub: 'Recoger 2 pares de bastones y rain pants para ambos en la terminal BSÍ.', coords: [64.1377, -21.9344], review: 'iceland-camping-equipment' },
            { time: 'Ciudad', icon: '⛪', title: '⭐ Hallgrímskirkja', star: true, coords: [64.1420, -21.9266] },
            { time: 'Ciudad', icon: '🌊', title: 'Viajero del Sol', coords: [64.1475, -21.9220] },
            { time: 'Ciudad', icon: '🎵', title: 'Harpa', coords: [64.1503, -21.9328] },
            { time: '⛽ Gas', icon: '⛽', title: 'Orkan Kleppsvegur', sub: 'Parada técnica antes del camping.', coords: [64.1467, -21.8730] },
            { time: 'Noche', icon: '🏕️', title: 'Reykjavík Eco Campsite', coords: [64.0830, -21.9070] }
        ],
        tip: 'Orden refinado: Go Campers, Iceland Camping Equipment en BSÍ, Hallgrímskirkja, Viajero del Sol, Harpa, Orkan Kleppsvegur y Reykjavík Eco Campsite como única base del día.',
        wow: 'Hallgrímskirkja, el Viajero del Sol y Harpa hacen una entrada limpia a Reykjavík sin quemar energía el primer día.'
    },
    {
        day: 2, name: 'Golden Circle + Reykjadalur', date: '02-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Reykjavík Eco Campsite', coords: [64.0830, -21.9070] },
            { time: 'Ruta', icon: '🌋', title: '⭐ Þingvellir', star: true, coords: [64.2559, -21.1295] },
            { time: 'Ruta', icon: '🪨', title: 'Almannagjá', sub: 'Caminar por la falla tectónica dentro de Þingvellir.', coords: [64.2610, -21.1210] },
            { time: 'Ruta', icon: '💦', title: 'Geysir / Strokkur', sub: 'Strokkur suele erupcionar cada pocos minutos.', coords: [64.3138, -20.3008] },
            { time: 'Parada', icon: '🐴', title: 'Brú Horsefarm', sub: 'Caballos islandeses; compras opcionales.', coords: [64.1760, -20.4850] },
            { time: 'Ruta', icon: '💧', title: 'Gullfoss Waterfall', coords: [64.3271, -20.1199] },
            { time: 'Ruta', icon: '🌋', title: 'Kerið', sub: 'Caminar el borde; bajar al lago es opcional.', coords: [64.0416, -20.8859] },
            { time: 'Termal', icon: '♨️', title: '⭐ Reykjadalur Hot Spring Thermal River', sub: 'Hiking, baño termal, descanso y regreso caminando.', star: true, coords: [64.0169, -21.2110] },
            { time: '⛽ Gas', icon: '⛽', title: 'Orkan Suðurlandsvegur, Selfoss', coords: [63.9331, -20.9971] },
            { time: 'Noche', icon: '🏕️', title: 'Camping Selfoss', coords: [63.9280, -21.0060] }
        ],
        tip: 'Orden refinado: Þingvellir, Almannagjá, Geysir, Brú Horsefarm, Gullfoss, Kerið, Reykjadalur, Orkan Selfoss y Camping Selfoss.',
        wow: 'Reykjadalur convierte el Golden Circle en algo más que paradas rápidas: termal, montaña y vapor saliendo del valle.'
    },
    {
        day: 3, name: 'Costa Sur + Skógar', date: '03-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Camping Selfoss', coords: [63.9280, -21.0060] },
            { time: '⛽ Gas', icon: '⛽', title: 'N1 Hvolsvöllur', sub: 'Repostar, baños, café o snacks antes de continuar.', coords: [63.7529, -20.2243] },
            { time: 'Ruta', icon: '💧', title: 'Seljalandsfoss', coords: [63.6156, -19.9896] },
            { time: 'Ruta', icon: '💧', title: 'Gljúfrabúi', sub: 'Cascada escondida junto a Seljalandsfoss.', coords: [63.6210, -19.9848] },
            { time: 'Ruta', icon: '🌊', title: '⭐ Skógafoss', star: true, coords: [63.5322, -19.5114] },
            { time: 'Pausa', icon: '☕', title: 'Skógar', sub: 'Almuerzo, café, baños o descanso.', coords: [63.5269, -19.5060] },
            { time: 'Noche', icon: '🏕️', title: 'Skógar Campsite', sub: 'Instalarse temprano y preparar el equipo del glaciar.', coords: [63.5277, -19.5120] }
        ],
        tip: 'Orden refinado: Camping Selfoss, N1 Hvolsvöllur, Seljalandsfoss, Gljúfrabúi, Skógafoss, Skógar y Skógar Campsite.',
        wow: 'Seljalandsfoss, Gljúfrabúi y Skógafoss en el mismo día: este es el primer bloque grande de cascadas.'
    },
    {
        day: 4, name: 'Tröll Skaftafell + Jökulsárlón + bote', date: '04-sept-2026',
        critical: true,
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Skógar Campsite', coords: [63.5277, -19.5120] },
            { time: '⛽ Rápido', icon: '⛽', title: 'N1 Kirkjubæjarklaustur', sub: 'Repostar breve y continuar; actividad con horario fijo.', coords: [63.7897, -18.0630] },
            { time: '09:30', icon: '🥾', title: '⭐ Tröll Expeditions Skaftafell', sub: 'Tour guiado Tröll Skaftafell, duración 3 h.', star: true, crit: true, coords: [64.0167, -16.9667], review: 'troll-skaftafell' },
            { time: 'Almuerzo', icon: '🧊', title: 'Jökulsárlón', sub: 'Laguna, icebergs y comida antes del bote.', coords: [64.0481, -16.1794] },
            { time: 'Después', icon: '🅿️', title: 'Jökulsárlón Glacier Lagoon Parking', coords: [64.0478, -16.1782] },
            { time: '15:50', icon: '🚤', title: '⭐ Glacier Lagoon Trip Boat', sub: 'Paseo en bote reservado.', star: true, crit: true, coords: [64.0481, -16.1794] },
            { time: 'Después', icon: '💎', title: '⭐ Diamond Beach', star: true, coords: [64.0393, -16.1869] },
            { time: 'Noche', icon: '🏕️', title: 'Skaftafell Campground', sub: 'Regresar, cenar, ducharse y descansar.', coords: [64.0100, -16.9800] }
        ],
        tip: 'La parada en N1 Kirkjubæjarklaustur debe ser rápida: Tröll Skaftafell dura 3 h y el bote de Jökulsárlón está reservado para las 15:50.',
        wow: 'Jökulsárlón + bote + Diamond Beach es el centro emocional del viaje: hielo azul, laguna glaciar y arena negra en una sola tarde.'
    },
    {
        day: 5, name: 'Höfn + termales + Vestrahorn', date: '05-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Skaftafell Campground', coords: [64.0100, -16.9800] },
            { time: '⛽ Höfn', icon: '⛽', title: 'N1 Höfn', sub: 'Repostar, baños y revisar aire de llantas si hace falta.', coords: [64.2520, -15.2080] },
            { time: 'Compras', icon: '🛒', title: 'Nettó', sub: 'Comida, agua, snacks y provisiones.', coords: [64.2530, -15.2090] },
            { time: 'Termal', icon: '♨️', title: 'Hoffell Hot Tubs', sub: 'Baño termal con vistas a las montañas.', coords: [64.3970, -15.3420] },
            { time: 'Acceso', icon: '☕', title: 'Viking Cafe & Guesthouse', sub: 'Comprar acceso a Stokksnes; café o comida opcional.', coords: [64.2490, -14.9720] },
            { time: 'Ruta', icon: '⛰️', title: '⭐ Vestrahorn', star: true, coords: [64.2440, -14.9650] },
            { time: 'Ruta', icon: '🪞', title: 'Stokksnes Mirror Beach', coords: [64.2468, -14.9600] },
            { time: 'Ruta', icon: '🎬', title: '⭐ Viking Village Film Set', star: true, coords: [64.2478, -14.9580] },
            { time: 'Noche', icon: '🏕️', title: 'Vestrahorn Camping', coords: [64.2480, -14.9820] }
        ],
        tip: 'Orden refinado: Skaftafell, N1 Höfn, Nettó, Hoffell Hot Tubs, Viking Cafe, Vestrahorn, Mirror Beach, Viking Village y Vestrahorn Camping.',
        wow: 'Vestrahorn es la montaña dramática; Stokksnes es el espejo; el Viking Village Film Set es el detalle cinematográfico que faltaba.'
    },
    {
        day: 6, name: 'Fjaðrárgljúfur + Vík + Dyrhólaey', date: '06-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Vestrahorn Camping', coords: [64.2480, -14.9820] },
            { time: 'Ruta', icon: '☕', title: 'Kirkjubæjarklaustur', coords: [63.7897, -18.0630] },
            { time: 'Cañón', icon: '🏞️', title: '⭐ Fjaðrárgljúfur', star: true, coords: [63.7715, -18.1718] },
            { time: '⛽ Vík', icon: '⛽', title: 'Orkan Vík', sub: 'Repostar antes de Reynisfjara y Dyrhólaey.', coords: [63.4186, -19.0060] },
            { time: 'Ruta', icon: '🏖️', title: '⭐ Reynisfjara Beach', star: true, coords: [63.4062, -19.0442] },
            { time: 'Ruta', icon: '🪨', title: 'Dyrhólaey', coords: [63.4031, -19.1288] },
            { time: 'Opcional', icon: '🌋', title: 'LAVA Centre', sub: 'Museo interactivo sobre volcanes si queda energía.', coords: [63.7532, -20.2241] },
            { time: 'Noche', icon: '🏕️', title: 'Hvolsvöllur Camp Site', sub: 'Última noche: cenar, ducharse, ordenar y limpiar la camper.', coords: [63.7529, -20.2243] }
        ],
        tip: 'Día largo. El nuevo orden mete Fjaðrárgljúfur antes de Vík; luego Orkan Vík, Reynisfjara, Dyrhólaey, LAVA Centre opcional y Hvolsvöllur.',
        wow: 'El regreso por la Costa Sur repite paisajes con otra luz: Fjaðrárgljúfur, Reynisfjara y Dyrhólaey hacen un cierre fuerte.'
    },
    {
        day: 7, name: 'Regreso a Washington', date: '07-sept-2026',
        stops: [
            { time: 'Salida', icon: '🏕️', title: 'Hvolsvöllur Camp Site', coords: [63.7529, -20.2243] },
            { time: '⛽ Final', icon: '⛽', title: 'Orkan Fitjar, Reykjanesbær', sub: 'Llenar completamente el tanque y guardar el recibo.', coords: [63.9980, -22.5630] },
            { time: '12:00', icon: '🔑', title: 'Go Campers Iceland', sub: 'Entregar la camper y completar inspección final.', coords: [63.9920, -22.5500] },
            { time: 'KEF', icon: '🛂', title: 'Aeropuerto Internacional de Keflavík', sub: 'Check-in, seguridad y comida antes del vuelo.', coords: [63.9850, -22.6056] },
            { time: '16:50', icon: '🛫', title: 'Icelandair FI645', sub: 'Salida de Keflavík hacia Washington.' },
            { time: '19:20', icon: '🛬', title: 'Llegada a Washington' }
        ],
        tip: 'Orden refinado: Hvolsvöllur, Orkan Fitjar para llenar tanque, Go Campers 12:00, aeropuerto de Keflavík y FI645 16:50.',
        wow: 'Última mirada a Islandia antes de despegar: lava negra, costa y Atlántico Norte en la memoria.'
    }
];

let jarvisActiveDay = 0;
let jarvisMap = null;
let jarvisMarkers = [];
let jarvisStopMarkers = [];
let jarvisDayRoute = null;
let selectedStopMarker = null;
let jarvisTipTimer = null;
let lastJarvisTrigger = null;

function makePinIcon(s, selected) {
    const dotClass = ['j-pin-dot', s.star ? 'j-pin-star' : '', s.crit ? 'j-pin-crit' : ''].filter(Boolean).join(' ');
    const subHtml = s.sub ? `<small>${s.sub}</small>` : '';
    if (selected) {
        const selClass = s.crit ? 'j-pin-sel j-pin-crit-sel' : 'j-pin-sel';
        return L.divIcon({
            className: '',
            html: `<div class="j-pin ${selClass}"><div class="j-pin-caret">▼</div><div class="j-pin-dot-wrap"><span class="j-ring j-ring-1"></span><span class="j-ring j-ring-2"></span><div class="${dotClass}">${s.icon}</div></div><div class="j-pin-time">${s.time}</div></div>`,
            iconSize: [36, 68],
            iconAnchor: [18, 36],
            popupAnchor: [0, -38]
        });
    }
    return L.divIcon({
        className: '',
        html: `<div class="j-pin"><div class="${dotClass}">${s.icon}</div><div class="j-pin-time">${s.time}</div></div>`,
        iconSize: [36, 46],
        iconAnchor: [18, 15],
        popupAnchor: [0, -16]
    });
}

function selectStopMarker(marker, s) {
    if (selectedStopMarker && selectedStopMarker !== marker) {
        selectedStopMarker.setIcon(makePinIcon(selectedStopMarker._stopData, false));
    }
    selectedStopMarker = marker;
    marker.setIcon(makePinIcon(s, true));
    const markerPoint = marker.getLatLng();
    const detailZoom = smallScreenQuery.matches ? 15 : 16;
    jarvisMap.flyTo(markerPoint, detailZoom, {
        animate: !reduceMotionQuery.matches,
        duration: reduceMotionQuery.matches ? 0 : 1
    });
}

function jarvisMarkerIcon(idx, isActive) {
    const d = jarvisData[idx];
    const cls = [
        'j-jmarker',
        isActive ? 'j-jmarker-active' : '',
        isActive && d.critical ? 'j-jmarker-crit' : ''
    ].filter(Boolean).join(' ');
    const size = isActive ? 34 : 26;
    return L.divIcon({
        className: '',
        html: `<span class="${cls}">${d.markerLabel || d.day}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -20]
    });
}

function renderJarvisDay(idx) {
    const d = jarvisData[idx];
    const body = document.getElementById('jarvisBody');
    body.scrollTop = 0;
    const dayLabel = d.label || `DÍA ${d.day}`;

    const stopsHtml = d.stops.map((s, stopIndex) => {
        const clickable = s.coords ? ' j-entry-clickable' : '';
        const coordsAttr = s.coords ? ` data-lat="${s.coords[0]}" data-lng="${s.coords[1]}" data-stop-index="${stopIndex}"` : '';
        const entryClass = ['j-entry', s.star ? 'star' : '', s.crit ? 'crit-stop' : ''].filter(Boolean).join(' ') + clickable;
        const titleClass = s.star ? 'j-entry-title star-title' : 'j-entry-title';
        const subHtml = s.sub ? `<div class="j-entry-sub">${s.sub}</div>` : '';
        const entryContent = `<div class="j-entry-top"><span class="j-time">${s.time}</span><div class="j-entry-content"><div class="${titleClass}">${s.icon} ${s.title}</div>${subHtml}</div></div>`;
        if (!s.coords) return `<div class="${entryClass}">${entryContent}</div>`;
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.coords[0]},${s.coords[1]}`;
        const reviewKey = getStopReviewKey(s);
        const reviewAction = reviewKey ? `<button class="j-review-action" type="button" data-review="${escapeHtml(reviewKey)}">Review</button>` : '';
        return `<div class="${entryClass}">
            <button class="j-entry-map" type="button"${coordsAttr} aria-label="Ver ${s.title.replace('⭐ ', '')} en el mapa">${entryContent}</button>
            <div class="j-entry-actions">${reviewAction}<a class="j-navigate" href="${directionsUrl}" target="_blank" rel="noopener">Navegar ↗</a></div>
        </div>`;
    }).join('');

    const critLabel = d.critical
        ? '<span style="font-size:11px;font-weight:800;color:#ffb060;letter-spacing:.08em;text-transform:uppercase;font-family:monospace;">⚡ DÍA CRÍTICO</span>'
        : '';

    body.innerHTML = `
<div class="j-day-title">
  <span class="j-day-num">${dayLabel}</span>
  <span class="j-day-name">${d.name}</span>
  ${critLabel}
  <span class="j-day-date">${d.date}</span>
</div>
<div class="j-timeline">${stopsHtml}</div>
<div class="j-tip">
  <div class="j-tip-label">🧠 JARVIS</div>
  <div class="j-tip-text" id="jarvisTipText"></div>
</div>
<div class="j-wow">
  <div class="j-wow-label">💥 SENSACIÓN WOW</div>
  <div class="j-wow-text">${d.wow}</div>
</div>`;

    body.querySelectorAll('.j-entry-map').forEach((el) => {
        el.addEventListener('click', () => {
            if (!jarvisMap) return;
            const stopIndex = Number(el.dataset.stopIndex);
            const match = jarvisStopMarkers.find((m) => m._stopIndex === stopIndex);
            if (match) {
                selectStopMarker(match, match._stopData);
                setTimeout(() => match.openPopup(), 800);
            }
        });
    });

    if (jarvisTipTimer) clearInterval(jarvisTipTimer);
    let i = 0;
    const text = d.tip;
    const tipEl = document.getElementById('jarvisTipText');
    if (reduceMotionQuery.matches) {
        tipEl.textContent = text;
        return;
    }
    tipEl.textContent = '';
    jarvisTipTimer = setInterval(() => {
        tipEl.textContent += text[i++];
        if (i >= text.length) {
            clearInterval(jarvisTipTimer);
            jarvisTipTimer = null;
        }
    }, 18);
}

function clearDayMarkers() {
    jarvisStopMarkers.forEach((m) => m.remove());
    jarvisStopMarkers = [];
    if (jarvisDayRoute) { jarvisDayRoute.remove(); jarvisDayRoute = null; }
    selectedStopMarker = null;
}

function distanceKm(a, b) {
    const radiusKm = 6371;
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function maxSpreadKm(coords) {
    let max = 0;
    coords.forEach((coord, index) => {
        coords.slice(index + 1).forEach((candidate) => {
            max = Math.max(max, distanceKm(coord, candidate));
        });
    });
    return max;
}

function findTightCluster(stops) {
    if (stops.length < 3) return null;
    let bestCluster = null;
    const clusterRadiusKm = 2.6;

    stops.forEach((stop) => {
        const cluster = stops.filter((candidate) => distanceKm(stop.coords, candidate.coords) <= clusterRadiusKm);
        if (cluster.length >= 3 && (!bestCluster || cluster.length > bestCluster.length)) {
            bestCluster = cluster;
        }
    });

    if (!bestCluster || bestCluster.length === stops.length) return null;
    return bestCluster;
}

function coordKey(coords) {
    return `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
}

function displayCoordsForStop(stop, index, total) {
    if (total <= 1) return stop.coords;
    const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
    const radius = 0.00042;
    return [
        stop.coords[0] + Math.sin(angle) * radius,
        stop.coords[1] + Math.cos(angle) * radius
    ];
}

function buildPlottedStops(stops) {
    const counts = new Map();
    stops.forEach((stop) => {
        const key = coordKey(stop.coords);
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    const seen = new Map();
    return stops.map((stop) => {
        const key = coordKey(stop.coords);
        const index = seen.get(key) || 0;
        seen.set(key, index + 1);
        return {
            stop,
            coords: displayCoordsForStop(stop, index, counts.get(key))
        };
    });
}

function drawDayMarkers(idx) {
    const d = jarvisData[idx];
    const dayColor = d.critical ? '#ffb060' : '#77d8ff';
    const stopsWithCoords = d.stops.filter((s) => s.coords);
    const plottedStops = buildPlottedStops(stopsWithCoords);

    if (stopsWithCoords.length > 1) {
        jarvisDayRoute = L.polyline(stopsWithCoords.map((s) => s.coords), {
            color: dayColor, weight: 2.5, opacity: .7, dashArray: '6 5', lineJoin: 'round'
        }).addTo(jarvisMap);
    }

    plottedStops.forEach(({ stop: s, coords }) => {
        const marker = L.marker(coords, { icon: makePinIcon(s, false) }).addTo(jarvisMap);
        marker._stopData = s;
        marker._baseCoords = s.coords;
        marker._stopIndex = d.stops.indexOf(s);
        const subHtml = s.sub ? `<small>${s.sub}</small>` : '';
        const reviewKey = getStopReviewKey(s);
        const reviewHtml = reviewKey ? `<br><button class="j-popup-review" type="button" data-review="${escapeHtml(reviewKey)}">Ver review</button>` : '';
        marker.bindPopup(`<strong>${s.icon} ${s.title}</strong>${subHtml ? '<br>' + subHtml : ''}${reviewHtml}`);
        marker.on('click', () => { selectStopMarker(marker, s); setTimeout(() => marker.openPopup(), 600); });
        jarvisStopMarkers.push(marker);
    });

    if (stopsWithCoords.length) {
        const clusterStops = findTightCluster(stopsWithCoords);
        const viewportStops = clusterStops || stopsWithCoords;
        const viewportCoords = plottedStops
            .filter(({ stop }) => viewportStops.includes(stop))
            .map(({ coords }) => coords);
        const bounds = L.latLngBounds(viewportCoords);
        const isMobile = window.innerWidth <= 640;
        const clusterZoom = isMobile ? 15 : 16;
        const canUseDetailZoom = clusterStops && maxSpreadKm(viewportCoords) <= .8;
        if (canUseDetailZoom) {
            jarvisMap.flyTo(bounds.getCenter(), clusterZoom, {
                animate: !reduceMotionQuery.matches,
                duration: reduceMotionQuery.matches ? 0 : .9
            });
        } else {
            jarvisMap.flyToBounds(bounds, {
                padding: clusterStops ? (isMobile ? [54, 54] : [92, 92]) : (isMobile ? [32, 32] : [60, 60]),
                maxZoom: clusterStops ? clusterZoom : 12,
                animate: !reduceMotionQuery.matches,
                duration: reduceMotionQuery.matches ? 0 : .9
            });
        }
    }
}

function switchJarvisDay(idx) {
    jarvisActiveDay = idx;
    document.querySelectorAll('.j-tab').forEach((tab, i) => {
        const active = i === idx;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    if (jarvisMarkers.length) {
        jarvisMarkers.forEach((m, i) => {
            if (m) {
                m.marker.setIcon(jarvisMarkerIcon(i, i === idx));
            }
        });
    }
    clearDayMarkers();
    if (jarvisMap) drawDayMarkers(idx);
    renderJarvisDay(idx);
}

function buildJarvisUI() {
    const tabs = document.getElementById('jarvisTabs');
    if (!tabs.children.length) {
        tabs.innerHTML = jarvisData.map((d, i) => {
            const critClass = d.critical ? ' j-tab-crit' : '';
            const tabLabel = d.tab || `DÍA ${d.day}`;
            return `<button class="j-tab${critClass}" type="button" role="tab" aria-selected="false" tabindex="-1" data-idx="${i}">${tabLabel}</button>`;
        }).join('');
        tabs.querySelectorAll('.j-tab').forEach((t) => {
            t.addEventListener('click', () => switchJarvisDay(+t.dataset.idx));
            t.addEventListener('keydown', (event) => {
                if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                let next = +t.dataset.idx;
                if (event.key === 'ArrowRight') next = Math.min(next + 1, jarvisData.length - 1);
                if (event.key === 'ArrowLeft') next = Math.max(next - 1, 0);
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = jarvisData.length - 1;
                switchJarvisDay(next);
                tabs.querySelector(`[data-idx="${next}"]`)?.focus();
            });
        });

        document.getElementById('jarvisSidebarToggle').addEventListener('click', () => {
            const sb = document.getElementById('jarvisSidebar');
            const hidden = sb.classList.toggle('j-hidden');
            const isMobile = window.innerWidth <= 640;
            document.getElementById('jarvisSidebarToggle').textContent = isMobile
                ? (hidden ? '▲' : '▼')
                : (hidden ? '▶' : '◀');
            document.getElementById('jarvisTabs').classList.toggle('j-tabs-expanded', hidden);
            if (jarvisMap) setTimeout(() => jarvisMap.invalidateSize(), 320);
        });
    }

    if (!jarvisMap && window.L) {
        jarvisMap = L.map('jarvisMap', {
            zoomControl: !smallScreenQuery.matches,
            scrollWheelZoom: false,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: false,
            tap: true,
            attributionControl: true
        });
        addBaseMap(jarvisMap, 'street');
        L.polyline(routeLine.slice(0, returnRouteStartIndex + 1), { color: '#0f766e', weight: 3, opacity: .82, lineJoin: 'round' }).addTo(jarvisMap);
        L.polyline(routeLine.slice(returnRouteStartIndex), { color: '#475569', weight: 2, opacity: .5, dashArray: '6 8' }).addTo(jarvisMap);
        jarvisMarkers = jarvisData.map((d, i) => {
            const stop = routeStops.find((s) => s.day === d.day);
            if (!stop) {
                return null;
            }
            const marker = L.marker(stop.coords, { icon: jarvisMarkerIcon(i, false) }).addTo(jarvisMap);
            marker.on('click', () => switchJarvisDay(i));
            return { marker, coords: stop.coords };
        });
        jarvisMap.fitBounds(L.latLngBounds(routeLine), { padding: [24, 24] });
    } else if (!window.L) {
        document.getElementById('jarvisMap').innerHTML = '<p class="j-map-fallback">Mapa no disponible sin conexión.</p>';
    }
    if (jarvisMap) setTimeout(() => jarvisMap.invalidateSize(), 60);
}

const jarvisOverlay = document.getElementById('jarvisOverlay');
const jarvisPanel = jarvisOverlay?.querySelector('.j-panel');

function setPageInert(inert) {
    document.querySelectorAll('.site-header, main, .site-footer').forEach((element) => {
        element.inert = inert;
    });
}

function openJarvis(event) {
    if (!jarvisOverlay || !jarvisPanel) return;
    lastJarvisTrigger = event?.currentTarget || document.activeElement;
    jarvisActiveDay = 0;
    jarvisOverlay.classList.add('active');
    jarvisOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setPageInert(true);
    buildJarvisUI();
    switchJarvisDay(0);
    requestAnimationFrame(() => jarvisPanel.focus());
}

function closeJarvis() {
    if (!jarvisOverlay) return;
    jarvisOverlay.classList.remove('active');
    jarvisOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setPageInert(false);
    if (jarvisTipTimer) {
        clearInterval(jarvisTipTimer);
        jarvisTipTimer = null;
    }
    if (lastJarvisTrigger instanceof HTMLElement) lastJarvisTrigger.focus();
}

document.querySelectorAll('[data-jarvis-open]').forEach((button) => {
    button.addEventListener('click', openJarvis);
});
document.getElementById('jarvisClose')?.addEventListener('click', closeJarvis);

document.addEventListener('keydown', (e) => {
    if (!jarvisOverlay?.classList.contains('active')) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        closeJarvis();
    }
    if (e.key !== 'Tab' || !jarvisPanel) return;

    const focusable = [...jarvisPanel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => !element.closest('[aria-hidden="true"]'));
    if (!focusable.length) {
        e.preventDefault();
        jarvisPanel.focus();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
});
