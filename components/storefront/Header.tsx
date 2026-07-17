import Link from "next/link";
import { getServerUser } from "@/lib/middleware/getServerUser";

export async function Header() {
  const user = await getServerUser();

  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          Store
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/shop" className="hover:underline">
            Shop
          </Link>
          {user ? (
            <Link href={user.role === "admin" ? "/admin" : "/account"} className="hover:underline">
              {user.role === "admin" ? "Admin" : "My Account"}
            </Link>
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
