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

Variables en `.env.local`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
GOOGLE_MAPS_API_KEY=tu-clave-de-places-api   # solo para importar locales
```

Sin las variables de Supabase el sitio funciona igual, pero solo muestra los lugares de Santiago incluidos en el código y no guarda opiniones ni formularios.

Ejecuta, en orden, los archivos de `supabase/migrations/` en el editor SQL de Supabase. Crean las tablas de opiniones, solicitudes comerciales, preferencias de viajeros y lugares.

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

## Importar locales de Google Places (de pago)

Los locales salen de la Places API (New) de Google. Necesitas una clave con facturación activa en `GOOGLE_MAPS_API_KEY`. Cada búsqueda se guarda en caché en disco, así que repetir un comando no vuelve a cobrar.

```bash
npm run places:fetch -- --dry-run        # cuenta las consultas sin gastar (≈4.000 para todo Chile)
npm run places:fetch -- --region=LL      # piloto con una región
npm run places:report                    # resumen y scripts/places/out/report.csv para revisar
npm run places:upsert -- --region=LL     # publica en Supabase
npm run places:hours                     # horarios de los lugares curados de Santiago (82 consultas)
npm run places:seed                      # sube los lugares curados de Santiago
```

Reglas de calidad (`scripts/places/lib.mjs`): nota ≥ 4,0, local operativo, mínimo de 150 opiniones en ciudades y 20 en pueblos, sin cadenas de comida rápida, y hasta 8 locales por localidad y categoría. Los umbrales se ajustan con `--min-reviews-city`, `--min-reviews-town` y `--per-search`; `--max-requests` pone un tope por corrida.

Las condiciones de Google limitan cuánto tiempo se puede almacenar su contenido: el sitio muestra la atribución y la fecha de verificación, y conviene volver a correr `places:fetch` y `places:upsert` periódicamente para refrescar las notas.

## Publicación

Se despliega en Vercel como proyecto Vite (`vercel.json`); los archivos de `api/` se publican como Vercel Functions. Configura las variables de Supabase en el proyecto de Vercel.
