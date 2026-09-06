"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

// Tata letak mengikuti blok shadcnblocks "accept-invite1": logo di atas, satu
// panel bergaris dengan form di kolom kiri dan teks sambutan di kolom kanan,
// lalu baris footer kecil. Ditulis ulang memakai token nirwana-* supaya tidak
// perlu menginisialisasi shadcn dan mengganggu palet dashboard.

const paragraf = [
  "NIRWANA-AI memantau rSO₂ ginjal neonatus secara berkelanjutan lewat sensor NIR non-invasif, dan mengalirkan nilainya ke dashboard ini setiap detik.",
  "Halaman di balik gerbang ini memuat data fisiologis pasien beserta riwayatnya, sehingga aksesnya dibatasi pada dokter dan perawat yang bertugas.",
  "Orang tua atau wali silakan memakai aplikasi pendamping NIRWANA-AI di ponsel.",
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Batasi redirect ke path internal supaya parameter ?next= tidak bisa dipakai
  // mengarahkan petugas ke domain luar.
  const rawNext = searchParams.get("next") || "/dashboard";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || "Gagal masuk. Coba lagi.");
        setBusy(false);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi.");
      setBusy(false);
    }
  }

  return (
    <form autoComplete="off" onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="password" className="sr-only">
        Kata sandi petugas
      </label>
      <div className="relative">
        <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-nirwana-muted" />
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Masukkan kata sandi petugas"
          className="w-full rounded-lg border border-nirwana-border bg-nirwana-surface py-2.5 pl-9 pr-3 text-sm text-nirwana-text outline-none transition focus:border-nirwana-accent focus:ring-2 focus:ring-nirwana-accent/25"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-nirwana-hipoksia/25 bg-nirwana-hipoksiaSoft px-3 py-2 text-sm text-nirwana-hipoksia"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !password}
        className="flex items-center justify-center gap-2 rounded-lg bg-nirwana-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nirwana-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : null}
        {busy ? "Memverifikasi…" : "Lanjutkan"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-nirwana-background text-nirwana-text">
      <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="flex w-full flex-col gap-14 sm:items-center lg:gap-20">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={52} />
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold text-nirwana-text">NIRWANA-AI</span>
              <span className="block text-xs text-nirwana-muted">Monitoring rSO₂ Neonatus</span>
            </span>
          </Link>

          <div className="flex w-full flex-col-reverse items-start gap-10 sm:rounded-2xl sm:border sm:border-nirwana-border sm:bg-nirwana-surface sm:px-10 sm:py-10 md:flex-row md:pt-16 lg:gap-20 lg:rounded-3xl lg:px-20 lg:pt-24 xl:gap-32">
            <div className="flex w-full flex-col gap-6 sm:max-w-sm md:gap-40">
              {/* useSearchParams butuh batas Suspense agar halaman ini tetap statis. */}
              <Suspense fallback={<div className="h-[104px] rounded-lg bg-nirwana-surfaceMuted" />}>
                <LoginForm />
              </Suspense>

              <p className="text-xs leading-relaxed text-nirwana-muted">
                NIRWANA-AI adalah purwarupa riset dan belum tervalidasi sebagai alat diagnostik. Seluruh keputusan klinis
                tetap mengacu pada pemeriksaan serta protokol resmi rumah sakit. Kata sandi diatur admin perangkat lewat{" "}
                <code className="font-mono">DASHBOARD_PASSWORD</code>.
              </p>
            </div>

            <div className="flex w-full flex-col gap-4 sm:max-w-sm">
              <h1 className="font-display text-2xl font-semibold text-nirwana-text">Akses tenaga kesehatan</h1>
              <div className="space-y-4 text-sm font-medium leading-relaxed text-nirwana-muted">
                {paragraf.map((item) => (
                  <p key={item.slice(0, 32)}>{item}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-nirwana-muted">
            <p>© {new Date().getFullYear()} NIRWANA-AI</p>
            <Link href="/" className="underline transition hover:text-nirwana-accent">
              Beranda
            </Link>
            <Link href="/#edukasi" className="underline transition hover:text-nirwana-accent">
              Edukasi
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
