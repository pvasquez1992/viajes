# Plantilla Halloween · BookTrip

Diseño reutilizable extraído de `harpersferry2026`: portada editorial, boletos de
reservas, selector de días y actividades agrupadas por mañana, tarde y noche.
Contiene únicamente presentación. No incluye reservas, instrucciones de viaje
ni datos personales de Harpers Ferry. El viaje original conserva su página.

- `index.js`: renderiza datos válidos del contrato común de viajes.
- `theme.css`: portada y secciones compartidas.
- `tickets.css`: boletos, extraídos del diseño B y acotados a `.template-halloween`.
- `moments.css`: itinerario del diseño C, también acotado a `.template-halloween`.

El lector `js/trip-presentation.js` selecciona la plantilla predeterminada y carga
estos archivos. El chat, Workers AI, la API y el almacenamiento no importan este
módulo ni necesitan conocer plantillas. El JSON no incluye `templateId`, HTML ni
CSS. El campo existente `theme` describe la temática del viaje; no selecciona
su plantilla.

Si no existe una plantilla registrada, falta el módulo o no carga su CSS, el
lector utiliza `js/trip-view.js` y `css/roadbook.css`, siempre disponibles. El viaje
se puede crear, guardar, abrir y editar aunque este paquete no esté desplegado.
No se modifica el documento guardado al cambiar la presentación.

Para añadir otra plantilla, registrar un ID y sus importaciones explícitas en el
lector. No ejecutar rutas de módulos, HTML o estilos enviados por la IA.
El build copia solo los cuatro archivos de ejecución; este documento no se sirve
como activo web. Un paquete ausente no bloquea el build ni el chat.

Las reservas aportadas no se etiquetan como verificadas por el proveedor. Una
sección sin datos no inventa reservas. JARVIS mantiene enlaces a Google Maps:
el mapa Mission Control del viaje original requiere ubicaciones verificadas y
una implementación posterior; no se inventan coordenadas ni rutas.
