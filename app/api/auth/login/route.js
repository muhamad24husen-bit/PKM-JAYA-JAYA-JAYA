import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  checkPassword,
  createSessionToken,
} from "@/lib/auth";

export async function POST(request) {
  if (!process.env.AUTH_SECRET || !process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json(
      { error: "Gerbang login belum dikonfigurasi. Isi AUTH_SECRET dan DASHBOARD_PASSWORD di .env." },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!checkPassword(body?.password)) {
    // Jeda kecil menahan percobaan tebak beruntun dari skrip.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ error: "Kata sandi salah." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    // Dev jalan di http:// LAN, jadi secure hanya saat produksi https.
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
