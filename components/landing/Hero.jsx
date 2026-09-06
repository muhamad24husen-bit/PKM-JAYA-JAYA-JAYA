/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowRight, Radio, ShieldCheck, Stethoscope } from "lucide-react";

const highlights = [
  { icon: Radio, title: "Realtime 1 Hz", body: "Telemetri sensor NIR dikirim lewat MQTT tanpa jeda berarti." },
  { icon: Stethoscope, title: "Tiga status klinis", body: "Normal, Waspada, dan Darurat mengikuti ambang rSO₂ perangkat." },
  { icon: ShieldCheck, title: "Akses terbatas", body: "Dashboard pasien hanya terbuka bagi petugas yang berwenang." },
];

// Kata yang bergantian di dalam judul. Tiga kata, satu putaran 9 detik, jadi
// tiap kata memegang giliran 3 detik.
const reelWords = ["berkelanjutan", "non-invasif", "sejak dini"];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-nirwana-border bg-gradient-to-b from-nirwana-accentSoft/45 to-nirwana-background">
      {/* Dua gumpalan gradien yang hanyut pelan di belakang konten. Murni dekoratif. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob-warm absolute -left-24 -top-28 h-80 w-80 rounded-full bg-nirwana-accent/12 blur-3xl" />
        <div className="animate-blob-cool absolute -right-16 top-24 h-72 w-72 rounded-full bg-nirwana-normal/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <span
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-nirwana-accent/25 bg-nirwana-surface px-3 py-1 text-xs font-semibold text-nirwana-accent"
            style={{ animationDelay: "60ms" }}
          >
            <Stethoscope size={13} />
            Khusus tenaga kesehatan
          </span>

          <h1
            className="animate-fade-up mt-5 font-display text-3xl font-semibold leading-tight text-nirwana-text sm:text-4xl lg:text-[2.6rem]"
            style={{ animationDelay: "140ms" }}
          >
            Pemantauan oksigenasi ginjal neonatus secara{" "}
            {/* Kata bergilir ditumpuk dalam satu sel grid supaya lebar mengikuti
                kata terpanjang dan baris di bawahnya tidak ikut bergoyang. */}
            <span className="inline-grid align-bottom">
              {reelWords.map((word, index) => (
                <span
                  key={word}
                  className="animate-reel-word col-start-1 row-start-1 whitespace-nowrap text-nirwana-accent"
                  style={{ animationDelay: `${index * 3}s` }}
                >
                  {word}
                </span>
              ))}
              {/* Salinan tak terlihat penjaga lebar, agar tata letak tidak melompat. */}
              <span aria-hidden="true" className="col-start-1 row-start-1 invisible whitespace-nowrap">
                {reelWords.reduce((longest, word) => (word.length > longest.length ? word : longest))}
              </span>
            </span>
          </h1>

          <p
            className="animate-fade-up mt-4 max-w-xl text-[15px] leading-relaxed text-nirwana-muted"
            style={{ animationDelay: "220ms" }}
          >
            NIRWANA-AI adalah purwarupa riset yang mengestimasi <strong className="font-semibold text-nirwana-text">rSO₂ ginjal</strong>{" "}
            bayi baru lahir memakai sensor NIR non-invasif berbasis ESP32. Nilainya mengalir ke dashboard ini setiap detik,
            sehingga penurunan perfusi dapat terbaca sebelum tanda klinis muncul.
          </p>

          <div className="animate-fade-up mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: "300ms" }}>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-nirwana-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-nirwana-accent/90"
            >
              Masuk sebagai petugas
              <ArrowRight size={16} />
            </Link>
            <a
              href="#edukasi"
              className="rounded-lg border border-nirwana-border bg-nirwana-surface px-5 py-2.5 text-sm font-semibold text-nirwana-text transition hover:border-nirwana-accent/40 hover:text-nirwana-accent"
            >
              Pelajari rSO₂
            </a>
          </div>

          <dl className="mt-9 grid gap-4 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className="animate-fade-up rounded-card border border-nirwana-border bg-nirwana-surface p-4"
                style={{ animationDelay: `${380 + index * 90}ms` }}
              >
                <Icon size={17} className="text-nirwana-accent" />
                <dt className="mt-2.5 text-sm font-semibold text-nirwana-text">{title}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-nirwana-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-fade-up relative" style={{ animationDelay: "260ms" }}>
          <div className="overflow-hidden rounded-card border border-nirwana-border bg-nirwana-surface shadow-sm">
            {/* Ganti berkas di public/images dengan foto asli (nama sama) bila dokumentasi lapangan sudah tersedia. */}
            <img
              src="/images/hero-nicu.svg"
              alt="Perawat memantau bayi di dalam inkubator dengan monitor tanda vital di sampingnya"
              className="h-full w-full object-cover"
              width={800}
              height={560}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
