import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const font = Atkinson_Hyperlegible({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Guias de Aprendizagem",
  description: "Monta o cronograma do bimestre a partir do Guia do Currículo Priorizado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${font.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-2 print:hidden">
          Ir para o cronograma
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
