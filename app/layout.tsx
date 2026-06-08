import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CRMProvider } from "@/contexts/CRMContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hello CRM",
  description: "Education agency CRM by Hello Australia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark dark-navy h-full">
      <body className={`${inter.className} h-full bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <LanguageProvider>
            <CRMProvider>
              {children}
              <Toaster position="bottom-right" richColors />
            </CRMProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
