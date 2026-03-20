import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexProvider";
import Navigation from "@/components/layout/Navigation";
import { ConvexErrorBoundary } from "@/components/ui/ConvexErrorBoundary";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "SCOPOS Performance System",
  description: "Employee performance evaluation and review platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body>
        <ConvexClientProvider>
          <Navigation />
          <ConvexErrorBoundary>
            {children}
          </ConvexErrorBoundary>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
