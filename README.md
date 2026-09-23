# SOS Travellers — Just Enjoy

Guía turística multilingüe de Santiago de Chile con geolocalización, mapa interactivo, lugares recomendados y opiniones de viajeros.

## Características

- Español, inglés, portugués y francés.
- 49 lugares para turistas extranjeros y chilenos.
- Filtros para transporte, cafés, cultura, hoteles, paseos, mercados, compras, experiencias y growshops.
- Búsqueda por nombre o comuna, incluyendo Maipú, Cerrillos y Estación Central.
- Opiniones con puntuación de 1 a 5 estrellas almacenadas en Supabase.
- Diseño adaptable a teléfonos y computadores.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variables requeridas:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
```

Ejecuta `supabase/migrations/202609230001_create_reviews.sql` en el editor SQL de Supabase antes de publicar.

## Comprobaciones

```bash
npm run lint
npm run build
```

## Publicación

El proyecto está preparado para desplegarse en Vercel como una aplicación Next.js.
