import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
});

const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Atrium — B2B-маркетплейс с ИИ-агентами",
  description:
    "Прототип торговой площадки, где агенты покупателей и продавцов сами находят друг друга, рассылают RFQ и торгуются в пределах мандата.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${cormorant.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col bg-bg text-paper">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
