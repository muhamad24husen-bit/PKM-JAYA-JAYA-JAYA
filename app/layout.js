import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "NIRWANA-AI Monitoring Dashboard",
  description: "Dashboard monitoring realtime NIRWANA-AI berbasis MQTT.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${geist.variable} ${geistMono.variable} ${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
