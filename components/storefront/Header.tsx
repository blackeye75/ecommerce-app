import Link from "next/link";
import { getServerUser } from "@/lib/middleware/getServerUser";
import { getSiteSettings } from "@/lib/site-settings";
import { CartLink } from "./CartLink";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const [user, settings] = await Promise.all([getServerUser(), getSiteSettings()]);
  const { brand, header } = settings;

  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg flex items-center gap-2">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.storeName} className="h-8 w-auto object-contain" />
          ) : (
            brand.storeName
          )}
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {header.navLinks.map((l, i) => (
            <Link key={i} href={l.href || "#"} className="hover:underline">
              {l.label}
            </Link>
          ))}
          <CartLink />
          {user ? (
            <>
              <Link href={user.role === "admin" ? "/admin" : "/account"} className="hover:underline">
                {user.role === "admin" ? "Admin" : "My Account"}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="hover:underline">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
