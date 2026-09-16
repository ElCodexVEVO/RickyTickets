import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[RickyTickets] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local y completa tus credenciales.",
  );
}

// Cliente único de Supabase. Solo usa la clave anónima: la service_role
// jamas debe importarse aqui, vive unicamente en las Edge Functions.
// Nota: no se usa el generic Database<> de supabase-js aqui (sus tipos
// GenericTable son muy estrictos); las respuestas se tipan manualmente
// en cada hook contra src/types/database.types.ts.
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
