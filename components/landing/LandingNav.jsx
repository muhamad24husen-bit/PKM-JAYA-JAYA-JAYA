import Link from "next/link";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const links = [
  { href: "#tentang", label: "Tentang" },
  { href: "#edukasi", label: "Edukasi" },
  { href: "#data", label: "Data" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-nirwana-border/70 bg-nirwana-surface/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={38} />
          <span className="leading-tight">
            <span className="block font-display text-sm font-semibold text-nirwana-text">NIRWANA-AI</span>
            <span className="block text-[11px] text-nirwana-muted">Monitoring rSO₂ Neonatus</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-5">
          <ul className="hidden items-center gap-5 text-sm text-nirwana-muted md:flex">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition hover:text-nirwana-accent">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg bg-nirwana-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-nirwana-accent/90"
          >
            <LogIn size={15} />
            Masuk
          </Link>
        </div>
      </nav>
    </header>
  );
}
