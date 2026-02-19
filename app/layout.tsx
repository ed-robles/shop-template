import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-client";

export const metadata: Metadata = {
  title: "E-Commerce Template",
  description: "A modern e-commerce template built with Next.js and Tailwind CSS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
