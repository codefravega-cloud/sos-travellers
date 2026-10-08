# SOS Travellers — Just Enjoy

Guía turística multilingüe de Chile: mapa animado del país para elegir destino y recibir tips de viaje, mapa interactivo de locales bien evaluados, y herramientas prácticas para el viajero.

## Características

- Español, inglés, portugués y francés.
- Hero con mapa de Chile por zonas y regiones: buscador de regiones, comunas y pueblos, y tips por zona (cuándo ir, cómo moverse, qué llevar, cuidados, internet).
- Mapa de locales por región con filtros por categoría, búsqueda y agrupación de marcadores.
- Locales importados desde Google Maps solo con nota 4,0 o superior y un mínimo de opiniones; 96 lugares de Santiago con ficha editorial propia.
- Estado «Abierto / Cerrado» de cada local calculado en el navegador con su horario semanal y la hora local de Chile, y filtro «Abiertos ahora».
- Opiniones con puntuación de 1 a 5 estrellas almacenadas en Supabase.
- Encuesta inicial voluntaria para adaptar idioma, moneda y conectividad.
- Conversor de monedas, presupuestos de rutas y precios orientativos de transporte (Santiago).
- «Qué pasa hoy»: eventos de los próximos siete días desde la tabla `events` y enlaces a carteleras oficiales de Santiago.
- Capa de Metro de Santiago sobre el mapa (líneas y estaciones de OpenStreetMap) y guía de tarifas por horario, bip! y conexión al aeropuerto.
- Guías exclusivas (`src/guides.ts`): catálogo con precio; mientras una guía no tenga `checkoutUrl`, la sección guarda correos de interesados en `guide_leads`.
- Radio taxis y otros colaboradores verificados desde la tabla `partners` (solo filas `published`).
- Ubicación en vivo o marcada manualmente, servicios de emergencia y buscador oficial de farmacias de turno.
- Diseño adaptable a teléfonos y computadores.

## Desarrollo local

Requiere Node.js 22.13 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

`npm run dev` levanta Vite en http://localhost:3000 y sirve también las funciones de `api/`, sin necesidad del CLI de Vercel.

Toda la API es una sola función de Vercel: `api/[route].ts` reparte `/api/<nombre>` al archivo `api/_routes/<nombre>.ts` (el plan gratuito admite 12 funciones por despliegue y hay más rutas que eso). Al crear una ruta nueva hay que agregarla a la tabla de `api/[route].ts`. Los archivos con `_` al inicio son ayudas, no rutas.

Variables en `.env.local`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
GOOGLE_MAPS_API_KEY=tu-clave-de-places-api   # solo para importar locales
```

Sin las variables de Supabase el sitio funciona igual, pero solo muestra los lugares de Santiago incluidos en el código y no guarda opiniones ni formularios.

Ejecuta, en orden, los archivos de `supabase/migrations/` en el editor SQL de Supabase. Crean las tablas de opiniones, solicitudes comerciales, preferencias de viajeros y lugares.

Las migraciones `2026100300xx` agregan eventos, colaboradores, el campo `interest` de las solicitudes comerciales e interesados en guías. Eventos y colaboradores se cargan a mano desde Supabase, por ejemplo:

```sql
insert into public.events (title, venue, category, region, starts_at, price_label, url, featured)
values ('Nombre del evento', 'Recinto', 'concert', 'RM', '2026-10-10 21:00-03', 'Desde $15.000', 'https://sitio-oficial.cl', false);

