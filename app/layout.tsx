import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOS TRAVELLERS — Lugares que sí suman",
  description: "Mapa turístico de Santiago con recomendaciones y opiniones de viajeros.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
