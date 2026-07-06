import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crypto Analytics",
  description: "Bitcoin, Ethereum, BNB, XRP market data from Binance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-gray-950 text-white">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
