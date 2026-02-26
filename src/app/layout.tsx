import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adogalo - Sistem Manajemen Proyek Konstruksi",
  description: "Platform manajemen proyek konstruksi dengan fitur tracking milestone, manajemen vendor, client dashboard, dan retensi. Solusi lengkap untuk pengelolaan proyek konstruksi.",
  keywords: ["Adogalo", "Manajemen Proyek", "Konstruksi", "Milestone", "Vendor", "Client", "Retensi", "Indonesia"],
  authors: [{ name: "Adogalo Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Adogalo - Sistem Manajemen Proyek Konstruksi",
    description: "Platform manajemen proyek konstruksi terlengkap di Indonesia",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakarta.variable} suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="fixed top-4 right-4 z-[100]">
            <ThemeToggle />
          </div>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
