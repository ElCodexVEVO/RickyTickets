import { describe, it, expect } from "vitest";
import {
  authenticated,
  signature,
} from "../supabase/functions/amaya-sync/security";
describe("Autenticación HMAC de Amaya", () => {
  const secret = "isolated-test-secret-with-at-least-32-characters";
  const now = 1791585000000,
    body = '{"action":"list","after_id":null}';
  async function request(raw = body, timestamp = String(now), key = secret) {
    return new Request("https://isolated.test", {
      method: "POST",
      headers: {
        "x-amaya-timestamp": timestamp,
        "x-amaya-signature": await signature(key, timestamp, raw),
      },
      body: raw,
    });
  }
  it("acepta una petición firmada y rechaza alteraciones del cuerpo", async () => {
    const r = await request();
    expect(await authenticated(r, body, secret, now)).toBe(true);
    expect(await authenticated(r, body + " ", secret, now)).toBe(false);
    expect(
      await authenticated(
        r,
        body,
        "different-long-secret-with-more-than-32-chars",
        now,
      ),
    ).toBe(false);
  });
  it("rechaza firmas caducadas, fechas inválidas, claves débiles y claves públicas", async () => {
    expect(
      await authenticated(
        await request(body, String(now - 300001)),
        body,
        secret,
        now,
      ),
    ).toBe(false);
    expect(
      await authenticated(await request(body, "NaN"), body, secret, now),
    ).toBe(false);
    expect(await authenticated(await request(), body, "short", now)).toBe(
      false,
    );
    expect(
      await authenticated(
        new Request("https://isolated.test", {
          headers: { apikey: "sb_publishable_example" },
        }),
        body,
        secret,
        now,
      ),
    ).toBe(false);
  });
});
