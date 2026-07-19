import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { AnnouncementBar } from "@/components/storefront/AnnouncementBar";
import { getSiteSettings } from "@/lib/site-settings";
// import { getServerUser } from "@/lib/middleware/getServerUser";

// Metadata is now generated from the admin-editable Site Settings (SEO tab +
// branding favicon) instead of being hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: settings.seo.metaTitle || settings.brand.storeName,
    description: settings.seo.metaDescription,
    icons: settings.brand.faviconUrl ? { icon: settings.brand.faviconUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  // const user =await getServerUser()
  // console.log(user,"from Main Layout")

  // Inject the admin-chosen theme colours as CSS variables. Tailwind's
  // `primary` / `primary-foreground` resolve to these (see tailwind.config.ts).
  const themeVars = `:root{--primary:${settings.theme.primaryColor};--primary-foreground:${settings.theme.primaryForeground};}`;

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      </head>
      <body className="flex flex-col min-h-screen">
        <Providers>
          <AnnouncementBar />
          <Header />
          <div className="flex-1">{children}</div>
        {/* { user?.role!=="admin" && <Footer />} */}
        <Footer/>
        </Providers>
      </body>
    </html>
  );
}
