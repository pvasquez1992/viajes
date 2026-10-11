# BookTrip: chat flotante
BookTrip mantiene su libro en HTML/JavaScript y Cloudflare Pages. El chat se abre
y se oculta sobre cualquier página; no hay pantalla de borradores ni pasos por
GitHub. El antiguo enlace /assistant/ abre ahora el chat sobre la portada.

## Uso y permisos
Por ahora, solo la cuenta configurada en BOOKTRIP_CREATOR_EMAIL puede crear y
modificar viajes. El servidor compara el correo COMPLETO del JWT verificado de
Cloudflare Access; no acepta permisos enviados por el cliente ni cabeceras de
correo sin verificar. Los demás usuarios autorizados por Access pueden consultar
el libro y sus entradas, pero no ven controles de creación y la API deniega
sus solicitudes de escritura antes de llamar a la IA.
La regla está centralizada en server/booktrip/access.js (canCreate), para poder
sustituirla más adelante por roles y permisos. No hay editor de roles todavía.

1. Abre la burbuja y describe destino, fechas y preferencias.
2. Si falta información, la IA pregunta en el mismo chat.
3. Cuando genera un itinerario válido, el servidor lo guarda directamente en D1.
   El chat confirma el guardado y muestra Abrir viaje; la portada carga la entrada
   sin esperar un commit ni un despliegue.
4. Los mensajes posteriores ajustan ese mismo viaje dentro de la conversación.
5. Nueva conversación empieza otro viaje; el anterior permanece en el libro.

Los mensajes y el contexto se conservan en sessionStorage por identidad y pestaña.
Cerrar o recargar no borra las entradas guardadas en Cloudflare, pero cerrar la
pestaña termina la conversación. La continuidad está firmada y ligada al usuario,
con vencimiento de 24 horas. La firma no cifra el contenido. Las ediciones deben
coincidir con la versión anterior guardada: una pestaña desactualizada no puede
reemplazar cambios más recientes. Repetir la misma solicitud recupera su respuesta
sin crear otra entrada ni volver a llamar al modelo.
Por ahora, para editar conversando se necesita la conversación que creó el viaje;
seleccionar cualquier viaje antiguo como contexto será una mejora posterior.

## Almacenamiento y API
Las entradas nuevas se guardan en una base Cloudflare D1 privada, con el binding
BOOKTRIP_DB. migrations/0001_booktrip.sql crea las tablas de viajes y respuestas
de guardado. Cada guardado y su respuesta se escriben en una transacción.
Los ocho viajes anteriores siguen en sus páginas y no se migran.

- GET /api/booktrip/config: identidad y capacidades; no devuelve claves.
- POST /api/booktrip/chat: conversación del creador y guardado directo.
- GET /api/booktrip/trips: catálogo de entradas nuevas para usuarios autenticados.
- GET /api/booktrip/trips/<id>: itinerario para usuarios autenticados.
- /trips/<id>/: página compartida del viaje guardado, protegida por Access y JWT.
- POST /api/booktrip/publish: retirado; no crea PR ni escribe en GitHub.

Los documentos nuevos NO se guardan en el repositorio público. No hay token de
GitHub en este flujo. server/booktrip/github.js conserva la utilidad anterior,
sin conexión desde la API. El generador estático aún admite JSON revisado en el
repositorio, pero las entradas creadas desde el chat permanecen en D1.

## Cloudflare
Mantener Access, GARMIN_API y las variables existentes de ejercicio. Configurar
producción por separado de los previews; no copiar sus claves ni su base de datos.

| Nombre | Tipo | Uso |
| --- | --- | --- |
| AI | Binding Workers AI | Modelo alojado. |
| BOOKTRIP_DB | Binding D1 | Base privada de viajes. |
| BOOKTRIP_CREATOR_EMAIL | Variable | Único correo autenticado que puede escribir. |
| BOOKTRIP_DRAFT_SECRET | Secreto existente, 32+ caracteres | Firma de continuidad del chat. |
| ACCESS_TEAM_DOMAIN, ACCESS_AUD | Variables existentes | Verificar JWT de Access. |
| BOOKTRIP_AI_MODEL | Variable opcional | Por defecto @cf/meta/llama-3.3-70b-instruct-fp8-fast. |
| BOOKTRIP_SEARCH_KEY | Secreto opcional | Investigación mediante Tavily. |

Inicializar la base con migrations/0001_booktrip.sql, añadir el binding y redesplegar.
La implementación no contrata planes ni modifica la facturación automáticamente.

## Verificación local
Requiere Node 22 o posterior (Node 24 en este equipo para el adaptador SQLite local).
npm test comprueba JWT, permisos, validación, inyección, reintentos y guardado usando
SQLite en memoria y servicios ficticios. npm run build y npm run build:functions
preparan y comprueban el despliegue.
npm run demo:assistant inicia http://127.0.0.1:8790/?chat=open: ejemplo marcado como
demostración sin IA, guardado exclusivamente en SQLite local en memoria. No toca D1.
npm run preview:assistant requiere CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_AI_TOKEN:
inferencia real, pero almacenamiento LOCAL en memoria. Nunca publicar su servidor
de desarrollo ni sus credenciales. El build solo copia activos públicos permitidos.

## Límites
Hasta 14 días y 20 mensajes por conversación; JSON validado de 60.000 caracteres
máximo. La IA no compra ni reserva; no afirma investigar si falta búsqueda.
Sin BOOKTRIP_SEARCH_KEY, horarios, lugares y disponibilidad quedan por comprobar.
JARVIS ofrece enlaces a Google Maps, no mapas Mission Control ni trazados calculados.
No se añadió MCP. Garmin y Foundry continúan independientes.

## Presentación independiente del chat

La plantilla reutilizable vive en `templates/halloween/`: portada, boletos de
reservas, selector de días y momentos del día extraídos de Harpers Ferry.
`js/trip-presentation.js` elige el diseño para el lector; `js/roadbook.js` carga
los datos y solicita su presentación. No hay selección de plantilla en el chat,
en el prompt, en la API ni en el documento guardado. Cambiar el diseño permite
presentar los viajes existentes sin volver a generarlos ni escribir en D1.

El lector básico (`js/trip-view.js` y `css/roadbook.css`) siempre está disponible.
Un paquete inexistente, un módulo defectuoso o CSS que no carga activa esa vista;
la creación y edición por chat funcionan igualmente. El build admite que falte
el paquete opcional y solo copia los archivos de ejecución, excluyendo su README.
Para otra plantilla, registrar sus importaciones explícitas en el lector. La IA
no puede elegir rutas de módulos, HTML ni CSS. Ver `templates/halloween/README.md`.

La plantilla no copia las reservas reales de Halloween. Presenta las del propio
viaje cuando existen y respeta su estado, sin afirmar confirmaciones verificadas.
Conserva enlaces a Maps; aún no incorpora el mapa Mission Control del viaje original.

Referencias: [D1](https://developers.cloudflare.com/d1/worker-api/d1-database/),
[Workers AI en Pages](https://developers.cloudflare.com/pages/functions/bindings/#workers-ai).
