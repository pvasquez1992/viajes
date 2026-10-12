# BookTrip: chat flotante
BookTrip mantiene su libro en HTML/JavaScript y Cloudflare Pages. El chat se abre
y se oculta sobre cualquier página; no hay pantalla de borradores ni pasos por
GitHub. El antiguo enlace /assistant/ abre ahora el chat sobre la portada.

## Uso y permisos
La cuenta configurada en BOOKTRIP_CREATOR_EMAIL es el administrador inicial
protegido. El panel **Permisos**, en la cabecera del chat, permite administrar
roles y asignar edición por viaje sin pasar por la IA. Los roles se guardan
por correo completo en `booktrip_users`: Administrador gestiona los viajes de D1
y los permisos; Creador crea y puede editar/eliminar sus propios viajes; Lector
consulta. Todos siguen necesitando entrar por Cloudflare Access.

`booktrip_trip_access` permite conceder edición a un correo en un viaje concreto.
Ese editor puede modificar el viaje, pero no eliminarlo ni crear otros si su rol
general es Lector. Al retirar la edición vuelve a lectura; el propietario y los
administradores conservan sus derechos según su rol. Los ocho viajes HTML se
migran a D1 con ID/propietario, manteniendo sus carpetas, enlaces y páginas
originales. El panel incluye esos viajes y las entradas creadas desde el chat.
Los JSON estáticos revisados que todavía no se importen siguen en lectura.

El servidor usa el JWT verificado, el rol vigente y el ID/propietario del viaje;
no acepta roles del navegador ni cabeceras de correo sin verificar. Los permisos
se comprueban al cargar contexto y otra vez en SQL al escribir, incluso si fueron
retirados durante la inferencia. Los recibos y tokens anteriores no recuperan un
permiso revocado. Un administrador que edita no cambia el propietario original.
Cada viaje ya tiene ID: no es secreto y no constituye autorización. El modelo
produce únicamente datos validados; no modifica el DOM, HTML, CSS ni plantillas.

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
reemplazar cambios más recientes. Repetir la misma solicitud de guardado recupera su respuesta
sin crear otra entrada ni volver a llamar al modelo.
Puedes empezar una conversación nueva, pedir «¿Qué viajes tengo?» y después
«Quiero cambiar Boston». El chat consulta el catálogo real y carga el documento
guardado, sin crear una copia. Un cambio concreto como «En Boston añade una pausa»
puede cargarlo y ajustarlo en el mismo turno. Si hay varios candidatos, pregunta
cuál. Consultar o seleccionar no escribe ningún viaje.
Los viajes HTML migrados conservan sus enlaces y aspecto originales mientras
no cambian sus datos. Tras editar uno, su enlace abre el lector actualizado;
**Ver página original conservada** mantiene acceso a la versión HTML anterior.
Las actividades, notas de logística y reservas se extraen sin inventar tiempos
o compromisos. Italia y Suiza se importan como estaban: fechas y jornadas vacías.

Para eliminar una entrada creada desde el chat, pide «Elimina el viaje a Boston».
Se muestra su nombre y fechas con **Eliminar viaje** y **Cancelar**. La petición
inicial no borra nada: solo el botón confirma. La confirmación está firmada,
ligada a usuario/viaje/versión y vence a los diez minutos. Si el viaje cambió,
debe solicitarse otra confirmación. Reintentar un botón ya ejecutado es idempotente.
Una orden explícita con nombre inequívoco prepara el botón directamente en el
servidor; no depende de que la IA pida confirmar solo mediante texto.
La portada se actualiza al completar la eliminación, sin recargar manualmente.
Eliminar mueve el viaje a **Eliminados**, sin borrar su documento ni los archivos
HTML, JS, imágenes o carpeta. `/eliminados/` lista los viajes archivados que
puede gestionar el usuario (administrador: todos; creador: propios), permite
abrirlos y restaurarlos con el mismo ID y permisos. Los originales migrados se
consultan en `/eliminados/originales/<id>/`; los enlaces públicos anteriores
devuelven 410 mientras el viaje esté archivado. No hay borrado definitivo.

## Almacenamiento y API
Las entradas nuevas se guardan en una base Cloudflare D1 privada, con el binding
BOOKTRIP_DB. migrations/0001_booktrip.sql crea las tablas de viajes y respuestas
de guardado. Cada guardado y su respuesta se escriben en una transacción.
`migrations/0002_booktrip_removals.sql` añade marcadores de eliminación. La baja
retira el viaje del catálogo y bloquea su lectura y modificación, conservando el
documento original privado para recuperación manual. Los reintentos y contextos
anteriores no pueden restaurarlo. `0004_booktrip_legacy_archive.sql` añade el
registro de páginas originales y la generación de cada viaje. Restaurar solo
retira el marcador de baja e incrementa esa generación: contextos y confirmaciones
anteriores no pueden modificar ni volver a archivar la entrada restaurada.
El importador idempotente `scripts/import-legacy.mjs` exige el catálogo completo,
un propietario verificado y una extracción privada revisada; nunca sobreescribe
un viaje editado ni reactiva uno eliminado. No se publica esa extracción.

