import type { Metadata } from "next";
import { DM_Mono, Space_Grotesk } from "next/font/google";
import { MotionProvider } from "@/components/ds/MotionProvider";
import { FaultFromUrl } from "@/components/FaultFromUrl";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "500"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "ASTRA",
  description: "Daily readiness for astronauts: can I do my job tomorrow?",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <TopNav />
          <FaultFromUrl />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
