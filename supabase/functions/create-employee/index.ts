// Edge Function: create-employee
// Único lugar del sistema donde se usa SUPABASE_SERVICE_ROLE_KEY.
// Crea un usuario de Auth + su perfil, pero solo si quien llama ya es admin.
//
// Deploy: supabase functions deploy create-employee
// Invocar desde el frontend con supabase.functions.invoke('create-employee', { body }).

import { createClient } from "jsr:@supabase/supabase-js@2";

interface CreateEmployeeBody {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: "admin" | "employee";
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Falta el header Authorization" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente "como el usuario que llama" para verificar su rol via RLS/is_admin().
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdminResult, error: isAdminError } = await callerClient.rpc("is_admin");
    if (isAdminError || !isAdminResult) {
      return new Response(JSON.stringify({ error: "Solo un administrador puede crear empleados" }), { status: 403 });
    }

    const body = (await req.json()) as CreateEmployeeBody;
    if (!body.email || !body.password || !body.full_name) {
      return new Response(JSON.stringify({ error: "email, password y full_name son requeridos" }), { status: 400 });
    }

    // Cliente con service_role: solo existe en este entorno de servidor.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    });
    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "No se pudo crear el usuario" }), { status: 400 });
    }

    // El trigger handle_new_user ya creó el profile con role='employee'; lo ajustamos si aplica.
    if (body.role === "admin" || body.phone) {
      await adminClient
        .from("profiles")
        .update({ role: body.role ?? "employee", phone: body.phone ?? null })
        .eq("id", created.user.id);
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
