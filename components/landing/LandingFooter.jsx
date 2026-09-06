import Link from "next/link";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-nirwana-border bg-nirwana-surface">
      <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8">
        <div className="rounded-card border border-nirwana-accent/20 bg-nirwana-accentSoft/40 p-7 text-center">
          <h2 className="font-display text-xl font-semibold text-nirwana-text">Bertugas di shift ini?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-nirwana-muted">
            Masuk untuk membuka pemantauan realtime, tren rSO₂, riwayat peringatan, dan ekspor laporan PDF.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-nirwana-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-nirwana-accent/90"
          >
            <LogIn size={16} />
            Masuk ke Dashboard
          </Link>
        </div>

        <div className="mt-9 flex flex-col items-center justify-between gap-4 border-t border-nirwana-border pt-7 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-nirwana-text">NIRWANA-AI</p>
              <p className="text-[11px] text-nirwana-muted">Purwarupa riset PKM — bukan alat diagnostik</p>
            </div>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-nirwana-muted sm:text-right">
            Ilustrasi pada halaman ini dibuat khusus untuk proyek ini.
            <br />
            Tidak memuat foto atau data pasien sebenarnya.
          </p>
        </div>
      </div>
    </footer>
  );
}