insert into public.partners (kind, name, phone, whatsapp, region, languages, status)
values ('radio_taxi', 'Empresa verificada', '+56 2 2000 0000', '+56 9 0000 0000', 'RM', '{ES,EN}', 'published');
```

Para vender una guía, crea un link de pago (Mercado Pago, Stripe u otro) y ponlo en `checkoutUrl` de esa guía en `src/guides.ts`.

Los datos del Metro se regeneran con `node scripts/geo/build-metro.mjs` (consulta Overpass y reescribe `src/data/metro-santiago.json`).

## Cuentas y tres perfiles

Las cuentas son de Supabase Auth (correo y contraseña) y el rol vive en `app_users.role`. Un usuario no puede cambiar su propio rol.

| Perfil | Dónde | Qué puede hacer |
|---|---|---|
| `tourist` (por defecto) | App móvil | Explorar, eventos, rutas de cafeterías, promociones, guías y sugerencias |
| `owner` | `/panel` y app móvil | «Estoy atendiendo» (vence a las 12 horas), contacto, fotos, promociones, enlace de opiniones para NFC/QR |
| `boss` | `/panel` | Opiniones, sugerencias, aprobaciones, negocios, solicitudes, usuarios, beneficios y acceso a `/equipo` |

- **Un negocio** es una fila de `partners` con `owner_id`. `place_id` lo enlaza a su ficha en `places`; sin él, sus opiniones usan la clave `partner-<id>`.
- **Fotos y promociones** quedan pendientes hasta que un boss las aprueba. Las fotos van al bucket público `business-photos`; se suben con una dirección firmada que entrega `api/_routes/owner-photos.ts`.
- **Opiniones por NFC:** `/r/<id>` abre el formulario de opinión del negocio (cuatro idiomas). El panel del dueño muestra ese enlace y su código QR.
- **Primer boss:** se asigna a mano una vez: `update public.app_users set role = 'boss' where id = (select id from auth.users where email = 'correo@ejemplo.cl');`. Después, los roles se cambian en el panel.
- `/panel` necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` (la clave publicable, nunca la `service_role`). Es el único punto del sitio donde el navegador habla con Supabase, y solo para la sesión y la subida de fotos.

## Agentes y panel del equipo

`/equipo` muestra por sección qué hizo cada agente y los eventos que esperan aprobación (Pendientes, Subidos, Descartados). Se entra con `TEAM_PANEL_KEY` (mínimo 12 caracteres) o con la sesión de un boss.

- **Eventos:** el agente busca eventos y los entrega a `POST /api/agent-events`, que valida cada uno, omite los repetidos, los guarda con `status = 'draft'` y registra la corrida en `agent_runs`. La ruta se protege con `AGENT_KEY` (mínimo 24 caracteres), que solo sirve para proponer borradores. Un evento se publica cuando una persona lo aprueba.
- **Resumen semanal:** `GET /api/cron-summary` cuenta la actividad de los últimos 7 días (solo cantidades) y lista lo que necesita atención. Vercel Cron la llama cada lunes (`vercel.json`) enviando `CRON_SECRET`.

Para ejecutarlos a mano contra el servidor local (o contra el sitio publicado con `SOS_SITE_URL=https://…`):

```
npm run agents:events -- archivo.json --dry-run   # valida sin escribir
npm run agents:events -- archivo.json
npm run agents:summary -- --dry-run
```

## Respaldo de datos

`.github/workflows/backup.yml` respalda cada domingo el esquema `public` y las cuentas (`auth.users`, `auth.identities`), lo cifra con `gpg` y lo guarda 90 días como archivo de la ejecución. El repositorio es público, por eso el respaldo nunca se sube sin cifrar. Las fotos del bucket no se incluyen.

Secretos en GitHub (Settings → Secrets and variables → Actions): `SUPABASE_DB_URL` (la cadena «Session pooler» de Supabase) y `BACKUP_PASSPHRASE`. Los flujos programados solo corren desde la rama principal.

Para abrir un respaldo descargado:

```
gpg --decrypt sos-travellers-AAAA-MM-DD.tar.gz.gpg | tar -xz
psql "$NUEVA_BASE" -f backup/public.sql
```

## App móvil

`../sos-travels-app` es la app para iPhone y Android (Expo). Lee `/api/places` y `/api/events` de este sitio y usa Supabase Auth para las cuentas. Este repositorio le aporta la tabla `app_users` (única tabla que un usuario lee y edita directo, solo su fila) y `DELETE /api/account` para eliminar la cuenta. La app copia tipos y lógica de `src/` en su carpeta `src/shared/`: al cambiar `Place`, `open-status.ts`, las regiones o las categorías, hay que actualizarla.

