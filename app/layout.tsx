import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Ponto RLP — Sistema de Controle de Ponto",
  description: "Dashboard de controle de ponto com visualização em tempo real",
  icons: {
    icon: "/convex.svg",
  },
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
      </body>
    </html>
  );
}
