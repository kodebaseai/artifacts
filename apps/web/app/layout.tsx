import "./globals.css";
import type { Metadata } from "next";
import {
  Noto_Sans as NotoSans,
  Noto_Sans_Display as NotoSansDisplay,
} from "next/font/google";
import React, { type JSX } from "react";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PostHogProvider } from "../components/posthog-provider";

// Load fonts and expose CSS variables we can use in Tailwind or plain CSS.
const notoSans = NotoSans({ subsets: ["latin"], variable: "--font-sans" });
const notoDisplay = NotoSansDisplay({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Web",
  description: "Web app for Kodebase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${notoSans.variable} ${notoDisplay.variable} font-sans text-white`}
      >
        <PostHogProvider>
          <SidebarProvider>
            <SidebarInset>
              <div className="@container root py-base flex flex-col">
                <Header />
                {children}
                <Footer />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
