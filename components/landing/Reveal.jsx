"use client";

import { useEffect, useRef } from "react";

// Membuka elemen saat masuk layar, memakai keyframe nirwana-fade-up yang sama
// dengan hero.
//
// Dua jalur pembuka yang saling menutupi, karena isi halaman tidak boleh
// tersembunyi permanen hanya karena satu mekanisme gagal:
//   1. IntersectionObserver — jalur utama, murah.
//   2. Pemeriksaan kotak berkala tiap 250ms — menyala kalau callback observer
//      tertunda atau tidak pernah datang. Sengaja memakai timer, bukan listener
//      scroll: pada sebagian lingkungan event scroll tidak dikirim sama sekali,
//      sedangkan timer selalu jalan. Berhenti sendiri begitu elemen terbuka.
// Ditambah dua pengaman lain: tanpa JavaScript kelas `js-ready` tidak pernah
// terpasang sehingga CSS membiarkan semua terlihat, dan browser tanpa
// IntersectionObserver langsung membuka elemennya.
//
// Kelas ditulis langsung ke node, bukan lewat state, agar komponen ini tidak
// memicu render ulang saat digulir.
export function Reveal({ children, delay = 0, className = "", id, as: Tag = "div" }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    document.documentElement.classList.add("js-ready");

    let selesai = false;
    const buka = () => {
      if (selesai) return;
      selesai = true;
      node.classList.add("is-visible");
      lepasListener();
      observer?.disconnect();
    };

    // Dibuka sedikit sebelum benar-benar masuk layar supaya tidak terasa telat
    // saat pengguna menggulir cepat. Batas bawah sengaja tidak diperiksa:
    // elemen yang sudah terlewat di atas layar — misalnya karena lompatan
    // jangkar atau tombol End — harus ikut terbuka, bukan tertinggal kosong.
    const AMBANG = 0.88;
    const cekManual = () => {
      const rect = node.getBoundingClientRect();
      const tinggi = window.innerHeight || document.documentElement.clientHeight || 0;
      if (tinggi > 0 && rect.top < tinggi * AMBANG) {
        buka();
      }
    };

    const pemeriksa = window.setInterval(cekManual, 250);
    const lepasListener = () => window.clearInterval(pemeriksa);

    let observer = null;
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) buka();
          }
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
      );
      observer.observe(node);
    } else {
      buka();
    }

    cekManual();

    return () => {
      lepasListener();
      observer?.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref}
      id={id}
      className={`reveal${className ? ` ${className}` : ""}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
