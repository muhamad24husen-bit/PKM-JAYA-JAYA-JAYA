// Gerbang login untuk dashboard klinis. Sesi disimpan sebagai cookie HttpOnly
// berisi `<expiry>.<signature>`; signature adalah HMAC-SHA256 dari expiry.
// Web Crypto dipakai agar modul ini jalan di Edge runtime (middleware) maupun
// Node runtime (route handler) tanpa cabang kode terpisah.

export const SESSION_COOKIE = "nirwana-session";
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // satu shift jaga

const encoder = new TextEncoder();

function secretKeyMaterial() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET belum diisi di .env.");
  }
  return encoder.encode(secret);
}

async function hmac(message) {
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyMaterial(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Perbandingan waktu-konstan supaya panjang prefix yang cocok tidak bocor lewat
// selisih waktu eksekusi.
function safeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return diff === 0;
}

export async function createSessionToken(now = Date.now()) {
  const expiresAt = String(now + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${await hmac(expiresAt)}`;
}

export async function verifySessionToken(token, now = Date.now()) {
  if (typeof token !== "string" || !token.includes(".")) {
    return false;
  }

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) {
    return false;
  }

  const expiryMs = Number(expiresAt);
  if (!Number.isFinite(expiryMs) || expiryMs <= now) {
    return false;
  }

  try {
    return safeEqual(await hmac(expiresAt), signature);
  } catch {
    return false;
  }
}

export function checkPassword(input) {
  const expected = process.env.DASHBOARD_PASSWORD || "";
  if (!expected) {
    return false;
  }

  return safeEqual(String(input ?? ""), expected);
}
