import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Ponto RLP — Sistema de Controle de Ponto",
  description: "Dashboard de controle de ponto com visualização em tempo real",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RLP Ponto",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500/20 selection:text-blue-900">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-blue-500/[0.04] blur-[120px]" />
          <div className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/[0.03] blur-[100px]" />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 grid-pattern opacity-60" />
        </div>
        
        {/* Main content */}
        <div className="relative z-10">
          <Providers>{children}</Providers>
        </div>

        {/* PWA Service Worker Registration */}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
