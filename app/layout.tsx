import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SoundProvider } from "@/lib/audio/SoundProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MathsArena — Competitive Mental Math",
  description: "Real-time mental-math duels. Chess-style Elo. Climb from Wood IV to Grandmaster by thinking faster.",
};

// `viewportFit: 'cover'` enables env(safe-area-inset-*) so bottom-anchored
// controls don't slip under the iPhone home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4eddb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0612" },
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
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ma-theme');var d=document.documentElement;var dark=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(dark)d.classList.add('dark')}catch(e){}})()`,
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
