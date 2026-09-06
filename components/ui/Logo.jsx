/* eslint-disable @next/next/no-img-element */

// Logo NIRWANA-AI. Setengah kiri berwarna perak, jadi tempatkan selalu di atas
// permukaan terang (nirwana-surface) supaya kontrasnya tetap terbaca.
export function Logo({ size = 36, className = "" }) {
  return (
    <img
      src="/images/logo.png"
      alt="Logo NIRWANA-AI"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`object-contain ${className}`}
    />
  );
}
