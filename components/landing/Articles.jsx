import { Droplets, HeartPulse, Waves } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

// Materi edukasi ditulis kualitatif dan tanpa angka epidemiologis yang tidak
// dapat ditelusuri. Satu-satunya angka yang dicantumkan adalah rentang kerja
// perangkat NIRWANA-AI sendiri (65–85%), yang juga dipakai aplikasi pendamping.
const articles = [
  {
    id: "rso2",
    icon: Waves,
    eyebrow: "Parameter utama",
    title: "Apa itu rSO₂?",
    lead:
      "rSO₂ (regional tissue oxygen saturation) adalah persentase hemoglobin yang masih mengikat oksigen di dalam jaringan pada satu area tubuh tertentu — pada NIRWANA-AI, area ginjal.",
    body: [
      "Pengukurannya memakai prinsip NIRS (near-infrared spectroscopy). Cahaya inframerah-dekat ditembakkan menembus kulit; hemoglobin yang membawa oksigen dan yang sudah melepasnya menyerap panjang gelombang berbeda. Dari selisih serapan sinyal RED dan IR yang kembali ke sensor, saturasi jaringan diperkirakan.",
      "Berbeda dari SpO₂ pulse oximetry yang membaca darah arteri, rSO₂ menggambarkan keseimbangan antara pasokan dan pemakaian oksigen di jaringan. Nilainya tetap terbaca meski denyut lemah, dan turun lebih dulu ketika perfusi organ mulai berkurang.",
      "Ginjal dipilih karena termasuk organ yang paling awal mengalami penurunan aliran darah saat tubuh memprioritaskan otak dan jantung. Penurunan rSO₂ ginjal karena itu berpotensi menjadi tanda dini, bukan tanda akhir.",
    ],
    callout: {
      label: "Rentang kerja perangkat",
      text: "NIRWANA-AI memakai 65–85% sebagai pita normal. Di bawahnya perangkat menaikkan status ke Waspada, lalu Darurat sesuai ambang firmware.",
    },
  },
  {
    id: "hipoksia",
    icon: HeartPulse,
    eyebrow: "Kondisi yang dipantau",
    title: "Apa itu hipoksia?",
    lead:
      "Hipoksia adalah keadaan ketika jaringan tubuh menerima oksigen lebih sedikit daripada yang dibutuhkan untuk metabolisme normalnya.",
    body: [
      "Penyebabnya bisa dari sisi pasokan gangguan pernapasan, kelainan jantung bawaan, anemia berat atau dari sisi distribusi, yaitu aliran darah ke organ yang menurun meski kadar oksigen darah tampak cukup.",
      "Pada neonatus, tanda klinis hipoksia sering samar dan terlambat muncul: laju napas berubah, warna kulit memucat, tonus otot melemah, produksi urin berkurang. Ketika tanda-tanda ini terlihat, jaringan biasanya sudah cukup lama kekurangan oksigen.",
      "Karena itu pemantauan berkelanjutan menjadi penting. Tren rSO₂ yang menurun perlahan selama beberapa menit memberi informasi yang tidak dapat ditangkap oleh pemeriksaan berkala tiap beberapa jam.",
    ],
    callout: {
      label: "Kenapa dilabeli Darurat?",
      text: "Pada dashboard, status kritis ditampilkan sebagai “Darurat” agar bahasanya konsisten dengan aplikasi orang tua, meski kunci telemetri internal tetap HIPOKSIA.",
    },
  },
  {
    id: "aki",
    icon: Droplets,
    eyebrow: "Risiko lanjutan",
    title: "Apa itu Acute Kidney Injury (AKI)?",
    lead:
      "AKI atau cedera ginjal akut adalah penurunan fungsi ginjal yang terjadi mendadak dalam hitungan jam sampai hari, ditandai menumpuknya sisa metabolisme dan berkurangnya produksi urin.",
    body: [
      "Salah satu pemicu utamanya pada bayi baru lahir adalah hipoperfusi aliran darah ke ginjal yang tidak memadai, misalnya akibat asfiksia perinatal, sepsis, atau dehidrasi. Sel tubulus ginjal termasuk yang paling rentan terhadap kekurangan oksigen.",
      "Diagnosis konvensional bergantung pada kenaikan kreatinin serum dan penurunan output urin. Keduanya bersifat terlambat: kreatinin bayi pada hari-hari awal masih dipengaruhi kadar ibu, dan kenaikannya baru terbaca setelah sebagian fungsi ginjal hilang.",
      "Di sinilah pemantauan rSO₂ ginjal secara kontinu diharapkan berperan. Bila penurunan oksigenasi jaringan ginjal dapat dikenali lebih awal, koreksi perfusi berpeluang dilakukan sebelum cedera menjadi menetap.",
    ],
    callout: {
      label: "Catatan",
      text: "Hubungan rSO₂ ginjal dengan kejadian AKI neonatus masih menjadi bidang penelitian aktif. NIRWANA-AI berperan sebagai alat pemantau, bukan penegak diagnosis.",
    },
  },
];

export function Articles() {
  return (
    <section id="edukasi" className="scroll-mt-20 border-y border-nirwana-border bg-nirwana-surface">
      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 lg:py-18">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-nirwana-accent">Materi edukasi</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-nirwana-text sm:text-[1.75rem]">
            Tiga konsep di balik pemantauan ini
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-nirwana-muted">
            Ringkasan singkat untuk menyamakan istilah antar-tim jaga sebelum membaca angka pada dashboard.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {articles.map(({ id, icon: Icon, eyebrow, title, lead, body, callout }, index) => (
            <Reveal
              key={id}
              id={id}
              as="article"
              delay={index * 110}
              className="flex scroll-mt-20 flex-col rounded-card border border-nirwana-border bg-nirwana-background p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-nirwana-accentSoft text-nirwana-accent">
                <Icon size={20} />
              </span>

              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-nirwana-muted">{eyebrow}</p>
              <h3 className="mt-1.5 font-display text-lg font-semibold text-nirwana-text">{title}</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-nirwana-text">{lead}</p>

              <div className="mt-3 space-y-3">
                {body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-nirwana-muted">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-auto pt-5">
                <div className="rounded-lg border border-nirwana-accent/20 bg-nirwana-accentSoft/40 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-nirwana-accent">
                    {callout.label}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-nirwana-text">{callout.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8 flex flex-col gap-5 rounded-card border border-nirwana-border bg-nirwana-background p-6 sm:flex-row sm:items-center">
          <img
            src="/images/care-nurse.svg"
            alt="Perawat menggendong bayi baru lahir"
            className="h-36 w-full rounded-lg object-cover sm:w-56"
            width={640}
            height={400}
          />
          <p className="text-sm leading-relaxed text-nirwana-muted">
            Rangkaian hipoksia menuju AKI berlangsung senyap. Tujuan NIRWANA-AI sederhana: memberi tim jaga satu angka
            yang bergerak lebih dulu, agar jeda antara perubahan fisiologis dan tindakan menjadi sesingkat mungkin.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
