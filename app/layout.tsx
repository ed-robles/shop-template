import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-client";
import { StorefrontFooter } from "./StorefrontFooter";

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
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <StorefrontFooter />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
