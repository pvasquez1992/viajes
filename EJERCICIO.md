# Ejercicio

La sección `/ejercicio/` consulta el historial de la API Garmin mediante `/api/ejercicio/activities`. Incluye búsqueda, filtros por deporte y fechas, totales, distancia mensual, paginación y detalle. Muestra los datos importados disponibles; todavía no sincroniza directamente con Garmin Connect.

La función de Pages valida la firma, caducidad, emisor y audiencia de la sesión de Cloudflare Access. Después añade la clave de la API desde el servidor. La clave y los datos de actividades no se incluyen en los archivos públicos ni se guardan en localStorage.

Configurar en Pages, para producción y previews:

- `GARMIN_API_KEY`: secreto con la clave actual del Worker Garmin.
- `ACCESS_TEAM_DOMAIN`: dominio del equipo de Access, sin `https://`.
- `ACCESS_AUD`: audiencia de la aplicación de Access que protege cada entorno.

Además, configurar el binding de servicio `GARMIN_API` apuntando al Worker `my-garmin-api` en producción y previews. La función llama a `env.GARMIN_API.fetch`, porque una llamada pública con `fetch` entre estos Workers puede devolver el error 1042 de Cloudflare. Sin el binding, rechaza la consulta; no intenta una llamada pública como alternativa.

Las previews pueden usar una aplicación de Access distinta de producción; su audiencia debe corresponder a ese entorno. Sin estos valores la función rechaza las consultas. Cualquier usuario autorizado por esa aplicación de Access podrá consultar las actividades: mantener su política limitada a los usuarios deseados.

Cloudflare Pages: comando `npm run build`, directorio de salida `dist/site`. El código de `functions/` queda en la raíz del proyecto para que Pages lo compile. El build copia solamente contenido público, evitando dependencias y credenciales. Las rutas de viajes existentes siguen disponibles.

Requiere Node 22 o superior. `npm ci`, `npm test`, `npm run build` y `npm run build:functions` verifican el proyecto. Para servirlo localmente: levantar el Worker Garmin con `wrangler dev` y ejecutar `npm run build` seguido de `npx wrangler pages dev dist/site --port 8788 --service GARMIN_API=my-garmin-api`. Las consultas locales también requieren una sesión de Access válida y las variables en `.dev.vars`, que está excluido de Git.

La nueva función usa el plan de Workers asociado a Pages; para esta web personal basta el plan gratuito existente, sujeto a sus cuotas. No crea nuevos servicios de pago.
