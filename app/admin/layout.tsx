import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/middleware/getServerUser";
// import { LogoutButton } from "@/components/storefront/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-6 flex flex-col justify-between">
        <div>
          <h2 className="font-bold text-lg mb-6">Admin Panel</h2>
          <nav className="space-y-2 text-sm">
            <a href="/admin" className="block hover:underline">Dashboard</a>
            <a href="/admin/products" className="block hover:underline">Products</a>
            <a href="/admin/categories" className="block hover:underline">Categories</a>
            <a href="/admin/orders" className="block hover:underline">Orders</a>
            <a href="/admin/activity-log" className="block hover:underline">Activity Log</a>
            <a href="/admin/settings" className="block hover:underline">Settings</a>
          </nav>
        </div>
        {/* <LogoutButton className="text-sm text-left hover:underline text-red-500" /> */}
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
