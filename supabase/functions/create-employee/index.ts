import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Método no permitido" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return respond({ error: "No autenticado" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return respond({ error: "Sesión inválida" }, 401);
    const { data: isAdmin, error } = await caller.rpc("is_admin");
    if (error || !isAdmin) return respond({ error: "Solo un administrador activo puede crear empleados" }, 403);
    const body = await req.json();
    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || typeof body.password !== "string" || body.password.length < 8 || typeof body.full_name !== "string" || body.full_name.trim().length < 2 || (body.role && !["admin", "employee"].includes(body.role))) return respond({ error: "Revisa correo, nombre, rol y contraseña (mínimo 8 caracteres)" }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email: body.email.trim(), password: body.password, email_confirm: true, user_metadata: { full_name: body.full_name.trim() }, app_metadata: { staff_access: true, staff_role: body.role ?? "employee" } });
    if (createError || !created.user) return respond({ error: createError?.message ?? "No se pudo crear el usuario" }, 400);
    const { error: profileError } = await admin.from("profiles").update({ role: body.role ?? "employee", phone: body.phone || null }).eq("id", created.user.id).select("id").single();
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return respond({ error: "No se pudo completar el perfil del empleado; revisa las migraciones de seguridad." }, 500);
    }
    return respond({ id: created.user.id });
  } catch { return respond({ error: "No se pudo procesar el alta" }, 500); }
});
