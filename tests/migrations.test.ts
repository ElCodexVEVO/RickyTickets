import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const admin = "10000000-0000-4000-8000-000000000001";
const employee = "10000000-0000-4000-8000-000000000002";
const inactive = "10000000-0000-4000-8000-000000000003";
const outsider = "10000000-0000-4000-8000-000000000004";
let db: PGlite;
async function asUser(id: string, role = "authenticated") {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); select set_config('request.jwt.claim.role','${role}',false); set role ${role};`,
  );
}
const payload = {
  customer_full_name: "Cliente prueba aislada",
  customer_phone: "9991234567",
  service_type: "redondo",
  pickup_point: "Origen",
  dropoff_point: "Destino",
  date: "2026-10-06",
  time: "10:30",
  return_date: "2026-10-07",
  return_time: null,
  return_pickup_point: "Destino",
  return_dropoff_point: "Origen",
  passengers: 3,
  price: 100,
  currency: "USD",
};
async function create() {
  const result = await db.query<{
    id: string;
    return_time: string | null;
    folio: string;
  }>("select * from public.create_reservation($1::jsonb)", [
    JSON.stringify(payload),
  ]);
  return result.rows[0];
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,raw_app_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
    create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
  `);
  for (const name of [
    "0001_init.sql",
    "0002_seed.sql",
    "0003_fix_handle_new_user.sql",
    "0004_public_ticket_verification.sql",
    "0005_staff_security_and_activity.sql",
    "0006_reservation_service_catalog.sql",
    "0007_reservation_locations.sql",
    "0008_single_page_reservations.sql",
  ]) {
    const sql = (
      await readFile(
        new URL(`../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      )
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(sql);
  }
  await db.exec(`grant usage on schema public,auth,storage to authenticated,anon;
    grant select,insert,update,delete on all tables in schema public to authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
    select set_config('request.jwt.claim.role','service_role',false);
    insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values
    ('${admin}','admin@isolated.test','{"full_name":"Admin"}','{"staff_access":true,"staff_role":"admin"}'),
    ('${employee}','employee@isolated.test','{"full_name":"Empleado"}','{"staff_access":true}'),
    ('${inactive}','inactive@isolated.test','{"full_name":"Inactivo"}','{"staff_access":true}'),
    ('${outsider}','public@isolated.test','{"full_name":"Alta pública","role":"admin"}','{}');
    update public.profiles set permissions='{"can_edit_reservations":true}' where id='${employee}';
    update public.profiles set active=false where id='${inactive}';
  `);
});
beforeEach(async () => asUser(admin));
afterAll(async () => db?.close());
describe("Migraciones y operaciones en PostgreSQL aislado", () => {
  it("crea regreso NULL, conserva folio y confirma después una hora real", async () => {
    const r = await create();
    expect(r.return_time).toBeNull();
    expect(r.folio).toMatch(/^DT-\d{4}-\d{6}$/);
    await db.query(
      "update public.reservations set return_time=$1 where id=$2",
      ["16:30", r.id],
    );
    const updated = await db.query<{ return_time: string }>(
      "select return_time from public.reservations where id=$1",
      [r.id],
    );
    expect(updated.rows[0].return_time).toBe("16:30:00");
    const logs = await db.query<{
      metadata: { changes: { return_time: { before: null; after: string } } };
    }>(
      "select metadata from public.activity_logs where entity_id=$1 and action='update_reservation'",
      [r.id],
    );
    expect(logs.rows[0].metadata.changes.return_time).toEqual({
      before: null,
      after: "16:30:00",
    });
  });
  it("guarda el servicio configurable sin cambiar el enum de trayectos", async () => {
    const catalog = await db.query<{ id: string }>(
      "select id from service_catalog_items where kind='service_type' limit 1",
    );
    const result = await db.query<{
      service_catalog_item_id: string;
      service_type: string;
    }>("select * from create_reservation($1::jsonb)", [
      JSON.stringify({
        ...payload,
        service_catalog_item_id: catalog.rows[0].id,
      }),
    ]);
    expect(result.rows[0].service_catalog_item_id).toBe(catalog.rows[0].id);
    expect(result.rows[0].service_type).toBe("redondo");
  });
  it("permite crear/editar al empleado autorizado pero rechaza cancelar", async () => {
    await asUser(employee);
    const r = await create();
    await db.query("update reservations set return_time=$1 where id=$2", [
      "17:00",
      r.id,
    ]);
    await expect(
      db.query("select * from cancel_reservation($1,$2)", [r.id, "No show"]),
    ).rejects.toThrow(/administrador/);
    await expect(
      db.query("update reservations set status='cancelled' where id=$1", [
        r.id,
      ]),
    ).rejects.toThrow(/administrador/);
  });
  it("bloquea lectura y RPC a empleados desactivados aunque tengan sesión", async () => {
    await asUser(inactive);
    const result = await db.query("select * from reservations");
    expect(result.rows).toHaveLength(0);
    await expect(create()).rejects.toThrow(/acceso/);
    const customers = await db.query("select * from customers");
    expect(customers.rows).toHaveLength(0);
  });
  it("rechaza signup público y escalación por metadatos del usuario", async () => {
    await db.exec("reset role");
    const profile = await db.query("select * from profiles where id=$1", [
      outsider,
    ]);
    expect(profile.rows).toHaveLength(0);
    await asUser(outsider);
    expect((await db.query("select * from reservations")).rows).toHaveLength(0);
    await expect(create()).rejects.toThrow(/acceso/);
    await asUser(employee);
    await expect(
      db.query("update profiles set role='admin' where id=$1", [employee]),
    ).rejects.toThrow(/administrador/);
  });
  it("admin cancela con motivo y el ticket público muestra el estado actualizado", async () => {
    const r = await create();
    await db.query("select * from cancel_reservation($1,$2)", [
      r.id,
      "Cliente canceló · Cambio de planes",
    ]);
    const history = await db.query<{ note: string }>(
      "select note from reservation_status_history where reservation_id=$1 and new_status='cancelled'",
      [r.id],
    );
    expect(history.rows[0].note).toContain("Cliente canceló");
    await asUser("", "anon");
    const ticket = await db.query<Record<string, unknown>>(
      "select * from get_public_ticket($1)",
      [r.id],
    );
    expect(ticket.rows[0].status).toBe("cancelled");
    expect(ticket.rows[0].return_time).toBeNull();
    expect(ticket.rows[0]).not.toHaveProperty("phone");
    expect(ticket.rows[0]).not.toHaveProperty("price");
    await expect(
      db.query("select * from create_reservation_base($1::jsonb)", [
        JSON.stringify(payload),
      ]),
    ).rejects.toThrow(/permission denied/);
  });
  it("crea borradores con anticipo y hora de vuelo sin vehículo ni conductor", async () => {
    const result = await db.query<{
      status: string;
      deposit: string;
      flight_time: string;
      vehicle_id: string | null;
      driver_id: string | null;
      customer_id: string;
    }>("select * from create_reservation($1::jsonb)", [
      JSON.stringify({
        ...payload,
        customer_phone: "9990000001",
        status: "draft",
        deposit: 500,
        flight_time: "09:15",
        vehicle_id: "",
        driver_id: "",
      }),
    ]);
    const r = result.rows[0];
    expect(r.status).toBe("draft");
    expect(Number(r.deposit)).toBe(500);
    expect(r.flight_time).toBe("09:15:00");
    expect(r.vehicle_id).toBeNull();
    expect(r.driver_id).toBeNull();
    const stats = await db.query<{ total_services: number }>(
      "select total_services from customers where id=$1",
      [r.customer_id],
    );
    expect(stats.rows[0].total_services).toBe(0);
  });
  it("una reservación normal nace pendiente con anticipo 0 y cuenta como servicio", async () => {
    const result = await db.query<{
      id: string;
      status: string;
      deposit: string;
      customer_id: string;
    }>("select * from create_reservation($1::jsonb)", [
      JSON.stringify({ ...payload, customer_phone: "9990000002" }),
    ]);
    expect(result.rows[0].status).toBe("pending");
    expect(Number(result.rows[0].deposit)).toBe(0);
    const stats = await db.query<{ total_services: number }>(
      "select total_services from customers where id=$1",
      [result.rows[0].customer_id],
    );
    expect(stats.rows[0].total_services).toBe(1);
    await expect(
      db.query("update reservations set deposit=-1 where id=$1", [
        result.rows[0].id,
      ]),
    ).rejects.toThrow(/deposit/);
  });
  it("el autor sin permiso de edición continúa y completa su borrador, pero no otros", async () => {
    const asService = () =>
      db.exec(
        "reset role; select set_config('request.jwt.claim.role','service_role',false);",
      );
    await asService();
    await db.query("update profiles set permissions='{}' where id=$1", [
      employee,
    ]);
    await asUser(employee);
    const own = await db.query<{ id: string; customer_id: string }>(
      "select * from create_reservation($1::jsonb)",
      [
        JSON.stringify({
          ...payload,
          customer_phone: "9990000003",
          status: "draft",
        }),
      ],
    );
    const id = own.rows[0].id;
    await db.query(
      "update reservations set price=900, deposit=300 where id=$1",
      [id],
    );
    await db.query("update reservations set status='pending' where id=$1", [
      id,
    ]);
    const done = await db.query<{ status: string; price: string }>(
      "select status, price from reservations where id=$1",
      [id],
    );
    expect(done.rows[0]).toMatchObject({ status: "pending" });
    expect(Number(done.rows[0].price)).toBe(900);
    const stats = await db.query<{ total_services: number }>(
      "select total_services from customers where id=$1",
      [own.rows[0].customer_id],
    );
    expect(stats.rows[0].total_services).toBe(1);
    // Ya no es borrador: sin permiso general no puede seguir editándola.
    await db.query("update reservations set price=1 where id=$1", [id]);
    const unchanged = await db.query<{ price: string }>(
      "select price from reservations where id=$1",
      [id],
    );
    expect(Number(unchanged.rows[0].price)).toBe(900);
    await asService();
    await db.query(
      `update profiles set permissions='{"can_edit_reservations":true}' where id=$1`,
      [employee],
    );
  });
  it("el QR público no expone borradores", async () => {
    const result = await db.query<{ id: string }>(
      "select * from create_reservation($1::jsonb)",
      [
        JSON.stringify({
          ...payload,
          customer_phone: "9990000004",
          status: "draft",
        }),
      ],
    );
    await asUser("", "anon");
    expect(
      (
        await db.query("select * from get_public_ticket($1)", [
          result.rows[0].id,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it("soft delete oculta la reservación también al QR público", async () => {
    const r = await create();
    await db.query("select soft_delete_reservation($1)", [r.id]);
    await asUser("", "anon");
    expect(
      (await db.query("select * from get_public_ticket($1)", [r.id])).rows,
    ).toHaveLength(0);
  });
});