- GET /api/booktrip/config: identidad y capacidades; no devuelve claves.
- POST /api/booktrip/chat: conversación y guardado según rol y permiso por viaje.
- POST /api/booktrip/remove: eliminación confirmada por creador/administrador con token específico.
- GET /api/booktrip/archive: carpeta Eliminados, según derechos de propietario/administrador.
- GET /api/booktrip/archive/<id>: datos de una entrada archivada autorizada.
- POST /api/booktrip/restore: restauración firmada ligada a actor/ID/generación/baja;
  la respuesta perdida puede reintentarse sin duplicar ni cambiar el ID.
- GET /api/booktrip/admin: usuarios, roles y viajes con editores; solo administradores.
- POST /api/booktrip/admin: asignar rol (`action: role`) o conceder/retirar edición
  (`action: trip-access`, `permission: edit/view`); solo administradores y mismo origen.
- GET /api/booktrip/trips: catálogo completo (antiguos, estáticos y D1) para usuarios autenticados.
- GET /api/booktrip/trips/<id>: itinerario para usuarios autenticados.
- /trips/<id>/: página compartida del viaje guardado, protegida por Access y JWT.
- POST /api/booktrip/publish: retirado; no crea PR ni escribe en GitHub.

Los documentos nuevos NO se guardan en el repositorio público. No hay token de
GitHub en este flujo. server/booktrip/github.js conserva la utilidad anterior,
sin conexión desde la API. El generador estático aún admite JSON revisado en el
repositorio, pero las entradas creadas desde el chat permanecen en D1.

`js/trip-library.js` contiene el catálogo antiguo compartido con la portada.
`server/booktrip/library.js` lo combina con `/trips/catalog.json` mediante ASSETS
y con D1, sin duplicar enlaces. El servidor entrega esta lista al modelo en cada
turno. La IA solicita listar/seleccionar/editar; el código ejecuta esas acciones,
construye los enlaces reales y comprueba permisos antes de cargar un viaje para
editar. Si falla la lectura del catálogo, no inventa que el libro esté vacío.
La selección firma la versión leída; el guardado conserva las comprobaciones de
concurrencia e idempotencia. Seleccionar un viaje de solo lectura retira el anterior
del contexto para evitar aplicar cambios por error a otro viaje.

## Cloudflare
Mantener Access, GARMIN_API y las variables existentes de ejercicio. Configurar
producción por separado de los previews; no copiar sus claves ni su base de datos.

| Nombre | Tipo | Uso |
| --- | --- | --- |
| AI | Binding Workers AI | Modelo alojado. |
| BOOKTRIP_DB | Binding D1 | Base privada de viajes. |
| BOOKTRIP_CREATOR_EMAIL | Variable existente | Administrador inicial protegido. Los demás roles viven en D1. |
| BOOKTRIP_DRAFT_SECRET | Secreto existente, 32+ caracteres | Firma de continuidad del chat. |
| ACCESS_TEAM_DOMAIN, ACCESS_AUD | Variables existentes | Verificar JWT de Access. |
| BOOKTRIP_AI_MODEL | Variable opcional | Por defecto @cf/meta/llama-3.3-70b-instruct-fp8-fast. |
| BOOKTRIP_SEARCH_KEY | Secreto opcional | Investigación mediante Tavily. |

Aplicar migrations/0001_booktrip.sql, migrations/0002_booktrip_removals.sql y
migrations/0003_booktrip_permissions.sql y migrations/0004_booktrip_legacy_archive.sql,
añadir el binding y redesplegar.
La tercera añade tablas de roles y edición, sin alterar documentos de viaje.
Registrar el administrador inicial y los creadores por correo completo en D1;
no guardar el listado de correos personales en el repositorio público. `user_id`
se enlaza al identificador verificado al iniciar sesión. Para entradas anteriores,
puede enlazarse al creador original al migrar si su identidad fue comprobada.
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
`node scripts/preview-assistant.mjs --demo --seed-library` añade un Boston FICTICIO
al catálogo de prueba en SQLite local, para comprobar listado y selección.
`--seed-library` también puede usarse con inferencia real y almacenamiento local.

## Límites
Las consultas de permisos distinguen los viajes visibles de los editables y
eliminables. «Qué viajes puedo ajustar» se filtra en servidor con los permisos
actuales; el rol Creador no concede edición sobre viajes ajenos. Las listas
generales marcan la lectura, y config informa canEdit para el saludo. El backend
vuelve a comprobar permisos al escribir, independientemente de texto o controles.

Hasta 31 días, 32 actividades por jornada y 20 mensajes por conversación; JSON validado de 60.000 caracteres
máximo. La IA no compra ni reserva; no afirma investigar si falta búsqueda.
Una jornada puede quedar vacía y una duración desconocida puede ser null.
Para editar documentos grandes, el modelo devuelve cambios acotados y el
servidor conserva las jornadas, notas y reservas no afectadas; así no debe
regenerar todo un itinerario extenso para cambiar una descripción.
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
[Workers AI en Pages](https://developers.cloudflare.com/pages/functions/bindings/#workers-ai),
[modelo Llama alojado](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/).
