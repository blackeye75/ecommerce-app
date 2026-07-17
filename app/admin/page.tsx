import { getServerUser } from "@/lib/middleware/getServerUser";

export default async function AdminDashboard() {
  const user = await getServerUser();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Welcome, Admin</h1>
      <p className="text-gray-500">Logged in as {user?.email}</p>
      <p className="mt-6 text-sm text-gray-400">
        Product/category/order management UI arrives in Phase 3.
      </p>
    </div>
  );
}
