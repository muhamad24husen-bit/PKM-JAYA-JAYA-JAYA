import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { AudienceNotice } from "@/components/landing/AudienceNotice";
import { Articles } from "@/components/landing/Articles";
import { LandingCharts } from "@/components/landing/LandingCharts";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata = {
  title: "NIRWANA-AI — Pemantauan rSO₂ Neonatus untuk Tenaga Kesehatan",
  description:
    "Halaman informasi NIRWANA-AI: penjelasan rSO₂, hipoksia, dan Acute Kidney Injury. Dashboard pemantauan pasien khusus dokter dan perawat.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-nirwana-background text-nirwana-text">
      <LandingNav />
      <main>
        <Hero />
        <AudienceNotice />
        <Articles />
        <LandingCharts />
      </main>
      <LandingFooter />
    </div>
  );
}
