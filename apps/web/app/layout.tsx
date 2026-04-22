import type { Metadata } from "next";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
import { getDevelopmentStartupEnvError } from "@/lib/env";
import "./globals.css";

const displayFont = Space_Grotesk({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Source_Sans_3({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Argos",
  description: "Revenue Command Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const startupEnvError = getDevelopmentStartupEnvError();

  return (
    <html className={`${displayFont.variable} ${bodyFont.variable}`} lang="en">
      <body>
        {startupEnvError ? (
          <main className="min-h-screen bg-[#0b0e14] px-6 py-10 text-[#ecedf6]">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
              <section className="w-full rounded-3xl border border-[#4f2941] bg-[#16111a] p-8 shadow-2xl shadow-black/30">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f0b8c8]">
                  Development Environment Error
                </p>
                <h1 className="mt-4 text-3xl font-bold" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                  Auth configuration is incomplete
                </h1>
                <p className="mt-4 text-base leading-7 text-[#c9cbda]">{startupEnvError}</p>
                <p className="mt-4 text-sm leading-6 text-[#a9abb3]">
                  Add the missing `NEXT_PUBLIC_*` values to `apps/web/.env.local`, then restart the dev server.
                </p>
              </section>
            </div>
          </main>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
