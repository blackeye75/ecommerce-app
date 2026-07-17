import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Product, Category } from "@/models";
import { ProductCard } from "@/components/storefront/ProductCard";

// Always fetch fresh data for now — we can add caching/ISR once the catalog is stable.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connectDB();

  const [featuredProducts, categories] = await Promise.all([
    Product.find({ isActive: true, isFeatured: true })
      .populate("category", "name slug")
      .limit(8)
      .lean(),
    Category.find({ isActive: true, parentCategory: null }).sort({ name: 1 }).lean(),
  ]);

  return (
    <main>
      <section className="bg-gray-50 py-20 px-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Store</h1>
        <p className="text-gray-500 mb-6 max-w-xl mx-auto">
          Quality products, fair prices, fast shipping.
        </p>
        <Link
          href="/shop"
          className="inline-block rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium"
        >
          Shop Now
        </Link>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-6">Shop by Category</h2>
        {categories.length === 0 ? (
          <p className="text-gray-400 text-sm">No categories yet — add some in the admin panel.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat: any) => (
              <Link
                key={cat._id}
                href={`/category/${cat.slug}`}
                className="border rounded-lg p-6 text-center hover:shadow-md transition"
              >
                <span className="font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {featuredProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-6">Featured Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredProducts.map((p: any) => (
              <ProductCard key={p._id} product={JSON.parse(JSON.stringify(p))} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
