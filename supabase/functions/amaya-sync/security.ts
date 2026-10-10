export async function signature(
  secret: string,
  timestamp: string,
  body: string,
) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return [
    ...new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(timestamp + "." + body),
      ),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function authenticated(
  request: Request,
  body: string,
  secret: string,
  now = Date.now(),
) {
  const timestamp = request.headers.get("x-amaya-timestamp") || "";
  const received = request.headers.get("x-amaya-signature") || "";
  if (
    secret.length < 32 ||
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 300000 ||
    !/^[a-f0-9]{64}$/.test(received)
  )
    return false;
  const expected = await signature(secret, timestamp, body);
  let difference = 0;
  for (let i = 0; i < 64; i++)
    difference |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  return difference === 0;
}
