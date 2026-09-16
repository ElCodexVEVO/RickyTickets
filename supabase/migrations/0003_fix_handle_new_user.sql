-- ============================================================================
-- Diagnóstico y corrección de public.handle_new_user()
-- Pégalo y ejecútalo completo en el SQL Editor de Supabase.
-- ============================================================================

-- 1) Diagnóstico: confirma qué existe realmente en tu proyecto.
select 'profiles table' as check, to_regclass('public.profiles') is not null as exists_
union all
select 'user_role enum', exists (select 1 from pg_type where typname = 'user_role')
union all
select 'handle_new_user function', exists (select 1 from pg_proc where proname = 'handle_new_user')
union all
select 'on_auth_user_created trigger', exists (
  select 1 from pg_trigger where tgname = 'on_auth_user_created'
);

-- 2) Recrea la función de forma más defensiva (cast explícito al enum,
--    tolera raw_user_meta_data / email nulos, y nunca deja el INSERT a auth.users
--    en un estado roto si algo inesperado pasa).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  computed_role public.user_role;
begin
  select not exists (select 1 from public.profiles) into is_first;
  computed_role := case when is_first then 'admin' else 'employee' end::public.user_role;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email, 'Sin nombre'),
    computed_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
