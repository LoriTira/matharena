import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SoundProvider } from "@/lib/audio/SoundProvider";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "MathsArena — Competitive Mental Math",
  description: "Fast mental-math duels. Climb the rankings. Sharpen your mind.",
};

// Mobile-first viewport. `viewportFit: 'cover'` enables env(safe-area-inset-*)
// so bottom-anchored controls don't slip under the iPhone home indicator.
// Pinch-zoom is left enabled for accessibility — the answer inputs are all
// ≥20px and won't trigger iOS auto-zoom, so we get tighter game feel for free.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ma-theme');var a=localStorage.getItem('ma-accent');var d=document.documentElement;if(a)d.setAttribute('data-accent',a);var dark=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(dark)d.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-page text-ink-secondary">
        <ThemeProvider>
          <SoundProvider>{children}</SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
