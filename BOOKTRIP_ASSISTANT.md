# BookTrip Assistant

Primera versión: crear un viaje conversando, revisar un borrador firmado y preparar
su incorporación al libro. Conserva HTML/JavaScript y Cloudflare Pages. Los viajes
existentes no se migran ni se reemplazan; Garmin continúa independiente.

## Flujo

1. El navegador se identifica mediante Cloudflare Access.
2. `GET /api/booktrip/config` informa de la identidad y las capacidades disponibles.
3. `POST /api/booktrip/chat` envía mensajes y, para editar, el token del borrador.
4. Workers AI pide aclaraciones o prepara el viaje completo con JSON Mode. El
   servidor valida fechas reales, cobertura de días, horarios, solapamientos,
   identificadores, enlaces y campos permitidos. Admite hasta 14 días.
5. El servidor firma el contenido con HMAC-SHA256, vinculado al usuario y con
   vencimiento de 24 horas. La firma evita publicar contenido alterado; **no cifra**
   el borrador. Mensajes y borrador se conservan en `sessionStorage`, por usuario y
   pestaña. Al cerrar la pestaña se pierde esa copia; se puede descargar el JSON.
6. El usuario revisa el contenido y solicita preparar la publicación.
7. `POST /api/booktrip/publish` comprueba firma, autor y confirmación. Crea una rama
   `booktrip/<id>-<digest>`, un único archivo `trips/<id>/trip.json` y un PR borrador.
   Repetir la misma solicitud reutiliza su PR. No integra ni despliega directamente.
8. Después de revisar e integrar el PR, el build genera `trips/<id>/index.html`,
   su JSON y `trips/catalog.json`. La portada incorpora automáticamente el viaje.

La IA interpreta y propone; no compra ni reserva, no modifica HTML arbitrario y
no recibe claves. La publicación solo crea viajes nuevos. Los viajes que ya
existen requieren una futura operación de edición con control de versiones.

## Interfaz

`/assistant/`: chat, mensajes de aclaración, borrador por momentos del día, tickets
compactos cuando hay reservas aportadas, descarga y confirmación de publicación.
La primera versión de JARVIS ofrece enlaces por lugar a Google Maps; **no implementa
todavía el mapa Mission Control ni rutas de carretera calculadas**. No inventa GPS.
Reservas `user-provided` son datos aportados, sin comprobar con el proveedor.

## Configuración de Cloudflare Pages

En el proyecto existente `viajes`, añadir a las funciones el binding Workers AI
llamado `AI`. Mantener las variables de Access y el service binding de Garmin.
Configurar por separado producción y previews; no copiar credenciales de producción
a previews no controlados. El código falla de forma explícita si falta configuración.

| Nombre | Tipo | Uso |
| --- | --- | --- |
| `AI` | Binding Workers AI | Inferencia alojada en Cloudflare. |
| `ACCESS_TEAM_DOMAIN` | Variable existente | Emisor de la identidad autenticada. |
| `ACCESS_AUD` | Variable existente | Audiencia del JWT de Access. |
| `BOOKTRIP_DRAFT_SECRET` | Secreto, mínimo 32 caracteres aleatorios | Firma de borradores. |
| `BOOKTRIP_AI_MODEL` | Variable opcional | Por defecto `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. |
| `BOOKTRIP_TIMEZONE` | Variable opcional | Fecha de referencia; por defecto `America/New_York`. |
| `BOOKTRIP_SEARCH_KEY` | Secreto opcional | API de búsqueda Tavily; hasta dos consultas por petición. |
| `BOOKTRIP_GITHUB_REPOSITORY` | Variable | Repositorio `propietario/nombre` que contiene BookTrip. |
| `BOOKTRIP_GITHUB_BRANCH` | Variable opcional | Rama base; por defecto `main`. |
| `BOOKTRIP_GITHUB_TOKEN` | Secreto | Token limitado al repositorio, Contents y Pull requests con escritura. |
| `BOOKTRIP_ALLOW_PUBLIC_SOURCE` | Variable opcional | `true` permite propuestas revisadas en un repositorio público. |

Un repositorio público expone el JSON publicado aunque la web esté detrás de Access.
Se exige revisión del contenido y, además, la habilitación explícita del servidor
para ese caso. No guardar códigos de reserva completos, PIN ni información personal
sensible. El token GitHub nunca debe aparecer en el navegador ni en el JSON del viaje.

La investigación web es independiente de la inferencia. Si no hay clave de búsqueda,
la interfaz indica que horarios, lugares y disponibilidad siguen pendientes de
verificar. Solo se admiten citas con URLs presentes en las fuentes obtenidas. Los
extractos de búsqueda no demuestran disponibilidad ni permiten confirmar reservas.

Workers AI y el proveedor de búsqueda tienen sus propios límites y facturación.
Esta implementación no contrata planes ni cambia automáticamente la facturación.

## Ejecutar localmente

Se requiere Node 22 o posterior. En este equipo el Node instalado globalmente es
18; se puede activar el portátil existente:

```powershell
$env:Path = 'C:\myGarming\myGarming\.tools\node-v24.21.0-win-x64;' + $env:Path
Set-Location C:\myGarming\viajes
npm test
npm run build
npm run build:functions
npm run demo:assistant
```

La demo escucha exclusivamente en `http://127.0.0.1:8790/assistant/`, muestra
**Demostración sin IA**, utiliza un viaje ficticio y mantiene la publicación
desactivada. No se copia el servidor de demo ni las fixtures a Pages.

Para probar inferencia real localmente, usar `npm run preview:assistant` con
`CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_AI_TOKEN` en el entorno del proceso. Se
conecta a Workers AI por HTTPS, identifica al usuario como `local-preview` y nunca
habilita publicación. No pegar secretos en comandos compartidos ni documentación.
Cerrar con Ctrl+C. Este servidor es una herramienta de desarrollo, no el servidor
de producción ni un bypass de Cloudflare Access desplegable.

También se puede utilizar Wrangler con `--ai AI` para el binding de IA; en ese caso
la API mantiene la validación de Access y necesita una configuración local de JWT.

## Comprobaciones y límites

Las pruebas automatizadas usan identidades, claves, modelo, búsquedas y GitHub
ficticios. Comprueban autorización, origen, propiedad y expiración de borradores,
JSON inválido, citas inventadas, XSS, publicación acotada e idempotencia y generación
del sitio. La comprobación real de inferencia se registra aparte y no publica nada.

No hay MCP ni base de datos de viajes en esta versión. Las funciones de conversación,
investigación y publicación están separadas para poder exponerlas después como
herramientas. Los borradores no se comparten entre dispositivos hasta preparar la
propuesta remota. La conversación tiene un límite de 20 mensajes y el JSON del viaje
un máximo de 60.000 caracteres.

Referencias:

- [Workers AI en Pages Functions](https://developers.cloudflare.com/pages/functions/bindings/#workers-ai)
- [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Modelo Llama 3.3](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/)
- [Publicación desde Git](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Tavily Search](https://docs.tavily.com/documentation/api-reference/endpoint/search)
