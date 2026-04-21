import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "PC Control Panel",
  description: "Remote control your PC via local network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
    <body className={cn(inter.variable, sora.variable, "antialiased bg-zinc-950")} suppressHydrationWarning>
      <main className="min-h-screen">
        {children}
      </main>
      <Toaster richColors position="bottom-center" />
    </body>
    </html>
  );
}
