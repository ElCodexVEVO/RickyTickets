import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { authenticated } from "./security.ts";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const headers = { "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });
Deno.serve(async (request) => {
  if (request.method !== "POST")
    return reply({ error: "Method not allowed" }, 405);
  if (Number(request.headers.get("content-length") || 0) > 32768)
    return reply({ error: "Too large" }, 413);
  // Read a bounded stream, including requests that omit Content-Length.
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        return reply({ error: "Too large" }, 413);
      }
      chunks.push(value);
    }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  const raw = new TextDecoder().decode(buffer);
  if (
    !(await authenticated(
      request,
      raw,
      Deno.env.get("AMAYA_SYNC_SECRET") || "",
    ))
  )
    return reply({ error: "Unauthorized" }, 401);
  try {
    const data = JSON.parse(raw);
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const key = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) return reply({ error: "Bridge unavailable" }, 503);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (data.action === "list") {
      if (data.after_id !== null && !uuid.test(data.after_id || ""))
        return reply({ error: "Invalid cursor" }, 400);
      const { data: rows, error } = await db.rpc("amaya_sync_list", {
        after_id: data.after_id,
        page_size: 100,
      });
      if (error) return reply({ error: "Bridge unavailable" }, 503);
      return reply({ reservations: rows });
    }
    if (data.action === "apply") {
      if (
        !uuid.test(data.event_id) ||
        (data.reservation_id !== null && !uuid.test(data.reservation_id)) ||
        (data.amaya_id !== null && !uuid.test(data.amaya_id)) ||
        (data.expected_revision !== null &&
          (!Number.isSafeInteger(data.expected_revision) ||
            data.expected_revision < 1)) ||
        !data.patch ||
        typeof data.patch !== "object" ||
        Array.isArray(data.patch)
      )
        return reply({ error: "Invalid request" }, 400);
      const { data: result, error } = await db.rpc("amaya_sync_apply", {
        event_id: data.event_id,
        reservation_id: data.reservation_id,
        amaya_id: data.amaya_id,
        expected_revision: data.expected_revision,
        patch: data.patch,
      });
      if (error)
        return reply(
          { error: "Reservation rejected; review customer or price conflict" },
          422,
        );
      return reply(result);
    }
    return reply({ error: "Unknown action" }, 400);
  } catch {
    return reply({ error: "Invalid request" }, 400);
  }
});
