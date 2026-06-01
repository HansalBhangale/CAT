import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "CAT 2026 Tracker",
  description: "Track the CAT 2026 6-month study plan — daily, weekly, monthly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:pt-6">
          <Nav />
          <main className="mt-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
