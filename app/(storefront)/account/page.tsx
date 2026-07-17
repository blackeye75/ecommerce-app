import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/middleware/getServerUser";

export default async function AccountPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <main className="p-12">
      <h1 className="text-2xl font-bold mb-4">My Account</h1>
      <div className="space-y-1 text-gray-700">
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>
        <p>User ID: {user.id}</p>
      </div>
      <p className="mt-6 text-sm text-gray-400">
        If you can see this page, auth is working — this is a protected route
        reached via middleware.ts + getServerUser().
      </p>
    </main>
  );
}
