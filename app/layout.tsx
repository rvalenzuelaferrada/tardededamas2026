import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Tarde de Damas 2026 · Elige un regalo",
  description:
    "Votación de socios para elegir el regalo de la Tarde de Damas 2026.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
