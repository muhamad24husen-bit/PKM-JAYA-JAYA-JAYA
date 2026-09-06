import { Baby, Lock, Stethoscope } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

export function AudienceNotice() {
  return (
    <section id="tentang" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-14 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <Reveal className="overflow-hidden rounded-card border border-nirwana-border bg-nirwana-surface">
          <img
            src="/images/hospital.svg"
            alt="Gedung rumah sakit tempat unit perawatan neonatus berada"
            className="h-full w-full object-cover"
            width={640}
            height={400}
          />
        </Reveal>

        <Reveal delay={90}>
          <h2 className="font-display text-2xl font-semibold text-nirwana-text sm:text-[1.75rem]">
            Dashboard ini diperuntukkan bagi dokter dan perawat
          </h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-nirwana-muted">
            Halaman pemantauan menampilkan data fisiologis pasien beserta riwayatnya. Interpretasi angka rSO₂ memerlukan
            konteks klinis usia gestasi, tekanan darah, keseimbangan cairan, dan obat yang sedang diberikan. sehingga
            aksesnya dibatasi pada tenaga kesehatan yang menangani pasien.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex gap-3.5 rounded-card border border-nirwana-border bg-nirwana-surface p-4">
              <Stethoscope size={19} className="mt-0.5 shrink-0 text-nirwana-accent" />
              <div>
                <p className="text-sm font-semibold text-nirwana-text">Dokter &amp; perawat</p>
                <p className="mt-1 text-sm leading-relaxed text-nirwana-muted">
                  Masuk lewat halaman login untuk melihat tren rSO₂, riwayat peringatan, status perangkat, dan ekspor PDF.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 rounded-card border border-nirwana-border bg-nirwana-surface p-4">
              <Baby size={19} className="mt-0.5 shrink-0 text-nirwana-accent" />
              <div>
                <p className="text-sm font-semibold text-nirwana-text">Orang tua &amp; wali</p>
                <p className="mt-1 text-sm leading-relaxed text-nirwana-muted">
                  Gunakan aplikasi pendamping NIRWANA-AI di ponsel. Tampilannya dirancang dengan bahasa non-diagnostik
                  dan notifikasi saat kondisi bayi berubah.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 rounded-card border border-nirwana-waspada/25 bg-nirwana-waspadaSoft p-4">
              <Lock size={19} className="mt-0.5 shrink-0 text-nirwana-waspada" />
              <div>
                <p className="text-sm font-semibold text-nirwana-waspada">Status purwarupa riset</p>
                <p className="mt-1 text-sm leading-relaxed text-nirwana-waspada/90">
                  NIRWANA-AI belum tervalidasi sebagai alat diagnostik. Seluruh keputusan klinis tetap mengacu pada
                  pemeriksaan dan protokol resmi rumah sakit.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
