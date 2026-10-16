import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "THE MONEY LEAK — Revenue Intelligence",
  description:
    "Business decision-support dashboard: detect margin and return-rate anomalies across retail segments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
