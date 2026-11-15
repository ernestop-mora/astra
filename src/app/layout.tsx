import type { Metadata } from "next";
import { DM_Mono, Space_Grotesk } from "next/font/google";
import { MotionProvider } from "@/components/ds/MotionProvider";
import { AssistantProvider } from "@/components/assistant/AssistantProvider";
import { FaultFromUrl } from "@/components/FaultFromUrl";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      {/* Header row, then the page takes the rest of the screen: one view, no page scroll. */}
      <body className="grid min-h-dvh grid-rows-[auto_minmax(0,1fr)] fit:h-dvh">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <MotionProvider>
          <TopNav />
          <FaultFromUrl />
          {children}
          <AssistantProvider />
        </MotionProvider>
      </body>
    </html>
  );
}
