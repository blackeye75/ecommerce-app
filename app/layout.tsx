import type { Metadata } from "next";
// import "./globals.css";
// Ignore missing type declarations for side-effect CSS import
// @ts-ignore
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/storefront/Header";

export const metadata: Metadata = {
  title: "E-Commerce Store",
  description: "Built with Next.js, MongoDB, and Cloudinary",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