## Comprobaciones

```bash
npm run lint
npm run build
```

## Importar locales de OpenStreetMap (gratis)

La base de todo Chile sale de OpenStreetMap a través de la API Overpass: no necesita clave ni tiene costo. Es una consulta por región, guardada en caché.

```
npm run places:osm -- --region=LL                     # piloto con una región
npm run places:report -- --source=osm                 # resumen y scripts/places/out/report.csv
npm run places:upsert -- --source=osm --region=LL     # publica en Supabase
```

OpenStreetMap no tiene notas: los locales se eligen por lo completa que está su ficha (horario, sitio web, teléfono, Wikipedia) y se guardan hasta 12 por localidad en las categorías que más busca un turista (parques, miradores, restaurantes, vida nocturna, museos) y 6 en el resto (`--per-locality`), más todos los museos y áreas protegidas. El campo `rank` ordena las listas del sitio con esa misma prioridad. El horario (`opening_hours`) se convierte al formato semanal que usa el estado «Abierto / Cerrado». Los datos son © colaboradores de OpenStreetMap (ODbL) y el sitio muestra esa atribución.

## Cafeterías de especialidad (Santiago)

El filtro «Café de especialidad» del mapa muestra las cafeterías con `specialty = true`, por comuna o cerca del visitante. La lista se arma cruzando OpenStreetMap (gratis) y, si hay clave, Google Places (42 consultas, una por comuna urbana):

```bash
npm run places:specialty                         # solo OpenStreetMap
npm run places:specialty -- --google --dry-run   # cuenta las consultas de Google sin gastar
npm run places:specialty -- --google             # suma Google Places (de pago)
npm run places:specialty -- --publish --dry-run  # qué cambiaría en Supabase
npm run places:specialty -- --publish            # marca y agrega las cafeterías
```

Cada corrida escribe `scripts/places/out/specialty-RM.csv` para revisar. Solo se publican las de confianza «alta» o «media», y solo en comunas que reúnan al menos 5 (`--publish --comuna=Maipú` publica una sola comuna); `scripts/places/curated/specialty-RM.json` (`{"include": [], "exclude": []}`, por nombre; una entrada de `include` con `comuna`, `address`, `lat` y `lng` agrega un local que ninguna fuente tiene) permite agregar o descartar a mano y tiene la última palabra.

## Importar locales de Google Places (de pago)

Los locales salen de la Places API (New) de Google. Necesitas una clave con facturación activa en `GOOGLE_MAPS_API_KEY`. Cada búsqueda se guarda en caché en disco, así que repetir un comando no vuelve a cobrar.

```bash
npm run places:fetch -- --dry-run        # cuenta las consultas sin gastar (≈4.000 para todo Chile)
npm run places:fetch -- --region=LL      # piloto con una región
npm run places:report                    # resumen y scripts/places/out/report.csv para revisar
npm run places:upsert -- --region=LL     # publica en Supabase
npm run places:hours                     # horarios de los lugares curados de Santiago (82 consultas)
npm run places:seed                      # sube los curados de Santiago y de scripts/places/curated/
```

Reglas de calidad (`scripts/places/lib.mjs`): nota ≥ 4,0, local operativo, mínimo de 150 opiniones en ciudades y 20 en pueblos, sin cadenas de comida rápida, y hasta 8 locales por localidad y categoría. Los umbrales se ajustan con `--min-reviews-city`, `--min-reviews-town` y `--per-search`; `--max-requests` pone un tope por corrida.

Las condiciones de Google limitan cuánto tiempo se puede almacenar su contenido: el sitio muestra la atribución y la fecha de verificación, y conviene volver a correr `places:fetch` y `places:upsert` periódicamente para refrescar las notas.

## Publicación

Se despliega en Vercel como proyecto Vite (`vercel.json`); los archivos de `api/` se publican como Vercel Functions. Configura las variables de Supabase en el proyecto de Vercel.
