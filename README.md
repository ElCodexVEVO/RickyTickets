# RickyTickets

Sistema de reservaciones y tickets PDF para **Danny Transfers** (Tulum, México).

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router · TanStack Query ·
React Hook Form + Zod · Supabase (Postgres, Auth, Storage) · @react-pdf/renderer.

## Puesta en marcha

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un proyecto en [supabase.com](https://supabase.com) y aplica el esquema:

   - Abre el **SQL editor** del proyecto y ejecuta, en orden:
     - `supabase/migrations/0001_init.sql`
     - `supabase/migrations/0002_seed.sql`
   - Crea el primer usuario desde **Authentication → Users** (o regístrate desde
     la app si habilitas signup); el primer perfil creado queda automáticamente
     como `admin`.

3. Copia `.env.example` a `.env.local` y completa con los datos de tu proyecto
   (Project Settings → API):

   ```bash
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

   La `SUPABASE_SERVICE_ROLE_KEY` **nunca** va en el frontend: solo se usa
   dentro de la Edge Function `supabase/functions/create-employee`.

4. (Opcional, para que "Usuarios → Nuevo empleado" funcione) despliega la
   función:

   ```bash
   supabase functions deploy create-employee
   ```

5. Arranca el entorno de desarrollo:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — servidor de desarrollo (Vite).
- `npm run build` — chequeo de tipos + build de producción.
- `npm run typecheck` — solo TypeScript.
- `npm run preview` — sirve el build de producción localmente.

## Estructura

```
src/
  pages/          páginas por ruta
  components/     UI compartida (ui/, layout/) y por dominio (tickets/, reservations/, dashboard/)
  features/       datos remotos por dominio (api.ts + hooks.ts sobre supabase-js/TanStack Query)
  pdf/            plantilla @react-pdf/renderer, generación y subida del PDF a Storage
  routes/         router, guards de sesión y de rol
  context/        AuthContext (sesión + perfil + rol)
  lib/            cliente de Supabase, validadores zod, formato
  types/          tipos de la base de datos y del dominio
supabase/
  migrations/     esquema SQL (tablas, RLS, triggers, funciones)
  functions/      Edge Functions (service role solo aquí)
```

## Seguridad

- Row Level Security habilitado en todas las tablas; las reglas de negocio
  (quién puede cancelar/editar/eliminar) están en `0001_init.sql`, no solo en
  el frontend.
- El folio (`DT-AAAA-000001`) se genera de forma atómica en la base de datos.
- Los PDFs se guardan en el bucket privado `tickets`, versionados en la tabla
  `ticket_files`.
